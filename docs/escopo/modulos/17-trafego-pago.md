# Módulo 17 — Tráfego Pago

> Especificação técnica (SOW). Single-tenant (só Breakr). Motor de automação próprio (doc 03). **IA de tráfego é ASSISTIVA — sugere (pausar/escalar/criar criativo); o gestor decide. SEM execução autônoma na v1 (DECIDIDO).** Statuses configuráveis (doc 02). Fontes: ENTENDIMENTO §8, doc 00 §"Tráfego Pago", doc 02, doc 03, doc 04, **todo `_MAPEAMENTO/trafego-pago/`** (00–06), transcrições `Screen Recording 2026-06-11 at 08.37.48.txt` e `N8N Overview 1.txt`, inventário n8n.

## 1. Objetivo
Gerir campanhas de tráfego pago de ponta a ponta dentro do Breakr OS: **registro padronizado** da campanha (com nomenclatura automática), **integração Meta Ads API** (campanhas/gasto real/métricas em tempo real, com cache), **IA assistiva** que lê métricas e **sugere** ações ao gestor, **controle de orçamento inteligente** (saldo mensal do cliente distribuído entre campanhas com bloqueio acima do teto), **otimizações** agendadas e configuráveis (com checklist e dependência), **controle de públicos** (importar/sincronizar do Meta + nomenclatura), **laboratório de criativos** e **métricas de produtividade do gestor**.

**Substitui:**
- **ClickUp** — Departamento de Marketing › Tráfego Pago ⚡ › lista **Gestão de Campanhas** (tipo de task **Campanha**, 10 campos obrigatórios, etiqueta META ADS), processos de **Otimização**, **Controle de Públicos**, **Laboratório de criativos**, dashboard de campanhas; doc "Processos | Tráfego Pago".
- **n8n** — `ClickUp | Otimização de Campanhas - PT1` e `- PT2`, `[ClickUp] [Nomenclatura] Campanhas`, `[ClickUp] [Nomenclatura] Públicos`, `[ClickUp] Aguardar Aprovação de Campanhas de Tráfego`, gestão de **Públicos**, `Extração de Saldo Meta` e `Extração de Saldo Meta [Pós Pago]`, e o **`MetaAds | Gestor de Tráfego | Orquestrador`** (que vira a IA **assistiva** — sem auto-execução).
- **"Ir ver na BM/Reportei"** — métricas reais passam a ser lidas via Meta Ads API e **salvas/cacheadas** no sistema (centralização — doc 04).

> Cross-ref: a **solicitação de criativo** cria tarefa de conteúdo no **Módulo 16** (lá fica A7); a peça aprovada chega ao **laboratório** vinda do módulo 16 (roteamento "pago"). Produtividade detalhada de design/rework é módulo 19.

## 2. Atores & permissões
| Cargo | Permissões neste módulo |
|---|---|
| **Gestor de tráfego** | Criar/registrar Campanha; subir no Meta (manual, no Gerenciador); rodar/concluir Otimizações; **solicitar criativo** (botão → estrategista, SLA 72h); ver métricas em tempo real; **aceitar/recusar** sugestões da IA (a IA não executa); importar/sincronizar públicos; gerir laboratório de criativos. Vê seu próprio painel de produtividade. |
| **Estrategista** | Recebe **solicitação de criativo** (SLA 72h); é responsável vinculado à campanha; participa do funil (módulo 16). |
| **CS / Admin / Líder** | Definir **orçamento mensal de tráfego (teto)** do cliente (no cadastro do Cliente); ver dashboards consolidados; ver produtividade dos gestores. |
| **Admin / Superadmin** | Configurar **agendamento de otimização** por tipo de campanha (dias/horários), **thresholds/benchmarks** de alerta (CTR/CPM/ROAS/funil/frequência), SLAs, statuses, campos obrigatórios, credenciais Meta (cofre). |
| **Cliente** (Portal) | **Sem acesso** a este módulo (vê apenas peças aprovadas/relatórios pelo Portal — fora daqui). |

Acessos parciais: o gestor opera apenas campanhas dos **seus** clientes/squads 🔶 CONFIRMAR escopo de visibilidade entre gestores (o vídeo sugere visão por squad; não define isolamento estrito).

