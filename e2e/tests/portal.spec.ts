// BLOCOS 6 e 8 — Portal do cliente (ANÔNIMO e também no CELULAR). Usa PortalPage.
// Teste de regressão do bug corrigido: a mídia da peça precisa aparecer
// renderizada (imagem/vídeo) no card "Para aprovar" — não como link quebrado.
//
// Código do portal: BREAKR_PORTAL_CODIGO no .env; sem ele, cai em /portal/demo.
import { test, expect } from '@playwright/test';
import { PortalPage } from './pages/paginas';

const CODIGO = process.env.BREAKR_PORTAL_CODIGO?.trim() || 'demo';

test.describe('@leitura Bloco 6/8 — Portal do cliente', () => {
  test('6.1 portal abre pelo código, sem tela de e-mail', async ({ page }) => {
    const erros: string[] = [];
    page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
    const portal = new PortalPage(page);
    await portal.abrir(CODIGO);
    await expect(portal.ola()).toBeVisible({ timeout: 20_000 });
    expect(erros, `Erros de console: ${erros.join(' | ')}`).toEqual([]);
  });

  test('8.1 mídia da peça aparece RENDERIZADA no portal', async ({ page }) => {
    const portal = new PortalPage(page);
    await portal.abrir(CODIGO);
    await expect(portal.ola()).toBeVisible({ timeout: 20_000 });

    if ((await page.getByText('Para aprovar', { exact: false }).count()) === 0) {
      test.skip(true, 'Sem peças em "Para aprovar" — envie uma peça p/ aprovação (Bloco 7.7).');
    }
    // Regressão: toda imagem visível precisa ter carregado (naturalWidth > 0).
    const visiveis = await portal.imagensCarregaram();
    expect(visiveis, 'Nenhuma mídia/imagem visível no portal').toBeGreaterThan(0);
    // Controles de aprovação presentes (8.2 / 8.3).
    await expect(page.getByRole('button', { name: /Aprovar/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Pedir ajuste/i }).first()).toBeVisible();
  });

  test('8.3 pedir ajuste exige comentário (campo obrigatório presente)', async ({ page }) => {
    const portal = new PortalPage(page);
    await portal.abrir(CODIGO);
    await expect(portal.ola()).toBeVisible({ timeout: 20_000 });
    const campo = page.getByPlaceholder(/obrigatório para pedir ajuste/i).first();
    if ((await campo.count()) === 0) {
      test.skip(true, 'Sem peça para aprovar — nada a validar aqui.');
    }
    await expect(campo).toBeVisible();
  });
});
