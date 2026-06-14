# Módulo 14 — CS · Onboarding · Portal do Cliente

> Estrutura padrão de cada módulo. Preencher TODAS as seções. Nada subentendido.

## 1. Objetivo
Centralizar todo o relacionamento pós-venda da Breakr: **gestão de clientes ativos, tickets, NPS e gestão de crise** (Sucesso do Cliente), o **onboarding gamificado** do cliente (progresso PDC + medalhas + tarefas) e o **Portal do Cliente** (estilo eCite: painel, área de membros/aulas, banners, notificações broadcast no sistema + WhatsApp).

**Substitui:**
- **ClickUp** — departamento "Sucesso do Cliente" (áreas: atendimento/tickets, NPS, gestão de crise, gestão de clientes ativos) e o processo manual de onboarding por pastas/links.
- **n8n** — workflow "Liberar Onboarding Após Pagamento" (cria steps de onboarding + grupo WhatsApp + notifica CS) e os disparos de notificação broadcast.
- **eCite** (parcial) — o painel/portal do cliente. *(A aprovação de peças em si é detalhada no Módulo 18; este módulo só fornece o "container" do portal e a navegação até ela.)*
- **Google Calendar** (parcial) — o calendário do cliente dentro do portal.

## 2. Atores & permissões
| Cargo | Permissões |
|---|---|
| **CS / CES** | Ver/criar/editar tickets, NPS, gestão de crise, clientes ativos do(s) seu(s) squad(s); conduzir onboarding (criar/editar steps, marcar concluído, conceder medalhas); criar reuniões com cliente; disparar notificações broadcast para os clientes; ver/editar conteúdo do portal do cliente. **Não** configura SLAs/automações. |
| **Admin / Superadmin** | Tudo do CS + configurar SLAs (onboarding 3h), modelo de PDC (steps padrão), medalhas, banners fixos, regra de auto-balanceamento de squad, conteúdo da área de membros/aulas; ver todos os squads. |
| **Estrategista / Copy / Designer / Editor / Gestor de Tráfego** | Acesso **somente leitura** ao status de onboarding e à ficha do cliente ativo do seu squad (para contexto). **Não** gerenciam tickets/NPS/portal. 🔶 CONFIRMAR nível de leitura por cargo. |
| **Financeiro / Jurídico** | Leitura da ficha do cliente (ciclo, contrato vinculado). **Não** gerenciam onboarding/portal. |
| **Cliente** (restaurante) | Acessa **apenas** o Portal do Cliente: vê seu painel (boas-vindas, CS, tarefas de onboarding, pesquisas, medalhas, notificações), calendário próprio, área de membros/aulas; preenche o formulário de onboarding e tarefas designadas; lê banners; responde NPS/pesquisas. **Não** vê dados internos da Breakr nem de outros clientes. |

> O cliente acessa o portal **antes** da primeira reunião com o CS — assim que o contrato é assinado e o pagamento confirmado (ver F2/F6).

## 3. Telas / visões
**Internas (equipe):**
1. **Gestão de Clientes Ativos** (lista + visão de cards por squad) — todos os clientes do CS com status do ciclo, squad, NPS atual, tickets abertos, % do PDC de onboarding.
2. **Tickets** (lista/board por status) — fila de atendimento e suporte do squad; abre detalhe com histórico/conversa.
3. **NPS** (lista + dashboard) — registros de NPS por cliente, nota, classificação (detrator/neutro/promotor), evolução.
4. **Gestão de Crise** (lista/board) — casos de crise por cliente, gravidade, status, plano de ação.
5. **Onboarding do Cliente** (detalhe por cliente) — barra de progresso (PDC %), medalhas conquistadas, lista de steps/tarefas com status, calendário do cliente, **cofre de acessos** (campos para copiar/colar).
6. **Reuniões com Clientes** (lista + **visão de mapa/calendário**) — cadastro e agenda de reuniões; ver Módulo 21 (Agenda) para regras de booking/sala.
7. **Painel de Config do CS** (admin) — steps padrão do PDC, catálogo de medalhas, SLAs, banners fixos, conteúdo da área de membros, regra de auto-balanceamento.

