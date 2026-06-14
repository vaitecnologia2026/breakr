# Módulo 20 — Operações Internas

> Cobre AGENDA/CALENDÁRIO, INVENTÁRIO e SOLICITAÇÃO DE COMPRAS. Fontes: `ENTENDIMENTO-DO-PROJETO.md` (§11), transcrições `Sistemas de Apoio.txt` e `Screen Recording 2026-06-11 at 11.14.04.txt`. Sistema **single-tenant** (sem `empresa_id`); storage **abstraído** (doc 02); motor **próprio** (doc 03).

## 1. Objetivo
Centralizar a operação administrativa interna da Breakr em três frentes: (a) **Agenda/Calendário** estilo Google Calendar, com página pública de agendamento por colaborador, controle de sala presencial, home office, feriados e reunião presencial fixa; (b) **Inventário** de equipamentos (valor, NF, plaquinha, assinatura de recebimento); (c) **Solicitação de Compras** (carrinho por usuário → categoria → centro de custo → 3 orçamentos → aprovação).
**Substitui:** o **Google Calendar/Workspace** (agenda + página pública de booking), as planilhas/controles avulsos de inventário e o formulário público de pedido de compras que o Gustavo prototipou na Hostinger. Em relação ao ClickUp, substitui o uso de tarefas como "agenda" e "lista de compras". Não há workflow n8n equivalente direto.

🔶 **CONFIRMAR (alinhar direto com a Franciélia):** regras de **categoria de compra**, mapeamento categoria→centro de custo, **valor de teto** por centro de custo, e o desenho final do fluxo de aprovação de compras (Gustavo declarou explicitamente que "não domina" essa parte — `Screen Recording ... 11.14.04.txt`).

## 2. Atores & permissões
| Cargo | Agenda/Calendário | Sala presencial | Home office | Feriados | Inventário | Compras |
|---|---|---|---|---|---|---|
| **Colaborador (qualquer cargo)** | Ver próprio + colegas (visível/oculto); criar/editar próprias reuniões não-presenciais; copiar link da própria página pública | **Não** pode agendar sala | Registrar **os próprios** dias de home office | Apenas ver | Ver itens sob sua responsabilidade; **assinar recebimento** dos seus itens | Abrir solicitação no próprio carrinho/perfil; acompanhar status das próprias |
| **CS / CES** | Idem colaborador | **Pode** agendar/editar sala presencial | Próprios | Apenas ver | Ver | Abrir solicitação |
| **Financeiro (Franciélia)** | Idem colaborador | Conforme regra (CS/admin) 🔶 | Próprios | Ver | Cadastrar/editar itens, valores, NF | **Definir categorias, centros de custo, tetos**; lançar/conferir orçamentos; aprovar/reprovar (até config.) |
| **Admin / Jurídico** | Ver/editar todas as agendas | **Pode** agendar e **sobrescrever** | Ver de todos | **Cadastrar/editar feriados** | Cadastrar/editar tudo | Configurar fluxo, aprovar |
| **Superadmin** | Tudo + configurar cores/tipos/parâmetros | Agendar e **sobrescrever** | Ver de todos | Cadastrar/editar | Tudo | Tudo + configurar |

- **Acesso parcial explícito:** colaborador comum **NÃO** vê valores/NF de inventário de terceiros, apenas dos itens sob sua responsabilidade.
- **Página pública de agendamento:** acessível **sem login** (visitante/cliente externo), restrita à leitura de horários livres do colaborador e à criação de um agendamento dentro das regras (R1.x).

