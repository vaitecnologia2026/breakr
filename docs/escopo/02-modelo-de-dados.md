# 02 — Modelo de Dados

Entidades principais (campos-chave; não exaustivo de auditoria/timestamps). Todas têm `id` (uuid), `created_at`, `updated_at`, `created_by`. **Sistema single-tenant (só Breakr) — sem `empresa_id`.** **Toda entidade "de trabalho" tem `codigo_unico`** (gerado, anexado ao nome → rastreabilidade).

> Convenção de status: status são **configuráveis** (nome + cor + ordem + tipo) por tipo de entidade, não hard-coded. Ver "StatusModel".

## Organização & pessoas
- **Config** *(singleton)* — branding e parâmetros globais da Breakr. **Sistema single-tenant** (só Breakr; sem multi-empresa).
- **Usuario** — nome, email, senha(hash), `cargo_id`, `departamento_id`, `squads[]`, telefone WhatsApp, status (ativo/inativo), foto. Relac.: pertence a 1 cargo, N squads.
- **Cargo** — nome (CS, Copywriter, Designer, Editor, Estrategista, Gestor de Tráfego, Financeiro, Jurídico, Admin…), `permissoes[]`, layout do painel "Hoje & Atrasados".
- **Departamento** — Comercial, Sucesso do Cliente, Marketing, Administração, Projetos, Desenvolvimento. → contém **Áreas** → contêm **Listas/Processos** (hierarquia Departamento→Área→Lista).
- **Squad** — nome (Trovão, Relâmpago, Fagulha…), `membros[]` com **função** (define qual usuário é CS/copy/designer/editor/estrategista/gestor daquele squad). Usado na **atribuição automática**.

## Clientes & comercial
- **Lead** — origem (inbound site / prospecção / scraping), dados, status no pipeline, dono (comercial), enriquecimento (telefone/Instagram/decisor).
- **Negocio** *(pipeline comercial)* — lead, etapa, valor, probabilidade, comercial responsável, motivo ganho/perda.
- **Cliente** — nome fantasia, **tag** (cor), `plano_id`, `squad_id`, **status do ciclo** (Novo → Onboard → Ativo → Renovação → Inativo), CNPJ/CPF + dados fiscais, **BM/conta Meta** (ad account ids), **ticket médio**, **orçamento mensal de tráfego** (teto), grupo WhatsApp (id), pasta Drive (link), datas. Relac.: 1 squad, N projetos (≤3), N contratos, N faturas.
- **Plano** — nome (Brasa, Híbrido…), valor, ciclo, **entregáveis[]**, **tipos de projeto que gera** (Marketing/Gestão/Financeiro). Usado na auto-criação de projetos e no cálculo de valor.

## Contratos & financeiro
- **Contrato** — `cliente_id`, `plano_id`, **status** (Confirmação de produção → Contrato criado → Em revisão → Em assinatura → **Em vigor** → Renovação → Encerrado), link do documento (Google Docs/PDF), `autentique_id`, data início/fim, **vencimento**, renovação automática (bool), cláusulas (campos estruturados p/ acesso parcial do CS). 
- **Fatura/Cobranca** — `cliente_id`, `contrato_id`, **`asaas_id`**, valor, vencimento, **status** (Boleto emitido → Pago → Atrasado), meio (boleto/PIX), `nota_fiscal` (link Speed + status emissão), flags (enviada no WhatsApp? respondida? paga?).
- **NotaFiscal** — `fatura_id`, `speed_id`, link PDF, status. (Tudo salvo no sistema — exigência de centralização.)
- **CentroCusto**, **ContaPagar**, **ContaReceber**, **SolicitacaoCompra** (carrinho por usuário → categoria → centro de custo → 3 orçamentos → aprovação) — módulo 20.

## Projetos & trabalho
- **Projeto** — `cliente_id`, **tipo** (Financeiro/Marketing/Gestão), entregáveis, `itens_relacionados[]` (campanhas, copies, designs, estratégias — histórico reaproveitável). **Auto-criado** a partir do contrato/plano.
- **StatusModel** — `entidade` (Tarefa/Copy/Design/Campanha/Otimização/Contrato…), lista de status com {nome, cor, ordem, tipo: nao_iniciado/andamento/aguardando_cs/revisao_interna/revisao_externa/alteracao/concluido}. **Configurável** (substitui as cores do ClickUp: roxo=revisão interna, azul=andamento, laranja=aguardando CS, vermelho=alteração, amarelo=revisão externa/cliente).
- **Tarefa** *(base)* — `codigo_unico` no nome, `tipo` (ver subtipos), `status_id`, `projeto_id`, `cliente_id`, `squad_id`, **responsável (derivado do squad+função)**, prioridade, due date, descrição, `checklist[]`, `dependencias[]`, tags, **campos personalizados** (por tipo), anexos, comentários.
  - **Subtipos** (campos próprios): **Copy** (briefing, texto, revisões), **Design/Criativo**, **Campanha**, **Otimização**, **Público**, **Reunião**, **OnboardingStep**, **ContratoTask**, **Vaga**, **SolicitacaoCriativo**.
