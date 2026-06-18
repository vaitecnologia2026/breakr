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
# CUTOVER para migrations versionadas (recomendado em produção): a migration de
# baseline já existe em prisma/migrations/0_init. Passos:
#   1) UMA VEZ, contra o banco do Railway: `npx prisma migrate resolve --applied 0_init`
#      (marca o schema atual como baseline, sem recriar tabelas).
#   2) Trocar o comando abaixo de `db push` para `prisma migrate deploy`.
# A partir daí, toda mudança de schema vira uma migration (npx prisma migrate dev).
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx ts-node prisma/seed.ts && node dist/main"]
