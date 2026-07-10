// Validação da feature "Perfis de acesso" (Rodada 64/65) — o que cada perfil vê.
// Projeto "api" (sem navegador). Duas partes:
//  1) UNIT da lógica PURA de permissão (importa apps/web/src/lib/permissoes.ts) —
//     prova determinística das regras (menus, rotas e blocos), incluindo a
//     compatibilidade (admin/sem perfil = vê tudo) e o opt-in por categoria.
//  2) CONTRATO da API (@leitura) — GET /perfis e GET /usuarios/me devolvem os
//     campos que o front usa (perfilId + permissoes). SOMENTE LEITURA (só GET).
import { test, expect } from '@playwright/test';
import {
  veTudo,
  podeVerMenu,
  rotaPermitida,
  podeVerBloco,
  ROTAS_SEMPRE_LIBERADAS,
} from '../../../apps/web/src/lib/permissoes';

// Helpers de usuário sintético (formato UsuarioPublico; cast p/ evitar dep de tipos).
const u = (over: Record<string, unknown>) =>
  ({ id: 'x', nome: 'x', email: 'x@x', cargo: 'CS', ...over } as any);

test.describe('@leitura Perfis de acesso — lógica pura (veTudo/menu/rota/bloco)', () => {
  test('veTudo: admin, superadmin, sem perfil e usuário nulo veem tudo', () => {
    expect(veTudo(u({ cargo: 'ADMIN', perfilId: 'p1' }))).toBe(true);
    expect(veTudo(u({ cargo: 'SUPERADMIN', perfilId: 'p1' }))).toBe(true);
    expect(veTudo(u({ cargo: 'CS', perfilId: null }))).toBe(true);
    expect(veTudo(u({ cargo: 'CS' }))).toBe(true); // perfilId ausente
    expect(veTudo(null)).toBe(true);
  });

  test('veTudo: usuário comum COM perfil NÃO vê tudo', () => {
    expect(veTudo(u({ cargo: 'CS', perfilId: 'p1', permissoes: ['/comercial'] }))).toBe(false);
  });

  test('podeVerMenu: perfil restrito só vê os menus liberados (+ sempre-liberadas)', () => {
    const usr = u({ cargo: 'CS', perfilId: 'p1', permissoes: ['/comercial', '/meu-painel'] });
    expect(podeVerMenu(usr, '/comercial')).toBe(true);
    expect(podeVerMenu(usr, '/meu-painel')).toBe(true);
    expect(podeVerMenu(usr, '/financeiro')).toBe(false);
    expect(podeVerMenu(usr, '/equipe')).toBe(false);
    // Rotas sempre liberadas (evita lockout):
    for (const r of ROTAS_SEMPRE_LIBERADAS) expect(podeVerMenu(usr, r)).toBe(true);
    // Admin vê qualquer menu:
    expect(podeVerMenu(u({ cargo: 'ADMIN', perfilId: 'p1' }), '/financeiro')).toBe(true);
  });

  test('rotaPermitida: sub-rotas herdam do pai e "/" é sempre liberada', () => {
    const usr = u({ cargo: 'CS', perfilId: 'p1', permissoes: ['/contatos'] });
    expect(rotaPermitida(usr, '/contatos')).toBe(true);
    expect(rotaPermitida(usr, '/contatos/pessoas')).toBe(true); // startsWith pai
    expect(rotaPermitida(usr, '/financeiro')).toBe(false);
    expect(rotaPermitida(usr, '/')).toBe(true);
    expect(rotaPermitida(usr, '/perfil')).toBe(true);
    // Pai liberado se houver permissão filha:
    const usr2 = u({ cargo: 'CS', perfilId: 'p1', permissoes: ['/contatos/pessoas'] });
    expect(rotaPermitida(usr2, '/contatos')).toBe(true);
  });

  test('podeVerBloco: opt-in por categoria (categoria sem marca = mostra tudo)', () => {
    // Perfil que só configurou blocos do "meu-painel":
    const usr = u({ cargo: 'CS', perfilId: 'p1', permissoes: ['/meu-painel', 'bloco:painel:kpis'] });
    // Categoria meu-painel CONFIGURADA → só o marcado aparece:
    expect(podeVerBloco(usr, 'meu-painel', 'bloco:painel:kpis')).toBe(true);
    expect(podeVerBloco(usr, 'meu-painel', 'bloco:painel:parados')).toBe(false);
    // Categoria "inicio" NÃO configurada → mostra tudo (opt-in):
    expect(podeVerBloco(usr, 'inicio', 'bloco:inicio:kpis')).toBe(true);
    expect(podeVerBloco(usr, 'inicio', 'bloco:inicio:csat')).toBe(true);
    // Categoria "metricas" NÃO configurada → mostra tudo:
    expect(podeVerBloco(usr, 'metricas', 'bloco:metricas:Geral')).toBe(true);
  });

  test('podeVerBloco: perfil sem NENHUM bloco vê todos os blocos (compat)', () => {
    const usr = u({ cargo: 'CS', perfilId: 'p1', permissoes: ['/comercial'] });
    expect(podeVerBloco(usr, 'meu-painel', 'bloco:painel:kpis')).toBe(true);
    expect(podeVerBloco(usr, 'inicio', 'bloco:inicio:meu-dia')).toBe(true);
    expect(podeVerBloco(usr, 'metricas', 'bloco:metricas:meu-painel')).toBe(true);
  });

  test('podeVerBloco: admin e sem perfil sempre veem qualquer bloco', () => {
    expect(podeVerBloco(u({ cargo: 'ADMIN', perfilId: 'p1' }), 'meu-painel', 'bloco:painel:parados')).toBe(true);
    expect(podeVerBloco(u({ cargo: 'CS', perfilId: null }), 'metricas', 'bloco:metricas:Negociação')).toBe(true);
  });
});

// ── Contrato da API (SOMENTE LEITURA) ───────────────────────────────────────
const USUARIO = process.env.BREAKR_USUARIO ?? 'admin';
const SENHA = process.env.BREAKR_SENHA ?? '';

async function logar(request: import('@playwright/test').APIRequestContext): Promise<string> {
  const r = await request.post('/auth/login', { data: { email: USUARIO, senha: SENHA } });
  expect(r.ok(), 'login deveria retornar 2xx').toBeTruthy();
  const body = await r.json();
  return body.token as string;
}

test.describe('@api @leitura Contrato Perfis de acesso', () => {
  test('GET /perfis SEM token é 401 (rota protegida)', async ({ request }) => {
    const r = await request.get('/perfis');
    expect(r.status(), 'perfis sem token deveria ser 401').toBe(401);
  });

  test('GET /perfis COM token retorna lista (array)', async ({ request }) => {
    test.skip(!SENHA, 'BREAKR_SENHA não definido no .env do e2e');
    const token = await logar(request);
    const r = await request.get('/perfis', { headers: { Authorization: `Bearer ${token}` } });
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(Array.isArray(body), 'perfis deveria ser um array').toBeTruthy();
  });

  test('GET /usuarios/me expõe perfilId + permissoes (usado pelo front)', async ({ request }) => {
    test.skip(!SENHA, 'BREAKR_SENHA não definido no .env do e2e');
    const token = await logar(request);
    const r = await request.get('/usuarios/me', { headers: { Authorization: `Bearer ${token}` } });
    expect(r.status()).toBe(200);
    const me = await r.json();
    expect(me).toHaveProperty('perfilId'); // pode ser null
    expect(me).toHaveProperty('permissoes');
    expect(Array.isArray(me.permissoes), 'permissoes deveria ser um array').toBeTruthy();
  });
});
