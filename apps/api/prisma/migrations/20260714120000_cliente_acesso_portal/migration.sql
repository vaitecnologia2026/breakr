-- Acesso do cliente ao portal (tela "Usuarios"): usuario + senha (hash) por empresa.
-- Quando definidos, o portal (/portal/:codigo) passa a exigir login; nulos = portal
-- publico por link (comportamento historico, compatibilidade). Aditivo e reversivel.
ALTER TABLE "cliente" ADD COLUMN "portal_usuario" TEXT;
ALTER TABLE "cliente" ADD COLUMN "portal_senha_hash" TEXT;
CREATE UNIQUE INDEX "cliente_portal_usuario_key" ON "cliente"("portal_usuario");
