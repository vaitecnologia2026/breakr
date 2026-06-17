-- Inventário interno + catálogo educacional (Vídeo 4).

-- CreateTable: item_inventario
CREATE TABLE "item_inventario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT,
    "valor" DECIMAL(12,2),
    "nota_fiscal_url" TEXT,
    "plaqueta" TEXT,
    "recebido_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responsavel_id" TEXT,

    CONSTRAINT "item_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable: curso_educacional
CREATE TABLE "curso_educacional" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "url" TEXT NOT NULL,
    "plataforma" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curso_educacional_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "item_inventario" ADD CONSTRAINT "item_inventario_responsavel_id_fkey"
  FOREIGN KEY ("responsavel_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
