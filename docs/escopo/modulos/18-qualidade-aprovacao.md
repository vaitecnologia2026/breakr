# Módulo 18 — Qualidade & Aprovação

> Módulo **transversal**: atua sobre as entregas de Marketing/Conteúdo (doc 16) e Tráfego (doc 17), e alimenta os indicadores de RH (doc 19). Fonte: `ENTENDIMENTO-DO-PROJETO.md` (item 9) + transcrições `N8N Overview 1.txt` e `Screen Recording 2026-06-11 at 11.14.04.txt`.

## 1. Objetivo
Centralizar a **aprovação de peças pelo cliente dentro do próprio sistema** (no lugar do eCite + link de pasta do Google Drive) e medir a **qualidade** e o **retrabalho** de cada entrega/responsável.
- **Substitui do n8n:** o workflow **"Envio de Criativos para Aprovação em Grupos"** (hoje busca a task, busca o cliente, dispara no grupo de WhatsApp via MegaAPI o **link da pasta do Drive**) e a tentativa frustrada de **cálculo de Rework/refação** que o Gustavo montou e "não funcionou".
- **Substitui do eCite:** o painel externo onde o cliente vê vídeo/fotos, comenta e aprova.
- **Substitui do ClickUp:** a visualização de calendário "do que cada designer está fazendo" e o gráfico de **carga por designer** (que "não deu muito certo" porque o ClickUp limita).
- Adiciona o que **não existe hoje**: **pop-up de avaliação por estrelas** pós-aprovação (estilo Uber/99) → **score de qualidade por responsável**.

## 2. Atores & permissões
| Cargo | Permissões |
|---|---|
| **Cliente** (Portal do Cliente) | Ver peça (vídeo/imagem/carrossel/estratégia), comentar, **aprovar** ou **pedir ajuste** via link do sistema; responder o **pop-up de avaliação** após aprovar; ver o **calendário de quando a peça entra/publica**. Não vê notas/score interno, nem o dashboard de rework. |
| **CS / CES** | Enviar peça para aprovação; ver comentários e avaliações do cliente; reabrir/reencaminhar ajustes; ver dashboard de rework/qualidade do **seu squad**; é o responsável avaliado em dimensões de atendimento/estratégia (origem externa). |
| **Estrategista** | Ver avaliações e rework das peças que revisou; é responsável avaliado quando o ajuste tem origem em estratégia. |
| **Designer / Editor** | Ver as próprias avaliações e o próprio score; ver a **própria carga**; é o responsável avaliado em qualidade gráfica/refação interna. |
| **Gestor de tráfego** | Ver avaliação/qualidade dos criativos aprovados que sobem para o laboratório (doc 17). |
| **Admin / Superadmin** | **Configurar dimensões de avaliação** por tipo de item, escala de estrelas, modelos de mensagem; ver todos os dashboards (designer/squad/estrategista/CS); definir as métricas de qualidade junto às lideranças. |

> Acesso parcial explícito: o **cliente nunca** acessa score interno, ranking de responsáveis nem dashboard de rework — apenas a peça dele, seus comentários e seu calendário.

## 3. Telas / visões
1. **Link público de aprovação (Portal do Cliente, estilo eCite)** — abre pelo link do **nosso sistema** (enviado no WhatsApp do grupo). Mostra: a peça (player de vídeo / galeria de imagens / carrossel), descrição/legenda proposta, botões **Aprovar** / **Solicitar ajuste**, **chat/comentários** por peça, e o **calendário** de quando a peça entra (data prevista de publicação).
2. **Pop-up de avaliação (pós-aprovação)** — aparece **imediatamente após** o clique em Aprovar: estrelas (escala configurável, ex. 0–5) por **dimensão configurável** (ex.: qualidade gráfica, dificuldade de aprovar / nº de refações, qualidade do texto) + comentário opcional.
3. **Painel de aprovações (interno — CS/Admin)** — fila de itens por status (pendente / aprovado / ajuste), por cliente/squad, com SLA e link.
4. **Detalhe da aprovação** — histórico completo: versões, comentários, transições de status, quem aprovou, avaliação recebida, rework acumulado.
5. **Dashboard de Qualidade** — score por **responsável**, por **tipo de tarefa** e por **dimensão**; ranking estilo Uber/99 (média de estrelas, volume de avaliações).
6. **Dashboard de Rework/Refação** — nº de retornos para "alteração/ajuste" por **designer**, por **squad** e por **estrategista/CS**, segmentado por **origem (interno × externo)**.
7. **Visão de Carga por Designer** — calendário "o que cada designer está fazendo" + gráfico de nº de tasks por designer (ex.: designer A com 6, designer B com 3), urgências e **tempo de entrega** (da atribuição à conclusão).

