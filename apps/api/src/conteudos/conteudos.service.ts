// Servico do funil de producao de conteudo (M16).
// Uma peca (Conteudo) pertence a um cliente, e produzida por um squad, tem um
// responsavel e percorre o funil de status (IDEIA -> ... -> PUBLICADO). Cada
// criacao/transicao dispara o motor; ao ir para APROVACAO_CLIENTE o CS e
// notificado para acompanhar a aprovacao no portal.
import { Injectable, NotFoundException } from '@nestjs/common';
import { Conteudo, StatusConteudo, TipoConteudo } from '@prisma/client';
import { Cargo } from '@breakr/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CodigoUnicoService } from '../common/codigo-unico/codigo-unico.service';
import { EngineService } from '../automacao/engine.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { CriarConteudoDto } from './dto/criar-conteudo.dto';

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
    const conteudo = await this.prisma.conteudo.create({
      data: {
        clienteId: dto.clienteId,
        titulo: dto.titulo,
        tipo: dto.tipo ?? TipoConteudo.POST,
        descricao: dto.descricao,
        squadId: dto.squadId,
        responsavelId: dto.responsavelId,
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
}
