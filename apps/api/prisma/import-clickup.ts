// Importador ClickUp -> Breakr OS. Le a lista "Clientes" e o "Funil Comercial"
// via API do ClickUp e traz os registros REAIS. Mantem time/squads/planos (do
// seed-demo) e sintetiza uma operacao leve (contrato/cobranca/onboarding/
// conteudo/campanha) em alguns clientes ATIVOS para as telas ficarem cheias.
//
// Rodar: CLICKUP_TOKEN=pk_... DATABASE_URL=... npx ts-node prisma/import-clickup.ts
// O token vem por env — NUNCA fica no codigo/Git.
import {
  PrismaClient,
  Plano,
  ClienteStatus,
  StatusLead,
  StatusContrato,
  StatusFatura,
  StatusConteudo,
  TipoConteudo,
  StatusCampanha,
} from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();
const TOKEN = process.env.CLICKUP_TOKEN;
const cod = (p: string) => `${p}-${randomBytes(4).toString('hex').toUpperCase()}`;
const dias = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
const limpaNome = (n: string) => n.replace(/\s*#\S+\s*$/, '').trim();

interface CuTask {
  name: string;
  status?: { status?: string };
  custom_fields?: { name: string; value?: unknown }[];
}

async function cu(path: string): Promise<{ tasks?: CuTask[]; last_page?: boolean }> {
  const r = await fetch(`https://api.clickup.com/api/v2${path}`, {
    headers: { Authorization: TOKEN as string },
  });
  if (!r.ok) throw new Error(`ClickUp ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json() as Promise<{ tasks?: CuTask[]; last_page?: boolean }>;
}

async function tarefas(listId: string): Promise<CuTask[]> {
  const acc: CuTask[] = [];
  for (let page = 0; page < 20; page++) {
    const d = await cu(
      `/list/${listId}/task?archived=false&include_closed=true&subtasks=false&page=${page}`,
    );
    const ts = d.tasks ?? [];
    acc.push(...ts);
    if (ts.length < 100 || d.last_page) break;
  }
  return acc;
}

const campo = (t: CuTask, nome: string): unknown =>
  t.custom_fields?.find((f) => f.name === nome)?.value;

const STATUS_CLIENTE: Record<string, ClienteStatus> = {
  ativo: ClienteStatus.ATIVO,
  onboarding: ClienteStatus.ONBOARD,
  'novo cliente': ClienteStatus.NOVO,
  pausado: ClienteStatus.INATIVO,
  encerrado: ClienteStatus.INATIVO,
  desligado: ClienteStatus.INATIVO,
  'em desligamento': ClienteStatus.INATIVO,
};

// Mapeia status do lead: baseline pela lista (etapa do funil) + refino pelo texto.
function statusLead(texto: string | undefined, baseline: StatusLead): StatusLead {
  const x = (texto ?? '').toLowerCase();
  if (/ganho|fechad|assinad|cliente|won/.test(x)) return StatusLead.GANHO;
  if (/perd|descart|lost|sem interesse/.test(x)) return StatusLead.PERDIDO;
  if (/propost|negocia/.test(x)) return StatusLead.PROPOSTA;
  if (/qualific|reuni|agendad|diagn/.test(x)) return StatusLead.QUALIFICADO;
  if (/contat|conex|abordad|follow/.test(x)) return StatusLead.CONTATADO;
  return baseline;
}

const ETAPAS = [
  { titulo: 'Preencher briefing da marca', ordem: 1 },
  { titulo: 'Enviar acessos (Instagram, Meta, site)', ordem: 2 },
  { titulo: 'Aprovar identidade e tom de voz', ordem: 3 },
  { titulo: 'Reunião de kickoff com o squad', ordem: 4 },
  { titulo: 'Definir metas e orçamento do mês', ordem: 5 },
];

async function operacaoLeve(clienteId: string, nome: string, plano: Plano, squadId: string | null) {
  const contrato = await prisma.contrato.create({
    data: {
      clienteId,
      status: StatusContrato.EM_VIGOR,
      valorMensal: plano.valor,
      codigoUnico: cod('CTR'),
      dataInicio: dias(-50),
      vencimento: dias(310),
      planoId: plano.id,
    },
  });
  await prisma.fatura.create({
    data: {
      clienteId,
      contratoId: contrato.id,
      valor: plano.valor,
      vencimento: dias(-8),
      status: StatusFatura.PAGA,
      pagaEm: dias(-7),
      asaasId: `pay_${randomBytes(4).toString('hex')}`,
      meio: 'PIX',
      notaFiscalId: `nfe_${randomBytes(4).toString('hex')}`,
      notaFiscalUrl: `https://nfe.exemplo/${randomBytes(3).toString('hex')}.pdf`,
      codigoUnico: cod('FAT'),
    },
  });
  await prisma.fatura.create({
    data: {
      clienteId,
      contratoId: contrato.id,
      valor: plano.valor,
      vencimento: dias(22),
      status: StatusFatura.PENDENTE,
      asaasId: `pay_${randomBytes(4).toString('hex')}`,
      meio: 'PIX',
      codigoUnico: cod('FAT'),
    },
  });
  await prisma.onboarding.create({
    data: {
      clienteId,
      progresso: 100,
      concluido: true,
      etapas: { create: ETAPAS.map((e) => ({ ...e, concluido: true })) },
    },
  });
  for (const tipo of plano.tiposProjeto) {
    await prisma.projeto.create({
      data: {
        clienteId,
        tipo,
        nome: `${tipo[0] + tipo.slice(1).toLowerCase()} — ${nome}`,
        codigoUnico: cod('PRJ'),
      },
    });
  }
  const conteudos: { titulo: string; tipo: TipoConteudo; status: StatusConteudo }[] = [
    { titulo: `Reels: destaque do cardápio — ${nome}`, tipo: TipoConteudo.REELS, status: StatusConteudo.PUBLICADO },
    { titulo: `Carrossel: novidades da semana — ${nome}`, tipo: TipoConteudo.CARROSSEL, status: StatusConteudo.APROVACAO_CLIENTE },
    { titulo: `Post: promoção do dia — ${nome}`, tipo: TipoConteudo.POST, status: StatusConteudo.PRODUCAO },
  ];
  for (const c of conteudos) {
    await prisma.conteudo.create({
      data: { clienteId, squadId: squadId ?? undefined, titulo: c.titulo, tipo: c.tipo, status: c.status, codigoUnico: cod('CNT') },
    });
  }
  await prisma.campanha.create({
    data: {
      clienteId,
      nome: `${nome} — Conversões`,
      objetivo: 'Conversões',
      status: StatusCampanha.ATIVA,
      orcamentoDiario: 90,
      gasto: 2700,
      impressoes: 52000,
      cliques: 1480,
      conversoes: 93,
      codigoUnico: cod('CAM'),
    },
  });
}

