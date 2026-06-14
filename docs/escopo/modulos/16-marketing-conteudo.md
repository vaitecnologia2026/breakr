# Módulo 16 — Marketing · Estratégia & Conteúdo

> Especificação técnica (SOW). Single-tenant (só Breakr). Motor de automação próprio (doc 03). Statuses **configuráveis** (StatusModel, doc 02). IA de tráfego é assistiva (ver módulo 17). Fontes: ENTENDIMENTO §7, doc 00 §"Marketing", doc 02, doc 03, transcrições `Screen Recording 2026-06-11 at 08.37.48.txt` e `N8N Overview 1.txt`, inventário n8n.

## 1. Objetivo
Centralizar a operação de **estratégia** e **produção de conteúdo** da Breakr: criação de funis com visão/conexões **visuais**, cascata **estratégia → campanha → copy → criativo**, fluxo de produção (planejamento/copy → design) com statuses cor-coded e automações, **atribuição inteligente por squad**, aprovação do cliente via link do sistema e roteamento pós-aprovação (orgânico → agendamento; pago → laboratório de criativos do módulo 17).

**Substitui:**
- **ClickUp** — Departamento de Marketing › áreas "Gestão Estratégica", "Produção de Conteúdo (Planejamento e Copy)" e "Design e Criação"; statuses por cor; campos obrigatórios da task; visões de board/calendário.
- **n8n** — workflows `[ClickUp] [Nomenclatura] Copywriting` / `Criativos` (renomeação automática), `[ClickUp] Linkar Task ↔ Subtask - Produção de Conteúdo`, `[ClickUp] Solicitação de Criativos - PT1` (parcial; o lado tráfego está no módulo 17), `[ClickUp] Envio de Criativos para Aprovação em Grupos` (a aprovação em si é o módulo 19; aqui fica o disparo).
- **Canva/Drive/eCite** — a estratégia e as peças deixam de ser apresentadas em Canva / pasta do Drive; chegam ao cliente como **link do próprio sistema** (estilo eCite).

> Fora deste módulo (cross-ref): a tela de aprovação/comentário/avaliação do cliente é o **Módulo 19 — Aprovação & Qualidade**; o cálculo de Rework/refação e carga por designer também são do módulo 19; campanhas/otimização/laboratório de tráfego são o **Módulo 17**. Este módulo **dispara** e **consome** esses fluxos.

## 2. Atores & permissões
| Cargo | Permissões neste módulo |
|---|---|
| **Estrategista** | Criar/editar **Estratégia/Funil** (editor visual); anexar estratégia ao projeto; enviar estratégia ao cliente; **revisar Design** (aprovar / mandar para alteração); receber solicitação de criativo (SLA 72h — ver módulo 17). |
| **Copywriter** | Criar/editar tarefas de **Copy**; mover statuses de produção; solicitar informações ao CS; enviar copy para revisão interna e para aprovação. |
| **Designer / Editor de vídeo** | Receber tarefa de Design (atribuída automaticamente); mover statuses (para fazer → andamento → estrategista revisa → alteração/aprovação); anexar peças. |
| **CS / CES** | Receber comentários do cliente sobre a estratégia; receber pedidos de informação do copy; acompanhar produção do(s) seu(s) cliente(s); disparar aprovação ao cliente. |
| **Gestor de tráfego** | Visualizar produção; é o **marcador** que define o roteamento pós-aprovação (peça pago → laboratório de criativos, módulo 17). |
| **Cliente** (Portal) | **Ver/ler** estratégia e peças enviadas; **aprovar / comentar / pedir ajuste** (somente itens enviados a ele); sem acesso ao backstage de produção. (Telas no Portal — módulo 19.) |
| **Admin / Superadmin** | Configurar statuses (nome/cor/ordem/tipo), campos obrigatórios, regras de automação e SLAs, templates de mensagem/notificação. |

Acessos parciais explícitos: o cliente vê **apenas** os itens em status de revisão externa/aprovação que lhe foram enviados; nunca vê statuses internos (revisão interna, alteração) nem outros clientes/squads.

