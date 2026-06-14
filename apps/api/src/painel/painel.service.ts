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
      acoes,
    };
  }
}
