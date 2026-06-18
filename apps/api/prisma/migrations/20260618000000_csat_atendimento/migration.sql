-- CSAT do atendimento: nota do cliente após a resolução da conversa.
ALTER TABLE "conversa" ADD COLUMN "csat_nota" INTEGER;
ALTER TABLE "conversa" ADD COLUMN "csat_comentario" TEXT;
ALTER TABLE "conversa" ADD COLUMN "csat_respondido_em" TIMESTAMP(3);
