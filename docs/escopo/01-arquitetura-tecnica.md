# 01 — Arquitetura Técnica

## Visão em camadas
```
┌───────────────────────────────────────────────────────────────┐
│  CLIENTES (web)        EQUIPE (web)        ADMIN/GESTÃO (web)    │
│  Portal do Cliente     Painéis por cargo   Dashboards/Config     │
└───────────────▲───────────────▲───────────────▲────────────────┘
                │ HTTPS / WebSocket (realtime)                     
┌───────────────┴──────────────────────────────────────────────┐
│  API (NestJS) — REST + WebSocket                                │
│   • Auth/RBAC  • Módulos de negócio (12)  • Camada de serviços  │
├───────────────────────────────────────────────────────────────┤
│  MOTOR DE AUTOMAÇÃO PRÓPRIO (doc 03)                            │
│   • Event bus  • Triggers (evento/cron/webhook/status)          │
│   • Regras configuráveis  • Ações  • Fila (BullMQ) + Scheduler  │
├───────────────────────────────────────────────────────────────┤
│  ADAPTERS DE INTEGRAÇÃO (doc 04)                               │
│   ASAAS · Speed · WhatsApp · Meta Ads · Google · Autentique…    │
├───────────────────────────────────────────────────────────────┤
│  DADOS:  PostgreSQL (Prisma)  ·  Redis (fila/cache)  ·  Storage │
└───────────────────────────────────────────────────────────────┘
```

## Stack recomendada 🔶 CONFIRMAR
Baseada no padrão que a VAI já usa (consistência com Grupo Pons, Vértice, Stillo):

| Camada | Tecnologia | Por quê |
|---|---|---|
| Backend/API | **NestJS (Node + TypeScript)** | Modular, testável, padrão VAI; ótimo para domínio rico + filas. |
| ORM/DB | **Prisma + PostgreSQL** | Schema tipado, migrations versionadas, relacional (a operação é relacional). |
| Fila/Jobs | **BullMQ + Redis** | Base do motor de automação (jobs assíncronos, cron, retries). |
| Realtime | **WebSocket (Socket.IO/native)** | Pop-ups em tempo real (ex.: "novo contrato p/ Franciélia"), notificações, inbox. |
| Frontend | **React (Vite) + TypeScript** | Painéis, portal, dashboards; padrão VAI. |
| UI | Tailwind + design system na **identidade Breakr** | Preto fumaça, gradiente brasa, Lexend (ver `../_DOCS/MARCA-Breakr-resumo.md`). |
| Auth | **JWT + RBAC** por cargo/permissão | Permissões finas por módulo/ação. |
| Storage | S3-compatível (MinIO em VPS) **ou** Google Drive na transição | Ver decisão abaixo. |
| Deploy | **Docker** em VPS | Reprodutível; observável. |

## Tenancy — single-tenant (DECIDIDO)
Sistema **single-tenant** (só Breakr). **Sem `empresa_id`** nas entidades. White-label fica **fora de escopo**; se a VAI quiser revender o Breakr OS no futuro, será um esforço de refatoração tratado à parte.

## Armazenamento de arquivos — decisão ADIADA (storage abstraído)
Decisão de "Google Drive vs storage próprio" fica para a **fase de infra**. Independente da escolha, o sistema usa uma **abstração de storage** (interface única): suporta Google Drive agora e troca por storage próprio (MinIO/S3 em VPS) depois **sem retrabalho** no resto do código.

## Segurança & LGPD
- Dados sensíveis: contratos, dados fiscais (CNPJ/CPF), financeiro, senhas de acesso de clientes (Meta/Facebook). **Criptografia em repouso** para credenciais (vault/secrets), TLS em trânsito.
- **RBAC** por cargo + acesso parcial (ex.: CS vê *cláusulas* do contrato, não o documento inteiro — 🔶 CONFIRMAR).
- **Auditoria**: toda ação relevante logada (quem, o quê, quando) — base da rastreabilidade por ID único.
- **LGPD**: consentimento, base legal (contrato), retenção, exclusão; dados de clientes finais (restaurantes) e de leads (enriquecimento) tratados conforme política.
- Cofre de credenciais de integração (tokens ASAAS/Meta/WhatsApp) **nunca** no código; rotação suportada.

## Ambientes & entrega
- **dev → staging → produção**; migrations versionadas (Prisma).
- **CI/CD** (build, testes, deploy Docker).
- **Observabilidade**: logs estruturados, painel de execuções do motor (doc 03), alertas de erro.
- **Backup** diário do Postgres + storage; restore testado (ver doc 99).

## Estratégia de migração (ClickUp + n8n → Breakr OS)
1. **Conviver, não big-bang.** O Breakr OS sobe em produção rodando **ao lado** do ClickUp/n8n.
2. **Fatia vertical primeiro** (ver doc 95): Contrato → Pagamento → Onboarding → Portal → Projetos, ponta a ponta, para um cliente piloto.
3. **Importar histórico do ClickUp** via API (clientes, projetos, campanhas, otimizações antigas) — o Gustavo faz questão do histórico.
4. **Desligar o n8n por etapas**: cada workflow migrado para o motor próprio é desativado no n8n só após validado no Breakr OS.
5. **Desligar o ClickUp por módulo**, à medida que cada módulo entra em produção e é homologado.

> Detalhe do faseamento e ordem de corte no doc **95 — Fases & Roadmap**.
