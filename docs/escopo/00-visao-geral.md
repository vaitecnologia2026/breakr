# 00 — Visão Geral

## Objetivo
Construir o **Breakr OS**: o sistema operacional próprio da agência Breakr, que **centraliza toda a operação** hoje espalhada em ClickUp, n8n, ASAAS, Google Drive, Speed, WhatsApp, Meta Ads, eCite, CRM pago e protótipos avulsos. O sistema **substitui** o ClickUp (gestão/tarefas/processos) e o n8n (automação), com **motor de automação próprio**.

**Resultado esperado:** a equipe da Breakr e os clientes operam 100% dentro de uma única plataforma; nada de pular entre ferramentas; tudo rastreável e centralizado.

## Escopo IN (faz parte)
- Os **12 módulos** de negócio (docs 10–21).
- **Motor de automação próprio** (doc 03) reimplementando os 43 workflows do n8n + novas regras.
- **Portal do Cliente** (área do restaurante: onboarding, aprovação, avaliação, notificações).
- **Integrações** (doc 04): ASAAS, Speed (NF-e), WhatsApp API oficial, Meta Ads Marketing API, Google Docs/Drive, Autentique, VoIP, enriquecimento de leads.
- **IA de tráfego** (assistiva — sugere, não executa sozinha). DECIDIDO.
- **Migração** de dados/histórico do ClickUp.

## Escopo OUT (não entra agora — backlog futuro)
- **Open Finance** — o Gustavo disse explicitamente que para o indicador financeiro básico **não precisa agora**.
- **Open Delivery** e produto voltado ao **restaurante usuário-final** (DeliveryOS) — evolução futura; o foco da v1 é a **operação da agência**.
- App mobile nativo (a v1 é web responsiva). 🔶 CONFIRMAR.
- LMS completo de aulas internas (v1 entrega apenas painel/links de cursos).

## Princípios de produto (guiam todas as decisões)
1. **Centralização total** — uma fonte de verdade; nenhum dado "solto" em ferramenta externa.
2. **Sob medida, não genérico** — modelamos a operação real da Breakr (não clonamos o ClickUp). Remove as limitações que o Gustavo bate hoje.
3. **Humano no loop** — automação não substitui decisão crítica (ex.: Franciélia revisa contrato antes de assinar; gestor decide otimização).
4. **IA onde agrega** — começa no tráfego (analisar e sugerir).
5. **Configurável sem dev** — o Gustavo precisa mudar parâmetros (dias de otimização, valores de plano, SLAs) por painel, sem chamar programador.
6. **ID único & rastreabilidade** — todo registro (task, contrato, campanha, público) recebe um código único anexado ao nome.
7. **Atribuição por SQUAD** — define-se o cliente → o sistema preenche o time (CS, copy, designer, editor, estrategista, gestor).
8. **Gamificação** — onboarding do cliente e score de qualidade interno.

## Atores e papéis
| Ator | Descrição |
|---|---|
| **Cliente** (restaurante/delivery) | Acessa o Portal do Cliente: onboarding, aprovação de peças, avaliações, notificações. |
| **CS / CES** | Sucesso do cliente; um por squad; onboarding, tickets, NPS, aprovações. |
| **Estrategista** | Cria funis/estratégias; recebe demanda de criativos (SLA 72h); revisa design. |
| **Copywriter** | Planejamento e escrita; statuses de produção. |
| **Designer / Editor de vídeo** | Produção de criativos; fila e carga. |
| **Gestor de tráfego** | Sobe e otimiza campanhas; controle de orçamento. |
| **Financeiro** (Franciélia) | Cobranças, NF, fluxo de caixa, contratos. |
| **Jurídico / Admin** (Fran, Gustavo) | Contratos, RH, compras, metas, configuração do sistema. |
| **Admin / Superadmin** | Configura squads, planos, automações, permissões. |

> Cada usuário pertence a um **cargo** (define permissões e o painel "Hoje & Atrasados" modular) e pode pertencer a **squads**.

## Premissas e decisões a confirmar 🔶
- **Stack**: padrão VAI — NestJS (Node/TS) + Prisma + PostgreSQL no back; React (Vite/TS) no front; Redis + BullMQ para filas/jobs. Detalhe no doc 01. 🔶 CONFIRMAR.
- **Hospedagem**: VPS própria (o Gustavo perguntou se vale migrar do Google Drive/Hostinger para VPS dedicada). Recomendação no doc 01. 🔶 CONFIRMAR.
- **Tenancy**: **single-tenant** (só Breakr) — DECIDIDO. Sem `empresa_id`; white-label fora de escopo.
- **Armazenamento de arquivos**: decisão ADIADA (fase de infra); camada de storage **abstraída** (Drive agora, storage próprio depois sem retrabalho).
- **IA de tráfego**: **assistiva** — DECIDIDO. Sugere (pausar/escalar/criar criativo); o humano decide. Sem execução autônoma na v1.

## Glossário
- **Squad** — time multifuncional (ex.: Trovão, Relâmpago, Fagulha) com CS, copy, designer, editor, estrategista, gestor; cada cliente é alocado a um squad.
- **Projeto** — pacote de trabalho de um cliente; um cliente tem até **3** (Financeiro, Marketing, Gestão), conforme o plano contratado.
- **Otimização** — registro de ajuste de uma campanha (checklist CTR/CPM/CTA/ROAS/conversão); cria dependência na campanha.
- **Laboratório de criativos** — fila onde o gestor recebe criativos aprovados para subir ("para testar" / "em teste").
- **PDC** — barra de progresso do onboarding do cliente (gamificada).
- **Plano** — pacote contratado (ex.: Brasa, Híbrido) que define entregáveis, valor e projetos a criar.
- **Em vigor** — status do contrato após assinatura; dispara criação de projetos, tasks de CS e grupo de WhatsApp.

## Definição de "feito" (geral)
Um item só é considerado pronto quando: (a) atende às regras de negócio descritas; (b) tem os critérios de aceite verdes; (c) registra log/auditoria; (d) respeita permissões por cargo; (e) foi homologado pela Breakr no ambiente de staging.
