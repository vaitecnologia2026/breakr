// Painel "Hoje & Atrasados" — agregacao cross-modulo que alimenta a tela inicial.
// Cruza contadores de todos os modulos em paralelo e monta a lista de "acoes
// necessarias" (o que precisa de atencao agora) + metricas operacionais.
import { Injectable } from '@nestjs/common';
import {
  ClienteStatus,
  StatusBug,
  StatusCandidato,
  StatusCompra,
  StatusConteudo,
  StatusContrato,
  StatusFatura,
  StatusLead,
  SeveridadeBug,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Tom = 'info' | 'alerta' | 'erro';
interface AcaoPainel {
  chave: string;
  label: string;
  count: number;
  link: string;
  tom: Tom;
}

@Injectable()
export class PainelService {
  constructor(private readonly prisma: PrismaService) {}

  async resumo() {
    const agora = new Date();
    const SETENTA_DUAS_HORAS = new Date(agora.getTime() - 72 * 60 * 60 * 1000);

    const [
      clientesAtivos,
      clientesOnboard,
      clientesTotal,
      leadsAtivos,
      contratosEmRevisao,
      contratosEmVigor,
      contratosEmRenovacao,
      faturasPendentes,
      faturasVencidas,
      conteudosParaAprovar,
      conteudosEmProducao,
      onboardingsEmAndamento,
      candidatosEmProcesso,
      comprasSolicitadas,
      bugsAbertos,
      bugsCriticos,
      execucoesMotor,
      csatData,
      conteudosSlaRisco,
    ] = await Promise.all([
      this.prisma.cliente.count({ where: { status: ClienteStatus.ATIVO } }),
      this.prisma.cliente.count({ where: { status: ClienteStatus.ONBOARD } }),
      this.prisma.cliente.count(),
      this.prisma.lead.count({
        where: { status: { notIn: [StatusLead.GANHO, StatusLead.PERDIDO] } },
      }),
      this.prisma.contrato.count({ where: { status: StatusContrato.EM_REVISAO } }),
      this.prisma.contrato.count({ where: { status: StatusContrato.EM_VIGOR } }),
      this.prisma.contrato.count({ where: { status: StatusContrato.RENOVACAO } }),
      this.prisma.fatura.count({ where: { status: StatusFatura.PENDENTE } }),
      this.prisma.fatura.count({
        where: { status: StatusFatura.PENDENTE, vencimento: { lt: agora } },
      }),
      this.prisma.conteudo.count({ where: { status: StatusConteudo.APROVACAO_CLIENTE } }),
      this.prisma.conteudo.count({
        where: {
          status: { in: [StatusConteudo.ROTEIRO, StatusConteudo.PRODUCAO, StatusConteudo.REVISAO] },
        },
      }),
      this.prisma.onboarding.count({ where: { concluido: false } }),
      this.prisma.candidato.count({
        where: { status: { notIn: [StatusCandidato.APROVADO, StatusCandidato.REPROVADO] } },
      }),
      this.prisma.compra.count({ where: { status: StatusCompra.SOLICITADA } }),
      this.prisma.bug.count({
        where: { status: { notIn: [StatusBug.RESOLVIDO, StatusBug.FECHADO] } },
      }),
      this.prisma.bug.count({
        where: {
          severidade: SeveridadeBug.CRITICA,
          status: { notIn: [StatusBug.RESOLVIDO, StatusBug.FECHADO] },
        },
      }),
      this.prisma.jobExecution.count(),
      // CSAT: media das avaliacoes de conteudo aprovadas via portal (1..5 estrelas).
      this.prisma.conteudo.aggregate({
        _avg: { estrelas: true },
        _count: { estrelas: true },
        where: { estrelas: { not: null } },
      }),
      // SLA 72h: pecas ativas (em producao/revisao/aprovacao) sem atividade nas ultimas 72h.
      this.prisma.conteudo.count({
        where: {
          status: {
            in: [StatusConteudo.PRODUCAO, StatusConteudo.REVISAO, StatusConteudo.APROVACAO_CLIENTE],
          },
          atualizadoEm: { lt: SETENTA_DUAS_HORAS },
        },
      }),
    ]);

    // Acoes necessarias: so entram buckets com itens (count > 0), ordenadas por urgencia.
    const acoes: AcaoPainel[] = [];
    if (faturasVencidas) {
      acoes.push({ chave: 'faturas-vencidas', label: 'Faturas vencidas', count: faturasVencidas, link: '/cobrancas', tom: 'erro' });
    }
    if (bugsCriticos) {
      acoes.push({ chave: 'bugs-criticos', label: 'Bugs criticos abertos', count: bugsCriticos, link: '/desenvolvimento', tom: 'erro' });
    }
    if (contratosEmRevisao) {
      acoes.push({ chave: 'contratos-revisao', label: 'Contratos para revisar', count: contratosEmRevisao, link: '/contratos', tom: 'alerta' });
    }
    if (comprasSolicitadas) {
      acoes.push({ chave: 'compras-aprovar', label: 'Compras para aprovar', count: comprasSolicitadas, link: '/compras', tom: 'alerta' });
    }
    if (contratosEmRenovacao) {
      acoes.push({ chave: 'contratos-renovacao', label: 'Contratos em renovacao', count: contratosEmRenovacao, link: '/contratos', tom: 'alerta' });
    }
    if (faturasPendentes) {
      acoes.push({ chave: 'faturas-pendentes', label: 'Cobrancas pendentes', count: faturasPendentes, link: '/cobrancas', tom: 'info' });
    }
    if (conteudosParaAprovar) {
      acoes.push({ chave: 'conteudo-aprovacao', label: 'Pecas aguardando o cliente', count: conteudosParaAprovar, link: '/conteudos', tom: 'info' });
    }
    if (conteudosSlaRisco) {
      acoes.push({ chave: 'sla-risco', label: 'Pecas sem atividade +72h (SLA)', count: conteudosSlaRisco, link: '/conteudos', tom: 'erro' });
    }

    const csatMedia = csatData._avg.estrelas;
    const csatTotal = csatData._count.estrelas;

    return {
      clientes: { ativos: clientesAtivos, onboard: clientesOnboard, total: clientesTotal },
      comercial: { leadsAtivos },
      operacao: {
        contratosEmVigor,
        conteudosEmProducao,
        onboardingsEmAndamento,
        candidatosEmProcesso,
      },
      motor: { execucoes: execucoesMotor },
      csat: {
        media: csatMedia !== null ? Math.round(csatMedia * 10) / 10 : null,
        total: csatTotal,
      },
      acoes,
    };
  }

  async inbox() {
    const agora = new Date();
    const SLA_72H = new Date(agora.getTime() - 72 * 60 * 60 * 1000);

    const [faturasVencidas, bugsCriticos, contratosRevisao, comprasSolicitadas, conteudosSla, conteudosAprovar] =
      await Promise.all([
        this.prisma.fatura.findMany({
          where: { status: StatusFatura.PENDENTE, vencimento: { lt: agora } },
          take: 10,
          orderBy: { vencimento: 'asc' },
          include: { cliente: { select: { nomeFantasia: true } } },
        }),
        this.prisma.bug.findMany({
          where: { severidade: SeveridadeBug.CRITICA, status: { notIn: [StatusBug.RESOLVIDO, StatusBug.FECHADO] } },
          take: 10,
          orderBy: { criadoEm: 'desc' },
          select: { id: true, titulo: true, severidade: true, status: true },
        }),
        this.prisma.contrato.findMany({
          where: { status: StatusContrato.EM_REVISAO },
          take: 10,
          select: { id: true, codigoUnico: true, status: true, cliente: { select: { nomeFantasia: true } } },
        }),
        this.prisma.compra.findMany({
          where: { status: StatusCompra.SOLICITADA },
          take: 10,
          orderBy: { criadoEm: 'desc' },
          select: { id: true, descricao: true, valor: true, criadoEm: true },
        }),
        this.prisma.conteudo.findMany({
          where: {
            status: { in: [StatusConteudo.PRODUCAO, StatusConteudo.REVISAO, StatusConteudo.APROVACAO_CLIENTE] },
            atualizadoEm: { lt: SLA_72H },
          },
          take: 10,
          orderBy: { atualizadoEm: 'asc' },
          select: { id: true, titulo: true, status: true, cliente: { select: { nomeFantasia: true } } },
        }),
        this.prisma.conteudo.findMany({
          where: { status: StatusConteudo.APROVACAO_CLIENTE },
          take: 10,
          orderBy: { atualizadoEm: 'asc' },
          select: { id: true, titulo: true, status: true, cliente: { select: { nomeFantasia: true } } },
        }),
      ]);

    return { faturasVencidas, bugsCriticos, contratosRevisao, comprasSolicitadas, conteudosSla, conteudosAprovar };
  }
}
