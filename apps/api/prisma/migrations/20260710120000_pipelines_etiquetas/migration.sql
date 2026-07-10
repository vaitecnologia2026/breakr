-- Pipelines + etapas + etiquetas do CRM (estilo RD) + vinculos no lead.
-- Aditivo e idempotente: nao altera dados existentes; `status` do lead continua a
-- fonte de verdade do funil.

CREATE TABLE IF NOT EXISTS "pipeline" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pipeline_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "pipeline_nome_key" ON "pipeline"("nome");

CREATE TABLE IF NOT EXISTS "etapa_pipeline" (
    "id" TEXT NOT NULL,
    "pipeline_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusLead" NOT NULL DEFAULT 'NOVO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "etapa_pipeline_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "etapa_pipeline_pipeline_id_idx" ON "etapa_pipeline"("pipeline_id");

CREATE TABLE IF NOT EXISTS "etiqueta" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL DEFAULT '#22c55e',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "etiqueta_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "etiqueta_nome_key" ON "etiqueta"("nome");

CREATE TABLE IF NOT EXISTS "lead_etiqueta" (
    "lead_id" TEXT NOT NULL,
    "etiqueta_id" TEXT NOT NULL,
    CONSTRAINT "lead_etiqueta_pkey" PRIMARY KEY ("lead_id","etiqueta_id")
);

ALTER TABLE "lead" ADD COLUMN IF NOT EXISTS "pipeline_id" TEXT;
ALTER TABLE "lead" ADD COLUMN IF NOT EXISTS "etapa_id" TEXT;
ALTER TABLE "lead" ADD COLUMN IF NOT EXISTS "previsao_fechamento" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "lead_pipeline_id_idx" ON "lead"("pipeline_id");
CREATE INDEX IF NOT EXISTS "lead_etapa_id_idx" ON "lead"("etapa_id");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'etapa_pipeline_pipeline_id_fkey') THEN
    ALTER TABLE "etapa_pipeline" ADD CONSTRAINT "etapa_pipeline_pipeline_id_fkey"
      FOREIGN KEY ("pipeline_id") REFERENCES "pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lead_etiqueta_lead_id_fkey') THEN
    ALTER TABLE "lead_etiqueta" ADD CONSTRAINT "lead_etiqueta_lead_id_fkey"
      FOREIGN KEY ("lead_id") REFERENCES "lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lead_etiqueta_etiqueta_id_fkey') THEN
    ALTER TABLE "lead_etiqueta" ADD CONSTRAINT "lead_etiqueta_etiqueta_id_fkey"
      FOREIGN KEY ("etiqueta_id") REFERENCES "etiqueta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lead_pipeline_id_fkey') THEN
    ALTER TABLE "lead" ADD CONSTRAINT "lead_pipeline_id_fkey"
      FOREIGN KEY ("pipeline_id") REFERENCES "pipeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lead_etapa_id_fkey') THEN
    ALTER TABLE "lead" ADD CONSTRAINT "lead_etapa_id_fkey"
      FOREIGN KEY ("etapa_id") REFERENCES "etapa_pipeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