## 3. Telas / visões
1. **Lista/Board "Gestão de Campanhas"** — cards = Campanha; filtros por squad/cliente/status; etiqueta META ADS; status inicial "Em Análise".
2. **Detalhe da Campanha** — campos obrigatórios, nomenclatura gerada, públicos e criativos vinculados, **métricas em tempo real** (cache Meta: spend, CPM, CTR, frequência, ROAS, conversões), histórico de **otimizações** vinculadas, painel da **IA assistiva** (sugestões + aceitar/recusar).
3. **Dashboard de Tráfego** — status das campanhas, nº de clientes, **gasto real vs teto** por cliente, campanhas **fora do threshold** (ex.: "CTR de 1% estourado em N contas"), gargalos do funil.
4. **Board/processo de Otimização** — uma Otimização por campanha por ciclo; checklist (CTR/CPM/CTA/ROAS/conversão); dependência com a campanha; botão "solicitar criativo".
5. **Controle de Públicos** — biblioteca de públicos (Personalizados + Salvos), nomenclatura, **importar/sincronizar do Meta**.
6. **Laboratório de Criativos** — colunas **"Para testar"** e **"Em teste"**.
7. **Painel de Produtividade do Gestor** — tempo de otimização por campanha, nº de campanhas otimizadas, sinal de "otimizou de verdade vs só print".
8. **Painel de Config (Admin)** — agendamento de otimização por tipo de campanha; thresholds/benchmarks; SLAs; credenciais Meta. (No-code, doc 03.)

## 4. Entidades usadas (doc 02)
- **Campanha** — `cliente_id`, `projeto_id`, objetivo, **funil** 🔶, orçamento (FT/OT), `meta_campaign_id`, status, gestor, estrategista, `publicos[]`, `criativos[]`, **métricas (cache Meta: spend, CPM, CTR, ROAS, conversões)**, nomenclatura gerada. (lê/escreve)
- **Otimizacao** — `campanha_id`, gestor, data, **checklist (CTR/CPM/CTA/ROAS/conversão)**, resultado, **dependência** (campanha só altera após otimização), **tempo gasto** (produtividade). (escreve)
- **Publico** — nomenclatura `[PLATAFORMA] | [AÇÃO] | [JANELA]`, tipo (personalizado/salvo), janela (7/15/30/90/180D), `meta_audience_id`. (lê/escreve)
- **Criativo** — tipo (vídeo/imagem/carrossel), links, **status laboratório (Para testar → Em teste)**, aprovação. (lê/escreve)
- **Cliente** — `squad_id`, **BM/conta Meta (ad account ids)**, **ticket médio**, **orçamento mensal de tráfego (teto)**. (lê)
- **Squad** — `membros[]` com função (gestor/estrategista) → atribuição automática. (lê)
- **Projeto** — tipo Marketing/Gestão; `itens_relacionados[]`. (lê/escreve vínculo)
- **CampoPersonalizado** — campos obrigatórios da Campanha. (lê)
- **StatusModel** — statuses de Campanha e Otimização. (lê/configura)
- **SolicitacaoCriativo** (subtipo de Tarefa) — demanda de criativo ao estrategista. (cria → módulo 16)
- **IntegrationCredential** — token Meta + ad account ids (cofre). (lê)
- **AutomacaoRule / JobExecution / WebhookLog** — motor (doc 03). (lê/escreve)
- **AuditLog** — toda ação (inclui aceite/recusa de sugestão da IA). (escreve)

## 5. Funcionalidades (regras de negócio numeradas)

