# Módulo 12 — Jurídico / Contratos

> Especificação técnica (SOW). Segue o `_TEMPLATE.md` (seções 1–10). Baseado em: `ENTENDIMENTO-DO-PROJETO.md` (módulo 3), doc 02 (entidades `Cliente`, `Contrato`, `Fatura`, `Plano`), doc 03 (motor), doc 04 (Google Docs, Autentique, ASAAS, WhatsApp) e na transcrição `Screen Recording 2026-06-11 at 08.59.17.txt`. **Single-tenant** (sem `empresa_id`).

## 1. Objetivo
Centralizar todo o ciclo de vida contratual da Breakr: do **formulário de captação de dados** (cliente fechado em reunião) à criação do **Cliente (tag)**, geração de **um ou mais contratos** a partir de template (Google Docs com replace de tags → PDF), assinatura via **Autentique**, **revisão humana da Franciélia** e transição para **"Em vigor"**, que dispara a cascata de onboarding (projetos + tasks de CS + grupo de WhatsApp). Inclui **renovação automática** 45 dias antes do vencimento.

**Substitui:**
- **ClickUp** — a "Lista/Processo de Captação de Dados" da Área Jurídica (Departamento Administração), o cartão de contrato manual e o controle de status por mudança de cor/coluna.
- **n8n** — os workflows `[ClickUp] Criação e Cadastro de Contrato`, `[ClickUp] Envio do Contrato para Assinatura` e `[ClickUp] Renovação de Contratos` (a parte de pagamento/onboarding é compartilhada com o Módulo 13). Reimplementados como **Regras do motor próprio** (doc 03).

## 2. Atores & permissões
| Cargo | Pode |
|---|---|
| **Jurídico / Admin** (Fran, Gustavo) | Ver/criar/editar tudo: formulário de captação, contratos, templates de contrato, cláusulas, configuração de status e da regra de renovação. Disparar reenvio de assinatura. Destrato/encerramento. |
| **Financeiro** (Franciélia) | **Revisão humana**: recebe pop-up em tempo real, abre o contrato gerado, confere/corrige dados e **libera para assinatura** (avança o status). Vê todos os contratos e suas faturas (cruza com Módulo 13). Não edita o template-base. |
| **CS** | **Acesso PARCIAL** — vê apenas as **cláusulas estruturadas** do contrato do(s) cliente(s) do **seu squad** (vigência, valor, escopo/entregáveis, regra de renovação, multa/destrato). **Não** vê o PDF completo nem dados fiscais sensíveis. Recebe o alerta de renovação (45d). 🔶 CONFIRMAR com Gustavo se CS vê "documento" ou "só cláusulas" (questão em aberto no ENTENDIMENTO).
| **Comercial** | Pode **abrir/preencher o formulário de captação** do cliente que fechou. Não acessa cláusulas após criação. 🔶 CONFIRMAR se quem preenche é Comercial ou Jurídico. |
| **Cliente** | Não acessa este módulo. Assina via link externo do Autentique (não há tela do Portal aqui na v1). |

> Permissões são por **Cargo** (doc 02) via RBAC (doc 01). Acesso do CS é filtrado por `squad_id` do cliente.

## 3. Telas / visões
1. **Formulário de Captação de Dados** — form interno (não é o lead do site) preenchido após o "sim" em reunião. Captura dados do cliente (nome fantasia, razão social, CNPJ/CPF, dados fiscais, contato/WhatsApp, endereço), seleção de **Plano(s)** e **quantos contratos** gerar (1 ou 2 — ex.: Marketing + Gestão). É a porta de entrada do fluxo.
2. **Lista de Contratos** (board por status) — colunas = status do contrato (ver §8). Cada card mostra `codigo_unico`, cliente, plano, valor, vencimento, responsável pela revisão. Filtros por status, squad, cliente, vencimento.
3. **Detalhe do Contrato** — dados do cliente, plano e valor; **cláusulas estruturadas**; link do documento (Google Docs/PDF); `autentique_id` e status de assinatura; faturas vinculadas (Módulo 13); histórico/auditoria; botões de ação (Liberar p/ assinatura, Reenviar, Encerrar/Destrato).
4. **Pop-up de revisão (tempo real)** — overlay/toast via WebSocket no painel da Franciélia: *"Atenção, Franciélia: novo contrato disponível para averiguação. Favor conferir e liberar para assinatura."* com link direto ao detalhe.
5. **Painel "Hoje & Atrasados" (recorte Jurídico/Financeiro)** — contratos aguardando revisão, em assinatura há mais de X, renovações a vencer.
6. **Config de Templates de Contrato** — cadastro de templates (por tipo de plano), com mapa de **tags → campos** (ex.: `{{nome_fantasia}}`, `{{valor}}`, `{{vigencia}}`). Editável por Admin sem dev (doc 03).
7. **Config da Regra de Renovação** — parâmetro de antecedência (default **45 dias**), ligado/desligado, modelo de alerta ao CS.

