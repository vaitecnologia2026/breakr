// BLOCOS 6 e 8 — Portal do cliente (ANÔNIMO e também no CELULAR).
// Este é o teste de regressão do bug que foi corrigido: a mídia da peça precisa
// aparecer renderizada (imagem/vídeo) no card "Para aprovar" — não como link quebrado.
//
// Código do portal: defina BREAKR_PORTAL_CODIGO no .env (tela Clientes →
// coluna "Código / Portal"). Sem ele, cai no portal de exemplo /portal/demo.
import { test, expect } from '@playwright/test';

const CODIGO = process.env.BREAKR_PORTAL_CODIGO?.trim() || 'demo';

test.describe('@leitura Bloco 6/8 — Portal do cliente', () => {
  test('6.1 portal abre pelo código, sem tela de e-mail', async ({ page }) => {
    const erros: string[] = [];
    page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));

    await page.goto(`/portal/${CODIGO}`);

    // Abre direto no conteúdo do cliente ("Olá, <cliente>") — sem gate de e-mail.
    await expect(page.getByText(/Olá,/i).first()).toBeVisible({ timeout: 20_000 });
    expect(erros, `Erros de console: ${erros.join(' | ')}`).toEqual([]);
  });

  test('8.1 mídia da peça aparece RENDERIZADA no portal', async ({ page }) => {
    await page.goto(`/portal/${CODIGO}`);
    await expect(page.getByText(/Olá,/i).first()).toBeVisible({ timeout: 20_000 });

    const secao = page.getByText('Para aprovar', { exact: false });
    if ((await secao.count()) === 0) {
      test.skip(true, 'Sem peças em "Para aprovar" neste cliente — envie uma peça p/ aprovação (Bloco 7.7).');
    }

    // Regressão do bug corrigido: toda imagem visível precisa ter carregado
    // (naturalWidth > 0) — se voltasse a quebrar, aqui daria 0.
    const imgs = page.locator('main img, img');
    const total = await imgs.count();
    let visiveis = 0;
    for (let i = 0; i < total; i++) {
      const img = imgs.nth(i);
      if (!(await img.isVisible())) continue;
      visiveis++;
      const carregou = await img.evaluate(
        (el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0,
      );
      expect(carregou, `Imagem ${i} do portal não carregou (mídia quebrada)`).toBeTruthy();
    }
    expect(visiveis, 'Nenhuma mídia/imagem visível no portal').toBeGreaterThan(0);

    // Controles de aprovação presentes (8.2 / 8.3).
    await expect(page.getByRole('button', { name: /Aprovar/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Pedir ajuste/i }).first()).toBeVisible();
  });

  test('8.3 pedir ajuste exige comentário (campo obrigatório presente)', async ({ page }) => {
    await page.goto(`/portal/${CODIGO}`);
    await expect(page.getByText(/Olá,/i).first()).toBeVisible({ timeout: 20_000 });

    const campo = page.getByPlaceholder(/obrigatório para pedir ajuste/i).first();
    if ((await campo.count()) === 0) {
      test.skip(true, 'Sem peça para aprovar — nada a validar aqui.');
    }
    await expect(campo).toBeVisible();
  });
});