### F1. Registro de campanha (padronizado)
- **R1.1** A campanha é **registrada no sistema antes** de ser subida no Meta Ads (SOP "Como Subir Campanhas", Etapa 6).
- **R1.2** A campanha é criada na **Gestão de Campanhas** como tarefa do tipo **Campanha**, com **etiqueta META ADS**.
- **R1.3** **Status inicial = "Em Análise"** e **due date = D+1** (no dia seguinte o gestor verifica se foi aprovada / está em veiculação / teve erro) — base da automação A5.
- **R1.4** **Responsável = o gestor** que criou; descrição e prioridade **não** são obrigatórias.
- **R1.5** **Campos personalizados obrigatórios** (10): **Cliente**, **Objetivo de Campanha** (Conversão/Tráfego/Engajamento/Reconhecimento/Leads), **Orçamento da campanha**, **Gestor de tráfego**, **Públicos** (vínculo à tarefa de públicos), **Criativos** (vínculo aos criativos aprovados — "Para testar" no laboratório), **Estrategista**, **Etapa do Funil** 🔶 (ver R1.6), **Projeto do cliente** (Marketing/Gestão/Financeiro), **Squad**.
- **R1.6** 🔶 **Remover TOFU/MOFU/BOFU**: o campo "Etapa do Funil" com valores TOFU/MOFU/BOFU **deve ser removido** da nomenclatura/automação (decisão do vídeo: "está parando de funcionar dentro da automação… a gente vai tirar"). **Conflito documentado a resolver:** o doc `01-como-subir-campanhas` ainda lista "Etapa do Funil — TOFU/MOFU/BOFU" como obrigatório e a nomenclatura `[cP] … [Funil] …` usa o funil. **CONFIRMAR** com a Breakr: (a) o campo Etapa do Funil deixa de existir, ou só sai da **string de nomenclatura**? (b) os benchmarks por funil (frequência TOFU 1,5–4 / MOFU 3–6 / BOFU 6–12) ainda valem para os alertas? Até confirmar, tratar o funil como **campo opcional não usado em nomenclatura**.
- **R1.7** A **atribuição por squad** vale aqui também: ao marcar o Cliente, o sistema puxa gestor/estrategista/squad de `Squad.membros[função]` (igual módulo 16).
- **R1.8** Orçamento da campanha é **FT (diário)** para campanhas que rodam o dia todo ou **OT (total)** para campanhas no horário de funcionamento (com programação início/fim) — SOP Etapa 7.4.

### F2. Nomenclatura automática (campanha + público)
- **R2.1** Ao criar a Campanha, o sistema gera **`codigo_unico`** e a renomeia no padrão de campanha: **`[cP] [Cliente] [Objetivo] [Funil] [Estratégia] Nome #<codigo>`** (ex.: `[cP] [Chef Kreling Grill] [Vendas] [BOFU] [OT] Dia Mulher #...`). 🔶 Com a decisão R1.6, **`[Funil]` sai do padrão** → padrão efetivo `[cP] [Cliente] [Objetivo] [Estratégia] Nome #<codigo>` — **CONFIRMAR** string final.
- **R2.2** O `codigo_unico` é o mesmo ID que aparece na campanha do **Meta Ads** (rastreabilidade sistema↔Meta) — substitui o n8n `[Nomenclatura] Campanhas`.
- **R2.3** Públicos seguem **dois** padrões (doc 04 públicos):
  - **Tarefa/registro de público (ClickUp→sistema):** `[Pb] [Cliente] [Etapa do Funil] Nome #<codigo>`; com exclusão recebe prefixo ordenado `00 - / 01 - / 02 -` (camadas). Substitui o n8n `[Nomenclatura] Públicos`.
  - **Público no Meta:** `[PLATAFORMA] | [AÇÃO] | [JANELA]` (ex.: `IG | Visitou Perfil | 30D`).
- **R2.4** Toda renomeação ocorre via motor no evento `tarefa.criada` (sem digitação manual da tag/ID).

### F3. Integração Meta Ads API (tempo real + cache)
- **R3.1** O sistema lê da **BM da Breakr**, por **ad account** do cliente, as **campanhas/conjuntos/anúncios** que **de fato** rodam, o **gasto real** e as **métricas** (CPM, CTR, frequência, ROAS, conversões) via Meta Marketing API (doc 04 §4) — não depende do que está digitado no card.
- **R3.2** As métricas são **cacheadas** no banco (campo `métricas` da Campanha), respeitando **rate limits**; a tela mostra a métrica + timestamp da última sincronização. 🔶 CONFIRMAR frequência de atualização do cache.
- **R3.3** O sistema **vincula** a campanha do sistema à do Meta pelo `meta_campaign_id` (e pelo `codigo_unico` no nome).
- **R3.4** O dashboard sinaliza campanhas **fora do threshold** configurado (ex.: "CTR abaixo de 1%", "ROAS < 5") — ver F8/benchmarks.
- **R3.5** Falha/limite da Meta **não trava** a operação: usa último cache + alerta (doc 04).
- **R3.6** **Sincronização de públicos** do Meta — ver F6.

