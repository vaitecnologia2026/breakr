# Módulo 13 — Financeiro / BPO

> Especificação técnica (SOW). Segue o `_TEMPLATE.md` (seções 1–10). Baseado em: `ENTENDIMENTO-DO-PROJETO.md` (módulo 4), doc 02 (`Fatura/Cobranca`, `NotaFiscal`, `CentroCusto`, `ContaPagar`, `ContaReceber`), doc 03 (motor), doc 04 (ASAAS, Speed, WhatsApp) e nas transcrições `Screen Recording 2026-06-11 at 08.59.17.txt` (parte financeira do pipeline) e `Screen Recording 2026-06-11 at 11.28.51.txt` (dores da Franciélia). **Single-tenant** (sem `empresa_id`). **Open Finance está FORA da v1** (decisão explícita do Gustavo).

## 1. Objetivo
Dar à Franciélia (financeiro, hoje **sozinha, ~4h extras/dia de retrabalho**) um **painel financeiro centralizado** que elimina o pula-pula entre ASAAS, ClickUp, Speed, WhatsApp e e-mail. Centraliza: cobrança via **ASAAS** (criar cliente/assinatura/cobrança/fatura, **consultar boletos pendentes e saldo**, **webhook de pagamento**), **cobrança por WhatsApp oficial** (boleto + PIX + fatura), **Nota Fiscal via Speed** (emitir + salvar link), **liberação de onboarding após pagamento**, contas a pagar, NF, centro de custo e **indicadores** (recebidas no mês, a pagar, saldo ASAAS, destratos). Princípio: *"quero tudo dentro do nosso sistema salvo"* — todo retorno de terceiro é gravado no banco.

**Substitui:**
- **ClickUp** — o controle manual de cobranças/faturas, o cadastro espelhado que a Franciélia refazia ("faz num sistema, cadastra no ClickUp, pega do ClickUp, joga em outro") e a coluna/status financeiro.
- **n8n** — os workflows `[ClickUp] Liberar Onboarding Após Pagamento` e `BPO Financeiro | Organização de Extratos`. Reimplementados como **Regras do motor próprio** (doc 03). (A criação ASAAS dentro de "Criação e Cadastro de Contrato" é **compartilhada** com o Módulo 12, mas a propriedade do adapter ASAAS é deste módulo.)

## 2. Atores & permissões
| Cargo | Pode |
|---|---|
| **Financeiro** (Franciélia) | Ver/operar todo o painel financeiro: boletos pendentes, fluxo de caixa, faturas, cobrança por WhatsApp, emissão/consulta de NF, contas a pagar/receber, centro de custo, indicadores. Marcar/registrar baixas manuais. Disparar reenvio de cobrança. |
| **Admin / Gustavo** | Tudo do Financeiro **+** ver indicadores consolidados para decisão (fluxo de caixa, saldo ASAAS, destratos), configurar parâmetros (modelos de mensagem de cobrança, dia/semana de disparo, regra de liberação de onboarding). |
| **CS** | **Sem** acesso ao painel financeiro. Recebe apenas o gatilho de onboarding liberado (consumido no Módulo 14). Pode ver, no contrato (Módulo 12), as cláusulas de valor — não as faturas/boletos. 🔶 CONFIRMAR. |
| **Cliente** | Não acessa este módulo. Recebe cobrança (boleto/PIX/fatura) e NF via WhatsApp oficial. |

> RBAC por Cargo (doc 01). Dados fiscais e financeiros são **sensíveis** (LGPD) — acesso restrito a Financeiro/Admin.

## 3. Telas / visões
1. **Painel Financeiro (home da Franciélia)** — o coração do módulo. Mostra:
   - **Boletos pendentes por semana** (chega segunda de manhã: o que vence/está pendente nesta semana), com colunas: cliente, valor, vencimento, **enviado no WhatsApp? (sim/não)**, **respondeu?**, **pagou?**.
   - **Valor a receber / fluxo de caixa** (próxima semana e mês) — dado de decisão para o Gustavo.
   - Atalhos para reenviar cobrança, emitir/consultar NF, dar baixa.
