# n8n — workflows versionados

## `1 - [Break] Envio da Cobranca (com Sandbox de Teste).json`
Workflow n8n **"1 - [Break] Envio da Cobrança"** com um **3º fluxo aditivo de Teste Sandbox**
para a assinatura de contrato, sem alterar os fluxos de produção.

- **Produção (inalterada):** webhooks `breakr-envio-da-cobranca` (assinatura, credencial
  `[ASAAS] Produção`) e `breakr-pagamento-asaas` (aviso de pagamento → `POST /integracoes/asaas/webhook`).
- **Adicionado (só para testes):** webhook `breakr-envio-da-cobranca-teste` + nós
  Cadastra/Assinatura/Listar "(Sandbox)" com a credencial `[ASAAS] Sandbox` + resposta com o campo
  extra `ambiente: "sandbox"`.
- O `id` do workflow (`oulfLh1AIfcOKAzR`) é preservado → reimportar **atualiza no lugar** (não
  duplica webhooks).

Detalhes, passo a passo de uso e verificação de não-quebra:
`BREAKR-BACKUPS/asaas-sandbox-teste-n8n-flow-2026-07-24/README.md` (fora do repo).

## `2 - [ClickUp] Envio do Contrato para Assinatura (com WhatsApp VAI CRM).json`
Workflow n8n **"2 - [ClickUp] Envio do Contrato para Assinatura"** com um **sub-fluxo aditivo** que
envia ao **WhatsApp Financeiro** (via API do **VAI CRM**) UMA mensagem com o **link de assinatura do
contrato** (Autentique) **+ o link da cobrança** (Asaas `invoiceUrl`) — **sem e-mail**.

- **Produção (inalterada):** o fluxo de assinatura via Autentique + ClickUp permanece intacto
  (10/10 nós e 8/8 conexões byte-a-byte iguais). O sub-fluxo parte do fim do nó terminal
  `Salva Link do Contrato`.
- **Adicionado:** `Prepara Envio WhatsApp` → `Busca Cliente Asaas` → `Busca Cobranca Asaas` →
  `Monta Mensagem WhatsApp` → `VAI CRM Canal` → `VAI CRM Contato` → `VAI CRM Chat` →
  `VAI CRM Enviar Mensagem`. Credencial nova: **VAI CRM API** (Header Auth `Bearer vai_<token>`).
- O `id` do workflow (`eRyGDAdG7mKk66T4`) é preservado → reimportar **atualiza no lugar**.
- O **JSON 1** ("Criação e Cadastro de Contrato") **não foi alterado** (a cobrança já é criada lá).

Detalhes, pré-requisitos no n8n e verificação de não-quebra:
`BREAKR-BACKUPS/asaas-contrato-cobranca-whatsapp-vaicrm-2026-07-24/README.md` (fora do repo).