### F4. IA assistiva de tráfego (sugere; gestor decide)
- **R4.1** A IA lê as métricas (cache Meta + benchmarks configurados) e **gera sugestões** por campanha: **manter** ("não precisa mexer"), **adicionar criativo** (sem tirar nada), **escalar** ou **pausar** — conforme o exemplo do vídeo (analisar ROAS → recomendar ação).
- **R4.2** **A IA NÃO executa** nenhuma ação no Meta nem no sistema (DECIDIDO — assistiva na v1). Toda sugestão exige **decisão do gestor**: o gestor **aceita** (e executa manualmente / dispara a ação humana) ou **recusa**.
- **R4.3** Cada sugestão registra: campanha, métricas que a embasaram, ação sugerida, **decisão do gestor** (aceitou/recusou), timestamp → AuditLog.
- **R4.4** A sugestão "adicionar criativo" pode encadear o botão **"solicitar criativo"** (F7) — mas só após o gestor decidir.
- **R4.5** Substitui o `MetaAds | Gestor de Tráfego | Orquestrador` do n8n, **removendo** qualquer execução automática que ele tivesse. 🔶 CONFIRMAR provedor/modelo da IA (o vídeo cita "trazer um cloud / Claude" — definir no doc de IA).

### F5. Controle de orçamento inteligente
- **R5.1** Cada **Cliente** tem um **orçamento mensal de tráfego (teto)** cadastrado; esse saldo é tratado como **absoluto** e **distribuído entre as campanhas** do cliente (o vídeo: "saldo absoluto pra distribuir em 3 campanhas").
- **R5.2** Ao **criar/editar** uma campanha, o sistema **soma os orçamentos das campanhas do cliente**; se a soma **ultrapassar o teto**, **bloqueia com erro** ("não pode") — não deixa salvar acima do teto.
- **R5.3** O sistema **informa o saldo restante** e **sugere o valor máximo** que cabe (ex.: "você tem R$400 de saldo; pode colocar R$815 para fechar R$4.000") — orçamento "inteligente".
- **R5.4** O dashboard mostra **gasto real (Meta) vs teto** por cliente, além do **planejado** (soma dos orçamentos das campanhas).
- **R5.5** 🔶 CONFIRMAR tratamento de **FT (diário)** vs **OT (total)** na soma do teto (como converter diário em mensal para comparar com o teto — o vídeo soma valores de campanha sem detalhar a normalização).
- **R5.6** 🔶 CONFIRMAR janela do teto (mês civil vs ciclo do contrato) e o que acontece quando o gasto **real** da Meta extrapola o planejado (alerta? bloqueio?).

### F6. Controle de públicos (importar/sincronizar do Meta)
- **R6.1** O sistema **importa/sincroniza** os públicos do **Meta Ads** (Personalizados e Salvos) via endpoint (`GET customaudiences`, doc 04), salvando `meta_audience_id`. 🔶 CONFIRMAR se é **importação** (one-shot) ou **sincronização** contínua (o vídeo deixa em aberto: "importação ou sincronização se for melhor… não sei como é o endpoint").
- **R6.2** Públicos seguem a **taxonomia documentada** (doc 04 públicos): Personalizados (IG/FB/Vídeo/Cardápio com janelas 7/15/30/90/180D) e Salvos (Aberto/Mix de Mornos/Remarketing) com nomenclatura `[PLATAFORMA] | [AÇÃO] | [JANELA]`.
- **R6.3** **Regras de uso por janela** (replicáveis): 7D/15D → remarketing; 30D/90D → mix morno; 180D → expansão de remarketing.
- **R6.4** O registro de público no sistema usa o padrão `[Pb] [Cliente] [Funil] Nome #<codigo>` (com prefixo 00/01/02 para camadas de exclusão) — F2.3.
- **R6.5** Públicos ficam disponíveis para **vínculo** na campanha (campo obrigatório "Públicos", R1.5) — reuso e menor risco de erro.

