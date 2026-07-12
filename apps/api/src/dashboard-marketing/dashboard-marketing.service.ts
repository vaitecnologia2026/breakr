// Dashboard da Coordenadora de Marketing (Briefing Marketing — Secoes 5 e 6).
// Servico SOMENTE LEITURA: agrega dados que ja existem (campanhas de marketing,
// materiais/pipeline, onboarding, squads, clientes, usuarios) nos 4 blocos do
// briefing + a central de alertas por prioridade. Nao cria/edita nenhuma entidade
// e nao altera nenhum modelo — apenas deriva visoes.
import { Injectable } from '@nestjs/common';
import { StatusMaterial } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Parametros de prazo (Secao 6 cita "prazos configuraveis" pela coordenadora — isso
// e Fase 2 / Prioridade Baixa item 10 do briefing). Por ora ficam como padroes
// sensatos e sao devolvidos no payload (`parametros`) para transparencia na tela.
const PARADO_HORAS = 48; // material parado na mesma etapa ha mais de X horas
const CRITICO_HORAS = 48; // prazo vence nas proximas X horas (prazo critico)
const APROVACAO_PARADA_DIAS = 3; // aguardando aprovacao ha mais de X dias
const AJUSTE_DIAS = 2; // material em ajuste ha mais de X dias sem retomada
const CAMPANHA_SEM_INICIO_DIAS = 7; // campanha planejada com prazo proximo e sem inicio
const SOBRECARGA_TAREFAS = 5; // acima disso o membro e considerado sobrecarregado

// Ordem "canonica" das etapas do pipeline (para exibir os blocos em sequencia).
const ORDEM_STATUS: StatusMaterial[] = [
  StatusMaterial.PLANEJADO,
  StatusMaterial.EM_COPY,
  StatusMaterial.COPY_CONCLUIDA,
  StatusMaterial.EM_DESIGN,
  StatusMaterial.AGUARDANDO_APROVACAO,
  StatusMaterial.APROVADO,
  StatusMaterial.EM_AJUSTE,
  StatusMaterial.ATIVO_TRAFEGO,
  StatusMaterial.CONCLUIDO,
];

// Rotulos legiveis dos status (espelham o briefing, Secao 3).
const ROTULO_STATUS: Record<string, string> = {
  PLANEJADO: 'Planejado',
  EM_COPY: 'Em Copy',
  COPY_CONCLUIDA: 'Copy Concluída',
  EM_DESIGN: 'Em Design',
  AGUARDANDO_APROVACAO: 'Aguard. Aprovação',
  APROVADO: 'Aprovado',
  EM_AJUSTE: 'Em Ajuste',
  ATIVO_TRAFEGO: 'Ativo no Tráfego',
  CONCLUIDO: 'Concluído',
};

// Prioridade dos alertas (para ordenacao/estilo na tela).
type Prioridade = 'ALTA' | 'MEDIA' | 'BAIXA';
const PESO_PRIORIDADE: Record<Prioridade, number> = { ALTA: 0, MEDIA: 1, BAIXA: 2 };

@Injectable()
export class DashboardMarketingService {
  constructor(private readonly prisma: PrismaService) {}

  private horasEntre(a: Date, b: Date): number {
    return (a.getTime() - b.getTime()) / 36e5;
  }
  private diasEntre(a: Date, b: Date): number {
    return this.horasEntre(a, b) / 24;
  }

  // Monta o dashboard completo (4 blocos + alertas). Filtros opcionais por squad
  // e por cliente (Secao 5, Bloco 1) — aplicados de forma consistente aos blocos.
  async painel(filtros: { squadId?: string; clienteId?: string }) {
    const agora = new Date();
    const squadId = filtros.squadId || undefined;
    const clienteId = filtros.clienteId || undefined;

    // Materiais (tarefas do pipeline) com a campanha, cliente, squad e responsavel.
    const materiais = await this.prisma.materialCampanha.findMany({
      where: {
        campanha: {
          ...(squadId ? { squadId } : {}),
          ...(clienteId ? { clienteId } : {}),
        },
      },
      include: {
        responsavel: { select: { id: true, nome: true } },
        campanha: {
          select: {
            id: true,
            nome: true,
            situacao: true,
            prazo: true,
            clienteId: true,
            squadId: true,
            cliente: { select: { nomeFantasia: true } },
            squad: { select: { nome: true } },
          },
        },
      },
    });

    // Campanhas (para o Bloco 2 e para o alerta "campanha sem inicio").
    const campanhas = await this.prisma.campanhaMarketing.findMany({
      where: {
        ...(squadId ? { squadId } : {}),
        ...(clienteId ? { clienteId } : {}),
      },
      orderBy: { prazo: 'asc' },
      include: {
        cliente: { select: { nomeFantasia: true } },
        squad: { select: { nome: true } },
        materiais: { select: { status: true } },
      },
    });

    // Onboarding em andamento (Bloco 3 + alerta de onboarding).
    const onboardings = await this.prisma.onboarding.findMany({
      where: {
        concluido: false,
        ...(clienteId ? { clienteId } : {}),
        ...(squadId ? { cliente: { squadId } } : {}),
      },
      include: {
        cliente: {
          select: { id: true, nomeFantasia: true, pilares: true, squadId: true },
        },
        etapas: { orderBy: { ordem: 'asc' } },
      },
    });

    // Squads ativos (para carga por squad no Bloco 4).
    const squads = await this.prisma.squad.findMany({
      where: { ativo: true },
      select: { id: true, nome: true },
    });

    const naoConcluido = (s: StatusMaterial) => s !== StatusMaterial.CONCLUIDO;
    const alertas: Array<{
      tipo: string;
      prioridade: Prioridade;
      titulo: string;
      descricao: string;
      link?: string;
      referenciaId?: string;
    }> = [];

    // ---------------------------------------------------------------
    // BLOCO 1 — VISAO DE PRODUCAO (total por etapa + materiais parados)
    // ---------------------------------------------------------------
    const porStatus: Record<string, number> = {};
    for (const s of ORDEM_STATUS) porStatus[s] = 0;
    const parados: Array<{
      id: string;
      titulo: string;
      status: string;
      statusRotulo: string;
      horasParado: number;
      campanha: string | null;
      cliente: string | null;
      responsavel: string | null;
    }> = [];

    for (const m of materiais) {
      porStatus[m.status] = (porStatus[m.status] ?? 0) + 1;
      // Materiais parados ha mais de X horas na mesma etapa (proxy: atualizadoEm —
      // a transicao de status atualiza esse campo; outras edicoes tambem, entao e
      // uma aproximacao do tempo-na-etapa, documentada no README da fatia).
      const horasParado = this.horasEntre(agora, m.atualizadoEm);
      if (naoConcluido(m.status) && horasParado >= PARADO_HORAS) {
        parados.push({
          id: m.id,
          titulo: m.titulo,
          status: m.status,
          statusRotulo: ROTULO_STATUS[m.status] ?? m.status,
          horasParado: Math.round(horasParado),
          campanha: m.campanha?.nome ?? null,
          cliente: m.campanha?.cliente?.nomeFantasia ?? null,
          responsavel: m.responsavel?.nome ?? null,
        });
      }
    }
    parados.sort((a, b) => b.horasParado - a.horasParado);

    const producao = {
      totalMateriais: materiais.length,
      etapas: ORDEM_STATUS.map((s) => ({
        status: s,
        rotulo: ROTULO_STATUS[s] ?? s,
        total: porStatus[s] ?? 0,
      })),
      parados,
      totalParados: parados.length,
    };

    // ---------------------------------------------------------------
    // BLOCO 2 — CAMPANHAS ATIVAS E PLANEJADAS
    // ---------------------------------------------------------------
    const iniciado = (s: StatusMaterial) => s !== StatusMaterial.PLANEJADO;
    const listaCampanhas = campanhas.map((c) => {
      const totalMateriais = c.materiais.length;
      const materiaisIniciados = c.materiais.filter((m) => iniciado(m.status)).length;
      const semInicio =
        c.situacao === 'PLANEJADA' && (totalMateriais === 0 || materiaisIniciados === 0);
      const diasParaPrazo = c.prazo ? this.diasEntre(c.prazo, agora) : null;
      return {
        id: c.id,
        nome: c.nome,
        situacao: c.situacao,
        prazo: c.prazo,
        diasParaPrazo: diasParaPrazo === null ? null : Math.round(diasParaPrazo),
        cliente: c.cliente?.nomeFantasia ?? null,
        squad: c.squad?.nome ?? null,
        totalMateriais,
        materiaisIniciados,
        semInicio,
      };
    });

    // ---------------------------------------------------------------
    // BLOCO 3 — CLIENTES EM ONBOARDING (destaque p/ pilar Marketing)
    // ---------------------------------------------------------------
    const listaOnboarding = onboardings.map((o) => {
      const etapaAtual = o.etapas.find((e) => !e.concluido) ?? null;
      const total = o.etapas.length;
      const concluidas = o.etapas.filter((e) => e.concluido).length;
      const marketing = (o.cliente?.pilares ?? []).includes('MARKETING');
      return {
        clienteId: o.cliente?.id ?? null,
        cliente: o.cliente?.nomeFantasia ?? null,
        progresso: o.progresso,
        etapaAtual: etapaAtual?.titulo ?? null,
        etapasConcluidas: concluidas,
        etapasTotal: total,
        pilarMarketing: marketing,
        semSquad: !o.cliente?.squadId,
      };
    });

    // ---------------------------------------------------------------
    // BLOCO 4 — CAPACIDADE DO TIME (tarefas abertas por membro e por squad)
    // ---------------------------------------------------------------
    const porMembro = new Map<string, { id: string; nome: string; abertas: number }>();
    const porSquad = new Map<string, { id: string | null; nome: string; abertas: number }>();
    for (const s of squads) porSquad.set(s.id, { id: s.id, nome: s.nome, abertas: 0 });
    const SEM_SQUAD = '__sem_squad__';

    for (const m of materiais) {
      if (!naoConcluido(m.status)) continue; // so tarefas abertas
      if (m.responsavel) {
        const atual = porMembro.get(m.responsavel.id) ?? {
          id: m.responsavel.id,
          nome: m.responsavel.nome,
          abertas: 0,
        };
        atual.abertas += 1;
        porMembro.set(m.responsavel.id, atual);
      }
      const sid = m.campanha?.squadId ?? SEM_SQUAD;
      const nome = m.campanha?.squad?.nome ?? 'Sem squad';
      const alvo = porSquad.get(sid) ?? { id: m.campanha?.squadId ?? null, nome, abertas: 0 };
      alvo.abertas += 1;
      porSquad.set(sid, alvo);
    }

    const membros = Array.from(porMembro.values())
      .map((x) => ({ ...x, sobrecarregado: x.abertas > SOBRECARGA_TAREFAS }))
      .sort((a, b) => b.abertas - a.abertas);
    const cargaSquads = Array.from(porSquad.values()).sort((a, b) => b.abertas - a.abertas);

    const capacidade = {
      membros,
      squads: cargaSquads,
      limiteSobrecarga: SOBRECARGA_TAREFAS,
    };

    // ---------------------------------------------------------------
    // CENTRAL DE ALERTAS (Secao 6) — deriva do pipeline/campanhas/onboarding
    // ---------------------------------------------------------------
    for (const m of materiais) {
      if (!naoConcluido(m.status)) continue;
      const rotulo = ROTULO_STATUS[m.status] ?? m.status;
      const alvo = `${m.titulo}${m.campanha?.cliente?.nomeFantasia ? ' — ' + m.campanha.cliente.nomeFantasia : ''}`;

      // 1) Tarefa atrasada — passou do prazo sem concluir.
      if (m.prazo && m.prazo.getTime() < agora.getTime()) {
        alertas.push({
          tipo: 'TAREFA_ATRASADA',
          prioridade: 'ALTA',
          titulo: 'Tarefa atrasada',
          descricao: `${alvo} venceu em ${m.prazo.toLocaleDateString('pt-BR')} e está em "${rotulo}".`,
          link: m.campanha ? `/campanhas` : undefined,
          referenciaId: m.id,
        });
      } else if (m.prazo && this.horasEntre(m.prazo, agora) <= CRITICO_HORAS) {
        // 2) Prazo critico (48h) — vence nas proximas 48h.
        alertas.push({
          tipo: 'PRAZO_CRITICO',
          prioridade: 'ALTA',
          titulo: 'Prazo crítico (48h)',
          descricao: `${alvo} vence em ${m.prazo.toLocaleDateString('pt-BR')} (menos de ${CRITICO_HORAS}h).`,
          link: '/campanhas',
          referenciaId: m.id,
        });
      }

      // 3) Aprovacao parada — aguardando aprovacao ha mais de X dias.
      if (
        m.status === StatusMaterial.AGUARDANDO_APROVACAO &&
        this.diasEntre(agora, m.atualizadoEm) >= APROVACAO_PARADA_DIAS
      ) {
        alertas.push({
          tipo: 'APROVACAO_PARADA',
          prioridade: 'MEDIA',
          titulo: 'Aprovação parada',
          descricao: `${alvo} aguarda aprovação há ${Math.round(this.diasEntre(agora, m.atualizadoEm))} dia(s).`,
          link: '/campanhas',
          referenciaId: m.id,
        });
      }

      // 7) Material em ajuste ha X dias — voltou para ajuste e nao foi retomado.
      if (
        m.status === StatusMaterial.EM_AJUSTE &&
        this.diasEntre(agora, m.atualizadoEm) >= AJUSTE_DIAS
      ) {
        alertas.push({
          tipo: 'AJUSTE_PARADO',
          prioridade: 'MEDIA',
          titulo: 'Material em ajuste',
          descricao: `${alvo} está em ajuste há ${Math.round(this.diasEntre(agora, m.atualizadoEm))} dia(s) sem retomada.`,
          link: '/campanhas',
          referenciaId: m.id,
        });
      }
    }

    // 4) Campanha sem inicio — veiculacao proxima e sem tarefas iniciadas.
    for (const c of listaCampanhas) {
      if (
        c.semInicio &&
        c.diasParaPrazo !== null &&
        c.diasParaPrazo >= 0 &&
        c.diasParaPrazo <= CAMPANHA_SEM_INICIO_DIAS
      ) {
        alertas.push({
          tipo: 'CAMPANHA_SEM_INICIO',
          prioridade: 'ALTA',
          titulo: 'Campanha sem início',
          descricao: `"${c.nome}"${c.cliente ? ' — ' + c.cliente : ''} vence em ${c.diasParaPrazo} dia(s) e não teve tarefas iniciadas.`,
          link: '/campanhas',
          referenciaId: c.id,
        });
      }
    }

    // 5) Cliente em onboarding — chegou na etapa de onboarding (destaque p/ marketing).
    for (const o of listaOnboarding) {
      alertas.push({
        tipo: 'CLIENTE_ONBOARDING',
        prioridade: o.pilarMarketing ? 'ALTA' : 'BAIXA',
        titulo: o.pilarMarketing ? 'Cliente em onboarding (Marketing)' : 'Cliente em onboarding',
        descricao: `${o.cliente ?? 'Cliente'} está em onboarding${o.etapaAtual ? ' na etapa "' + o.etapaAtual + '"' : ''}${o.semSquad ? ' — sem squad vinculado' : ''}.`,
        link: '/onboarding',
        referenciaId: o.clienteId ?? undefined,
      });
    }

    // 6) Aprovacao interna pendente (Secao 8 — aprovacao interdepartamental):
    //    depende do fluxo de aprovacao cruzada, que ainda NAO existe no sistema
    //    (Prioridade Media do briefing / fatia futura). Nao geramos esse alerta
    //    aqui para nao inventar dado; fica documentado no README da fatia.

    alertas.sort((a, b) => PESO_PRIORIDADE[a.prioridade] - PESO_PRIORIDADE[b.prioridade]);
    const resumoAlertas = {
      total: alertas.length,
      alta: alertas.filter((a) => a.prioridade === 'ALTA').length,
      media: alertas.filter((a) => a.prioridade === 'MEDIA').length,
      baixa: alertas.filter((a) => a.prioridade === 'BAIXA').length,
    };

    return {
      geradoEm: agora,
      filtros: { squadId: squadId ?? null, clienteId: clienteId ?? null },
      parametros: {
        paradoHoras: PARADO_HORAS,
        criticoHoras: CRITICO_HORAS,
        aprovacaoParadaDias: APROVACAO_PARADA_DIAS,
        ajusteDias: AJUSTE_DIAS,
        campanhaSemInicioDias: CAMPANHA_SEM_INICIO_DIAS,
        sobrecargaTarefas: SOBRECARGA_TAREFAS,
      },
      producao,
      campanhas: listaCampanhas,
      onboarding: listaOnboarding,
      capacidade,
      alertas,
      resumoAlertas,
    };
  }

  // Opcoes para os filtros da tela (squads e clientes que possuem campanha).
  async filtros() {
    const [squads, clientes] = await Promise.all([
      this.prisma.squad.findMany({
        where: { ativo: true },
        select: { id: true, nome: true },
        orderBy: { nome: 'asc' },
      }),
      this.prisma.cliente.findMany({
        where: { campanhasMarketing: { some: {} } },
        select: { id: true, nomeFantasia: true },
        orderBy: { nomeFantasia: 'asc' },
      }),
    ]);
    return { squads, clientes };
  }
}