2. **Lista/Board de Faturas** — por status (Boleto emitido → Pago → Atrasado), filtros por cliente/semana/mês/meio (boleto/PIX).
3. **Detalhe da Fatura** — `asaas_id`, valor, vencimento, meio, status, **flags** (enviada/respondida/paga), boleto/PIX salvos, **NF vinculada** (link Speed + status), contrato/cliente de origem, histórico de cobrança.
4. **Indicadores (dashboard)** — recebidas no mês, a pagar no mês, **saldo atual no ASAAS**, **destratos a realizar**. 🔶 CONFIRMAR demais KPIs que a Franciélia pedirá ("provavelmente vai pedir mais coisas depois").
5. **Contas a Pagar** — lançamentos, vencimentos, **centro de custo**, status (a pagar/pago). (Centralização — fim do controle externo.)
6. **Centro de Custo** — cadastro e visão de despesas por centro (insumo de Compras — Módulo 20 — e dos indicadores).
7. **Inbox financeiro (mensagens roteadas)** — mensagens de WhatsApp **roteadas para a área financeira** "apitam" aqui (a VAI é integradora; sem WhatsApp Web aberto). Mostra quantas pendências de mensagem a Franciélia tem a resolver. (Roteamento/infra do WhatsApp interno é do Módulo 10; aqui é o **recorte financeiro**.)
8. **Config Financeiro** — modelos de mensagem de cobrança (boleto/PIX/fatura), dia/horário de varredura semanal, regra de liberação de onboarding, mapeamento de plano→dados de NF.

## 4. Entidades usadas (doc 02)
- **Fatura/Cobranca** — lê/escreve: `cliente_id`, `contrato_id`, **`asaas_id`**, `valor`, `vencimento`, `status` (Boleto emitido → Pago → Atrasado), `meio` (boleto/PIX), `nota_fiscal` (link Speed + status), **flags** (`enviada_whatsapp`, `respondida`, `paga`). Núcleo do painel.
- **NotaFiscal** — `fatura_id`, **`speed_id`**, `link PDF`, `status`. Salva no sistema (centralização).
- **Cliente** — lê dados fiscais (CNPJ/CPF, razão social), `status do ciclo` (muda para **Onboard** quando libera onboarding), WhatsApp, `ticket médio`. 
- **Contrato** — lê (vínculo da fatura; valor/plano); o destrato sinalizado no Módulo 12 alimenta o indicador de destratos.
- **CentroCusto, ContaPagar, ContaReceber** — contas a pagar/receber e rateio (módulo 20 referencia, mas a visão financeira vive aqui).
- **Projeto / Tarefa (OnboardingStep)** — **escritas pela regra de liberação por pagamento** (gatilho); detalhe no Módulo 14/15.
- **WhatsAppThread** — thread/grupo do cliente; mensagens de cobrança e roteamento financeiro.
- **AutomacaoRule / JobExecution / WebhookLog / IntegrationCredential** — motor e cofre (doc 03/04).
- **Notificacao** — alertas e pop-ups (ex.: pagamento recebido; pendências da semana).
- **AuditLog** — baixas manuais, reenvios, emissões de NF, mudanças de status.

## 5. Funcionalidades (regras de negócio numeradas)

- **F1. Integração ASAAS — criar e sincronizar cobrança**
  - R1.1 Na captação do contrato (Módulo 12, Regra A), o sistema cria no ASAAS: **cliente → assinatura → cobrança → fatura**, e **salva** `asaas_id`, valor, vencimento, meio, boleto/PIX no banco (a fatura existe no nosso sistema, não só no ASAAS).
  - R1.2 O sistema **consulta boletos pendentes** no ASAAS (`GET cobranças?status=PENDING&vencimento`) e **mantém o status local sincronizado** (Boleto emitido/Pago/Atrasado). Sincronização por **webhook** (preferencial) + **cron** de reconciliação (rede de segurança).
  - R1.3 O sistema **consulta o saldo** do ASAAS (`GET saldo`) para o indicador (R6.3). 
  - R1.4 Toda fatura é **vinculada ao contrato e ao cliente** (`contrato_id`, `cliente_id`).
  - R1.5 Falha de chamada ASAAS não trava a operação humana: retry + dead-letter + alerta (doc 03); a reconciliação por cron cobre execuções perdidas.

