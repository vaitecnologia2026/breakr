-- Video 2 (médios): status EM_ALTERACAO, log de otimizações e link de Meet no evento.
-- O ADD VALUE nao e usado em statements desta migracao (seguro em PG12+).

ALTER TYPE "StatusConteudo" ADD VALUE 'EM_ALTERACAO';

-- meet_link no evento de onboarding/reuniao
ALTER TABLE "onboarding_evento" ADD COLUMN "meet_link" TEXT;

-- CreateTable: otimizacao_campanha
CREATE TABLE "otimizacao_campanha" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "resultado" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campanha_id" TEXT NOT NULL,
    "autor_id" TEXT,

    CONSTRAINT "otimizacao_campanha_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "otimizacao_campanha_campanha_id_idx" ON "otimizacao_campanha"("campanha_id");

-- AddForeignKey
ALTER TABLE "otimizacao_campanha" ADD CONSTRAINT "otimizacao_campanha_campanha_id_fkey"
  FOREIGN KEY ("campanha_id") REFERENCES "campanha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "otimizacao_campanha" ADD CONSTRAINT "otimizacao_campanha_autor_id_fkey"
  FOREIGN KEY ("autor_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