**Portal do Cliente (externo, estilo eCite):**
8. **Painel (Home)** — boas-vindas, card do CS (nome + frase), barra de progresso PDC, medalhas, tarefas de onboarding pendentes, pesquisas, notificações; **banner(s) fixo(s)** no topo (avisos/feriados).
9. **Minhas Tarefas / Onboarding** — formulário de onboarding (referências, dados do negócio), upload/links de materiais, mentor, links de pasta; cada tarefa enche a barra ao concluir.
10. **Meu Calendário** — datas das reuniões (coleta de dados, onboarding, alinhamento) com o que o cliente precisa ter "em mãos" em cada uma (ex.: senha do Facebook → puxa do cofre de acessos).
11. **Área de Membros / Aulas** — vídeos/aulas: como funciona a agência, metas e expectativas (com a imagem do CES). 🔶 CONFIRMAR se host interno ou embed (YouTube).
12. **Pesquisas / NPS** — responder pesquisas e NPS.
13. **Medalhas** — galeria das medalhas conquistadas.
14. **Notificações** — histórico das notificações recebidas.
> A tela de **aprovação de peças** (criativos/estratégia) aparece no portal, mas é especificada no **Módulo 18**.

## 4. Entidades usadas
- **Onboarding** (leitura/escrita): `cliente_id`, **progresso (PDC %)**, **medalhas[]**, steps (form, materiais, acessos, reuniões), calendário do cliente.
- **Tarefa** subtipo **OnboardingStep** (leitura/escrita): step do onboarding com `status_id`, due date, responsável, checklist, anexos/links.
- **Ticket / NPS / GestaoCrise** (leitura/escrita): `cliente_id`, squad, status; NPS com nota/classificação.
- **Cliente** (leitura; escrita do `status do ciclo` e `squad_id`): nome fantasia, tag, `plano_id`, `squad_id`, **status do ciclo** (Novo → Onboard → Ativo → Renovação → Inativo), grupo WhatsApp (id), pasta Drive (link), **acessos** (cofre — 🔶 CONFIRMAR onde residem: campos do Cliente vs. do Onboarding).
- **Squad** (leitura): `membros[]` com função → identifica o **CS** do squad; usado no auto-balanceamento.
- **Reuniao** (leitura/escrita): tipo `cliente`, participantes, link, agenda, sala, confirmações (ver Módulo 21).
- **Notificacao** (escrita): para o cliente.
- **Comunicado** (escrita): broadcast CS/admin para clientes.
- **WhatsAppThread** (leitura/escrita): grupo do cliente (`wa_group_id` @g.us) — criação/uso.
- **Plano** (leitura): para derivar steps/expectativas do onboarding conforme contratado. 🔶 CONFIRMAR se o PDC varia por plano.
- **Avaliacao / Aprovacao** (leitura): exibidas no portal — detalhe no Módulo 18.
- **Config** (leitura): branding/parâmetros globais.
- **AuditLog** (escrita): toda ação relevante (conceder medalha, mudar ciclo, disparar broadcast).

## 5. Funcionalidades (regras de negócio numeradas)

- **F1. Gestão de clientes ativos** — visão única dos clientes do CS.
  - R1.1 A lista mostra todos os clientes cujo `squad_id` contém o CS logado; admin vê todos.
  - R1.2 Cada cliente exibe: status do ciclo, squad/tag, % do PDC, NPS mais recente, nº de tickets abertos, nº de crises abertas.
  - R1.3 Filtros por status do ciclo, squad e por "tem ticket aberto" / "em crise".
  - R1.4 Abrir um cliente dá acesso à sua ficha (onboarding, tickets, NPS, crises, reuniões, contrato — cláusulas conforme permissão).

