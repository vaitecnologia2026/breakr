-- Colunas para guardar o link do Google Meet e o id do evento no Google Agenda,
-- gerados ao criar um agendamento (integracao Google Agenda via Service Account).
ALTER TABLE "agendamento" ADD COLUMN IF NOT EXISTS "meet_link" TEXT;
ALTER TABLE "agendamento" ADD COLUMN IF NOT EXISTS "google_event_id" TEXT;
ALTER TABLE "agendamento" ADD COLUMN IF NOT EXISTS "google_html_link" TEXT;
