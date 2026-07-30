# syntax=docker/dockerfile:1
#
# Build context: repo root (see docker-compose.yml) — needs the shared
# workspace lockfile in apps/web/../.. to resolve pnpm workspace deps.

ARG NODE_VERSION=22-alpine
ARG PNPM_VERSION=11.17.0

# ---- base: node + pnpm ----
FROM node:${NODE_VERSION} AS base
ARG PNPM_VERSION
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# ---- deps: install only the web workspace's dependencies (cached layer) ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile --filter web...

# ---- dev: local development server with hot reload ----
FROM deps AS dev
COPY apps/web ./apps/web
WORKDIR /app/apps/web
EXPOSE 4321
# See apps/cms/Dockerfile: bypass pnpm's pre-run dependency check, which cannot
# verify a filtered install and would reinstall the workspace without a TTY.
CMD ["./node_modules/.bin/astro", "dev", "--host", "0.0.0.0"]

# ---- build: compile the site ----
FROM deps AS build
COPY apps/web ./apps/web
WORKDIR /app/apps/web
RUN pnpm astro build

# ---- deps-prod: runtime dependencies only, for the server image ----
FROM base AS deps-prod
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile --filter web... --prod

# ---- prod: run the SSR server produced by @astrojs/node ----
#
# This stage used to be `nginx` serving `dist/` as a static tree. That has not
# matched the app since astro.config.mjs moved to `output: 'server'`: the build
# emits `dist/client` + `dist/server/entry.mjs`, not a servable document root.
# Under nginx every SSR route (/instituciones, /recursos, /blog) and every
# /api/* endpoint returned 404 in production.
FROM base AS prod
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321
COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=deps-prod /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps-prod /app/apps/web/package.json ./apps/web/package.json
COPY --from=build /app/apps/web/dist ./apps/web/dist
WORKDIR /app/apps/web
EXPOSE 4321
CMD ["node", "dist/server/entry.mjs"]