## 4. Entidades usadas (doc 02)
- **Cliente** — cria/atualiza: `nome_fantasia`, `tag` (cor), `plano_id`, `squad_id`, `status do ciclo` (Novo→Onboard→…), CNPJ/CPF + dados fiscais, grupo WhatsApp (id), pasta Drive (link). **Atribuição de squad** por auto-balanceamento (ver Módulo 14/05; consumido aqui na cascata).
- **Plano** — lê `nome` (Brasa, Híbrido…), `valor`, `ciclo`, `entregaveis[]`, `tipos de projeto que gera`. Define valor da cobrança e os projetos a criar.
- **Contrato** — cria/atualiza: `cliente_id`, `plano_id`, `status`, `link do documento` (Docs/PDF), `autentique_id`, `data início/fim`, `vencimento`, `renovação automática` (bool), **`clausulas`** (campos estruturados p/ acesso parcial do CS), `codigo_unico`.
- **Fatura/Cobranca** — criada na captação (via ASAAS) e vinculada ao contrato (`contrato_id`); detalhada no Módulo 13. Aqui apenas referenciada/exibida.
- **Projeto**, **Tarefa** (subtipos `OnboardingStep`, tasks de CS), **Onboarding**, **WhatsAppThread** (`wa_group_id`) — **escritas pela cascata** disparada em "Em vigor" (detalhe operacional no Módulo 14/15; aqui só o gatilho).
- **AutomacaoRule / JobExecution / WebhookLog** — regras e logs do motor (doc 03).
- **Notificacao** — pop-up/alertas (Franciélia, CS).
- **AuditLog** — toda transição de status e edição de cláusula.

## 5. Funcionalidades (regras de negócio numeradas)

- **F1. Formulário de Captação → cria Cliente (tag)**
  - R1.1 Ao submeter o formulário, o sistema cria (ou atualiza, se já existir CNPJ) **1 Cliente** com `status do ciclo = Novo` e gera/atribui a **tag** do cliente.
  - R1.2 O nome fantasia é **padronizado** automaticamente (capitalização/trim) na gravação — eliminando a "padronização manual" que o Gustavo faz hoje no ClickUp ("tenho horror de letra minúscula").
  - R1.3 O formulário permite indicar **1 ou 2 contratos** a gerar (ex.: dois planos/escopos para o mesmo cliente). Cada contrato indicado vira um registro `Contrato` separado, **todos ligados ao mesmo `cliente_id`**.
  - R1.4 Cada `Contrato` recebe `codigo_unico` anexado ao nome na criação (rastreabilidade — doc 02).
  - R1.5 Campos fiscais obrigatórios (CNPJ/CPF, razão social) são validados antes de seguir; faltando obrigatório, bloqueia submissão com mensagem clara.
  - R1.6 O envio do formulário **dispara** a Regra A (§6) — equivalente ao webhook que hoje roda "por trás do clique" no ClickUp.

