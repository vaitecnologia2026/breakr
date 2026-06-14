# Módulo 11 — Comercial / CRM

> CRM próprio da Breakr para aquisição: pipelines de **inbound** e **prospecção**, **scraping + enriquecimento** de restaurantes, **click-to-call** com scripts, **WhatsApp oficial** para o comercial e **dashboards** de performance.
> Segue o `_TEMPLATE.md` (seções 1–10). Single-tenant. Motor de automação é o próprio (doc 03). O CRM pago atual é **substituído**.

## 1. Objetivo
Dar ao time comercial um **CRM próprio** dentro do Breakr OS para capturar, qualificar e converter leads em clientes, cobrindo dois funis (**inbound** do site/agenda diagnóstica e **prospecção** ativa), com **busca de restaurantes (base Receita Federal) + enriquecimento**, **ligação por VoIP com scripts** e **WhatsApp oficial**, além de **dashboards** de conversão e produtividade do comercial. O fechamento (ganho) entrega o lead para o **Jurídico/Contratos** (Módulo 12).

**Substitui:** o **CRM pago** atual (pipelines, leads/negócios, WhatsApp do comercial, click-to-call, scripts, dashboards). Do **n8n** — os workflows **[Site Breakr] Leads do Site** e **Criação de Lead ClickUp** (captura inbound) e a **Confirmação de Reunião Comercial + Follow Up** passam a ser **regras do motor próprio** (doc 03). O **scraping/enriquecimento** que o Gustavo prototipou (créditos, enriquecimento gratuito ruim) é reconstruído com provedor adequado.

## 2. Atores & permissões
| Cargo | Comercial / CRM: o que pode fazer |
|---|---|
| **Comercial** (cargo do departamento Comercial) | CRUD de Lead e Negocio dos seus pipelines; mover etapas; registrar atividades; **click-to-call** + ver/usar scripts; conversar por **WhatsApp** com o lead; rodar **scraping** por cidade/segmento e importar leads (🔶 sujeito a limite de créditos/permissão); ver seus próprios dashboards. |
| **Gestor comercial / Admin** | Tudo do comercial + ver **dashboards consolidados** (melhor comercial, conversão, negócios abertos por usuário); configurar etapas dos pipelines, scripts, parâmetros de scraping/enriquecimento e créditos; redistribuir leads entre comerciais. |
| **CS / demais cargos** | Sem acesso ao CRM comercial por padrão (acesso só por permissão explícita). O CS entra **depois** do ganho, no onboarding (Módulo 14). |

- **Acesso parcial:** um comercial vê, por padrão, **os leads/negócios de que é dono**; ver a carteira de outros comerciais exige permissão (`crm:ver_todos`). 🔶 CONFIRMAR se comercial vê pipeline do time inteiro ou só o próprio.
- 🔶 **CONFIRMAR** quem pode disparar scraping (custo por crédito) e se há teto por usuário.

## 3. Telas / visões
1. **Pipeline Inbound (board kanban)** — negócios vindos do site/agenda diagnóstica, por etapa; card mostra `codigo_unico`, lead, valor, dono, origem.
2. **Pipeline Prospecção (board kanban)** — negócios de prospecção ativa (incl. os gerados por scraping/importação de lista).
3. **Lista de Leads** — tabela filtrável (origem, status, cidade/segmento, enriquecido?, dono); ações em massa (atribuir dono, mover para pipeline).
4. **Detalhe do Lead/Negócio** — dados + enriquecimento (telefone/Instagram/decisor), **timeline de atividades** (ligações, mensagens, mudanças de etapa), botão **ligar (click-to-call)**, painel de **WhatsApp** do contato, **scripts** de ligação, motivo de ganho/perda.
5. **Scraping / Busca de restaurantes** — formulário: cidade + segmento + porte (ex.: microempresa) → consulta base Receita Federal → mostra **quantidade encontrada** → escolher quantos buscar → **gerar** (consome créditos) → enriquecimento → leads entram numa lista/pipeline de prospecção.
6. **Scripts de ligação** — biblioteca de roteiros (abertura, qualificação, objeções) exibida durante a chamada.
7. **Dashboards comerciais** — melhor comercial, taxa de conversão, negócios abertos, (🔶 valor em pipeline) — consolidado e por usuário.
8. **Config (Admin)** — etapas dos pipelines (configuráveis), scripts, créditos de VoIP/enriquecimento, parâmetros de scraping, regras de atribuição de lead.

