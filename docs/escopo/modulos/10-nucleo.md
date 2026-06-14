# Módulo 10 — Núcleo / Plataforma

> Camada base sobre a qual todos os demais módulos (11–21) rodam. Define quem entra, o que cada um vê e como o sistema se comunica internamente.
> Segue o `_TEMPLATE.md` (seções 1–10). Single-tenant (só Breakr — **sem `empresa_id`**). Storage abstraído. Motor de automação é o próprio (doc 03) — citações ao n8n são apenas "o que existe hoje / a migrar".

## 1. Objetivo
Entregar a fundação multiusuário do Breakr OS: autenticação, **cargos & permissões (RBAC)**, hierarquia **Departamento → Área → Lista**, **squads** com atribuição automática, **inbox geral** por usuário, painel **"Hoje & Atrasados" modular por cargo**, **comunicados oficiais** (broadcast), **mensagens diretas internas**, **WhatsApp integrado** com inbox roteado por área, **notificações/pop-ups em tempo real**, **gerador de código único** e **auditoria**.

**Substitui:** do **ClickUp** — login/usuários, Spaces→Folders→Lists (vira Departamento→Área→Lista), permissões por perfil, Inbox, comentários/menções, notificações, comunicados. Do **n8n** — nada como motor; o roteamento de WhatsApp por área que hoje seria orquestrado por workflow passa a ser regra do motor próprio (doc 03). O **WhatsApp Web aberto** é eliminado (passa a API oficial dentro do sistema, doc 04).

## 2. Atores & permissões
Cada **Usuario** pertence a **1 Cargo** (define permissões + layout do painel "Hoje & Atrasados") e a **N Squads** (com função no squad). Permissões são por **ação × módulo** (RBAC), atribuídas ao Cargo.

| Cargo | Núcleo: o que pode fazer |
|---|---|
| **Admin / Superadmin** | Tudo: criar/editar usuários, cargos e permissões; criar Departamentos/Áreas/Listas e Squads; configurar canais e roteamento de WhatsApp; publicar comunicados para todos; ver auditoria completa; configurar o gerador de código único. |
| **CS / CES** | Publicar comunicados (broadcast para equipe e/ou clientes — ver R3.2); abrir DM; usar inbox; ver painel "Hoje & Atrasados" do seu perfil; atender o inbox de WhatsApp das áreas a que tem acesso. |
| **Financeiro, Estrategista, Copywriter, Designer, Editor, Gestor de Tráfego, Jurídico** | Login; inbox pessoal; painel "Hoje & Atrasados" modular do seu cargo; DM; receber comunicados; ver/atender o inbox de WhatsApp **apenas da(s) área(s) do seu departamento** (R5.4). **Não** publicam comunicado broadcast (salvo permissão explícita). |

- **Acesso parcial explícito:** o roteamento de WhatsApp por área (R5.4) é uma forma de acesso parcial — um usuário só enxerga as conversas roteadas para sua área. Acesso a cláusulas de contrato pelo CS é tratado no Módulo 12 (não aqui).
- 🔶 **CONFIRMAR** lista canônica de cargos e a matriz fina de permissões por ação (o doc 02 lista cargos como exemplo "…"); na v1 o conjunto acima cobre o documentado.