- **F2. Onboarding gamificado (PDC + medalhas + tarefas)** — reduzir a burocracia atual ("o onboarding agarra demais").
  - R2.1 Ao entrar o cliente (evento de pagamento confirmado — ver F6/A1), o sistema cria um **Onboarding** com os **steps padrão** configurados, cada um como **Tarefa OnboardingStep**.
  - R2.2 Steps mínimos (configuráveis): (a) **formulário de onboarding** (referências + dados do negócio); (b) **materiais/pastas**; (c) **mentor** (nome/contato); (d) **links** (ex.: pasta de referências); (e) **reuniões** (coleta de dados, onboarding, alinhamento) — ver F4.
  - R2.3 A **barra de progresso (PDC %)** = (steps concluídos ÷ total de steps) × 100; atualiza a cada step concluído.
  - R2.4 Concluir um step pode **conceder uma medalha** (regra configurável step→medalha); a medalha aparece no portal do cliente.
  - R2.5 O formulário de onboarding é preenchido **pelo cliente no portal**; ao enviar, marca o step (a) como concluído e os dados ficam visíveis para o CS.
  - R2.6 Quando o PDC atinge 100%, o `status do ciclo` do cliente muda de **Onboard → Ativo** (🔶 CONFIRMAR se automático ou exige confirmação do CS).
  - R2.7 O CS pode editar steps, reordenar, marcar concluído manualmente e conceder/retirar medalhas.

- **F3. Cofre de acessos (copiar/colar)** — eliminar o vai-e-vem de senhas no onboarding.
  - R3.1 Cada cliente tem um conjunto de **acessos** (ex.: senha do Facebook/BM, logins) armazenados de forma segura (criptografados — ver Módulo de núcleo/cofre).
  - R3.2 O cliente pode informar/salvar acessos pelo portal (em tarefa específica, ex.: "coleta de acessos").
  - R3.3 No calendário e nas telas de reunião, os acessos relevantes aparecem com **botão copiar** para o CS usar na reunião ("já deixa tudo salvo para copiar e colar").
  - R3.4 Acesso aos campos sensíveis respeita permissão por cargo e é logado em AuditLog. 🔶 CONFIRMAR quem além do CS pode ver.

- **F4. Calendário do cliente (no portal)** — datas e "o que ter em mãos".
  - R4.1 O calendário do cliente lista as reuniões de onboarding com data/horário: **coleta de dados**, **reunião de onboarding**, **reunião de alinhamento**.
  - R4.2 Cada evento mostra ao cliente o que ele precisa ter em mãos (ex.: para coleta de acessos → senha do Facebook), puxando do cofre de acessos quando aplicável.
  - R4.3 As reuniões aqui são as mesmas entidades **Reuniao** geridas pelo CS (F7) — fonte única.

- **F5. Portal do Cliente (estilo eCite)** — área de relacionamento do cliente.
  - R5.1 O cliente acessa por login próprio; vê **somente** seus dados (escopo por `cliente_id`).
  - R5.2 O **painel** mostra: boas-vindas, card do CS (nome + frase), barra PDC, medalhas, tarefas pendentes, pesquisas, notificações.
  - R5.3 **Banner(s) fixo(s)** no topo exibem avisos/feriados configurados (ver F8); a mensagem broadcast enviada também fica fixada como banner.
  - R5.4 **Área de membros/aulas**: conteúdo "como funciona a agência", "metas e expectativas"; reduz reunião repetitiva. 🔶 CONFIRMAR host (interno vs. YouTube/embed) — doc 00 diz que v1 entrega "apenas painel/links".
  - R5.5 O cliente acessa **aprovação de peças** a partir do portal (link do sistema no lugar da pasta do Drive) — fluxo no **Módulo 18**.
  - R5.6 O portal é responsivo (web). App nativo está fora da v1 (🔶 CONFIRMAR — doc 00).

- **F6. Entrada do cliente & criação automática (gatilho de onboarding)** — ver detalhe em A1.
  - R6.1 O cliente passa a ter acesso ao portal **assim que o contrato está "Em vigor" e o pagamento é confirmado**, antes da reunião com o CS.
  - R6.2 A entrada dispara: criação do Onboarding + steps, criação do **grupo WhatsApp** com o CS como admin, e **notificação ao CS** com **SLA de 3h**.
  - R6.3 A criação dos **projetos** do cliente é feita pelo **Módulo 15** (mesmo gatilho de contrato em vigor) — este módulo não duplica.

