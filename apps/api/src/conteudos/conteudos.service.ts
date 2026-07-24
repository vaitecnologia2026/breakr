// Servico do funil de producao de conteudo (M16).
// Uma peca (Conteudo) pertence a um cliente, e produzida por um squad, tem um
// responsavel e percorre o funil de status (IDEIA -> ... -> PUBLICADO). Cada
// criacao/transicao dispara o motor; ao ir para APROVACAO_CLIENTE o CS e
// notificado para acompanhar a aprovacao no portal.
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Conteudo, EtapaTipoTarefa, Prisma, StatusConteudo, StatusEstrategia, TipoConteudo } from '@prisma/client';
import { StatusMaterial } from '../common/status-material';
import { Cargo, FuncaoSquad } from '@breakr/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CodigoUnicoService } from '../common/codigo-unico/codigo-unico.service';
import { EngineService } from '../automacao/engine.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { CriarConteudoDto } from './dto/criar-conteudo.dto';
import { AtualizarConteudoDto } from './dto/atualizar-conteudo.dto';
import { SolicitarCriativoDto } from './dto/solicitar-criativo.dto';
import { CriarConteudoDeTipoDto } from './dto/criar-conteudo-de-tipo.dto';

// SLA padrao (horas) para a estrategista atender uma solicitacao de criativo.
const SLA_CRIATIVO_HORAS = 72;

// Includes padrao usados nas listagens/detalhe (nomes amigaveis das relacoes).
const INCLUDE_PADRAO = {
  cliente: { select: { nomeFantasia: true } },
  squad: { select: { nome: true } },
  responsavel: { select: { nome: true } },
};

// Etapas do fluxo de producao (catalogo Tipos de Tarefa x Etapas), na ordem
// canonica, com o rotulo legivel para compor a descricao da peca herdada.
const ETAPAS_TIPO_TAREFA: { etapa: EtapaTipoTarefa; rotulo: string }[] = [
  { etapa: EtapaTipoTarefa.BRIEFING, rotulo: 'Briefing' },
  { etapa: EtapaTipoTarefa.ANALISE, rotulo: 'Análise' },
  { etapa: EtapaTipoTarefa.REDACAO, rotulo: 'Redação' },
  { etapa: EtapaTipoTarefa.DESIGN, rotulo: 'Design' },
  { etapa: EtapaTipoTarefa.REVISAO_INTERNA, rotulo: 'Revisão interna' },
  { etapa: EtapaTipoTarefa.APROVACAO_CLIENTE, rotulo: 'Aprovação cliente' },
  { etapa: EtapaTipoTarefa.PUBLICACAO, rotulo: 'Publicação' },
  { etapa: EtapaTipoTarefa.DIVULGACAO, rotulo: 'Divulgação' },
  { etapa: EtapaTipoTarefa.MONITORAMENTO, rotulo: 'Monitoramento' },
];

