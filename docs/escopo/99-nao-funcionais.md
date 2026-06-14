# 99 — Requisitos Não-Funcionais & QA

Requisitos que valem para **todo** o sistema, somados aos critérios de aceite de cada módulo.

## Segurança
- **Auth:** JWT (access + refresh 🔶 expiração), senhas com hash forte (argon2/bcrypt). 2FA/SSO 🔶 (avaliar para admins).
- **RBAC:** toda ação verifica permissão por cargo; acessos parciais explícitos (ex.: CS ↔ cláusulas do contrato).
- **Cofre de credenciais:** tokens de integração (ASAAS/Meta/WhatsApp/Speed/Autentique/Google) criptografados, fora do código, rotacionáveis.
- **Dados sensíveis** (CNPJ/CPF, contratos, financeiro, **senhas de acesso de clientes** — Meta/Facebook): criptografia em repouso; TLS em trânsito; mascaramento em logs.
- **LGPD:** base legal (contrato/legítimo interesse), consentimento p/ leads, retenção/expurgo, atendimento a titular; tratar dados de clientes finais e de prospecção conforme política. 🔶 Política formal.

## Confiabilidade (crítico — o motor substitui o n8n)
- **Nenhuma execução pode se perder:** fila persistente, **retry com backoff**, **idempotência** por evento, **dead-letter** + alerta em falha terminal.
- Falha de integração de terceiro **nunca** trava a operação humana (degrada com aviso; reprocessa depois).
- **Reconciliação** periódica (ex.: pagamentos ASAAS) para cobrir webhooks perdidos.

## Observabilidade & auditoria
- Logs estruturados; **painel de execuções** do motor (filtrar/reexecutar/inspecionar payload).
- **AuditLog** de toda ação relevante (quem, o quê, antes/depois, quando) — base da rastreabilidade por código único.
- Alertas de erro (motor, integrações, jobs).

## Performance & escala
- Dimensionado para a operação da Breakr (dezenas de squads, centenas de clientes, milhares de tarefas/campanhas). 🔶 Validar volumes com o Gustavo.
- Métricas da Meta em **cache** no banco (não consultar a API a cada tela); respeitar rate limits.
- Listas/dashboards paginados; consultas indexadas (Prisma/Postgres).

## Disponibilidade & dados
- **Backup diário** (Postgres + storage) com **restore testado** periodicamente.
- Ambientes isolados (dev/staging/prod); migrations versionadas; nenhum dado de produção em dev.
- Janela de manutenção comunicada (módulo de comunicados).

## UX, acessibilidade & marca
- **Web responsiva** (desktop + mobile); app nativo fora da v1.
- Identidade **Breakr** (preto fumaça, gradiente brasa, Lexend) — ver `../_DOCS/MARCA-Breakr-resumo.md`.
- Idioma **pt-BR**.
- Realtime onde o negócio exige (pop-up "novo contrato p/ Franciélia", notificações, inbox).

## Integrações — padrões (ver doc 04)
- Sandbox/homologação antes de produção (ASAAS, Speed, WhatsApp, Meta, Autentique).
- Timeouts, retries e logs por chamada; credenciais no cofre.

## QA & Definição de Pronto (global)
Um item/módulo só é **PRONTO** quando:
1. Atende às regras de negócio numeradas do módulo.
2. **Todos os critérios de aceite** do módulo passam (testes).
3. Respeita permissões por cargo (testado com cada papel relevante).
4. Registra **log/auditoria** e, se tiver automação, aparece no painel de execuções.
5. Tem testes automatizados (unidade nas regras; integração nos fluxos críticos: contrato, pagamento, onboarding, otimização).
6. Foi **homologado pela Breakr em staging** e validado em produção paralela antes do corte do legado (ver doc 95).
7. Sem `🔶` aberto que afete o comportamento (todos resolvidos ou explicitamente adiados).

## Documentação de entrega
- README técnico (setup), diagrama de dados (Prisma), catálogo de regras do motor, manual do **painel de configuração** (para o Gustavo operar sem dev), e runbook de operação (backup/restore, reprocessar jobs).
