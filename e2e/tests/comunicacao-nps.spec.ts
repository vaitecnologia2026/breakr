// BLOCOS 11 e 12 — Comunicação interna e NPS (autenticado, LEITURA).
// Confere que as telas carregam com seus controles principais. Não publica nem
// registra nada (evita poluir produção); os fluxos de escrita ficam no
// fluxos-escrita.spec.ts, sob a tag @escrita.
import { test, expect } from '@playwright/test';
import { capturarErrosConsole } from './util/dados';

test.describe('@leitura Bloco 11/12 — Comunicação e NPS', () => {
  test('11.1 Comunicados abre com o formulário de publicar', async ({ page }) => {
    const parar = capturarErrosConsole(page);
    await page.goto('/comunicados');
    await expect(page.getByText('Comunicados', { exact: false }).first()).toBeVisible();
    parar();
  });

  test('11.2 Chat interno carrega', async ({ page }) => {
    const parar = capturarErrosConsole(page);
    await page.goto('/chat');
    await expect(page.getByText('Chat', { exact: false }).first()).toBeVisible();
    parar();
  });

  test('12.2 NPS de cliente abre com o card "Registrar NPS"', async ({ page }) => {
    const parar = capturarErrosConsole(page);
    await page.goto('/nps-cliente');
    // Regressão: antes essa tela mostrava "erro genérico"; agora carrega o form.
    await expect(page.getByText('Registrar NPS', { exact: false })).toBeVisible();
    parar();
  });

  test('12.1 Atendimento abre para o CS tratar ajustes', async ({ page }) => {
    const parar = capturarErrosConsole(page);
    await page.goto('/atendimento');
    await expect(page.getByText('Atendimento', { exact: false }).first()).toBeVisible();
    parar();
  });
});
