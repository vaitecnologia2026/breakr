# Módulo 19 — RH / Gestão de Pessoas

> Fonte: `ENTENDIMENTO-DO-PROJETO.md` (item 10) + transcrição `Screen Recording 2026-06-11 at 11.14.04.txt`. Vários itens são processos que o Gustavo **prototipou mas não conseguiu rodar no ClickUp** ("hoje a gente está crescendo rápido, não consigo parar para fazer") — o sistema os interioriza.

## 1. Objetivo
Centralizar **recrutamento, perfil comportamental, documentos do colaborador, ouvidoria, metas/OKRs, NPS interno, desempenho, plano de carreira e educacional** dentro do Breakr OS.
- **Substitui do ClickUp:** as listas de recrutamento, banco de talentos, metas, plano de carreira e o controle de RH que hoje "não usa" ou é arcaico.
- **Substitui ferramentas avulsas:** o **teste DISC** que o Gustavo está prototipando à parte (painel próprio na Hostinger/Horizons), a **ouvidoria por e-mail** (pedido do jurídico) e o controle informal de documentos.
- **Não substitui (apenas referencia):** os **cursos** seguem em **Hotmart/outras plataformas** — a v1 entrega apenas um **painel/biblioteca de links**, não uma sala de aula (LMS interno é **futuro**).

## 2. Atores & permissões
| Cargo | Permissões |
|---|---|
| **Admin / RH / Jurídico** (Gustavo, Fran) | Criar/gerir **vagas**, ver currículos e banco de talentos, marcar tags de reavaliação; **montar o banco de perguntas DISC** e configurar o teste; **definir OKRs Q3/Q4**; ver/tratar **ouvidoria**; emitir/enviar documentos (holerite/folha/contrato/manual) para assinatura; ver relatórios de desempenho; gerir plano de carreira; cadastrar cursos no painel educacional. |
| **Jurídico** | Recebe e **trata as ocorrências da ouvidoria**; anexa contrato de trabalho/manual; toma decisão sobre reclamações. |
| **Gestor / Liderança** | Participa da definição de OKRs; vê desempenho do seu time; abre/solicita vagas; consulta perfil DISC dos candidatos para casar com a vaga. |
| **Colaborador** (qualquer usuário) | No **Painel do Colaborador**: ver/assinar **documentos mensais** (holerite, cartão-ponto, folha), ver manual e contrato de trabalho, responder **NPS interno**, abrir **ouvidoria** (inclusive anônima), ver **suas metas/OKRs**, acessar **painel de cursos**, ver **plano de carreira** e relatórios do próprio desempenho. |
| **Candidato** (externo, sem login) | Acessa o **link de vaga**: preenche dados, anexa currículo e **faz o teste DISC** (link próprio). |

> Acessos parciais explícitos: a **ouvidoria** é visível **apenas ao jurídico/RH** (sigilo, com opção de anonimato do autor); o **holerite/folha** de um colaborador é visível **só a ele e ao RH/financeiro**.

## 3. Telas / visões
1. **Recrutamento — Vagas** — lista/board de vagas (aberta, em triagem, fechada); cada vaga com perfil DISC desejado.
2. **Página pública da vaga** — formulário (nome, e-mail, telefone), **anexar currículo** e botão **fazer o teste DISC** (substitui "só mandar o currículo").
3. **Currículos recebidos** — fila de candidatos ainda não analisados.
4. **Banco de talentos** — candidatos arquivados com **tags** (ex.: **reavaliação**) e o perfil DISC; consultado **antes** de reabrir uma vaga.
5. **Detalhe do candidato** — currículo + **perfil comportamental** (primário/secundário/terciário) + avaliação + tags.
6. **Teste DISC (link do candidato)** — 40 perguntas, cada uma um **bloco de 4 respostas**; ao final gera o perfil.
7. **Config do DISC (Admin)** — **banco de 100 perguntas** (CRUD), pesos por resposta, regra de sorteio de 40, mapa de perfis × vaga.
8. **Documentos do colaborador** — manual, contrato de trabalho, **holerite/cartão-ponto/folha** com status de **assinatura mensal**.
9. **Ouvidoria** — abertura de ocorrência (colaborador) + fila de tratamento (jurídico).
10. **OKRs / Metas** — painel Q3/Q4 com metas por área/pessoa e progresso.
11. **NPS interno** — pesquisa periódica + resultado agregado.
12. **Educacional** — painel/biblioteca de **cursos** (links Hotmart/outros) por categoria.
13. **Desempenho & Plano de carreira** — relatórios por colaborador; trilha de cargos.

