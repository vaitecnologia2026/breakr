// BLOCO 0 — Entrar e permissões (RBAC). Roda ANÔNIMO (sem a sessão salva),
// porque precisamos exercitar a própria tela de login.
import { test, expect } from '@playwright/test';
import { USUARIO, SENHA } from './util/dados';

test.describe('@leitura Bloco 0 — Acesso', () => {
  test('0.1 login com conta válida entra no sistema', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#usuario').fill(USUARIO);
    await page.locator('#senha-input').fill(SENHA);
    await page.getByRole('button', { name: 'Entrar' }).click();

    // Entra: o Dashboard e o menu lateral aparecem; a URL sai do /login.
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible({ timeout: 20_000 });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('0.2 senha errada é barrada e NÃO entra', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#usuario').fill(USUARIO);
    await page.locator('#senha-input').fill('senha-errada-de-proposito-123');
    await page.getByRole('button', { name: 'Entrar' }).click();

    // Mostra o alerta de erro e permanece na tela de login.
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveCount(0);
  });

  test('0.3 admin vê o grupo Gestão (Equipe/Configurações)', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#usuario').fill(USUARIO);
    await page.locator('#senha-input').fill(SENHA);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible({ timeout: 20_000 });

    // Só ADMIN/SUPERADMIN enxergam Equipe e Configurações.
    await expect(page.getByRole('link', { name: 'Equipe' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Configurações' })).toBeVisible();
  });
});
