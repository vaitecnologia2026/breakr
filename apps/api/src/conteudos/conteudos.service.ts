// Servico do funil de producao de conteudo (M16).
// Uma peca (Conteudo) pertence a um cliente, e produzida por um squad, tem um
// responsavel e percorre o funil de status (IDEIA -> ... -> PUBLICADO). Cada
// criacao/transicao dispara o motor; ao ir para APROVACAO_CLIENTE o CS e
// notificado para acompanhar a aprovacao no portal.
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Conteudo, FuncaoSquad, StatusConteudo, StatusEstrategia, TipoConteudo } from '@prisma/client';
import { Cargo } from '@breakr/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CodigoUnicoService } from '../common/codigo-unico/codigo-unico.service';
import { EngineService } from '../automacao/engine.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { CriarConteudoDto } from './dto/criar-conteudo.dto';
import { SolicitarCriativoDto } from './dto/solicitar-criativo.dto';

// SLA padrao (horas) para a estrategista atender uma solicitacao de criativo.
const SLA_CRIATIVO_HORAS = 72;

// Includes padrao usados nas listagens/detalhe (nomes amigaveis das relacoes).
const INCLUDE_PADRAO = {
  cliente: { select: { nomeFantasia: true } },
  squad: { select: { nome: true } },
  responsavel: { select: { nome: true } },
};