- **F2. Geração do contrato a partir de template (Google Docs → replace → PDF)**
  - R2.1 Para cada contrato, o sistema seleciona o **template** correspondente ao **plano** (switch por plano — ver R6.A.3) e gera um documento no Google Docs a partir dele.
  - R2.2 As **tags** do template (`{{...}}`) são substituídas (replace) pelos dados normalizados do cliente/plano/valor via API do Google Docs. O conjunto de tags é configurável (Config de Templates).
  - R2.3 O **valor** preenchido vem do **Plano** (ex.: "Brasa" → R$ 2.709,00 conforme regra de plano configurável; **não** hard-coded no código — parâmetro do motor/Plano). 🔶 CONFIRMAR tabela oficial de valores por plano com a Franciélia.
  - R2.4 Gerado o documento, o sistema **salva o link** no `Contrato.link_documento` e avança o status para **"Contrato criado"**.
  - R2.5 Se a geração do documento falhar/atrasar, a ação entra em **retry** (loop com timeout) sem perder a execução (doc 03) — corrige o problema relatado de "às vezes demorava e não ia".

- **F3. Revisão humana (Franciélia) com pop-up em tempo real**
  - R3.1 Ao entrar em **"Contrato criado"**, o sistema emite uma **Notificacao + pop-up em tempo real (WebSocket)** ao(s) usuário(s) de cargo Financeiro/Jurídico responsável(is): *"novo contrato disponível para averiguação"*.
  - R3.2 O pop-up **não depende** de a Franciélia estar com a tela aberta no momento certo: além do toast em tempo real, fica como **pendência persistente** no painel "Hoje & Atrasados" até ser tratada (resolve a dor de "a automação não chega no inbox / demora 24h").
  - R3.3 A Franciélia abre o contrato, confere/edita dados e **cláusulas**, e então aciona **"Liberar para assinatura"** → status muda para **"Em assinatura"** (este é o gatilho da Regra B, §6).
  - R3.4 Enquanto em **"Em revisão"**, o sistema **não** envia para o Autentique (humano no loop — princípio do doc 00).
  - R3.5 Toda edição de cláusula/dado e a ação de liberar são gravadas no `AuditLog` (ator + antes/depois).

- **F4. Assinatura via Autentique e retorno → "Em vigor"**
  - R4.1 Ao entrar em **"Em assinatura"**, o sistema converte o doc para **PDF** e cria o documento no **Autentique**, guardando `autentique_id` e atualizando `Contrato.link_documento`.
  - R4.2 Envia o contrato para assinatura das partes (Breakr + cliente). 🔶 CONFIRMAR se o envio ao cliente é automático nesta etapa (na transcrição: "nesse momento ainda não envia pro cliente… seria legal enviar") — **decisão: enviar automaticamente** salvo config em contrário.
  - R4.3 O **retorno de assinatura** do Autentique (hoje inexistente) é implementado via **webhook (preferencial) com fallback de polling** (doc 04). Ao detectar **todas as partes assinadas**, emite o evento de domínio `contrato.assinado`.
  - R4.4 `contrato.assinado` muda o status para **"Em vigor"** automaticamente (sem ação manual) e dispara a **cascata de onboarding** (Regra C, §6).
  - R4.5 Idempotência: reentrega do webhook do Autentique **não** dispara a cascata duas vezes (chave por `autentique_id`+evento — doc 03).

- **F5. Cascata pós-"Em vigor" (criação de projetos + tasks CS + grupo WhatsApp)**
  > Orquestrada pelo motor; o detalhe operacional dos steps de onboarding vive no Módulo 14. Aqui ficam as regras do **gatilho** e do **encadeamento**.
  - R5.1 Ao entrar em **"Em vigor"**, cria os **Projetos** do cliente conforme `Plano.tipos_de_projeto` (Financeiro/Marketing/Gestão, até 3) com seus entregáveis (Módulo 15).
  - R5.2 Cria os **OnboardingSteps/tasks de CS** padrão (alinhamento de expectativa, briefing, coleta de acessos, produção de materiais, integrações).
  - R5.3 Resolve o **CS do squad** do cliente (via `Cliente.squad_id` → `Squad.membros[função=CS]`) e **cria o grupo de WhatsApp** com esse CS como admin (Módulo 14 detalha descrição/link/mensagem). Substitui o "CS geral fixo" do n8n atual.
  - R5.4 Notifica o CS com **SLA de onboarding de 3h** (parâmetro configurável — doc 03).
  - R5.5 Se o cliente ainda **não tiver squad** definido no momento, dispara o **auto-balanceamento** (squad com menos clientes — Módulo 14) antes de criar o grupo. 🔶 CONFIRMAR ordem: a transcrição mostra o Gustavo definindo squad manualmente porque "não consegue no ClickUp"; no Breakr OS isso é automático.
  - R5.6 A cobrança/NF/liberação de onboarding por **pagamento** é tratada no Módulo 13 (evento `fatura.paga`); a cascata de "Em vigor" aqui é a parte **contratual** (projetos/tasks/grupo). 🔶 CONFIRMAR com Gustavo a ordem desejada entre "assinatura→em vigor" e "pagamento→libera onboarding" (na operação atual o onboarding efetivo é liberado **após pagamento**; "Em vigor" pode preceder o pagamento).

