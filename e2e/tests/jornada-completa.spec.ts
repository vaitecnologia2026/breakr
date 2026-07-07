// JORNADA COMPLETA (tags @jornada @escrita) — simula a operação inteira como um
// humano, encadeada, cobrindo o checklist de ponta a ponta:
//
//   plano → 5 usuários → squad → 5 membros por função → cliente (plano+squad) →
//   estratégia → enviar ao cliente → PORTAL aprova estratégia → criar peça →
//   anexar mídia → encaminhar p/ design → enviar p/ aprovação → PORTAL aprova a
//   peça (com estrelas) → registrar NPS.
//
// ⚠️ GRAVA MUITO no banco. Rode contra LOCAL/STAGING (BASE_URL=http://localhost:5173).
//    Em produção deixaria registros sem DELETE na API (cliente/usuário/plano/peça).
//    Rodar:  npx playwright test jornada --project=setup --project=autenticado
//
// Seletores ancorados no código real das telas (placeholders/aria-label/textos).
import { test, expect } from '@playwright/test';
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

// Contexto compartilhado entre as etapas (serial).
const ctx: { codigo?: string } = {};

test.describe.serial('@jornada @escrita Operação completa como humano', () => {
  // 1) PLANO ------------------------------------------------------------------
  test('01 · cria o plano', async ({ page }) => {
    await page.goto('/planos');
    await page.getByRole('button', { name: '+ Novo plano' }).click();
    await page.getByPlaceholder('Ex.: Brava').fill(plano);
    await page.getByPlaceholder('2790.00').fill('2790');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText(plano).first()).toBeVisible({ timeout: 10_000 });
  });

  // 2) USUÁRIOS (5) -----------------------------------------------------------
  test('02 · cria os 5 usuários da equipe (realtime)', async ({ page }) => {
    await page.goto('/equipe');
    for (const m of membros) {
      await page.getByRole('button', { name: '+ Novo usuário' }).click();
      await page.getByPlaceholder('Ex: Maria Silva').fill(m.nome);
      await page.getByPlaceholder('usuario@breakr.com').fill(m.email);
      await page.getByPlaceholder('Mínimo 8 caracteres').fill('Teste@123');
      await page.getByLabel('Cargo').selectOption({ label: m.cargo });
      await page.getByRole('button', { name: 'Criar usuário' }).click();
      // Realtime: aparece sem F5.
      await expect(page.getByText(m.nome).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  // 3) SQUAD + MEMBROS --------------------------------------------------------
  test('03 · cria o squad e adiciona os 5 membros por função', async ({ page }) => {
    await page.goto('/squads');
    await page.getByRole('button', { name: '+ Novo squad' }).click();
    await page.getByPlaceholder('Ex.: Squad Fênix').fill(squad);
    await page.getByRole('button', { name: 'Criar squad' }).click();

    const card = page.locator('article').filter({ hasText: squad });
    await expect(card).toBeVisible({ timeout: 10_000 });

    for (const m of membros) {
      // Dentro do card: 1º select = usuário, 2º select = função, botão "+ Add".
      await card.locator('select').nth(0).selectOption({ label: m.nome });
      await card.locator('select').nth(1).selectOption({ label: m.funcao });
      await card.getByRole('button', { name: '+ Add' }).click();
      // O membro entra na lista do card.
      await expect(card.getByText(m.nome).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  // 4) CLIENTE (plano + squad) + captura do código do portal ------------------
  test('04 · cadastra o cliente com plano e squad', async ({ page }) => {
    await page.goto('/clientes');
    await page.getByRole('button', { name: '+ Novo cliente' }).click();
    await page.getByPlaceholder('Ex.: Estúdio Aurora').fill(cliente);
    await page.getByPlaceholder(/00\.000\.000\/0000-00/).fill('11.222.333/0001-44');
    await page.getByPlaceholder(/Premium, Inbound/).fill('Restaurante');
    await page.getByLabel('Plano').selectOption({ label: plano });
    await page.getByLabel('Squad').selectOption({ label: squad });
    await page.getByRole('button', { name: 'Cadastrar' }).click();

    const linha = page.locator('tr').filter({ hasText: cliente });
    await expect(linha).toBeVisible({ timeout: 10_000 });
    // Captura o código do portal (link "Portal" → /portal/CÓDIGO) p/ as etapas do portal.
    const href = await linha.getByRole('link', { name: 'Portal' }).getAttribute('href');
    ctx.codigo = (href ?? '').split('/portal/')[1];
    expect(ctx.codigo, 'código do portal não capturado').toBeTruthy();
  });

  // 5) ESTRATÉGIA: criar + enviar ao cliente ----------------------------------
  test('05 · cria a estratégia e envia ao cliente', async ({ page }) => {
    await page.goto('/estrategia');
    await page.locator('select').first().selectOption({ label: cliente });
    await page.getByPlaceholder(/Título da estratégia/).fill(tituloEstrategia);
    await page.getByPlaceholder(/Descreva a estratégia/).fill('Topo Reels, meio enquetes, fundo oferta.');
    await page.getByRole('button', { name: 'Criar rascunho' }).click();

    const cardEst = page.locator('.brk-card').filter({ hasText: tituloEstrategia });
    await expect(cardEst).toBeVisible({ timeout: 10_000 });
    await cardEst.getByRole('button', { name: 'Enviar ao cliente' }).click();
    await expect(cardEst.getByText('Aguardando cliente')).toBeVisible({ timeout: 10_000 });
  });

  // 6) PORTAL (anônimo): aprova a estratégia ----------------------------------
  test('06 · cliente aprova a estratégia no portal', async ({ browser }) => {
    const ctxAnon = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctxAnon.newPage();
    await page.goto(`/portal/${ctx.codigo}`);
    await expect(page.getByText(/Olá,/i).first()).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Aprovar estratégia' }).click();
    // O card de estratégia some após aprovar.
    await expect(page.getByText('Estratégia para aprovar')).toHaveCount(0, { timeout: 10_000 });
    await ctxAnon.close();
  });

  // 7) CONTEÚDO: cria a peça (squad puxado do cliente) -------------------------
  test('07 · cria a peça de conteúdo (orgânica)', async ({ page }) => {
    await page.goto('/conteudos');
    await page.getByRole('button', { name: '+ Nova peça' }).click();
    await page.getByLabel('Cliente').selectOption({ label: cliente });
    // Ao escolher o cliente, o squad é resolvido — confirma o auto-preenchimento.
    await expect(page.getByText(`Squad: ${squad}`)).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder(/bastidores da cozinha/).fill(tituloPeca);
    await page.getByRole('button', { name: 'Criar peça' }).click();
    await expect(page.getByText(tituloPeca).first()).toBeVisible({ timeout: 10_000 });
  });

  // 8) CONTEÚDO: anexa mídia + encaminha p/ design + envia p/ aprovação --------
  test('08 · anexa mídia, encaminha p/ design e envia p/ aprovação', async ({ page }) => {
    await page.goto('/conteudos');
    // Filtra pelo cliente p/ deixar a peça (e seus botões) únicos no board.
    await page.locator('select.brk-select-filtro').selectOption({ label: cliente });
    await expect(page.getByText(tituloPeca).first()).toBeVisible({ timeout: 10_000 });

    // Anexa mídia por link.
    await page.getByRole('button', { name: '🎬 Anexar mídia' }).click();
    await page.getByPlaceholder('URL da imagem/vídeo…').fill(MIDIA);
    await page.getByRole('button', { name: 'Salvar mídia' }).click();
    await expect(page.getByRole('button', { name: '🎬 Editar mídia' })).toBeVisible({ timeout: 10_000 });

    // Move p/ Roteiro → aparece o botão de handoff → encaminha p/ design.
    await page.getByLabel(`Mover peça ${tituloPeca}`).selectOption({ label: 'Roteiro' });
    await page.getByRole('button', { name: 'Encaminhar p/ design →' }).click();
    // Encaminhou → foi p/ Produção e atribuiu o Designer do squad.
    await expect(page.getByText('Designer Jornada', { exact: false })).toBeVisible({ timeout: 10_000 });

    // Envia p/ aprovação do cliente.
    await page.getByLabel(`Mover peça ${tituloPeca}`).selectOption({ label: 'Aprovação do cliente' });
    await expect(page.getByLabel(`Mover peça ${tituloPeca}`)).toHaveValue('APROVACAO_CLIENTE', { timeout: 10_000 });
  });

  // 9) PORTAL (anônimo): a peça aparece com a mídia → avalia e aprova ----------
  test('09 · cliente avalia (estrelas) e aprova a peça no portal', async ({ browser }) => {
    const ctxAnon = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctxAnon.newPage();
    await page.goto(`/portal/${ctx.codigo}`);
    await expect(page.getByText(/Olá,/i).first()).toBeVisible({ timeout: 20_000 });

    const cardPeca = page.locator('li').filter({ hasText: tituloPeca });
    await expect(cardPeca).toBeVisible({ timeout: 15_000 });
    // Mídia renderizada (regressão do bug corrigido).
    const img = cardPeca.locator('img').first();
    await expect(img).toBeVisible();
    expect(await img.evaluate((el) => (el as HTMLImageElement).naturalWidth > 0)).toBeTruthy();

    // Dá 5 estrelas na "Nota geral" e aprova.
    await cardPeca.getByRole('radio', { name: '5 estrelas' }).first().click();
    await cardPeca.getByRole('button', { name: 'Aprovar', exact: true }).click();
    await expect(page.getByText(tituloPeca)).toHaveCount(0, { timeout: 10_000 });
    await ctxAnon.close();
  });

  // 10) NPS: registra a nota do cliente ---------------------------------------
  test('10 · registra o NPS do cliente', async ({ page }) => {
    await page.goto('/nps-cliente');
    await expect(page.getByText('Registrar NPS')).toBeVisible();
    // 1º select = cliente, 2º select = nota.
    await page.locator('select').nth(0).selectOption({ label: cliente });
    await page.locator('select').nth(1).selectOption('9');
    await page.getByPlaceholder(/Comentário/).fill('Ótima entrega no teste de jornada.');
    await page.getByRole('button', { name: 'Registrar' }).click();
    await expect(page.getByText('NPS registrado.')).toBeVisible({ timeout: 10_000 });
  });
});
