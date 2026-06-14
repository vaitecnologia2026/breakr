# Breakr OS — Web (produção). Builda o SPA (Vite) e serve estático via nginx.
# VITE_API_URL é embutido NO BUILD (precisa apontar p/ a URL pública da API).
# Contexto de build = RAIZ do repo. Ex.:
#   docker build -f apps/web/Dockerfile --build-arg VITE_API_URL=https://api.exemplo .

FROM node:20-slim AS build
WORKDIR /app
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
COPY . .
RUN npm ci && npm run build --workspace @breakr/web

FROM nginx:alpine
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
