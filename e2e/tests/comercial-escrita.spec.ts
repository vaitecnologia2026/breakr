// JORNADA DE ESCRITA do COMERCIAL (tags @escrita @jornada) — ponta a ponta:
// cria uma atividade na tela /atividades e valida que ela aparece nas OUTRAS
// funções que leem os mesmos dados: "Atividades de Hoje" no Meu Painel e a
// tabela de Atividades em Métricas. Prova a comunicação real entre as telas.
//
// ⚠️ ESCREVE NO BANCO DO AMBIENTE ALVO (cria 1 atividade "QA Atividade <STAMP>"
// com vencimento HOJE). O módulo AtividadeComercial não tem DELETE — o registro
// permanece (pode ser Concluído na UI). Título carimbado para ser identificável.
// Rodar:  npx playwright test --project=autenticado tests/comercial-escrita.spec.ts
import { test, expect } from './pages/fixtures';
import { AtividadesPage } from './pages/paginas';
import { STAMP } from './util/dados';

test.describe.serial('@escrita @jornada Atividade ponta a ponta (Meu Painel + Métricas)', () => {
  const titulo = `QA Atividade ${STAMP}`;

  // Vencimento HOJE ao meio-dia (para cair em "Atividades de Hoje" do Meu Painel,
  // que filtra por status PENDENTE + vencimento no dia atual). Meio-dia dá margem
  // folgada contra diferença de fuso na virada do dia.
  const agora = new Date();
  const venc = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}T12:00`;

  test('cria a atividade e ela aparece na lista de Atividades', async ({ page }) => {
    const atividades = new AtividadesPage(page);
    await atividades.abrir();
    await atividades.novaAtividade({ titulo, tipo: 'Ligação', vencimento: venc });
    await expect(atividades.card(titulo)).toBeVisible({ timeout: 15_000 });
  });

  test('a atividade aparece em "Atividades de Hoje" no Meu Painel', async ({ page }) => {
    await page.goto('/meu-painel', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(titulo).first()).toBeVisible({ timeout: 15_000 });
  });

  test('a atividade aparece na tabela de Atividades em Métricas', async ({ page }) => {
    await page.goto('/metricas', { waitUntil: 'domcontentloaded' });
    // Abre um relatório cuja entidade é "Atividades" (renderiza a tabela de atividades).
    await page.getByText('Mix de Atividades', { exact: true }).first().click();
    await expect(page.getByText(titulo).first()).toBeVisible({ timeout: 15_000 });
  });
});
