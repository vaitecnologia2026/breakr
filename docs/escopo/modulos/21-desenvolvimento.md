# Módulo 21 — Desenvolvimento

> Painel interno de gestão do **próprio Breakr OS** (bugs, novas funções/features, sprints) para coordenar o time de desenvolvimento. Fontes: `ENTENDIMENTO-DO-PROJETO.md` (§12), transcrição `Screen Recording 2026-06-11 at 11.14.04.txt` ("departamento de desenvolvimento... controlo de uma maneira bem arcaica... delegar isso para o outro time que desenvolve para a gente"). Sistema **single-tenant**; motor **próprio** (doc 03).

## 1. Objetivo
Dar à Breakr um **painel interno de desenvolvimento de produto** para registrar e acompanhar **bugs**, **novas funções/features** e **sprints** do próprio sistema, coordenando o **time de desenvolvimento** (hoje um fornecedor externo). Substitui o controle **"arcaico"** atual feito em listas do **ClickUp** (colunas manuais: "o que precisa ser feito" → "cadastrado no sistema deles" → "o que estão fazendo" → "acertos/organizado"). Não substitui n8n. É um módulo **administrativo/interno** (não cliente-facing).

🔶 **Marcado como decisão de processo interno** em vários pontos (ver tags 🔶 abaixo): cabe à Breakr (Gustavo + liderança) definir cadência de sprint, definição de "pronto", política de severidade e se o time dev externo terá **acesso direto** ao painel.

## 2. Atores & permissões
| Cargo | Pode |
|---|---|
| **Admin / Superadmin (Gustavo)** | Criar/editar/priorizar itens (bug/feature), abrir/fechar **sprints**, mover status, definir severidade, configurar o painel |
| **Solicitante interno (qualquer colaborador)** | **Reportar bug** / sugerir nova função (entra como "A fazer/Triagem"); acompanhar o que reportou; comentar |
| **Time de Desenvolvimento (externo)** | Ver itens atribuídos, **mover status** (Em desenvolvimento → Entregue), comentar, registrar tempo/links de entrega — **se** receber acesso 🔶 |
| **Liderança (PO/gestor)** | Priorizar backlog, validar entregas, aprovar/abrir ajustes |

- **Acesso parcial:** se o time externo **não** tiver login (decisão 🔶), o módulo funciona como **espelho interno** e o Gustavo "cadastra no sistema deles" manualmente, mantendo o status sincronizado à mão (modelo atual) — o painel apenas organiza melhor.
- 🔶 CONFIRMAR se o **departamento "Desenvolvimento"** (já previsto no doc 02) recebe cargos próprios (ex.: "Desenvolvedor", "PO de Produto").

## 3. Telas / visões
1. **Board (Kanban)** — colunas por status do fluxo (Backlog/Triagem → A fazer → Em desenvolvimento → Em teste/Ajustes → Entregue); cards = bugs/features.
2. **Lista** — itens filtráveis por tipo (bug/feature), severidade, sprint, responsável, status.
3. **Detalhe do item** — título, tipo, descrição, passos para reproduzir (bug), critério de aceite (feature), severidade/prioridade, sprint, responsável, anexos (print/vídeo), comentários, links de entrega (PR/commit/deploy) 🔶, histórico.
4. **Sprints** — lista de sprints (nome, período, itens, status); board filtrado por sprint; indicadores simples (itens concluídos vs abertos).
5. **Formulário de reporte rápido** — qualquer colaborador reporta bug/sugere feature (entra em Triagem).
6. **Painel de config** — tipos, severidades, status do fluxo (cores), parâmetros de sprint.

## 4. Entidades usadas
Do doc 02 (reaproveitando o **núcleo de Tarefa**, sem inventar entidade nova):
- **Tarefa (base)** com novo **subtipo** lógico **"ItemDev"** (bug | feature) — campos: `codigo_unico` no nome, `tipo`, `status_id`, prioridade, due date, descrição, `checklist[]`, `dependencias[]`, tags, **campos personalizados**, anexos, comentários. 🔶 CONFIRMAR se "ItemDev" é um subtipo formal de Tarefa (recomendado) ou entidade própria.
- **StatusModel** — entidade "ItemDev/Sprint" com status configuráveis (nome+cor+ordem+tipo).
- **Departamento = Desenvolvimento** (doc 02) → Áreas → Listas (uma **Lista por sprint** ou uma lista "Bugs"/"Features"). 🔶 CONFIRMAR organização (sprint = lista vs sprint = campo).
- **Usuario / Cargo** — responsável e permissões.
- **Notificacao / Comentario** — avisos de atribuição, mudança de status, novo bug.
- **CampoPersonalizado** — severidade, ambiente, versão, link de entrega.
- **AuditLog** — histórico de mudanças.
- **AutomacaoRule / JobExecution** — regras do motor (notificação de bug crítico, transições).