## 3. Telas / visões
1. **Calendário (estilo Google Calendar)** — visões dia/semana/mês; coluna lateral com **colaboradores por departamento** (cadastrados no sistema), cada um com toggle **visível/oculto** e botões **"ver todos" / "ocultar todos"**; eventos coloridos por tipo de reunião.
2. **Detalhe de evento/reunião** — tipo, participantes, horário, local (online/sala presencial), link de reunião, cor automática por tipo.
3. **Página pública de agendamento (por colaborador)** — visitante escolhe colaborador → vê slots livres dentro da janela permitida → agenda. Botão **"copiar link"** da página por colaborador.
4. **Painel de Home Office** — colaborador marca/desmarca dias; sistema cria a marcação na agenda do próprio.
5. **Cadastro de Feriados (admin)** — adicionar/editar feriados → propagação automática para a agenda de todos.
6. **Inventário — lista geral** — itens, valor, NF, plaquinha/etiqueta, responsável, status de assinatura de recebimento.
7. **Inventário — detalhe do item** — dados de compra, NF anexa, plaquinha, histórico de responsáveis, registro de assinatura.
8. **Compras — carrinho/solicitação (no perfil do usuário)** — adicionar item, categoria, observação, enviar.
9. **Compras — lista/board de solicitações** — colunas por status (Nova → Em orçamento → Aprovação → Compra → Recebimento; + Descartado).
10. **Compras — detalhe da solicitação** — itens, categoria, **centro de custo**, orçamentos anexos (mín. 3), decisão de aprovação, comprovante/recebimento.
11. **Painel de config (admin/superadmin)** — cores e **tipos de reunião**; **feriados**; **categorias de compra**; **centros de custo** e **tetos**; parâmetros da página pública (antecedência, janela) e da reunião presencial fixa.

## 4. Entidades usadas
Do doc 02:
- **Reuniao** — tipo (cliente/interna), participantes, link (Meet), agenda, **sala** (presencial), confirmações/follow-up. (Subtipo de Tarefa: **Reunião**.) Usada na Agenda/Calendário.
- **Usuario** — `cargo_id`, `departamento_id`, status; alimenta a coluna lateral por departamento, a página pública e a permissão de sala. Campo de **status home office** (citado no doc 02 / painel do colaborador). 🔶 CONFIRMAR se home office é flag em Usuario ou registro datado (ver R3.x).
- **Cargo / Departamento** — define quem pode agendar sala (CS/admin/superadmin).
- **Inventario** — item, valor, **NF** (link/anexo, storage abstraído), **plaquinha**, responsável/assinatura.
- **SolicitacaoCompra** — carrinho por usuário → **categoria** → **centro de custo** → 3 orçamentos → aprovação (doc 02).
- **CentroCusto** — nome, **teto** (valor), categoria(s) vinculada(s).
- **NotaFiscal / Documento/Arquivo** — anexos (NF de inventário e de compra) via camada de storage abstraída.
- **Notificacao / Comunicado** — avisos (feriado, reunião criada, pedido em aprovação).
- **AuditLog** — toda ação de agenda/compra/inventário logada.
- **AutomacaoRule / JobExecution** — regras do motor (feriado, reunião fixa, fluxo de compras).

> Reuniões, itens de inventário e solicitações de compra são entidades de trabalho → recebem **`codigo_unico`** no nome (doc 02).

## 5. Funcionalidades (regras de negócio numeradas)

### F1. Calendário interno (estilo Google Calendar)
- **R1.1** O calendário oferece visões **dia, semana e mês**; a visão padrão é configurável por usuário. 🔶 CONFIRMAR visão padrão.
- **R1.2** A coluna lateral lista **todos os colaboradores cadastrados, agrupados por departamento** (departamentos do doc 02).
- **R1.3** Cada colaborador na lateral tem toggle **visível/oculto**; há botões **"ver todos"** e **"ocultar todos"** que afetam todos de uma vez.
- **R1.4** Eventos exibem **cor por tipo de reunião** (ver R5.x): gestão, venda/estratégica, financeira.
- **R1.5** Um colaborador pode **criar/editar/excluir** apenas reuniões **não-presenciais** das quais é organizador; admin/superadmin podem editar qualquer reunião.
- **R1.6** Toda reunião criada gera **`codigo_unico`** e dispara **notificação** aos participantes.

