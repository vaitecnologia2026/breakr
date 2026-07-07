// Page Objects — cada classe encapsula os SELETORES e AÇÕES de uma tela.
// Sem assertions de teste e sem dados aqui (isso fica nos specs). Seletores
// acessíveis (getByRole/Label/Placeholder), espelhando os rótulos reais das telas.
import { Page, Locator, expect } from '@playwright/test';

// ─── Login ───────────────────────────────────────────────────────────────────
export class LoginPage {
  constructor(private readonly page: Page) {}
  async abrir() { await this.page.goto('/login'); }
  async entrar(usuario: string, senha: string) {
    await this.page.locator('#usuario').fill(usuario);
    await this.page.locator('#senha-input').fill(senha);
    await this.page.getByRole('button', { name: 'Entrar' }).click();
  }
  linkDashboard(): Locator { return this.page.getByRole('link', { name: 'Dashboard' }); }
  alertaErro(): Locator { return this.page.getByRole('alert'); }
}

// ─── Navegação lateral / RBAC ────────────────────────────────────────────────
export class NavPage {
  constructor(private readonly page: Page) {}
  link(nome: string): Locator { return this.page.getByRole('link', { name: nome, exact: true }); }
  async ir(rota: string) { return this.page.goto(rota, { waitUntil: 'domcontentloaded' }); }
}

// ─── Equipe ──────────────────────────────────────────────────────────────────
export class EquipePage {
  constructor(private readonly page: Page) {}
  async abrir() { await this.page.goto('/equipe'); }
  async criarUsuario(m: { nome: string; email: string; senha: string; cargo?: string }) {
    await this.page.getByRole('button', { name: '+ Novo usuário' }).click();
    await this.page.getByPlaceholder('Ex: Maria Silva').fill(m.nome);
    await this.page.getByPlaceholder('usuario@breakr.com').fill(m.email);
    await this.page.getByPlaceholder('Mínimo 8 caracteres').fill(m.senha);
    if (m.cargo) await this.page.getByLabel('Cargo').selectOption({ label: m.cargo });
    await this.page.getByRole('button', { name: 'Criar usuário' }).click();
  }
  usuario(nome: string): Locator { return this.page.getByText(nome).first(); }
  sucesso(): Locator { return this.page.getByText('Usuário criado com sucesso.'); }
}

// ─── Planos ──────────────────────────────────────────────────────────────────
export class PlanosPage {
  constructor(private readonly page: Page) {}
  async abrir() { await this.page.goto('/planos'); }
  async criarPlano(nome: string, valor: string) {
    await this.page.getByRole('button', { name: '+ Novo plano' }).click();
    await this.page.getByPlaceholder('Ex.: Brava').fill(nome);
    await this.page.getByPlaceholder('2790.00').fill(valor);
    await this.page.getByRole('button', { name: 'Salvar' }).click();
  }
  plano(nome: string): Locator { return this.page.getByText(nome).first(); }
  erroDuplicado(): Locator { return this.page.getByText(/já existe|existe um plano/i); }
}

// ─── Squads ──────────────────────────────────────────────────────────────────
export class SquadsPage {
  constructor(private readonly page: Page) {}
  async abrir() { await this.page.goto('/squads'); }
  async criarSquad(nome: string) {
    await this.page.getByRole('button', { name: '+ Novo squad' }).click();
    await this.page.getByPlaceholder('Ex.: Squad Fênix').fill(nome);
    await this.page.getByRole('button', { name: 'Criar squad' }).click();
  }
  card(nome: string): Locator { return this.page.locator('article').filter({ hasText: nome }); }
  async adicionarMembro(squadNome: string, usuarioNome: string, funcao: string) {
    const card = this.card(squadNome);
    await card.locator('select').nth(0).selectOption({ label: usuarioNome });
    await card.locator('select').nth(1).selectOption({ label: funcao });
    await card.getByRole('button', { name: '+ Add' }).click();
  }
  async excluir(nome: string) {
    this.page.once('dialog', (d) => d.accept());
    await this.card(nome).getByRole('button', { name: 'Excluir' }).click();
  }
}

// ─── Clientes ────────────────────────────────────────────────────────────────
export class ClientesPage {
  constructor(private readonly page: Page) {}
  async abrir() { await this.page.goto('/clientes'); }
  botaoNovo(): Locator { return this.page.getByRole('button', { name: '+ Novo cliente' }); }
  botaoCadastrar(): Locator { return this.page.getByRole('button', { name: 'Cadastrar' }); }
  async novoCliente(c: {
    nome: string; cnpj?: string; tag?: string; email?: string; telefone?: string; plano?: string; squad?: string;
  }) {
    await this.botaoNovo().click();
    await this.page.getByPlaceholder('Ex.: Estúdio Aurora').fill(c.nome);
    if (c.cnpj) await this.page.getByPlaceholder(/00\.000\.000\/0000-00/).fill(c.cnpj);
    if (c.tag) await this.page.getByPlaceholder(/Premium, Inbound/).fill(c.tag);
    if (c.email) await this.page.getByPlaceholder(/contato@restaurante\.com/).fill(c.email);
    if (c.telefone) await this.page.getByPlaceholder(/\(11\) 99999-9999/).fill(c.telefone);
    if (c.plano) await this.page.getByLabel('Plano').selectOption({ label: c.plano });
    if (c.squad) await this.page.getByLabel('Squad').selectOption({ label: c.squad });
    await this.botaoCadastrar().click();
  }
  linha(nome: string): Locator { return this.page.locator('tr').filter({ hasText: nome }); }
  async codigoPortal(nome: string): Promise<string> {
    const href = await this.linha(nome).getByRole('link', { name: 'Portal' }).getAttribute('href');
    return (href ?? '').split('/portal/')[1];
  }
}