## 3. Telas / visões
1. **Editor visual de Estratégia/Funil** — canvas de nós + conexões (estratégia, campanhas, copies, criativos); cada nó referencia uma entidade; a estratégia é anexada ao projeto. Visão "funil sendo trabalhado" (ENTENDIMENTO §7).
2. **Board de Produção de Conteúdo (Planejamento e Copy)** — colunas = statuses configuráveis (cor-coded); cards = tarefas de Copy; filtro por squad e por cliente.
3. **Board de Design e Criação** — colunas = statuses do fluxo de design; cards = tarefas de Design/Criativo; filtro por designer/squad; (carga por designer e calendário ficam no módulo 19, exibidos aqui como atalho).
4. **Detalhe da tarefa (Copy / Design)** — campos personalizados obrigatórios, checklist de falha, dependências, comentários, anexos, histórico de status; botão "enviar para aprovação".
5. **Calendário de conteúdo** — visão de calendário das peças (data de publicação/agendamento), por squad/cliente.
6. **Painel de config (Admin)** — statuses por entidade (Copy/Design), campos obrigatórios, regras e SLAs, templates de notificação. (No-code, doc 03.)

> O painel "Hoje & Atrasados" modular por cargo (núcleo, módulo 10🔶) consome este módulo: o copywriter vê copies pendentes; o designer vê criativos a fazer/atrasados.

## 4. Entidades usadas (doc 02)
- **Estrategia/Funil** — `projeto_id`, estrutura visual (nós + conexões), anexada ao projeto, enviada ao cliente p/ aprovação. (escreve)
- **Tarefa** + subtipos **Copy** (briefing, texto, revisões) e **Design/Criativo**. (lê/escreve)
- **Criativo** — tipo (vídeo/imagem/carrossel), links, **status laboratório** (Para testar → Em teste — usado no módulo 17), aprovação. (escreve o handoff)
- **StatusModel** — entidade Copy/Design; statuses {nome, cor, ordem, tipo}. (lê/configura)
- **CampoPersonalizado** — definições por entidade (Copy/Design), obrigatórios. (lê)
- **Cliente** — `tag`, `squad_id`, `projetos[]`, grupo WhatsApp (`wa_group_id`), pasta Drive. (lê)
- **Squad** — `membros[]` com função (CS/copy/designer/editor/estrategista/gestor) → base da atribuição automática. (lê)
- **Projeto** — tipo Marketing; `itens_relacionados[]` (histórico reaproveitável). (lê/escreve vínculos)
- **Aprovacao** — item, `cliente_id`, link público, comentários, status. (cria; telas no módulo 19)
- **Notificacao / Comunicado / WhatsAppThread** — notificação ao cliente, comentários de volta ao CS, disparo no grupo. (escreve)
- **Documento/Arquivo** — anexos das peças (storage abstraído). (escreve)
- **AutomacaoRule / JobExecution / WebhookLog** — motor (doc 03). (lê/escreve)
- **ReworkLog** — origem (interno/externo) das voltas para "alteração" (consumido pelo módulo 19; este módulo gera o evento de mudança de status). (gera evento)
- **AuditLog** — toda mudança. (escreve)

## 5. Funcionalidades (regras de negócio numeradas)

### F1. Gestão estratégica (funis visuais + cascata)
- **R1.1** O estrategista cria uma **Estratégia/Funil** vinculada a um **Projeto** do tipo **Marketing** de um cliente; uma estratégia pertence a exatamente 1 projeto.
- **R1.2** A estratégia é editada em um **canvas visual** de **nós** e **conexões**; o sistema persiste nós + conexões (não exige reabrir/navegar entre telas — ENTENDIMENTO §7).
- **R1.3** Tipos de nó suportados na v1: **Estratégia** (raiz), **Campanha**, **Copy**, **Criativo** — modelando a cascata **estratégia → campanha → copy → criativo**.
- **R1.4** Cada nó pode **referenciar uma entidade existente** (uma Campanha/Copy/Criativo já criada) ou servir de placeholder a ser materializado depois. 🔶 CONFIRMAR se a v1 cria a entidade automaticamente ao adicionar o nó ou só vincula (o vídeo descreve a intenção "daqui mesmo ela já cria a estratégia… e a gente vai estruturando tudo para baixo", mas sem o passo a passo de materialização).
- **R1.5** A estratégia, ao ser salva, fica **anexada ao projeto** e aparece nos `itens_relacionados[]` do projeto (reaproveitamento de histórico — "achar a tese do ano passado").
- **R1.6** O sistema mantém a relação nó→entidade para navegação bidirecional (do funil para a campanha e vice-versa).