- **CampoPersonalizado** — definição (entidade, nome, tipo: texto/seleção/número/data/relacionamento, obrigatório?). Ex. obrigatórios da Campanha: Cliente, Objetivo, Orçamento, Gestor, Estrategista, Públicos, Criativos, Etapa do funil 🔶(remover TOFU/MOFU/BOFU), Projeto, Squad.

## Tráfego pago
- **Campanha** — `cliente_id`, `projeto_id`, objetivo, **funil** 🔶, orçamento (FT/OT), `meta_campaign_id`, status (Em análise/veiculação/…), gestor, estrategista, `publicos[]`, `criativos[]`, métricas (cache da Meta API: spend, CPM, CTR, ROAS, conversões), nomenclatura gerada.
- **Otimizacao** — `campanha_id`, gestor, data, **checklist** (CTR/CPM/CTA/ROAS/conversão), resultado, **dependência** (campanha só altera após otimização), tempo gasto (métrica de produtividade).
- **Publico** — nomenclatura `[PLATAFORMA] | [AÇÃO] | [JANELA]`, tipo (personalizado/salvo), janela (7/15/30/90/180D), `meta_audience_id`.
- **Criativo** — tipo (vídeo/imagem/carrossel), links, **status laboratório** (Para testar → Em teste), aprovação.

## Conteúdo, qualidade & relacionamento
- **Estrategia/Funil** — `projeto_id`, estrutura visual (nós + conexões), anexada ao projeto, enviada ao cliente p/ aprovação.
- **Aprovacao** — item (criativo/estratégia/post), `cliente_id`, link público (estilo eCite), comentários, status (pendente/aprovado/ajuste), histórico.
- **Avaliacao** — `aprovacao_id`/`tarefa_id`, dimensões configuráveis (qualidade gráfica, nº de refações, qualidade do texto…), nota (estrelas), **responsável avaliado** → alimenta score de qualidade.
- **ReworkLog** — `tarefa_id`, origem (interno=designer / externo=cliente), de→para status, timestamp → dashboard de refações por designer/squad/estrategista.
- **Reuniao** — tipo (cliente/interna), participantes, link (Google Meet), agenda, sala (presencial), confirmações/follow-up.
- **Ticket / NPS / GestaoCrise** — CS; `cliente_id`, squad, status.
- **Onboarding** — `cliente_id`, **progresso (PDC %)**, **medalhas[]**, steps (form, materiais, acessos, reuniões), calendário do cliente.

## RH & operações
- **Vaga**, **Candidato** (currículo, tags, banco de talentos), **TesteDISC** (link, 40 perguntas de um banco de 100, resultado de perfil), **PerguntaDISC**.
- **DocumentoColaborador** — holerite/cartão-ponto/folha/contrato; status de assinatura mensal.
- **Inventario** (item, valor, NF, plaquinha, responsável/assinatura).
- **OKR/Meta** (Q3/Q4), **Ouvidoria**, **RelatorioDesempenho**, **PlanoCarreira**.

## Comunicação & sistema
- **Notificacao** (usuário/cliente, tipo, lida?), **Comunicado** (broadcast admin/CS), **Mensagem** (chat interno/DM), **WhatsAppThread** (cliente/grupo, `wa_group_id` @g.us, mensagens).
- **Documento/Arquivo** (abstração storage — Drive ou próprio), pastas padrão por cliente.
- **AutomacaoRule, JobExecution, WebhookLog, IntegrationCredential** → ver doc 03.
- **AuditLog** — ator, ação, entidade, antes/depois, timestamp.

## Relacionamentos-chave
- Cliente **1—N (≤3)** Projeto · Cliente **1—1** Squad · Squad **N—N** Usuario (com função) · Projeto **1—N** Tarefa · Campanha **1—N** Otimização · Cliente **1—N** Contrato/Fatura · Contrato **1—N** Fatura · Fatura **1—1** NotaFiscal.
- **Atribuição automática:** Tarefa.cliente → Cliente.squad → Squad.membros[função] → preenche responsáveis (copy/design/CS/gestor/estrategista).

## Gerador de código único
Serviço central que emite `codigo_unico` (curto, legível, ex. base36) para qualquer entidade de trabalho na criação, **anexado ao nome** (ex.: campanha, público, contrato), garantindo rastreabilidade entre sistema ↔ Meta Ads ↔ documentos.
