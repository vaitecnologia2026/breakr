// Dados de teste e helpers compartilhados — espelham a seção "Dados de teste"
// do CHECKLIST-TESTES-BREAKR.html. Valores sintéticos (não são de produção).
import { Page, expect } from '@playwright/test';

// ─── Credenciais (via .env) ──────────────────────────────────────────────────
export const USUARIO = process.env.BREAKR_USUARIO ?? 'admin';
export const SENHA = process.env.BREAKR_SENHA ?? '';

// Sufixo único por execução — evita colidir com dados já criados quando os
// specs de ESCRITA rodam contra um ambiente que já tem "Squad Teste" etc.
export const STAMP = new Date().toISOString().slice(11, 19).replace(/:/g, '');

// ─── Dados do cliente-fio-condutor (Bloco de pré-requisitos) ─────────────────
export const CLIENTE = {
  nomeFantasia: `Pizzaria Teste ${STAMP}`,
  cnpj: '11.222.333/0001-44',
  tag: 'Restaurante',
  email: 'contato@pizzariateste.com',
  telefone: '(11) 98888-7777',
};
export const SQUAD = { nome: `Squad Teste ${STAMP}` };
export const PLANO = { nome: `Plano Teste Brava ${STAMP}`, valor: '2790' };

// Membros do squad por função (Bloco 1.3 / 3.3).
export const MEMBROS = [
  { nome: `CS Teste ${STAMP}`, email: `cs.${STAMP}@breakr.com`, cargo: 'CS', funcao: 'CS' },
  { nome: `Estrategista Teste ${STAMP}`, email: `estrategista.${STAMP}@breakr.com`, cargo: 'Estrategista', funcao: 'Estrategista' },
  { nome: `Copy Teste ${STAMP}`, email: `copy.${STAMP}@breakr.com`, cargo: 'Copywriter', funcao: 'Copywriter' },
  { nome: `Designer Teste ${STAMP}`, email: `designer.${STAMP}@breakr.com`, cargo: 'Designer', funcao: 'Designer' },
  { nome: `Trafego Teste ${STAMP}`, email: `trafego.${STAMP}@breakr.com`, cargo: 'Gestor de Tráfego', funcao: 'Tráfego' },
];

export const MIDIA_URL = 'https://picsum.photos/seed/breakrteste/900/700';

// ─── Helpers de navegação ────────────────────────────────────────────────────

// Clica num item do menu lateral pelo nome e confirma a troca de página.
export async function irPara(page: Page, item: string): Promise<void> {
  await page.getByRole('link', { name: item, exact: true }).first().click();
  await expect(page.getByRole('heading', { name: item }).first()).toBeVisible({ timeout: 15_000 });
}

// Falha o teste se o console do navegador registrar erros durante a navegação.
// Uso: const parar = capturarErrosConsole(page); ...; parar();
export function capturarErrosConsole(page: Page): () => void {
  const erros: string[] = [];
  const ouvir = (msg: import('@playwright/test').ConsoleMessage) => {
    if (msg.type() === 'error') erros.push(msg.text());
  };
  page.on('console', ouvir);
  return () => {
    page.off('console', ouvir);
    expect(erros, `Erros de console: ${erros.join(' | ')}`).toEqual([]);
  };
}
