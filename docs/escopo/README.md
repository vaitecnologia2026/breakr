# Breakr OS — Escopo de Trabalho (SOW)

Especificação completa e detalhada do sistema que a **VAI** vai desenvolver para a **Breakr**: uma plataforma própria que **substitui integralmente o ClickUp e o n8n**, com **motor de automação próprio** (sem depender de n8n). Este é o documento que o time de desenvolvimento segue.

> **Regra de ouro deste escopo:** nada é "subentendido". Cada item descreve *o que* construir, *as regras de negócio*, *as integrações* e os *critérios de aceite*. O dev não deve inventar comportamento — se algo não estiver aqui, é lacuna a ser especificada antes de codar.

## Como o escopo está organizado
| # | Documento | Conteúdo | Status |
|---|---|---|---|
| 00 | [Visão Geral](00-visao-geral.md) | Objetivo, escopo in/out, princípios, atores, premissas, glossário | ✅ |
| 01 | [Arquitetura Técnica](01-arquitetura-tecnica.md) | Camadas, stack, tenancy, segurança/LGPD, ambientes, migração | ✅ |
| 02 | [Modelo de Dados](02-modelo-de-dados.md) | Entidades, campos, relacionamentos, ID único | ✅ |
| 03 | [Motor de Automação (próprio)](03-motor-de-automacao.md) | Triggers, ações, agendador, regras configuráveis, logs — **substitui o n8n** | ✅ |
| 04 | [Integrações Externas](04-integracoes.md) | ASAAS, Speed, WhatsApp, Meta Ads, Google, Autentique, VoIP, enriquecimento | ✅ |
| — | [Template de Módulo](modulos/_TEMPLATE.md) | Padrão de especificação de cada módulo | ✅ |
| 10 | Núcleo / Plataforma | Auth, cargos, squads, inbox, notificações, WhatsApp interno | ✅ |
| 11 | Comercial / CRM | Pipelines, prospecção, scraping, click-to-call | ✅ |
| 12 | Jurídico / Contratos | Geração, revisão, assinatura, renovação | ✅ |
| 13 | Financeiro / BPO | ASAAS, painel, cobrança WhatsApp, NF, indicadores | ✅ |
| 14 | CS · Onboarding · Portal do Cliente | Tickets, NPS, onboarding gamificado, portal | ✅ |
| 15 | Projetos | Auto-criação, 3 por cliente, itens relacionados | ✅ |
| 16 | Marketing · Estratégia & Conteúdo | Funis, produção, statuses, atribuição por squad | ✅ |
| 17 | Tráfego Pago | Campanhas, IA, orçamento, otimizações, públicos | ✅ |
| 18 | Qualidade & Aprovação | Aprovação (eCite-like), avaliação, rework | ✅ |
| 19 | RH / Gestão de Pessoas | Recrutamento, DISC, documentos, OKRs | ✅ |
| 20 | Operações Internas | Inventário, compras, agenda/calendário | ✅ |
| 21 | Desenvolvimento | Painel de bugs/sprints | ✅ |
| 90 | [Não-Funcionais](99-nao-funcionais.md) | Performance, segurança, backup, auditoria, acessibilidade | ✅ |
| 95 | [Fases & Roadmap](95-fases-roadmap.md) | MVP, ordem de entrega, migração ClickUp→Breakr OS | ✅ |
| 99 | Critérios de Aceite Globais & QA | Definição de pronto, testes, homologação | ✅ |

## Documentos auxiliares
- **[_DECISOES-PENDENTES.md](_DECISOES-PENDENTES.md)** — ~219 itens 🔶 a confirmar com Gustavo/Franciélia (agenda de revisão).
- **[modulos/](modulos/)** — especificações detalhadas dos 12 módulos (10–21), todas no padrão do [template](modulos/_TEMPLATE.md).

## Princípio inegociável: **motor próprio**
O n8n **não** fica como motor por trás. Toda automação (os 43 workflows mapeados + as novas) é reimplementada no **motor de automação próprio** (doc 03), configurável pelo Gustavo **sem depender de dev** para mudar parâmetros.

## Rastreabilidade
Cada item de escopo referencia a fonte (vídeo/doc) em `../ENTENDIMENTO-DO-PROJETO.md` e `../_MAPEAMENTO/`. Decisões pendentes de confirmação são marcadas **🔶 CONFIRMAR**.
