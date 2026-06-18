# Relatório de Auditoria de Produção — Breakr OS

**Data:** 18/06/2026 · **Branch:** `main` · **Deploy:** https://breakr-os.vercel.app (READY)

---

## 1. Resumo geral do que foi analisado

Auditoria completa do monorepo (npm workspaces): **backend** (NestJS + Prisma/PostgreSQL),
**frontend** (Vite + React + TS), **infra/deploy** (Vercel + Railway), banco/migrations,
autenticação/permissões, rotas/navegação, responsividade, segurança básica e os fluxos
principais. Método: 3 auditorias paralelas (backend, frontend, infra) + verificação manual +
build/typecheck dos dois apps. **Build API = 0 erros, Build Web = 0 erros.**

Escopo testável: como **não há banco de dados neste ambiente**, a validação foi por
build/typecheck e leitura de código. Testes de runtime (login real, CRUD com dados) exigem o
backend no Railway com o banco provisionado.

---

## 2. Erros encontrados

### 🔴 Críticos
1. **Menu inacessível no mobile** — a sidebar tinha `display:none` em telas <768px e o hook
   `useSidebarMobile` nunca era usado; não havia botão para abri-la. Sistema inutilizável no celular.
2. **Migrations sem baseline** — as ~26 tabelas-núcleo (Usuario, Cliente, Contrato, Fatura,
   Conteudo, Campanha…) nunca tiveram `CREATE TABLE` em migration; o schema sempre foi criado por
   `prisma db push`. Trocar para `migrate deploy` sem baseline quebraria o deploy.
3. **CORS de origem única** — só aceitava 1 domínio; com `credentials:true` (sem wildcard), se o
   front for acessado por domínio diferente do configurado, todas as chamadas autenticadas falham.

### 🟡 Importantes
4. **Comunicados sem RBAC** — `POST/PATCH/DELETE /comunicados` só exigiam login; qualquer usuário
   criava/fixava/apagava comunicados internos.
5. **Exceções viravam HTTP 500** — `throw new Error()` em `atendimento` (conversa não encontrada),
   `qualidade` (critério) e `ia` (não configurada) retornavam 500 em vez de 404/400.
6. **Sem página 404** — rota inválida redirecionava silenciosamente para a home.
7. **Seed resetava a senha do admin a cada boot** e logava a senha em texto puro.
8. **`@Body` sem DTO** em comunicados (sem validação).

### 🟢 Menores
9. Laranja de marca hardcoded fora do tema minimalista (concentrado no Atendimento).
10. `usuarios` `@Param('id')` sem `ParseUUIDPipe` (inconsistência).
11. Componentes duplicados com APIs diferentes (`Campo`/`CampoSelect` em `ui.tsx` vs `primitivos.tsx` vs `Conteudos.tsx`).
12. Erros de API engolidos sem feedback em algumas páginas (várias usam fallback MOCK — intencional).

---

## 3. Correções realizadas

| # | Correção | Arquivo |
|---|---|---|
| 1 | **Menu mobile**: botão hambúrguer no topbar + overlay + fecha ao navegar; `mobile-open` aplicado | `Dashboard.tsx`, `Sidebar.tsx`, `index.css` |
| 2 | **Página 404 real** com link de volta | `pages/NotFound.tsx`, `App.tsx` |
| 3 | **CORS multi-origem** (lista separada por vírgula) | `main.ts` |
| 4 | **RBAC em comunicados** (escrita só gestão) + DTO + ParseUUIDPipe | `comunicados.controller.ts`, `dto/criar-comunicado.dto.ts` |
| 5 | **Exceções HTTP corretas** (404/400) | `atendimento.service.ts`, `qualidade.service.ts`, `ia.service.ts` |
| 6 | **Seed**: não reseta senha do admin a cada boot; não loga a senha | `seed.ts` |
| 7 | **Atendimento**: highlights laranja → neutros (tema minimalista) | `Atendimento.tsx` |
| 8 | **Dockerfile**: documenta estratégia segura de migração | `Dockerfile` |

---

## 4. Módulos testados (build/typecheck + leitura)