## 4. Entidades usadas
- **Vaga** (lê/escreve) — título, área/cargo, **perfil DISC desejado**, status, link público.
- **Candidato** (lê/escreve) — currículo (anexo), dados de contato, **tags** (ex.: reavaliação) p/ **banco de talentos**, vínculo com `TesteDISC`.
- **TesteDISC** (lê/escreve) — `candidato_id`, **link**, conjunto das **40 perguntas sorteadas** (de um banco de 100), respostas, **resultado de perfil** (primário/secundário/terciário).
- **PerguntaDISC** (lê/escreve) — enunciado, **bloco de 4 respostas**, **pesos** por resposta (cada resposta aumenta/diminui um fator D/I/S/C). 🔶 CONFIRMAR mapeamento das respostas aos fatores DISC.
- **DocumentoColaborador** (lê/escreve) — `usuario_id`, tipo (**manual / contrato / holerite / cartão-ponto / folha**), link/arquivo, **status de assinatura mensal**, competência (mês/ano).
- **OKR/Meta** (lê/escreve) — período (**Q3/Q4**), dono (área/pessoa), objetivo, key results, progresso.
- **Ouvidoria** (lê/escreve) — autor (com opção **anônimo**), descrição, status, **encaminhamento ao jurídico**, decisão.
- **RelatorioDesempenho**, **PlanoCarreira** (lê/escreve).
- **Usuario / Cargo / Squad** (lê) — colaborador, cargo, squad (doc 02/10).
- **Notificacao / WhatsAppThread** (escreve) — avisos de documento a assinar, NPS, retorno de ouvidoria.
- **Documento/Arquivo** (storage abstraído) — currículos, holerites, manual, contrato.
- **AuditLog** (escreve) — assinaturas, decisões de ouvidoria, alterações de OKR.

> **Educacional (cursos):** a v1 usa um cadastro simples de **links de curso** (título, plataforma, categoria, URL). Pode ser modelado como `Curso` (catálogo de links) — **sem** entidade de progresso/aula. 🔶 CONFIRMAR se vira entidade própria ou campo de configuração.

## 5. Funcionalidades (regras de negócio numeradas)

- **F1. Captação de vagas e currículos**
  - R1.1 Admin/RH cria uma **Vaga** com cargo/área e o **perfil DISC desejado** (ex.: estrategista = perfil **C + I**, ou **P/A** planejador+analista).
  - R1.2 A vaga gera **página pública** com formulário (nome, e-mail, telefone), **anexo de currículo** e **teste DISC** (F3).
  - R1.3 Candidatura cria um **Candidato** com o currículo; entra na fila **"currículos recebidos"** (não analisados).

- **F2. Banco de talentos com tags de reavaliação**
  - R2.1 RH pode **arquivar** um candidato no **banco de talentos** com **tags** (ex.: **reavaliação**) quando ele não serve agora mas é "importante para depois".
  - R2.2 Ao abrir/reabrir uma vaga, o sistema mostra **primeiro** o banco de talentos compatível (por tag/perfil) **antes** de divulgar a vaga de novo.

- **F3. Teste DISC próprio (link do candidato)**
  - R3.1 O teste tem **sempre 40 perguntas**, **sorteadas** de um **banco de 100** (PerguntaDISC). Quanto maior o banco, mais "inteligente" o teste — o número aplicado permanece 40.
  - R3.2 Cada **pergunta é um bloco de 4 respostas**; cada resposta **aumenta ou diminui** os fatores comportamentais (D/I/S/C).
  - R3.3 Ao final, gera o **perfil**: **primário**, **secundário** e (quando aplicável) **terciário**.
  - R3.4 O resultado fica **anexado ao candidato** (junto do currículo) para o RH **casar com o perfil da vaga** (R1.1).
  - R3.5 O **banco de perguntas e os pesos** são **configuráveis** por painel (CRUD de PerguntaDISC) — sem dev.
  - R3.6 🔶 CONFIRMAR o **algoritmo de pontuação** (como cada resposta soma/subtrai em D/I/S/C e como se decide primário/secundário/terciário) e a **regra de sorteio** (aleatório puro × balanceado por fator) — a base de perguntas existe (~100), a fórmula precisa ser validada com a Breakr.