## 4. Entidades usadas
Do **doc 02 — Modelo de Dados**:
- **Lead** — origem (inbound site / prospecção / scraping), dados, **status no pipeline**, **dono (comercial)**, **enriquecimento** (telefone/Instagram/decisor). **(CRUD)**
- **Negocio** *(pipeline comercial)* — `lead`, **etapa**, valor, probabilidade, **comercial responsável**, **motivo ganho/perda**. **(CRUD)**
- **Cliente** — criado **no ganho** (nome fantasia, tag, CNPJ/CPF + dados fiscais…). Este módulo **inicia** o Cliente (handoff ao Módulo 12); a criação completa de contrato/projeto é dos Módulos 12/15. **(escreve no ganho)**
- **WhatsAppThread** — conversa do comercial com o lead/contato (API oficial). **(escreve/lê)**
- **AuditLog** — ações de CRM (ganho/perda, redistribuição, scraping). **(escreve)**
- **Notificacao** — novo lead inbound, lead atribuído, follow-up de reunião. **(escreve)**
- Apoio: **Tarefa** subtipo **Reunião** (agenda diagnóstica/comercial — detalhe no Módulo 20), **Config** (parâmetros de créditos/scraping).
- 🔶 **CONFIRMAR** entidades dedicadas a **Script de ligação** e **Ligação/CallLog** (não constam explicitamente no doc 02; propor inclusão — ver seção 8).

## 5. Funcionalidades (regras de negócio numeradas)

### F1. Pipeline Inbound (leads do site / agenda diagnóstica)
- **R1.1** Lead que chega do **site breakr.com.br** ou da **agenda diagnóstica** entra **automaticamente** como **Lead** (origem = inbound) e gera um **Negocio** na **primeira etapa** do pipeline Inbound. (motor A1)
- **R1.2** Todo lead inbound gera **Notificacao** ao comercial responsável (ou à fila de distribuição — R5.x) em tempo real.
- **R1.3** As **etapas** do pipeline são **configuráveis** (nome + ordem) pelo Admin; mover card entre etapas registra atividade na timeline.
- **R1.4** Campos mínimos capturados do formulário do site são preservados (nome, contato, e o que a agenda diagnóstica coletar). 🔶 CONFIRMAR campos exatos do formulário/agenda.

### F2. Pipeline de Prospecção (ativa)
- **R2.1** Negócios de **prospecção** vivem em um pipeline separado do inbound (origem = prospecção/scraping).
- **R2.2** Uma **lista importada** (ou resultado de scraping) popula leads de prospecção que o comercial "puxa" para trabalhar (vira Negocio na etapa inicial de prospecção).
- **R2.3** Etapas configuráveis (como R1.3); um lead pode **migrar de prospecção para inbound** caso responda a uma campanha 🔶 CONFIRMAR (o transcrito não detalha; manter como possível, não obrigatório).

### F3. Captura & gestão de Leads e Negócios
- **R3.1** CRUD de Lead e Negocio com **dono (comercial)** obrigatório; um Negocio referencia exatamente 1 Lead.
- **R3.2** **Ganho:** ao marcar um Negocio como **ganho**, o sistema dispara o handoff comercial→jurídico: registra **motivo de ganho**, e aciona a regra que **inicia o Cliente** (tag) e o **formulário de captação de dados** do contrato (Módulo 12). (motor A3)
- **R3.3** **Perda:** marcar **perda** exige **motivo de perda** (lista configurável); o Negocio é arquivado, mantido para dashboards.
- **R3.4** Todo Negocio recebe **`codigo_unico`** na criação (Módulo 10, F9), anexado ao nome para rastreabilidade.
- **R3.5** A **timeline** do lead/negócio registra automaticamente: criação, mudanças de etapa, ligações (R6), mensagens de WhatsApp (R7), e-mails 🔶, e notas manuais.