## 3. Telas / visões
1. **Login** — e-mail + senha; recuperação de senha; sessão (JWT). Bloqueio de usuário `inativo`.
2. **Inbox geral** (por usuário logado) — duas seções: (a) **"Para mim"** — tarefas sob o cuidado do usuário (de qualquer módulo); (b) **notificações** (menções, atribuições, aprovações, avisos). Marcar como lida; abrir item de origem.
3. **Hoje & Atrasados** (modular por cargo) — lista do que está **para hoje** e o que está **atrasado**, com o conteúdo filtrado pelo cargo (designer → criativos; financeiro → contratos + boletos; gestor de tráfego → campanhas a otimizar). Layout definido no Cargo.
4. **Comunicados oficiais** (feed broadcast) — mural read-mostly: avisos da administração/CS (novo cliente, novo funcionário, novo parceiro, feriado…). Filtro por data/autor.
5. **Mensagens diretas (DM)** — chat interno 1:1 e (🔶 grupos internos — ver F4) entre funcionários.
6. **Inbox WhatsApp** (por área) — conversas da API oficial roteadas para a área do usuário; lista de threads + janela de conversa + envio de texto/mídia/template.
7. **Notificações / pop-ups em tempo real** — toaster + sino; pop-up modal para eventos críticos (ex.: "novo contrato para fazer" → Franciélia — Módulo 12 dispara, o Núcleo entrega).
8. **Admin: Usuários & Cargos** — CRUD de usuários; CRUD de cargos com editor de permissões e do layout do painel "Hoje & Atrasados".
9. **Admin: Estrutura organizacional** — árvore Departamento → Área → Lista (CRUD, reordenar).
10. **Admin: Squads** — CRUD de squads; adicionar membros com **função**; ver carga (nº de clientes por squad).
11. **Admin: Canais de WhatsApp & roteamento** — mapear número/linha ↔ área; regras de roteamento.
12. **Auditoria** — tabela filtrável de `AuditLog` (ator, ação, entidade, antes/depois, data).

## 4. Entidades usadas
Do **doc 02 — Modelo de Dados** (lê/escreve):
- **Config** *(singleton)* — branding e parâmetros globais (leitura; edição = Admin).
- **Usuario** — nome, email, senha(hash), `cargo_id`, `departamento_id`, `squads[]`, telefone WhatsApp, status (ativo/inativo), foto. **(CRUD)**
- **Cargo** — nome, `permissoes[]`, layout do painel "Hoje & Atrasados". **(CRUD)**
- **Departamento** → **Áreas** → **Listas/Processos** (hierarquia). **(CRUD)**
- **Squad** — nome, `membros[]` com **função** (CS/copy/designer/editor/estrategista/gestor). **(CRUD; fonte da atribuição automática)**
- **Notificacao** — usuário/cliente, tipo, lida? **(escreve/lê)**
- **Comunicado** — broadcast admin/CS. **(CRUD restrito)**
- **Mensagem** — chat interno / DM. **(escreve/lê)**
- **WhatsAppThread** — cliente/grupo, `wa_group_id` (@g.us), mensagens; **área de roteamento** 🔶. **(escreve/lê)**
- **AuditLog** — ator, ação, entidade, antes/depois, timestamp. **(escreve/lê)**
- **Gerador de código único** — serviço central que emite `codigo_unico` (base36, legível) para entidades de trabalho, anexado ao nome.
- Leitura transversal: **Tarefa** (para montar "Para mim" e "Hoje & Atrasados"), **Cliente** (para atribuição via squad e roteamento de thread).

## 5. Funcionalidades (regras de negócio numeradas)

### F1. Autenticação & sessão
- **R1.1** Login exige e-mail + senha; senha armazenada como **hash** (nunca em texto). Credenciais inválidas retornam erro genérico (sem dizer se o e-mail existe).
- **R1.2** Usuário com `status = inativo` **não** autentica (mesmo com senha correta).
- **R1.3** Sessão via **JWT**; expiração configurável; logout invalida a sessão no cliente. 🔶 CONFIRMAR tempo de expiração/refresh.
- **R1.4** Fluxo de **recuperação de senha** por e-mail (token de uso único, expira). 🔶 CONFIRMAR provedor de e-mail (Hostinger não tem API — ver doc 04 / Módulo 13).
- **R1.5** Toda autenticação (sucesso/falha) e logout geram registro em `AuditLog` (R10.1).
- **R1.6** 2FA **fora de escopo** na v1. 🔶 CONFIRMAR.

### F2. Cargos & permissões (RBAC)
- **R2.1** Permissão é um par **ação × módulo** (ex.: `comunicado:publicar`, `usuario:editar`, `whatsapp:atender:financeiro`). O **Cargo** detém um conjunto de permissões.
- **R2.2** Todo acesso a recurso/ação é verificado no **backend** contra as permissões do cargo do usuário; o front apenas oculta/desabilita (a verificação real é server-side).
- **R2.3** O **Cargo** também define o **layout do painel "Hoje & Atrasados"** (quais blocos/tipos de tarefa aparecem — R6.x).
- **R2.4** Apenas **Admin/Superadmin** cria/edita cargos e permissões; alteração registra em `AuditLog`.
- **R2.5** Um usuário tem **exatamente 1 cargo** (define permissões) e **N squads** (define função operacional). Cargo ≠ função no squad.
- **R2.6** Permissões podem conceder **acesso parcial** (ex.: atender WhatsApp só de uma área — R5.4). Acesso parcial é a exceção explícita ao "tudo ou nada".