### F2. Estratégia enviada ao cliente (substitui Canva)
- **R2.1** O estrategista (ou CS) aciona **"enviar estratégia ao cliente"**; o sistema cria uma **Aprovacao** do tipo estratégia e **notifica o cliente** (notificação no Portal + WhatsApp), em vez de montar/enviar Canva.
- **R2.2** O cliente, no Portal, **lê** a estratégia e pode **aprovar**, **comentar** ou **pedir ajuste** (telas no módulo 19).
- **R2.3** **Comentários do cliente voltam ao CS**: cada comentário gera notificação para o **CS do squad do cliente** (atendimento/suporte) com link para o item.
- **R2.4** O status da estratégia reflete o retorno do cliente (pendente → aprovado / ajuste). Ajuste reabre a estratégia para o estrategista.
- **R2.5** Todo o histórico (envios, comentários, aprovações) fica registrado na Aprovacao e em AuditLog.

### F3. Produção de conteúdo — statuses cor-coded (Planejamento e Copy)
- **R3.1** A produção começa em **Planejamento e Copy**: cria-se uma tarefa de **Copy** (planejar o que será feito e escrever).
- **R3.2** Os statuses são **configuráveis** (StatusModel) e seguem a convenção de cor da Breakr (mapeada ao campo `tipo`):
  - **Roxo = revisão interna** (`tipo: revisao_interna`) — revisão por pessoa interna.
  - **Azul = em andamento** (`tipo: andamento`) — ex.: "escrevendo".
  - **Laranja = aguardando CS** (`tipo: aguardando_cs`) — ex.: "aguardando informações do CS" (não iniciado até receber dados).
  - **Vermelho = em alteração** (`tipo: alteracao`).
  - **Amarelo = revisão externa / cliente** (`tipo: revisao_externa`) — **2ª revisão**, feita pelo cliente.
  - (+ `nao_iniciado` e `concluido` conforme StatusModel.)
- **R3.3** Quando a copy precisa de dados, vai para **"aguardando informações do CS"** (laranja) e o sistema **notifica o CS** do squad com o pedido.
- **R3.4** Concluída a escrita, a copy vai para **revisão interna** (roxo); aprovada internamente, segue para **revisão externa/cliente** (amarelo) → dispara aprovação no grupo (F4/F6).
- **R3.5** Mover para o status **"concluído"** (`tipo: concluido`) **fecha a tarefa de copy e a move para Design**, marcando o designer (ver F5 e A1).
- **R3.6** **Checklist de falha** na tarefa: itens de verificação (ex.: squad/cliente corretos, campos preenchidos); permite **cobrança** quando algo está errado mesmo sem o sistema acusar erro ("se a pessoa marcou isso e não deu erro, a gente tem como cobrar").

### F4. Atribuição inteligente por squad
- **R4.1** Ao criar a tarefa, o operador **marca o Cliente**; o sistema **puxa o `squad_id` do cliente** e **preenche automaticamente** os responsáveis a partir de `Squad.membros[função]`: **copywriter, CS, designer, editor de vídeo, estrategista** (e gestor de tráfego quando aplicável).
- **R4.2** É proibido (ou desnecessário) preencher responsável manualmente um a um — o vídeo é explícito: "ao invés de marcar usuário por usuário… marco o nome do cliente e ele já puxa". A atribuição manual só é permitida como **override** por Admin/líder. 🔶 CONFIRMAR se override manual é permitido e por quais cargos.
- **R4.3** Se o cliente **não tiver squad** ou o squad **não tiver a função** necessária, a criação **bloqueia com erro** explicando o que falta (consistência da atribuição). 🔶 CONFIRMAR mensagem/severidade.
- **R4.4** A atribuição é reaplicada se o **squad do cliente mudar** 🔶 CONFIRMAR (não documentado se re-atribui tarefas em aberto).

### F5. Fluxo de Design e Criação
- **R5.1** A tarefa chega ao Design (vinda da copy concluída, A1) no status **"para fazer"**; o **designer** já vem marcado (F4).
- **R5.2** Transições do fluxo (statuses configuráveis):
  - **para fazer** → designer assume → **em andamento**;
  - **em andamento** → designer envia → **estrategista revisa**;
  - estrategista vê erro → **alteração e ajuste** (volta ao designer); estrategista não vê erro → **aprovação**.