- **F4. Documentos do colaborador + assinatura mensal**
  - R4.1 O colaborador tem, no Painel do Colaborador: **manual**, **contrato de trabalho** (ambos anexados pelo jurídico).
  - R4.2 Todo mês, quando a Fran **envia o holerite**, o colaborador **recebe** no sistema e **assina** ali; o sistema marca como **assinado** (a Fran sabe que assinou). Mesma regra para **folha de pagamento** e **cartão-ponto**.
  - R4.3 Cada documento tem **competência (mês/ano)** e **status** (enviado / pendente de assinatura / assinado); pendências geram **notificação**.
  - R4.4 Tudo fica **rastreável** dentro do sistema (quem assinou, quando) — exigência de centralização.
  - R4.5 🔶 CONFIRMAR se a "assinatura" é **eletrônica via Autentique** (mesmo adapter do contrato comercial — doc 04) ou **aceite interno** (clique + carimbo de data/usuário em AuditLog).

- **F5. Ouvidoria → jurídico**
  - R5.1 Qualquer colaborador abre uma **ocorrência** (reclamação sobre comportamento de colega etc.), com opção de **anonimato**.
  - R5.2 A ocorrência **vai para o jurídico** (substitui o e-mail usado hoje), visível **apenas** a jurídico/RH.
  - R5.3 O jurídico trata (status + decisão registrada em AuditLog) e dá retorno conforme política. 🔶 CONFIRMAR fluxo de retorno ao autor (anônimo × identificado).

- **F6. OKRs / Metas Q3 e Q4**
  - R6.1 Admin/lideranças definem **metas por trimestre**: **Q3 (jul–set)** e **Q4 (out–dez)**, por área/pessoa.
  - R6.2 Cada OKR tem objetivo + key results + **progresso**; o colaborador vê suas metas no painel.
  - R6.3 🔶 CONFIRMAR origem do progresso (manual × puxado de indicadores do sistema, ex.: qualidade/rework do doc 18, vendas do doc 11).

- **F7. NPS interno**
  - R7.1 Pesquisa periódica de satisfação do time; resultado **agregado** (não expõe respondente, conforme política de anonimato). 🔶 CONFIRMAR periodicidade e se é anônimo.

- **F8. Educacional (painel de cursos)**
  - R8.1 RH cadastra **cursos** (título, **plataforma — Hotmart/outras**, categoria, **link**) numa biblioteca.
  - R8.2 O colaborador **navega e acessa o link** ("tenho esse curso na biblioteca? tem → clica e vai para a plataforma"). **Não há sala de aula interna** na v1.

- **F9. Desempenho & plano de carreira**
  - R9.1 RH/gestor registra **relatórios de desempenho** por colaborador.
  - R9.2 **Plano de carreira**: trilha de cargos/critérios de evolução, visível ao colaborador. 🔶 CONFIRMAR estrutura (níveis, critérios) com a Breakr.

## 6. Automações envolvidas (regras do motor — doc 03)
> RH **não** corresponde a um workflow do n8n hoje (Gustavo controla manualmente/no ClickUp). As regras abaixo são **novas** do motor próprio.

- **A1 — Candidatura recebida**
  - **Trigger:** webhook do **formulário público da vaga** preenchido.
  - **Condições:** vaga ativa.
  - **Ações:** criar `Candidato` (+ anexar currículo) → criar/abrir `TesteDISC` com **link** → notificar RH.

- **A2 — DISC concluído**
  - **Trigger:** evento `disc.concluido`.
  - **Condições:** 40 respostas completas.
  - **Ações:** **calcular perfil** (primário/secundário/terciário) → anexar ao `Candidato` → notificar RH (com match × perfil da vaga).

- **A3 — Documento mensal para assinar**
  - **Trigger:** evento `documento_colaborador.enviado` (Fran sobe holerite/folha) **ou** agendado (cron mensal).
  - **Condições:** documento do tipo assinável.
  - **Ações:** criar `DocumentoColaborador` (status pendente) → **notificar** o colaborador (sistema + WhatsApp) → ao assinar, mudar status para **assinado** e registrar em AuditLog; lembrete se ficar pendente.

- **A4 — Ouvidoria aberta**
  - **Trigger:** evento `ouvidoria.aberta`.
  - **Ações:** criar ocorrência (respeitando anonimato) → **notificar jurídico** → acompanhar status até decisão.

- **A5 — Abertura de janela de OKR**
  - **Trigger:** **temporal/cron** (início de Q3 e Q4).
  - **Ações:** abrir período de metas → notificar lideranças para definir/distribuir OKRs.