- **F7. Reuniões com clientes** — cadastro + agenda (substitui o processo manual do ClickUp + agenda.breakr.com.br).
  - R7.1 O CS cadastra uma reunião selecionando o **cliente** e o **tópico**; o nome é montado automaticamente no padrão **`[Nome do Cliente] dd/mm/aaaa | {Tópico} #codigo_unico`** (gerador de nome — ver doc 02 e `_MAPEAMENTO/reunioes`).
  - R7.2 Numa **única ação** o CS cria a reunião, gera o link (Google Meet) e adiciona os participantes — sem pular para outra ferramenta (hoje exige criar task → criar meeting → atualizar link → marcar na agenda).
  - R7.3 A reunião aparece na **visão de mapa/calendário** de reuniões com clientes e no calendário do cliente (F4).
  - R7.4 Regras de janela de agendamento, sala presencial e confirmações/follow-up seguem o **Módulo 21** (Agenda).

- **F8. Notificações broadcast (sistema + WhatsApp) e banners** — comunicar todos os clientes de uma vez.
  - R8.1 CS/Admin dispara uma **notificação broadcast** para todos os seus clientes (ou um recorte por squad/segmento — 🔶 CONFIRMAR recortes).
  - R8.2 A mensagem é entregue em **dois canais**: (a) **notificação no sistema** (aparece no portal) e (b) **WhatsApp** (no grupo do cliente).
  - R8.3 A mesma mensagem fica **fixada como banner** no topo do portal pelo período configurado (ex.: aviso de feriado).
  - R8.4 Banners de feriado/aviso podem também ser cadastrados como **fixos** independentemente de broadcast (config).

- **F9. Tickets** — atendimento e suporte do cliente.
  - R9.1 Ticket tem `cliente_id`, squad, status (configurável), responsável (CS do squad), descrição/conversa.
  - R9.2 Tickets abertos aparecem no painel "Hoje & Atrasados" do CS e na ficha do cliente.
  - R9.3 Comentários de aprovação devolvidos pelo cliente (Módulo 18) podem **gerar/alimentar** um item de atendimento para o CS. 🔶 CONFIRMAR se vira ticket automático ou tarefa de ajuste.

- **F10. NPS** — medir satisfação.
  - R10.1 O CS dispara uma pesquisa NPS ao cliente (aparece no portal, F12 da tela; e pode ir por WhatsApp).
  - R10.2 A resposta registra nota (0–10) e classifica detrator/neutro/promotor; alimenta o dashboard de NPS.
  - R10.3 NPS por cliente fica visível na ficha do cliente e no painel de NPS.

- **F11. Gestão de crise** — tratar clientes em risco.
  - R11.1 O CS abre um caso de crise vinculado ao cliente, com gravidade e plano de ação/status.
  - R11.2 Cliente em crise é sinalizado na lista de clientes ativos (R1.2).
  - R11.3 🔶 CONFIRMAR gatilhos automáticos (ex.: NPS detrator → sugere abrir crise).

- **F12. Auto-balanceamento de squad** — novo cliente vai para o squad com menos clientes (impossível no ClickUp hoje).
  - R12.1 Ao criar o cliente sem squad definido, o sistema atribui o **squad ativo com o menor número de clientes ativos**.
  - R12.2 Em empate, usa critério de desempate configurável (🔶 CONFIRMAR: round-robin / ordem de criação).
  - R12.3 Squads inativos/cheios podem ser excluídos do balanceamento (config). 🔶 CONFIRMAR existência de teto por squad.
  - R12.4 A atribuição é registrada em AuditLog e pode ser **sobrescrita** por Admin.

## 6. Automações envolvidas (regras do motor — doc 03)
Cada automação no formato **Trigger → Condições → Ações**.

