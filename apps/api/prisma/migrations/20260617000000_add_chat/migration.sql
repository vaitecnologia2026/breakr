-- CreateEnum
CREATE TYPE "TipoCanal" AS ENUM ('PUBLICO', 'PRIVADO');

-- CreateTable: canal_chat
CREATE TABLE "canal_chat" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" "TipoCanal" NOT NULL DEFAULT 'PUBLICO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "canal_chat_pkey" PRIMARY KEY ("id")
);

-- UniqueIndex on nome
CREATE UNIQUE INDEX "canal_chat_nome_key" ON "canal_chat"("nome");

-- CreateTable: mensagem_chat
CREATE TABLE "mensagem_chat" (
    "id" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editado_em" TIMESTAMP(3),
    "canal_id" TEXT NOT NULL,
    "autor_id" TEXT,

    CONSTRAINT "mensagem_chat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mensagem_chat_canal_id_criado_em_idx" ON "mensagem_chat"("canal_id", "criado_em");

-- AddForeignKey
ALTER TABLE "mensagem_chat" ADD CONSTRAINT "mensagem_chat_canal_id_fkey"
  FOREIGN KEY ("canal_id") REFERENCES "canal_chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mensagem_chat" ADD CONSTRAINT "mensagem_chat_autor_id_fkey"
  FOREIGN KEY ("autor_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed: canais padrão
INSERT INTO "canal_chat" ("id", "nome", "descricao", "tipo", "criado_em") VALUES
  ('00000000-chat-0000-0000-000000000001', 'geral',  'Canal oficial da equipe',              'PUBLICO', NOW()),
  ('00000000-chat-0000-0000-000000000002', 'avisos', 'Comunicados e anúncios importantes',   'PUBLICO', NOW()),
  ('00000000-chat-0000-0000-000000000003', 'random', 'Conversas informais',                  'PUBLICO', NOW());
