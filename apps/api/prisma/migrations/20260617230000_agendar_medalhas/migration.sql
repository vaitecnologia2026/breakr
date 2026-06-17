-- Vídeo 6: agendamento público com colaborador + medalhas (gamificação).

CREATE TABLE "agendamento_colaborador" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "assunto" TEXT,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "colaborador_id" TEXT NOT NULL,
    CONSTRAINT "agendamento_colaborador_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "agendamento_colaborador_colaborador_id_inicio_idx" ON "agendamento_colaborador"("colaborador_id", "inicio");

CREATE TABLE "medalha" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "icone" TEXT,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "medalha_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cliente_medalha" (
    "id" TEXT NOT NULL,
    "concedida_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "medalha_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    CONSTRAINT "cliente_medalha_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cliente_medalha_medalha_id_cliente_id_key" ON "cliente_medalha"("medalha_id", "cliente_id");
CREATE INDEX "cliente_medalha_cliente_id_idx" ON "cliente_medalha"("cliente_id");

-- AddForeignKey
ALTER TABLE "agendamento_colaborador" ADD CONSTRAINT "agendamento_colaborador_colaborador_id_fkey"
  FOREIGN KEY ("colaborador_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cliente_medalha" ADD CONSTRAINT "cliente_medalha_medalha_id_fkey"
  FOREIGN KEY ("medalha_id") REFERENCES "medalha"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cliente_medalha" ADD CONSTRAINT "cliente_medalha_cliente_id_fkey"
  FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
