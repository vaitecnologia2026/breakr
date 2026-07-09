-- Produto avulso + vinculo N:N Plano<->Produto (quais produtos compoem um plano).
-- Aditivo e idempotente: nao altera tabelas existentes.

CREATE TABLE IF NOT EXISTS "produto" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "valor" DECIMAL(12,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "produto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "produto_nome_key" ON "produto"("nome");

CREATE TABLE IF NOT EXISTS "plano_produto" (
    "plano_id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    CONSTRAINT "plano_produto_pkey" PRIMARY KEY ("plano_id","produto_id")
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plano_produto_plano_id_fkey') THEN
    ALTER TABLE "plano_produto" ADD CONSTRAINT "plano_produto_plano_id_fkey"
      FOREIGN KEY ("plano_id") REFERENCES "plano"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plano_produto_produto_id_fkey') THEN
    ALTER TABLE "plano_produto" ADD CONSTRAINT "plano_produto_produto_id_fkey"
      FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
