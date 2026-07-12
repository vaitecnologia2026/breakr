// Metricas e desempenho de marketing (Briefing Marketing — Secao 7) + comparativos
// historicos (Secao 12, item 11). Servico SOMENTE LEITURA: agrega os materiais do
// pipeline (MaterialCampanha) por squad, membro e cliente, e a evolucao mensal.
// Nao cria/edita nada; nao altera modelos.
import { Injectable } from '@nestjs/common';
import { StatusMaterial } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Momento de conclusao aproximado: usamos atualizadoEm do material CONCLUIDO como
// proxy (nao ha timestamp dedicado de conclusao no schema). Documentado no README.
@Injectable()
export class MetricasMarketingService {
  constructor(private readonly prisma: PrismaService) {}

  private mesChave(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  async metricas(filtros: { squadId?: string; clienteId?: string; meses?: number }) {
    const squadId = filtros.squadId || undefined;
    const clienteId = filtros.clienteId || undefined;
    const meses = Math.min(Math.max(filtros.meses ?? 6, 1), 24);

    const materiais = await this.prisma.materialCampanha.findMany({
      where: {
        campanha: {
          ...(squadId ? { squadId } : {}),
          ...(clienteId ? { clienteId } : {}),
        },
      },
      select: {
        status: true,
        prazo: true,
        reworkCount: true,
        atualizadoEm: true,
        responsavel: { select: { id: true, nome: true } },
        campanha: {
          select: {
            squadId: true,
            clienteId: true,
            squad: { select: { nome: true } },
            cliente: { select: { nomeFantasia: true } },
          },
        },
      },
    });

    const concluido = (s: StatusMaterial) => s === StatusMaterial.CONCLUIDO;
    const noPrazo = (m: (typeof materiais)[number]) =>
      concluido(m.status) && m.prazo != null && m.atualizadoEm.getTime() <= m.prazo.getTime();
    const foraPrazo = (m: (typeof materiais)[number]) =>
      concluido(m.status) && m.prazo != null && m.atualizadoEm.getTime() > m.prazo.getTime();

    // ---- Geral ----
    const totalMateriais = materiais.length;
    const concluidos = materiais.filter((m) => concluido(m.status)).length;
    const emAberto = totalMateriais - concluidos;
    const totalRetrabalho = materiais.reduce((s, m) => s + (m.reworkCount ?? 0), 0);
    const comPrazoConcluidos = materiais.filter((m) => concluido(m.status) && m.prazo != null).length;
    const totalNoPrazo = materiais.filter(noPrazo).length;
    const taxaNoPrazo = comPrazoConcluidos > 0 ? Math.round((totalNoPrazo / comPrazoConcluidos) * 100) : null;

    // ---- Por squad ----
    const squadMap = new Map<string, { nome: string; concluidos: number; noPrazo: number; foraPrazo: number; retrabalho: number; abertas: number }>();
    // ---- Por membro ----
    const membroMap = new Map<string, { nome: string; concluidos: number; noPrazo: number; foraPrazo: number; retrabalho: number; abertas: number }>();
    // ---- Por cliente ----
    const clienteMap = new Map<string, { nome: string; concluidos: number; retrabalho: number; total: number }>();
    // ---- Evolucao mensal (concluidos por mes) ----
    const mensalMap = new Map<string, number>();

    for (const m of materiais) {
      const c = m.campanha;
      // squad
      const sid = c?.squadId ?? '__sem_squad__';
      const sNome = c?.squad?.nome ?? 'Sem squad';
      const sAgg = squadMap.get(sid) ?? { nome: sNome, concluidos: 0, noPrazo: 0, foraPrazo: 0, retrabalho: 0, abertas: 0 };
      if (concluido(m.status)) sAgg.concluidos += 1; else sAgg.abertas += 1;
      if (noPrazo(m)) sAgg.noPrazo += 1;
      if (foraPrazo(m)) sAgg.foraPrazo += 1;
      sAgg.retrabalho += m.reworkCount ?? 0;
      squadMap.set(sid, sAgg);

      // membro
      if (m.responsavel) {
        const mAgg = membroMap.get(m.responsavel.id) ?? { nome: m.responsavel.nome, concluidos: 0, noPrazo: 0, foraPrazo: 0, retrabalho: 0, abertas: 0 };
        if (concluido(m.status)) mAgg.concluidos += 1; else mAgg.abertas += 1;
        if (noPrazo(m)) mAgg.noPrazo += 1;
        if (foraPrazo(m)) mAgg.foraPrazo += 1;
        mAgg.retrabalho += m.reworkCount ?? 0;
        membroMap.set(m.responsavel.id, mAgg);
      }

      // cliente
      const cid = c?.clienteId ?? '__sem_cliente__';
      const cNome = c?.cliente?.nomeFantasia ?? 'Sem cliente';
      const cAgg = clienteMap.get(cid) ?? { nome: cNome, concluidos: 0, retrabalho: 0, total: 0 };
      cAgg.total += 1;
      if (concluido(m.status)) cAgg.concluidos += 1;
      cAgg.retrabalho += m.reworkCount ?? 0;
      clienteMap.set(cid, cAgg);

      // evolucao mensal (so concluidos, por mes da conclusao aprox.)
      if (concluido(m.status)) {
        const chave = this.mesChave(m.atualizadoEm);
        mensalMap.set(chave, (mensalMap.get(chave) ?? 0) + 1);
      }
    }

    const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : null);

    const porSquad = Array.from(squadMap.values())
      .map((s) => ({ ...s, taxaNoPrazo: pct(s.noPrazo, s.noPrazo + s.foraPrazo) }))
      .sort((a, b) => b.concluidos - a.concluidos);

    const porMembro = Array.from(membroMap.values())
      .map((m) => ({ ...m, taxaNoPrazo: pct(m.noPrazo, m.noPrazo + m.foraPrazo) }))
      .sort((a, b) => b.concluidos - a.concluidos);

    const porCliente = Array.from(clienteMap.values())
      .map((c) => ({ ...c, mediaRetrabalho: c.total > 0 ? Math.round((c.retrabalho / c.total) * 100) / 100 : 0 }))
      .sort((a, b) => b.retrabalho - a.retrabalho);

    // Ultimos N meses (inclui meses zerados). Base = mes atual.
    const agora = new Date();
    const evolucaoMensal: { mes: string; concluidos: number }[] = [];
    for (let i = meses - 1; i >= 0; i--) {
      const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      const chave = this.mesChave(d);
      evolucaoMensal.push({ mes: chave, concluidos: mensalMap.get(chave) ?? 0 });
    }

    return {
      filtros: { squadId: squadId ?? null, clienteId: clienteId ?? null, meses },
      geral: {
        totalMateriais,
        concluidos,
        emAberto,
        totalRetrabalho,
        taxaNoPrazo,
      },
      porSquad,
      porMembro,
      porCliente,
      evolucaoMensal,
    };
  }

  // Opcoes de filtro (squads ativos + clientes com campanha).
  async filtros() {
    const [squads, clientes] = await Promise.all([
      this.prisma.squad.findMany({ where: { ativo: true }, select: { id: true, nome: true }, orderBy: { nome: 'asc' } }),
      this.prisma.cliente.findMany({ where: { campanhasMarketing: { some: {} } }, select: { id: true, nomeFantasia: true }, orderBy: { nomeFantasia: 'asc' } }),
    ]);
    return { squads, clientes };
  }
}