### F4. Scraping de restaurantes (Receita Federal) + enriquecimento
- **R4.1** O comercial define **cidade + segmento + porte** (ex.: "restaurantes em Porto Alegre, microempresa") e o sistema consulta a **base da Receita Federal** retornando a **quantidade total encontrada** antes de gerar.
- **R4.2** O comercial escolhe **quantos leads buscar**; a geração **consome créditos** e cria os Leads (origem = scraping) numa **lista de prospecção**.
- **R4.3** Após a busca, roda **enriquecimento**: telefone, **Instagram**, **decisor** (nome do responsável). O enriquecimento gratuito atual é insatisfatório → usar **provedor pago**. 🔶 **CONFIRMAR provedor** (referência: birô/Serasa ~R$1,20/lead) **e custo/lead**.
- **R4.4** Lead enriquecido é marcado como tal; campos vazios não bloqueiam (enriquecimento é best-effort).
- **R4.5** 🔶 **LGPD:** definir e registrar **base legal** para prospecção (legítimo interesse) e política de retenção/opt-out dos dados raspados/enriquecidos (ver doc 01 — Segurança & LGPD). Bloqueante para go-live do scraping.
- **R4.6** Controle de **créditos**: o sistema mostra saldo e debita por geração/enriquecimento; sem saldo, a ação é bloqueada com erro claro. 🔶 CONFIRMAR modelo de créditos do(s) provedor(es).

### F5. Atribuição & distribuição de leads
- **R5.1** Lead inbound é atribuído a um comercial por **regra configurável** (round-robin, por região, ou manual). 🔶 CONFIRMAR critério (o transcrito não especifica).
- **R5.2** Admin/gestor pode **redistribuir** leads/negócios entre comerciais (ação auditada — R3 do Módulo 10).
- **R5.3** Um comercial vê por padrão sua carteira; visão do time depende de permissão (R2 da seção 2).

