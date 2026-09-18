FROM node:22.14.0-alpine AS base

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.5 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc .node-version ./
COPY apps/web/package.json apps/web/package.json
COPY packages packages
RUN pnpm install --frozen-lockfile

COPY . .

FROM base AS build
RUN pnpm build:vite

FROM base AS ci
RUN pnpm build:vite
RUN pnpm build:webpack

FROM nginx:1.27.3-alpine AS runtime
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist-vite /usr/share/nginx/html
EXPOSE 80
