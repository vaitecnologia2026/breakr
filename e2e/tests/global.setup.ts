// Login único: entra como ADMIN/SUPERADMIN e salva a sessão (token no
// localStorage) em .auth/admin.json. Os specs autenticados reutilizam esse
// estado — não precisam logar de novo (mais rápido e estável).
import { test as setup, expect } from '@playwright/test';
import { USUARIO, SENHA } from './util/dados';

const ARQUIVO_SESSAO = '.auth/admin.json';

setup('autentica e salva a sessão', async ({ page }) => {
  await page.goto('/login');

  // Campo "Usuário" (id=usuario) e "Senha" (id=senha-input), botão "Entrar".
  await page.locator('#usuario').fill(USUARIO);
  await page.locator('#senha-input').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();

  // Login OK => sai do /login e o menu lateral (Dashboard) aparece.
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible({ timeout: 20_000 });
  await expect(page).not.toHaveURL(/\/login/);

  await page.context().storageState({ path: ARQUIVO_SESSAO });
});
