-- Agenda interna: feriados, sala presencial e home office (Vídeo 6).

CREATE TABLE "feriado" (
    "id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "titulo" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "feriado_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agendamento_sala" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responsavel_id" TEXT,
    CONSTRAINT "agendamento_sala_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "agendamento_sala_inicio_idx" ON "agendamento_sala"("inicio");

CREATE TABLE "home_office" (
    "id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_id" TEXT NOT NULL,
    CONSTRAINT "home_office_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "home_office_usuario_id_data_key" ON "home_office"("usuario_id", "data");
CREATE INDEX "home_office_data_idx" ON "home_office"("data");

-- AddForeignKey
ALTER TABLE "agendamento_sala" ADD CONSTRAINT "agendamento_sala_responsavel_id_fkey"
  FOREIGN KEY ("responsavel_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "home_office" ADD CONSTRAINT "home_office_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