### F3. Estrutura organizacional (Departamento → Área → Lista)
- **R3.1** Hierarquia de 3 níveis: **Departamento** (Comercial, Sucesso do Cliente, Marketing, Administração, Projetos, Desenvolvimento) → **Área** → **Lista/Processo** (= projeto/processo, equivalente às Lists do ClickUp).
- **R3.2** CRUD e **reordenação** de cada nível por Admin. Excluir um nível com filhos exige confirmação e é bloqueado se houver tarefas vinculadas. 🔶 CONFIRMAR política (bloquear vs arquivar).
- **R3.3** A estrutura é a base de navegação dos módulos operacionais (16/17 etc.) e do roteamento de WhatsApp por **área** (R5.4).

### F4. Comunicados oficiais (broadcast)
- **R4.1** Um **Comunicado** é uma mensagem read-mostly enviada a **toda a equipe** (ou segmento), publicada **apenas** por quem tem `comunicado:publicar` (Admin e CS — R2.1).
- **R4.2** Casos de uso documentados: novo cliente, novo funcionário, novo parceiro, aviso geral, feriado.
- **R4.3** Ao publicar, o sistema gera **Notificacao** para os destinatários (R7) e o comunicado aparece no **feed de comunicados** (tela 4).
- **R4.4** Comunicado pode opcionalmente **também ser enviado a clientes** (Portal + WhatsApp) — esse caminho de cliente é especificado no **Módulo 14** (Portal); aqui o Núcleo só registra a origem e dispara a regra do motor.
- **R4.5** Comunicados são **somente leitura** para os destinatários (sem responder no feed; dúvidas vão por DM). 🔶 CONFIRMAR se admite reações/confirmação de leitura.

### F5. Mensagens diretas internas & WhatsApp integrado
- **R5.1** Qualquer usuário ativo pode abrir **DM 1:1** com outro usuário ativo. Mensagens persistem em `Mensagem`.
- **R5.2** 🔶 **CONFIRMAR** grupos internos / threads multi-usuário (o transcrito cita "mandar mensagem para todo mundo" — pode ser broadcast (F4) e/ou DM em massa). Na v1, DM 1:1 está documentada; grupo interno fica marcado para confirmar.
- **R5.3** **WhatsApp integrado** usa a **API oficial** (VAI é o integrador — doc 04); **proíbe-se** depender de WhatsApp Web aberto. Mensagens recebidas entram como `WhatsAppThread`.
- **R5.4** **Roteamento por área:** cada thread de WhatsApp é roteada para uma **área** (ex.: mensagem do financeiro "apita" no painel da Franciélia). Usuário só vê/atende threads das áreas a que seu cargo dá acesso (acesso parcial, R2.6). 🔶 CONFIRMAR critério de roteamento (por número/linha de origem, por palavra-chave, ou atribuição manual) — registrar a regra no motor (doc 03).
- **R5.5** Atender uma thread (responder texto/mídia/template) usa o adapter WhatsApp (doc 04); o envio é registrado e a thread atualiza em tempo real (R7).
- **R5.6** Threads de **grupo de cliente** (`@g.us`, `wa_group_id`) também aparecem roteadas; criação/admin de grupo é disparada por outros módulos (12/14) via motor.