- **F2. Webhook de pagamento → evento `fatura.paga`**
  - R2.1 O webhook ASAAS `payment.received` (ou status equivalente de pago) é recebido pelo adapter, **gravado em `WebhookLog`** e traduzido para o evento de domínio **`fatura.paga`**.
  - R2.2 Ao receber, o sistema marca a `Fatura.status = Pago`, seta a flag `paga = true` e registra data/valor.
  - R2.3 Idempotência: reentrega do mesmo pagamento **não** dispara `fatura.paga` duas vezes (chave por `asaas_id`+evento).
  - R2.4 Notifica a Franciélia (e atualiza o painel em tempo real) que o pagamento entrou.

- **F3. Painel financeiro da Franciélia (boletos pendentes / quem não pagou / fluxo de caixa)**
  - R3.1 O painel lista **boletos pendentes da semana** (filtro por `vencimento` na janela da semana corrente; janela configurável). 
  - R3.2 Para cada boleto, mostra **se a API já enviou no WhatsApp** (`enviada_whatsapp`), **se o cliente respondeu** (`respondida`) e **se pagou** (`paga`) — exatamente as perguntas que a Franciélia faz hoje manualmente ("qual a API já enviou? qual não enviou? qual não respondeu? qual não pagou?").
  - R3.3 Exibe o **valor a receber / fluxo de caixa** da próxima semana e do mês (soma das faturas pendentes por janela) — dado que o Gustavo usa para decisão.
  - R3.4 Permite **reenviar cobrança** (dispara Regra de cobrança WhatsApp) e **dar baixa manual** (com registro em `AuditLog`) quando o pagamento ocorre fora do ASAAS.
  - R3.5 O painel atualiza em **tempo real** (WebSocket) ao chegar webhook de pagamento/resposta, sem refresh manual.
  - R3.6 A "demora de 24h" e o "não chega no inbox" são resolvidos por: pendências **persistentes** no painel + notificação em tempo real (não dependem de a automação "cair" no momento certo).

- **F4. Cobrança via WhatsApp oficial (boleto + PIX + fatura)**
  - R4.1 O sistema envia a cobrança pela **API oficial do WhatsApp** (número verificado — aumenta confiabilidade, pedido do Gustavo), contendo **boleto, chave PIX e fatura** (espelhando o exemplo que o Gustavo elogiou: "renovação → já envia a chave PIX, já chega o boleto, já chega a fatura").
  - R4.2 Ao enviar, seta `enviada_whatsapp = true` + timestamp e registra a thread (`WhatsAppThread`).
  - R4.3 Quando o cliente responde no WhatsApp, a mensagem é roteada ao **inbox financeiro** e seta `respondida = true` (resposta visível no painel).
  - R4.4 O disparo pode ser **manual** (botão "reenviar") ou **agendado** (varredura semanal — Regra de cobrança da semana). Modelo de mensagem é configurável (doc 03).
  - R4.5 🔶 CONFIRMAR cadência automática de cobrança (ex.: X dias antes do vencimento, no vencimento, em atraso) e quantos lembretes — definir com a Franciélia.

