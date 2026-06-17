-- Reuniões internas do time (independentes de cliente).
CREATE TABLE "reuniao_interna" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "data" TIMESTAMP(3) NOT NULL,
    "meet_link" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reuniao_interna_pkey" PRIMARY KEY ("id")
);
