# Breakr OS — Links de Produção

| | URL |
|---|---|
| **Sistema (front)** | https://breakr.vai-sistema.com |
| **API** | https://api-production-fc29.up.railway.app |
| **Saúde da API** | https://api-production-fc29.up.railway.app/health |

## Login
- **E-mail:** admin@breakr.com
- **Senha:** breakr123 _(trocar antes de entregar ao Gustavo)_

## Infraestrutura
- **Front:** Vercel (projeto `breakr-os` — `elisonperini-bots-projects`)
- **API:** Railway (projeto `breakr-os` — conta VAI TECNOLOGIA)
- **Banco:** PostgreSQL no Railway (mesmo projeto)

## Para re-deploy
- **Front:** `vercel deploy --prebuilt --prod --scope elisonperini-bots-projects` (na raiz do monorepo após `vercel build --yes --prod`)
- **API:** push para `main` no GitHub (Railway faz auto-deploy se configurado) ou redeploy manual no painel
