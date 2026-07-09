-- AddColumn: pessoa de contato da atividade comercial (aditivo, nullable)
ALTER TABLE "atividade_comercial" ADD COLUMN IF NOT EXISTS "contato" TEXT;
