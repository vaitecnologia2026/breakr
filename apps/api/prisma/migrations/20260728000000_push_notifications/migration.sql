-- Migration idempotente (Push/FCM): tabela de tokens de push do app mobile.
-- Aplicável direto via psql no VPS (banco criado por db push) SEM quebrar dados
-- existentes. NUNCA usar migrate deploy/db push aqui.

-- Tabela de tokens de push (FCM). Um usuário pode ter vários dispositivos.
CREATE TABLE IF NOT EXISTS "push_token" (
  "id" TEXT NOT NULL,
  "usuario_id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "plataforma" TEXT NOT NULL DEFAULT 'android',
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "push_token_pkey" PRIMARY KEY ("id")
);

-- Token único (upsert por token).
CREATE UNIQUE INDEX IF NOT EXISTS "push_token_token_key" ON "push_token"("token");

-- Busca por usuário (envio de push).
CREATE INDEX IF NOT EXISTS "push_token_usuario_id_idx" ON "push_token"("usuario_id");

-- FK -> usuario (remove tokens ao excluir o usuário).
DO $$ BEGIN
  ALTER TABLE "push_token"
    ADD CONSTRAINT "push_token_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