### F7. Otimizações (agendamento configurável + checklist + dependência)
- **R7.1** **Agendamento configurável por gestor/Admin**: o sistema dispara a abertura de otimizações conforme **dias/horários por tipo de campanha** (hoje: Vendas → 2ª feira; Engajamento/Reconhecimento → 3ª feira; Tráfego → …; 5ª/6ª livres p/ estudo e solicitação de criativos). **O Gustavo precisa poder mudar esses parâmetros sem dev** (doc 03).
- **R7.2** Ao disparar, para cada campanha alvo o motor **cria uma Otimizacao** vinculada (`campanha_id`), com gestor/squad/cliente preenchidos pelo squad, e **cria uma dependência**: **a campanha não pode ser alterada enquanto a otimização não for feita** (vídeo).
- **R7.3** **Checklist obrigatório** da otimização: **CTR, CPM, CTA, ROAS, conversão** — o gestor confirma que analisou cada um.
- **R7.4** A otimização **traz dados da Meta** (cache) para a análise (comparar com benchmarks/thresholds — F8).
- **R7.5** Ao **concluir** a otimização, o motor busca a otimização da campanha, **muda o status da campanha para "veiculação"** e faz a checagem de consistência do squad (A6/A7).
- **R7.6** **Botão "solicitar criativo"** dentro da otimização: cria uma **SolicitacaoCriativo** para o **estrategista** com **SLA 72h** (vídeo: "solicito na quinta, na segunda já tem criativo") → cria tarefa de conteúdo no **Módulo 16** (A7 de lá). A demanda **fura a fila** conforme SLA. 🔶 CONFIRMAR regra de priorização exata do SLA.
- **R7.7** **Uma otimização por campanha por ciclo** ("100 campanhas → 100 testes novas por semana").

### F8. Benchmarks e alertas (regras de análise)
> Base: `02-metricas-para-analisar.md` e `06-analise-de-desempenho.md`. **Configuráveis** pelo Admin (thresholds editáveis sem deploy — doc 03). A IA (F4) e o dashboard (F3.4) usam estes limiares.
- **R8.1** **CTR:** `<0,5%` ⚠️ criativo fraco/público errado; `0,5–1%` aceitável; `1–2%` bom; `>2%` excelente. Alerta padrão: **CTR < 1%**.
- **R8.2** **ROAS:** `<5` baixo (⚠️ alerta padrão); `5–10` aceitável; `10–15` bom; `>15` excelente.
- **R8.3** **CPA:** saudável **10–15% do ticket médio** (usar `ticket médio` do cliente).
- **R8.4** **Frequência:** problema quando **>15 E** (CTR caindo + CPM subindo + vendas caindo). Faixas por funil (se mantidas, R1.6): TOFU 1,5–4 · MOFU 3–6 · BOFU 6–12.
- **R8.5** **CPM:** alto = criativo fraco/público restrito/concorrência/segmentação; comparar por localidade/período (sem limiar fixo — relativo).
- **R8.6** **Funil de conversão:** Visualização de página `>80%` ok / `<60%` problema técnico; Add to Cart `25–30%` ok / `<10%` ⚠️; Início de Checkout `>60%` ok / `<50%` ⚠️; Compras `>60%` ok / `<40%` problema. Alerta padrão de gargalo: **checkout < 50%**.
- **R8.7** O dashboard/IA deve produzir, após análise, um **plano de ação com 3–5 ações** (trocar criativo, nova oferta, ajustar público, melhorar cardápio) — `06-analise-de-desempenho`. 🔶 CONFIRMAR se o plano de ação é campo estruturado obrigatório da Otimizacao.

