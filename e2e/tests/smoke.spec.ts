// SMOKE — abre cada página do menu (autenticado como admin) e verifica que
// carrega sem erro de console e sem cair no /login. Independe de dados, então é
// o teste mais barato e o que mais pega regressão (tela branca, crash, 500).
import { test, expect } from '@playwright/test';
import { capturarErrosConsole } from './util/dados';

// (rota, título esperado no cabeçalho da página).
const PAGINAS: Array<[string, string]> = [
  ['/', 'Olá'],
  ['/inbox', 'Inbox'],
  ['/comunicados', 'Comunicados'],
  ['/clientes', 'Clientes'],
  ['/onboarding', 'Onboarding'],
  ['/planos', 'Planos'],
  ['/financeiro', 'Financeiro'],
  ['/conteudos', 'Conteúdo'],
  ['/painel-designer', 'Painel do designer'],
  ['/estrategia', 'Estratégia'],
  ['/qualidade', 'Qualidade'],
  ['/trafego', 'Tráfego'],
  ['/squads', 'Squads'],
  ['/agenda', 'Agenda'],
  ['/automacoes', 'Automações'],
  ['/atendimento', 'Atendimento'],
  ['/nps-cliente', 'NPS'],
  ['/pesquisas', 'Pesquisas'],
  ['/chat', 'Chat'],
  ['/equipe', 'Equipe'],
  ['/configuracoes', 'Configurações'],
];

test.describe('@smoke @leitura Todas as páginas carregam', () => {
  for (const [rota, titulo] of PAGINAS) {
    test(`abre ${rota} sem erro`, async ({ page }) => {
      const pararConsole = capturarErrosConsole(page);
      const resposta = await page.goto(rota, { waitUntil: 'domcontentloaded' });

      // Não pode ter sido redirecionado para o login (sessão viva).
      await expect(page).not.toHaveURL(/\/login/);
      // O status HTTP do documento não pode ser 4xx/5xx.
      expect(resposta?.status(), `HTTP de ${rota}`).toBeLessThan(400);
      // Algum texto do título aparece (a página realmente renderizou).
      await expect(page.getByText(titulo, { exact: false }).first()).toBeVisible();

      pararConsole();
    });
  }
});
