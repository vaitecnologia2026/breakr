# Módulo 15 — Projetos

> Estrutura padrão de cada módulo. Preencher TODAS as seções. Nada subentendido.

## 1. Objetivo
É o **núcleo da operação**: organiza todo o trabalho da Breakr na hierarquia **Departamento → Área → Lista/Projeto**, dá a cada cliente até **3 projetos** (Financeiro, Marketing, Gestão) conforme o plano, **cria esses projetos automaticamente a partir do contrato em vigor** (com os entregáveis do plano) e mantém os **itens relacionados** por cliente (campanhas, copies, designs, estratégias) como histórico reaproveitável. Também abriga as **reuniões internas** do time.

**Substitui:**
- **ClickUp** — toda a estrutura "Departamento → Área → Lista", o departamento de Projetos (onde "mora toda a estrutura da Breakr"), os itens relacionados por cliente e a área de reuniões internas.
- **n8n** — *parcialmente*: a **criação automática de projetos a partir do contrato** é algo que **hoje NÃO existe no n8n** ("isso eu não faço pelo n8n, mas a gente pode fazer no sistema") — é capacidade nova do Breakr OS.

## 2. Atores & permissões
| Cargo | Permissões |
|---|---|
| **Admin / Superadmin** | Criar/editar/excluir Departamentos, Áreas e Listas/Projetos; configurar o mapeamento **plano → tipos de projeto** e os **entregáveis** que cada projeto recebe; ver tudo. |
| **CS / CES** | Ver os projetos dos clientes do seu squad; acessar itens relacionados (histórico); criar/editar reuniões internas; **não** reconfigura a hierarquia global. |
| **Estrategista** | Ver/editar projetos de Marketing/Gestão dos seus clientes; criar/anexar estratégias (Módulo 16); consultar itens relacionados. |
| **Copywriter / Designer / Editor** | Ver os projetos onde têm tarefas; consultar itens relacionados (reaproveitar histórico); **não** criam projetos. |
| **Gestor de Tráfego** | Ver projetos de Marketing dos seus clientes; consultar campanhas/criativos relacionados; **não** cria projetos. |
| **Financeiro** | Ver projetos do tipo **Financeiro** dos clientes (BPO/DRE quando aplicável). |
| **Cliente** | **Sem acesso** a este módulo diretamente. O que chega ao cliente (estratégia/peças para aprovar/acompanhar) é exposto pelo **Portal do Cliente** (Módulos 14 e 18). |

> Visibilidade de projetos é, por padrão, **escopada por squad/cliente**; admin vê tudo. 🔶 CONFIRMAR se há projetos/áreas internas visíveis a todos.

## 3. Telas / visões
1. **Árvore de Estrutura** (navegação) — Departamentos → Áreas → Listas/Projetos (espelha o ClickUp). Permite navegar e abrir cada nível.
2. **Lista de Projetos por Cliente** — os ≤3 projetos do cliente (Financeiro/Marketing/Gestão) com tipo, status e entregáveis.
3. **Detalhe do Projeto** — entregáveis, tarefas vinculadas, e a aba de **Itens Relacionados** (campanhas, copies, designs, estratégias do cliente — histórico).
4. **Itens Relacionados / Histórico do Cliente** — busca/lista por cliente de tudo já produzido (ex.: "campanha do Dia dos Namorados do ano passado", "a tese feita ano passado") para reuso.
5. **Reuniões Internas** (lista/board/calendário) — reuniões do time (hoje sob Departamento de Projetos › Área de Reuniões › processo "Reuniões Internas").
6. **Painel de Config (admin)** — mapeamento **Plano → tipos de projeto + entregáveis**; gestão da hierarquia (Departamentos/Áreas/Listas).

> As visões de board/lista/calendário das **tarefas** dentro de cada projeto, com statuses cor-coded e atribuição por squad, são especificadas nos módulos de **Marketing/Conteúdo (16)** e **Tráfego (17)**. Este módulo entrega a **estrutura** e a **auto-criação**.