### F2. Página pública de agendamento (por colaborador)
- **R2.1** Cada colaborador possui uma **página pública** (acesso sem login) com link copiável ("copiar link").
- **R2.2** O visitante só pode agendar com **mínimo de 24 horas de antecedência** em relação ao horário atual — slots dentro das próximas 24h **não** aparecem como disponíveis (regra "hoje não tem horário").
- **R2.3** A janela de disponibilidade vai até **7 dias úteis** à frente; após esse limite não há slots.
- **R2.4** **Dias bloqueados** (feriado, domingo, e o dia atual quando dentro das 24h) **não** exibem slots (ver F5/F6).
- **R2.5** Ao confirmar, o sistema cria uma **Reuniao** na agenda do colaborador, com `codigo_unico`, cor por tipo (R5) e notificação ao colaborador.
- **R2.6** Duração do slot, horário de início/fim do expediente e intervalo entre slots são **parâmetros configuráveis** (painel, sem dev) — doc 03. 🔶 CONFIRMAR valores padrão (duração do slot e expediente).
- **R2.7** O agendamento público respeita **conflitos**: slot já ocupado (incl. home office presencial, R3) não é ofertado. 🔶 CONFIRMAR se home office bloqueia agendamento **presencial** apenas ou também o online.

### F3. Aviso/registro de Home Office
- **R3.1** O colaborador registra, no próprio painel, os **dias em que fará home office**.
- **R3.2** Cada dia registrado cria uma **marcação na agenda do próprio colaborador** ("home office"), visível no início do dia (controle).
- **R3.3** Reuniões **presenciais** não devem ser ofertadas/agendadas com um colaborador que está em home office naquele dia (validação no agendamento — substitui o controle manual via "tarefa online" que o Gustavo faz hoje).
- **R3.4** O registro de home office é **informativo/controle** (não exige aprovação), diferente de plantão (R6.4). 🔶 CONFIRMAR se há limite de dias/mês ou necessidade de aprovação do gestor.

### F4. Reunião presencial fixa mensal
- **R4.1** O sistema cria **automaticamente** uma reunião presencial recorrente no **2º sábado de cada mês**, marcada na agenda de **todo o time**.
- **R4.2** A reunião fixa nasce com tipo/cor próprios e `codigo_unico`; é **fixa** (não removível por colaborador comum) — só admin/superadmin podem editar/cancelar uma ocorrência.
- **R4.3** A recorrência é **parametrizável** (a princípio 1×/mês no 2º sábado; pode passar a 2 sábados/mês) — parâmetro no painel (doc 03).

### F5. Cores por tipo de reunião
- **R5.1** Tipos de reunião são **configuráveis** (nome + cor + ordem) via **StatusModel/config** (doc 02), sem hard-code.
- **R5.2** Mapeamento inicial (a alinhar): **Gestão = verde**; **Venda/Estratégica = roxo**; **Financeira = azul**.
- **R5.3** Toda reunião exibe a cor do seu tipo no calendário e no detalhe.
- 🔶 CONFIRMAR a lista final de tipos e suas cores ("a gente pode alinhar isso depois" — transcrição).

### F6. Feriados, domingos e bloqueio de trabalho
- **R6.1** Admin cadastra **feriados** no sistema; ao salvar, o feriado é **marcado automaticamente na agenda de todos** e sinalizado como "feriado".
- **R6.2** **Domingos** são bloqueados por padrão (sem expediente), sem necessidade de cadastro.
- **R6.3** Em **feriados e domingos** não há agendamento/expediente; a página pública (F2) não oferta slots nesses dias.
- **R6.4** A **única** exceção a feriado/domingo é **plantão**, que **exige aprovação** (não é livre). 🔶 CONFIRMAR quem aprova plantão e o fluxo.
- **R6.5** Feriado cadastrado pode disparar **comunicado/banner** ao cliente (integra com Portal do Cliente — módulo de SC). 🔶 CONFIRMAR se o disparo é nativo aqui ou só no módulo de SC.

