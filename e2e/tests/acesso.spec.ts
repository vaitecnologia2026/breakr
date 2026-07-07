// BLOCO 0 — Entrar e permissões (RBAC). Roda ANÔNIMO (sem a sessão salva),
// porque precisamos exercitar a própria tela de login. Usa POM (LoginPage/NavPage).
import { test, expect } from './pages/fixtures';
import { USUARIO, SENHA } from './util/dados';

test.describe('@leitura Bloco 0 — Acesso', () => {
  test('0.1 login com conta válida entra no sistema', async ({ loginPage, page }) => {
    await loginPage.abrir();
    await loginPage.entrar(USUARIO, SENHA);
    await expect(loginPage.linkDashboard()).toBeVisible({ timeout: 20_000 });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('0.2 senha errada é barrada e NÃO entra', async ({ loginPage }) => {
    await loginPage.abrir();
    await loginPage.entrar(USUARIO, 'senha-errada-de-proposito-123');
    await expect(loginPage.alertaErro()).toBeVisible();
    await expect(loginPage.linkDashboard()).toHaveCount(0);
  });

  test('0.3 admin vê o grupo Gestão (Equipe/Configurações)', async ({ loginPage, navPage }) => {
    await loginPage.abrir();
    await loginPage.entrar(USUARIO, SENHA);
    await expect(loginPage.linkDashboard()).toBeVisible({ timeout: 20_000 });
    // Só ADMIN/SUPERADMIN enxergam Equipe e Configurações.
    await expect(navPage.link('Equipe')).toBeVisible();
    await expect(navPage.link('Configurações')).toBeVisible();
  });
});
