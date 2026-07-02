# ============================================================
# PREDIX — Dockerfile para Producción
# Sistema Estatal de Inteligencia para Seguridad Pública
# ============================================================

# Etapa 1: Construcción
FROM node:22-alpine AS builder

WORKDIR /app

# Habilitar pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY . .

# Compilar para producción
RUN pnpm build

# Etapa 2: Producción
FROM node:22-alpine AS production

WORKDIR /app

# Habilitar pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Instalar solo dependencias de producción
RUN pnpm install --frozen-lockfile --prod

# Copiar artefactos compilados (dist/ incluye dist/public, generado por vite build)
COPY --from=builder /app/dist ./dist

# Copiar migraciones de BD
COPY drizzle/ ./drizzle/
COPY drizzle.config.ts ./

# Variables de entorno
ENV NODE_ENV=production

# Puerto (configurable via variable de entorno)
EXPOSE 3000

# Comando de inicio
CMD ["node", "dist/index.js"]
