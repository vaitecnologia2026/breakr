# 04 — Integrações Externas

Cada integração é um **adapter** isolado (interface única), com credenciais no cofre, chamadas via o motor (doc 03) com retry/idempotência. Nenhuma chamada de integração no front; tudo pelo backend.

> Regra de centralização (exigência do Gustavo): **todo retorno relevante é salvo no nosso banco** (boleto, NF, contrato, métricas), mesmo usando a API de terceiro. O sistema nunca depende de "ir ver lá".

## 1. ASAAS — cobrança/financeiro
- **Uso:** criar cliente, assinatura, cobrança, fatura; consultar **boletos pendentes** e **saldo**; receber **webhook de pagamento**.
- **Auth:** API key (cofre).
- **Operações:** `POST cliente`, `POST assinatura`, `POST cobrança`, `GET cobranças?status&vencimento`, `GET saldo`; **webhook** `payment.received` → evento `fatura.paga`.
- **Salvar no banco:** `asaas_id`, status, boleto/PIX, vencimento, valor.

## 2. Speed — Nota Fiscal (NF-e)
- **Uso:** emitir NF após pagamento; salvar PDF/link no sistema.
- **Operações:** emitir NF (dados do cliente + plano), consultar status, baixar PDF.
- **Salvar:** `speed_id`, link PDF, status. Disparado pela regra "Liberar Onboarding Após Pagamento".

## 3. WhatsApp — API oficial (+ MegaAPI na transição)
- **Uso:** mensagens, **criar grupo** do cliente, adicionar CS como admin, enviar descrição/link, enviar **boleto/PIX/fatura** (cobrança), aprovação de peças, follow-up de reunião, **inbox roteado por área** dentro do sistema.
- **Auth:** API oficial (VAI é o integrador — já opera). MegaAPI como fallback/transição (`@g.us`, `wa_group_id`).
- **Operações:** enviar texto/mídia/template, criar grupo, gerenciar participantes, receber mensagens (webhook) → rotear (ex.: msg do financeiro "apita" no painel da Franciélia).
- **Crítico:** API oficial aumenta confiabilidade da cobrança (pedido do Gustavo).

## 4. Meta Ads — Marketing API
- **Uso:** ler **campanhas em tempo real** da BM (o que roda de fato), **gasto real**, métricas (CPM, CTR, ROAS, conversões); **importar/sincronizar públicos**; (futuro) pausar/ativar/ajustar budget.
- **Auth:** token de sistema + ad account ids por cliente (cofre).
- **Operações:** `GET insights` (por campanha/conjunto/anúncio), `GET campaigns/adsets/ads`, `GET customaudiences`; alimentar dashboard de tráfego e a **IA de tráfego** (doc 17).
- **Obs.:** respeitar rate limits; cache de métricas no banco.

## 5. Google Docs / Drive
- **Docs:** gerar contrato a partir de **template com tags** → `replace` via API → exportar PDF.
- **Drive:** criar **estrutura de pastas padrão** por cliente (ideias/materiais, design, vídeos, gestão…); abstração de storage (trocável por storage próprio depois — doc 01).
- **Auth:** service account / OAuth (cofre).

## 6. Autentique — assinatura eletrônica
- **Uso:** enviar contrato (PDF) para assinatura; receber **retorno de assinado** → evento `contrato.assinado` → contrato "em vigor".
- **Hoje falta** o retorno automático de assinatura — **implementar** (webhook/polling).

## 7. VoIP / Telefonia (click-to-call) — Comercial
- **Uso:** ligar para o lead/cliente a partir do CRM (R$/min via créditos); registrar ligação; **scripts** de ligação no sistema.
- 🔶 CONFIRMAR provedor (o protótipo do Gustavo usava "IPECAL"/créditos; validar API).

## 8. Enriquecimento de Leads
- **Uso:** buscar restaurantes por cidade/segmento (base Receita Federal) e **enriquecer** (telefone, Instagram, decisor).
- **Obs.:** o enriquecimento gratuito que ele testou é ruim; avaliar provedor pago (Serasa / birô). 🔶 CONFIRMAR provedor e custo/lead. **LGPD**: base legal para prospecção.

## 9. (Futuro — fora da v1) Open Delivery · Open Finance
- Registrados como evolução (doc 00). Não implementar na v1.

## Padrões para todos os adapters
- Interface comum (`enviar`, `consultar`, `webhook`), timeout, retry/backoff, idempotência, log em `WebhookLog`/`JobExecution`.
- Credenciais em **IntegrationCredential** (criptografado, rotacionável).
- **Sandbox/homologação** antes de produção para ASAAS, Speed, WhatsApp, Meta, Autentique.
- Falha de terceiro → não perde a execução (dead-letter + alerta), nunca trava a operação humana.