### F6. Click-to-call (VoIP) + scripts
- **R6.1** No detalhe do lead/negócio, o comercial **liga com um clique** (click-to-call) via provedor VoIP, debitando **créditos** (R$/min). 🔶 **CONFIRMAR provedor** (protótipo usava "IPECAL"/créditos — doc 04 #7).
- **R6.2** Durante/antes da chamada, o sistema exibe os **scripts de ligação** (abertura, qualificação, objeções) configurados.
- **R6.3** Cada ligação gera um **registro** (CallLog 🔶) na timeline: data, duração, resultado/disposição, comercial. 🔶 CONFIRMAR captura de gravação/duração via API do provedor.
- **R6.4** Sem créditos de VoIP, o botão de ligar é desabilitado com aviso.

### F7. WhatsApp oficial para o comercial
- **R7.1** O comercial conversa com o lead/contato por **WhatsApp API oficial** dentro do CRM (envio de "oi" inicial, recebimento quando o lead chama) — **sem WhatsApp Web**. (doc 04 #3; integra ao inbox do Módulo 10)
- **R7.2** Mensagens trocadas aparecem na **timeline** do lead/negócio e em `WhatsAppThread`.
- **R7.3** Roteamento: threads do comercial são da **área Comercial** (Módulo 10, R5.4); só o comercial dono (e quem tem permissão) as vê. 🔶 CONFIRMAR se thread é por dono do lead ou por área inteira.

### F8. Dashboards comerciais
- **R8.1** **Melhor comercial:** ranking por nº de ganhos (e 🔶 valor fechado), no período filtrado.
- **R8.2** **Taxa de conversão:** ganhos ÷ negócios trabalhados, por pipeline e por comercial.
- **R8.3** **Negócios abertos:** quantidade e (🔶) valor em pipeline, por etapa e por comercial.
- **R8.4** Dados derivam **somente** de Negocio/Lead reais do sistema — corrige o problema atual de "parece que vendi, mas não funciona" (números inconsistentes do CRM pago). Nenhum número fabricado.
- **R8.5** Gestor/Admin vê consolidado e por usuário; comercial vê o próprio (R5.3).

## 6. Automações envolvidas (regras do motor — doc 03)
Formato **Trigger → Condições → Ações**.

- **A1. Captura de lead inbound (site / agenda diagnóstica)**
  - **Trigger:** webhook de entrada (form do site / agenda diagnóstica preenchidos) → evento `lead.recebido`.
  - **Condições:** origem inbound; deduplicação por contato (idempotência — não criar lead duplicado).
  - **Ações:** criar **Lead** (origem=inbound) + **Negocio** na etapa inicial do pipeline Inbound; gerar `codigo_unico`; **atribuir** comercial (R5.1); criar **Notificacao** em tempo real.
  - *Equivalência hoje:* **[Site Breakr] Leads do Site** e **Criação de Lead ClickUp** (n8n) → migram para o motor.

- **A2. Confirmação de reunião comercial + follow-up**
  - **Trigger:** agendamento de reunião comercial / agenda diagnóstica → pipeline temporal (cron/temporal).
  - **Condições:** reunião futura confirmada.
  - **Ações:** mensagens de lembrete em **WhatsApp** nos intervalos (48h/24h/3h/1h30/30min/15min) + link da reunião; atualizar timeline.
  - *Equivalência hoje:* **[ClickUp] Confirmação de Reunião Comercial + Follow Up** (n8n, hoje ⏸️) → motor. 🔶 CONFIRMAR a régua exata de intervalos para o comercial (a régua 48h…15min vem do fluxo de reuniões com clientes).

- **A3. Handoff de ganho (comercial → jurídico/contrato)**
  - **Trigger:** evento `negocio.ganho`.
  - **Condições:** motivo de ganho preenchido.
  - **Ações:** **iniciar Cliente** (tag) a partir do Negocio/Lead; abrir o **formulário de captação de dados** do contrato e disparar a regra "Criação e Cadastro de Contrato" (Módulo 12 / motor); notificar Jurídico.
  - *Equivalência hoje:* início da pasta n8n **"1 - Criação e Onboarding"** (Criação e Cadastro de Contrato).

- **A4. Scraping + enriquecimento**
  - **Trigger:** manual/botão (`scraping.solicitado`) com cidade+segmento+porte+quantidade.
  - **Condições:** créditos suficientes; permissão do usuário (🔶 R2/R4.6).
  - **Ações:** consultar Receita Federal (adapter); criar Leads (origem=scraping) na lista de prospecção; chamar adapter de **enriquecimento**; debitar créditos; registrar em `JobExecution`/`AuditLog`.

> **Centralização (doc 04):** resultados de scraping/enriquecimento, ligações e mensagens são **salvos no banco** — o comercial nunca depende de "ir ver no provedor".

## 7. Integrações (doc 04)
- **WhatsApp — API oficial** (#3): conversa do comercial com o lead; integra ao inbox/roteamento do Módulo 10 (área Comercial). (R7)
- **VoIP / Telefonia — click-to-call** (#7): ligar a partir do CRM, créditos R$/min, scripts; 🔶 CONFIRMAR provedor (IPECAL?) e captura de duração/gravação. (R6)
- **Enriquecimento de leads** (#8): busca por cidade/segmento na base **Receita Federal** + enriquecimento (telefone/Instagram/decisor); 🔶 CONFIRMAR provedor pago e custo/lead; **LGPD** (base legal/retenção). (F4)
- **(Inbound) Webhook do site / agenda diagnóstica** — entrada do form (A1); não é "adapter de terceiro" externo, mas endpoint de entrada do motor (doc 03).
- 🔶 **E-mail** (sequências/contato comercial): **fora de escopo** na v1 salvo confirmação (Hostinger sem API).

## 8. Campos personalizados / status configuráveis
- **Status/Etapas (configuráveis via `StatusModel`/config de pipeline):**
  - **Pipeline Inbound** e **Pipeline Prospecção** têm conjuntos de etapas **configuráveis** (nome + cor + ordem). 🔶 CONFIRMAR as etapas-padrão de cada pipeline (não documentadas em detalhe).
  - **Negocio.resultado:** `aberto` / `ganho` / `perdido`.
- **Campos do Lead:** origem (inbound/prospecção/scraping), cidade, segmento, porte, telefone, Instagram, **decisor**, `enriquecido` (bool), dono.
- **Campos do Negocio:** valor, probabilidade, etapa, comercial, **motivo de ganho/perda** (listas configuráveis).
- **Tags:** segmento/origem para filtro de dashboards.
- 🔶 **Entidades a confirmar no doc 02:** **Script** (biblioteca de roteiros de ligação) e **CallLog/Ligação** (registro de chamadas VoIP) — necessárias para R6.2/R6.3, mas não listadas no modelo de dados atual. Recomenda-se incluí-las.

## 9. Critérios de aceite
1. **Inbound automático:** Given um lead preenche a agenda diagnóstica no site, When o form é enviado, Then um Lead (origem=inbound) + Negocio na etapa inicial são criados, com `codigo_unico`, e o comercial recebe Notificacao em tempo real — sem ação manual. (R1.1–R1.2, A1)
2. **Sem duplicado:** Given o mesmo contato envia o form duas vezes, When chega o segundo evento, Then **não** é criado lead duplicado (idempotência). (A1)
3. **Pipelines separados:** Given um lead de prospecção e um de inbound, When o comercial abre os boards, Then cada um aparece no seu pipeline com etapas configuráveis distintas. (R1.3, R2.1)
4. **Ganho → handoff:** Given um Negocio marcado como **ganho** com motivo, When salvo, Then o Cliente (tag) é iniciado e o fluxo de contrato (Módulo 12) é acionado, com Jurídico notificado. (R3.2, A3)
5. **Perda exige motivo:** Given um Negocio movido para **perdido** sem motivo, When tenta salvar, Then o sistema bloqueia até informar o motivo. (R3.3)
6. **Scraping:** Given "restaurantes em Porto Alegre, microempresa", When o comercial busca, Then o sistema mostra a quantidade total encontrada (base Receita Federal), permite escolher quantos gerar, debita créditos e cria os Leads na lista de prospecção. (R4.1–R4.2, A4)
7. **Enriquecimento:** Given leads gerados por scraping, When o enriquecimento roda, Then telefone/Instagram/decisor são preenchidos quando disponíveis e o lead é marcado como enriquecido (campos faltantes não quebram o fluxo). (R4.3–R4.4)
8. **LGPD bloqueante:** Given o scraping/enriquecimento, When for para produção, Then há base legal e política de retenção/opt-out definidas e registradas. (🔶 R4.5)
9. **Créditos:** Given saldo zero de créditos, When o comercial tenta gerar scraping ou ligar, Then a ação é bloqueada com mensagem clara. (R4.6, R6.4)
10. **Click-to-call + script:** Given um lead com telefone, When o comercial clica em ligar, Then a chamada é iniciada via VoIP, o script é exibido e a ligação é registrada na timeline. (R6.1–R6.3)
11. **WhatsApp comercial:** Given um lead, When o comercial envia mensagem pela API oficial, Then a conversa aparece na timeline e em `WhatsAppThread`, roteada para a área Comercial — sem WhatsApp Web. (R7.1–R7.3)
12. **Dashboards reais:** Given os negócios do período, When o gestor abre os dashboards, Then vê melhor comercial, taxa de conversão e negócios abertos calculados **apenas** sobre dados reais, sem números inconsistentes. (R8.1–R8.4)
13. **Acesso:** Given um comercial sem `crm:ver_todos`, When abre o CRM, Then vê apenas sua carteira; o gestor vê o consolidado. (R5.3, seção 2)

## 10. Fora de escopo (deste módulo / desta fase)
- **Criação completa de contrato/projeto/onboarding** — pertence aos Módulos 12 (Contratos) e 14/15; aqui só o **handoff de ganho** (A3).
- **Sequências de e-mail / cadência multicanal** automatizadas — 🔶 fora da v1 salvo confirmação (Hostinger sem API de e-mail).
- **Discador preditivo / call center** — v1 é **click-to-call** simples por lead.
- **Lead scoring por IA / priorização automática** — não documentado; fora da v1 (a IA da v1 é a de **tráfego**, Módulo 17).
- **Integração com outros CRMs** — o objetivo é **substituir** o CRM pago, não integrar.
- **Definição final de provedores** (VoIP, enriquecimento) e **modelo de créditos** — 🔶 CONFIRMAR antes do go-live (doc 04 #7 e #8).
- **Etapas-padrão dos pipelines** e **régua de follow-up comercial** — 🔶 CONFIRMAR com o time comercial da Breakr.