### F6. Inbox geral & painel "Hoje & Atrasados" (modular por cargo)
- **R6.1** **Inbox "Para mim"** lista todas as **Tarefas** cujo responsável (derivado de squad+função — R8) é o usuário logado, de qualquer módulo.
- **R6.2** **"Hoje & Atrasados"** deriva da `due date` da Tarefa: **Hoje** = vence hoje; **Atrasado** = `due date` < hoje e status ≠ concluído.
- **R6.3** O painel é **modular por cargo** (R2.3): o **Designer** vê criativos/artes; o **Financeiro** vê contratos a fazer + boletos a pagar/cobrar; o **Gestor de Tráfego** vê campanhas a otimizar. Cada cargo tem um **layout** que mapeia quais tipos/subtipos de Tarefa exibir.
- **R6.4** Os itens são **acionáveis**: clicar abre a Tarefa de origem no módulo correspondente.
- **R6.5** A contagem de "Atrasados" alimenta um badge no inbox/menu (atualização em tempo real — R7).
- **R6.6** 🔶 CONFIRMAR fuso/horário de corte do "hoje" (assumir timezone da Breakr — America/Sao_Paulo — até confirmação).

### F7. Notificações & pop-ups em tempo real
- **R7.1** Eventos relevantes geram **Notificacao** (atribuição de tarefa, menção, aprovação pendente, comunicado, mudança de status que afete o usuário).
- **R7.2** Entrega em **tempo real via WebSocket** (toaster + atualização do sino/inbox sem refresh).
- **R7.3** Eventos **críticos** disparam **pop-up modal** (ex.: "novo contrato para fazer" → Franciélia; Módulo 12 emite o evento, o Núcleo renderiza o pop-up). O catálogo de eventos-pop-up é configurável (parâmetro do motor — doc 03).
- **R7.4** Notificação tem estado **lida/não-lida**; marcar como lida não apaga o histórico.
- **R7.5** Se o usuário estiver offline, a notificação fica pendente e aparece no próximo login (não se perde).

### F8. Squads & atribuição automática
- **R8.1** **Squad** tem `membros[]`, cada membro com uma **função** (CS, copy, designer, editor, estrategista, gestor). Um squad pode ter no máximo 1 membro ativo por função 🔶 CONFIRMAR (o transcrito assume 1 por função).
- **R8.2** **Cliente** está vinculado a **1 squad** (`Cliente.squad_id`).
- **R8.3** **Atribuição automática (regra de ouro):** ao criar/editar uma **Tarefa**, o usuário escolhe o **cliente** (ou o cliente já vem do contexto) → o sistema resolve **Cliente.squad → Squad.membros[função]** e **preenche automaticamente os responsáveis** por função (copy/design/CS/gestor/estrategista). O operador **não** seleciona usuário por usuário.
- **R8.4** A resolução de responsável por subtipo de tarefa segue a função correspondente (ex.: Design → membro `designer` do squad; Copy → `copywriter`; Otimização/Campanha → `gestor de tráfego`).
- **R8.5** Se o squad não tiver a função exigida preenchida, o sistema **bloqueia/avisa** ("checklist de falha" — Módulo 16) em vez de atribuir vazio. 🔶 CONFIRMAR comportamento exato (bloquear criação vs criar sem responsável + alerta).
- **R8.6** **Carga por squad** é exibida ao Admin (nº de clientes por squad) — insumo para o **auto-balanceamento** (especificado no Módulo 14; aqui o Núcleo só expõe a contagem).

### F9. Gerador de código único & rastreabilidade
- **R9.1** Serviço central emite `codigo_unico` **curto, legível** (ex.: base36) na **criação** de qualquer entidade de trabalho (Tarefa, Contrato, Campanha, Público, etc.).
- **R9.2** O código é **anexado ao nome** da entidade (ex.: `[ABC123] Campanha Dia dos Namorados`), garantindo rastreabilidade entre **sistema ↔ Meta Ads ↔ documentos**.
- **R9.3** O código é **único** e **imutável** após a criação; colisões são impossíveis (geração com verificação).
- **R9.4** O formato/prefixo por tipo de entidade é **configurável** (parâmetro). 🔶 CONFIRMAR tamanho e se há prefixo por tipo (ex.: `cP`/`Pb` herdados das nomenclaturas atuais — ver Módulos 16/17).

### F10. Auditoria
- **R10.1** Toda ação relevante (login, CRUD de usuário/cargo/squad/estrutura, publicação de comunicado, alteração de permissão) grava em **AuditLog**: ator, ação, entidade, **antes/depois**, timestamp.
- **R10.2** A trilha é **somente-leitura** (não editável nem apagável via UI).
- **R10.3** Consulta filtrável por ator, entidade, ação e período (tela 12), restrita a Admin.