- **F5. Nota Fiscal via Speed (emitir + salvar link)**
  - R5.1 Após o pagamento (`fatura.paga`), o sistema **verifica se a NF já foi emitida**; se não, **emite a NF no Speed** com dados do cliente + plano.
  - R5.2 Salva `speed_id`, **link do PDF** e status na entidade `NotaFiscal`, vinculada à `Fatura` — *"salva a nota fiscal dentro do nosso sistema"*.
  - R5.3 A NF emitida pode ser **enviada ao cliente** junto/depois da confirmação de pagamento. 🔶 CONFIRMAR se o envio da NF ao cliente é automático.
  - R5.4 Falha na emissão Speed → retry + alerta; não bloqueia a liberação de onboarding se a regra assim definir. 🔶 CONFIRMAR se NF é pré-requisito do onboarding.

- **F6. Liberar onboarding após pagamento**
  - R6.1 Ao `fatura.paga`, o sistema muda o `Cliente.status do ciclo` para **Onboard** (libera o status de onboarding — "libera o status de onboard").
  - R6.2 Dispara a **cascata operacional de onboarding** (criar projetos/steps de CS/pasta Drive/grupo WhatsApp) — **detalhe no Módulo 14/15**; aqui é o **gatilho por pagamento**.
  - R6.3 🔶 CONFIRMAR a relação com o gatilho **"contrato em vigor"** (Módulo 12, R5.6): na operação atual o onboarding **efetivo** é liberado por **pagamento**; "Em vigor" (assinatura) pode vir antes. Definir com Gustavo qual evento dispara o quê para **não duplicar** a cascata (idempotência por `cliente_id`).

- **F7. Indicadores financeiros**
  - R7.1 **Recebidas no mês** — soma de faturas pagas no mês corrente.
  - R7.2 **A pagar** — soma de `ContaPagar` em aberto no mês.
  - R7.3 **Saldo atual no ASAAS** — do `GET saldo` (R1.3); usado pelo Gustavo para decidir transferências ("a cada X valor gosto de transferir para o Sicredi"). *(O dinheiro fica no banco, não no ASAAS — daí não precisar de Open Finance para o básico.)*
  - R7.4 **Destratos a realizar** — itens de destrato sinalizados (Módulo 12, F7).
  - R7.5 Indicadores atualizam com a sincronização (webhook + cron) e são visíveis a Financeiro/Admin.

- **F8. Centralização: contas a pagar, NF, centro de custo**
  - R8.1 **Contas a pagar** ficam no sistema (cadastro, vencimento, status, **centro de custo**) — fim do controle externo.
  - R8.2 Toda **NF** (emitida ou recebida) é salva e localizável no sistema.
  - R8.3 **Centro de custo** classifica despesas (insumo de Compras — Módulo 20) e dos indicadores.
  - R8.4 🔶 CONFIRMAR centralização de **e-mails** (Hostinger **não tem API** — citado pelo Gustavo): tratar como **fora da v1** ou via outro mecanismo; não bloquear este módulo.

- **F9. Inbox financeiro (mensagens roteadas)**
  - R9.1 Mensagens de WhatsApp classificadas como financeiras "apitam" no recorte financeiro do inbox (a VAI é integradora; sem WhatsApp Web aberto).
  - R9.2 Mostra contagem de pendências de mensagem a resolver.
  - R9.3 Roteamento/infra é do **Módulo 10** (Núcleo/WhatsApp interno); aqui apenas o **recorte/visão** do financeiro.

## 6. Automações envolvidas (motor — doc 03: Trigger → Condições → Ações)

- **Regra F — Liberar Onboarding Após Pagamento** *(equivale ao n8n `[ClickUp] Liberar Onboarding Após Pagamento`)*
  - **Trigger:** Webhook ASAAS `payment.received` → evento `fatura.paga`.
  - **Condições:** fatura existe e estava pendente; pagamento confirmado.
  - **Ações:** (1) buscar fatura + cliente; (2) marcar `Pago` + flags (F2); (3) **Speed**: conferir/emitir NF, salvar `speed_id`/link na `NotaFiscal` (F5); (4) **mudar `Cliente` → Onboard** (libera onboarding); (5) **disparar cascata de onboarding** (projetos + steps CS + pasta Drive + grupo WhatsApp — Módulo 14); (6) notificar Franciélia (pagamento recebido) e CS (novo onboarding, SLA 3h). Idempotente por `asaas_id`.
  - **Muda vs n8n:** sem gravar no ClickUp; NF e boleto **salvos no nosso banco**; CS vem do **squad** do cliente; reconciliação por cron garante que pagamento não se perca.