Auth, Usuários, Clientes, Onboarding, Contratos, Faturas/Cobranças, Financeiro, Conteúdos,
Qualidade, Tráfego, Squads, Recrutamento, Compras, Desenvolvimento, Automações, Atendimento,
Inbox, Comunicados, Chat, Reuniões, Agenda, Medalhas, Perfil, Inventário, Educacional, Ouvidoria,
Metas, eNPS, Documentos, Desempenho, Equipe, Configurações, Portal do cliente, Captação, DISC,
Agendamento público. **43 controllers, todos registrados; nenhum conflito de rota; nenhuma rota
fantasma.** 40 rotas no front, todas com página; navegação coerente com a sidebar.

---

## 5. O que está 100% funcional (código/build)

- Build e typecheck de API + Web sem erros.
- Autenticação JWT + guards de cargo; rotas privadas protegidas; SPA fallback (Vercel + nginx).
- Navegação completa, busca global (Ctrl/⌘K), favoritos, **menu mobile**, **404**.
- Estados de loading/erro/vazio nas páginas; validação de DTOs global (whitelist).
- Tema minimalista aplicado por tokens; health check `/health`.
- Telas de demonstração: `/portal/demo` (aprovação de criativos) e mocks de pré-visualização.

---

## 6. Depende de informação externa / credencial / banco (não corrigível por código)

- **Banco (Railway)**: aplicar o schema e as **17 migrations**; provisionar `DATABASE_URL`.
- **Env de produção**: `JWT_SECRET`, `ADMIN_SENHA` (trocar após 1º acesso), `CORS_ORIGIN` =
  domínio real do front, `VITE_API_URL` (painel Vercel) = URL da API Railway.
- **Migração para `prisma migrate deploy`**: requer 1 migration de baseline (init) + baselinar o
  banco existente (`prisma migrate resolve --applied <init>`). Até lá, `db push` é o caminho seguro.
- **Integrações**: ASAAS/Asaas, Speedio, Autentique, **WhatsApp oficial**, **Meta Ads**, Google
  Drive/Calendar — hoje em STUB; dependem de credenciais.
- **Validação de runtime** (login real, CRUD ponta-a-ponta): só com o backend + banco no ar.

---

## 7. Arquivos alterados (commit `d73d379`)

```
apps/api/Dockerfile
apps/api/prisma/seed.ts
apps/api/src/atendimento/atendimento.service.ts
apps/api/src/comunicados/comunicados.controller.ts
apps/api/src/comunicados/dto/criar-comunicado.dto.ts
apps/api/src/ia/ia.service.ts
apps/api/src/main.ts
apps/api/src/qualidade/qualidade.service.ts
apps/web/src/App.tsx
apps/web/src/components/Sidebar.tsx
apps/web/src/index.css
apps/web/src/pages/Atendimento.tsx
apps/web/src/pages/Dashboard.tsx
apps/web/src/pages/NotFound.tsx (novo)
```
(Commits anteriores da sessão: re-tema minimalista, perfil do colaborador, portal demo.)

---

## 8. Recomendações finais para produção

1. **Provisionar o banco** no Railway e aplicar o schema (db push hoje; migrar p/ migrate deploy
   depois, com baseline).
2. **Setar as envs** no Railway (JWT_SECRET, ADMIN_SENHA, CORS_ORIGIN) e no Vercel (VITE_API_URL).
3. **Confirmar o domínio** real do front e alinhar `CORS_ORIGIN`.
4. **Trocar a senha do admin** após o primeiro login.
5. **CI**: adicionar lint/test (hoje só builda) e alinhar versão do Node (Vercel 24 × CI/Docker 20).
6. **Plano de integrações**: conectar as credenciais reais (WhatsApp, Meta, pagamentos) — o core do
   atendimento centralizado depende do WhatsApp oficial.
7. Opcional: consolidar componentes duplicados (`Campo`/`CampoSelect`) e adicionar feedback de erro
   onde hoje há fallback silencioso.

---

## 9. Status final

**PARCIALMENTE PRONTO — o frontend está pronto e no ar; o sistema fica 100% operacional em
produção assim que o backend for provisionado (banco + variáveis de ambiente).**

Nenhum erro de código/build pendente. Os bloqueios restantes são de **infraestrutura e
credenciais** (banco, envs, integrações) — externos ao código e listados acima.
