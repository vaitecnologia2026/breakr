-- Onboarding do cliente: link da area de membros, link por etapa,
-- agenda de eventos e aulas (com progresso por cliente).

-- AlterTable: cliente
ALTER TABLE "cliente" ADD COLUMN "link_area_membros" TEXT;

-- AlterTable: onboarding_step
ALTER TABLE "onboarding_step" ADD COLUMN "link" TEXT;

-- CreateTable: onboarding_evento
CREATE TABLE "onboarding_evento" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "data" TIMESTAMP(3) NOT NULL,
    "o_que_levar" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cliente_id" TEXT NOT NULL,

    CONSTRAINT "onboarding_evento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "onboarding_evento_cliente_id_idx" ON "onboarding_evento"("cliente_id");

-- CreateTable: aula
CREATE TABLE "aula" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "video_url" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aula_pkey" PRIMARY KEY ("id")
);

-- CreateTable: aula_conclusao
CREATE TABLE "aula_conclusao" (
    "id" TEXT NOT NULL,
    "concluida_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aula_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,

    CONSTRAINT "aula_conclusao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "aula_conclusao_aula_id_cliente_id_key" ON "aula_conclusao"("aula_id", "cliente_id");
CREATE INDEX "aula_conclusao_cliente_id_idx" ON "aula_conclusao"("cliente_id");

-- AddForeignKey
ALTER TABLE "onboarding_evento" ADD CONSTRAINT "onboarding_evento_cliente_id_fkey"
  FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "aula_conclusao" ADD CONSTRAINT "aula_conclusao_aula_id_fkey"
  FOREIGN KEY ("aula_id") REFERENCES "aula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "aula_conclusao" ADD CONSTRAINT "aula_conclusao_cliente_id_fkey"
  FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