## 4. Entidades usadas
- **Departamento** (leitura/escrita): Comercial, Sucesso do Cliente, Marketing, Administração, **Projetos**, Desenvolvimento → contém **Áreas** → contêm **Listas/Processos** (hierarquia Departamento→Área→Lista).
- **Projeto** (leitura/escrita): `cliente_id`, **tipo** (Financeiro/Marketing/Gestão), **entregáveis**, `itens_relacionados[]` (campanhas, copies, designs, estratégias). **Auto-criado** a partir do contrato/plano.
- **Plano** (leitura): nome (Brasa, Híbrido…), **entregáveis[]**, **tipos de projeto que gera** (Marketing/Gestão/Financeiro) — base da auto-criação.
- **Contrato** (leitura): `cliente_id`, `plano_id`, status (**Em vigor** dispara a criação), cláusulas/entregáveis.
- **Cliente** (leitura): `plano_id`, `squad_id`, status do ciclo; relação 1—N (**≤3**) com Projeto.
- **Tarefa** (leitura/escrita): vinculada ao `projeto_id` (criação detalhada nos módulos 16/17); subtipo **Reunião** para reuniões internas.
- **Reuniao** (leitura/escrita): tipo **interna**, participantes, link, agenda.
- **Estrategia/Funil, Campanha, Copy (Tarefa), Design/Criativo** (leitura): aparecem como **itens relacionados** do projeto.
- **AuditLog** (escrita): criação/edição de projetos e estrutura.
- **Config** (leitura): parâmetros globais.

## 5. Funcionalidades (regras de negócio numeradas)

- **F1. Hierarquia Departamento → Área → Lista/Projeto** — espelhar e gerenciar a estrutura organizacional.
  - R1.1 O sistema modela três níveis: **Departamento** (1) → **Área** (N) → **Lista/Processo/Projeto** (N).
  - R1.2 Departamentos iniciais: Comercial, Sucesso do Cliente, Marketing, Administração, **Projetos**, Desenvolvimento (doc 02). Admin pode criar/editar/arquivar.
  - R1.3 Uma **Lista** pode ser um **processo** (ex.: "Reuniões Internas", "Produção de Conteúdo") ou um **Projeto de cliente** (Financeiro/Marketing/Gestão).
  - R1.4 Navegação reflete a árvore; cada nível tem nome, ordem e (na Lista) o tipo.
  - R1.5 Exclusão/arquivamento de um nível segue regra de integridade (não apaga itens com histórico; arquiva). 🔶 CONFIRMAR política de arquivamento.

- **F2. Até 3 projetos por cliente (Financeiro/Marketing/Gestão)** — um cliente tem no máximo 3 projetos, conforme o plano.
  - R2.1 Cada **Projeto** tem `tipo` ∈ {Financeiro, Marketing, Gestão} e `cliente_id`.
  - R2.2 Um cliente tem **no máximo 3** projetos — **um por tipo** (não pode haver dois projetos "Marketing" para o mesmo cliente). 🔶 CONFIRMAR unicidade por tipo.
  - R2.3 Quais tipos o cliente recebe é definido pelo **Plano** (R3) — planos híbridos podem gerar 2 ou 3 tipos.
  - R2.4 Cada projeto carrega os **entregáveis** correspondentes ao plano contratado.

- **F3. Criação automática de projetos a partir do contrato em vigor** — capacidade nova (não existe no n8n hoje).
  - R3.1 **Gatilho:** quando um **Contrato** passa a **"Em vigor"** (ver A1), o sistema cria os projetos do cliente automaticamente.
  - R3.2 Os **tipos de projeto** criados vêm de `Plano.tipos de projeto que gera`; os **entregáveis** de cada projeto vêm de `Plano.entregaveis[]` (e/ou cláusulas do contrato). 🔶 CONFIRMAR fonte definitiva dos entregáveis (Plano vs. Contrato).
  - R3.3 Cada projeto criado recebe `codigo_unico` anexado ao nome (rastreabilidade — doc 02).
  - R3.4 Os projetos já nascem **interconectados** ao cliente e aptos a receber tarefas/itens relacionados ("esse projeto já vai ter interconectado").
  - R3.5 **Idempotência:** o mesmo contrato não gera projetos duplicados; se já existirem, a regra completa o que faltar (não recria). 
  - R3.6 Em **renovação** do contrato, os projetos existentes são mantidos (não duplicar). 🔶 CONFIRMAR comportamento em mudança de plano (upgrade/downgrade → criar/arquivar tipo de projeto).

