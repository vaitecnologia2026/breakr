# Checklist de Desenvolvimento — Breakr OS
> Por **Dex (Dev)** + visão **DevOps**. Derivado do SOW (`_ESCOPO/`). Estado: **greenfield** (planejamento pronto, código 0%).
> Legenda: ✅ pronto · 🟡 parcial · ⬜ a desenvolver · ⛔ bloqueado (depende de decisão/acesso)

## A) O que JÁ está PRONTO (inputs de desenvolvimento)
- ✅ **Escopo completo (SOW)** — 22 docs em `_ESCOPO/`
- ✅ **Arquitetura & stack** definidas (NestJS+Prisma+Postgres / React+Vite / Redis+BullMQ) — doc 01
- ✅ **Modelo de dados** (entidades + relações) — doc 02
- ✅ **Motor de automação próprio** especificado (triggers/ações/scheduler/painel) — doc 03
- ✅ **Integrações** mapeadas (contratos por adapter) — doc 04
- ✅ **12 módulos** especificados (regras numeradas + critérios de aceite) — `modulos/10..21`
- ✅ **Fases & roadmap** + estratégia de migração — doc 95
- ✅ **Requisitos não-funcionais & QA** (definição de pronto) — doc 99
- ✅ **Decisões estruturais:** single-tenant · storage abstraído · IA assistiva
- ✅ **Identidade visual** (deck + marca) para o front
> Conclusão: **planejamento 100%**. Falta **todo o código** (abaixo).

## B) ⛔ BLOQUEIOS a resolver antes/durante o início
- ⛔ **Repositório & infra** — greenfield: inicializar git, repo remoto, CI/CD (DevOps · `*environment-bootstrap`).
- ⛔ **Decisões 🔶 bloqueantes** (ver `_DECISOES-PENDENTES.md`): valores por plano (M12) · provedor de enriquecimento + LGPD (M11) · provedor VoIP (M11) · centro de custo/compras (M20).
- ⛔ **Credenciais de integração** (sandbox primeiro): ASAAS · Speed · Meta Ads · WhatsApp oficial · Autentique · Google.
- 🟡 **Migração de dados:** depende do n8n voltar (404) e do acesso ao ClickUp (doc bloqueado) — **não** trava o build do sistema, só a importação de histórico.

---

## C) A DESENVOLVER — por fase

### ⬜ Fase 0 — Fundação técnica & DevOps
**DevOps / Infra**
- [ ] Inicializar git + monorepo (`apps/api`, `apps/web`, `packages/shared`)
- [ ] Docker Compose (Postgres, Redis) p/ dev
- [ ] Ambientes dev/staging/prod + variáveis/segredos (cofre)
- [ ] CI/CD (lint, test, build, deploy) + migrations automatizadas
- [ ] Observabilidade (logs estruturados), **backup** Postgres + restore testado

**Backend — núcleo (M10)**
- [ ] Setup NestJS + Prisma + Postgres; convenções/lint/test
- [ ] Schema inicial: Usuario, Cargo, Departamento→Area→Lista, **Squad** (membro+função), Cliente, Config, AuditLog
- [ ] **Auth (JWT)** + **RBAC** por cargo
- [ ] **Gerador de código único** (rastreabilidade)
- [ ] Notificações + **WebSocket** (realtime)
- [ ] Atribuição automática (cliente→squad→time)

**Motor de automação (esqueleto) — doc 03**
- [ ] Event bus + **fila (BullMQ/Redis)** + **scheduler (cron)**
- [ ] Catálogo de ações internas + controle de fluxo (condição/loop/delay) + idempotência/retry/dead-letter
- [ ] **Painel de execuções** (log, inspeção, reprocessar)
- [ ] Cofre de **credenciais de integração**

**Frontend — base**
- [ ] Setup React+Vite+TS + **design system Breakr** (Lexend, paleta, gradiente)
- [ ] Shell do app, login, layout dos **painéis por cargo** (Inbox · Hoje & Atrasados)

**Adapter WhatsApp** (oficial) + inbox roteado por área
- [ ] Enviar/receber, criar grupo, gerenciar participantes

➡️ **Go-live F0:** equipe loga, vê painel, e o motor roda 1 regra ponta a ponta com log.

### ⬜ Fase 1 — MVP: entrada do cliente *(piloto)*
- [ ] **M12 Contratos** (form→Docs(template/replace)→Autentique→revisão Franciélia→**em vigor**→renovação 45d)
- [ ] **M13 Financeiro** (ASAAS cobrança/fatura · NF Speed · painel Franciélia · cobrança WhatsApp · liberar onboarding)
- [ ] **M15 Projetos** (auto-criação a partir do contrato/plano)
- [ ] **M14 CS · Onboarding · Portal** (onboarding gamificado · portal do cliente · grupo WhatsApp · auto-balanceamento de squad)
- [ ] **Motor:** regras do pipeline de entrada (criar contrato · enviar assinatura · liberar onboarding após pagamento · renovação)
- [ ] **Integrações:** ASAAS · Speed · Autentique · Google (sandbox→prod)
➡️ **Go-live F1:** 1 cliente real do contrato ao onboarding, sem ClickUp/n8n. Desliga esses workflows no n8n.

### ⬜ Fase 2 — Operação de marketing
- [ ] **M16 Marketing/Conteúdo** (funis visuais · statuses · atribuição por squad · produção)
- [ ] **M17 Tráfego + IA assistiva** (Meta Ads API · otimizações configuráveis · orçamento inteligente · públicos · laboratório)
- [ ] **M18 Qualidade & Aprovação** (aprovação no portal · avaliação por estrelas · rework · carga por designer)
- [ ] **Integração:** Meta Ads API
➡️ **Go-live F2:** ciclo mensal completo no sistema. Desliga ClickUp dos times.

### ⬜ Fase 3 — Back-office
- [ ] **M11 Comercial/CRM** (pipelines · scraping/enriquecimento · click-to-call)
- [ ] **M19 RH** (recrutamento · **DISC** · documentos do colaborador · OKRs)
- [ ] **M20 Operações** (agenda/calendário · inventário · compras)
- [ ] **M21 Desenvolvimento** (painel de bugs/sprints)
- [ ] **Migração** ClickUp→Breakr OS (importar histórico) + **n8n 100% desligado**
➡️ **Go-live F3:** back-office inteiro no sistema. Desliga CRM pago e Google Calendar.

---

## D) Definição de "pronto" (por item) — doc 99
Atende regras numeradas do módulo · critérios de aceite verdes · RBAC testado · log/auditoria · testes (unidade+integração nos fluxos críticos) · homologado pela Breakr em staging.

## E) Próximo passo recomendado (Dex)
1. **Resolver os ⛔** (decisões bloqueantes + credenciais sandbox + repo).
2. **Executar a Fase 0** (posso começar o scaffold agora — não depende de credenciais).
3. Atacar a **Fase 1** módulo a módulo, com testes.
