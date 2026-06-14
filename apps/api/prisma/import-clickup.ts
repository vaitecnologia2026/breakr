// Importador ClickUp -> Breakr OS. Traz os dados REAIS do ClickUp:
//  - Planos reais (campo "Plano") e Squads reais (campo "SQUAD") da agência
//  - Lista "Clientes" (83) com status, orçamento, grupo WhatsApp, PLANO e SQUAD
//  - "Funil Comercial" (Inbound/Social Selling/Fechamentos) -> Leads
// Mantém os usuários (seed-demo) e sintetiza operação leve em alguns ATIVOS
// (contratos/faturas/onboarding/conteúdo/campanha NÃO existem no ClickUp).
//
// Rodar: CLICKUP_TOKEN=pk_... DATABASE_URL=... npx ts-node prisma/import-clickup.ts
// Token só por env — NUNCA no código/Git.
//
// OBS: o VALOR de cada plano não existe no ClickUp (é decisão pendente com o
// cliente) — usamos placeholders plausíveis por tier; ajustar quando definido.
import {
  PrismaClient,
  Plano,
  Cargo,
  FuncaoSquad,
  TipoProjeto,
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

const M = TipoProjeto.MARKETING;
const G = TipoProjeto.GESTAO;
const F = TipoProjeto.FINANCEIRO;

// Planos reais do ClickUp (option id -> definição). Valores = PLACEHOLDER por tier.
const PLANOS: Record<string, { nome: string; valor: number; tipos: TipoProjeto[] }> = {
  'd6682570-f861-47af-b639-88cb20294dad': { nome: 'Plano Impulso', valor: 900, tipos: [M] },
  '5809b3be-2b0f-45f4-bcda-813d1c7824ab': { nome: 'Marketing | Tração', valor: 1500, tipos: [M] },
  '351f458d-2dbe-482d-94f4-100f808188cb': { nome: 'Marketing | Growth', valor: 2500, tipos: [M] },
  'e11182d2-ea22-426d-ba47-457faa010ec7': { nome: 'Marketing | Escala', valor: 4000, tipos: [M] },
  '6ab1d780-d7cb-41f4-9cae-773d7efe2910': { nome: 'Gestão | Tração', valor: 1500, tipos: [G] },
  '94aafce6-ba46-41ca-b257-29a57566eeb1': { nome: 'Gestão | Growth', valor: 2500, tipos: [G] },
  '5ab58ef2-35c0-4803-8f55-ed7480a9063e': { nome: 'Gestão | Escala', valor: 4000, tipos: [G] },
  'deb78551-eaa7-4baa-bff0-a92e24e20ef8': { nome: 'Financeiro | Tração', valor: 1500, tipos: [F] },
  'a6d79eeb-9c43-4fcd-9240-106ef6594af9': { nome: 'Financeiro | Growth', valor: 2500, tipos: [F] },
  '3738e7cf-44f6-41cd-9a94-4cd4acb0cdff': { nome: 'Financeiro | Escala', valor: 4000, tipos: [F] },
  '43f45531-bfc1-49d6-97ac-9109783a8627': { nome: 'Marketing | Implementação', valor: 1200, tipos: [M] },
  '542d540a-8a6a-4f4b-aef0-c5f9e67d0e5c': { nome: 'Plano: Fagulha', valor: 900, tipos: [M] },
  'b7c8c3dc-839b-437d-9600-cfd5066a9677': { nome: 'Plano: Brasa', valor: 1500, tipos: [M, G] },
  '307a411c-8903-4a1c-bc12-0f7af0852959': { nome: 'Plano: Chama', valor: 2500, tipos: [M, G, F] },
};
// Squads reais (campo SQUAD: orderindex -> nome).
const SQUADS = ['Relâmpago', 'Trovão', 'Impacto'];

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
      data: { clienteId, tipo, nome: `${tipo[0] + tipo.slice(1).toLowerCase()} — ${nome}`, codigoUnico: cod('PRJ') },
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

  // Limpa dados anteriores (mantém usuários). Ordem respeita as FKs.
  await prisma.lead.deleteMany({});
  await prisma.cliente.deleteMany({}); // cascata: contratos/faturas/projetos/onboarding/conteudos/campanhas
  await prisma.squadMembro.deleteMany({});
  await prisma.squad.deleteMany({});
  await prisma.plano.deleteMany({});

  // ---- Planos reais ----
  const planoPorClickup = new Map<string, Plano>();
  for (const [cuId, p] of Object.entries(PLANOS)) {
    const criado = await prisma.plano.create({
      data: { nome: p.nome, valor: p.valor, ciclo: 'MENSAL', tiposProjeto: p.tipos },
    });
    planoPorClickup.set(cuId, criado);
  }

  // ---- Squads reais (com membros, a partir dos usuários existentes) ----
  const usuarios = await prisma.usuario.findMany();
  const porCargo = (c: Cargo) => usuarios.find((u) => u.cargo === c);
  const membros = [
    { u: porCargo(Cargo.CS), f: FuncaoSquad.CS },
    { u: porCargo(Cargo.ESTRATEGISTA), f: FuncaoSquad.ESTRATEGISTA },
    { u: porCargo(Cargo.COPYWRITER), f: FuncaoSquad.COPYWRITER },
    { u: porCargo(Cargo.DESIGNER), f: FuncaoSquad.DESIGNER },
    { u: porCargo(Cargo.EDITOR_VIDEO), f: FuncaoSquad.EDITOR_VIDEO },
    { u: porCargo(Cargo.GESTOR_TRAFEGO), f: FuncaoSquad.GESTOR_TRAFEGO },
  ].filter((m) => m.u);
  const squads: { id: string }[] = [];
  for (const nome of SQUADS) {
    const s = await prisma.squad.create({
      data: {
        nome,
        membros: { create: membros.map((m) => ({ usuarioId: m.u!.id, funcao: m.f })) },
      },
    });
    squads.push(s);
  }
  const planos = await prisma.plano.findMany();

  // ---- CLIENTES (lista real) ----
  const tasksCli = await tarefas('901305040568');
  const ativos: { id: string; nome: string; planoId: string | null; squadId: string | null }[] = [];
  let rr = 0;
  let comPlano = 0;
  let comSquad = 0;
  for (const t of tasksCli) {
    const status = STATUS_CLIENTE[(t.status?.status ?? '').toLowerCase()] ?? ClienteStatus.NOVO;
    const nome = limpaNome(t.name);
    const orc = campo(t, 'Orçamento Mensal | Tráfego');
    const wpp = campo(t, 'Grupo WhatsApp');

    // Plano (labels -> array de option ids)
    const planoVal = campo(t, 'Plano');
    const planoCuId = Array.isArray(planoVal) ? String((planoVal as unknown[])[0]) : undefined;
    const plano = planoCuId ? planoPorClickup.get(planoCuId) : undefined;
    if (plano) comPlano++;

    // Squad (dropdown -> orderindex)
    const squadVal = campo(t, 'SQUAD');
    let squadId: string | null = null;
    if (squadVal !== undefined && squadVal !== null && squadVal !== '') {
      const i = Number(squadVal);
      if (!Number.isNaN(i) && squads[i]) {
        squadId = squads[i].id;
        comSquad++;
      }
    }
    // ATIVO sem squad definido -> distribui (auto-balanceamento)
    if (!squadId && status === ClienteStatus.ATIVO) squadId = squads[rr++ % squads.length].id;

    const c = await prisma.cliente.create({
      data: {
        nomeFantasia: nome,
        status,
        codigoUnico: cod('CLI'),
        orcamentoMensal: typeof orc === 'number' || typeof orc === 'string' ? Number(orc) || undefined : undefined,
        whatsappGrupoId: typeof wpp === 'string' && wpp ? wpp : undefined,
        squadId: squadId ?? undefined,
        planoId: plano?.id,
      },
    });
    if (status === ClienteStatus.ATIVO) {
      ativos.push({ id: c.id, nome, planoId: plano?.id ?? null, squadId });
    }
  }

  // ---- LEADS ----
  const listasLead: { id: string; baseline: StatusLead }[] = [
    { id: '901326072457', baseline: StatusLead.NOVO },
    { id: '901326152899', baseline: StatusLead.CONTATADO },
    { id: '901326072655', baseline: StatusLead.PROPOSTA },
  ];
  let nLeads = 0;
  for (const l of listasLead) {
    for (const t of await tarefas(l.id)) {
      const nome = limpaNome(t.name);
      await prisma.lead.create({
        data: { nome, empresa: nome, origem: 'ClickUp', status: statusLead(t.status?.status, l.baseline), codigoUnico: cod('LEAD') },
      });
      nLeads++;
    }
  }

  // ---- Operação leve em alguns ATIVOS reais (telas operacionais cheias) ----
  for (let i = 0; i < Math.min(6, ativos.length); i++) {
    const a = ativos[i];
    const plano = (a.planoId ? planos.find((p) => p.id === a.planoId) : undefined) ?? planos[0];
    await operacaoLeve(a.id, a.nome, plano, a.squadId);
  }

  console.log(
    '[import-clickup] OK:',
    JSON.stringify({
      planos: planos.length,
      squads: squads.length,
      clientes: await prisma.cliente.count(),
      clientesComPlano: comPlano,
      clientesComSquad: comSquad,
      leads: nLeads,
      contratos: await prisma.contrato.count(),
    }),
  );
}

main()
  .catch((e) => {
    console.error('[import-clickup] erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
