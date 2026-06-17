-- Vídeo 7: cronograma de otimização configurável, critérios de avaliação (CSAT)
-- e duração da otimização.

ALTER TABLE "otimizacao_campanha" ADD COLUMN "duracao_minutos" INTEGER;

CREATE TABLE "regra_otimizacao" (
    "id" TEXT NOT NULL,
    "dia_semana" INTEGER NOT NULL,
    "objetivo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "regra_otimizacao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "criterio_avaliacao" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "criterio_avaliacao_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "criterio_avaliacao_tipo_idx" ON "criterio_avaliacao"("tipo");