- **F6. Renovação automática (45 dias antes do vencimento)**
  - R6.1 Diariamente, o agendador verifica contratos **"Em vigor"** com `renovação automática = true` cujo `vencimento` esteja a **≤ 45 dias** (parâmetro configurável).
  - R6.2 Ao atingir o gatilho, muda o status para **"Renovação"** e **alerta o CS** do squad (cláusula de renovação automática), para condução com o cliente.
  - R6.3 O parâmetro de antecedência (45d) e o modelo de mensagem são editáveis por painel, sem dev (doc 03).
  - R6.4 Não dispara renovação duplicada para o mesmo ciclo de vencimento (idempotência por `contrato_id`+vencimento).
  - R6.5 🔶 CONFIRMAR se "renovação automática" gera **novo contrato/nova vigência** automaticamente ou apenas **sinaliza** o CS para renovar (a transcrição indica apenas mudança de status + alerta; assumir **sinaliza**, sem gerar documento novo na v1).

- **F7. Encerramento / Destrato**
  - R7.1 Admin/Jurídico pode mover o contrato para **"Encerrado"** (fim de vigência sem renovação) ou registrar **destrato** (encerramento antecipado).
  - R7.2 O destrato gera um **item de "destrato a realizar"** consumido pelo indicador do Módulo 13 (Franciélia acompanha destratos).
  - R7.3 Encerrar contrato **não** apaga histórico (auditoria + itens relacionados permanecem).
  - R7.4 🔶 CONFIRMAR efeito do encerramento sobre Cliente/Projetos (inativar cliente? pausar projetos? cancelar assinatura no ASAAS?).

## 6. Automações envolvidas (motor — doc 03: Trigger → Condições → Ações)

- **Regra A — Criação e Cadastro de Contrato** *(equivale ao n8n `[ClickUp] Criação e Cadastro de Contrato`)*
  - **Trigger:** Webhook de entrada — submissão do **Formulário de Captação** (ou mudança de status do form para "Confirmação de produção").
  - **Condições:** dados obrigatórios válidos (R1.5); plano reconhecido.
  - **Ramificação (switch por Plano):** ex. Brasa vs Híbrido → define valor, template e tipos de projeto.
  - **Ações:** (1) normalizar/padronizar dados; (2) **criar/atualizar Cliente** + tag (R1.1–1.2); (3) **ASAAS**: criar cliente → assinatura → cobrança → fatura (delegado ao Módulo 13/adapter ASAAS); (4) **Google Docs**: gerar doc por template + replace (F2); (5) **criar Contrato(s)**, vincular ao cliente, gerar `codigo_unico`, salvar link; (6) **mudar status** Confirmação de produção → **Contrato criado**; (7) **notificar Franciélia** (pop-up — Regra D).
  - **Muda vs n8n:** sem gravar no ClickUp; tudo no banco próprio. Cobrança "puxada" do ASAAS de forma centralizada (Módulo 13). Switch de plano por **parâmetro configurável** (não JavaScript hard-coded).

