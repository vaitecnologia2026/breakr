# Breakr OS

Sistema operacional próprio da **Breakr** — substitui ClickUp + n8n com **motor de automação próprio**. **CONFIDENCIAL / NDA.**

> Especificação completa em [`docs/escopo/`](docs/escopo/). Estado: **Fase 0 — Fundação** (núcleo + esqueleto do motor).

## Stack
- **Back:** NestJS (Node/TS) · Prisma · PostgreSQL · Redis + BullMQ (motor de automação)
- **Front:** React + Vite + TypeScript (identidade Breakr — Lexend, paleta brasa)
- **Monorepo:** npm workspaces — `apps/api`, `apps/web`, `packages/shared`

## Subir o ambiente (dev)
```bash
# 1. Dependências
npm install

# 2. Banco + Redis (Docker)
npm run db:up

# 3. Variáveis de ambiente
cp .env.example apps/api/.env
cp .env.example apps/web/.env

# 4. Migrar e popular o banco
npm run db:migrate
npm run db:seed         # cria admin@breakr.com / breakr123

# 5. Rodar
npm run dev:api         # http://localhost:3000  (health: /health)
npm run dev:web         # http://localhost:5173
```

## Estrutura
```
apps/api      Backend NestJS + Prisma + Motor de automação
apps/web      Frontend React (Vite)
packages/shared   Tipos/enums compartilhados (cargos, funções de squad…)
docs/escopo   Especificação (SOW) — fonte de verdade do que construir
```

## Roadmap (ver docs/escopo/95-fases-roadmap.md)
- **Fase 0** — Fundação: núcleo (auth/RBAC/squads) + esqueleto do motor. ⬅️ *atual*
- **Fase 1** — MVP: Contrato → Financeiro → Onboarding → Portal → Projetos
- **Fase 2** — Operação: Marketing · Tráfego (IA assistiva) · Qualidade
- **Fase 3** — Back-office: Comercial · RH · Operações · Dev + migração

> Não versionar segredos. Material confidencial (acessos, contratos) fica **fora** deste repositório.