- **R5.3** Em **aprovação**, a peça é enviada ao **CS** / grupo do WhatsApp do cliente para o cliente aprovar via **link do sistema** (F6).
- **R5.4** Cada volta de **revisão → alteração e ajuste** gera **evento de mudança de status** que alimenta o **ReworkLog** com **origem interna** (designer); cada volta de **aprovação → alteração** alimenta com **origem externa** (cliente/CS/estratégia). (Dashboards no módulo 19.)
- **R5.5** O fluxo de design usa os campos obrigatórios herdados da atribuição (cliente/squad/responsáveis) e o checklist de falha (R3.6).

### F6. Envio para aprovação do cliente (link do sistema, não pasta do Drive)
- **R6.1** Ao entrar em **aprovação** (copy ou design), o sistema **cria uma Aprovacao** com **link público** (estilo eCite) e **dispara no grupo de WhatsApp do cliente** o link **do sistema** (não mais o link da pasta do Drive).
- **R6.2** O link leva à tela de aprovação do Portal (módulo 19) onde o cliente vê a peça (vídeo/imagem), **comenta** ou **aprova** (com/sem comentário) e há visão de calendário de quando a peça entra.
- **R6.3** Após aprovação, dispara o **pop-up de avaliação** (estrelas — qualidade gráfica, nº de refações, qualidade do texto) — entidade Avaliacao, telas e score no módulo 19.

### F7. Roteamento pós-aprovação (orgânico vs pago)
- **R7.1** Depois de **aprovada** pelo cliente, a peça é roteada:
  - **Orgânico** → vai para **agendamento e publicação** (calendário de conteúdo).
  - **Pago** → vai para o **laboratório de criativos** (módulo 17), entrando como criativo **"Para testar"**.
- **R7.2** O **critério** é: **existe gestor de tráfego marcado** na tarefa/peça? **Sim → laboratório de criativos**; **não → agendamento e publicação** (regra explícita do vídeo). 🔶 CONFIRMAR onde fica o flag "pago/orgânico" se não houver gestor marcado (o vídeo cita também "impressões offline" como outro destino — fora de escopo da v1 🔶).
- **R7.3** O handoff para o laboratório preenche o **Criativo** com status laboratório **"Para testar"** e o vincula à campanha/projeto (consumido pelo módulo 17).

### F8. Nomenclatura automática (cliente + código único)
- **R8.1** Ao **criar** uma tarefa de Copy ou Criativo, o sistema **gera o `codigo_unico`** (gerador central, doc 02) e **renomeia** a tarefa anexando **tag do cliente + código** (ex.: "[Cliente] … #<codigo>"), sem o operador digitar a tag/ID — substitui as automações `[Nomenclatura] Copywriting` e `[Nomenclatura] Criativos`.
- **R8.2** O `codigo_unico` fica **anexado ao nome** e garante rastreabilidade sistema ↔ Meta Ads ↔ documentos (mesmo gerador usado por campanha/público no módulo 17).
- **R8.3** A nomenclatura **não usa TOFU/MOFU/BOFU** em copy/criativo (a remoção dessas tags está no módulo 17/campanha; aqui a regra é só "cliente + código"). 🔶 CONFIRMAR formato exato do nome de copy/criativo (os docs detalham o padrão de **campanha** `[cP]…` e **público** `[Pb]…`, mas **não** o padrão textual de copy/criativo).

## 6. Automações envolvidas (motor — doc 03)
> Formato: **Trigger → Condições → Ações**. Workflow n8n equivalente entre parênteses.

- **A1. Copy concluída → move para Design + marca designer** *(n8n: `[ClickUp] Linkar Task ↔ Subtask - Produção de Conteúdo` + automações de status "copy revisada/aprovada → mover para design")*
  - **Trigger:** mudança de status — Copy → `concluido`.
  - **Condições:** tarefa é do subtipo Copy; tem cliente/squad válidos.
  - **Ações:** mover a tarefa para a lista **Design e Criação** (status inicial "para fazer"); **atribuir designer/editor** a partir do squad (F4); criar/linkar a tarefa de Design (relação task↔subtask); notificar o designer.

- **A2. Atribuição inteligente por squad** *(novo; consolida o preenchimento manual do ClickUp)*
  - **Trigger:** criação/edição de tarefa (Copy/Design) com Cliente definido.
  - **Condições:** Cliente tem `squad_id`; squad tem as funções necessárias.
  - **Ações:** preencher responsáveis (copy/CS/designer/editor/estrategista/gestor) a partir de `Squad.membros[função]`; se faltar squad/função → bloquear com erro (R4.3).

