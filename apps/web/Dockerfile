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

# ---- build: compile the static site ----
FROM deps AS build
COPY apps/web ./apps/web
WORKDIR /app/apps/web
RUN pnpm astro build

# ---- prod: serve the static output with nginx ----
FROM nginx:1.27-alpine AS prod
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