### F7. Controle de sala de reunião presencial
- **R7.1** Existe **uma** sala presencial; o sistema controla seu agendamento (substitui o controle manual atual). 🔶 CONFIRMAR se haverá mais de uma sala no futuro.
- **R7.2** Apenas **CS** (cargo do departamento de CS), **Admin** e **Superadmin** podem agendar/editar o uso da sala presencial.
- **R7.3** Cargos sem permissão (ex.: gestor de tráfego) **não** veem a opção de agendar a sala e recebem **erro/bloqueio** se tentarem.
- **R7.4** Admin/superadmin podem **sobrescrever** um agendamento de sala existente.
- **R7.5** A sala não permite **dois agendamentos sobrepostos** no mesmo intervalo (validação de conflito).

### F8. Inventário de equipamentos
- **R8.1** Cadastro de item com: descrição, **valor**, **NF** (anexo/link — storage abstraído), **plaquinha/etiqueta** (identificador), responsável atual, data de aquisição.
- **R8.2** Cada item recebe **`codigo_unico`** (independente da plaquinha física). 🔶 CONFIRMAR se a plaquinha física **é** o `codigo_unico` ou um campo separado.
- **R8.3** O **funcionário responsável assina o recebimento** do item dentro do sistema; o item fica com status **"pendente de assinatura"** até a assinatura, depois **"recebido/assinado"** (data + autor logados).
- **R8.4** A transferência de responsável reabre a pendência de assinatura para o novo responsável e registra histórico.
- **R8.5** A lista geral permite **filtrar/buscar** por responsável, status de assinatura, valor e presença de NF.
- 🔶 CONFIRMAR mecanismo de assinatura (clique de aceite logado vs assinatura eletrônica via Autentique).

### F9. Solicitação de compras — carrinho e abertura
- **R9.1** Todo usuário tem, **no próprio perfil**, um **carrinho/solicitação de compras** para pedir material/equipamento necessário ao trabalho.
- **R9.2** Ao abrir, o usuário informa o(s) item(ns) e seleciona uma **categoria**; a categoria **roteia automaticamente** a um **centro de custo específico**.
- **R9.3** A solicitação recebe **`codigo_unico`** e entra com status **"Nova"**, notificando o responsável de compras/financeiro.
- **R9.4** A solicitação pode ser apenas de **material já existente** (saída de estoque/inventário), sem virar compra. 🔶 CONFIRMAR integração solicitação↔inventário (checar estoque antes de comprar).
- 🔶 CONFIRMAR lista de categorias e o mapa **categoria → centro de custo** (alinhar com a Franciélia).

### F10. Fluxo de compra (status) e teto de centro de custo
- **R10.1** Fluxo de status: **Nova → Em orçamento → Aprovação → Compra → Recebimento**; com saída **Descartado** a qualquer momento.
- **R10.2** Para avançar de **"Em orçamento"** é obrigatório anexar **no mínimo 3 orçamentos**.
- **R10.3** Na etapa **"Aprovação"**, o aprovador escolhe o melhor orçamento (custo-benefício) e aprova/reprova; aprovação registra autor e data.
- **R10.4** **Regra de teto:** se o valor estimado estiver **dentro do teto** do centro de custo, a compra segue o fluxo simplificado (responsável de compras executa, **sem exigir os 3 orçamentos/aprovação formal** — ex.: "remédio do escritório"). Se **acima do teto**, é **obrigatório** o fluxo completo (3 orçamentos + aprovação da gestora financeira).
- **R10.5** Após aprovação, registra-se a **compra** (e agendamento de pagamento, se aplicável — integra com ContaPagar) e, ao chegar, o **recebimento**; item comprado **pode** virar registro de **Inventário** (R8) quando for equipamento. 🔶 CONFIRMAR criação automática de item de inventário a partir de compra recebida.
- 🔶 CONFIRMAR (com a Franciélia) os **valores de teto** por centro de custo e se a aprovação será de **um** aprovador ou **multinível**.

## 6. Automações envolvidas (motor — doc 03)
Não há workflow n8n equivalente (área nova). Regras a criar:

