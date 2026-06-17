-- Documentos do colaborador (holerite/folha) + avaliações de desempenho (Vídeo 4).

CREATE TABLE "documento_colaborador" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "competencia" TEXT,
    "assinado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "colaborador_id" TEXT NOT NULL,

    CONSTRAINT "documento_colaborador_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "documento_colaborador_colaborador_id_idx" ON "documento_colaborador"("colaborador_id");

CREATE TABLE "avaliacao_desempenho" (
    "id" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "nota" INTEGER,
    "comentario" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "colaborador_id" TEXT NOT NULL,
    "avaliador_id" TEXT,

    CONSTRAINT "avaliacao_desempenho_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "avaliacao_desempenho_colaborador_id_idx" ON "avaliacao_desempenho"("colaborador_id");

-- AddForeignKey
ALTER TABLE "documento_colaborador" ADD CONSTRAINT "documento_colaborador_colaborador_id_fkey"
  FOREIGN KEY ("colaborador_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "avaliacao_desempenho" ADD CONSTRAINT "avaliacao_desempenho_colaborador_id_fkey"
  FOREIGN KEY ("colaborador_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "avaliacao_desempenho" ADD CONSTRAINT "avaliacao_desempenho_avaliador_id_fkey"
  FOREIGN KEY ("avaliador_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