## 6. Automações envolvidas (regras do motor — doc 03)
Formato **Trigger → Condições → Ações**. O motor é o próprio (doc 03); referências a workflows do n8n indicam apenas equivalência/o que existe hoje.

- **A1. Roteamento de WhatsApp por área**
  - **Trigger:** webhook de entrada (mensagem recebida na API oficial) → evento `whatsapp.mensagem_recebida`.
  - **Condições:** identificar **área** (por número/linha de origem ou palavra-chave 🔶 R5.4).
  - **Ações:** criar/atualizar `WhatsAppThread` com a área; criar `Notificacao` para usuários da área; emitir realtime (pop-up "apita" no painel).
  - *Equivalência hoje:* parte do disparo/recepção via **Mega API** (n8n `Disparo em Grupos | Mega API`) — migra para o motor + API oficial.

- **A2. Publicação de comunicado**
  - **Trigger:** evento `comunicado.publicado` (manual, por Admin/CS).
  - **Condições:** destinatário = equipe e/ou clientes (R4.4).
  - **Ações:** criar `Notificacao` em massa; realtime; (se cliente) acionar regra do Portal (Módulo 14).

- **A3. Entrega de notificação em tempo real**
  - **Trigger:** evento de domínio (`tarefa.atribuida`, `tarefa.status_alterado`, `aprovacao.pendente`, `contrato.para_revisar`…).
  - **Condições:** o evento referencia um usuário/área alvo.
  - **Ações:** criar `Notificacao`; push WebSocket; pop-up se o evento estiver na lista de **eventos-críticos** (parâmetro configurável).

- **A4. Geração de código único na criação**
  - **Trigger:** evento `entidade.criada` (Tarefa/Contrato/Campanha/Público…). *Equivalência hoje:* workflows **[Nomenclatura] Campanhas/Públicos/Criativos/Copywriting** do n8n.
  - **Condições:** entidade é "de trabalho" (R9.1).
  - **Ações:** gerar `codigo_unico` + **renomear** anexando ao nome (R9.2); aplicar padrão por tipo (🔶 R9.4).

- **A5. Atribuição automática por squad**
  - **Trigger:** evento `tarefa.criada` / `tarefa.cliente_definido`.
  - **Condições:** `Cliente.squad` resolvido; função-alvo existe no squad.
  - **Ações:** preencher responsáveis por função (R8.3–R8.4); se função ausente → alerta/checklist de falha (🔶 R8.5).

> **Observação de centralização (doc 04):** todo retorno de WhatsApp (mensagens, status de envio) é salvo no banco; o sistema nunca depende de "ir ver no WhatsApp Web".

## 7. Integrações (doc 04)
- **WhatsApp — API oficial (+ MegaAPI na transição):** receber mensagens (webhook → A1), enviar texto/mídia/template no inbox por área (R5.5), gerenciar threads/grupos (`@g.us`, `wa_group_id`). É a única integração externa "dona" deste módulo.
- **E-mail (recuperação de senha — R1.4):** 🔶 CONFIRMAR provedor (Hostinger sem API → avaliar SMTP/serviço transacional; tratado no doc 04/Módulo 13).
- *(WebSocket realtime é infra interna — doc 01, não é integração externa.)*

## 8. Campos personalizados / status configuráveis
- **Cargo:** `permissoes[]` (ação×módulo), `layout_hoje_atrasados` (blocos por tipo/subtipo de Tarefa).
- **Squad.membros[]:** campo **função** (enum: CS, copywriter, designer, editor, estrategista, gestor de tráfego).
- **WhatsAppThread:** campo **área** (FK Área) para roteamento — 🔶 CONFIRMAR se entra como campo dedicado no doc 02.
- **Comunicado:** `audiencia` (equipe | clientes | ambos), `autor`, `data`.
- **Status configuráveis:** este módulo **não** define statuses de produção (isso é dos módulos operacionais via `StatusModel`); usa apenas estados simples: Usuario {ativo/inativo}, Notificacao {lida/não-lida}, Comunicado {publicado}.
- **Gerador de código único:** parâmetro de formato/prefixo por entidade (configurável — R9.4).

