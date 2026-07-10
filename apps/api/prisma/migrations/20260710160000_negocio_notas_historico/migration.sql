-- CreateTable
CREATE TABLE "nota_lead" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "autor_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nota_lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_lead" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "acao" TEXT NOT NULL DEFAULT 'Etapa alterada',
    "de" TEXT,
    "para" TEXT,
    "autor_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nota_lead_lead_id_idx" ON "nota_lead"("lead_id");

-- CreateIndex
CREATE INDEX "historico_lead_lead_id_idx" ON "historico_lead"("lead_id");

-- AddForeignKey
ALTER TABLE "nota_lead" ADD CONSTRAINT "nota_lead_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nota_lead" ADD CONSTRAINT "nota_lead_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_lead" ADD CONSTRAINT "historico_lead_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_lead" ADD CONSTRAINT "historico_lead_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