// ─── Estratégia ──────────────────────────────────────────────────────────────
export class EstrategiaPage {
  constructor(private readonly page: Page) {}
  async abrir() { await this.page.goto('/estrategia'); }
  async criar(cliente: string, titulo: string, descricao: string) {
    await this.page.locator('select').first().selectOption({ label: cliente });
    await this.page.getByPlaceholder(/Título da estratégia/).fill(titulo);
    await this.page.getByPlaceholder(/Descreva a estratégia/).fill(descricao);
    await this.page.getByRole('button', { name: 'Criar rascunho' }).click();
  }
  card(titulo: string): Locator { return this.page.locator('.brk-card').filter({ hasText: titulo }); }
  async enviar(titulo: string) { await this.card(titulo).getByRole('button', { name: 'Enviar ao cliente' }).click(); }
}

// ─── Conteúdo (funil) ────────────────────────────────────────────────────────
export class ConteudosPage {
  constructor(private readonly page: Page) {}
  async abrir() { await this.page.goto('/conteudos'); }
  async novaPeca(cliente: string, titulo: string) {
    await this.page.getByRole('button', { name: '+ Nova peça' }).click();
    await this.page.getByLabel('Cliente').selectOption({ label: cliente });
    await this.page.getByPlaceholder(/bastidores da cozinha/).fill(titulo);
    await this.page.getByRole('button', { name: 'Criar peça' }).click();
  }
  labelSquad(squad: string): Locator { return this.page.getByText(`Squad: ${squad}`); }
  async filtrarCliente(nome: string) {
    await this.page.locator('select.brk-select-filtro').selectOption({ label: nome });
  }
  peca(titulo: string): Locator { return this.page.getByText(titulo).first(); }
  seletorMover(titulo: string): Locator { return this.page.getByLabel(`Mover peça ${titulo}`); }
  async mover(titulo: string, statusLabel: string) {
    await this.seletorMover(titulo).selectOption({ label: statusLabel });
  }
  async anexarMidia(url: string) {
    await this.page.getByRole('button', { name: '🎬 Anexar mídia' }).click();
    await this.page.getByPlaceholder('URL da imagem/vídeo…').fill(url);
    await this.page.getByRole('button', { name: 'Salvar mídia' }).click();
  }
  botaoEditarMidia(): Locator { return this.page.getByRole('button', { name: '🎬 Editar mídia' }); }
  async encaminharDesign() { await this.page.getByRole('button', { name: 'Encaminhar p/ design →' }).click(); }
}

// ─── NPS ─────────────────────────────────────────────────────────────────────
export class NpsPage {
  constructor(private readonly page: Page) {}
  async abrir() { await this.page.goto('/nps-cliente'); }
  titulo(): Locator { return this.page.getByText('Registrar NPS'); }
  async registrar(cliente: string, nota: string, comentario?: string) {
    await this.page.locator('select').nth(0).selectOption({ label: cliente });
    await this.page.locator('select').nth(1).selectOption(nota);
    if (comentario) await this.page.getByPlaceholder(/Comentário/).fill(comentario);
    await this.page.getByRole('button', { name: 'Registrar' }).click();
  }
  sucesso(): Locator { return this.page.getByText('NPS registrado.'); }
}

// ─── Portal do cliente (anônimo) ─────────────────────────────────────────────
// Recebe um `page` de contexto anônimo (sem sessão) — instanciado no spec.
export class PortalPage {
  constructor(private readonly page: Page) {}
  async abrir(codigo: string) { await this.page.goto(`/portal/${codigo}`); }
  ola(): Locator { return this.page.getByText(/Olá,/i).first(); }
  async aprovarEstrategia() { await this.page.getByRole('button', { name: 'Aprovar estratégia' }).click(); }
  cardEstrategia(): Locator { return this.page.getByText('Estratégia para aprovar'); }
  cardPeca(titulo: string): Locator { return this.page.locator('li').filter({ hasText: titulo }); }
  imagemPeca(titulo: string): Locator { return this.cardPeca(titulo).locator('img').first(); }
  async avaliarEAprovar(titulo: string) {
    const card = this.cardPeca(titulo);
    await card.getByRole('radio', { name: '5 estrelas' }).first().click();
    await card.getByRole('button', { name: 'Aprovar', exact: true }).click();
  }
  // Utilitário: confirma que toda imagem visível carregou (regressão de mídia quebrada).
  async imagensCarregaram(): Promise<number> {
    const imgs = this.page.locator('img');
    const total = await imgs.count();
    let visiveis = 0;
    for (let i = 0; i < total; i++) {
      const img = imgs.nth(i);
      if (!(await img.isVisible())) continue;
      visiveis++;
      const ok = await img.evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0);
      expect(ok, `Imagem ${i} do portal não carregou`).toBeTruthy();
    }
    return visiveis;
  }
}
