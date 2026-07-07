// JORNADA COMPLETA (tags @jornada @escrita) — simula a operação inteira como um
// humano, encadeada, cobrindo o checklist de ponta a ponta. Agora via POM:
// os passos usam os Page Objects (fixtures) e o PortalPage (contexto anônimo).
//
//   plano → 5 usuários → squad → 5 membros por função → cliente (plano+squad) →
//   estratégia → enviar ao cliente → PORTAL aprova estratégia → criar peça →
//   anexar mídia → encaminhar p/ design → enviar p/ aprovação → PORTAL aprova a
//   peça (com estrelas) → registrar NPS.
//
// ⚠️ GRAVA MUITO no banco. Rode contra LOCAL/STAGING (BASE_URL=http://localhost:5173).
//    Rodar:  npx playwright test jornada --project=setup --project=autenticado
import { test, expect } from './pages/fixtures';
import { PortalPage } from './pages/paginas';
import { STAMP } from './util/dados';

// ─── Dados do fio condutor (nomes únicos por execução) ───────────────────────
const cliente = `Pizzaria Jornada ${STAMP}`;
const squad = `Squad Jornada ${STAMP}`;
const plano = `Plano Jornada ${STAMP}`;
const tituloEstrategia = `Funil de captação — ${STAMP}`;
const tituloPeca = `Post — Jornada ${STAMP}`;
const MIDIA = 'https://picsum.photos/seed/breakrjornada/900/700';

// Usuário (cargo no Equipe) + função no squad. Cargo/função usam os RÓTULOS reais.
const membros = [
  { nome: `CS Jornada ${STAMP}`, email: `cs.j.${STAMP}@breakr.com`, cargo: 'CS (Customer Success)', funcao: 'CS' },
  { nome: `Estrategista Jornada ${STAMP}`, email: `estr.j.${STAMP}@breakr.com`, cargo: 'Estrategista', funcao: 'Estrategista' },
  { nome: `Copy Jornada ${STAMP}`, email: `copy.j.${STAMP}@breakr.com`, cargo: 'Copywriter', funcao: 'Copywriter' },
  { nome: `Designer Jornada ${STAMP}`, email: `design.j.${STAMP}@breakr.com`, cargo: 'Designer', funcao: 'Designer' },
  { nome: `Trafego Jornada ${STAMP}`, email: `traf.j.${STAMP}@breakr.com`, cargo: 'Gestor de Tráfego', funcao: 'Tráfego' },
];

const ctx: { codigo?: string } = {};

