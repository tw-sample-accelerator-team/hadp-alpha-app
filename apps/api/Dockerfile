# syntax=docker/dockerfile:1
# Production image for Cloud Run: listens on $PORT (8080), runs as the unprivileged bun user.
# Base images are pinned by digest; bump the tag and digest together.

ARG BUN_IMAGE=oven/bun:1.3.14-alpine@sha256:5acc90a93e91ff07bf72aa90a7c9f0fa189765aec90b47bdbf2152d2196383c0

FROM ${BUN_IMAGE} AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production --ignore-scripts \
 && rm -rf /root/.bun/install/cache

FROM ${BUN_IMAGE}
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080
# Files stay owned by root and read-only to the bun user that runs the app.
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
COPY drizzle ./drizzle
USER bun
EXPOSE 8080
# The hello world route: 200 when the service and its database answer, 503 otherwise.
# Cloud Run ignores HEALTHCHECK and uses the startup probe in infra/src/service.ts instead.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["bun", "-e", "const r = await fetch(`http://127.0.0.1:${process.env.PORT}/health`); process.exit(r.ok ? 0 : 1)"]
STOPSIGNAL SIGTERM
# The image also runs migrations: `bun scripts/migrate.ts` (the Cloud Run migrate job).
CMD ["bun", "src/main.ts"]
