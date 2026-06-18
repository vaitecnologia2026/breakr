-- Registro de acesso: último login do usuário (eventos detalhados ficam em audit_log).
ALTER TABLE "usuario" ADD COLUMN "ultimo_login_em" TIMESTAMP(3);