- **Regra B — Envio do Contrato para Assinatura** *(equivale ao n8n `[ClickUp] Envio do Contrato para Assinatura`)*
  - **Trigger:** Mudança de status do contrato **"Em revisão" → "Em assinatura"** (ação manual da Franciélia, R3.3).
  - **Condições:** documento existe; dados fiscais presentes.
  - **Ações:** (1) buscar contrato + dados do cliente/fiscais; (2) **converter Docs → PDF**; (3) **Autentique**: criar documento, guardar `autentique_id`; (4) **loop com timeout** até o doc existir (substitui o `if/loop` do n8n, agora com **timeout** definido — corrige loop infinito relatado); (5) **salvar link**; (6) enviar para assinatura das partes (R4.2).
  - **Muda vs n8n:** adiciona **timeout** ao loop; adiciona **retorno de assinatura** (Regra B2) que hoje não existe.

- **Regra B2 — Retorno de Assinatura → Em vigor** *(novo — hoje inexistente)*
  - **Trigger:** Webhook do **Autentique** (`documento assinado`) — fallback polling.
  - **Condições:** **todas** as partes assinaram; `autentique_id` corresponde a um contrato "Em assinatura".
  - **Ações:** (1) emitir evento `contrato.assinado`; (2) mudar status → **"Em vigor"**; (3) gravar data de assinatura. (idempotente — R4.5).

- **Regra C — Cascata de Onboarding (contratual)** *(parte do pipeline; complementa o n8n `Liberar Onboarding Após Pagamento`, cuja porção fiscal/NF está no Módulo 13)*
  - **Trigger:** Evento de domínio `contrato.assinado` (status "Em vigor").
  - **Condições:** cliente com squad definido (senão, auto-balancear — R5.5).
  - **Ações:** criar Projetos (R5.1) → criar OnboardingSteps/tasks CS (R5.2) → criar **grupo WhatsApp** + add CS admin + descrição + link (R5.3, adapter WhatsApp) → atualizar Cliente (grupo) → notificar CS com **SLA 3h** (R5.4).
  - **Muda vs n8n:** o CS sai do **squad do cliente** (não um CS geral fixo); número de WhatsApp do CS vem do cadastro do `Usuario` (sem editar JavaScript a cada novo CS, como hoje).

- **Regra D — Pop-up de Revisão para a Franciélia**
  - **Trigger:** Mudança de status do contrato para **"Contrato criado"**.
  - **Condições:** —
  - **Ações:** criar `Notificacao` + **emitir pop-up WebSocket** ao cargo Financeiro/Jurídico (R3.1) + criar pendência no painel (R3.2).

- **Regra E — Renovação de Contratos** *(equivale ao n8n `[ClickUp] Renovação de Contratos`)*
  - **Trigger:** Agendado (cron diário) / Temporal.
  - **Condições:** status "Em vigor" + `renovação automática = true` + `vencimento` ≤ **45 dias** (param.).
  - **Ações:** mudar status → **"Renovação"**; **alertar CS** do squad (R6.2). Idempotente por ciclo (R6.4).

## 7. Integrações (doc 04)
| Adapter | Uso neste módulo |
|---|---|
| **Google Docs / Drive** | Gerar contrato a partir de template + **replace** de tags; exportar **PDF**; (pasta padrão do cliente é criada na cascata — Módulo 14). |
| **Autentique** | Criar documento p/ assinatura, enviar às partes, **receber retorno de assinado** (webhook + polling) → `contrato.assinado`. |
| **WhatsApp (API oficial)** | Na cascata: criar grupo do cliente, adicionar CS como admin, enviar descrição/link, avisar CS (SLA 3h). |
| **ASAAS** | Disparado na Regra A (criar cliente/assinatura/cobrança/fatura). **Detalhe e propriedade no Módulo 13**; aqui é consumo. |

> Todas as chamadas passam pelo backend/motor com retry, idempotência e log (`WebhookLog`/`JobExecution`). Credenciais no cofre (`IntegrationCredential`).

## 8. Campos personalizados / status configuráveis
- **Status do Contrato** (StatusModel, entidade=Contrato; configurável nome+cor+ordem+tipo):
  | Status | Tipo | Observação |
  |---|---|---|
  | Confirmação de produção | nao_iniciado | estado inicial após captação; dispara Regra A |
  | Contrato criado | andamento | doc gerado; dispara pop-up Franciélia (Regra D) |
  | Em revisão | revisao_interna | Franciélia confere/edita (humano no loop) |
  | Em assinatura | aguardando_externo | enviado ao Autentique (Regra B) |
  | **Em vigor** | concluido | assinado; dispara cascata (Regra C) |
  | Renovação | andamento | 45d antes do vencimento (Regra E) |
  | Encerrado | concluido | fim de vigência/destrato |