- **F4. Itens relacionados por cliente (histórico reaproveitável)** — coração do reuso.
  - R4.1 Cada Projeto mantém `itens_relacionados[]`: **campanhas, copies, designs/criações, estratégias** produzidos para aquele cliente.
  - R4.2 É possível **buscar/abrir** itens antigos pelo projeto do cliente (ex.: campanha de uma data passada, uma estratégia/tese anterior) para reaproveitar.
  - R4.3 Itens criados em outros módulos (Estratégia 16, Campanha/Criativo 17, Copy/Design) **aparecem automaticamente** no projeto correto via `cliente_id`/`projeto_id` — sem cadastro manual duplicado.
  - R4.4 A vinculação respeita o tipo: campanhas/criativos/copies/estratégias de marketing → projeto **Marketing**; itens de gestão → projeto **Gestão**; itens financeiros → projeto **Financeiro**. 🔶 CONFIRMAR roteamento de itens por tipo de projeto.

- **F5. Reuniões internas** — reuniões do time (não de cliente).
  - R5.1 Reuniões internas são entidades **Reuniao** tipo `interna`, hoje sob Departamento de Projetos › Área de Reuniões › processo "Reuniões Internas".
  - R5.2 Criação segue o gerador de nome/`codigo_unico` e pode usar a **Agenda** (Módulo 21) para horário/participantes/link.
  - R5.3 🔶 CONFIRMAR se "Reuniões Internas" permanece sob Projetos ou migra para outro departamento (o vídeo diz "não necessariamente precisa ficar aqui, mas está atualmente").

- **F6. Tarefas dentro do projeto** — vínculo (detalhe nos módulos 16/17).
  - R6.1 Toda **Tarefa** pertence a um `projeto_id` e a um `cliente_id`; aparece no projeto e alimenta os itens relacionados.
  - R6.2 A **atribuição automática por squad** (cliente → squad → função → responsável) vale para tarefas dos projetos (regra geral; fluxo detalhado nos módulos 16/17).

## 6. Automações envolvidas (regras do motor — doc 03)

- **A1. Criar projetos a partir do contrato em vigor** *(capacidade NOVA — não há workflow n8n equivalente)*
  - **Trigger:** evento de domínio `contrato.assinado` / contrato muda para **"Em vigor"** (mesmo gatilho do fluxo de entrada do cliente — ver Módulo 14/A1, que cuida de onboarding+grupo+portal).
  - **Condições:** contrato em vigor com `plano_id` definido; cliente sem os projetos correspondentes (idempotência R3.5).
  - **Ações:** para cada tipo em `Plano.tipos de projeto que gera`: **criar Projeto** (tipo + `cliente_id`), gerar `codigo_unico` + renomear, **carregar entregáveis** do plano, vincular ao cliente. Registrar em JobExecution/AuditLog.
  - **Switch por plano:** ramificação por `plano` (ex.: Brasa vs. Híbrido) define quantos/quais tipos de projeto (doc 03 — ramificações).
  - **Coordenação:** este módulo cria **projetos**; o Módulo 14 cria **onboarding/grupo/portal** no mesmo evento; o Financeiro emite **NF**. Cada um é uma regra/ação distinta sobre o mesmo gatilho (não duplicar).

- **A2. Vinculação de itens relacionados** *(derivação automática)*
  - **Trigger:** criação de Estrategia/Campanha/Copy/Design com `cliente_id` (eventos `tarefa.criada`/`campanha.criada`/`estrategia.criada`).
  - **Condições:** existe projeto do tipo correspondente para o cliente.
  - **Ações:** adicionar o item ao `itens_relacionados[]` do projeto certo (R4.3/R4.4). Se não houver projeto do tipo, 🔶 CONFIRMAR (criar ou alertar admin).

- **A3. Nomenclatura/código único de projeto** *(equivalente ao grupo "Nomenclatura" do n8n, aplicado a projeto)*
  - **Trigger:** criação de Projeto (por A1 ou manual).
  - **Ações:** gerar `codigo_unico` e anexar ao nome (rastreabilidade — doc 02).

> Mudança de plano (upgrade/downgrade) disparando criação/arquivamento de tipo de projeto é candidata a regra futura — 🔶 CONFIRMAR (R3.6).

