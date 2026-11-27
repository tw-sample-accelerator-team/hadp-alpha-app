# syntax=docker/dockerfile:1
# Production image for Cloud Run: builds the SPA, then serves dist/ with unprivileged nginx
# on port 8080. Base images are pinned by digest; bump the tag and digest together.

ARG BUN_IMAGE=oven/bun:1.3.14-alpine@sha256:5acc90a93e91ff07bf72aa90a7c9f0fa189765aec90b47bdbf2152d2196383c0
ARG NODE_IMAGE=node:22.23.5-alpine@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a
ARG NGINX_IMAGE=nginxinc/nginx-unprivileged:1.31.7-alpine@sha256:b5047b9b76845eac124358373c6852377c52e4b05834a47647e955dd91cb8f1e

FROM ${BUN_IMAGE} AS bun

# Node 22 runs tsc and vite (see .nvmrc); bun installs the locked dependencies.
FROM ${NODE_IMAGE} AS build
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts
COPY . .
RUN bun run build

FROM ${NGINX_IMAGE}
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
# nginx-unprivileged already runs as uid 101; stated so the image never falls back to root.
USER 101
EXPOSE 8080
# The hello world page: the SPA's index.html at /.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["wget", "-q", "--spider", "http://127.0.0.1:8080/"]
STOPSIGNAL SIGQUIT
