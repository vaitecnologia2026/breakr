# 03 — Motor de Automação Próprio (substitui o n8n)

> **Requisito do cliente (explícito):** o n8n **NÃO** fica como motor. A Breakr terá seu **motor de automação próprio**, embutido no Breakr OS, que reimplementa os 43 workflows + novas regras, e que o **Gustavo consegue configurar sem depender de dev**.

## Objetivos do motor
1. Executar automações de forma **confiável** (não pode perder execução — financeiro/contrato dependem disso).
2. Ser **configurável por painel** (parâmetros e regras) sem deploy de código.
3. Ser **observável** (cada execução logada, com retry e visão de erro — equivalente à "execução" do n8n, porém nosso).
4. Reaproveitar **ações/integrações** como blocos (o equivalente aos "nodes", mas próprios).

## Arquitetura do motor
```
Eventos de domínio ─┐
Webhooks de entrada ─┤→ [DISPATCHER] → casa com REGRAS ativas → enfileira JOBS
Agendador (cron) ────┤                                   (BullMQ + Redis)
Gatilho manual/botão ┘                                          │
                                                                ▼
                                          [WORKER] executa STEPS da regra:
                                          condição → ação → ação → (retry/loop/delay)
                                                                │
                                          [AÇÕES] entidade interna | integração (adapter)
                                                                │
                                          [LOG] JobExecution (status, passos, payload, erro)
```
- **Fila + workers (BullMQ/Redis):** toda ação roda como job assíncrono, com **retry exponencial**, **idempotência** (chave por evento+regra) e **dead-letter** para falhas terminais.
- **Agendador (cron):** dispara regras temporais (ex.: renovação 45 dias antes; otimização nos dias configurados; cobranças da semana).
- **Event bus:** o domínio emite eventos (`contrato.assinado`, `fatura.paga`, `tarefa.status_alterado`, `cliente.criado`…) que o dispatcher casa com regras.

## Anatomia de uma REGRA (entidade `AutomacaoRule`)
```
Regra {
  nome, ativa(bool),
  trigger: {
    tipo: evento_dominio | webhook | agendado(cron) | mudanca_status | mudanca_tag | manual | temporal,
    evento/cron/status/tag: <conforme tipo>
  },
  condicoes: [ {campo, operador, valor} ... ]   // filtros (AND/OR)
  ramificacoes (switch): [ {quando: <cond>, steps: [...] } ]  // ex.: plano Brasa vs Híbrido
  steps: [ Ação, Ação, ... ]                    // sequência
  parametros: { ... }                           // editáveis no painel (ex.: dias_otimizacao, valor_plano, SLA_horas)
}
```

### Tipos de TRIGGER
| Trigger | Exemplo de uso |
|---|---|
| Evento de domínio | `contrato.assinado` → cria projetos + grupo WhatsApp |
| Webhook de entrada | Form de captação preenchido → cria cliente + contrato |
| Agendado (cron) | Toda 2ª/3ª feira → abre otimizações por gestor; semanal → cobranças |
| Mudança de status | Copy "concluído" → move para Design e marca designer |
| Mudança de tag | Tag "solicitar criativo" → cria tarefa para estrategista |
| Temporal | 45 dias antes do vencimento → status "Renovação" + alerta CS |
| Manual / botão | Gestor clica "solicitar criativo" no card |

### Catálogo de AÇÕES (blocos reutilizáveis)
**Internas:** criar/atualizar entidade (cliente, contrato, projeto, tarefa, campanha, otimização…), mover status, atribuir squad/responsável, gerar `codigo_unico` + renomear, criar dependência, gerar pasta padrão, criar checklist, comentar, criar notificação/pop-up, criar comunicado.
**Integrações (adapters — doc 04):** ASAAS (criar cliente/assinatura/cobrança, consultar boletos/saldo), Speed (emitir NF), Google Docs (gerar doc por template + replace), Google Drive (criar pastas), Autentique (gerar/enviar p/ assinatura), WhatsApp oficial (mensagem, criar grupo, add admin, enviar link/boleto/PIX), Meta Ads (ler campanhas/gasto/métricas, importar públicos), VoIP (click-to-call), enriquecimento de leads.
**Controle de fluxo:** condição/switch, **loop com timeout** (ex.: aguardar documento ser criado), **delay/espera**, sub-regra (chamar outra regra).