### F9. Laboratório de criativos
- **R9.1** O laboratório tem dois estados: **"Para testar"** (criativo aprovado chegou — vindo do módulo 16, roteamento "pago") e **"Em teste"** (gestor subiu no Meta).
- **R9.2** Ao **subir** o criativo no Meta (manual, SOP Etapa 7.5), o gestor marca o criativo como **"Em teste"**.
- **R9.3** Os criativos do laboratório são a fonte do campo obrigatório **"Criativos"** da campanha (R1.5).
- **R9.4** O gestor pode **solicitar criativo** a partir daqui também (atalho para F7.6).

### F10. Produtividade do gestor
- **R10.1** O sistema mede **tempo de otimização por campanha** (do início ao fim da Otimizacao) e **nº de campanhas otimizadas** por gestor.
- **R10.2** Sinaliza **"otimizou de verdade vs só print"**: otimização concluída em **tempo muito baixo** (ex.: < 15–20 min) é marcada como suspeita 🔶 CONFIRMAR limiar.
- **R10.3** Alimenta um **painel/indicador por gestor** (quantas campanhas, quanto tempo). 🔶 CONFIRMAR métricas exatas e se há metas.

## 6. Automações envolvidas (motor — doc 03)
> Formato **Trigger → Condições → Ações**. Workflow n8n equivalente entre parênteses.

- **A1. Nomenclatura de Campanha** *(n8n: `[Nomenclatura] Campanhas`)* — **Trigger:** `tarefa.criada` (tipo Campanha). **Condições:** —. **Ações:** gerar `codigo_unico`; renomear no padrão `[cP] [Cliente] [Objetivo] ([Funil]🔶) [Estratégia] Nome #<codigo>`.
- **A2. Nomenclatura de Público** *(n8n: `[Nomenclatura] Públicos`)* — **Trigger:** `tarefa.criada` (tipo Público). **Condições:** com/sem exclusão. **Ações:** gerar `codigo_unico`; renomear `[Pb] [Cliente] [Funil] Nome #<codigo>`; aplicar prefixo `00/01/02` se houver exclusão.
- **A3. Atribuição por squad** — **Trigger:** criação/edição de Campanha/Otimização com Cliente. **Condições:** cliente tem squad com gestor/estrategista. **Ações:** preencher gestor/estrategista/squad; bloquear se faltar.
- **A4. Bloqueio de orçamento acima do teto** *(novo; substitui o controle manual via soma no ClickUp)* — **Trigger:** salvar Campanha (criar/editar orçamento). **Condições:** soma dos orçamentos das campanhas do cliente **> teto**. **Ações:** **rejeitar** com erro; retornar saldo restante e valor máximo cabível (R5.2/R5.3).
- **A5. Follow-up "Em Análise" (D+1)** *(n8n: `[ClickUp] Aguardar Aprovação de Campanhas de Tráfego`)* — **Trigger:** temporal (due date D+1 da campanha em "Em Análise"). **Condições:** status ainda "Em Análise". **Ações:** lembrar o gestor de verificar aprovação/veiculação/erro.
- **A6. Abertura agendada de otimizações** *(n8n: `Otimização de Campanhas - PT1`)* — **Trigger:** **cron configurável por gestor/tipo de campanha** (parâmetros editáveis por painel). **Condições:** campanhas do tipo agendado para o dia. **Ações:** buscar tarefa/squad/membros; atualizar estado da campanha; **criar Otimizacao** vinculada; **criar dependência** (campanha travada até otimizar).
- **A7. Retorno da otimização** *(n8n: `Otimização de Campanhas - PT 2`)* — **Trigger:** Otimizacao concluída. **Condições:** —. **Ações:** localizar a otimização da campanha; **mudar status da campanha para "veiculação"**; checagem de consistência do squad.
- **A8. Solicitação de criativo** *(n8n: `Solicitação de Criativos - PT1`)* — **Trigger:** tag/botão "solicitar criativo" (na otimização/campanha/laboratório). **Condições:** cliente/squad válidos. **Ações:** atualizar campanha; **criar SolicitacaoCriativo** para o **estrategista** (SLA 72h) → cria tarefa de conteúdo no módulo 16; preencher a tropa via squad.
- **A9. Sincronização de públicos do Meta** *(n8n: gestão de Públicos)* — **Trigger:** manual/botão "importar/sincronizar" (e/ou cron 🔶). **Condições:** ad account do cliente configurado. **Ações:** `GET customaudiences`; criar/atualizar Publico com `meta_audience_id`.
- **A10. Sincronização de métricas/saldo Meta** *(n8n: `Extração de Saldo Meta` + `[Pós Pago]`)* — **Trigger:** cron (rate-limit aware). **Condições:** ad accounts ativos. **Ações:** `GET insights`/saldo; atualizar cache de métricas da Campanha e saldo; alimentar dashboard e IA. 🔶 CONFIRMAR periodicidade e tratamento pré-pago vs pós-pago.
- **A11. Sugestão da IA assistiva** *(n8n: `MetaAds | Gestor de Tráfego | Orquestrador`, sem auto-execução)* — **Trigger:** após sincronização de métricas / sob demanda do gestor. **Condições:** métricas vs thresholds (F8). **Ações:** gerar sugestão (manter/escalar/pausar/criar criativo) e **apresentar ao gestor**; **nunca executar** no Meta; registrar decisão em AuditLog.