- **Regra G — Cobrança da Semana (WhatsApp oficial)** *(novo / consolida o disparo de boleto+PIX+fatura)*
  - **Trigger:** Agendado (cron — ex.: segunda de manhã; dia/horário configurável) **ou** manual (botão "reenviar").
  - **Condições:** faturas com `vencimento` na janela da semana e `status` pendente; (na cadência: X dias antes/no vencimento/em atraso — R4.5 🔶).
  - **Ações:** para cada fatura, **WhatsApp oficial**: enviar boleto + PIX + fatura (R4.1); setar `enviada_whatsapp = true`; registrar thread. Idempotência: não reenviar a mesma fatura no mesmo ciclo sem ação manual.
  - **Muda vs n8n:** usa **API oficial** (não Mega API), com modelo de mensagem configurável e status refletido no painel.

- **Regra H — Reconciliação ASAAS (rede de segurança)** *(novo — confiabilidade)*
  - **Trigger:** Agendado (cron periódico).
  - **Condições:** —
  - **Ações:** `GET cobranças` (status/vencimento) + `GET saldo`; sincronizar status local; atualizar indicadores; detectar pagamentos não capturados por webhook → emitir `fatura.paga` faltante (idempotente).

- **Regra I — BPO Financeiro / Organização de Extratos** *(equivale ao n8n `BPO Financeiro | Organização de Extratos`)*
  - **Trigger:** 🔶 CONFIRMAR (cron/upload de extrato/manual) — **detalhe do BPO para clientes** (DRE/conciliação) depende de validação com Gustavo/Franciélia.
  - **Condições/Ações:** organizar/conciliar extratos por cliente de BPO; gerar visão financeira (DRE/conciliação).
  - **Escopo:** **mínimo na v1** (placeholder de migração). O ENTENDIMENTO cita "BPO p/ clientes (DRE, conciliação) — há clientes só de financeiro", mas **sem detalhamento**; marcar como 🔶 CONFIRMAR e não bloquear o painel interno.

## 7. Integrações (doc 04)
| Adapter | Uso neste módulo |
|---|---|
| **ASAAS** | Criar cliente/assinatura/cobrança/fatura; **consultar boletos pendentes** e **saldo**; **webhook** `payment.received` → `fatura.paga`. Salvar `asaas_id`, status, boleto/PIX, vencimento, valor no banco. |
| **Speed (NF-e)** | Emitir NF após pagamento; consultar status; baixar PDF; salvar `speed_id`/link na `NotaFiscal`. |
| **WhatsApp (API oficial)** | Enviar cobrança (boleto + PIX + fatura); receber respostas roteadas ao inbox financeiro; enviar NF/confirmação. |

> Tudo pelo backend/motor com retry, idempotência e log (`WebhookLog`/`JobExecution`); credenciais no cofre (`IntegrationCredential`). **Sandbox/homologação** de ASAAS, Speed e WhatsApp antes de produção (doc 04).

## 8. Campos personalizados / status configuráveis
- **Status da Fatura/Cobranca** (StatusModel, entidade=Fatura; configurável):
  | Status | Tipo | Observação |
  |---|---|---|
  | Boleto emitido | nao_iniciado/andamento | criado no ASAAS, pendente |
  | Pago | concluido | webhook `payment.received` |
  | Atrasado | alteracao/atencao | vencido sem pagamento |