- **A1 — Reunião presencial fixa (2º sábado)**
  - **Trigger:** Agendado/temporal (cron mensal).
  - **Condições:** dia = 2º sábado do mês; recorrência ativa (parâmetro).
  - **Ações:** criar **Reuniao** presencial (tipo/cor fixos) + `codigo_unico` + marcar na agenda de **todos os usuários ativos** + notificar.

- **A2 — Propagação de feriado**
  - **Trigger:** Evento de domínio `feriado.cadastrado` (ou mudança na lista de feriados).
  - **Condições:** data válida e futura.
  - **Ações:** marcar feriado na agenda de todos; bloquear slots da página pública na data; (opcional) disparar comunicado/banner ao cliente — R6.5. 🔶

- **A3 — Bloqueio domingo/feriado na página pública**
  - **Trigger:** consulta de disponibilidade na página pública (em tempo de leitura).
  - **Condições:** data ∈ {domingo, feriado} OU dentro de 24h OU além de 7 dias úteis.
  - **Ações:** não ofertar slots (regra aplicada na geração da disponibilidade).

- **A4 — Agendamento público cria reunião**
  - **Trigger:** Webhook/evento da página pública (visitante confirma horário).
  - **Condições:** slot válido por R2.2–R2.4 e sem conflito (R2.7).
  - **Ações:** criar **Reuniao** + `codigo_unico` + cor por tipo + notificar colaborador.

- **A5 — Home office → marcação na agenda**
  - **Trigger:** Evento `homeoffice.registrado`.
  - **Condições:** dia futuro/atual.
  - **Ações:** criar marcação "home office" na agenda do colaborador; sinalizar para bloquear oferta de reunião **presencial** nesse dia.

- **A6 — Solicitação de compra: roteamento e notificação**
  - **Trigger:** Evento `compra.solicitada`.
  - **Condições:** categoria selecionada.
  - **Ações:** atribuir **centro de custo** pela categoria; **switch por teto** → se ≤ teto, marcar fluxo simplificado; se > teto, exigir 3 orçamentos + aprovação; notificar responsável/financeiro.

- **A7 — Compra recebida → inventário** (opcional)
  - **Trigger:** Mudança de status `compra → Recebimento` para itens do tipo equipamento.
  - **Ações:** criar item de **Inventario** (com `codigo_unico`) e abrir pendência de assinatura de recebimento (R8.3). 🔶 CONFIRMAR.

> Todas as execuções são logadas em `JobExecution`, com retry/idempotência (doc 03). Parâmetros (24h, 7 dias úteis, recorrência do sábado, tetos, categorias) editáveis no painel **sem dev**.

## 7. Integrações (doc 04)
- **Google Calendar/Workspace** — **a substituir** (este módulo assume o papel da agenda). 🔶 CONFIRMAR se há **importação inicial** de eventos do Google Calendar para o Breakr OS.
- **WhatsApp API oficial** — disparo de aviso de feriado/comunicado ao cliente (R6.5) e, opcionalmente, lembrete de reunião agendada (segue padrão do módulo de reuniões). 🔶 CONFIRMAR se lembrete de reunião interna usa WhatsApp.
- **Storage abstraído (Google Drive ou próprio)** — anexos de **NF** (inventário e compras) e orçamentos.
- **Autentique** — opcional para **assinatura de recebimento** de inventário e de documentos de compra. 🔶 CONFIRMAR (vs aceite logado simples).
- Sem ASAAS/Speed/Meta neste módulo (compras internas ≠ faturamento de cliente). Pagamentos de compra aprovada referenciam **ContaPagar** (módulo Financeiro).