> Cada item de dev recebe **`codigo_unico`** (rastreabilidade — princípio do doc 00), útil para casar com o "sistema deles" (time externo).

## 5. Funcionalidades (regras de negócio numeradas)

### F1. Registro de itens (bug / nova função)
- **R1.1** Qualquer colaborador pode **abrir um item** classificado como **Bug** ou **Feature (nova função)**; o item entra no status inicial **"Triagem/Backlog"**.
- **R1.2** Item do tipo **Bug** exige: descrição, **passos para reproduzir**, severidade; anexos (print/vídeo) são opcionais. 🔶 CONFIRMAR campos obrigatórios.
- **R1.3** Item do tipo **Feature** exige: descrição/objetivo e **critério de aceite**.
- **R1.4** Todo item recebe **`codigo_unico`** no nome na criação.
- **R1.5** Abertura de item **notifica** o admin/PO (responsável pela triagem).

### F2. Fluxo de status (do "precisa ser feito" ao "entregue")
- **R2.1** Fluxo padrão: **Backlog/Triagem → A fazer (cadastrado) → Em desenvolvimento → Em teste/Ajustes → Entregue**. (Espelha o controle atual: "o que precisa ser feito" → "cadastrei no sistema deles" → "o que estão fazendo" → "acertos/organizado".)
- **R2.2** A transição **A fazer → Em desenvolvimento** registra **responsável** (time dev) e data.
- **R2.3** A transição **Em teste/Ajustes → Entregue** só ocorre após validação do PO/liderança (definição de "pronto"). 🔶 CONFIRMAR critérios de "pronto".
- **R2.4** Um item pode **retornar** de "Em teste/Ajustes" para "Em desenvolvimento" quando reprovado (registra motivo). 🔶 CONFIRMAR se conta como métrica de retrabalho (análogo ao ReworkLog do doc 02).
- **R2.5** Status são **configuráveis** (nome+cor+ordem) via StatusModel — não hard-coded.

### F3. Sprints
- **R3.1** O admin cria **sprints** (nome + período inicial/final) e associa itens.
- **R3.2** Um item pertence a **no máximo uma** sprint ativa por vez. 🔶 CONFIRMAR.
- **R3.3** O board pode ser **filtrado por sprint**; indicadores simples mostram itens concluídos vs pendentes.
- **R3.4** Itens não concluídos ao fim da sprint podem ser **movidos** para a próxima (ação em lote). 🔶 CONFIRMAR cadência e duração padrão da sprint.

### F4. Priorização & severidade
- **R4.1** Cada item tem **prioridade** (campo do núcleo de Tarefa) e, se bug, **severidade** (ex.: Crítica/Alta/Média/Baixa — configurável). 🔶 CONFIRMAR escala.
- **R4.2** Bug de severidade **Crítica** dispara **notificação imediata** ao admin/PO (e ao time dev se tiver acesso).
- **R4.3** O board pode ordenar por prioridade/severidade.

### F5. Coordenação do time externo
- **R5.1** O painel registra **a quem** o item está atribuído (interno/externo) e os **links de entrega** (PR/commit/deploy) quando aplicável. 🔶 CONFIRMAR campos.
- **R5.2** Se o time externo **não** tiver acesso, o admin mantém o status manualmente; o painel continua sendo a **fonte de verdade interna** (substitui o controle arcaico).
- **R5.3** Comentários e histórico ficam no item para **rastreabilidade** das tratativas com o fornecedor.

## 6. Automações envolvidas (motor — doc 03)
Sem workflow n8n equivalente (controle hoje é manual no ClickUp). Regras a criar:

- **A1 — Bug aberto → notifica triagem**
  - **Trigger:** Evento `itemdev.criado` (tipo = bug).
  - **Condições:** sempre.
  - **Ações:** gerar `codigo_unico` + renomear; criar **notificação** ao admin/PO.

- **A2 — Bug crítico → alerta imediato**
  - **Trigger:** Mudança de campo `severidade = Crítica` (ou criação com severidade crítica).
  - **Condições:** severidade = Crítica.
  - **Ações:** notificação/pop-up imediata ao admin/PO (+ time dev se tiver acesso).

