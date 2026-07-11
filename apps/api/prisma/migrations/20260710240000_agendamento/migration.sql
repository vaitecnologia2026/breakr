-- Calendario de Agendamento (menu Comercial). Tabela nova, idempotente.
CREATE TABLE IF NOT EXISTS "agendamento" (
  "id" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "inicio" TIMESTAMP(3) NOT NULL,
  "fim" TIMESTAMP(3) NOT NULL,
  "tipo" TEXT NOT NULL DEFAULT 'VIDEO',
  "com_cliente" BOOLEAN NOT NULL DEFAULT false,
  "local" TEXT,
  "observacao" TEXT,
  "cor" TEXT,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  "responsavel_id" TEXT NOT NULL,
  CONSTRAINT "agendamento_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "agendamento_responsavel_id_idx" ON "agendamento"("responsavel_id");
CREATE INDEX IF NOT EXISTS "agendamento_inicio_idx" ON "agendamento"("inicio");

-- FK -> usuario (guarda contra reaplicacao)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'agendamento_responsavel_id_fkey'
  ) THEN
    ALTER TABLE "agendamento"
      ADD CONSTRAINT "agendamento_responsavel_id_fkey"
      FOREIGN KEY ("responsavel_id") REFERENCES "usuario"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