## 4. Entidades usadas
- **Aprovacao** (lê/escreve) — `item` (criativo/estratégia/post), `cliente_id`, **link público** (estilo eCite), comentários, **status** (pendente/aprovado/ajuste), histórico/versões.
- **Avaliacao** (escreve) — `aprovacao_id`/`tarefa_id`, **dimensões configuráveis** (qualidade gráfica, nº de refações, qualidade do texto…), **nota (estrelas)**, **responsável avaliado** → alimenta o score de qualidade.
- **ReworkLog** (escreve) — `tarefa_id`, **origem** (interno=designer / externo=cliente), **de→para status**, timestamp → dashboards de refação.
- **Tarefa** / subtipos **Design/Criativo**, **Copy**, **Campanha** (lê) — responsável (derivado do squad+função), `due date`, transições de status, **tempo de entrega**.
- **Criativo** (lê/escreve) — após aprovação, segue para `status laboratório` (Para testar) do tráfego (doc 17).
- **Cliente** (lê) — `squad_id`, `grupo WhatsApp (wa_group_id @g.us)`, tag.
- **StatusModel** (lê) — statuses configuráveis (incl. `aguardando_cs`, `revisao_externa`, `alteracao`, `concluido`).
- **Notificacao / WhatsAppThread** (escreve) — pop-up interno e disparo no grupo.
- **AuditLog** (escreve) — toda transição e avaliação.

## 5. Funcionalidades (regras de negócio numeradas)

- **F1. Envio para aprovação via link do sistema** — substitui o link da pasta do Drive.
  - R1.1 Quando uma tarefa de Criativo (ou Estratégia/Post) muda do status **"em revisão (interna)"** para **"aprovação"** (revisão externa/cliente — cor amarela no padrão do doc 02), o sistema cria/atualiza um registro **Aprovacao** e gera um **link público** apontando para o **Portal do Cliente** (não para o Drive).
  - R1.2 O sistema busca o **Cliente** da tarefa e seu **grupo de WhatsApp** (`wa_group_id @g.us`) e dispara, via adapter WhatsApp, a mensagem de aprovação **com o link do sistema** (modelo de mensagem configurável).
  - R1.3 O link abre o painel de aprovação: peça renderizada, descrição, **chat/comentários** e botões **Aprovar** / **Solicitar ajuste**. Não expõe outras peças/clientes.
  - R1.4 Enquanto pendente, o status permanece **revisão externa/aguardando cliente**; SLA/lembrete configurável (🔶 CONFIRMAR janela de follow-up; hoje o n8n tem "Aguardar Aprovação" genérico).

- **F2. Aprovação e roteamento pós-aprovação**
  - R2.1 Ao clicar **Aprovar**, a `Aprovacao.status` vira **aprovado**, registra-se quem aprovou + timestamp, e o **pop-up de avaliação (F4)** é exibido na sequência.
  - R2.2 Peça aprovada **orgânica** → segue para agendamento/publicação (doc 16); peça aprovada **paga** e com **gestor de tráfego marcado** → o criativo entra no **laboratório de criativos** com `status laboratório = Para testar` (doc 17).
  - R2.3 Ao clicar **Solicitar ajuste**, o cliente registra um comentário (obrigatório), a `Aprovacao.status` vira **ajuste**, a tarefa volta para **"alteração/ajuste"** e dispara **F5 (rework)** com **origem = externo**; o comentário chega ao **CS** responsável.

- **F3. Comentários / chat na peça**
  - R3.1 Cliente e CS trocam comentários por peça (com versão associada); cada comentário gera notificação ao CS (e ao responsável da tarefa, conforme config).
  - R3.2 Todo comentário e transição fica no **histórico da Aprovacao** (auditável, versionado).

- **F4. Pop-up de avaliação pós-aprovação (estrelas, estilo Uber/99)**
  - R4.1 Disparado **somente após** aprovação (R2.1). Apresenta as **dimensões configuradas para aquele tipo de item** (ex.: criativo → qualidade gráfica, nº de refações, qualidade do texto).
  - R4.2 Cada dimensão recebe nota em **estrelas** (escala configurável, padrão 0–5). Comentário textual é opcional.
  - R4.3 A avaliação é gravada em **Avaliacao**, vinculada à `aprovacao_id`/`tarefa_id` e ao **responsável avaliado** (derivado do squad+função: designer p/ qualidade gráfica, copy p/ qualidade do texto, CS/estrategista p/ atendimento etc.).
  - R4.4 As dimensões e os pesos por **tipo de avaliação** são **configuráveis por painel** (qualidade de campanha, de texto, de conciliação bancária etc.), a serem definidos pela Breakr com as lideranças. 🔶 CONFIRMAR o conjunto final de dimensões e pesos por tipo.
  - R4.5 O score de qualidade por responsável é a **média ponderada** das notas recebidas no período (estilo "nota do motorista"); o sistema expõe esse score por responsável/tarefa no **Dashboard de Qualidade**. Limiar de alerta de baixa qualidade é **configurável**. 🔶 CONFIRMAR limiar e período.