async function main() {
  if (!TOKEN) throw new Error('Defina CLICKUP_TOKEN no ambiente.');

  // Limpa dados de demonstracao (mantem usuarios, squads e planos).
  await prisma.lead.deleteMany({});
  await prisma.cliente.deleteMany({}); // cascata: contratos/faturas/projetos/onboarding/conteudos/campanhas

  const squads = await prisma.squad.findMany({ orderBy: { nome: 'asc' } });
  const planos = await prisma.plano.findMany({ orderBy: { valor: 'desc' } });
  const planoPadrao = planos[0];

  // ---------------- CLIENTES (lista real "Clientes") ----------------
  const tasksCli = await tarefas('901305040568');
  const ativos: { id: string; nome: string }[] = [];
  let idx = 0;
  for (const t of tasksCli) {
    const status = STATUS_CLIENTE[(t.status?.status ?? '').toLowerCase()] ?? ClienteStatus.NOVO;
    const orc = campo(t, 'Orçamento Mensal | Tráfego');
    const wpp = campo(t, 'Grupo WhatsApp');
    const nome = limpaNome(t.name);
    const ativo = status === ClienteStatus.ATIVO || status === ClienteStatus.ONBOARD;
    const squad = ativo && squads.length ? squads[idx++ % squads.length] : null;
    const c = await prisma.cliente.create({
      data: {
        nomeFantasia: nome,
        status,
        codigoUnico: cod('CLI'),
        orcamentoMensal: typeof orc === 'number' || typeof orc === 'string' ? Number(orc) || undefined : undefined,
        whatsappGrupoId: typeof wpp === 'string' && wpp ? wpp : undefined,
        squadId: squad?.id,
        planoId: status === ClienteStatus.ATIVO ? planoPadrao?.id : undefined,
      },
    });
    if (status === ClienteStatus.ATIVO) ativos.push({ id: c.id, nome });
  }

  // ---------------- LEADS (Funil Comercial) ----------------
  const listasLead: { id: string; baseline: StatusLead }[] = [
    { id: '901326072457', baseline: StatusLead.NOVO }, // Inbound
    { id: '901326152899', baseline: StatusLead.CONTATADO }, // Social Selling
    { id: '901326072655', baseline: StatusLead.PROPOSTA }, // Fechamentos Closer
  ];
  let nLeads = 0;
  for (const l of listasLead) {
    const ts = await tarefas(l.id);
    for (const t of ts) {
      const nome = limpaNome(t.name);
      await prisma.lead.create({
        data: {
          nome,
          empresa: nome,
          origem: 'ClickUp',
          status: statusLead(t.status?.status, l.baseline),
          codigoUnico: cod('LEAD'),
        },
      });
      nLeads++;
    }
  }

  // ---------------- Operacao leve em alguns clientes ATIVOS reais ----------------
  if (planoPadrao) {
    for (let i = 0; i < Math.min(5, ativos.length); i++) {
      const a = ativos[i];
      const plano = planos[i % planos.length] ?? planoPadrao;
      await operacaoLeve(a.id, a.nome, plano, squads[i % squads.length]?.id ?? null);
    }
  }

  const totais = {
    clientes: await prisma.cliente.count(),
    clientesAtivos: await prisma.cliente.count({ where: { status: ClienteStatus.ATIVO } }),
    leads: await prisma.lead.count(),
    contratos: await prisma.contrato.count(),
    conteudos: await prisma.conteudo.count(),
    campanhas: await prisma.campanha.count(),
  };
  console.log('[import-clickup] OK:', JSON.stringify(totais));
}

main()
  .catch((e) => {
    console.error('[import-clickup] erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
