// Login único: entra como ADMIN/SUPERADMIN e salva a sessão (token no
// localStorage) em .auth/admin.json. Os specs autenticados reutilizam esse
// estado — não precisam logar de novo (mais rápido e estável). Usa o LoginPage.
import { test as setup, expect } from '@playwright/test';
import { LoginPage } from './pages/paginas';
import { USUARIO, SENHA } from './util/dados';

const ARQUIVO_SESSAO = '.auth/admin.json';

setup('autentica e salva a sessão', async ({ page }) => {
  const login = new LoginPage(page);
  await login.abrir();
  await login.entrar(USUARIO, SENHA);

  // Login OK => sai do /login e o menu lateral (Dashboard) aparece.
  await expect(login.linkDashboard()).toBeVisible({ timeout: 20_000 });
  await expect(page).not.toHaveURL(/\/login/);

  await page.context().storageState({ path: ARQUIVO_SESSAO });
});
