-- Vídeo 6: tipo/cor na reunião interna + comunicado ao cliente (banner no portal).

ALTER TABLE "reuniao_interna" ADD COLUMN "tipo" TEXT NOT NULL DEFAULT 'OUTRO';

CREATE TABLE "comunicado_cliente" (
    "id" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "comunicado_cliente_pkey" PRIMARY KEY ("id")
);
