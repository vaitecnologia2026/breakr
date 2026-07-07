// TESTES DE API (contrato REST, tags @api @leitura) — batem DIRETO na API HTTP,
// sem navegador, usando o cliente `request` embutido no Playwright. Rodam no
// projeto "api" (baseURL = API_URL). Fonte da verdade: apps/api (auth/health).
//
// SOMENTE LEITURA de negócio: nenhum endpoint que cria/edita/exclui entidade é
// chamado. O único efeito é o audit log inerente ao login (o mesmo que o
// global.setup já grava) — não cria dados de teste.
//
// Rodar só estes:  npx playwright test --project=api
import { test, expect } from '@playwright/test';

// Mesmas credenciais da suíte de UI (via .env). O identificador vai no campo "email".
const USUARIO = process.env.BREAKR_USUARIO ?? 'admin';
const SENHA = process.env.BREAKR_SENHA ?? '';

test.describe('@api @leitura Contrato da API (HTTP direto)', () => {
  test('GET /health responde 200 { status: "ok", ts }', async ({ request }) => {
    const r = await request.get('/health');
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.status).toBe('ok');
    expect(body.ts, 'timestamp ausente no health').toBeTruthy();
  });

  test('POST /auth/login com credenciais válidas retorna token + usuario', async ({ request }) => {
    const r = await request.post('/auth/login', { data: { email: USUARIO, senha: SENHA } });
    expect(r.status(), 'login válido deveria ser 200').toBe(200);
    const body = await r.json();
    expect(body.token, 'token ausente na resposta de login').toBeTruthy();
    expect(body.usuario?.id, 'usuario.id ausente na resposta').toBeTruthy();
    expect(body.usuario?.email, 'usuario.email ausente na resposta').toBeTruthy();
  });

  test('POST /auth/login com senha errada é 401 e NÃO vaza token', async ({ request }) => {
    const r = await request.post('/auth/login', {
      data: { email: USUARIO, senha: 'senha-errada-de-proposito-123' },
    });
    expect(r.status(), 'senha errada deveria ser 401').toBe(401);
    const body = await r.json().catch(() => ({}));
    expect(body.token, 'não pode retornar token com senha errada').toBeFalsy();
  });

  test('POST /auth/login rejeita campo extra (whitelist do ValidationPipe)', async ({ request }) => {
    const r = await request.post('/auth/login', {
      data: { email: USUARIO, senha: SENHA, campoNaoDeclarado: 'x' },
    });
    // forbidNonWhitelisted: true no main.ts → payload com campo extra é 400.
    expect(r.status(), 'campo não declarado deveria ser recusado (400)').toBe(400);
  });

  test('POST /auth/login valida senha curta (MinLength 6 no DTO)', async ({ request }) => {
    const r = await request.post('/auth/login', { data: { email: USUARIO, senha: '123' } });
    expect(r.status(), 'senha curta deveria falhar na validação (400)').toBe(400);
  });

  test('GET /auth/acessos SEM token é 401 (rota protegida por JWT)', async ({ request }) => {
    const r = await request.get('/auth/acessos');
    expect(r.status(), 'rota protegida sem token deveria ser 401').toBe(401);
  });

  test('GET /auth/acessos COM token de admin retorna a auditoria (array)', async ({ request }) => {
    const login = await request.post('/auth/login', { data: { email: USUARIO, senha: SENHA } });
    expect(login.status()).toBe(200);
    const { token } = await login.json();
    const r = await request.get('/auth/acessos', { headers: { Authorization: `Bearer ${token}` } });
    expect(r.status(), 'admin autenticado deveria ler /auth/acessos').toBe(200);
    expect(Array.isArray(await r.json()), 'acessos deveria ser um array').toBeTruthy();
  });
});
