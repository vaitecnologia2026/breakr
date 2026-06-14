# Deploy — Breakr OS

O sistema tem 3 peças: **API** (NestJS, porta 3000), **Postgres** (banco) e **Web**
(SPA Vite, estático). Redis é opcional (o motor degrada sem ele). O admin é criado
automaticamente no primeiro boot (`admin@breakr.com` / `breakr123` — **troque depois**).

> ⚠️ Estes artefatos foram escritos sem Docker disponível localmente p/ testar —
> a validação real acontece no build do alvo (vamos iterar pelos logs).

---

## Opção A — VPS com Docker (mais self-contained)
Pré: uma VPS (ex.: `38.52.128.142`), Docker + Docker Compose, e um subdomínio
apontando pra ela (ex.: `breakr.vai-sistema.com` → web, `api.breakr...` → API).

```bash
git clone <repo> && cd breakr-os
cp .env.prod.example .env      # preencha JWT_SECRET, CORS_ORIGIN, VITE_API_URL...
docker compose -f docker-compose.prod.yml up -d --build
```
- Web sobe na :8080, API na :3000 → coloque um **nginx/Caddy** na frente com TLS
  roteando o subdomínio do front → :8080 e o da API → :3000.
- Popular dados (uma vez):
  ```bash
  docker compose -f docker-compose.prod.yml exec api npm run seed:demo
  # ou importar do ClickUp:
  docker compose -f docker-compose.prod.yml exec -e CLICKUP_TOKEN=pk_... api npm run import:clickup
  ```

## Opção B — Railway (mais rápido)
1. Crie um projeto no Railway e adicione um **PostgreSQL** (plugin).
2. **API**: novo serviço a partir do repo, root = repo; usa `apps/api/Dockerfile`.
   Variáveis: `DATABASE_URL` (do plugin), `JWT_SECRET`, `JWT_EXPIRES=1d`,
   `API_PORT=3000`, `CORS_ORIGIN=<url do front>`. (Opcional: `REDIS_URL`.)
3. **Web**: outro serviço com `apps/web/Dockerfile` e build-arg
   `VITE_API_URL=<url pública da API>`.
4. Gere os domínios públicos dos 2 serviços.

## Opção C — Vercel (web) + Railway/Neon (API + Postgres)  ← combo recomendado
- **API + Postgres** no Railway como na Opção B (só os 2 serviços de back).
- **Web** na Vercel: **importe o repo** — o `vercel.json` (na raiz) já configura o
  build do monorepo (`npm run build --workspace @breakr/web` → `apps/web/dist`) e o
  fallback de rota SPA (`/(.*) → /index.html`). Só adicione a env **`VITE_API_URL`**
  = a URL pública da API (Railway). Deploy → domínio do front.
- Lembre de pôr o domínio do front no `CORS_ORIGIN` da API.

---

## Pós-deploy (qualquer opção)
- Trocar a senha do admin / criar usuários reais por cargo.
- Rodar `import:clickup` com um token do ClickUp p/ trazer a carteira real.
- Ligar integrações reais (ASAAS/Speed/Autentique/WhatsApp/Meta) quando houver
  credenciais — hoje em STUB (ver `apps/api/src/integracoes`).
- Configurar a IA em **/configuracoes** (chave OpenAI/Anthropic/Gemini).

## O que eu (Claude) preciso pra executar o deploy por você
- **Railway/Vercel:** um **token** de API (ou você cria o projeto e me dá acesso ao CLI).
- **VPS:** **acesso SSH** (chave) + qual **subdomínio** usar.
Com isso eu subo, valido pelos logs e te entrego o link.
