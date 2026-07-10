-- Perfil de acesso (menus/telas visiveis) + vinculo opcional no usuario.
-- Aditivo e idempotente: nao altera dados existentes.

CREATE TABLE IF NOT EXISTS "perfil" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "permissoes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "perfil_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "perfil_nome_key" ON "perfil"("nome");

ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "perfil_id" TEXT;

CREATE INDEX IF NOT EXISTS "usuario_perfil_id_idx" ON "usuario"("perfil_id");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuario_perfil_id_fkey') THEN
    ALTER TABLE "usuario" ADD CONSTRAINT "usuario_perfil_id_fkey"
      FOREIGN KEY ("perfil_id") REFERENCES "perfil"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
