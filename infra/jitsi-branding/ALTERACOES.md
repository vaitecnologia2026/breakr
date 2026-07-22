# Branding Breakr na tela inicial do Jitsi (meet-breakr.vaitecnologia.com.br)

> Ajuste **somente visual/branding** da tela inicial (welcome page) do Jitsi para o
> design system do Breakr (nome, logo, paleta "brasa", fonte Lexend). **Nenhuma
> funcionalidade removida; nenhuma lógica alterada; reunião segue funcional.**

Data: 2026-07-22.

## Onde isso roda (importante)
Esta tela é servida por **arquivos estáticos do Jitsi no VPS** (`204.157.108.179`, em
`/usr/share/jitsi-meet/`), atrás do nginx+Caddy. **NÃO** está no GitHub nem na Vercel — é
separada do frontend Breakr (esse sim fica na Vercel). Por isso **não há deploy na Vercel**
para esta mudança (o frontend Breakr não foi tocado). Esta pasta versiona os arquivos de
branding + backups + esta doc para registro e restauração.

## O que foi alterado (cirúrgico)

### 1. `interface_config.js` (valores trocados)
| Chave | Antes | Depois |
|---|---|---|
| `APP_NAME` | `'Jitsi Meet'` | `'Breakr'` |
| `NATIVE_APP_NAME` | comentado | `'Breakr'` |
| `PROVIDER_NAME` | `'Jitsi'` | `'Breakr'` |
| `DEFAULT_WELCOME_PAGE_LOGO_URL` | `'images/watermark.svg'` | `'images/breakr-logo.png'` |
| `DEFAULT_LOGO_URL` | comentado | `'images/breakr-logo.png'` |
| `JITSI_WATERMARK_LINK` | `'https://jitsi.org'` | `'https://breakr.vaitecnologia.com.br'` |
| `DEFAULT_BACKGROUND` | `'#040404'` | `'#0F0D05'` (Preto Fumaça) |

### 2. `index.html`
Adicionada 1 linha (após o `all.css`): `<link rel="stylesheet" href="css/custom-breakr.css?v=breakr1">`.

### 3. `css/custom-breakr.css` (arquivo NOVO)
CSS escopado a `.welcome`/`.welcome-page` (não afeta a reunião): fonte Lexend, fundo Preto
Fumaça, cabeçalho e botão "Iniciar reunião" com o **gradiente brasa**
`linear-gradient(135deg, #94122C, #CA3F17 55%, #FF9406)`, título/subtítulo em Cinza Vapor.

### 4. `lang/main-pt-BR.json`, `lang/main-pt.json`, `lang/main.json`
Trocados **apenas 2 textos** da welcome page:
- `welcomepage.headerTitle`: `"Jitsi Meet"` → `"Breakr"`
- `welcomepage.jitsiOnMobile`: `"Jitsi em dispositivos móveis…"` → `"Breakr em dispositivos móveis…"`

### 5. `images/breakr-logo.png` (arquivo NOVO)
Logo oficial do Breakr (`breakr-logo-branca.png` do `apps/web/public`), copiada para o Jitsi.

## Design system aplicado (fonte: `apps/web/src/index.css` do Breakr)
- Fonte: **Lexend** · Nome: **Breakr**
- Preto Fumaça `#0F0D05` · Cinza Vapor `#F3F4F7`
- Gradiente brasa: Vermelho Fogo `#94122C` → Laranja Brasa `#CA3F17` → Amarelo Fagulha `#FF9406`

## Backups (para restaurar)
- **No VPS:** `/opt/breakr-jitsi-branding/backup-20260722-180714/` (originais de
  `interface_config.js`, `index.html`, `title.html`, `main-pt-BR.json`, `main-pt.json`, `main.json`).
- **Local (esta pasta):** `backup-original/` (mesmos arquivos).
- **Cópia da produção atual:** `producao/` (arquivos exatamente como estão no ar).

### Como restaurar (no VPS)
```sh
BK=/opt/breakr-jitsi-branding/backup-20260722-180714
cp $BK/interface_config.js /usr/share/jitsi-meet/interface_config.js
cp $BK/index.html          /usr/share/jitsi-meet/index.html
cp $BK/main-pt-BR.json     /usr/share/jitsi-meet/lang/main-pt-BR.json
cp $BK/main-pt.json        /usr/share/jitsi-meet/lang/main-pt.json
cp $BK/main.json           /usr/share/jitsi-meet/lang/main.json
rm -f /usr/share/jitsi-meet/css/custom-breakr.css
# (opcional) remover o <link> do custom-breakr.css do index.html
```

## Verificação (ao vivo, 2026-07-22)
- `APP_NAME` servido = `Breakr`; `headerTitle` servido = `Breakr`.
- Logo `images/breakr-logo.png` → HTTP 200; `css/custom-breakr.css` → HTTP 200.
- Aba do navegador com título **Breakr**; logo + gradiente brasa renderizados.
- Botão **"Iniciar reunião"** presente e funcional; `/http-bind` → HTTP 200 (reunião intacta).
- `node --check` no `interface_config.js` = OK; `JSON.parse` nos 3 `lang/*.json` = OK.
