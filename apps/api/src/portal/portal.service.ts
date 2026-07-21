// Servico do portal do cliente. Monta a visao READ-ONLY que o cliente final
// (dono do restaurante) ve em /portal/:codigo — onboarding, contrato e faturas.
// Devolve apenas dados operacionais do proprio cliente, nada interno.
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StatusConteudo, StatusEstrategia, TipoConteudo } from '@prisma/client';
import { StatusMaterial } from '../common/status-material';
import { Cargo, FuncaoSquad } from '@breakr/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CodigoUnicoService } from '../common/codigo-unico/codigo-unico.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { PortalRelatorioPdfService } from './portal-relatorio-pdf.service';
import { SubmeterDemandaDto } from './dto/submeter-demanda.dto';

// Config singleton — mesma linha usada por IntegracoesConfigService/PortalConfigService.
const CONFIG_ID = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class PortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codigoUnicoSvc: CodigoUnicoService,
    private readonly notificacoes: NotificacoesService,
    private readonly relatorioPdfSvc: PortalRelatorioPdfService,
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
        // Estrategia enviada aguardando aprovacao do cliente (B6, l.202-208).
        estrategias: {
          where: { status: StatusEstrategia.ENVIADA },
          orderBy: { enviadaEm: 'desc' },
          take: 1,
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

    // Pesquisas ativas que este cliente ainda nao respondeu (req. l.44-46).
    const pesquisasPendentes = await this.prisma.pesquisa.findMany({
      where: { ativa: true, respostas: { none: { clienteId: cliente.id } } },
      select: { id: true, titulo: true, descricao: true },
      orderBy: { criadoEm: 'desc' },
    });

    // Materiais de campanha aguardando o aval do cliente (Briefing Marketing —
    // Secao 9, Modulo 1). Somente do proprio cliente e no status AGUARDANDO_APROVACAO.
    const materiaisParaAprovar = await this.prisma.materialCampanha.findMany({
      where: {
        status: StatusMaterial.AGUARDANDO_APROVACAO,
        campanha: { clienteId: cliente.id },
      },
      orderBy: { criadoEm: 'desc' },
      select: {
        id: true,
        titulo: true,
        tipo: true,
        destino: true,
        campanha: { select: { nome: true } },
      },
    });

    // Campanhas de trafego pago do cliente (Briefing Marketing — Secao 9, Modulos 2
    // e 3). Somente leitura, so do proprio cliente. Anuncios ativos = status ATIVA;
    // o relatorio agrega todas as campanhas do cliente.
    const campanhasTrafego = await this.prisma.campanha.findMany({
      where: { clienteId: cliente.id },
      orderBy: { criadoEm: 'desc' },
      select: {
        id: true,
        nome: true,
        objetivo: true,
        status: true,
        orcamentoDiario: true,
        gasto: true,
        impressoes: true,
        cliques: true,
        conversoes: true,
        criadoEm: true,
      },
    });
    const anunciosAtivos = campanhasTrafego
      .filter((c) => c.status === 'ATIVA')
      .map((c) => ({
        id: c.id,
        nome: c.nome,
        objetivo: c.objetivo,
        status: c.status,
        orcamentoDiario: c.orcamentoDiario ? c.orcamentoDiario.toString() : null,
        criadoEm: c.criadoEm,
      }));
    const totalImpressoes = campanhasTrafego.reduce((s, c) => s + (c.impressoes ?? 0), 0);
    const totalCliques = campanhasTrafego.reduce((s, c) => s + (c.cliques ?? 0), 0);
    const totalConversoes = campanhasTrafego.reduce((s, c) => s + (c.conversoes ?? 0), 0);
    const totalGasto = campanhasTrafego.reduce((s, c) => s + (c.gasto ? Number(c.gasto) : 0), 0);
    const relatorioResultados = {
      totalCampanhas: campanhasTrafego.length,
      ativos: anunciosAtivos.length,
      impressoes: totalImpressoes,
      cliques: totalCliques,
      ctr: totalImpressoes > 0 ? Math.round((totalCliques / totalImpressoes) * 10000) / 100 : 0,
      investimento: Math.round(totalGasto * 100) / 100,
      conversoes: totalConversoes,
      custoPorResultado: totalConversoes > 0 ? Math.round((totalGasto / totalConversoes) * 100) / 100 : null,
    };

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
      // Estrategia aguardando aprovacao do cliente (B6). Null se nao houver.
      estrategiaParaAprovar: cliente.estrategias[0]
        ? {
            id: cliente.estrategias[0].id,
            titulo: cliente.estrategias[0].titulo,
            descricao: cliente.estrategias[0].descricao,
          }
        : null,
      // Pesquisas do portal pendentes de resposta (req. l.44-46).
      pesquisasPendentes,
      // Materiais de campanha aguardando aprovacao do cliente (Secao 9, Modulo 1).
      materiaisParaAprovar: materiaisParaAprovar.map((m) => ({
        id: m.id,
        titulo: m.titulo,
        tipo: m.tipo,
        destino: m.destino,
        campanha: m.campanha?.nome ?? null,
      })),
      // Anuncios ativos (Secao 9, Modulo 2) e relatorio de resultados (Modulo 3).
      anunciosAtivos,
      relatorioResultados,
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

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.conteudo.update({
        where: { id: conteudoId },
        data: {
          status: StatusConteudo.PRODUCAO,
          comentarioCliente: dados.comentario,
          reworkCount: { increment: 1 },
        },
        include: { cliente: { select: { nomeFantasia: true } } },
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

      return u;
    });

    // O comentario/ajuste do cliente chega ao CS como notificacao (req. l.184).
    await this.notificacoes.notificarPorCargo(Cargo.CS, {
      titulo: 'Cliente pediu ajuste em criativo',
      mensagem: `${updated.cliente?.nomeFantasia ?? 'Cliente'} solicitou ajuste em "${updated.titulo}": ${dados.comentario}`,
      tipo: 'ALERTA',
      link: '/conteudos',
    });

    return updated;
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

  // Carrega a estrategia garantindo que pertence ao cliente do portal e que esta
  // aguardando aprovacao (status ENVIADA) — B6.
  private async estrategiaDoCliente(codigo: string, estrategiaId: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { codigoUnico: codigo },
      select: { id: true },
    });
    if (!cliente) throw new NotFoundException('Portal nao encontrado');
    const estrategia = await this.prisma.estrategia.findUnique({
      where: { id: estrategiaId },
      select: { id: true, clienteId: true, status: true },
    });
    if (!estrategia || estrategia.clienteId !== cliente.id) {
      throw new NotFoundException('Estrategia nao encontrada neste portal');
    }
    if (estrategia.status !== StatusEstrategia.ENVIADA) {
      throw new BadRequestException('Esta estrategia nao esta aguardando aprovacao');
    }
    return estrategia;
  }

  // Cliente aprova a estrategia — libera a producao de conteudo.
  async aprovarEstrategia(
    codigo: string,
    estrategiaId: string,
    dados: { comentario?: string },
  ) {
    await this.estrategiaDoCliente(codigo, estrategiaId);
    const atualizada = await this.prisma.estrategia.update({
      where: { id: estrategiaId },
      data: {
        status: StatusEstrategia.APROVADA,
        comentarioCliente: dados.comentario,
        respondidaEm: new Date(),
      },
      include: { cliente: { select: { nomeFantasia: true } } },
    });
    // O CS acompanha a aprovacao pelo ticket/notificacao (req. l.209).
    await this.notificacoes.notificarPorCargo(Cargo.CS, {
      titulo: 'Estrategia aprovada pelo cliente',
      mensagem:
        `${atualizada.cliente?.nomeFantasia ?? 'Cliente'} aprovou a estrategia "${atualizada.titulo}".` +
        (dados.comentario ? ` Comentario: ${dados.comentario}` : ''),
      tipo: 'SUCESSO',
      link: '/estrategia',
    });
    return atualizada;
  }

  // Cliente pede ajuste na estrategia — volta para a estrategista.
  async solicitarAjusteEstrategia(
    codigo: string,
    estrategiaId: string,
    dados: { comentario: string },
  ) {
    await this.estrategiaDoCliente(codigo, estrategiaId);
    const atualizada = await this.prisma.estrategia.update({
      where: { id: estrategiaId },
      data: {
        status: StatusEstrategia.AJUSTE,
        comentarioCliente: dados.comentario,
        respondidaEm: new Date(),
      },
      include: { cliente: { select: { nomeFantasia: true } } },
    });
    // O comentario do cliente sobre a estrategia chega ao CS (req. l.209).
    await this.notificacoes.notificarPorCargo(Cargo.CS, {
      titulo: 'Cliente pediu ajuste na estrategia',
      mensagem: `${atualizada.cliente?.nomeFantasia ?? 'Cliente'} solicitou ajuste na estrategia "${atualizada.titulo}": ${dados.comentario}`,
      tipo: 'ALERTA',
      link: '/estrategia',
    });
    return atualizada;
  }

  // Cliente responde uma pesquisa pelo portal (req. l.46). Idempotente por
  // (pesquisa, cliente) — upsert evita duplicar se reenviar.
  async responderPesquisa(
    codigo: string,
    pesquisaId: string,
    dados: { nota?: number; comentario?: string },
  ) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { codigoUnico: codigo },
      select: { id: true },
    });
    if (!cliente) throw new NotFoundException('Portal nao encontrado');
    const pesquisa = await this.prisma.pesquisa.findUnique({
      where: { id: pesquisaId },
      select: { id: true, ativa: true },
    });
    if (!pesquisa || !pesquisa.ativa) {
      throw new NotFoundException('Pesquisa nao disponivel');
    }
    if (
      dados.nota !== undefined &&
      (!Number.isInteger(dados.nota) || dados.nota < 0 || dados.nota > 10)
    ) {
      throw new BadRequestException('Nota deve ser um inteiro de 0 a 10.');
    }
    return this.prisma.respostaPesquisa.upsert({
      where: { pesquisaId_clienteId: { pesquisaId, clienteId: cliente.id } },
      create: {
        pesquisaId,
        clienteId: cliente.id,
        nota: dados.nota,
        comentario: dados.comentario,
      },
      update: { nota: dados.nota, comentario: dados.comentario },
    });
  }

  // Carrega o material garantindo que pertence ao cliente do portal e que esta
  // mesmo aguardando aprovacao — evita que um link aprove material de outro
  // (Briefing Marketing — Secao 9, Modulo 1).
  private async materialDoCliente(codigo: string, materialId: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { codigoUnico: codigo },
      select: { id: true },
    });
    if (!cliente) throw new NotFoundException('Portal nao encontrado');
    const material = await this.prisma.materialCampanha.findUnique({
      where: { id: materialId },
      select: {
        id: true,
        titulo: true,
        status: true,
        campanha: { select: { clienteId: true, nome: true } },
      },
    });
    if (!material || material.campanha?.clienteId !== cliente.id) {
      throw new NotFoundException('Material nao encontrado neste portal');
    }
    if (material.status !== StatusMaterial.AGUARDANDO_APROVACAO) {
      throw new BadRequestException('Este material nao esta aguardando aprovacao');
    }
    return material;
  }

  // Cliente APROVA o material (com ou sem ressalvas). Segue para o destino final:
  // o material vai para APROVADO e a equipe interna encaminha (trafego/organico/
  // impressao). "Aprovar com ressalvas" = aprovado com um ajuste menor no comentario.
  async aprovarMaterial(
    codigo: string,
    materialId: string,
    dados: { comRessalvas?: boolean; comentario?: string },
  ) {
    const material = await this.materialDoCliente(codigo, materialId);
    const decisao = dados.comRessalvas ? 'RESSALVAS' : 'APROVADO';

    const atualizado = await this.prisma.materialCampanha.update({
      where: { id: materialId },
      data: {
        status: StatusMaterial.APROVADO,
        decisaoCliente: decisao,
        comentarioCliente: dados.comentario?.trim() || null,
        aprovadoEm: new Date(),
      },
      include: { campanha: { select: { cliente: { select: { nomeFantasia: true } } } } },
    });

    // O aval do cliente chega ao CS (feedback vinculado a tarefa interna).
    const cli = atualizado.campanha?.cliente?.nomeFantasia ?? 'Cliente';
    await this.notificacoes.notificarPorCargo(Cargo.CS, {
      titulo: dados.comRessalvas ? 'Material aprovado com ressalvas' : 'Material aprovado pelo cliente',
      mensagem:
        `${cli} aprovou o material "${material.titulo}"` +
        (dados.comRessalvas ? ' com ressalvas.' : '.') +
        (dados.comentario ? ` Comentario: ${dados.comentario}` : ''),
      tipo: dados.comRessalvas ? 'ALERTA' : 'SUCESSO',
      link: '/campanhas',
    });
    return atualizado;
  }

  // Cliente REPROVA o material: volta para EM_AJUSTE (retrabalho), com o comentario
  // obrigatorio vinculado a tarefa. Incrementa reworkCount (mesma semantica do board).
  async reprovarMaterial(
    codigo: string,
    materialId: string,
    dados: { comentario: string },
  ) {
    const material = await this.materialDoCliente(codigo, materialId);

    const atualizado = await this.prisma.materialCampanha.update({
      where: { id: materialId },
      data: {
        status: StatusMaterial.EM_AJUSTE,
        decisaoCliente: 'REPROVADO',
        comentarioCliente: dados.comentario.trim(),
        reworkCount: { increment: 1 },
      },
      include: { campanha: { select: { cliente: { select: { nomeFantasia: true } } } } },
    });

    const cli = atualizado.campanha?.cliente?.nomeFantasia ?? 'Cliente';
    await this.notificacoes.notificarPorCargo(Cargo.CS, {
      titulo: 'Cliente reprovou um material',
      mensagem: `${cli} reprovou o material "${material.titulo}": ${dados.comentario}`,
      tipo: 'ALERTA',
      link: '/campanhas',
    });
    return atualizado;
  }

  // Gera o relatorio de resultados do cliente em PDF (Briefing Marketing — Secao 12,
  // item 12). Reune as campanhas de trafego do proprio cliente e agrega os numeros.
  async gerarRelatorioPdf(codigo: string): Promise<{ buffer: Buffer; nomeArquivo: string }> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { codigoUnico: codigo },
      select: { id: true, nomeFantasia: true },
    });
    if (!cliente) throw new NotFoundException('Portal nao encontrado');

    const campanhas = await this.prisma.campanha.findMany({
      where: { clienteId: cliente.id },
      select: {
        nome: true, objetivo: true, status: true,
        gasto: true, impressoes: true, cliques: true, conversoes: true,
      },
    });
    const impressoes = campanhas.reduce((s, c) => s + (c.impressoes ?? 0), 0);
    const cliques = campanhas.reduce((s, c) => s + (c.cliques ?? 0), 0);
    const conversoes = campanhas.reduce((s, c) => s + (c.conversoes ?? 0), 0);
    const investimento = campanhas.reduce((s, c) => s + (c.gasto ? Number(c.gasto) : 0), 0);
    const ativosLista = campanhas.filter((c) => c.status === 'ATIVA');

    const buffer = await this.relatorioPdfSvc.gerar({
      clienteNome: cliente.nomeFantasia,
      geradoEm: new Date(),
      totalCampanhas: campanhas.length,
      ativos: ativosLista.length,
      impressoes,
      cliques,
      ctr: impressoes > 0 ? Math.round((cliques / impressoes) * 10000) / 100 : 0,
      investimento: Math.round(investimento * 100) / 100,
      conversoes,
      custoPorResultado: conversoes > 0 ? Math.round((investimento / conversoes) * 100) / 100 : null,
      anuncios: ativosLista.map((c) => ({ nome: c.nome, objetivo: c.objetivo, status: c.status })),
    });
    return { buffer, nomeArquivo: `relatorio-${codigo}.pdf` };
  }
}
