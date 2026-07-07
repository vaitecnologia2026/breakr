// Configuração da suíte E2E do Breakr (Playwright).
// Projeto ISOLADO — não faz parte do build do app; só dirige o navegador contra
// a URL alvo (produção por padrão, ou local via BASE_URL).
import { defineConfig, devices } from '@playwright/test';
import { config as carregarEnv } from 'dotenv';

carregarEnv();

// URL alvo: produção por padrão; aponte para local com BASE_URL=http://localhost:5173.
const BASE_URL = process.env.BASE_URL ?? 'https://breakr.vaitecnologia.com.br';

export default defineConfig({
  testDir: './tests',
  // Um item de cada vez por padrão: os fluxos de escrita compartilham o mesmo
  // cliente/squad de teste, então evitamos corrida entre specs.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },

  // Relatório visual (parecido com o checklist), com print/vídeo/trace na falha.
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    baseURL: BASE_URL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    // 1) Faz login uma vez e salva a sessão (token no localStorage) em .auth/admin.json.
    { name: 'setup', testMatch: /global\.setup\.ts/ },

    // 2) Specs autenticados (admin/superadmin) reutilizam a sessão do setup.
    {
      name: 'autenticado',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/admin.json',
      },
      testIgnore: [/global\.setup\.ts/, /portal\.spec\.ts/],
    },

    // 3) Specs anônimos (portal do cliente / tela de login) — sem sessão.
    {
      name: 'anonimo',
      use: { ...devices['Desktop Chrome'] },
      testMatch: [/portal\.spec\.ts/, /acesso\.spec\.ts/],
    },

    // 4) Portal no celular (o checklist pede testar o portal no mobile).
    {
      name: 'portal-mobile',
      use: { ...devices['Pixel 7'] },
      testMatch: [/portal\.spec\.ts/],
    },
  ],
});
