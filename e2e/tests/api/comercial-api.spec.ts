// CONTRATO da API do COMERCIAL (tags @api @leitura) — os endpoints que as telas
// NOVAS do menu COMERCIAL consomem para se comunicar com o resto do sistema.
// Bate DIRETO na API (sem navegador), projeto "api" (baseURL = API_URL).
//
// SOMENTE LEITURA de negócio: apenas GET; nenhum POST/PATCH que cria/edita/
// exclui entidade. O único efeito é o audit log do login (igual ao global.setup).
//
// Rodar só estes:  npx playwright test --project=api tests/api/comercial-api.spec.ts
import { test, expect } from '@playwright/test';

const USUARIO = process.env.BREAKR_USUARIO ?? 'admin';
const SENHA = process.env.BREAKR_SENHA ?? '';

test.describe('@api @leitura Contrato COMERCIAL (Leads + Atividades)', () => {
  test('GET /comercial/leads SEM token é 401 (rota protegida por JWT)', async ({ request }) => {
    const r = await request.get('/comercial/leads');
    expect(r.status(), 'leads sem token deveria ser 401').toBe(401);
  });

  test('GET /comercial/atividades SEM token é 401 (rota protegida por JWT)', async ({ request }) => {
    const r = await request.get('/comercial/atividades');
    expect(r.status(), 'atividades sem token deveria ser 401').toBe(401);
  });

  test('GET /comercial/leads COM token retorna a lista (array)', async ({ request }) => {
    const login = await request.post('/auth/login', { data: { email: USUARIO, senha: SENHA } });
    expect(login.status(), 'login deveria ser 200').toBe(200);
    const { token } = await login.json();
    const r = await request.get('/comercial/leads', { headers: { Authorization: `Bearer ${token}` } });
    expect(r.status(), 'admin autenticado deveria ler /comercial/leads').toBe(200);
    expect(Array.isArray(await r.json()), 'leads deveria ser um array').toBeTruthy();
  });

  test('GET /comercial/atividades COM token retorna a lista (array)', async ({ request }) => {
    const login = await request.post('/auth/login', { data: { email: USUARIO, senha: SENHA } });
    expect(login.status(), 'login deveria ser 200').toBe(200);
    const { token } = await login.json();
    const r = await request.get('/comercial/atividades', { headers: { Authorization: `Bearer ${token}` } });
    expect(r.status(), 'admin autenticado deveria ler /comercial/atividades').toBe(200);
    expect(Array.isArray(await r.json()), 'atividades deveria ser um array').toBeTruthy();
  });
});
