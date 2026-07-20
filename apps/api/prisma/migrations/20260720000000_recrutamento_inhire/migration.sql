-- Migration idempotente (InHire): campos de Source of Hire + Fit (IA) no candidato
-- e módulo de Carta Oferta. Aplicável direto via psql no VPS (banco criado por
-- db push) SEM quebrar dados existentes. NUNCA usar migrate deploy/db push aqui.

-- Enums novos (idempotente)
DO $$ BEGIN
  CREATE TYPE "FitIA" AS ENUM ('ALTO', 'MEDIO', 'BAIXO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "StatusCartaOferta" AS ENUM ('RASCUNHO', 'ENVIADA', 'ACEITA', 'RECUSADA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Colunas aditivas em candidato (todas nuláveis)
ALTER TABLE "candidato" ADD COLUMN IF NOT EXISTS "origem" TEXT;
ALTER TABLE "candidato" ADD COLUMN IF NOT EXISTS "indicado_por" TEXT;
ALTER TABLE "candidato" ADD COLUMN IF NOT EXISTS "fit_nivel" "FitIA";
ALTER TABLE "candidato" ADD COLUMN IF NOT EXISTS "fit_pontuacao" INTEGER;
ALTER TABLE "candidato" ADD COLUMN IF NOT EXISTS "fit_justificativa" TEXT;
ALTER TABLE "candidato" ADD COLUMN IF NOT EXISTS "fit_avaliado_em" TIMESTAMP(3);

-- Tabela de modelos de carta oferta
CREATE TABLE IF NOT EXISTS "carta_oferta_template" (
  "id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "assunto" TEXT,
  "conteudo" TEXT NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "carta_oferta_template_pkey" PRIMARY KEY ("id")
);

-- Tabela de cartas oferta geradas por candidato
CREATE TABLE IF NOT EXISTS "carta_oferta" (
  "id" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "conteudo_renderizado" TEXT NOT NULL,
  "valores" JSONB,
  "status" "StatusCartaOferta" NOT NULL DEFAULT 'RASCUNHO',
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  "candidato_id" TEXT NOT NULL,
  "template_id" TEXT,
  CONSTRAINT "carta_oferta_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "carta_oferta_candidato_id_idx" ON "carta_oferta"("candidato_id");

-- FKs (idempotentes)
DO $$ BEGIN
  ALTER TABLE "carta_oferta"
    ADD CONSTRAINT "carta_oferta_candidato_id_fkey"
    FOREIGN KEY ("candidato_id") REFERENCES "candidato"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "carta_oferta"
    ADD CONSTRAINT "carta_oferta_template_id_fkey"
    FOREIGN KEY ("template_id") REFERENCES "carta_oferta_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
