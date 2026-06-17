-- Teste DISC: banco de perguntas (configurável) + currículo no candidato.

ALTER TABLE "candidato" ADD COLUMN "curriculo_url" TEXT;

CREATE TABLE "disc_pergunta" (
    "id" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "enunciado" TEXT,
    "opcoes" JSONB NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disc_pergunta_pkey" PRIMARY KEY ("id")
);
