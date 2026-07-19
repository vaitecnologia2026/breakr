-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "StatusProcessoJuridico" AS ENUM ('ATIVO', 'SUSPENSO', 'ARQUIVADO', 'ENCERRADO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "processo_juridico" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "parte" TEXT NOT NULL,
    "vara" TEXT,
    "fase" TEXT,
    "status" "StatusProcessoJuridico" NOT NULL DEFAULT 'ATIVO',
    "valor_causa" DECIMAL(12,2),
    "proximo_prazo" TIMESTAMP(3),
    "observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "processo_juridico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "processo_juridico_status_idx" ON "processo_juridico"("status");