## 7. Integrações (doc 04)
- **Google Drive** — a **pasta padrão** do cliente (ideias/materiais, design, vídeos, gestão…) é criada no fluxo de entrada; os projetos referenciam essa estrutura. Storage abstraído (trocável depois).
- **Google Meet / Calendar** — reuniões internas (via Módulo 21).
- **Meta Ads** — apenas **indireta**: campanhas (itens relacionados) carregam dados da Meta, mas a integração é do Módulo 17. Este módulo não chama a Meta diretamente.
- Demais integrações (ASAAS/Speed/Autentique) atuam **antes** (contrato/pagamento) — aqui só consumimos o evento "Em vigor".

## 8. Campos personalizados / status configuráveis
- **Projeto** — campos: `tipo` (Financeiro/Marketing/Gestão), `cliente_id`, **entregáveis[]**, `itens_relacionados[]`, `codigo_unico`. 🔶 CONFIRMAR se Projeto tem status próprio (ex.: Ativo/Encerrado) além do ciclo do cliente.
- **Plano (config)** — `tipos de projeto que gera[]`, `entregaveis[]` (mapeamento editável por admin — base de A1).
- **Departamento/Área/Lista** — nome, ordem, tipo da Lista (processo vs. projeto-de-cliente).
- **Status de tarefas** dentro do projeto — **configuráveis via StatusModel** (cores roxo=revisão interna, azul=andamento, laranja=aguardando CS, vermelho=alteração, amarelo=revisão externa/cliente). Definição e fluxo detalhados nos **Módulos 16/17**.
- **Tags** — herdadas do cliente (tag/cor) e por tipo de item.

## 9. Critérios de aceite
1. **Dado** um contrato que passa a "Em vigor" com plano definido, **quando** o evento dispara, **então** o sistema cria os projetos do cliente conforme `Plano.tipos de projeto que gera`, cada um com seus entregáveis e `codigo_unico`, em uma execução logada (A1).
2. **Dado** um plano híbrido que gera 3 tipos, **então** o cliente fica com exatamente 3 projetos (Financeiro/Marketing/Gestão); um plano que gera 1 tipo cria só 1 (R2.2/R2.3).
3. **Dado** que o evento "Em vigor" é reprocessado, **então** **não** há projetos duplicados (idempotência R3.5).
4. **Dado** um projeto de Marketing de um cliente, **quando** abro seus **itens relacionados**, **então** vejo as campanhas/copies/designs/estratégias daquele cliente e consigo abrir um item antigo para reaproveitar (F4).
5. **Dado** que um novo criativo/campanha/estratégia é criado com `cliente_id`, **então** ele aparece automaticamente no projeto do tipo correto sem cadastro manual (A2/R4.3).
6. **Dado** a árvore de estrutura, **então** navego Departamento → Área → Lista/Projeto fielmente à organização da Breakr (F1).
7. **Dado** uma reunião interna, **quando** o time a cadastra, **então** ela é criada com `codigo_unico` e (se usada a Agenda) com link/participantes (F5).
8. Permissões por cargo respeitadas: cargos sem permissão **não** criam projetos nem reconfiguram a hierarquia; cliente **não** acessa este módulo (Seção 2).
9. O mapeamento **Plano → tipos/entregáveis** é editável por painel **sem deploy** (config de A1).

## 10. Fora de escopo (deste módulo / desta fase)
- **Fluxo de produção de conteúdo** (statuses cor-coded, planejamento/copy, automação "concluído → move para Design", atribuição por squad detalhada, estratégia/funil visual) — **Módulo 16** (Marketing/Conteúdo).
- **Gestão de campanhas, otimizações, públicos, laboratório de criativos, IA de tráfego, controle de orçamento** — **Módulo 17** (Tráfego).
- **Aprovação de peças e avaliação de qualidade** — **Módulo 18**.
- **Onboarding, grupo de WhatsApp, portal do cliente, SLA 3h, auto-balanceamento** — **Módulo 14** (mesmo gatilho de contrato, regras separadas).
- **Reuniões com clientes** e regras de **Agenda** (janela 24h/7 dias úteis, sala presencial, feriados/domingos, reunião presencial mensal) — **Módulos 14 e 21**.
- **Criação do contrato, pagamento e NF** que **precedem** o gatilho — módulos de Jurídico/Contratos e Financeiro.
