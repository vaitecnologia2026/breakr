// Comissoes apuradas — leitura (read-model) das comissoes de vendas cujo
// pagamento foi confirmado (Fatura PAGA, apos a confirmacao do Asaas).
//
// Regra (mesma da calculadora da tela Comissao): a faixa e definida pelo MRR
// que o vendedor gerou no mes (soma do valorMensal dos contratos pagos), e o
// percentual aplica RETROATIVO sobre todos os contratos pagos do vendedor no
// mes. O vendedor e o `responsavel` do Lead que originou o contrato.
//
// Nao grava nada: apenas le faturas ja marcadas PAGA (o marcarPaga e disparado
// pelo webhook do Asaas — ver WebhooksController).
import { Injectable } from '@nestjs/common';
import { Prisma, StatusFatura } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Faixas padrao (identicas as FAIXAS_PADRAO da tela Comissao).
const FAIXAS = [
  { mrrMin: 0, pctPercent: 4, n: 'base' },
  { mrrMin: 10000, pctPercent: 6, n: 'meta' },
  { mrrMin: 21000, pctPercent: 8, n: 'meta+' },
  { mrrMin: 35000, pctPercent: 10, n: 'super meta' },
];

function faixaDoMrr(mrr: number): { pct: number; label: string; nome: string } {
  let idx = 0;
  FAIXAS.forEach((f, i) => {
    if (mrr >= f.mrrMin) idx = i;
  });
  const f = FAIXAS[idx];
  return { pct: f.pctPercent / 100, label: `${f.pctPercent}%`, nome: f.n };
}

export interface VendaApurada {
  faturaId: string;
  contratoId: string;
  cliente: string;
  valor: number;
  pagaEm: string | null;
}

export interface VendedorApurado {
  vendedorId: string | null;
  vendedor: string;
  mrr: number;
  faixaPct: number;
  faixaLabel: string;
  faixaNome: string;
  comissao: number;
  vendas: VendaApurada[];
}

export interface ComissoesApuradas {
  mes: string; // YYYY-MM
  inicio: string; // ISO
  fim: string; // ISO
  totalMrr: number;
  totalComissao: number;
  totalVendas: number;
  vendedores: VendedorApurado[];
}

@Injectable()
export class ComissoesService {
  constructor(private readonly prisma: PrismaService) {}

  // Apura as comissoes do mes informado (YYYY-MM). Sem parametro -> mes atual.
  async apuradas(mes?: string): Promise<ComissoesApuradas> {
    const agora = new Date();
    let ano = agora.getFullYear();
    let mesIndex = agora.getMonth(); // 0..11
    if (mes && /^\d{4}-\d{2}$/.test(mes)) {
      const [a, m] = mes.split('-').map((x) => parseInt(x, 10));
      ano = a;
      mesIndex = m - 1;
    }
    const inicio = new Date(ano, mesIndex, 1);
    const fim = new Date(ano, mesIndex + 1, 1);
    const mesLabel = `${ano}-${String(mesIndex + 1).padStart(2, '0')}`;

    // Faturas pagas no periodo, com o contrato -> lead -> responsavel (vendedor)
    // e o nome do cliente.
    const faturas = await this.prisma.fatura.findMany({
      where: { status: StatusFatura.PAGA, pagaEm: { gte: inicio, lt: fim } },
      include: {
        cliente: { select: { nomeFantasia: true } },
        contrato: {
          select: {
            id: true,
            valorMensal: true,
            lead: {
              select: {
                responsavelId: true,
                responsavel: { select: { nome: true } },
              },
            },
          },
        },
      },
      orderBy: { pagaEm: 'asc' },
    });

    // Agrupa por vendedor (responsavel do lead). Sem responsavel -> "Sem vendedor".
    const grupos = new Map<
      string,
      { vendedorId: string | null; vendedor: string; vendas: VendaApurada[]; mrr: number }
    >();

    const num = (d: Prisma.Decimal | number | null | undefined) =>
      d == null ? 0 : Number(d);

    for (const f of faturas) {
      const vendedorId = f.contrato?.lead?.responsavelId ?? null;
      const vendedor = f.contrato?.lead?.responsavel?.nome ?? 'Sem vendedor';
      const chave = vendedorId ?? '__sem_vendedor__';
      // Base da comissao = valor mensal do contrato (MRR da venda); fallback: valor da fatura.
      const valor = num(f.contrato?.valorMensal) || num(f.valor);

      const g =
        grupos.get(chave) ??
        { vendedorId, vendedor, vendas: [] as VendaApurada[], mrr: 0 };
      g.vendas.push({
        faturaId: f.id,
        contratoId: f.contrato?.id ?? '',
        cliente: f.cliente?.nomeFantasia ?? '—',
        valor,
        pagaEm: f.pagaEm ? f.pagaEm.toISOString() : null,
      });
      g.mrr += valor;
      grupos.set(chave, g);
    }

    const vendedores: VendedorApurado[] = [];
    let totalMrr = 0;
    let totalComissao = 0;
    let totalVendas = 0;

    for (const g of grupos.values()) {
      const faixa = faixaDoMrr(g.mrr);
      // Retroativo: percentual da faixa aplica sobre todos os contratos do vendedor.
      const comissao = g.vendas.reduce((s, v) => s + v.valor * faixa.pct, 0);
      totalMrr += g.mrr;
      totalComissao += comissao;
      totalVendas += g.vendas.length;
      vendedores.push({
        vendedorId: g.vendedorId,
        vendedor: g.vendedor,
        mrr: g.mrr,
        faixaPct: faixa.pct,
        faixaLabel: faixa.label,
        faixaNome: faixa.nome,
        comissao,
        vendas: g.vendas,
      });
    }

    // Maior comissao primeiro.
    vendedores.sort((a, b) => b.comissao - a.comissao);

    return {
      mes: mesLabel,
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      totalMrr,
      totalComissao,
      totalVendas,
      vendedores,
    };
  }
}