- **A1. Liberar Onboarding Após Pagamento** *(equivalente n8n "Liberar Onboarding Após Pagamento")*
  - **Trigger:** evento de domínio `fatura.paga` (com contrato "Em vigor").
  - **Condições:** cliente ainda não onboardado; contrato vinculado em vigor.
  - **Ações:** (1) [se sem squad] aplicar **auto-balanceamento** (F12); (2) criar **Onboarding** + **steps padrão** (OnboardingStep) com base no plano; (3) **criar grupo WhatsApp** do cliente e **adicionar o CS do squad como admin**; (4) enviar mensagem/descrição inicial no grupo; (5) criar **notificação/pop-up ao CS** com **SLA de 3h**; (6) liberar acesso do cliente ao portal; (7) mudar `status do ciclo` para **Onboard**.
  - **Muda vs. n8n:** a criação de **projetos** sai daqui e é tratada pelo Módulo 15 (mesmo gatilho); a emissão de **NF (Speed)** pertence ao módulo Financeiro; aqui ficam onboarding + grupo + portal + SLA.

- **A2. SLA de onboarding (3h)** *(parametrizável no painel — doc 03)*
  - **Trigger:** temporal, a partir da criação da notificação do CS (A1, passo 5).
  - **Condições:** CS não deu o primeiro atendimento/contato dentro de 3h.
  - **Ações:** alertar o CS (e escalar para Admin — 🔶 CONFIRMAR escalonamento e o que conta como "atendido").

- **A3. Conclusão de onboarding → cliente Ativo**
  - **Trigger:** mudança de status — último OnboardingStep concluído (PDC = 100%).
  - **Condições:** todos os steps concluídos.
  - **Ações:** conceder medalha final (se configurada); 🔶 mudar `status do ciclo` Onboard → **Ativo** (R2.6) ou criar tarefa de confirmação ao CS.

- **A4. Concessão de medalha por step**
  - **Trigger:** mudança de status de um OnboardingStep para "concluído".
  - **Condições:** existe medalha mapeada para o step.
  - **Ações:** registrar medalha no Onboarding; notificar o cliente no portal.

- **A5. Notificação broadcast multicanal + banner**
  - **Trigger:** manual (CS/Admin dispara broadcast).
  - **Condições:** destinatários = clientes do CS / recorte selecionado.
  - **Ações:** criar **Notificacao** no portal de cada cliente; enviar **WhatsApp** ao grupo; **fixar banner** no portal pelo período configurado.

- **A6. Comentário de aprovação do cliente → CS** *(originado no Módulo 18)*
  - **Trigger:** evento de comentário/ajuste numa Aprovacao.
  - **Condições:** comentário do cliente.
  - **Ações:** notificar o CS do squad; 🔶 CONFIRMAR se cria ticket/tarefa de ajuste (R9.3). *(Fluxo de aprovação no Módulo 18.)*

- **A7. Confirmação/follow-up de reunião com cliente** *(equivalente n8n "Confirmação de Reunião + Follow-up")*
  - **Trigger:** temporal, antes da reunião do cliente.
  - **Condições:** reunião agendada e confirmada.
  - **Ações:** disparos de lembrete (48h/24h/3h/1h30/30min/15min) + link, via WhatsApp/notificação. *(Regra detalhada no Módulo 21; aqui só o vínculo com reuniões de cliente.)*

> Todas as automações rodam como **jobs** com retry/idempotência e ficam no **painel de execuções** (doc 03). Parâmetros (SLA 3h, períodos de banner, mapeamento step→medalha) são editáveis por painel sem deploy.

## 7. Integrações (doc 04)
- **WhatsApp (API oficial)** — criar grupo do cliente, adicionar CS como admin, enviar mensagem inicial, **broadcast** (A5), follow-up de reunião (A7). (`wa_group_id` @g.us salvo no Cliente.)
- **Google Docs/Drive** — leitura do link da **pasta padrão** do cliente (criada no fluxo de entrada — Módulo 15/Financeiro); storage abstraído.
- **Google Meet / Calendar** — link de reunião e agenda (via Módulo 21).
- **ASAAS** — apenas como **origem do gatilho** (`fatura.paga`) que dispara A1; sem chamadas próprias deste módulo.
- **Área de aulas** — 🔶 CONFIRMAR se há integração (YouTube/host) ou apenas links (doc 00 indica links na v1).

