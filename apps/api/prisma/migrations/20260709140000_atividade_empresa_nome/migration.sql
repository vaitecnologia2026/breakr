-- AddColumn: nome da empresa (Cliente) vinculada à atividade (aditivo, nullable)
ALTER TABLE "atividade_comercial" ADD COLUMN IF NOT EXISTS "empresa_nome" TEXT;
