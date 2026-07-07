# Breakr — Testes E2E (Playwright)

Suíte de testes automatizados que **simula um usuário real** no navegador,
espelhando o `BREAKR-GUIA-DE-TESTES/CHECKLIST-TESTES-BREAKR.html`. Serve para
**validar os erros encontrados** e virar **regressão**: se algo que já foi
corrigido voltar a quebrar, o teste acusa na hora (com print, vídeo e trace).

> Projeto **isolado**: fica nesta pasta, tem seu próprio `package.json` e **não
> importa nem altera** o código do app (`apps/web`, `apps/api`).

## O que cobre (mapa checklist → teste)

| Arquivo | Blocos do checklist | Tipo |
|---|---|---|
| `tests/acesso.spec.ts` | 0 — login OK/errado, menu por cargo (RBAC) | leitura |
| `tests/smoke.spec.ts` | todas as páginas carregam sem erro de console | leitura |
| `tests/portal.spec.ts` | 6 e 8 — portal abre por código, **mídia renderiza** (bug corrigido), aprovar/pedir ajuste | leitura |
| `tests/comunicacao-nps.spec.ts` | 11 e 12 — Comunicados, Chat, NPS, Atendimento | leitura |
| `tests/fluxos-escrita.spec.ts` | 1, 2, 3, 4, 7 — Equipe realtime ★, plano duplicado ★, squad criar/excluir, cliente + erro, conteúdo | **escrita** |

- **leitura** = seguro em qualquer ambiente (não grava nada).
- **escrita** = cria/edita/exclui dados de verdade → **prefira rodar em LOCAL/staging**.

## Como rodar

```bash
cd BREAKR-TESTES-E2E
cp .env.example .env      # edite BREAKR_USUARIO / BREAKR_SENHA
npm install               # instala o Playwright + o navegador (postinstall)

# Só os testes de LEITURA (seguros, contra produção):
npm run test:leitura

# Só o smoke (mais rápido):
npm run test:smoke

# Tudo (inclui escrita — de preferência com BASE_URL local):
BASE_URL=http://localhost:5173 npm run test:escrita

# Ver o relatório visual (HTML, parecido com o checklist):
npm run report

# Modo visual/interativo:
npm run test:ui
```

## Configuração (`.env`)

| Variável | Para quê |
|---|---|
| `BASE_URL` | URL alvo. Produção por padrão; `http://localhost:5173` para local. |
| `BREAKR_USUARIO` | Conta de login (ADMIN/SUPERADMIN). O campo na tela é "Usuário". |
| `BREAKR_SENHA` | Senha da conta. **Não** comite o `.env`. |
| `BREAKR_PORTAL_CODIGO` | Código do cliente de teste (tela Clientes → "Código / Portal") para os testes do portal. Sem ele, usa `/portal/demo`. |

## Como funciona

1. O projeto **`setup`** (`tests/global.setup.ts`) loga **uma vez** e salva a
   sessão em `.auth/admin.json` (token no `localStorage`).
2. Os specs **autenticados** reaproveitam essa sessão (não relogam).
3. Os specs do **portal** e de **login** rodam anônimos; o portal também roda
   emulando **celular** (Pixel 7), como pede o checklist.
4. Em qualquer falha, o relatório guarda **screenshot + vídeo + trace**.

## Ajuste fino dos testes de escrita

Os fluxos de escrita seguem os rótulos/textos da UI (ex.: botão "Criar usuário",
"Cadastrar"). Se algum modal tiver rótulo diferente no seu ambiente, ajuste o
`getByLabel(...)`/`getByPlaceholder(...)` correspondente — a estrutura (abrir
modal → preencher → salvar → conferir na lista) continua a mesma.