- **A3. Nomenclatura automática (copy/criativo)** *(n8n: `[Nomenclatura] Copywriting`, `[Nomenclatura] Criativos`)*
  - **Trigger:** evento `tarefa.criada` (subtipo Copy ou Criativo).
  - **Condições:** —.
  - **Ações:** gerar `codigo_unico`; renomear a tarefa para o padrão "tag do cliente + nome + #código".

- **A4. Enviar estratégia ao cliente** *(novo; substitui apresentação Canva)*
  - **Trigger:** manual/botão "enviar estratégia ao cliente".
  - **Condições:** estratégia anexada a um projeto Marketing.
  - **Ações:** criar Aprovacao (tipo estratégia) com link do sistema; notificar cliente (Portal + WhatsApp).

- **A5. Comentário do cliente → CS** *(novo)*
  - **Trigger:** evento de novo comentário do cliente em estratégia/peça.
  - **Condições:** comentário feito pelo cliente.
  - **Ações:** notificar o **CS do squad** do cliente; registrar no histórico da Aprovacao.

- **A6. Enviar peça para aprovação no grupo** *(n8n: `[ClickUp] Envio de Criativos para Aprovação em Grupos`)*
  - **Trigger:** mudança de status (copy/design) → **aprovação**.
  - **Condições:** tarefa tem cliente com `wa_group_id`.
  - **Ações:** criar Aprovacao + link do sistema; buscar o cliente e o grupo; **enviar no grupo o link do sistema** (não a pasta do Drive). O que muda vs n8n: o link passa a ser o do Portal e há pop-up de avaliação pós-aprovação (F6.3 / módulo 19).

- **A7. Solicitação de criativo (lado conteúdo)** *(n8n: `[ClickUp] Solicitação de Criativos - PT1`)*
  - **Trigger:** tag/botão "solicitar criativo" (disparado pelo gestor no módulo 17).
  - **Condições:** cliente/squad válidos.
  - **Ações:** criar tarefa em **Planejamento e Copy** com cliente/gestor/designer preenchidos via squad (F4); roteia para o estrategista (SLA 72h definido no módulo 17). *Aqui fica a criação da tarefa de conteúdo; o gatilho e o SLA são do módulo 17.*

- **A8. Roteamento pós-aprovação** *(novo; regra do vídeo)*
  - **Trigger:** Aprovacao → **aprovado** pelo cliente.
  - **Condições/ramificação:** **se** há gestor de tráfego marcado → ramo "pago"; **senão** → ramo "orgânico".
  - **Ações (pago):** criar/atualizar Criativo com status laboratório "Para testar" e enviar ao laboratório (módulo 17). **Ações (orgânico):** mover para agendamento e publicação (calendário).

## 7. Integrações (doc 04)
- **WhatsApp API oficial (+ MegaAPI na transição)** — enviar ao **grupo do cliente** o **link do sistema** para aprovação (A6); notificar o cliente do envio de estratégia (A4). `wa_group_id` (@g.us) salvo no cliente.
- **Google Docs/Drive (storage abstraído)** — anexos das peças; na transição a pasta do Drive ainda pode existir, mas **o link enviado ao cliente é o do sistema** (decisão do vídeo).
- **(Cross-módulo) Meta Ads** — não é chamado aqui; o handoff "pago" alimenta o módulo 17, que usa a Meta Ads API.
- Nenhuma chamada de integração no front; tudo pelo motor/back (doc 03/04).

## 8. Campos personalizados / status configuráveis
**Statuses (configuráveis — StatusModel, mapeados por `tipo` e cor):**
| Cor | Tipo | Uso |
|---|---|---|
| (cinza) | `nao_iniciado` | criada / aguardando início |
| Laranja | `aguardando_cs` | aguardando informações do CS |
| Azul | `andamento` | escrevendo / em andamento / "para fazer" e "em andamento" do design |
| Roxo | `revisao_interna` | revisão interna (estrategista/par) |
| Vermelho | `alteracao` | alteração e ajuste |
| Amarelo | `revisao_externa` | 2ª revisão / aprovação do cliente |
| (verde) | `concluido` | concluído (Copy concluída dispara A1) |

