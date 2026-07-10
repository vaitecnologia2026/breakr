-- CreateTable
CREATE TABLE "lead_plano" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "plano_id" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_plano_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_produto" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_produto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_plano_lead_id_idx" ON "lead_plano"("lead_id");

-- CreateIndex
CREATE INDEX "lead_plano_plano_id_idx" ON "lead_plano"("plano_id");

-- CreateIndex
CREATE INDEX "lead_produto_lead_id_idx" ON "lead_produto"("lead_id");

-- CreateIndex
CREATE INDEX "lead_produto_produto_id_idx" ON "lead_produto"("produto_id");

-- AddForeignKey
ALTER TABLE "lead_plano" ADD CONSTRAINT "lead_plano_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_plano" ADD CONSTRAINT "lead_plano_plano_id_fkey" FOREIGN KEY ("plano_id") REFERENCES "plano"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_produto" ADD CONSTRAINT "lead_produto_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_produto" ADD CONSTRAINT "lead_produto_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