- **A3 — Transição de status → notificação**
  - **Trigger:** Mudança de status (ex.: → "Em desenvolvimento", → "Entregue").
  - **Condições:** conforme transição.
  - **Ações:** notificar solicitante/responsável; ao "Entregue", notificar o PO para validação.

- **A4 — Retorno para ajustes → log de retrabalho** 🔶
  - **Trigger:** Mudança "Em teste/Ajustes → Em desenvolvimento".
  - **Ações:** registrar motivo + (opcional) entrada análoga ao **ReworkLog** para medir retrabalho de dev.

- **A5 — Fim de sprint → mover pendências** 🔶
  - **Trigger:** Temporal (data final da sprint).
  - **Ações:** listar itens não concluídos e (opcional) mover para a próxima sprint; notificar.

> Execuções logadas em `JobExecution` com retry/idempotência (doc 03). Parâmetros (severidades, duração de sprint, definição de "pronto") editáveis por **painel, sem deploy**.

## 7. Integrações (doc 04)
- **Nenhuma integração externa obrigatória na v1.** Módulo interno.
- 🔶 CONFIRMAR (futuro, fora da v1) integração com **repositório/CI** (GitHub/GitLab) para puxar PR/commit/deploy automaticamente nos itens — hoje os links são informados manualmente.
- **WhatsApp/Notificação interna** — apenas avisos internos (bug crítico, entrega), via canal de notificação do sistema. 🔶 CONFIRMAR se usa WhatsApp ou só notificação in-app.

## 8. Campos personalizados / status configuráveis
- **Tipo:** Bug | Feature (nova função).
- **Status (StatusModel "ItemDev"):** Backlog/Triagem (nao_iniciado) · A fazer (nao_iniciado) · Em desenvolvimento (andamento) · Em teste/Ajustes (alteracao) · Entregue (concluido). Cores configuráveis.
- **Severidade (bug):** Crítica · Alta · Média · Baixa 🔶 (escala a confirmar).
- **Campos personalizados:** passos para reproduzir (bug), critério de aceite (feature), **ambiente/versão**, **link de entrega** (PR/commit/deploy) 🔶, responsável (interno/externo), sprint.
- **Tags:** ex.: "frontend", "backend", "integração", "regressão" 🔶.

## 9. Critérios de aceite
1. Qualquer colaborador consegue **abrir um bug ou feature**, que entra em **Triagem** com `codigo_unico`. (R1.1, R1.4)
2. Bug exige passos para reproduzir e severidade; feature exige critério de aceite. (R1.2, R1.3)
3. O **board** mostra colunas configuráveis do fluxo e permite **mover** itens entre status, registrando responsável e data na entrada em "Em desenvolvimento". (R2.1, R2.2)
4. **Dado** um bug marcado como **Crítico**, **quando** é criado/atualizado, **então** o admin/PO recebe **alerta imediato**. (R4.2, A2)
5. É possível criar **sprints** com período, associar itens, **filtrar o board por sprint** e ver itens concluídos vs pendentes. (R3.1–R3.3)
6. Item pode **retornar** de "Em teste/Ajustes" para "Em desenvolvimento" com motivo registrado. (R2.4)
7. O item registra **a quem está atribuído** (interno/externo) e aceita **links de entrega** e comentários para coordenar o fornecedor. (R5.1, R5.3)
8. Status e severidades são **configuráveis** (nome+cor) sem deploy. (R2.5, R4.1)
9. Toda mudança gera **AuditLog**; automações ficam em `JobExecution` reprocessável. (doc 03)
10. O módulo é **interno** — não aparece no Portal do Cliente.

## 10. Fora de escopo (deste módulo / desta fase)
- Integração automática com **GitHub/GitLab/CI-CD** (puxar PR/commit/deploy) — informado manualmente na v1. 🔶 futuro.
- **Time tracking** detalhado / billing do fornecedor de desenvolvimento.
- Métricas avançadas (burndown, velocity, lead time) — v1 entrega indicadores simples (concluídos vs pendentes). 🔶
- Acesso externo do time de desenvolvimento, se a Breakr optar por mantê-lo fora do sistema (modelo de espelho manual). 🔶
- Gestão de releases/versionamento do produto e changelog público.
- Editor visual de regras do motor (v1 = parâmetros editáveis; doc 03).
