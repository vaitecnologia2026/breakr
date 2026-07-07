-- CreateEnum
CREATE TYPE "StatusEstrategia" AS ENUM ('RASCUNHO', 'ENVIADA', 'APROVADA', 'AJUSTE');

-- AlterTable
ALTER TABLE "candidato" ADD COLUMN     "tags" TEXT;

-- AlterTable
ALTER TABLE "conteudo" ADD COLUMN     "midia_url" TEXT;

-- AlterTable
ALTER TABLE "curso_educacional" ADD COLUMN     "tipo_acesso" TEXT;

-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "notas_pessoais" TEXT,
ADD COLUMN     "whatsapp" TEXT;

-- CreateTable
CREATE TABLE "estrategia" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "status" "StatusEstrategia" NOT NULL DEFAULT 'RASCUNHO',
    "comentario_cliente" TEXT,
    "enviada_em" TIMESTAMP(3),
    "respondida_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "estrategista_id" TEXT,

    CONSTRAINT "estrategia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagem_direta" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "lida_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "de_id" TEXT NOT NULL,
    "para_id" TEXT NOT NULL,

    CONSTRAINT "mensagem_direta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "centro_custo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT,
    "teto" DECIMAL(12,2),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "centro_custo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nps_cliente" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "nota" INTEGER NOT NULL,
    "comentario" TEXT,
    "crise" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nps_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pesquisa" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pesquisa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resposta_pesquisa" (
    "id" TEXT NOT NULL,
    "pesquisa_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "nota" INTEGER,
    "comentario" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resposta_pesquisa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "estrategia_cliente_id_idx" ON "estrategia"("cliente_id");

-- CreateIndex
CREATE INDEX "estrategia_status_idx" ON "estrategia"("status");

-- CreateIndex
CREATE INDEX "mensagem_direta_de_id_para_id_criado_em_idx" ON "mensagem_direta"("de_id", "para_id", "criado_em");

-- CreateIndex
CREATE INDEX "mensagem_direta_para_id_lida_em_idx" ON "mensagem_direta"("para_id", "lida_em");

-- CreateIndex
CREATE INDEX "nps_cliente_cliente_id_idx" ON "nps_cliente"("cliente_id");

-- CreateIndex
CREATE INDEX "resposta_pesquisa_pesquisa_id_idx" ON "resposta_pesquisa"("pesquisa_id");

-- CreateIndex
CREATE UNIQUE INDEX "resposta_pesquisa_pesquisa_id_cliente_id_key" ON "resposta_pesquisa"("pesquisa_id", "cliente_id");

-- AddForeignKey
ALTER TABLE "estrategia" ADD CONSTRAINT "estrategia_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estrategia" ADD CONSTRAINT "estrategia_estrategista_id_fkey" FOREIGN KEY ("estrategista_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagem_direta" ADD CONSTRAINT "mensagem_direta_de_id_fkey" FOREIGN KEY ("de_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagem_direta" ADD CONSTRAINT "mensagem_direta_para_id_fkey" FOREIGN KEY ("para_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nps_cliente" ADD CONSTRAINT "nps_cliente_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resposta_pesquisa" ADD CONSTRAINT "resposta_pesquisa_pesquisa_id_fkey" FOREIGN KEY ("pesquisa_id") REFERENCES "pesquisa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resposta_pesquisa" ADD CONSTRAINT "resposta_pesquisa_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

