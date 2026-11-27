# Production image for Cloud Run (listens on $PORT, 8080 there).

FROM oven/bun:1.3-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production --ignore-scripts

FROM oven/bun:1.3-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
COPY drizzle ./drizzle
USER bun
EXPOSE 8080
# The image also runs migrations: `bun scripts/migrate.ts` (the Cloud Run migrate job).
CMD ["bun", "src/main.ts"]