### Confiabilidade & observabilidade (`JobExecution`)
- Cada execução registra: regra, trigger/payload, passos executados, entrada/saída de cada passo, status (sucesso/erro/retry), tempo, erro.
- **Retry** com backoff; após N falhas → dead-letter + alerta.
- **Idempotência**: mesma origem não dispara duplicado.
- **Painel de execuções** (substitui a tela de execução do n8n): filtrar por regra/cliente/erro, reexecutar, inspecionar payload.
- **Cofre de credenciais** para tokens de integração (criptografado).

## Painel de configuração (no-code para o Gustavo) — **requisito-chave**
O Gustavo precisa, **sem dev**:
- Ativar/desativar regras.
- Editar **parâmetros**: dias/horários de otimização por tipo de campanha, valores por plano, SLAs (onboarding 3h, criativo 72h), antecedência de renovação (45d), thresholds de tráfego (ex.: CTR 1%).
- Editar **modelos de mensagem** (WhatsApp/notificação) e **templates de contrato**.
- Ver execuções e erros; reprocessar.
- *(Avançado, fase posterior)* editor visual de regras (arrastar gatilho→condição→ações). Na v1, regras complexas são versionadas pelo time; **parâmetros** são 100% editáveis por painel.

## Reimplementação dos 43 workflows do n8n
Cada workflow do inventário (`../n8n/02-inventario-workflows.md`) vira uma **Regra** do motor. Mapa de migração (resumo — detalhe vai no doc de cada módulo):

| Workflow n8n (hoje) | Regra no motor (Breakr OS) |
|---|---|
| Criação e Cadastro de Contrato | Trigger webhook (form) → switch(plano) → ASAAS(cria) + Google Docs(gera) + cria Cliente/Contrato + notifica Franciélia |
| Envio do Contrato p/ Assinatura | Status "em revisão"→"em assinatura" → Docs→PDF → Autentique → salva link |
| Liberar Onboarding Após Pagamento | Evento `fatura.paga` → Speed(NF) → cria projetos + steps de onboarding + pasta Drive + grupo WhatsApp + notifica CS (SLA 3h) |
| Renovação de Contratos | Temporal (45d antes) → status "Renovação" + alerta CS |
| Nomenclatura (Públicos/Campanhas/Criativos/Copy) | Evento `tarefa.criada` → gera `codigo_unico` + renomeia no padrão |
| Aguardar Aprovação de Campanhas | Status/tempo → follow-up/checagem |
| Otimização de Campanhas (PT1/PT2) | Cron configurável por gestor → cria Otimização + dependência |
| Solicitação de Criativos | Botão/tag → cria tarefa p/ estrategista (SLA 72h) |
| Aprovação em Grupos (criativos) | Status "aprovação" → WhatsApp grupo + link do portal + (pós) avaliação |
| Confirmação de Reunião + Follow-up | Pipeline temporal → mensagens 48h/24h/3h/1h30/30min/15min + link |
| Relatórios (Reportei) / Saldo Meta | Cron → Meta API/ASAAS → relatório/indicadores |
| Leads do Site / Criação de Lead | Webhook → cria Lead no pipeline inbound |

> Workflows de **outros produtos** (DeliveryOS, CMV/Hotmart, Minhas Reservas) **ficam fora** do escopo da agência (ver doc 00).

## Critérios de aceite do motor
1. Toda regra acima funciona ponta a ponta no Breakr OS sem n8n.
2. Falha de integração não perde a execução (retry + dead-letter + alerta).
3. Gustavo edita parâmetros das regras pelo painel, sem deploy.
4. Toda execução é auditável e reprocessável.
5. Migração: cada workflow só é desligado no n8n após a regra equivalente passar em homologação.
