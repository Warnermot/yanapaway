# syntax=docker/dockerfile:1

ARG NODE_VERSION=22-alpine
ARG PNPM_VERSION=11.6.0

# ---- base: node + pnpm ----
FROM node:${NODE_VERSION} AS base
ARG PNPM_VERSION
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# ---- deps: install dependencies (cached layer) ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- dev: local development server with hot reload ----
FROM deps AS dev
COPY . .
EXPOSE 4321
CMD ["pnpm", "astro", "dev", "--host", "0.0.0.0"]

# ---- build: compile the static site ----
FROM deps AS build
COPY . .
RUN pnpm astro build

# ---- prod: serve the static output with nginx ----
FROM nginx:1.27-alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