## 8. Campos personalizados / status configuráveis
- **Tipos de reunião** (StatusModel/config): {Gestão = verde, Venda/Estratégica = roxo, Financeira = azul, **Presencial Fixa** = cor própria} — **configurável** (R5). 🔶 lista final.
- **Status de Solicitação de Compra:** Nova (não_iniciado) · Em orçamento (andamento) · Aprovação (aguardando) · Compra (andamento) · Recebimento (concluido) · Descartado (encerrado). Cores configuráveis.
- **Status de item de Inventário:** Pendente de assinatura · Recebido/Assinado · Em manutenção 🔶 · Baixado/Descartado.
- **Status de Home Office** do usuário (flag/dia): Presencial · Home Office.
- **Parâmetros configuráveis (painel):** antecedência mínima (24h), janela (7 dias úteis), duração do slot/expediente 🔶, recorrência da reunião fixa (2º sábado), **categorias de compra**, **centros de custo + tetos**, lista de **feriados**.
- **Tags:** inventário (ex.: "notebook", "mobiliário") 🔶; compras (ex.: "estoque", "urgente") 🔶.

## 9. Critérios de aceite
1. **Calendário** exibe colaboradores por departamento, com "ver/ocultar todos" e toggle individual; eventos coloridos por tipo. (F1)
2. **Dado** hoje às 10h, **quando** um visitante abre a página pública de um colaborador, **então** não há slots dentro das próximas 24h e não há slots além de 7 dias úteis. (R2.2, R2.3)
3. **Dado** uma data de domingo ou feriado, **quando** o visitante consulta a página pública, **então** nenhum slot é ofertado. (R6.2, R6.3)
4. Agendamento público cria a reunião na agenda do colaborador, com `codigo_unico`, cor por tipo e notificação. (R2.5)
5. **Dado** um usuário com cargo "Gestor de Tráfego", **quando** tenta agendar a sala presencial, **então** a ação é bloqueada com erro; **dado** um CS/admin/superadmin, **então** consegue agendar e o admin pode sobrescrever. (R7.2–R7.4)
6. A sala presencial **não** aceita dois agendamentos sobrepostos. (R7.5)
7. Colaborador registra home office e a marcação aparece na agenda do próprio; reunião **presencial** não é ofertada nesse dia. (R3.1–R3.3)
8. No **2º sábado do mês** existe uma reunião presencial fixa criada pelo sistema na agenda de todos, com `codigo_unico`; só admin/superadmin a editam. (R4.1, R4.2)
9. Cadastrar um feriado marca-o na agenda de **todos** automaticamente. (R6.1)
10. Item de inventário registra valor, NF e plaquinha; o responsável **assina o recebimento** e o status muda para "Recebido/Assinado" com autor e data. (R8.1, R8.3)
11. Colaborador comum **não** vê valor/NF de itens de terceiros. (§2)
12. Solicitação de compra abre pelo **perfil do usuário**, recebe categoria, é roteada ao **centro de custo** correto e recebe `codigo_unico`. (R9.1–R9.3)
13. **Dado** valor **acima do teto** do centro de custo, **quando** se tenta aprovar, **então** o sistema exige **≥3 orçamentos** e aprovação; **dado** valor **dentro do teto**, **então** segue o fluxo simplificado. (R10.2, R10.4)
14. Toda ação de agenda/inventário/compra gera **AuditLog**; automações ficam em `JobExecution` reprocessável. (doc 03)
15. Parâmetros (24h, 7 dias úteis, recorrência, tetos, categorias, feriados) são editáveis por **painel, sem deploy**. (doc 03)

## 10. Fora de escopo (deste módulo / desta fase)
- Integração contábil/fiscal das compras além do vínculo com **ContaPagar** (DRE/conciliação são do módulo Financeiro/BPO).
- **Importação histórica** completa do Google Calendar (decisão de migração). 🔶
- Múltiplas salas presenciais e gestão de recursos físicos além da sala única atual. 🔶
- Reserva de outros recursos (carros, equipamentos compartilhados) via agenda.
- Integração com ponto eletrônico/RH (holerite, cartão-ponto) — pertence ao módulo de **RH** (doc 19).
- Cotação automática de orçamentos junto a fornecedores (os 3 orçamentos são lançados manualmente nesta fase).
- Editor visual de regras do motor (na v1, **parâmetros** são editáveis; regras complexas versionadas pelo time — doc 03).
