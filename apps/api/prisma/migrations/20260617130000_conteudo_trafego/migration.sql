-- Conteudo: roteamento de trafego pago.
-- Novo status LABORATORIO (laboratorio de criativos) + flag para_trafego.
-- O ADD VALUE nao e usado em nenhum statement desta migracao (seguro em PG12+).

ALTER TYPE "StatusConteudo" ADD VALUE 'LABORATORIO';

ALTER TABLE "conteudo" ADD COLUMN "para_trafego" BOOLEAN NOT NULL DEFAULT false;
