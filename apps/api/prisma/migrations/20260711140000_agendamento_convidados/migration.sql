-- Coluna com os ids dos colaboradores convidados para a reuniao (alem do responsavel).
ALTER TABLE "agendamento" ADD COLUMN IF NOT EXISTS "convidados_ids" TEXT[] NOT NULL DEFAULT '{}';