> **Configurável por painel (sem dev):** banco/pesos de perguntas DISC, períodos de OKR, periodicidade do NPS, modelos de mensagem (documento a assinar / ouvidoria), catálogo de cursos.

## 7. Integrações (doc 04)
- **Google Drive / storage abstraído:** armazenamento de **currículos, holerites, folha, manual, contrato** (camada trocável — doc 00/01).
- **WhatsApp — API oficial:** notificações ao colaborador (documento a assinar, retorno de ouvidoria, NPS) e ao candidato (link do DISC). 🔶 CONFIRMAR canais usados.
- **Autentique (condicional — R4.5):** se a assinatura de documentos do colaborador for eletrônica formal, reutiliza o adapter de assinatura do doc 04.
- **Hotmart e outras plataformas de curso:** **sem integração de API** na v1 — apenas **links** no painel educacional.

## 8. Campos personalizados / status configuráveis
- **Vaga.status:** ex. `aberta` → `triagem` → `entrevista` → `fechada` (configurável).
- **Candidato.tags:** ex. **reavaliação**, **banco de talentos** (configuráveis).
- **TesteDISC:** **40** perguntas (fixo) sorteadas de banco **≥100**; resultado primário/secundário/terciário.
- **PerguntaDISC:** bloco de **4 respostas**; pesos por fator **D/I/S/C** (🔶 CONFIRMAR mapeamento).
- **DocumentoColaborador.tipo:** `manual` | `contrato` | `holerite` | `cartao_ponto` | `folha`; **status** `enviado` | `pendente_assinatura` | `assinado`; **competência** (mês/ano).
- **Ouvidoria.status:** `aberta` → `em análise (jurídico)` → `resolvida`; flag **anônimo**.
- **OKR/Meta.período:** `Q3` | `Q4` (ano).
- **Curso:** título, plataforma, categoria, link.

## 9. Critérios de aceite
1. **Dado** o link público de uma vaga, **quando** o candidato preenche dados, anexa currículo e faz o teste, **então** é criado um `Candidato` com currículo + **perfil DISC** (primário/secundário/terciário) anexado.
2. O teste DISC aplica **exatamente 40 perguntas** sorteadas de um banco **≥100**, cada uma com **bloco de 4 respostas**; aumentar o banco no painel **não** muda o nº de 40 aplicadas.
3. **Quando** o RH arquiva um candidato com a tag **reavaliação**, **então** ele aparece no **banco de talentos** e é sugerido **antes** de reabrir uma vaga compatível.
4. **Dado** que a Fran envia o **holerite** do mês, **quando** o colaborador abre o sistema, **então** ele vê o documento **pendente de assinatura**, assina, e o status muda para **assinado** com registro em AuditLog (a Fran vê que assinou). Idem para **folha** e **cartão-ponto**.
5. **Quando** um colaborador abre uma **ouvidoria** (anônima ou não), **então** ela chega **apenas** ao jurídico/RH e segue até uma decisão registrada.
6. O painel de **OKRs** permite definir e acompanhar metas separadas para **Q3 (jul–set)** e **Q4 (out–dez)**.
7. O **NPS interno** coleta e mostra resultado agregado conforme política de anonimato.
8. O painel **educacional** lista cursos por categoria e leva o colaborador ao **link externo** (sem sala de aula interna).
9. **Manual** e **contrato de trabalho** ficam disponíveis ao colaborador no Painel do Colaborador.
10. Todas as ações sensíveis (assinatura, decisão de ouvidoria, alteração de OKR, criação de perfil DISC) ficam em **AuditLog** e respeitam as permissões por cargo (item 2).

## 10. Fora de escopo (deste módulo / desta fase)
- **LMS interno / aulas próprias da Breakr** — v1 entrega só o **painel de links**; aulas internas são **futuro** (declarado pelo Gustavo).
- **Integração de API com Hotmart** (progresso/conclusão de curso) — fora da v1.
- **Folha de pagamento como cálculo trabalhista** (eSocial, cálculo de encargos) — o sistema **recebe e assina** o documento; **não** processa folha. 🔶 CONFIRMAR se há integração futura com sistema de folha.
- **Avaliação de desempenho automatizada / 360º estruturada** — v1 entrega **relatórios**; modelo formal de avaliação fica para fase posterior.
- **Ponto eletrônico (registro de batidas)** — o sistema trata o **cartão-ponto como documento a assinar**, não como relógio de ponto.
- **Validade jurídica da assinatura** dos documentos depende da decisão R4.5 (Autentique × aceite interno) — 🔶 CONFIRMAR.
