-- CreateTable
CREATE TABLE "comunicado" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "fixado" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "autor_id" TEXT,

    CONSTRAINT "comunicado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comunicado_fixado_idx" ON "comunicado"("fixado");

-- AddForeignKey
ALTER TABLE "comunicado" ADD CONSTRAINT "comunicado_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
