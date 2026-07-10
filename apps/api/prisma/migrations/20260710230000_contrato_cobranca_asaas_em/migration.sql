-- Coluna de idempotencia da cobranca Asaas disparada via webhook n8n ao criar o
-- contrato ("Criar Contrato"). Aditiva e idempotente — nao altera dados existentes.
ALTER TABLE "contrato" ADD COLUMN IF NOT EXISTS "cobranca_asaas_em" TIMESTAMP(3);