// Mapa do status do funil (coluna do board) para a etapa herdada correspondente.
// Usado para, ao mover a peça para a nova etapa, avisar o responsável definido
// daquela etapa (em etapasHerdadas). Só os status com etapa clara entram aqui; os
// demais caem no fallback (responsável atual da peça).
const STATUS_PARA_ETAPA: Partial<Record<StatusConteudo, EtapaTipoTarefa>> = {
  [StatusConteudo.ROTEIRO]: EtapaTipoTarefa.REDACAO,
  [StatusConteudo.PRODUCAO]: EtapaTipoTarefa.DESIGN,
  [StatusConteudo.REVISAO]: EtapaTipoTarefa.REVISAO_INTERNA,
  [StatusConteudo.APROVACAO_CLIENTE]: EtapaTipoTarefa.APROVACAO_CLIENTE,
  [StatusConteudo.PUBLICADO]: EtapaTipoTarefa.PUBLICACAO,
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

  // Cria uma peca (Conteudo) a partir de um Tipo de Tarefa — o "elo" do catalogo
  // Tipos de Tarefa x Etapas com o funil de producao. Herda das etapas do tipo:
  //  - o responsavel inicial da peca = responsavel da 1a etapa aplicavel que tenha
  //    um responsavel definido (assim a peca ja cai no "Meu dia" de alguem);
  //  - um snapshot das etapas herdadas (etapas aplicaveis + responsavel de cada),
  //    fiel ao eKyte (a tarefa mantem as etapas da data de criacao mesmo que o
  //    tipo mude depois);
  //  - a descricao lista o fluxo herdado (etapa: responsavel), para o time ver o
  //    caminho da peca sem precisar abrir o catalogo.
  // A peca nasce em IDEIA e dispara o motor, exatamente como criar().
  async criarAPartirDeTipo(
    tipoTarefaId: string,
    dto: CriarConteudoDeTipoDto,
  ): Promise<Conteudo> {
    const tipo = await this.prisma.tipoTarefa.findUnique({
      where: { id: tipoTarefaId },
      include: { etapas: true },
    });
    if (!tipo) {
      throw new NotFoundException('Tipo de tarefa nao encontrado.');
    }

    const cliente = await this.prisma.cliente.findUnique({
      where: { id: dto.clienteId },
      select: { squadId: true },
    });
    if (!cliente) {
      throw new BadRequestException('Cliente nao encontrado.');
    }

    // Etapas aplicaveis do tipo, na ordem canonica do fluxo. Etapa ausente na
    // matriz e tratada como aplicavel (mesmo default do catalogo).
    const aplicaveis = ETAPAS_TIPO_TAREFA.map((def) => {
      const et = tipo.etapas.find((e) => e.etapa === def.etapa);
      return {
        etapa: def.etapa,
        rotulo: def.rotulo,
        responsavelId: et?.responsavelId ?? null,
        aplicavel: et ? et.aplicavel : true,
      };
    }).filter((e) => e.aplicavel);

    // Responsavel inicial = 1a etapa aplicavel que tenha responsavel.
    const responsavelInicial =
      aplicaveis.find((e) => e.responsavelId)?.responsavelId ?? undefined;

    // Snapshot persistido das etapas herdadas (fiel ao eKyte).
    const etapasHerdadas = aplicaveis.map((e) => ({
      etapa: e.etapa,
      responsavelId: e.responsavelId,
    }));

    // Resolve os nomes dos responsaveis (uma consulta) para a descricao legivel.
    const ids = Array.from(
      new Set(
        aplicaveis
          .map((e) => e.responsavelId)
          .filter((v): v is string => Boolean(v)),
      ),
    );
    const nomes = ids.length
      ? await this.prisma.usuario.findMany({
          where: { id: { in: ids } },
          select: { id: true, nome: true },
        })
      : [];
    const nomePorId = new Map(nomes.map((u) => [u.id, u.nome]));
    const linhasFluxo = aplicaveis
      .map(
        (e) =>
          `- ${e.rotulo}: ${
            e.responsavelId
              ? nomePorId.get(e.responsavelId) ?? 'responsavel'
              : 'sem responsavel'
          }`,
      )
      .join('\n');
    const descricao = `Fluxo herdado do tipo de tarefa "${tipo.titulo}":\n${linhasFluxo}`;

    const conteudo = await this.prisma.conteudo.create({
      data: {
        clienteId: dto.clienteId,
        titulo: dto.titulo?.trim() || tipo.titulo,
        tipo: TipoConteudo.POST,
        descricao,
        squadId: cliente.squadId ?? undefined,
        responsavelId: responsavelInicial,
        status: StatusConteudo.IDEIA,
        codigoUnico: this.codigoUnico.gerar('CNT'),
        tipoTarefaId: tipo.id,
        etapasHerdadas: etapasHerdadas as unknown as Prisma.InputJsonValue,
      },
    });

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

  // Contabiliza, de forma real, o esforço previsto e os dias para concluir das
  // peças a partir do TIPO DE TAREFA de cada uma (Conteudo.tipoTarefaId -> TipoTarefa).
  // Somente leitura; não altera nada. Filtro opcional por cliente (igual à lista).
  async resumoEsforco(filtro?: { clienteId?: string }) {
    const conteudos = await this.prisma.conteudo.findMany({
      where: { clienteId: filtro?.clienteId },
      select: { tipoTarefaId: true },
    });
    const ids = [
      ...new Set(conteudos.map((c) => c.tipoTarefaId).filter((x): x is string => !!x)),
    ];
    const tipos = ids.length
      ? await this.prisma.tipoTarefa.findMany({
          where: { id: { in: ids } },
          select: { id: true, diasConcluir: true, esforcoPrevistoMin: true },
        })
      : [];
    const mapa = new Map(tipos.map((t) => [t.id, t]));
    let pecasComTipo = 0;
    let esforcoPrevistoMin = 0;
    let diasConcluirTotal = 0;
    for (const c of conteudos) {
      const t = c.tipoTarefaId ? mapa.get(c.tipoTarefaId) : undefined;
      if (!t) continue;
      pecasComTipo += 1;
      esforcoPrevistoMin += t.esforcoPrevistoMin ?? 0;
      diasConcluirTotal += t.diasConcluir ?? 0;
    }
    return {
      totalPecas: conteudos.length,
      pecasComTipo,
      esforcoPrevistoMin,
      esforcoPrevistoHoras: Math.round((esforcoPrevistoMin / 60) * 10) / 10,
      diasConcluirTotal,
      diasConcluirMedia:
        pecasComTipo > 0 ? Math.round((diasConcluirTotal / pecasComTipo) * 10) / 10 : null,
    };
  }

  // Busca uma peca pelo id (com as relacoes amigaveis). Quando a peca nasceu de um
  // material de campanha, anexa um resumo da campanha vinculada (nome, situacao, o
  // estagio deste material no pipeline e o progresso) para a Producao de Conteudo
  // mostrar "em que nivel a campanha esta". Peca sem vinculo => campanhaVinculada null.
  async obter(id: string): Promise<Conteudo> {
    const conteudo = await this.prisma.conteudo.findUnique({
      where: { id },
      include: {
        ...INCLUDE_PADRAO,
        materialCampanha: {
          select: {
            status: true,
            modeloMensagemId: true,
            campanha: {
              select: {
                id: true,
                nome: true,
                situacao: true,
                codigoUnico: true,
                materiais: { select: { status: true } },
              },
            },
          },
        },
      },
    });
    if (!conteudo) {
      throw new NotFoundException('Conteudo nao encontrado');
    }
    const { materialCampanha, ...rest } = conteudo;
    // Modelo de Mensagem escolhido para este material no board da campanha — resolve
    // titulo/corpo pelo id escalar (sem relacao formal) para a Producao de Conteudo
    // exibir qual mensagem usar. Null quando nao definido.
    const modeloMensagem = materialCampanha?.modeloMensagemId
      ? await this.prisma.modeloMensagem.findUnique({
          where: { id: materialCampanha.modeloMensagemId },
          select: { id: true, titulo: true, corpo: true },
        })
      : null;
    const campanhaVinculada = materialCampanha?.campanha
      ? {
          campanhaId: materialCampanha.campanha.id,
          nome: materialCampanha.campanha.nome,
          situacao: materialCampanha.campanha.situacao,
          codigoUnico: materialCampanha.campanha.codigoUnico,
          materialStatus: materialCampanha.status,
          totalMateriais: materialCampanha.campanha.materiais.length,
          materiaisConcluidos: materialCampanha.campanha.materiais.filter(
            (m) => m.status === StatusMaterial.CONCLUIDO,
          ).length,
          modeloMensagem,
        }
      : null;
    return { ...rest, campanhaVinculada } as unknown as Conteudo;
  }

  // Edita as informacoes da peca (titulo, tipo, descricao, midia, trafego,
  // agendamento). PATCH parcial: grava apenas os campos enviados, preservando o
  // restante. Nao altera status/responsavel (que tem endpoints proprios).
  async atualizar(id: string, dto: AtualizarConteudoDto): Promise<Conteudo> {
    await this.obter(id); // 404 se a peca nao existir
    const data: Prisma.ConteudoUpdateInput = {};
    if (dto.titulo !== undefined) data.titulo = dto.titulo.trim();
    if (dto.tipo !== undefined) data.tipo = dto.tipo;
    if (dto.descricao !== undefined) data.descricao = dto.descricao.trim() || null;
    if (dto.midiaUrl !== undefined) data.midiaUrl = dto.midiaUrl.trim() || null;
    if (dto.paraTrafego !== undefined) data.paraTrafego = dto.paraTrafego;
    if (dto.dataAgendada !== undefined) {
      data.dataAgendada = dto.dataAgendada ? new Date(dto.dataAgendada) : null;
    }
    await this.prisma.conteudo.update({ where: { id }, data });
    return this.obter(id);
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

    // Ao passar para a nova etapa, avisa o responsável DAQUELA etapa que tem uma
    // tarefa a executar (Produção de Conteúdo). Isolado em try/catch para nunca
    // quebrar a movimentação caso a notificação falhe.
    try {
      await this.notificarResponsavelDaEtapa(
        {
          titulo: conteudo.titulo,
          responsavelId: conteudo.responsavelId,
          etapasHerdadas: conteudo.etapasHerdadas,
        },
        novoStatus,
      );
    } catch {
      /* silencioso: o aviso é acessório; a peça já foi movida acima. */
    }

    return this.obter(id);
  }

  // Resolve e avisa o responsável da nova etapa/tarefa (Produção de Conteúdo). Mapeia
  // o status de destino para a etapa herdada correspondente e usa o responsável
  // definido daquela etapa (em etapasHerdadas); se não houver, cai para o responsável
  // atual da peça. Sem ninguém para avisar, não faz nada.
  private async notificarResponsavelDaEtapa(
    conteudo: { titulo: string; responsavelId: string | null; etapasHerdadas: Prisma.JsonValue | null },
    novoStatus: StatusConteudo,
  ): Promise<void> {
    const etapaAlvo = STATUS_PARA_ETAPA[novoStatus];
    let responsavelId: string | null = null;
    let rotuloEtapa = '';
    if (etapaAlvo) {
      const herdadas = Array.isArray(conteudo.etapasHerdadas)
        ? (conteudo.etapasHerdadas as Array<{ etapa?: string; responsavelId?: string | null }>)
        : [];
      const item = herdadas.find((e) => e && e.etapa === etapaAlvo);
      responsavelId = item?.responsavelId ?? null;
      rotuloEtapa = ETAPAS_TIPO_TAREFA.find((x) => x.etapa === etapaAlvo)?.rotulo ?? '';
    }
    // Fallback: sem responsável definido para a etapa → responsável atual da peça.
    if (!responsavelId) responsavelId = conteudo.responsavelId;
    if (!responsavelId) return; // ninguém para avisar
    await this.notificacoes.criar(responsavelId, {
      titulo: 'Você tem uma tarefa para executar',
      mensagem: `"${conteudo.titulo}"${rotuloEtapa ? ` está na etapa ${rotuloEtapa}` : ''} e precisa da sua ação.`,
      tipo: 'ALERTA',
      link: '/conteudos',
    });
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

  // Exclui a peca definitivamente. Avaliacoes e reworkLogs sao removidos em cascata
  // (relacao onDelete: Cascade no schema). Restrito a ADMIN/SUPERADMIN pelo controller.
  async remover(id: string): Promise<{ ok: true }> {
    const existe = await this.prisma.conteudo.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existe) {
      throw new NotFoundException('Peca de conteudo nao encontrada');
    }
    await this.prisma.conteudo.delete({ where: { id } });
    return { ok: true };
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