- **Flags da Fatura:** `enviada_whatsapp` (bool+timestamp), `respondida` (bool), `paga` (bool) — pilares do painel (R3.2).
- **Status da NotaFiscal:** pendente / emitida / erro (link PDF salvo).
- **Parâmetros configuráveis (sem dev — doc 03):** dia/horário da varredura de cobrança; **modelos de mensagem** (boleto/PIX/fatura); cadência de lembretes (🔶); janela da "semana"; regra de liberação de onboarding (pagamento vs vigor); mapeamento plano→dados de NF.
- **Indicadores (KPIs):** recebidas no mês, a pagar, saldo ASAAS, destratos a realizar (configuráveis/expansíveis — R7).

## 9. Critérios de aceite
1. **Given** um contrato criado (Módulo 12), **when** a Regra A roda, **then** ASAAS cria cliente/assinatura/cobrança/fatura e a fatura é salva no banco com `asaas_id`, valor, vencimento, meio e boleto/PIX.
2. **Given** segunda de manhã, **when** a Franciélia abre o Painel Financeiro, **then** vê os boletos **pendentes da semana** com cliente, valor, vencimento e as flags **enviado no WhatsApp / respondeu / pagou**, além do **valor a receber** da semana e do mês.
3. **Given** uma fatura pendente, **when** a Regra G dispara (ou ela clica "reenviar"), **then** o cliente recebe **boleto + PIX + fatura** pela **API oficial** do WhatsApp e a fatura fica marcada `enviada_whatsapp = true`.
4. **Given** o cliente paga, **when** chega o webhook ASAAS, **then** o evento `fatura.paga` marca a fatura como Paga em tempo real no painel, emite a NF no Speed (salvando link/`speed_id`) e muda o cliente para **Onboard**, disparando a cascata de onboarding.
5. **Given** reentrega do webhook ASAAS, **then** `fatura.paga` e a cascata **não** executam em duplicidade (idempotência por `asaas_id`/`cliente_id`).
6. **Given** o dashboard de indicadores, **then** mostra **recebidas no mês**, **a pagar**, **saldo atual no ASAAS** e **destratos a realizar**, atualizados pela sincronização.
7. **Given** um pagamento que o webhook não capturou, **when** a Regra H (reconciliação) roda, **then** o status local é corrigido e o `fatura.paga` faltante é emitido sem duplicar.
8. **Given** qualquer NF emitida, **then** seu PDF/link e `speed_id` estão salvos e localizáveis no sistema (centralização) — sem precisar "ir ver no Speed".
9. **Given** falha de ASAAS/Speed/WhatsApp, **then** retry + dead-letter + alerta; a operação humana não trava e nenhuma execução é perdida (doc 03).
10. **Given** um usuário **não** Financeiro/Admin, **then** **não** acessa o painel financeiro nem dados fiscais/faturas (RBAC).
11. Toda baixa manual, reenvio, emissão de NF e mudança de status é registrada em `AuditLog`.

## 10. Fora de escopo (deste módulo / desta fase)
- **Open Finance** — **explicitamente fora da v1** (decisão do Gustavo; o dinheiro fica no banco, ASAAS só como gateway). 
- **Detalhe operacional do onboarding** (steps/medalhas/PDC/pasta Drive/grupo) — Módulo 14/15; aqui só o **gatilho** por pagamento.
- **Centralização de e-mails** (Hostinger sem API) — 🔶 fora da v1 ou via mecanismo a definir; não bloqueia o módulo.
- **BPO completo para clientes** (DRE, conciliação avançada) — **mínimo na v1** (placeholder de migração do `BPO Financeiro`); detalhamento depende de validação com Gustavo/Franciélia (🔶).
- **Compras / solicitação de compra / 3 orçamentos** — Módulo 20 (este módulo só **consome** centro de custo / contas a pagar).
- **Documentos do colaborador** (holerite/cartão-ponto/folha para assinar) — Módulo 10/19 (painel do colaborador), citados na transcrição mas **não** são do financeiro de clientes.
- **Pagamentos de saída / transferências bancárias automáticas** — fora da v1 (Gustavo transfere manualmente para o banco).
- **Editor visual no-code de regras** — fase posterior (doc 03); na v1, parâmetros/mensagens são configuráveis por painel.
