-- Novos campos comerciais no contrato (aditivos, nullable) + FK opcional p/ lead
ALTER TABLE "contrato" ADD COLUMN IF NOT EXISTS "lead_id" TEXT;
ALTER TABLE "contrato" ADD COLUMN IF NOT EXISTS "tipo_contrato" TEXT;
ALTER TABLE "contrato" ADD COLUMN IF NOT EXISTS "duracao_meses" INTEGER;
ALTER TABLE "contrato" ADD COLUMN IF NOT EXISTS "desconto_pct" INTEGER;
ALTER TABLE "contrato" ADD COLUMN IF NOT EXISTS "forma_pagamento" TEXT;
ALTER TABLE "contrato" ADD COLUMN IF NOT EXISTS "dia_pagamento" INTEGER;
ALTER TABLE "contrato" ADD COLUMN IF NOT EXISTS "data_assinatura" TIMESTAMP(3);

-- Tabela de cadastro completo (1:1 com o negocio/lead)
CREATE TABLE IF NOT EXISTS "cadastro_contrato" (
  "id" TEXT NOT NULL,
  "lead_id" TEXT NOT NULL,
  "razao_social" TEXT,
  "nome_fantasia" TEXT,
  "cnpj" TEXT,
  "nome_socio" TEXT,
  "cpf_socio" TEXT,
  "data_nascimento_socio" TEXT,
  "profissao" TEXT,
  "nacionalidade" TEXT,
  "email" TEXT,
  "whatsapp_socio" TEXT,
  "whatsapp_financeiro" TEXT,
  "cep" TEXT,
  "endereco" TEXT,
  "numero" TEXT,
  "complemento" TEXT,
  "bairro" TEXT,
  "cidade_estado" TEXT,
  "inscricao_municipal" TEXT,
  "inscricao_estadual" TEXT,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cadastro_contrato_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "cadastro_contrato_lead_id_key" ON "cadastro_contrato"("lead_id");

-- FKs (guardadas para idempotencia)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cadastro_contrato_lead_id_fkey') THEN
    ALTER TABLE "cadastro_contrato" ADD CONSTRAINT "cadastro_contrato_lead_id_fkey"
      FOREIGN KEY ("lead_id") REFERENCES "lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contrato_lead_id_fkey') THEN
    ALTER TABLE "contrato" ADD CONSTRAINT "contrato_lead_id_fkey"
      FOREIGN KEY ("lead_id") REFERENCES "lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