- **F5. Cálculo de Rework / Refação** — o que o Gustavo "quer muito ter" e o n8n não entregou.
  - R5.1 Toda vez que uma tarefa **entra no status "alteração/ajuste"**, registra-se um **ReworkLog** com `tarefa_id`, **de→para status** e timestamp.
  - R5.2 O **ReworkLog** marca a **origem**:
    - **Interno** = quando o retorno vem de **"em revisão (interna)" → "alteração/ajuste"** (erro do designer / estratégia interna).
    - **Externo** = quando o retorno vem de **"aprovação/cliente" → "alteração/ajuste"** (cliente reclamou) → imputado a **CS e/ou estratégia**.
  - R5.3 O sistema **conta quantas vezes** a mesma tarefa voltou para alteração (contador de refações por tarefa) e agrega por **designer**, **squad** e **estrategista/CS**.
  - R5.4 Rework **interno** alto sinaliza desalinhamento estratégia↔designer; rework **externo** alto sinaliza falha de CS/estratégia na apresentação ao cliente (interpretação exibida no dashboard como segmentação, sem decisão automática — humano no loop).

- **F6. Dashboard de Qualidade & Rework**
  - R6.1 Filtros por **designer**, **squad**, **estrategista**, **CS**, **cliente**, **tipo de tarefa** e **período**.
  - R6.2 Mostra: score médio (estrelas) por responsável/dimensão; nº de refações por responsável/squad; **% interno × externo**; volume de avaliações.
  - R6.3 Dados derivam de **Avaliacao** + **ReworkLog**; sem digitação manual.

- **F7. Carga por designer**
  - R7.1 Visão de **nº de tasks por designer** (ex.: 6 × 3) e **calendário** do que cada um está produzindo.
  - R7.2 **Tempo de entrega** por tarefa = intervalo entre **atribuição/recebimento** e **conclusão**; agregado por designer/squad.
  - R7.3 Suporte a **redistribuição/urgência**: ao marcar uma tarefa como **urgente**, o sistema indica designers com menor carga (mesmo squad primeiro; fora do squad se o squad estiver lotado) para o gestor decidir o remanejamento. A atribuição final é **manual** (humano no loop). 🔶 CONFIRMAR a capacidade-padrão por designer (ex.: nº de tasks/dia) usada como referência de "lotado".

## 6. Automações envolvidas (regras do motor — doc 03)

- **A1 — Aprovação em Grupos (reimplementa o workflow n8n "Envio de Criativos para Aprovação em Grupos")**
  - **Trigger:** mudança de status `tarefa.status_alterado` (de "em revisão" para "aprovação"/revisão externa).
  - **Condições:** tarefa do tipo Criativo/Estratégia/Post; cliente possui `wa_group_id`.
  - **Ações:** criar/atualizar `Aprovacao` → gerar **link do sistema** → `WhatsApp: enviar mensagem no grupo` (modelo configurável, **link do nosso sistema**, não do Drive).
  - **Muda vs. n8n:** envia o **link do portal** (experiência de navegação/aprovação/chat) em vez do link da pasta do Drive; dispensa MegaAPI/`@g.us` manual (usa o adapter oficial, com `@g.us` como fallback de transição).

- **A2 — Pós-aprovação dispara avaliação**
  - **Trigger:** evento de domínio `aprovacao.aprovada`.
  - **Condições:** existem dimensões configuradas para o tipo do item.
  - **Ações:** **criar pop-up** de avaliação no Portal → ao responder, gravar `Avaliacao` e atualizar score do responsável.

- **A3 — Registro de rework**
  - **Trigger:** `tarefa.status_alterado` quando o **status destino = "alteração/ajuste"**.
  - **Condições:** —
  - **Ações:** criar `ReworkLog` (origem derivada do status de origem — R5.2), incrementar contador da tarefa, notificar o responsável imputado (designer ou CS/estratégia).

