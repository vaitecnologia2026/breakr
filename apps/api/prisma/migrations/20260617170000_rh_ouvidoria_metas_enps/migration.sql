-- RH: ouvidoria, metas trimestrais e eNPS (Vídeo 4).

-- CreateTable: ouvidoria
CREATE TABLE "ouvidoria" (
    "id" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "anonima" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "resolucao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autor_id" TEXT,

    CONSTRAINT "ouvidoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable: meta_trimestre
CREATE TABLE "meta_trimestre" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "periodo" TEXT NOT NULL,
    "progresso" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'EM_ANDAMENTO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meta_trimestre_pkey" PRIMARY KEY ("id")
);

-- CreateTable: resposta_enps
CREATE TABLE "resposta_enps" (
    "id" TEXT NOT NULL,
    "nota" INTEGER NOT NULL,
    "comentario" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resposta_enps_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ouvidoria" ADD CONSTRAINT "ouvidoria_autor_id_fkey"
  FOREIGN KEY ("autor_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
