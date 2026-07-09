// SMOKE das telas NOVAS do menu COMERCIAL (Meu Painel, Negócios, Contatos,
// Atividades, Métricas) — @smoke @leitura. Prova que as funções novas estão
// ligadas ao resto do app: a tela monta autenticada (rota + sidebar + guarda),
// renderiza o título, NÃO cai no /login, HTTP < 400 e NÃO gera erro de console
// — o que incluiria falha ao consumir /comercial/leads e /comercial/atividades.
// SOMENTE LEITURA (nenhuma criação/edição): seguro contra produção.
import { test, expect } from '@playwright/test';
import { capturarErrosConsole } from './util/dados';

// (rota, texto do título que a PaginaShell renderiza no cabeçalho).
const PAGINAS_COMERCIAL: Array<[string, string]> = [
  ['/meu-painel', 'Meu Painel'],
  ['/negocios', 'Negócios'],
  ['/contatos', 'Contatos'],
  ['/atividades', 'Atividades'],
  ['/metricas', 'Métricas'],
];

test.describe('@smoke @leitura Telas novas do COMERCIAL carregam e comunicam', () => {
  for (const [rota, titulo] of PAGINAS_COMERCIAL) {
    test(`abre ${rota} sem erro`, async ({ page }) => {
      const pararConsole = capturarErrosConsole(page);
      const resposta = await page.goto(rota, { waitUntil: 'domcontentloaded' });

      // Sessão viva: não pode ter sido redirecionado para o login.
      await expect(page).not.toHaveURL(/\/login/);
      // O documento não pode responder 4xx/5xx.
      expect(resposta?.status(), `HTTP de ${rota}`).toBeLessThan(400);
      // O título da tela aparece (renderizou de fato).
      await expect(page.getByText(titulo, { exact: false }).first()).toBeVisible();

      pararConsole();
    });
  }
});