- **Cláusulas estruturadas** (campos do `Contrato` p/ acesso parcial do CS): `vigencia_inicio`, `vigencia_fim`/`vencimento`, `valor`, `ciclo`, `escopo/entregaveis`, `renovacao_automatica` (bool), `multa_destrato`, `aviso_previo`. 🔶 CONFIRMAR conjunto exato de cláusulas com o Jurídico.
- **Tags:** `tag` do Cliente (cor); `codigo_unico` no nome do contrato.
- **Templates de contrato:** entidade de configuração (template Docs + mapa de tags) por **plano**; editável por Admin (doc 03).

## 9. Critérios de aceite
1. **Given** um formulário de captação válido com 2 planos, **when** submetido, **then** é criado 1 Cliente (tag, nome padronizado) e 2 Contratos vinculados, cada um com `codigo_unico`, e os respectivos registros ASAAS são criados (Módulo 13).
2. **Given** o plano "Brasa", **when** o contrato é gerado, **then** o template correto é usado e todas as tags `{{...}}` são substituídas pelos dados corretos, o valor reflete o Plano e o PDF/link é salvo no contrato.
3. **Given** um contrato que entra em "Contrato criado", **then** a Franciélia recebe pop-up em tempo real **e** o item aparece como pendência persistente no painel, mesmo que ela não estivesse com a tela aberta.
4. **Given** a Franciélia em "Em revisão", **when** ela clica "Liberar para assinatura", **then** o status vai para "Em assinatura", o PDF é criado no Autentique (com `autentique_id` salvo) e enviado às partes; **enquanto em "Em revisão" nada é enviado ao Autentique**.
5. **Given** todas as partes assinam no Autentique, **then** chega o retorno (webhook/polling), o contrato vai para "Em vigor" automaticamente e a cascata cria projetos + tasks de CS + grupo de WhatsApp com o **CS do squad** como admin, notificando-o com SLA 3h.
6. **Given** reentrega do webhook do Autentique, **then** a cascata **não** é executada em duplicidade (idempotência).
7. **Given** um contrato "Em vigor" com renovação automática e vencimento em 45 dias, **when** o cron roda, **then** o status muda para "Renovação" e o CS do squad é alertado — sem duplicar no mesmo ciclo.
8. **Given** um usuário CS, **when** abre o contrato de um cliente do seu squad, **then** vê apenas as cláusulas estruturadas (não o PDF completo nem dados fiscais), e **não** vê contratos de outros squads.
9. **Given** falha temporária na geração do Doc/PDF ou no Autentique, **then** a ação faz retry com timeout e **não** perde a execução; após N falhas vai para dead-letter com alerta (doc 03).
10. Toda transição de status e edição de cláusula é registrada em `AuditLog` (ator, antes/depois, timestamp).

## 10. Fora de escopo (deste módulo / desta fase)
- **Detalhe operacional do onboarding** (steps, medalhas/PDC, calendário do cliente, descrição/link do grupo) — Módulo 14 (CS/Onboarding/Portal). Aqui só o **gatilho** e o encadeamento.
- **Criação de ASAAS / NF / liberação por pagamento** — Módulo 13 (Financeiro/BPO). Aqui apenas referência/consumo.
- **Auto-criação detalhada de Projetos e entregáveis** — Módulo 15.
- **Editor visual no-code de regras** (arrastar gatilho→ação) — fase posterior (doc 03); na v1, parâmetros (45d, SLAs, valores, templates/mensagens) são configuráveis por painel.
- **Assinatura dentro do Portal do Cliente** (substituir o link externo do Autentique) — não na v1.
- **Geração automática de novo contrato na renovação** — pendente de confirmação (R6.5); v1 apenas sinaliza.
- **Versão "Implementação IA" do contrato** (workflow homônimo no n8n) — não especificada aqui; 🔶 CONFIRMAR escopo com Gustavo.