> Nomes exatos de cada status por entidade (Copy vs Design) são **configuráveis** pelo Admin; os acima são os tipos/cores documentados. 🔶 CONFIRMAR a lista nominal final por entidade com a Breakr.

**Campos obrigatórios (Copy/Design):** **Cliente** (dispara atribuição), **Squad** (derivado), **responsáveis** (copy/CS/designer/editor/estrategista — derivados), **gestor de tráfego** (quando peça paga; define roteamento F7). Demais campos personalizados por subtipo conforme CampoPersonalizado.

**Checklist de falha:** itens de verificação configuráveis por tipo de tarefa (R3.6).

**Tags:** tag do cliente (cor) aplicada automaticamente; tag "solicitar criativo" (dispara A7). **Sem TOFU/MOFU/BOFU em copy/criativo.**

## 9. Critérios de aceite
1. **Funil visual** — Dado um projeto Marketing, Quando o estrategista cria nós (estratégia/campanha/copy/criativo) e conexões e salva, Então a estratégia fica anexada ao projeto e aparece em `itens_relacionados[]`, e a navegação nó↔entidade funciona.
2. **Envio ao cliente** — Quando "enviar estratégia ao cliente" é acionado, Então é criada uma Aprovacao e o cliente recebe notificação (Portal + WhatsApp), sem uso de Canva.
3. **Comentário → CS** — Quando o cliente comenta a estratégia/peça, Então o CS do squad recebe notificação com link, e o comentário fica no histórico.
4. **Statuses cor-coded** — Os statuses de Copy/Design existem com as cores/tipos documentados (roxo/azul/laranja/vermelho/amarelo) e são editáveis pelo Admin sem deploy.
5. **Aguardando CS** — Quando a copy vai para "aguardando informações do CS", Então o CS é notificado e a tarefa fica como não-iniciada até receber os dados.
6. **Copy concluída → Design** — Quando a copy vai para "concluído", Então a tarefa é movida para Design no status "para fazer" e o designer correto é marcado automaticamente (A1).
7. **Atribuição por squad** — Dado um cliente com squad completo, Quando se cria a tarefa marcando só o Cliente, Então copy/CS/designer/editor/estrategista são preenchidos automaticamente; Dado squad ausente/incompleto, Então a criação bloqueia com erro indicando o que falta.
8. **Fluxo de design** — As transições para fazer → andamento → estrategista revisa → (alteração | aprovação) funcionam; voltas de revisão→alteração registram ReworkLog **interno** e de aprovação→alteração registram **externo**.
9. **Aprovação por link do sistema** — Quando uma peça entra em "aprovação", Então o grupo do WhatsApp recebe o **link do sistema** (não a pasta do Drive) e, após aprovação, dispara o pop-up de avaliação.
10. **Roteamento pós-aprovação** — Quando o cliente aprova, Então: com gestor de tráfego marcado a peça vira Criativo "Para testar" no laboratório (módulo 17); sem gestor, vai para agendamento e publicação.
11. **Nomenclatura automática** — Quando se cria copy/criativo, Então o nome recebe tag do cliente + `codigo_unico`, sem digitação manual, e sem TOFU/MOFU/BOFU.
12. **Auditoria** — Toda mudança de status, atribuição, envio e aprovação fica em AuditLog; toda automação fica em JobExecution (reprocessável).

## 10. Fora de escopo (deste módulo / desta fase)
- **Tela de aprovação/comentário do cliente, pop-up de avaliação, score de qualidade, Rework dashboard e carga por designer** → **Módulo 19 — Aprovação & Qualidade** (aqui só disparamos/geramos os eventos).
- **Campanhas, otimização, laboratório de criativos (operação), controle de orçamento e IA de tráfego** → **Módulo 17 — Tráfego Pago**.
- **Agendamento/publicação automática em redes sociais** (publicar de fato nos canais) — a v1 trata "agendamento e publicação" como **destino/visão de calendário**; publicação automática direta nas redes é 🔶 CONFIRMAR / provável fase posterior.
- **"Impressões offline"** como destino pós-aprovação — citado no vídeo, **fora da v1** 🔶.
- **Editor visual de regras de automação** (arrastar gatilho→ação) — fase posterior (doc 03); na v1 parâmetros/SLAs são editáveis por painel, regras complexas versionadas pelo time.
- **Materialização automática de entidades a partir dos nós do funil** — depende de R1.4 🔶.
