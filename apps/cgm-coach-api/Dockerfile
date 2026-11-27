# syntax=docker/dockerfile:1
# Hardened image for Cloud Run: pinned Alpine base, root-owned read-only app files,
# non-root runtime user, port 8080 and a health check on the hello world route.
FROM oven/bun:1.3-alpine

ENV NODE_ENV=production \
    PORT=8080

WORKDIR /app

# The service has no runtime dependencies, so only the source is copied. Files stay
# owned by root so the runtime user cannot change them.
COPY --chown=root:root --chmod=0444 package.json tsconfig.json ./
COPY --chown=root:root src ./src
RUN chmod -R a-w,a+rX /app

USER bun

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["bun", "-e", "const r = await fetch(`http://127.0.0.1:${process.env.PORT}/hello`); process.exit(r.ok ? 0 : 1)"]

STOPSIGNAL SIGTERM

CMD ["bun", "run", "src/main.ts"]
