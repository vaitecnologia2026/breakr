// Servico do portal do cliente. Monta a visao READ-ONLY que o cliente final
// (dono do restaurante) ve em /portal/:codigo — onboarding, contrato e faturas.
// Devolve apenas dados operacionais do proprio cliente, nada interno.
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FuncaoSquad, StatusConteudo, TipoConteudo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CodigoUnicoService } from '../common/codigo-unico/codigo-unico.service';
import { SubmeterDemandaDto } from './dto/submeter-demanda.dto';

// Config singleton — mesma linha usada por IntegracoesConfigService/PortalConfigService.
const CONFIG_ID = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class PortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codigoUnicoSvc: CodigoUnicoService,
  ) {}

  async obterPorCodigo(codigo: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { codigoUnico: codigo },
      include: {
        squad: {
          select: {
            nome: true,
            // CS responsavel — nome + foto exibidos na tela de onboarding do cliente
            // (o "seu CS" da visao gamificada). Um CS por squad (funcao unica).
            membros: {
              where: { funcao: FuncaoSquad.CS },
              select: { usuario: { select: { nome: true, fotoUrl: true } } },
              take: 1,
            },
          },
        },
        plano: { select: { nome: true } },
        onboarding: { include: { etapas: { orderBy: { ordem: 'asc' } } } },
        contratos: { orderBy: { criadoEm: 'desc' }, take: 1 },
        faturas: { orderBy: { criadoEm: 'desc' } },
        // Agenda do onboarding do cliente (coleta de dados, reunioes...).
        eventosOnboarding: { orderBy: { data: 'asc' } },
        // Aulas ja concluidas pelo cliente (para marcar o progresso).
        aulasConcluidas: { select: { aulaId: true } },
        // Medalhas conquistadas (gamificacao).
        medalhas: { include: { medalha: true }, orderBy: { concedidaEm: 'desc' } },
        // Pecas aguardando o aval do cliente (M18 — aprovacao no portal).
        conteudos: {
          where: { status: StatusConteudo.APROVACAO_CLIENTE },
          orderBy: { criadoEm: 'desc' },
        },
      },
    });
    if (!cliente) {
      throw new NotFoundException('Portal nao encontrado');
    }

    const contrato = cliente.contratos[0] ?? null;
    const csUsuario = cliente.squad?.membros?.[0]?.usuario ?? null;

    // Catalogo de aulas ativas + flag de concluida para este cliente.
    const aulasAtivas = await this.prisma.aula.findMany({
      where: { ativo: true },
      orderBy: { ordem: 'asc' },
    });
    const concluidas = new Set(cliente.aulasConcluidas.map((a) => a.aulaId));

    // Banner: último comunicado ativo enviado aos clientes.
    const comunicado = await this.prisma.comunicadoCliente.findFirst({
      where: { ativo: true },
      orderBy: { criadoEm: 'desc' },
      select: { mensagem: true, criadoEm: true },
    });

    // Frase motivacional exibida abaixo do nome do CS (Config.parametros.portalFrase).
    const configPortal = await this.prisma.config.findUnique({
      where: { id: CONFIG_ID },
      select: { parametros: true },
    });
    const paramsPortal = (configPortal?.parametros as Record<string, unknown>) ?? {};
    const fraseMotivacional =
      typeof paramsPortal.portalFrase === 'string' ? paramsPortal.portalFrase : null;

    return {
      cliente: {
        nomeFantasia: cliente.nomeFantasia,
        status: cliente.status,
        codigoUnico: cliente.codigoUnico,
      },
      squad: cliente.squad ? { nome: cliente.squad.nome } : null,
      // CS responsavel pelo cliente (para a saudacao "seu CS" no onboarding).
      cs: csUsuario ? { nome: csUsuario.nome, fotoUrl: csUsuario.fotoUrl } : null,
      // Frase motivacional configurável (exibida abaixo do nome do CS no portal).
      fraseMotivacional,
      linkAreaMembros: cliente.linkAreaMembros,
      // Banner de comunicado (ex.: "amanhã é feriado, sem expediente").
      comunicado: comunicado ? { mensagem: comunicado.mensagem, criadoEm: comunicado.criadoEm } : null,
      // Medalhas conquistadas (gamificação).
      medalhas: cliente.medalhas.map((m) => ({
        titulo: m.medalha.titulo,
        icone: m.medalha.icone,
        descricao: m.medalha.descricao,
      })),
      plano: cliente.plano ? { nome: cliente.plano.nome } : null,
      contrato: contrato
        ? { status: contrato.status, vencimento: contrato.vencimento }
        : null,
      onboarding: cliente.onboarding
        ? {
            progresso: cliente.onboarding.progresso,
            concluido: cliente.onboarding.concluido,
            etapas: cliente.onboarding.etapas.map((e) => ({
              titulo: e.titulo,
              descricao: e.descricao,
              link: e.link,
              concluido: e.concluido,
              ordem: e.ordem,
            })),
          }
        : null,
      // Agenda do onboarding (datas + o que levar a cada reuniao).
      eventos: cliente.eventosOnboarding.map((ev) => ({
        id: ev.id,
        titulo: ev.titulo,
        descricao: ev.descricao,
        data: ev.data,
        oQueLevar: ev.oQueLevar,
        meetLink: ev.meetLink,
      })),
      // Aulas do onboarding educativo, com a flag de concluida do cliente.
      aulas: aulasAtivas.map((a) => ({
        id: a.id,
        titulo: a.titulo,
        descricao: a.descricao,
        videoUrl: a.videoUrl,
        ordem: a.ordem,
        concluida: concluidas.has(a.id),
      })),
      faturas: cliente.faturas.map((f) => ({
        codigoUnico: f.codigoUnico,
        valor: f.valor.toString(),
        vencimento: f.vencimento,
        status: f.status,
        notaFiscalUrl: f.notaFiscalUrl,
      })),
      conteudosParaAprovar: cliente.conteudos.map((c) => ({
        id: c.id,
        titulo: c.titulo,
        descricao: c.descricao,
        tipo: c.tipo,
        // URL da mídia (imagem/vídeo/carrossel) para o cliente visualizar (B5, l.258).
        midiaUrl: c.midiaUrl,
        codigoUnico: c.codigoUnico,
      })),
    };
  }

  // Carrega a peca garantindo que pertence ao cliente do portal e que esta
  // mesmo aguardando aprovacao — evita que um link aprove peca de outro.
  private async conteudoDoCliente(codigo: string, conteudoId: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { codigoUnico: codigo },
    });
    if (!cliente) {
      throw new NotFoundException('Portal nao encontrado');
    }
    const conteudo = await this.prisma.conteudo.findUnique({
      where: { id: conteudoId },
      select: { id: true, clienteId: true, status: true, responsavelId: true, paraTrafego: true },
    });
    if (!conteudo || conteudo.clienteId !== cliente.id) {
      throw new NotFoundException('Peca nao encontrada neste portal');
    }
    if (conteudo.status !== StatusConteudo.APROVACAO_CLIENTE) {
      throw new BadRequestException('Esta peca nao esta aguardando aprovacao');
    }
    return conteudo;
  }

  // Cliente aprova a peca: avalia dimensionalmente e a peca segue para AGENDADO.
  // Cria registro Avaliacao (M18) com as dimensoes qualidade e facilidade.
  async aprovar(
    codigo: string,
    conteudoId: string,
    dados: {
      estrelas: number;
      qualidadeGrafica?: number;
      qualidadeTexto?: number;
      facilidadeAprovar?: number;
      comentario?: string;
    },
  ) {
    const conteudo = await this.conteudoDoCliente(codigo, conteudoId);

    // Roteamento pos-aprovacao: peca de trafego pago vai para o laboratorio de
    // criativos (o gestor sobe o anuncio); organica vai direto para agendamento.
    const destino = conteudo.paraTrafego
      ? StatusConteudo.LABORATORIO
      : StatusConteudo.AGENDADO;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.conteudo.update({
        where: { id: conteudoId },
        data: {
          status: destino,
          estrelas: dados.estrelas,
          comentarioCliente: dados.comentario,
          aprovadoEm: new Date(),
        },
      });

      // Cria Avaliacao dimensional apenas quando ao menos uma dimensao e informada.
      const temDimensao =
        dados.qualidadeGrafica != null ||
        dados.qualidadeTexto != null ||
        dados.facilidadeAprovar != null;

      if (temDimensao) {
        await tx.avaliacao.create({
          data: {
            conteudoId,
            responsavelId: conteudo.responsavelId ?? undefined,
            qualidadeGrafica: dados.qualidadeGrafica,
            qualidadeTexto: dados.qualidadeTexto,
            facilidadeAprovar: dados.facilidadeAprovar,
          },
        });
      }

      return updated;
    });
  }

  // Cliente pede ajuste: a peca volta para PRODUCAO e registra ReworkLog EXTERNO.
  async solicitarAjuste(
    codigo: string,
    conteudoId: string,
    dados: { comentario: string },
  ) {
    await this.conteudoDoCliente(codigo, conteudoId);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.conteudo.update({
        where: { id: conteudoId },
        data: {
          status: StatusConteudo.PRODUCAO,
          comentarioCliente: dados.comentario,
          reworkCount: { increment: 1 },
        },
      });

      await tx.reworkLog.create({
        data: {
          conteudoId,
          statusDe: StatusConteudo.APROVACAO_CLIENTE,
          statusPara: StatusConteudo.PRODUCAO,
          origem: 'EXTERNO',
          comentario: dados.comentario,
        },
      });

      return updated;
    });
  }

  // Cliente solicita uma nova peca de conteudo pelo portal — entra como IDEIA
  // para a equipe pegar no kanban de Conteudos.
  async submeterDemanda(codigo: string, dados: SubmeterDemandaDto) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { codigoUnico: codigo },
    });
    if (!cliente) throw new NotFoundException('Portal nao encontrado');

    const descricaoFinal = dados.descricao
      ? `[${dados.prioridade}] ${dados.descricao}`
      : `[${dados.prioridade}]`;

    return this.prisma.conteudo.create({
      data: {
        titulo: dados.titulo,
        descricao: descricaoFinal,
        tipo: dados.tipo as TipoConteudo,
        status: StatusConteudo.IDEIA,
        codigoUnico: this.codigoUnicoSvc.gerar('DEM'),
        clienteId: cliente.id,
      },
      select: { id: true, codigoUnico: true, titulo: true, status: true },
    });
  }

  // Cliente marca uma aula do onboarding como assistida (idempotente).
  async marcarAulaConcluida(codigo: string, aulaId: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { codigoUnico: codigo },
      select: { id: true },
    });
    if (!cliente) throw new NotFoundException('Portal nao encontrado');

    const aula = await this.prisma.aula.findUnique({
      where: { id: aulaId },
      select: { id: true },
    });
    if (!aula) throw new NotFoundException('Aula nao encontrada');

    await this.prisma.aulaConclusao.upsert({
      where: { aulaId_clienteId: { aulaId, clienteId: cliente.id } },
      create: { aulaId, clienteId: cliente.id },
      update: {},
    });
    return { ok: true };
  }
}
