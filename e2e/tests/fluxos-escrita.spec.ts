// FLUXOS DE ESCRITA (tag @escrita) — criam/editam/excluem dados de verdade,
// simulando o usuário real ponta a ponta. Cobrem os ajustes RECENTES marcados
// com ★ no checklist (Equipe realtime, plano duplicado, squad criar/excluir,
// cliente + mensagem de erro).
//
// ⚠️ ESCREVEM NO BANCO DO AMBIENTE ALVO. Contra produção, deixam registros de
//    teste com sufixo único (STAMP): o squad é EXCLUÍDO no fim; usuário/plano/
//    cliente não têm exclusão na UI, então PERSISTEM (ficam com nome "...Teste
//    <hora>" e o usuário pode ser desativado). Por isso, no CI eles rodam só sob
//    acionamento manual (workflow_dispatch), não a cada push.
//
// Seletores ancorados nos PLACEHOLDERS reais dos formulários (robusto a mudança
// de layout). Rodar só estes:  npm run test:escrita
import { test, expect } from '@playwright/test';
import { CLIENTE, SQUAD, PLANO, MEMBROS } from './util/dados';

test.describe.serial('@escrita Fluxos ponta a ponta (dados reais)', () => {
  // Bloco 1.2 ★ — novo usuário aparece na lista SEM recarregar a página.
  test('1.2 Equipe: novo usuário aparece em realtime (sem F5)', async ({ page }) => {
    const m = MEMBROS[3]; // Designer Teste
    await page.goto('/equipe');
    await page.getByRole('button', { name: '+ Novo usuário' }).click();

    await page.getByPlaceholder('Ex: Maria Silva').fill(m.nome);
    await page.getByPlaceholder('usuario@breakr.com').fill(m.email);
    await page.getByPlaceholder('Mínimo 8 caracteres').fill('Teste@123');
    // Cargo é um <select>; escolher "Designer" (tolerante se o layout mudar).
    await page.locator('select').filter({ hasText: 'Designer' }).first()
      .selectOption({ label: 'Designer' }).catch(() => {});
    await page.getByRole('button', { name: 'Criar usuário' }).click();

    // O ponto do ajuste: aviso verde + o nome surge na hora, sem reload.
    await expect(page.getByText('Usuário criado com sucesso.')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(m.nome).first()).toBeVisible();
  });

  // Bloco 2.2 ★ — nome de plano duplicado é recusado com mensagem clara.
  test('2.2 Planos: nome duplicado é recusado (não erro genérico)', async ({ page }) => {
    await page.goto('/planos');

    async function criarPlano() {
      await page.getByRole('button', { name: '+ Novo plano' }).click();
      await page.getByPlaceholder('Ex.: Brava').fill(PLANO.nome);
      await page.getByPlaceholder('2790.00').fill(PLANO.valor);
      await page.getByRole('button', { name: 'Salvar' }).click();
    }
    await criarPlano();
    await expect(page.getByText(PLANO.nome).first()).toBeVisible({ timeout: 10_000 });

    await criarPlano(); // segundo com o MESMO nome
    // Esperado (checklist 2.2): mensagem clara de duplicado, não erro genérico.
    await expect(page.getByText(/já existe|existe um plano/i)).toBeVisible();
  });

  // Bloco 3.2 / 3.4 — cria o squad e depois o exclui (ajuste recente: excluir).
  test('3.2/3.4 Squads: criar e excluir', async ({ page }) => {
    await page.goto('/squads');
    await page.getByRole('button', { name: '+ Novo squad' }).click();
    await page.getByPlaceholder('Ex.: Squad Fênix').fill(SQUAD.nome);
    await page.getByRole('button', { name: 'Criar squad' }).click();

    // O card do squad recém-criado aparece.
    const card = page.locator('article').filter({ hasText: SQUAD.nome });
    await expect(card).toBeVisible({ timeout: 10_000 });

    // Exclui esse squad (confirma o window.confirm). Botão só existe p/ admin.
    page.once('dialog', (d) => d.accept());
    await card.getByRole('button', { name: 'Excluir' }).click();
    await expect(page.getByText(SQUAD.nome)).toHaveCount(0, { timeout: 10_000 });
  });

  // Bloco 4.2 — cadastra o cliente de teste.
  test('4.2 Clientes: cadastrar o cliente de teste', async ({ page }) => {
    await page.goto('/clientes');
    await page.getByRole('button', { name: '+ Novo cliente' }).click();

    await page.getByPlaceholder('Ex.: Estúdio Aurora').fill(CLIENTE.nomeFantasia);
    await page.getByPlaceholder(/00\.000\.000\/0000-00/).fill(CLIENTE.cnpj);
    await page.getByPlaceholder(/Premium, Inbound/).fill(CLIENTE.tag);
    await page.getByPlaceholder(/contato@restaurante\.com/).fill(CLIENTE.email);
    await page.getByPlaceholder(/\(11\) 99999-9999/).fill(CLIENTE.telefone);
    await page.getByRole('button', { name: 'Cadastrar' }).click();

    await expect(page.getByText(CLIENTE.nomeFantasia).first()).toBeVisible({ timeout: 10_000 });
  });

  // Bloco 4.x — a UI bloqueia o cadastro inválido: com o nome vazio, o botão
  // "Cadastrar" fica DESABILITADO (guarda de validação). Teste seguro (não grava).
  test('4.x Clientes: cadastro exige nome (botão desabilitado)', async ({ page }) => {
    await page.goto('/clientes');
    await page.getByRole('button', { name: '+ Novo cliente' }).click();
    await expect(page.getByRole('button', { name: 'Cadastrar' })).toBeDisabled();
  });
});