## 7. Integrações (doc 04)
- **Meta Ads — Marketing API** (doc 04 §4): `GET insights` (campanha/conjunto/anúncio), `GET campaigns/adsets/ads`, `GET customaudiences`, saldo; **token de sistema + ad account ids por cliente** (cofre); cache no banco; rate limits. **Futuro/fora da v1:** pausar/ativar/ajustar budget via API (na v1 a IA só sugere; execução é manual pelo gestor no Gerenciador).
- **WhatsApp API oficial** — usado indiretamente (solicitação de criativo notifica time; aprovação de peça é módulo 16/19).
- **IA (cloud)** — provedor a definir 🔶 (vídeo cita "cloud/Claude"); roda no backend, alimentada pelo cache Meta + benchmarks.
- Credenciais em **IntegrationCredential** (cofre, criptografado). Nenhuma chamada no front.

## 8. Campos personalizados / status configuráveis
**Campos obrigatórios da Campanha (10):** Cliente · Objetivo de Campanha (Conversão/Tráfego/Engajamento/Reconhecimento/Leads) · Orçamento da campanha (FT diário | OT total) · Gestor de tráfego · Públicos (vínculo) · Criativos (vínculo) · Estrategista · **Etapa do Funil** 🔶 (remover/ocultar conforme R1.6) · Projeto do cliente · Squad. **Etiqueta:** META ADS.

**Otimizacao:** checklist obrigatório **CTR / CPM / CTA / ROAS / conversão**; campos: gestor, squad, cliente, resultado, **tempo gasto**, dependência com a campanha; (plano de ação 3–5 itens 🔶 R8.7).

**Publico:** nomenclatura `[Pb] [Cliente] [Funil] Nome #<codigo>` (registro) e `[PLATAFORMA] | [AÇÃO] | [JANELA]` (Meta); tipo (personalizado/salvo); janela (7/15/30/90/180D); `meta_audience_id`.

**Statuses configuráveis (StatusModel):**
- **Campanha:** Em Análise (inicial) → Em veiculação → … 🔶 CONFIRMAR lista completa (status/cores; o vídeo cita "Em Análise" e "veiculação").
- **Otimizacao:** aberta → concluída 🔶 CONFIRMAR.
- **Criativo (laboratório):** Para testar → Em teste.

**Thresholds/benchmarks configuráveis (F8):** CTR, ROAS, CPA (% do ticket), frequência, funil (VPágina/Carrinho/Checkout/Compra). **Parâmetros de agendamento de otimização** (dias/horários por tipo). **SLA de criativo = 72h.** Todos editáveis por painel sem deploy (doc 03).