test.describe.serial('@jornada @escrita Operação completa como humano', () => {
  test('01 · cria o plano', async ({ planosPage }) => {
    await planosPage.abrir();
    await planosPage.criarPlano(plano, '2790');
    await expect(planosPage.plano(plano)).toBeVisible({ timeout: 10_000 });
  });

  test('02 · cria os 5 usuários da equipe (realtime)', async ({ equipePage }) => {
    await equipePage.abrir();
    for (const m of membros) {
      await equipePage.criarUsuario({ nome: m.nome, email: m.email, senha: 'Teste@123', cargo: m.cargo });
      await expect(equipePage.usuario(m.nome)).toBeVisible({ timeout: 10_000 });
    }
  });

  test('03 · cria o squad e adiciona os 5 membros por função', async ({ squadsPage }) => {
    await squadsPage.abrir();
    await squadsPage.criarSquad(squad);
    await expect(squadsPage.card(squad)).toBeVisible({ timeout: 10_000 });
    for (const m of membros) {
      await squadsPage.adicionarMembro(squad, m.nome, m.funcao);
      await expect(squadsPage.card(squad).getByText(m.nome).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('04 · cadastra o cliente com plano e squad', async ({ clientesPage }) => {
    await clientesPage.abrir();
    await clientesPage.novoCliente({ nome: cliente, cnpj: '11.222.333/0001-44', tag: 'Restaurante', plano, squad });
    await expect(clientesPage.linha(cliente)).toBeVisible({ timeout: 10_000 });
    ctx.codigo = await clientesPage.codigoPortal(cliente);
    expect(ctx.codigo, 'código do portal não capturado').toBeTruthy();
  });

  test('05 · cria a estratégia e envia ao cliente', async ({ estrategiaPage }) => {
    await estrategiaPage.abrir();
    await estrategiaPage.criar(cliente, tituloEstrategia, 'Topo Reels, meio enquetes, fundo oferta.');
    await expect(estrategiaPage.card(tituloEstrategia)).toBeVisible({ timeout: 10_000 });
    await estrategiaPage.enviar(tituloEstrategia);
    await expect(estrategiaPage.card(tituloEstrategia).getByText('Aguardando cliente')).toBeVisible({ timeout: 10_000 });
  });

  test('06 · cliente aprova a estratégia no portal', async ({ browser }) => {
    const c = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const portal = new PortalPage(await c.newPage());
    await portal.abrir(ctx.codigo!);
    await expect(portal.ola()).toBeVisible({ timeout: 20_000 });
    await portal.aprovarEstrategia();
    await expect(portal.cardEstrategia()).toHaveCount(0, { timeout: 10_000 });
    await c.close();
  });

  test('07 · cria a peça de conteúdo (orgânica)', async ({ conteudosPage }) => {
    await conteudosPage.abrir();
    await conteudosPage.novaPeca(cliente, tituloPeca);
    await expect(conteudosPage.peca(tituloPeca)).toBeVisible({ timeout: 10_000 });
  });

  test('08 · anexa mídia, encaminha p/ design e envia p/ aprovação', async ({ conteudosPage, page }) => {
    await conteudosPage.abrir();
    await conteudosPage.filtrarCliente(cliente);
    await expect(conteudosPage.peca(tituloPeca)).toBeVisible({ timeout: 10_000 });

    await conteudosPage.anexarMidia(MIDIA);
    await expect(conteudosPage.botaoEditarMidia()).toBeVisible({ timeout: 10_000 });

    // Move p/ Roteiro → handoff → encaminha p/ design (atribui o Designer do squad).
    await conteudosPage.mover(tituloPeca, 'Roteiro');
    await conteudosPage.encaminharDesign();
    await expect(page.getByText('Designer Jornada', { exact: false })).toBeVisible({ timeout: 10_000 });

    // Envia p/ aprovação do cliente.
    await conteudosPage.mover(tituloPeca, 'Aprovação do cliente');
    await expect(conteudosPage.seletorMover(tituloPeca)).toHaveValue('APROVACAO_CLIENTE', { timeout: 10_000 });
  });

  test('09 · cliente avalia (estrelas) e aprova a peça no portal', async ({ browser }) => {
    const c = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const portal = new PortalPage(await c.newPage());
    await portal.abrir(ctx.codigo!);
    await expect(portal.ola()).toBeVisible({ timeout: 20_000 });

    await expect(portal.cardPeca(tituloPeca)).toBeVisible({ timeout: 15_000 });
    const img = portal.imagemPeca(tituloPeca);
    await expect(img).toBeVisible(); // mídia renderizada (regressão do bug corrigido)
    expect(await img.evaluate((el) => (el as HTMLImageElement).naturalWidth > 0)).toBeTruthy();

    await portal.avaliarEAprovar(tituloPeca);
    await expect(portal.cardPeca(tituloPeca)).toHaveCount(0, { timeout: 10_000 });
    await c.close();
  });

  test('10 · registra o NPS do cliente', async ({ npsPage }) => {
    await npsPage.abrir();
    await expect(npsPage.titulo()).toBeVisible();
    await npsPage.registrar(cliente, '9', 'Ótima entrega no teste de jornada.');
    await expect(npsPage.sucesso()).toBeVisible({ timeout: 10_000 });
  });
});
