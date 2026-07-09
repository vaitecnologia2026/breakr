-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "TipoAtividade" AS ENUM ('LIGACAO', 'WHATSAPP', 'EMAIL', 'INSTAGRAM', 'REUNIAO', 'OUTRO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "StatusAtividade" AS ENUM ('PENDENTE', 'CONCLUIDA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "atividade_comercial" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" "TipoAtividade" NOT NULL DEFAULT 'LIGACAO',
    "status" "StatusAtividade" NOT NULL DEFAULT 'PENDENTE',
    "vencimento" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "lead_id" TEXT,
    "responsavel_id" TEXT,
    CONSTRAINT "atividade_comercial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "atividade_comercial_status_idx" ON "atividade_comercial"("status");
CREATE INDEX IF NOT EXISTS "atividade_comercial_lead_id_idx" ON "atividade_comercial"("lead_id");
CREATE INDEX IF NOT EXISTS "atividade_comercial_responsavel_id_idx" ON "atividade_comercial"("responsavel_id");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "atividade_comercial" ADD CONSTRAINT "atividade_comercial_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "atividade_comercial" ADD CONSTRAINT "atividade_comercial_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