## 9. Critérios de aceite
1. **Registro padronizado** — Dado um gestor, Quando registra a campanha, Então ela é criada na Gestão de Campanhas como tipo Campanha, com etiqueta META ADS, status "Em Análise", due date D+1, responsável = gestor, e os 10 campos obrigatórios são exigidos.
2. **Atribuição** — Quando o gestor marca o Cliente, Então gestor/estrategista/squad são preenchidos a partir do squad; squad ausente/incompleto bloqueia com erro.
3. **Nomenclatura** — Quando a campanha é criada, Então o nome recebe o padrão `[cP] …` com `codigo_unico`; públicos recebem `[Pb] …` / `[PLATAFORMA] | [AÇÃO] | [JANELA]`; sem digitar a tag/ID. (Com R1.6 resolvido, `[Funil]` sai do padrão.)
4. **Meta API em tempo real + cache** — Dado um cliente com ad account, Quando o dashboard carrega, Então mostra campanhas/gasto real/métricas (CPM, CTR, frequência, ROAS, conversões) lidas da Meta e cacheadas, com timestamp; falha da Meta não trava (usa cache + alerta).
5. **IA assistiva** — Dadas métricas fora do benchmark, Quando a IA roda, Então **sugere** manter/escalar/pausar/criar criativo e **não executa** nada; o gestor aceita/recusa e a decisão é auditada.
6. **Orçamento inteligente** — Dado um teto mensal, Quando a soma dos orçamentos das campanhas o ultrapassa, Então o sistema **bloqueia com erro** e informa saldo/valor máximo cabível; o dashboard mostra gasto real vs teto.
7. **Otimização agendada** — Dado o agendamento configurado, Quando chega o dia/horário do tipo de campanha, Então o motor cria Otimizacao(ões) vinculada(s) com dependência (campanha travada), e o Admin/gestor consegue **mudar os dias/horários sem dev**.
8. **Checklist + retorno** — Quando o gestor conclui a otimização (CTR/CPM/CTA/ROAS/conversão checados), Então a campanha vai para "veiculação" e a consistência do squad é verificada.
9. **Solicitar criativo** — Quando o gestor clica "solicitar criativo", Então é criada uma SolicitacaoCriativo para o estrategista com SLA 72h e uma tarefa de conteúdo no módulo 16.
10. **Públicos** — Quando o gestor importa/sincroniza públicos do Meta, Então os públicos entram na biblioteca com `meta_audience_id` e nomenclatura padrão, disponíveis para vínculo na campanha.
11. **Laboratório** — Uma peça aprovada (pago, módulo 16) aparece em "Para testar"; ao subir no Meta o gestor marca "Em teste"; os criativos alimentam o campo "Criativos" da campanha.
12. **Produtividade** — O sistema registra tempo e nº de otimizações por gestor e sinaliza otimização suspeita (tempo muito baixo).
13. **Sem TOFU/MOFU/BOFU** — Confirmada R1.6, a nomenclatura e a automação não usam TOFU/MOFU/BOFU.
14. **Auditoria/observabilidade** — Toda ação (registro, otimização, sugestão da IA aceita/recusada, bloqueio de orçamento) fica em AuditLog; toda automação em JobExecution (reprocessável); nenhuma execução perdida (retry/dead-letter).

## 10. Fora de escopo (deste módulo / desta fase)
- **Execução autônoma da IA** (pausar/escalar/ajustar budget automaticamente no Meta) — **DECIDIDO fora da v1**; a IA só sugere. Escrita na Meta API (pause/budget) fica para fase posterior.
- **Subida da campanha pela API** — na v1 o gestor sobe **manualmente** no Gerenciador (SOP Etapa 7); o sistema registra/padroniza/lê, não cria a campanha no Meta. 🔶 CONFIRMAR se criação via API entra em fase posterior.
- **Relatórios automáticos ao cliente (Reportei→WhatsApp)** — relatório/indicadores ao cliente são tratados no Portal/relatórios (fora deste módulo) 🔶.
- **CAPI / criação de públicos via API** — a v1 **importa/sincroniza** públicos existentes; criar públicos no Meta a partir do sistema é 🔶 / fase posterior.
- **Cálculo de Rework/refação e carga por designer** — Módulo 19 (aqui só geramos eventos de status).
- **Solicitação/produção do criativo em si** — Módulo 16 (aqui só o gatilho + SLA).
- **Editor visual de regras** do motor — fase posterior (doc 03); na v1 só parâmetros/thresholds/agendas são editáveis por painel.
