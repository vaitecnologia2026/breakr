-- AddColumn: hora de término e notas da atividade comercial (aditivo, nullable)
ALTER TABLE "atividade_comercial" ADD COLUMN IF NOT EXISTS "hora_fim" TIMESTAMP(3);
ALTER TABLE "atividade_comercial" ADD COLUMN IF NOT EXISTS "notas" TEXT;