## 8. Campos personalizados / status configuráveis
- **OnboardingStep** — campos: tipo do step (form/materiais/mentor/links/reunião/acessos), responsável, due date, checklist, anexos/links; **medalha vinculada** (opcional).
- **Status de OnboardingStep** (configurável, via StatusModel): ex. `Pendente` (nao_iniciado), `Em andamento` (andamento), `Aguardando cliente` (aguardando_cs/externa — 🔶 nomear), `Concluído` (concluido).
- **Ticket** — status configuráveis (ex.: Aberto / Em atendimento / Aguardando cliente / Resolvido). 🔶 CONFIRMAR catálogo.
- **GestaoCrise** — campos: gravidade, plano de ação; status (Aberta / Em tratativa / Resolvida). 🔶 CONFIRMAR.
- **NPS** — nota (0–10), classificação derivada (detrator 0–6 / neutro 7–8 / promotor 9–10). 🔶 CONFIRMAR faixas.
- **Medalha** — nome, ícone, critério (step vinculado). Catálogo configurável (admin).
- **Cliente.status do ciclo** — Novo → Onboard → Ativo → Renovação → Inativo (doc 02).
- **Banner** — texto, período (início/fim), escopo (todos/squad). 🔶 CONFIRMAR campos.

## 9. Critérios de aceite
1. **Dado** um `fatura.paga` com contrato em vigor, **quando** o evento dispara, **então** em uma execução são criados Onboarding + steps, grupo WhatsApp com CS admin, notificação ao CS com SLA 3h, e o cliente passa a acessar o portal — tudo logado em JobExecution.
2. **Dado** um cliente sem squad, **quando** entra, **então** é alocado ao squad ativo com menos clientes ativos (R12.1) e a decisão fica em AuditLog.
3. **Dado** o cliente no portal, **quando** ele preenche o formulário de onboarding, **então** o step (a) fica concluído, a barra PDC sobe e os dados ficam visíveis ao CS.
4. **Quando** o PDC chega a 100%, **então** ocorre a transição configurada (medalha final + mudança/confirmação Onboard→Ativo — R2.6/A3).
5. **Dado** um broadcast disparado pelo CS, **então** cada cliente recebe notificação no portal **e** mensagem no grupo WhatsApp, e a mensagem aparece fixada como banner pelo período definido (A5).
6. **Dado** que o CS abre o detalhe da reunião, **então** os acessos relevantes do cliente aparecem com botão copiar (R3.3) e a reunião foi criada em uma só ação com link + participantes (R7.2).
7. **Dado** um cliente, **quando** o CS abre sua ficha, **então** vê PDC, medalhas, tickets, NPS e crises consolidados; cargos sem permissão **não** acessam tickets/NPS/portal (Seção 2).
8. **Dado** o SLA de 3h estourado sem atendimento, **então** o sistema alerta conforme A2.
9. O cliente **só** enxerga seus próprios dados no portal (R5.1) — verificado por teste de isolamento.
10. Parâmetros (SLA, período de banner, step→medalha, regra de balanceamento) são editáveis por painel **sem deploy** (doc 03).

## 10. Fora de escopo (deste módulo / desta fase)
- **Aprovação de peças** (criativos/estratégia) e **avaliação pós-aprovação** — **Módulo 18**.
- **Criação automática de projetos** a partir do contrato — **Módulo 15** (mesmo gatilho).
- **Emissão de NF (Speed)** e cobrança — módulo Financeiro.
- **Regras de janela de agendamento, sala presencial, feriados/domingos bloqueados, reunião presencial mensal fixa** — **Módulo 21** (Agenda). Aqui só o cadastro de reuniões de cliente e seu vínculo com o portal.
- **LMS interno completo** de aulas (v1 = painel/links; doc 00). 🔶 CONFIRMAR host das aulas.
- **App mobile nativo** (v1 é web responsiva — doc 00). 🔶 CONFIRMAR.
- **NPS interno (de colaboradores)** — módulo de RH/Pessoas.
