# Breakr OS — API (produção). Builda o monorepo (shared + api) e roda o compilado.
# OBS: node:20-slim (glibc) p/ evitar dor de cabeça com bcrypt/prisma no alpine.
# Contexto de build = RAIZ do repo (breakr-os/). Ex.: docker build -f apps/api/Dockerfile .

FROM node:20-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY . .
RUN npm ci \
  && npm run build --workspace @breakr/shared \
  && npx prisma generate --schema apps/api/prisma/schema.prisma \
  && npm run build --workspace @breakr/api

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app ./
WORKDIR /app/apps/api
EXPOSE 3000
# Sincroniza o schema (db push, sem --accept-data-loss: recusa mudança destrutiva
# em vez de apagar dados), garante o admin (seed idempotente) e sobe a API.
# MIGRAR PARA `prisma migrate deploy` requer: 1) migration de baseline (init) com o
# schema completo e 2) baselinar o banco existente com
# `prisma migrate resolve --applied <init>`. Até lá, db push é o caminho seguro.
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx ts-node prisma/seed.ts && node dist/main"]
