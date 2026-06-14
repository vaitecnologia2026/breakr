# 95 — Fases & Roadmap

Entrega **incremental**, sem big-bang. Cada fase entrega valor real, roda **ao lado** do ClickUp/n8n, e só "corta" o legado após homologação. Ordem pensada para acompanhar a **jornada do cliente** (a espinha primeiro).

> Não há estimativa de prazo aqui (depende do time/velocidade). O foco é **ordem de entrega** e **critério de go-live** de cada fase. 🔶 Validar prazos com o time dev.

## Fase 0 — Fundação técnica
**Objetivo:** base sobre a qual tudo roda.
- Setup: repositórios, ambientes (dev/staging/prod), Docker, CI/CD, Postgres+Prisma, Redis, observabilidade.
- **Núcleo (M10) — parte base:** auth/login, cargos & permissões (RBAC), usuários, departamentos→áreas→listas, **squads** (membros por função), gerador de **código único**, notificações + WebSocket, auditoria.
- **Motor de automação (doc 03) — esqueleto:** event bus, fila (BullMQ), scheduler (cron), catálogo de ações internas, painel de execuções, cofre de credenciais.
- **WhatsApp (adapter)** oficial + inbox roteado (M10).
**Go-live:** equipe consegue logar, ver seus painéis, e o motor executa uma regra simples de ponta a ponta com log.

## Fase 1 — Espinha de entrada do cliente (MVP)
**Objetivo:** um cliente entra e roda 100% no Breakr OS, do contrato ao onboarding. **É o piloto.**
- **Contratos (M12):** form de captação → contrato (Docs→Autentique) → revisão humana → em vigor.
- **Financeiro (M13):** ASAAS (cliente/cobrança/fatura) + NF (Speed) + painel da Franciélia (boletos, fluxo de caixa) + cobrança via WhatsApp.
- **Projetos (M15):** criação automática dos projetos a partir do contrato/plano.
- **CS · Onboarding · Portal (M14):** onboarding gamificado + Portal do Cliente + grupo WhatsApp automático + auto-balanceamento de squad.
- **Motor:** regras do pipeline de entrada (Criação de Contrato, Envio p/ Assinatura, Liberar Onboarding Após Pagamento, Renovação 45d).
- **Integrações:** ASAAS, Speed, Autentique, Google Docs/Drive, WhatsApp.
**Go-live:** 1 cliente piloto entra de verdade (contrato→pagamento→NF→onboarding→projetos) sem tocar em ClickUp/n8n. **Desliga no n8n** os workflows desse pipeline.

## Fase 2 — Operação de marketing (produção + tráfego)
**Objetivo:** a entrega mensal do cliente roda no sistema.
- **Marketing/Conteúdo (M16):** funis, statuses, atribuição por squad, produção copy→design, nomenclaturas.
- **Tráfego (M17):** registro de campanha, Meta Ads API (métricas/gasto), otimizações configuráveis, públicos, laboratório, orçamento inteligente, **IA assistiva**.
- **Qualidade & Aprovação (M18):** aprovação estilo eCite no Portal + avaliação por estrelas + rework + carga por designer.
- **Integrações:** Meta Ads API.
**Go-live:** um cliente roda o ciclo mensal completo (estratégia→produção→aprovação→tráfego→resultado) no sistema. **Desliga no n8n** os workflows de nomenclatura/otimização/aprovação. **Desliga o ClickUp** para os times de conteúdo/tráfego/CS.

## Fase 3 — Interno (comercial, pessoas, operações)
**Objetivo:** centralizar o back-office.
- **Comercial/CRM (M11):** pipelines inbound/prospecção, scraping/enriquecimento, click-to-call.
- **RH (M19):** recrutamento + DISC + documentos do colaborador + OKRs + ouvidoria + educacional.
- **Operações (M20):** agenda/calendário, inventário, compras.
- **Desenvolvimento (M21):** painel de bugs/sprints.
**Go-live:** back-office inteiro no sistema. **Desliga o CRM pago, o Google Calendar** e os formulários avulsos. **n8n 100% desligado.**

## Fase 4 — Evolução (fora da v1)
Open Delivery · Open Finance · produto voltado ao restaurante (DeliveryOS) · app mobile nativo · LMS interno de aulas · white-label (se a VAI decidir revender).

## Migração de dados (ClickUp → Breakr OS)
- Importar via **API do ClickUp**: clientes, squads, projetos, campanhas e **histórico de otimizações** (o Gustavo faz questão).
- Importar contratos/faturas existentes (ASAAS) e estrutura de pastas (Drive).
- Estratégia de corte: por **módulo** (cada um sai do ClickUp ao entrar em produção) e por **workflow** (cada regra migrada desliga o equivalente no n8n).

## Regras de corte (para não quebrar a operação)
1. Nada é desligado antes de homologado em staging **e** validado pela Breakr em produção paralela.
2. Sempre há rollback (o legado fica disponível até a fase seguinte estabilizar).
3. Cada go-live tem checklist de aceite (doc 99) assinado pela Breakr.