## 9. Critérios de aceite
1. **Login/RBAC:** Given um usuário ativo com cargo "Designer", When ele autentica, Then vê apenas o que seu cargo permite e uma chamada a recurso sem permissão é **negada no backend** (não só oculta no front). (R1.1–R1.2, R2.2)
2. **Usuário inativo:** Given `status=inativo`, When tenta login com senha correta, Then o acesso é negado e o evento é auditado. (R1.2, R10.1)
3. **Hoje & Atrasados modular:** Given o cargo "Financeiro", When abre o painel, Then vê contratos a fazer + boletos a pagar/cobrar; e o cargo "Gestor de Tráfego" vê campanhas a otimizar — cada um conforme o layout do seu cargo. (R6.3, R2.3)
4. **Atrasado:** Given uma Tarefa com due date de ontem e status ≠ concluído, When o usuário responsável abre o inbox, Then ela aparece em "Atrasados" e conta no badge em tempo real. (R6.2, R6.5)
5. **Atribuição automática:** Given um Cliente no squad "Trovão", When uma Tarefa de Design é criada para esse cliente, Then o responsável é preenchido automaticamente com o `designer` do squad Trovão, sem o operador escolher usuário. (R8.2–R8.4)
6. **Função ausente:** Given um squad sem `gestor de tráfego`, When uma Tarefa de Campanha é criada para um cliente desse squad, Then o sistema alerta/bloqueia (🔶 conforme R8.5) em vez de atribuir vazio.
7. **Comunicado broadcast:** Given um CS com permissão, When publica "amanhã é feriado", Then todos os usuários recebem Notificacao em tempo real e o item aparece no feed de comunicados; um Designer **não** consegue publicar comunicado. (R4.1, R4.3, R7.2)
8. **WhatsApp roteado:** Given uma mensagem recebida classificada como "financeiro", When ela chega, Then cria/atualiza a thread roteada para a área Financeiro, "apita" para a Franciélia e **não** aparece para cargos sem acesso à área. (R5.4, A1)
9. **Pop-up em tempo real:** Given o evento crítico "novo contrato para revisar" (emitido pelo Módulo 12), When ocorre, Then a Franciélia recebe um pop-up modal em tempo real. (R7.3)
10. **Código único:** Given a criação de uma Campanha, When ela é salva, Then recebe um `codigo_unico` único e imutável **anexado ao nome**, rastreável no Meta Ads e documentos. (R9.1–R9.3)
11. **Auditoria:** Given qualquer alteração de permissão de um cargo, When salva, Then `AuditLog` registra ator, antes/depois e timestamp, e a trilha não é editável pela UI. (R10.1–R10.2)
12. **Realtime confiável:** Given um usuário offline no momento de uma notificação, When ele faz login depois, Then a notificação pendente aparece (não se perde). (R7.5)
13. **Hierarquia:** Given Departamento → Área → Lista, When o Admin cria/reordena níveis, Then a navegação dos módulos e o roteamento por área refletem a estrutura. (R3.1–R3.3)

## 10. Fora de escopo (deste módulo / desta fase)
- **2FA / SSO** e políticas avançadas de senha — 🔶 CONFIRMAR; v1 usa e-mail+senha+JWT.
- **Multi-empresa / white-label** — single-tenant decidido (sem `empresa_id`).
- **Grupos internos de chat (threads multi-usuário)** — 🔶 CONFIRMAR; v1 cobre DM 1:1 e broadcast.
- **App mobile nativo** — v1 é web responsiva (doc 00, 🔶 CONFIRMAR).
- **Editor visual de regras** do motor (arrastar gatilho→ações) — fase posterior (doc 03); na v1 o Gustavo edita **parâmetros** por painel.
- **Roteamento de WhatsApp para clientes / criação de grupos** — disparado por Módulos 12/14; o Núcleo só entrega/roteia.
- **Statuses de produção e campos personalizados de tarefa** — pertencem aos módulos operacionais (16/17) via `StatusModel`/`CampoPersonalizado`.
- **Confirmação de leitura de comunicado** — 🔶 CONFIRMAR (R4.5).
