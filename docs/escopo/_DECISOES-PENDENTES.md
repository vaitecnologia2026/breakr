# Decisões Pendentes (🔶) — agenda de revisão com Gustavo/Franciélia

Tudo que o escopo marcou como **🔶 CONFIRMAR**. Resolver antes/ao iniciar cada parte. 🔴 = bloqueante (trava o desenvolvimento daquele item); 🟡 = ajuste fino (pode começar com a recomendação e refinar).

## Cross-cutting (decidir cedo)
- 🔴 **Enriquecimento de leads (M11):** provedor + custo/lead (Serasa/birô?) e **base legal LGPD** para prospecção/retenção.
- 🔴 **VoIP/telefonia (M11):** provedor (IPECAL?), modelo de créditos, captura de duração/gravação.
- 🔴 **Tabela de valores por plano (M12):** mapa plano→valor (ASAAS) e entregáveis por plano (auto-criação de projetos).
- 🔴 **Compras/centro de custo (M20):** alinhar com a Franciélia — categorias, mapa categoria→centro de custo, tetos, níveis de aprovação.
- 🟡 **Lista canônica de cargos + matriz de permissões (M10)** — base do RBAC.
- 🟡 **Acesso do CS ao contrato (M12):** documento inteiro vs só cláusulas estruturadas.
- 🟡 **Auto-balanceamento de squad (M12/M14):** critério de desempate/teto por squad.
- 🟡 **Storage de arquivos:** Drive vs próprio (já abstraído; decidir na fase de infra).

## Por módulo
**10 Núcleo:** expiração/refresh JWT; provedor de e-mail (recuperação de senha); 2FA/SSO?; grupos de chat (v1 só DM 1:1?); critério de roteamento do WhatsApp por área; timezone de corte do "hoje"; 1 membro por função no squad?; comportamento quando falta função (bloquear vs alertar); formato/prefixo do código único; confirmação de leitura de comunicado; campo "área" na WhatsAppThread (incluir no doc 02); política ao excluir nó da hierarquia.

**11 Comercial/CRM:** visibilidade do pipeline (próprio vs time) e quem roda scraping; etapas-padrão dos pipelines e régua de follow-up; campos do form do site/agenda; atribuição de lead inbound; **incluir entidades `Script` e `CallLog/Ligação` no doc 02**; e-mail comercial fora da v1.

**12 Contratos:** quem preenche o form (Comercial vs Jurídico); envio automático ao cliente na assinatura; ordem "Em vigor" × pagamento; renovação gera novo contrato ou só sinaliza; efeito do encerramento; conjunto exato de cláusulas estruturadas; escopo da versão "Implementação IA".

**13 Financeiro/BPO:** acesso do CS a valores; cadência automática de cobrança/lembretes; envio automático da NF; NF como pré-requisito do onboarding; centralização de e-mails (Hostinger sem API — alternativa); escopo/trigger do BPO (DRE/conciliação); KPIs extras da Franciélia.

**14 CS/Onboarding/Portal:** níveis de leitura por cargo; onde residem os acessos do cliente (cofre); host das aulas (interno/YouTube); PDC varia por plano?; 100% PDC → "Ativo" automático ou manual?; recortes de broadcast; comentário do cliente vira ticket?; faixas de NPS; escalonamento do SLA 3h; app nativo (fora da v1).

**15 Projetos:** unicidade de projeto por tipo; fonte dos entregáveis (Plano vs Contrato); comportamento em mudança de plano; roteamento de itens por tipo de projeto; "Reuniões Internas" sob Projetos?; Projeto tem status próprio?; arquivamento da hierarquia.

**16 Marketing/Conteúdo:** materialização de entidades a partir dos nós do funil; quem pode sobrescrever a atribuição por squad; mensagem quando falta função no squad; re-atribuição se o squad mudar; lista nominal final de statuses por entidade; formato textual do nome de copy/criativo; destino "impressões offline"; publicação automática nas redes (fase?).

**17 Tráfego:** **remoção de TOFU/MOFU/BOFU** (conflito: o processo de tráfego ainda usa o campo "Etapa do Funil") — decidir; string final `[cP]…`; visibilidade entre gestores; frequência do cache Meta; provedor/modelo da IA assistiva; normalização FT/OT e janela do teto de orçamento; importação vs sincronização de públicos; periodicidade e pré/pós-pago do saldo; limiar "otimizou de verdade"; plano de ação como campo obrigatório; criação de campanha/públicos via API (fase posterior).

**18 Qualidade:** dimensões/pesos por tipo de avaliação; limiar e período do score de qualidade; janela de follow-up; capacidade-padrão por designer (carga).

**19 RH:** mapeamento respostas→fatores DISC + algoritmo de pontuação + regra de sorteio das 40/100; assinatura via Autentique vs aceite interno; origem do progresso dos OKRs; periodicidade/anonimato do NPS interno; "Curso" como entidade vs config; estrutura do plano de carreira; integração futura de folha de pagamento.

**20 Operações:** visão padrão do calendário; duração de slot/expediente; home office bloqueia agendamento?; limite/aprovação de home office e plantão; banner de feriado (nativo aqui?); plaquinha de inventário = `codigo_unico`?; assinatura de recebimento (aceite vs Autentique); compra recebida → entra no inventário?; importar Google Calendar; nº de salas; lembrete de reunião por WhatsApp.

**21 Desenvolvimento:** acesso do time dev externo; ItemDev (subtipo de Tarefa vs entidade); sprint = lista vs campo; campos obrigatórios de bug; "definição de pronto"; retorno de teste → ReworkLog?; escala de severidade; cadência/duração de sprint; integração Git/CI (futuro).

> **Como usar:** levar este documento para a próxima reunião com o Gustavo (e a Franciélia para o financeiro/compras). Cada decisão resolvida vira regra fechada no módulo correspondente.
