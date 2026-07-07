// FLUXOS DE ESCRITA (tag @escrita) — criam/editam/excluem dados de verdade,
// simulando o usuário real. Cobrem os ajustes RECENTES do checklist (Equipe
// realtime, plano duplicado, squad criar/excluir, cliente). Agora via POM.
//
// ⚠️ ESCREVEM NO BANCO DO AMBIENTE ALVO. Prefira LOCAL/STAGING (BASE_URL local).
// Rodar só estes:  npm run test:escrita
import { test, expect } from './pages/fixtures';
import { CLIENTE, SQUAD, PLANO, MEMBROS } from './util/dados';

test.describe.serial('@escrita Fluxos ponta a ponta (dados reais)', () => {
  // Bloco 1.2 ★ — novo usuário aparece na lista SEM recarregar a página.
  test('1.2 Equipe: novo usuário aparece em realtime (sem F5)', async ({ equipePage }) => {
    const m = MEMBROS[3]; // Designer Teste
    await equipePage.abrir();
    await equipePage.criarUsuario({ nome: m.nome, email: m.email, senha: 'Teste@123', cargo: 'Designer' });
    await expect(equipePage.sucesso()).toBeVisible({ timeout: 10_000 });
    await expect(equipePage.usuario(m.nome)).toBeVisible();
  });

  // Bloco 2.2 ★ — nome de plano duplicado é recusado com mensagem clara.
  test('2.2 Planos: nome duplicado é recusado (não erro genérico)', async ({ planosPage }) => {
    await planosPage.abrir();
    await planosPage.criarPlano(PLANO.nome, PLANO.valor);
    await expect(planosPage.plano(PLANO.nome)).toBeVisible({ timeout: 10_000 });
    await planosPage.criarPlano(PLANO.nome, PLANO.valor); // segundo, mesmo nome
    await expect(planosPage.erroDuplicado()).toBeVisible();
  });

  // Bloco 3.2 / 3.4 — cria o squad e depois o exclui.
  test('3.2/3.4 Squads: criar e excluir', async ({ squadsPage }) => {
    await squadsPage.abrir();
    await squadsPage.criarSquad(SQUAD.nome);
    await expect(squadsPage.card(SQUAD.nome)).toBeVisible({ timeout: 10_000 });
    await squadsPage.excluir(SQUAD.nome);
    await expect(squadsPage.card(SQUAD.nome)).toHaveCount(0, { timeout: 10_000 });
  });

  // Bloco 4.2 — cadastra o cliente de teste.
  test('4.2 Clientes: cadastrar o cliente de teste', async ({ clientesPage }) => {
    await clientesPage.abrir();
    await clientesPage.novoCliente({
      nome: CLIENTE.nomeFantasia, cnpj: CLIENTE.cnpj, tag: CLIENTE.tag,
      email: CLIENTE.email, telefone: CLIENTE.telefone,
    });
    await expect(clientesPage.linha(CLIENTE.nomeFantasia)).toBeVisible({ timeout: 10_000 });
  });

  // Bloco 4.x — a UI bloqueia cadastro inválido: nome vazio => "Cadastrar" desabilitado.
  test('4.x Clientes: cadastro exige nome (botão desabilitado)', async ({ clientesPage }) => {
    await clientesPage.abrir();
    await clientesPage.botaoNovo().click();
    await expect(clientesPage.botaoCadastrar()).toBeDisabled();
  });
});