@Injectable()
export class ConteudosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codigoUnico: CodigoUnicoService,
    private readonly engine: EngineService,
    private readonly notificacoes: NotificacoesService,
  ) {}

  // Cria a peca com status IDEIA e codigo unico (prefixo CNT) e dispara o motor.
  async criar(dto: CriarConteudoDto): Promise<Conteudo> {
    // Auto-preenche o squad a partir do cliente quando nao informado — "blindagem"
    // para nao depender de o usuario lembrar/escolher o squad certo na mao.
    let squadId = dto.squadId;
    if (!squadId) {
      const cliente = await this.prisma.cliente.findUnique({
        where: { id: dto.clienteId },
        select: { squadId: true },
      });
      squadId = cliente?.squadId ?? undefined;
    }

    const conteudo = await this.prisma.conteudo.create({
      data: {
        clienteId: dto.clienteId,
        titulo: dto.titulo,
        tipo: dto.tipo ?? TipoConteudo.POST,
        descricao: dto.descricao,
        midiaUrl: dto.midiaUrl,
        squadId,
        responsavelId: dto.responsavelId,
        paraTrafego: dto.paraTrafego ?? false,
        dataAgendada: dto.dataAgendada ? new Date(dto.dataAgendada) : undefined,
        status: StatusConteudo.IDEIA,
        codigoUnico: this.codigoUnico.gerar('CNT'),
      },
    });

    // Fire-and-forget: o motor nao pode quebrar a regra de negocio.
    await this.engine.dispatch('conteudo.criado', {
      conteudoId: conteudo.id,
      clienteId: conteudo.clienteId,
    });

    return conteudo;
  }

  // Lista pecas (mais recentes primeiro), com filtros opcionais por cliente/status.
  listar(filtro?: {
    clienteId?: string;
    status?: StatusConteudo;
  }): Promise<Conteudo[]> {
    return this.prisma.conteudo.findMany({
      where: {
        clienteId: filtro?.clienteId,
        status: filtro?.status,
      },
      include: INCLUDE_PADRAO,
      orderBy: { criadoEm: 'desc' },
    });
  }

  // Busca uma peca pelo id (com as relacoes amigaveis).
  async obter(id: string): Promise<Conteudo> {
    const conteudo = await this.prisma.conteudo.findUnique({
      where: { id },
      include: INCLUDE_PADRAO,
    });
    if (!conteudo) {
      throw new NotFoundException('Conteudo nao encontrado');
    }
    return conteudo;
  }

  // Move a peca para um novo status no funil e dispara o motor. Quando vai para
  // APROVACAO_CLIENTE, notifica o CS para acompanhar a aprovacao no portal.
  async moverStatus(
    id: string,
    novoStatus: StatusConteudo,
  ): Promise<Conteudo> {
    const conteudo = await this.prisma.conteudo.findUnique({
      where: { id },
      include: { cliente: { select: { nomeFantasia: true } } },
    });
    if (!conteudo) {
      throw new NotFoundException('Conteudo nao encontrado');
    }

    // B6: bloqueia mover para PRODUCAO se a estratégia do cliente não foi aprovada.
    if (novoStatus === StatusConteudo.PRODUCAO) {
      await this.garantirEstrategiaAprovada(conteudo.clienteId);
    }

    await this.prisma.conteudo.update({
      where: { id },
      data: { status: novoStatus },
    });

    await this.engine.dispatch('conteudo.status_alterado', {
      conteudoId: id,
      status: novoStatus,
      clienteId: conteudo.clienteId,
    });

    if (novoStatus === StatusConteudo.APROVACAO_CLIENTE) {
      await this.notificacoes.notificarPorCargo(Cargo.CS, {
        titulo: 'Peça aguardando aprovação',
        mensagem: `"${conteudo.titulo}" (${conteudo.cliente.nomeFantasia}) foi para aprovação do cliente.`,
        tipo: 'ALERTA',
        link: '/conteudos',
      });
    }

    return this.obter(id);
  }

  // Atribui (ou troca) o responsavel pela peca.
  async atribuirResponsavel(
    id: string,
    responsavelId: string,
  ): Promise<Conteudo> {
    await this.obter(id);
    await this.prisma.conteudo.update({
      where: { id },
      data: { responsavelId },
    });
    return this.obter(id);
  }

  // Anexa/atualiza a URL da midia da peca (imagem/video/carrossel) — o cliente ve
  // essa midia na aprovacao pelo portal. String vazia limpa a midia (B5, l.258).
  async atualizarMidia(id: string, midiaUrl?: string): Promise<Conteudo> {
    await this.obter(id);
    await this.prisma.conteudo.update({
      where: { id },
      data: { midiaUrl: midiaUrl?.trim() || null },
    });
    return this.obter(id);
  }

  // Resolve o membro do squad do cliente por funcao (ex.: DESIGNER, ESTRATEGISTA).
  private async membroDoSquad(
    clienteId: string,
    funcao: FuncaoSquad,
  ): Promise<{ id: string; nome: string } | null> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { squadId: true },
    });
    if (!cliente?.squadId) return null;
    const membro = await this.prisma.squadMembro.findFirst({
      where: { squadId: cliente.squadId, funcao },
      select: { usuario: { select: { id: true, nome: true } } },
    });
    return membro?.usuario ?? null;
  }

  // Dependência da aprovação de estratégia (B6): bloqueia a produção de conteúdo
  // enquanto o cliente tiver uma estratégia pendente (ENVIADA) ou em AJUSTE. Se o
  // cliente não tem estratégia (ou a última já foi APROVADA), não bloqueia — assim
  // o fluxo atual de quem ainda não usa estratégia segue inalterado.
  private async garantirEstrategiaAprovada(clienteId: string): Promise<void> {
    const pendente = await this.prisma.estrategia.findFirst({
      where: {
        clienteId,
        status: { in: [StatusEstrategia.ENVIADA, StatusEstrategia.AJUSTE] },
      },
      select: { id: true },
    });
    if (pendente) {
      throw new BadRequestException(
        'A estratégia deste cliente ainda não foi aprovada. A produção só é liberada após a aprovação da estratégia pelo cliente.',
      );
    }
  }

  // Encaminha a peca para o design: move para PRODUCAO e atribui o designer do
  // squad (a automacao "copy revisada -> design" do ClickUp). Notifica o designer.
  async encaminharParaDesign(id: string): Promise<Conteudo> {
    const conteudo = await this.obter(id);
    // B6: o handoff para design leva a peça a PRODUCAO — exige estratégia aprovada.
    await this.garantirEstrategiaAprovada(conteudo.clienteId);
    const designer = await this.membroDoSquad(conteudo.clienteId, FuncaoSquad.DESIGNER);
    // Sem designer no squad do cliente, a peca iria para PRODUCAO sem responsavel e
    // nunca apareceria no painel de nenhum designer. Bloqueia com orientacao clara.
    if (!designer) {
      throw new BadRequestException(
        'O squad do cliente nao tem um Designer atribuido. Adicione um Designer ao squad (tela Squads) antes de encaminhar a peca para design.',
      );
    }

    await this.prisma.conteudo.update({
      where: { id },
      data: {
        status: StatusConteudo.PRODUCAO,
        responsavelId: designer?.id ?? conteudo.responsavelId,
      },
    });

    if (designer) {
      await this.notificacoes.criar(designer.id, {
        titulo: 'Nova peça para design',
        mensagem: `"${conteudo.titulo}" foi encaminhada para você criar a arte.`,
        tipo: 'ALERTA',
        link: '/conteudos',
      });
    }
    return this.obter(id);
  }

  // Solicitacao de criativo (gestor de trafego -> estrategista). Cria a peca como
  // IDEIA, marcada para trafego pago, atribuida a estrategista do squad, com prazo
  // (SLA 72h) — aparece no "Meu dia" dela e dispara notificacao.
  async solicitarCriativo(dto: SolicitarCriativoDto): Promise<Conteudo> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: dto.clienteId },
      select: { id: true, squadId: true, nomeFantasia: true },
    });
    if (!cliente) throw new BadRequestException('Cliente nao encontrado');

    const estrategista = await this.membroDoSquad(dto.clienteId, FuncaoSquad.ESTRATEGISTA);
    const prazo = new Date(Date.now() + SLA_CRIATIVO_HORAS * 60 * 60 * 1000);

    const conteudo = await this.prisma.conteudo.create({
      data: {
        clienteId: dto.clienteId,
        titulo: dto.titulo?.trim() || `Criativo solicitado — ${cliente.nomeFantasia}`,
        descricao: dto.descricao,
        tipo: TipoConteudo.POST,
        status: StatusConteudo.IDEIA,
        paraTrafego: true,
        squadId: cliente.squadId ?? undefined,
        responsavelId: estrategista?.id,
        dataAgendada: prazo,
        codigoUnico: this.codigoUnico.gerar('CNT'),
      },
    });

    if (estrategista) {
      await this.notificacoes.criar(estrategista.id, {
        titulo: 'Solicitação de criativo (SLA 72h)',
        mensagem: `Gestor de tráfego pediu um criativo para ${cliente.nomeFantasia}. Prazo: 72h.`,
        tipo: 'ALERTA',
        link: '/conteudos',
      });
    }

    await this.engine.dispatch('conteudo.criado', {
      conteudoId: conteudo.id,
      clienteId: conteudo.clienteId,
    });
    return conteudo;
  }
}
