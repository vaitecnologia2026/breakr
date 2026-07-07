// Fixtures — injetam os Page Objects prontos nos specs (POM + fixtures).
// Os specs importam `test`/`expect` daqui e recebem `loginPage`, `equipePage`,
// etc. já construídos, sem repetir `new XxxPage(page)` em cada arquivo.
// O PortalPage NÃO é fixture: ele roda em contexto ANÔNIMO (sem sessão), então
// é instanciado no próprio spec a partir de um page anônimo.
import { test as base, expect } from '@playwright/test';
import {
  LoginPage, NavPage, EquipePage, PlanosPage, SquadsPage,
  ClientesPage, EstrategiaPage, ConteudosPage, NpsPage,
} from './paginas';

type Paginas = {
  loginPage: LoginPage;
  navPage: NavPage;
  equipePage: EquipePage;
  planosPage: PlanosPage;
  squadsPage: SquadsPage;
  clientesPage: ClientesPage;
  estrategiaPage: EstrategiaPage;
  conteudosPage: ConteudosPage;
  npsPage: NpsPage;
};

export const test = base.extend<Paginas>({
  loginPage: async ({ page }, use) => { await use(new LoginPage(page)); },
  navPage: async ({ page }, use) => { await use(new NavPage(page)); },
  equipePage: async ({ page }, use) => { await use(new EquipePage(page)); },
  planosPage: async ({ page }, use) => { await use(new PlanosPage(page)); },
  squadsPage: async ({ page }, use) => { await use(new SquadsPage(page)); },
  clientesPage: async ({ page }, use) => { await use(new ClientesPage(page)); },
  estrategiaPage: async ({ page }, use) => { await use(new EstrategiaPage(page)); },
  conteudosPage: async ({ page }, use) => { await use(new ConteudosPage(page)); },
  npsPage: async ({ page }, use) => { await use(new NpsPage(page)); },
});

export { expect };
