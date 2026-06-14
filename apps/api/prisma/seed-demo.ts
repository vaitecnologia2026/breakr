// Seed de DEMONSTRACAO — popula o Breakr OS com dados realistas e on-brand para
// uma demo funcional (NAO sao dados reais do ClickUp; e cenario representativo).
// Rodar em banco limpo: `npx prisma db push --force-reset` -> seed.ts -> este.
import {
  PrismaClient,
  Plano,
  Cargo,
  FuncaoSquad,
  ClienteStatus,
  TipoProjeto,
  StatusContrato,
  StatusFatura,
  StatusConteudo,
  TipoConteudo,
  StatusLead,
  StatusCandidato,
  StatusCompra,
  StatusBug,
  SeveridadeBug,
  StatusCampanha,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();
const cod = (p: string) => `${p}-${randomBytes(4).toString('hex').toUpperCase()}`;
const dias = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

async function main() {
  const senhaHash = await bcrypt.hash('breakr123', 10);

  // ---------------- Usuarios (time da Breakr) ----------------
  const criarUsuario = (nome: string, email: string, cargo: Cargo) =>
    prisma.usuario.upsert({
      where: { email },
      update: {},
      create: { nome, email, senhaHash, cargo, ativo: true },
    });

  const francielia = await criarUsuario('Franciélia Souza', 'financeiro@breakr.com', Cargo.FINANCEIRO);
  const rafael = await criarUsuario('Rafael Lima', 'comercial@breakr.com', Cargo.COMERCIAL);
  const marina = await criarUsuario('Marina Alves', 'cs@breakr.com', Cargo.CS);
  const bruno = await criarUsuario('Bruno Castro', 'estrategia@breakr.com', Cargo.ESTRATEGISTA);
  const leticia = await criarUsuario('Letícia Dias', 'copy@breakr.com', Cargo.COPYWRITER);
  const pedro = await criarUsuario('Pedro Rocha', 'design@breakr.com', Cargo.DESIGNER);
  const camila = await criarUsuario('Camila Nunes', 'video@breakr.com', Cargo.EDITOR_VIDEO);
  const diego = await criarUsuario('Diego Martins', 'trafego@breakr.com', Cargo.GESTOR_TRAFEGO);

  // ---------------- Squads + membros ----------------
  const membrosBase = [
    { usuarioId: marina.id, funcao: FuncaoSquad.CS },
    { usuarioId: bruno.id, funcao: FuncaoSquad.ESTRATEGISTA },
    { usuarioId: leticia.id, funcao: FuncaoSquad.COPYWRITER },
    { usuarioId: pedro.id, funcao: FuncaoSquad.DESIGNER },
    { usuarioId: camila.id, funcao: FuncaoSquad.EDITOR_VIDEO },
    { usuarioId: diego.id, funcao: FuncaoSquad.GESTOR_TRAFEGO },
  ];
  const trovao = await prisma.squad.create({
    data: { nome: 'Trovão', membros: { create: membrosBase } },
  });
  const relampago = await prisma.squad.create({
    data: {
      nome: 'Relâmpago',
      membros: {
        create: [
          { usuarioId: marina.id, funcao: FuncaoSquad.CS },
          { usuarioId: bruno.id, funcao: FuncaoSquad.ESTRATEGISTA },
          { usuarioId: pedro.id, funcao: FuncaoSquad.DESIGNER },
          { usuarioId: diego.id, funcao: FuncaoSquad.GESTOR_TRAFEGO },
        ],
      },
    },
  });
  const fagulha = await prisma.squad.create({
    data: {
      nome: 'Fagulha',
      membros: {
        create: [
          { usuarioId: marina.id, funcao: FuncaoSquad.CS },
          { usuarioId: leticia.id, funcao: FuncaoSquad.COPYWRITER },
        ],
      },
    },
  });

  // ---------------- Planos ----------------
  const brasa = await prisma.plano.create({
    data: {
      nome: 'Brasa',
      valor: 1500,
      ciclo: 'MENSAL',
      tiposProjeto: [TipoProjeto.MARKETING, TipoProjeto.GESTAO, TipoProjeto.FINANCEIRO],
      entregaveis: { posts: 12, reels: 8, relatorios: 'mensal' },
    },
  });
  const hibrido = await prisma.plano.create({
    data: {
      nome: 'Híbrido',
      valor: 2500,
      ciclo: 'MENSAL',
      tiposProjeto: [TipoProjeto.MARKETING, TipoProjeto.GESTAO],
      entregaveis: { posts: 20, reels: 12, trafego: true },
    },
  });
  const ignicao = await prisma.plano.create({
    data: {
      nome: 'Ignição',
      valor: 900,
      ciclo: 'MENSAL',
      tiposProjeto: [TipoProjeto.MARKETING],
      entregaveis: { posts: 8 },
    },
  });

  const ETAPAS = [
    { titulo: 'Preencher briefing da marca', ordem: 1 },
    { titulo: 'Enviar acessos (Instagram, Meta, site)', ordem: 2 },
    { titulo: 'Aprovar identidade e tom de voz', ordem: 3 },
    { titulo: 'Reunião de kickoff com o squad', ordem: 4 },
    { titulo: 'Definir metas e orçamento do mês', ordem: 5 },
  ];

  // Cria um cliente "completo" (contrato em vigor, fatura paga+NF, onboarding,
  // projetos, conteudos variados e campanha) — deixa varias telas cheias.
  async function clienteCompleto(opts: {
    nome: string;
    squadId: string;
    plano: Plano;
    progressoOnboarding: number; // 0..100
    conteudos: { titulo: string; tipo: TipoConteudo; status: StatusConteudo }[];
    metricas?: { impressoes: number; cliques: number; conversoes: number; gasto: number };
  }) {
    const concluidas = Math.round((opts.progressoOnboarding / 100) * ETAPAS.length);
    const cliente = await prisma.cliente.create({
      data: {
        nomeFantasia: opts.nome,
        status: opts.progressoOnboarding >= 100 ? ClienteStatus.ATIVO : ClienteStatus.ONBOARD,
        codigoUnico: cod('CLI'),
        squadId: opts.squadId,
        planoId: opts.plano.id,
        cnpj: '12.345.678/0001-90',
        whatsappGrupoId: `wagroup_${randomBytes(4).toString('hex')}@g.us`,
        contratos: {
          create: {
            status: StatusContrato.EM_VIGOR,
            valorMensal: opts.plano.valor,
            codigoUnico: cod('CTR'),
            dataInicio: dias(-40),
            vencimento: dias(320),
            planoId: opts.plano.id,
          },
        },
        onboarding: {
          create: {
            progresso: opts.progressoOnboarding,
            concluido: opts.progressoOnboarding >= 100,
            etapas: { create: ETAPAS.map((e, i) => ({ ...e, concluido: i < concluidas })) },
          },
        },
        projetos: {
          create: opts.plano.tiposProjeto.map((tipo) => ({
            tipo,
            nome: `${tipo[0] + tipo.slice(1).toLowerCase()} — ${opts.nome}`,
            codigoUnico: cod('PRJ'),
          })),
        },
        conteudos: {
          create: opts.conteudos.map((c) => ({
            titulo: c.titulo,
            tipo: c.tipo,
            status: c.status,
            codigoUnico: cod('CNT'),
            squadId: opts.squadId,
            responsavelId: pedro.id,
          })),
        },
      },
    });

    // Fatura paga + NF
    const contrato = await prisma.contrato.findFirst({ where: { clienteId: cliente.id } });
    await prisma.fatura.create({
      data: {
        clienteId: cliente.id,
        contratoId: contrato!.id,
        valor: opts.plano.valor,
        vencimento: dias(-10),
        status: StatusFatura.PAGA,
        pagaEm: dias(-9),
        asaasId: `pay_${randomBytes(4).toString('hex')}`,
        meio: 'PIX',
        notaFiscalId: `nfe_${randomBytes(4).toString('hex')}`,
        notaFiscalUrl: `https://nfe.exemplo/${randomBytes(3).toString('hex')}.pdf`,
        codigoUnico: cod('FAT'),
      },
    });
    // Proxima fatura pendente
    await prisma.fatura.create({
      data: {
        clienteId: cliente.id,
        contratoId: contrato!.id,
        valor: opts.plano.valor,
        vencimento: dias(20),
        status: StatusFatura.PENDENTE,
        asaasId: `pay_${randomBytes(4).toString('hex')}`,
        meio: 'PIX',
        codigoUnico: cod('FAT'),
      },
    });

    if (opts.metricas) {
      await prisma.campanha.create({
        data: {
          clienteId: cliente.id,
          nome: `${opts.nome} — Conversões`,
          objetivo: 'Conversões',
          status: StatusCampanha.ATIVA,
          orcamentoDiario: 80,
          gasto: opts.metricas.gasto,
          impressoes: opts.metricas.impressoes,
          cliques: opts.metricas.cliques,
          conversoes: opts.metricas.conversoes,
          codigoUnico: cod('CAM'),
        },
      });
    }
    return cliente;
  }

  await clienteCompleto({
    nome: 'Buteco do Preto',
    squadId: trovao.id,
    plano: brasa,
    progressoOnboarding: 100,
    conteudos: [
      { titulo: 'Reels: combo executivo', tipo: TipoConteudo.REELS, status: StatusConteudo.PUBLICADO },
      { titulo: 'Carrossel: cardápio da semana', tipo: TipoConteudo.CARROSSEL, status: StatusConteudo.AGENDADO },
      { titulo: 'Post: happy hour sexta', tipo: TipoConteudo.POST, status: StatusConteudo.APROVACAO_CLIENTE },
      { titulo: 'Story: bastidores da cozinha', tipo: TipoConteudo.STORY, status: StatusConteudo.PRODUCAO },
    ],
    metricas: { impressoes: 48200, cliques: 1340, conversoes: 86, gasto: 2400 },
  });

  await clienteCompleto({
    nome: 'Cantina da Nonna',
    squadId: relampago.id,
    plano: hibrido,
    progressoOnboarding: 60,
    conteudos: [
      { titulo: 'Reels: massa fresca artesanal', tipo: TipoConteudo.REELS, status: StatusConteudo.REVISAO },
      { titulo: 'Post: rodízio de domingo', tipo: TipoConteudo.POST, status: StatusConteudo.APROVACAO_CLIENTE },
      { titulo: 'Carrossel: vinhos da casa', tipo: TipoConteudo.CARROSSEL, status: StatusConteudo.IDEIA },
    ],
    metricas: { impressoes: 31000, cliques: 720, conversoes: 41, gasto: 1600 },
  });

  await clienteCompleto({
    nome: 'Sushi Hub',
    squadId: fagulha.id,
    plano: brasa,
    progressoOnboarding: 40,
    conteudos: [
      { titulo: 'Reels: montagem do combinado', tipo: TipoConteudo.REELS, status: StatusConteudo.PRODUCAO },
      { titulo: 'Post: rodízio de quarta', tipo: TipoConteudo.POST, status: StatusConteudo.ROTEIRO },
    ],
  });

  // Cliente em renovacao
  await prisma.cliente.create({
    data: {
      nomeFantasia: 'Burger Capital',
      status: ClienteStatus.RENOVACAO,
      codigoUnico: cod('CLI'),
      squadId: trovao.id,
      planoId: hibrido.id,
      contratos: {
        create: {
          status: StatusContrato.RENOVACAO,
          valorMensal: hibrido.valor,
          codigoUnico: cod('CTR'),
          dataInicio: dias(-330),
          vencimento: dias(30),
          planoId: hibrido.id,
        },
      },
    },
  });

  // Cliente novo (acabou de entrar)
  await prisma.cliente.create({
    data: {
      nomeFantasia: 'Açaí da Praça',
      status: ClienteStatus.NOVO,
      codigoUnico: cod('CLI'),
      planoId: ignicao.id,
    },
  });

  // ---------------- Comercial: pipeline de leads ----------------
  const leads: { nome: string; empresa: string; status: StatusLead; valor: number; origem: string }[] = [
    { nome: 'João Mendes', empresa: 'Pizzaria Bella', status: StatusLead.NOVO, valor: 1500, origem: 'Indicação' },
    { nome: 'Carla Reis', empresa: 'Tacos del Sol', status: StatusLead.CONTATADO, valor: 900, origem: 'Inbound' },
    { nome: 'Felipe Aragão', empresa: 'Marmitex Fit', status: StatusLead.QUALIFICADO, valor: 2500, origem: 'Evento' },
    { nome: 'Renata Vasco', empresa: 'Padaria Pão Quente', status: StatusLead.PROPOSTA, valor: 1500, origem: 'Indicação' },
    { nome: 'Diego Sá', empresa: 'Espetinho do Zé', status: StatusLead.PERDIDO, valor: 900, origem: 'Scraping' },
  ];
  for (const l of leads) {
    await prisma.lead.create({
      data: {
        nome: l.nome,
        empresa: l.empresa,
        email: `${l.empresa.toLowerCase().replace(/[^a-z]/g, '')}@email.com`,
        telefone: '(98) 90000-0000',
        origem: l.origem,
        status: l.status,
        valorEstimado: l.valor,
        codigoUnico: cod('LEAD'),
        responsavelId: rafael.id,
      },
    });
  }

  // ---------------- RH: vaga + candidatos ----------------
  const vaga = await prisma.vaga.create({
    data: { titulo: 'Designer Pleno', departamento: 'Criação', codigoUnico: cod('VAGA') },
  });
  const candidatos: { nome: string; status: StatusCandidato }[] = [
    { nome: 'Marina Souza', status: StatusCandidato.ENTREVISTA },
    { nome: 'Tiago Lopes', status: StatusCandidato.TRIAGEM },
    { nome: 'Aline Costa', status: StatusCandidato.TESTE },
    { nome: 'Vitor Hugo', status: StatusCandidato.INSCRITO },
  ];
  for (const c of candidatos) {
    await prisma.candidato.create({
      data: {
        nome: c.nome,
        email: `${c.nome.toLowerCase().replace(/[^a-z]/g, '.')}@email.com`,
        status: c.status,
        vagaId: vaga.id,
      },
    });
  }

  // ---------------- Operações: compras ----------------
  const compras: { descricao: string; valor: number; status: StatusCompra; cat: string }[] = [
    { descricao: 'Ring light + tripé para produção', valor: 850, status: StatusCompra.RECEBIDA, cat: 'Equipamento' },
    { descricao: 'Assinatura banco de imagens (anual)', valor: 1200, status: StatusCompra.APROVADA, cat: 'Software' },
    { descricao: '2 monitores 27" para o time de design', valor: 3200, status: StatusCompra.SOLICITADA, cat: 'Equipamento' },
  ];
  for (const c of compras) {
    await prisma.compra.create({
      data: {
        descricao: c.descricao,
        valor: c.valor,
        categoria: c.cat,
        status: c.status,
        codigoUnico: cod('CMP'),
        solicitanteId: pedro.id,
      },
    });
  }

  // ---------------- Desenvolvimento: bugs ----------------
  const bugs: { titulo: string; sev: SeveridadeBug; status: StatusBug }[] = [
    { titulo: 'Pop-up de aprovação não fecha no Safari', sev: SeveridadeBug.MEDIA, status: StatusBug.ABERTO },
    { titulo: 'Relatório mensal duplica linha de gasto', sev: SeveridadeBug.ALTA, status: StatusBug.EM_ANDAMENTO },
    { titulo: 'Avatar do cliente quebra com nome longo', sev: SeveridadeBug.BAIXA, status: StatusBug.RESOLVIDO },
  ];
  for (const b of bugs) {
    await prisma.bug.create({
      data: {
        titulo: b.titulo,
        severidade: b.sev,
        status: b.status,
        codigoUnico: cod('BUG'),
        responsavelId: diego.id,
      },
    });
  }

  // ---------------- Notificações p/ a Franciélia (pop-up realtime) ----------------
  await prisma.notificacao.createMany({
    data: [
      {
        usuarioId: francielia.id,
        titulo: 'Contrato para revisão',
        mensagem: 'Cantina da Nonna assinou — revisar antes de entrar em vigor.',
        tipo: 'ALERTA',
        link: '/contratos',
      },
      {
        usuarioId: francielia.id,
        titulo: 'Pagamento confirmado',
        mensagem: 'Buteco do Preto pagou a mensalidade — onboarding liberado.',
        tipo: 'SUCESSO',
        link: '/cobrancas',
      },
    ],
  });

  const totais = {
    usuarios: await prisma.usuario.count(),
    squads: await prisma.squad.count(),
    clientes: await prisma.cliente.count(),
    contratos: await prisma.contrato.count(),
    faturas: await prisma.fatura.count(),
    conteudos: await prisma.conteudo.count(),
    leads: await prisma.lead.count(),
    campanhas: await prisma.campanha.count(),
    candidatos: await prisma.candidato.count(),
    compras: await prisma.compra.count(),
    bugs: await prisma.bug.count(),
  };
  console.log('[seed-demo] OK:', JSON.stringify(totais));
}

main()
  .catch((e) => {
    console.error('[seed-demo] erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
