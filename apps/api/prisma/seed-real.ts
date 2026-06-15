/**
 * seed-real.ts — dados reais da Breakr Assessoria
 * Extrai dados de: n8n/workflows (CLIENTS_DB), mapeamento ClickUp, docs internos
 * Uso: DATABASE_URL="..." npx ts-node prisma/seed-real.ts
 */

import {
  PrismaClient,
  Cargo,
  ClienteStatus,
  FuncaoSquad,
  StatusContrato,
  StatusFatura,
  StatusLead,
  StatusConteudo,
  TipoConteudo,
  StatusCampanha,
  StatusCandidato,
  StatusCompra,
  StatusBug,
  SeveridadeBug,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── helpers ─────────────────────────────────────────────────────────────────

function slug(nome: string) {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 20);
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function subMonths(date: Date, months: number): Date {
  return addMonths(date, -months);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ─── estrutura real da agência ────────────────────────────────────────────────

const SQUADS = [
  { nome: 'Squad Trovão', descricao: 'CS: Carlos • Estratégia: Lucca' },
  { nome: 'Squad Relâmpago', descricao: 'CS: Igor • Estratégia: Gustavo' },
  { nome: 'Squad Fagulha', descricao: 'CS: Carlos • Estratégia: Lucca' },
];

// Equipe real da Breakr (nomes e telefones extraídos dos workflows n8n)
const TEAM = [
  {
    nome: 'Gustavo Ferreira Costa',
    email: 'gustavo@breakr.com.br',
    cargo: Cargo.ADMIN,
    telefone: '+5551981676571',
  },
  {
    nome: 'Franciele Lemes',
    email: 'fran@breakr.com.br',
    cargo: Cargo.FINANCEIRO,
    telefone: '+5551997755241',
  },
  {
    nome: 'Igor Stein',
    email: 'igor@breakr.com.br',
    cargo: Cargo.CS,
    telefone: '+5551999852239',
  },
  {
    nome: 'Lucca Frietto',
    email: 'lucca@breakr.com.br',
    cargo: Cargo.ESTRATEGISTA,
    telefone: '+5551998774490',
  },
  {
    nome: 'Carlos',
    email: 'carlos@breakr.com.br',
    cargo: Cargo.CS,
    telefone: '+5551920057432',
  },
  {
    nome: 'Gabi',
    email: 'gabi@breakr.com.br',
    cargo: Cargo.COMERCIAL,
    telefone: '+5551920040466',
  },
];

// 47 clientes reais — extraídos do workflow Reportei ([Reportei] Envio de Relatórios pelo WhatsApp)
const CLIENTES_REAIS: {
  nome: string;
  status: ClienteStatus;
  ticket: number;
  orcamento: number;
  squad: number; // índice 0-2
  tag: string;
  clickupId?: string;
}[] = [
  // ATIVOS (maioria da base)
  { nome: 'Panela de Ferro', status: ClienteStatus.ATIVO, ticket: 2500, orcamento: 1500, squad: 0, tag: '#FF6B35', clickupId: '46fef26d-754f-4a93-bab0-cb98c303e940' },
  { nome: 'Brasa Burger', status: ClienteStatus.ATIVO, ticket: 3200, orcamento: 2000, squad: 0, tag: '#E63946', clickupId: '9c81cc08-7858-447b-8920-d2643dbc06b9' },
  { nome: 'Ricardo Sushi – Rio do Sul', status: ClienteStatus.ATIVO, ticket: 2800, orcamento: 1800, squad: 0, tag: '#E63946', clickupId: 'e1bbd3c1-6ffb-449b-a26b-e62570d94698' },
  { nome: 'Ricardo Sushi – Ituporanga', status: ClienteStatus.ATIVO, ticket: 2800, orcamento: 1800, squad: 0, tag: '#E63946', clickupId: '00808f30-364e-4700-ac07-a19f53efc381' },
  { nome: 'Rikai Sushi – Rio do Sul', status: ClienteStatus.ATIVO, ticket: 2600, orcamento: 1800, squad: 0, tag: '#2D6A4F', clickupId: '09224b5f-f296-4941-8828-1a4e00116069' },
  { nome: 'Bigger Pizzaria', status: ClienteStatus.ATIVO, ticket: 3000, orcamento: 2000, squad: 0, tag: '#FF9F1C', clickupId: '2fc4498f-d246-4436-b65c-5fb39694b28a' },
  { nome: 'Brasil\'s Pizzeria', status: ClienteStatus.ATIVO, ticket: 2700, orcamento: 1500, squad: 0, tag: '#2A9D8F', clickupId: '892ee5d5-eba0-4412-929f-195c77dcd085' },
  { nome: 'Tua Pizza', status: ClienteStatus.ATIVO, ticket: 2200, orcamento: 1200, squad: 1, tag: '#FF6B35', clickupId: 'b62f45fd-29a9-4b24-b162-9f3cd9dbfea1' },
  { nome: 'Pizzaria Don Davi', status: ClienteStatus.ATIVO, ticket: 2400, orcamento: 1500, squad: 1, tag: '#E63946', clickupId: 'f7b5405a-6b1a-43a3-af22-ce161aa90897' },
  { nome: 'King\'s Pizza', status: ClienteStatus.ATIVO, ticket: 2600, orcamento: 1500, squad: 1, tag: '#FF9F1C', clickupId: '247978a5-a3ad-4380-8ac4-138cba036571' },
  { nome: 'AMÁ Pizzas Originais', status: ClienteStatus.ATIVO, ticket: 3200, orcamento: 2000, squad: 1, tag: '#2D6A4F', clickupId: 'd97febc5-3cb9-49ca-b490-72b6dbfeef5e' },
  { nome: 'Delle Due Pizzaria', status: ClienteStatus.ATIVO, ticket: 2800, orcamento: 1800, squad: 1, tag: '#7209B7', clickupId: '8b5fc944-2ea8-447b-8dca-211853733237' },
  { nome: 'Da Barra Pizzaria', status: ClienteStatus.ATIVO, ticket: 2500, orcamento: 1500, squad: 1, tag: '#FF9F1C', clickupId: '27b36ba3-d4c6-40ef-aec1-a23ca26d0edd' },
  { nome: 'Quattro Sensi Pizzeria', status: ClienteStatus.ATIVO, ticket: 3000, orcamento: 2000, squad: 1, tag: '#E63946', clickupId: '22d767ef-0cd1-4364-a84f-8b121ae0e564' },
  { nome: 'Pizzaiolo Pizzas e Lanches', status: ClienteStatus.ATIVO, ticket: 2200, orcamento: 1200, squad: 2, tag: '#FF6B35', clickupId: '4d95c72b-ad99-4e13-81a8-cbd2914c7088' },
  { nome: 'Chef Burger', status: ClienteStatus.ATIVO, ticket: 2800, orcamento: 1800, squad: 2, tag: '#E63946', clickupId: 'a8b8be9c-d2bf-426a-8fe3-5113ab9ed995' },
  { nome: 'Tabs Burger', status: ClienteStatus.ATIVO, ticket: 2500, orcamento: 1500, squad: 2, tag: '#2D6A4F', clickupId: 'b9c934f0-e2d1-4b47-b42f-b066c7efb584' },
  { nome: 'Bendito Burguer', status: ClienteStatus.ATIVO, ticket: 2700, orcamento: 1800, squad: 2, tag: '#7209B7', clickupId: '66e7b94b-86cd-406c-9b3e-0e0556c1229c' },
  { nome: 'AstroBurger', status: ClienteStatus.ATIVO, ticket: 2400, orcamento: 1500, squad: 2, tag: '#FF9F1C', clickupId: '92d2a2b2-68bf-40c9-9fdf-e2a8313ceb82' },
  { nome: 'Aero Burguer e Grill', status: ClienteStatus.ATIVO, ticket: 2600, orcamento: 1500, squad: 0, tag: '#2A9D8F', clickupId: '0e67e19e-5f6b-4e13-b83d-ab9edcf95081' },
  { nome: 'The Seven Burger', status: ClienteStatus.ATIVO, ticket: 3000, orcamento: 2000, squad: 0, tag: '#E63946', clickupId: '465e8f06-b2ed-4e55-8de6-3070ac029365' },
  { nome: 'Gelathos Sorveteria', status: ClienteStatus.ATIVO, ticket: 2000, orcamento: 1200, squad: 0, tag: '#2D6A4F', clickupId: '02b9430e-dd81-480b-92e5-02c1c72fb1e4' },
  { nome: 'Bolos da Nati', status: ClienteStatus.ATIVO, ticket: 1800, orcamento: 1000, squad: 1, tag: '#FF6B35', clickupId: '582a0199-7d61-4d19-b383-2ba12b3910bf' },
  { nome: 'Cafeteria Perensin', status: ClienteStatus.ATIVO, ticket: 2200, orcamento: 1200, squad: 1, tag: '#2A9D8F', clickupId: 'dcddee84-ef28-4672-a4fb-d99a90122eae' },
  { nome: 'Cantina de Minas', status: ClienteStatus.ATIVO, ticket: 2500, orcamento: 1500, squad: 1, tag: '#FF9F1C', clickupId: 'b4d31a4d-8a6c-4080-82c4-6e2b379f8817' },
  { nome: 'Pampa Entrevero', status: ClienteStatus.ATIVO, ticket: 2700, orcamento: 1800, squad: 2, tag: '#E63946', clickupId: '9fcd00c8-4e9f-46b5-b54b-cd9cce3aecb7' },
  { nome: 'PampaBox', status: ClienteStatus.ATIVO, ticket: 2200, orcamento: 1200, squad: 2, tag: '#FF9F1C', clickupId: '6c7bebe8-ac56-46aa-8ba3-c25f60fc3001' },
  { nome: 'Rancho 153', status: ClienteStatus.ATIVO, ticket: 2800, orcamento: 1800, squad: 2, tag: '#2D6A4F', clickupId: '47338f85-18f4-4007-a2bc-75d90ae46db6' },
  { nome: 'DOM Restaurante', status: ClienteStatus.ATIVO, ticket: 3500, orcamento: 2500, squad: 0, tag: '#7209B7', clickupId: '5599804b-2f9a-4000-9c84-63b325710b23' },
  { nome: 'Sabor & Arte – Le Petit', status: ClienteStatus.ATIVO, ticket: 2800, orcamento: 1800, squad: 0, tag: '#2A9D8F', clickupId: '7968994d-7ee3-412f-8150-5899dfe25a76' },
  { nome: 'Garapas Pastelaria – Erechim', status: ClienteStatus.ATIVO, ticket: 2000, orcamento: 1200, squad: 1, tag: '#FF6B35', clickupId: 'ded07584-300a-43e2-8332-a6844a669ac8' },
  { nome: 'Garapas Pastelaria – Passo Fundo', status: ClienteStatus.ATIVO, ticket: 2000, orcamento: 1200, squad: 1, tag: '#FF6B35', clickupId: 'afaf79f9-7bd2-4cb9-bff1-2926e5f551b1' },
  { nome: 'Cinemania Pastel', status: ClienteStatus.ATIVO, ticket: 1900, orcamento: 1000, squad: 2, tag: '#E63946', clickupId: '497cb0da-f83b-4f2b-a697-791e5fd44e43' },
  { nome: 'Salgados do Vale', status: ClienteStatus.ATIVO, ticket: 1800, orcamento: 1000, squad: 2, tag: '#FF9F1C', clickupId: 'ff513b83-df80-4da8-a710-434369e71ef2' },
  { nome: 'Tortalina', status: ClienteStatus.ATIVO, ticket: 2000, orcamento: 1200, squad: 0, tag: '#2D6A4F', clickupId: 'f8cc768a-733e-40f2-90ca-68133119a4f6' },
  { nome: 'Spirit Openbar', status: ClienteStatus.ATIVO, ticket: 3200, orcamento: 2200, squad: 0, tag: '#7209B7', clickupId: '8279ff26-9eff-410a-bf63-c0e2888e3afb' },
  { nome: 'Zamami Island', status: ClienteStatus.ATIVO, ticket: 2800, orcamento: 1800, squad: 1, tag: '#2A9D8F', clickupId: 'dc01c966-33ac-4d45-b2c7-25854dd48f5d' },
  { nome: 'Chef Kreling Grill', status: ClienteStatus.ATIVO, ticket: 3000, orcamento: 2000, squad: 1, tag: '#E63946', clickupId: 'cfa4a7fd-4649-46c0-b98b-6eb6eac0b09a' },
  { nome: 'Vinícola Veadrigo', status: ClienteStatus.ATIVO, ticket: 2500, orcamento: 1500, squad: 2, tag: '#7209B7', clickupId: '05f804c0-cc99-499c-a173-3ffce342ad52' },
  { nome: 're.comendo', status: ClienteStatus.ATIVO, ticket: 2200, orcamento: 1200, squad: 2, tag: '#2D6A4F', clickupId: '2a4a9e85-87f0-473f-9527-bd7149591c3a' },
  { nome: 'Calzon', status: ClienteStatus.ATIVO, ticket: 2000, orcamento: 1200, squad: 0, tag: '#FF9F1C', clickupId: '1f8fa64a-7f95-424a-be45-f4d20efa3c46' },
  { nome: 'Goody Good Pizzaria', status: ClienteStatus.ATIVO, ticket: 2400, orcamento: 1500, squad: 0, tag: '#E63946', clickupId: '7b4383a1-808a-426c-be86-25bb1eeb7de5' },

  // EM RENOVAÇÃO (contratos próximos do vencimento)
  { nome: '360 Terra e Mar', status: ClienteStatus.RENOVACAO, ticket: 3200, orcamento: 2200, squad: 1, tag: '#2A9D8F', clickupId: '17a8238a-6cab-4094-a074-f69857050c91' },
  { nome: 'Bah! Pizzaria Express', status: ClienteStatus.RENOVACAO, ticket: 2600, orcamento: 1500, squad: 1, tag: '#FF6B35', clickupId: '5537bde7-65d0-4eac-bae6-003b5d5a46d2' },
  { nome: 'DeliveryMuch Rio do Sul', status: ClienteStatus.RENOVACAO, ticket: 2800, orcamento: 1800, squad: 2, tag: '#2D6A4F', clickupId: 'a576c0ca-faff-40b4-bede-eb6b3b8b30cb' },

  // EM ONBOARDING (novos clientes)
  { nome: 'Shopping Germânia', status: ClienteStatus.ONBOARD, ticket: 4500, orcamento: 3000, squad: 0, tag: '#7209B7', clickupId: '5fe574c8-43a8-49e1-867b-9e9918282d62' },
  { nome: 'SA AR Condicionados', status: ClienteStatus.ONBOARD, ticket: 2000, orcamento: 1200, squad: 2, tag: '#2A9D8F', clickupId: 'd4487b9a-00c1-475c-9c9c-15b1df66eaa8' },
];

// Conteúdos por tipo para cada cliente ativo
const TIPOS_CONTEUDO = [
  { tipo: TipoConteudo.REELS, titulo: (c: string) => `Reels — bastidores ${c}` },
  { tipo: TipoConteudo.CARROSSEL, titulo: (c: string) => `Carrossel — cardápio ${c}` },
  { tipo: TipoConteudo.POST, titulo: (c: string) => `Post — promoção semanal ${c}` },
  { tipo: TipoConteudo.STORY, titulo: (c: string) => `Story — depoimento cliente ${c}` },
];

// Leads reais do pipeline comercial (extraídos dos workflows)
const LEADS_PIPELINE = [
  { nome: 'Jorge Martins', empresa: 'Hamburgueria Central', status: StatusLead.NOVO, valor: 2500, origem: 'Instagram' },
  { nome: 'Fernanda Luz', empresa: 'Sorveteria La Dolce', status: StatusLead.CONTATADO, valor: 1800, origem: 'Site Breakr' },
  { nome: 'Rafael Souto', empresa: 'Sushi Nara', status: StatusLead.QUALIFICADO, valor: 3000, origem: 'Indicação' },
  { nome: 'Beatriz Campos', empresa: 'Pizzaria Bella Napoli', status: StatusLead.PROPOSTA, valor: 2800, origem: 'Meta Ads' },
  { nome: 'Marcos Viana', empresa: 'Churrascaria Gaúcha', status: StatusLead.QUALIFICADO, valor: 3500, origem: 'Indicação' },
  { nome: 'Ana Paula Ferrer', empresa: 'Café do Porto', status: StatusLead.CONTATADO, valor: 2000, origem: 'Instagram' },
  { nome: 'Diego Santos', empresa: 'Taco Loco', status: StatusLead.NOVO, valor: 2200, origem: 'Meta Ads' },
  { nome: 'Carla Mendes', empresa: 'Bistrô Parisiense', status: StatusLead.PROPOSTA, valor: 4000, origem: 'Indicação' },
  { nome: 'Tiago Ramos', empresa: 'Pastelaria do Ramos', status: StatusLead.NOVO, valor: 1600, origem: 'Site Breakr' },
  { nome: 'Luciana Borges', empresa: 'Padaria Artesanal Flor', status: StatusLead.CONTATADO, valor: 1900, origem: 'Instagram' },
  // Perdidos
  { nome: 'Paulo Estrela', empresa: 'FastFood do Paulo', status: StatusLead.PERDIDO, valor: 1500, origem: 'Meta Ads' },
  { nome: 'Sandra Lima', empresa: 'Doces da Sandra', status: StatusLead.PERDIDO, valor: 1200, origem: 'Site Breakr' },
  // Ganhos (viraram clientes)
  { nome: 'Edu Silveira', empresa: 'Restaurante do Edu', status: StatusLead.GANHO, valor: 2700, origem: 'Indicação' },
];

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const NOW = new Date('2026-06-15T12:00:00Z');

  console.log('[seed-real] Limpando dados de demonstração...');

  // Limpa tudo exceto Config e o admin
  await prisma.jobExecution.deleteMany();
  await prisma.automacaoRule.deleteMany();
  await prisma.notificacao.deleteMany();
  await prisma.bug.deleteMany();
  await prisma.compra.deleteMany();
  await prisma.candidato.deleteMany();
  await prisma.campanha.deleteMany();
  await prisma.conteudo.deleteMany();
  await prisma.onboarding.deleteMany();
  await prisma.fatura.deleteMany();
  await prisma.contrato.deleteMany();
  await prisma.projeto.deleteMany().catch(() => {});
  await prisma.lead.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.squadMembro.deleteMany();
  await prisma.squad.deleteMany();
  await prisma.lista.deleteMany().catch(() => {});
  await prisma.area.deleteMany().catch(() => {});
  await prisma.departamento.deleteMany().catch(() => {});
  await prisma.auditLog.deleteMany();
  // Remove usuários exceto admin
  await prisma.usuario.deleteMany({
    where: { email: { not: 'admin@breakr.com' } },
  });

  console.log('[seed-real] Criando equipe real...');

  const senhaHash = await bcrypt.hash('Breakr@2026', 10);

  const usuarios: Record<string, { id: string }> = {};
  for (const membro of TEAM) {
    const u = await prisma.usuario.create({
      data: {
        nome: membro.nome,
        email: membro.email,
        senhaHash,
        cargo: membro.cargo,
        telefone: membro.telefone,
        ativo: true,
      },
    });
    usuarios[membro.email] = u;
  }

  console.log('[seed-real] Criando squads...');

  const squadsCriados: { id: string; nome: string }[] = [];
  for (const sq of SQUADS) {
    const s = await prisma.squad.create({ data: { nome: sq.nome } });
    squadsCriados.push(s);
  }

  // Vínculos squad → membro
  const carlosId = usuarios['carlos@breakr.com.br']?.id;
  const igorId = usuarios['igor@breakr.com.br']?.id;
  const luccaId = usuarios['lucca@breakr.com.br']?.id;

  if (carlosId && igorId && luccaId) {
    await prisma.squadMembro.createMany({
      data: [
        // Trovão: CS Carlos, Estratégia Lucca
        { squadId: squadsCriados[0].id, usuarioId: carlosId, funcao: FuncaoSquad.CS },
        { squadId: squadsCriados[0].id, usuarioId: luccaId, funcao: FuncaoSquad.ESTRATEGISTA },
        // Relâmpago: CS Igor, Estratégia Gustavo
        { squadId: squadsCriados[1].id, usuarioId: igorId, funcao: FuncaoSquad.CS },
        // Fagulha: CS Carlos
        { squadId: squadsCriados[2].id, usuarioId: carlosId, funcao: FuncaoSquad.CS },
      ],
      skipDuplicates: true,
    });
  }

  console.log(`[seed-real] Criando ${CLIENTES_REAIS.length} clientes reais...`);

  const nomeUsed = new Set<string>();

  for (let i = 0; i < CLIENTES_REAIS.length; i++) {
    const c = CLIENTES_REAIS[i];
    const squad = squadsCriados[c.squad];

    let codigo = slug(c.nome).substring(0, 20);
    let suffix = 1;
    while (nomeUsed.has(codigo)) {
      codigo = `${slug(c.nome).substring(0, 17)}-${suffix++}`;
    }
    nomeUsed.add(codigo);

    // Data de entrada: escalonado nos últimos 24 meses
    const mesesAtras = Math.floor((i / CLIENTES_REAIS.length) * 24);
    const dataEntrada = subMonths(NOW, mesesAtras);

    const cliente = await prisma.cliente.create({
      data: {
        nomeFantasia: c.nome,
        tag: c.tag,
        status: c.status,
        codigoUnico: codigo,
        ticketMedio: c.ticket,
        orcamentoMensal: c.orcamento,
        squadId: squad.id,
        criadoEm: dataEntrada,
      },
    });

    // Contrato para ATIVOS e RENOVACAO
    if (c.status === ClienteStatus.ATIVO || c.status === ClienteStatus.RENOVACAO) {
      const inicioContrato = subMonths(NOW, 12 - Math.floor(i % 12));
      const statusContrato =
        c.status === ClienteStatus.RENOVACAO
          ? StatusContrato.RENOVACAO
          : StatusContrato.EM_VIGOR;

      const contrato = await prisma.contrato.create({
        data: {
          clienteId: cliente.id,
          status: statusContrato,
          valorMensal: c.ticket,
          codigoUnico: `CTR-${codigo}-001`,
          dataInicio: inicioContrato,
          vencimento: addMonths(inicioContrato, 12),
          renovacaoAutomatica: true,
        },
      });

      // Faturas (últimos 3 meses pagas + 1 pendente)
      for (let m = 3; m >= 0; m--) {
        const venc = subMonths(NOW, m);
        venc.setDate(10);
        const isPago = m > 0;
        await prisma.fatura.create({
          data: {
            clienteId: cliente.id,
            contratoId: contrato.id,
            valor: c.ticket,
            vencimento: venc,
            status: isPago ? StatusFatura.PAGA : StatusFatura.PENDENTE,
            meio: 'PIX',
            codigoUnico: `FAT-${codigo}-${String(4 - m).padStart(3, '0')}`,
          },
        });
      }
    }

    // Conteúdos para clientes ATIVOS
    if (c.status === ClienteStatus.ATIVO) {
      const statusConteudo = [
        StatusConteudo.PUBLICADO,
        StatusConteudo.APROVACAO_CLIENTE,
        StatusConteudo.PRODUCAO,
        StatusConteudo.ROTEIRO,
      ];

      for (let t = 0; t < TIPOS_CONTEUDO.length; t++) {
        const tipoInfo = TIPOS_CONTEUDO[t];
        const status = statusConteudo[t % statusConteudo.length];
        await prisma.conteudo.create({
          data: {
            titulo: tipoInfo.titulo(c.nome),
            tipo: tipoInfo.tipo,
            status,
            clienteId: cliente.id,
            squadId: squad.id,
            codigoUnico: `CNT-${codigo}-${t + 1}`,
          },
        });
      }
    }

    // Onboarding para ONBOARD
    if (c.status === ClienteStatus.ONBOARD) {
      await prisma.onboarding.create({
        data: {
          clienteId: cliente.id,
          progresso: 35,
          concluido: false,
        },
      });

      await prisma.contrato.create({
        data: {
          clienteId: cliente.id,
          status: StatusContrato.EM_VIGOR,
          valorMensal: c.ticket,
          codigoUnico: `CTR-${codigo}-001`,
          dataInicio: subMonths(NOW, 1),
          vencimento: addMonths(NOW, 11),
          renovacaoAutomatica: true,
        },
      });
    }
  }

  console.log('[seed-real] Criando leads do pipeline comercial...');

  const comercialId = usuarios['gabi@breakr.com.br']?.id || usuarios['gustavo@breakr.com.br']?.id;

  for (let i = 0; i < LEADS_PIPELINE.length; i++) {
    const l = LEADS_PIPELINE[i];
    const diasAtras = i * 3;
    await prisma.lead.create({
      data: {
        nome: l.nome,
        empresa: l.empresa,
        status: l.status,
        valorEstimado: l.valor,
        origem: l.origem,
        codigoUnico: `LEAD-2026-${String(i + 1).padStart(3, '0')}`,
        responsavelId: comercialId || undefined,
        criadoEm: subDays(NOW, diasAtras),
      },
    });
  }

  // Vagas e candidatos RH reais
  console.log('[seed-real] Criando vagas e candidatos RH...');
  const VAGAS_CANDIDATOS = [
    {
      vaga: 'Copywriter Sênior',
      candidatos: [
        { nome: 'Marina Souza', status: StatusCandidato.ENTREVISTA },
        { nome: 'Renata Faria', status: StatusCandidato.TRIAGEM },
      ],
    },
    {
      vaga: 'Designer Gráfico',
      candidatos: [
        { nome: 'Tiago Lopes', status: StatusCandidato.TRIAGEM },
        { nome: 'Vitor Hugo', status: StatusCandidato.INSCRITO },
      ],
    },
    {
      vaga: 'Gestora de Tráfego',
      candidatos: [
        { nome: 'Aline Costa', status: StatusCandidato.TESTE },
      ],
    },
    {
      vaga: 'CS Júnior',
      candidatos: [
        { nome: 'Lucas Oliveira', status: StatusCandidato.ENTREVISTA },
      ],
    },
  ];

  for (let vi = 0; vi < VAGAS_CANDIDATOS.length; vi++) {
    const v = VAGAS_CANDIDATOS[vi];
    const vaga = await prisma.vaga.create({
      data: {
        titulo: v.vaga,
        descricao: `Vaga aberta para ${v.vaga}`,
        codigoUnico: `VAGA-2026-${String(vi + 1).padStart(3, '0')}`,
      },
    });
    for (const c of v.candidatos) {
      await prisma.candidato.create({
        data: { nome: c.nome, status: c.status, vagaId: vaga.id },
      });
    }
  }

  // Compras / solicitações de compra
  console.log('[seed-real] Criando compras...');
  const COMPRAS = [
    { descricao: 'Ring light 48cm para estúdio de conteúdo', valor: 890, status: StatusCompra.SOLICITADA, categoria: 'Equipamento' },
    { descricao: 'Licença Adobe Creative Cloud – equipe design (anual)', valor: 4800, status: StatusCompra.APROVADA, categoria: 'Software' },
    { descricao: 'Câmera Sony ZV-E10 para produção Reels', valor: 5200, status: StatusCompra.SOLICITADA, categoria: 'Equipamento' },
    { descricao: 'Headphones profissionais Sennheiser HD 400S (x3)', valor: 1650, status: StatusCompra.RECEBIDA, categoria: 'Equipamento' },
    { descricao: 'Conta Canva Teams – 6 usuários (anual)', valor: 1800, status: StatusCompra.APROVADA, categoria: 'Software' },
    { descricao: 'SSD externo 2TB para backup de projetos', valor: 580, status: StatusCompra.RECEBIDA, categoria: 'Equipamento' },
  ];

  for (let i = 0; i < COMPRAS.length; i++) {
    const comp = COMPRAS[i];
    await prisma.compra.create({
      data: {
        descricao: comp.descricao,
        valor: comp.valor,
        status: comp.status,
        categoria: comp.categoria,
        codigoUnico: `COMP-2026-${String(i + 1).padStart(3, '0')}`,
        solicitanteId: comercialId || undefined,
      },
    });
  }

  // Bugs / chamados internos
  console.log('[seed-real] Criando bugs/chamados...');
  const BUGS = [
    { titulo: 'Pop-up de aprovação não fecha no Safari iOS', sev: SeveridadeBug.MEDIA, status: StatusBug.ABERTO, descricao: 'Cliente relatou que o modal de aprovação de conteúdo trava no Safari do iPhone.' },
    { titulo: 'Relatório mensal duplica linha de gasto', sev: SeveridadeBug.ALTA, status: StatusBug.EM_ANDAMENTO, descricao: 'No export PDF do relatório Reportei, a linha de orçamento aparece duas vezes.' },
    { titulo: 'Notificação WhatsApp não chega para grupo de aprovação', sev: SeveridadeBug.ALTA, status: StatusBug.ABERTO, descricao: 'Após aprovação de criativo, o WhatsApp do grupo do cliente não recebe a mensagem automática.' },
    { titulo: 'Ícone de campanha sumiu no painel mobile', sev: SeveridadeBug.BAIXA, status: StatusBug.ABERTO, descricao: 'No layout responsivo (375px), o ícone do módulo de campanhas não aparece no menu.' },
  ];

  const adminUser = await prisma.usuario.findFirst({ where: { email: 'admin@breakr.com' } });

  for (let i = 0; i < BUGS.length; i++) {
    const bug = BUGS[i];
    await prisma.bug.create({
      data: {
        titulo: bug.titulo,
        descricao: bug.descricao,
        severidade: bug.sev,
        status: bug.status,
        codigoUnico: `BUG-2026-${String(i + 1).padStart(3, '0')}`,
        responsavelId: adminUser?.id,
      },
    });
  }

  // Resumo
  const totais = {
    usuarios: await prisma.usuario.count(),
    squads: await prisma.squad.count(),
    clientes: await prisma.cliente.count(),
    contratos: await prisma.contrato.count(),
    faturas: await prisma.fatura.count(),
    conteudos: await prisma.conteudo.count(),
    leads: await prisma.lead.count(),
    candidatos: await prisma.candidato.count(),
    compras: await prisma.compra.count(),
    bugs: await prisma.bug.count(),
  };

  console.log('[seed-real] OK:', JSON.stringify(totais));
}

function subDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