- **A4 — Roteamento pós-aprovação (orgânico × pago)**
  - **Trigger:** `aprovacao.aprovada`.
  - **Condições/ramificações:** peça **orgânica** → agendamento/publicação (doc 16); peça **paga** + gestor de tráfego marcado → `Criativo.status laboratório = Para testar` (doc 17).
  - **Ações:** mover status / criar item no laboratório / notificar gestor.

> **Configurável por painel (sem dev):** dimensões/pesos de avaliação, escala de estrelas, modelos de mensagem do grupo, janela de follow-up de aprovação, capacidade-padrão por designer.

## 7. Integrações (doc 04)
- **WhatsApp — API oficial (+ MegaAPI na transição):** disparo da mensagem de aprovação no **grupo do cliente** com o **link do sistema** (A1).
- **Google Drive:** **não** é mais usado como destino da aprovação (a peça é exibida no nosso portal); o storage da mídia segue a camada **abstraída** (Drive agora / storage próprio depois — doc 00/01).
- **Meta Ads (doc 17):** apenas indireto — o criativo aprovado entra no laboratório que o gestor sobe na Meta.

## 8. Campos personalizados / status configuráveis
- **Statuses (StatusModel) reaproveitados** (cores do padrão do doc 02): `em revisão interna` (roxo) → `aprovação/aguardando cliente` (amarelo, tipo `revisao_externa`) → `alteração/ajuste` (vermelho, tipo `alteracao`) → `aprovado/concluído` (verde, tipo `concluido`). Nomes/cores **configuráveis**.
- **Dimensões de Avaliacao (configuráveis por tipo de item):** ex. **qualidade gráfica**, **nº de refações / dificuldade de aprovar**, **qualidade do texto** (criativo); dimensões próprias para CS, campanha, conciliação. 🔶 CONFIRMAR lista por tipo.
- **Escala de estrelas:** padrão **0–5**, configurável.
- **ReworkLog.origem:** enum `interno` | `externo`.
- **Tags:** peça aprovada herda destino (orgânico/pago) das tags da tarefa de origem.

## 9. Critérios de aceite
1. **Dado** um criativo em "em revisão", **quando** muda para "aprovação", **então** o cliente recebe no grupo de WhatsApp uma mensagem com o **link do sistema** (não do Drive) e o item aparece no Portal com player/galeria, comentários e botões Aprovar/Solicitar ajuste.
2. **Dado** o cliente no link, **quando** ele clica **Aprovar**, **então** o status vira "aprovado", registra-se quem/quando, e o **pop-up de avaliação** aparece com as dimensões configuradas em estrelas.
3. **Quando** a avaliação é enviada, **então** grava-se `Avaliacao` vinculada ao **responsável correto** (por dimensão) e o **score** desse responsável é atualizado no Dashboard de Qualidade.
4. **Dado** o cliente no link, **quando** ele clica **Solicitar ajuste** com comentário, **então** a tarefa volta para "alteração/ajuste", o comentário chega ao CS e um **ReworkLog com origem = externo** é criado.
5. **Quando** uma tarefa volta de "em revisão interna" para "alteração/ajuste", **então** é criado **ReworkLog com origem = interno** e o contador de refações da tarefa incrementa.
6. O **Dashboard de Rework** exibe nº de refações por **designer/squad/estrategista** segmentado por **origem (interno × externo)**, sem digitação manual.
7. O **Dashboard de Qualidade** exibe score (média de estrelas) por responsável/dimensão/tipo, com limiar de alerta configurável.
8. A **Carga por designer** mostra nº de tasks por designer e **tempo de entrega**, e sugere designers de menor carga ao marcar uma tarefa como urgente (atribuição final manual).
9. O **cliente não** acessa score interno, ranking nem dashboards de rework.
10. Todas as transições e avaliações ficam em **AuditLog**; o workflow n8n "Aprovação em Grupos" só é desligado após a regra A1 passar em homologação.

## 10. Fora de escopo (deste módulo / desta fase)
- **Avaliação/score automático por IA** das peças (a avaliação v1 é feita pelo **cliente humano**; IA assistiva fica no tráfego — doc 17).
- **Desligamento/penalização automática** de responsável por baixo score (estilo "Uber desliga motorista") — v1 apenas **mede e alerta**; ação é humana.
- **Redistribuição automática** de carga entre designers — v1 apenas **sugere**; o gestor decide.
- Definição final das **dimensões/pesos** e **métricas de qualidade** (será fechada pela Breakr com as lideranças — 🔶 CONFIRMAR).
- Aprovação de **contratos** (fluxo próprio no doc 12) e de **estratégia/funil** quando tratada no doc 16 — aqui só o mecanismo transversal de aprovação/avaliação.
