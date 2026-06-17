-- Contas a pagar (financeiro interno) — Vídeo 5.
CREATE TABLE "conta_pagar" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT,
    "valor" DECIMAL(12,2) NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "pago_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conta_pagar_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "conta_pagar_pago_idx" ON "conta_pagar"("pago");
