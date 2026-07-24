# syntax=docker/dockerfile:1
#
# Build context: repo root (see docker-compose.yml) — needs the shared
# workspace lockfile to resolve pnpm workspace deps.

ARG NODE_VERSION=22-alpine
ARG PNPM_VERSION=11.17.0

# ---- base: node + pnpm + native build deps (better-sqlite3, sharp) ----
FROM node:${NODE_VERSION} AS base
ARG PNPM_VERSION
WORKDIR /app
RUN apk add --no-cache python3 make g++ vips-dev \
    && corepack enable \
    && corepack prepare pnpm@${PNPM_VERSION} --activate

# ---- deps: install only the cms workspace's dependencies (cached layer) ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/cms/package.json ./apps/cms/package.json
RUN pnpm install --frozen-lockfile --filter cms...

# ---- dev: local development server with hot reload ----
FROM deps AS dev
COPY apps/cms ./apps/cms
WORKDIR /app/apps/cms
EXPOSE 1337
CMD ["pnpm", "strapi", "develop"]

# ---- build: compile the admin panel and server ----
FROM deps AS build
COPY apps/cms ./apps/cms
WORKDIR /app/apps/cms
RUN pnpm strapi build

# ---- prod: run the compiled Strapi server ----
FROM base AS prod
ENV NODE_ENV=production
COPY --from=build /app/apps/cms /app/apps/cms
WORKDIR /app/apps/cms
RUN pnpm install --prod --frozen-lockfile --filter cms... --ignore-scripts=false
EXPOSE 1337
CMD ["pnpm", "strapi", "start"]
