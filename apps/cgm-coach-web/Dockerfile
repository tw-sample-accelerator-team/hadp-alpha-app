# syntax=docker/dockerfile:1
# Hardened image for Cloud Run: the app is built in a throwaway stage and only the
# static files ship, served by unprivileged nginx on port 8080 with a health check
# on the hello world page.
FROM oven/bun:1.3-alpine AS build
WORKDIR /app
COPY package.json ./
RUN bun install
COPY . .
RUN bun run build

FROM nginxinc/nginx-unprivileged:1.27-alpine

# Files stay owned by root and read-only to the nginx runtime user.
USER root
COPY --from=build --chown=root:root /app/dist /usr/share/nginx/html
RUN chmod -R a-w,a+rX /usr/share/nginx/html

# nginx-unprivileged runs as uid 101 and listens on 8080 by default.
USER 101

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["wget", "-q", "--spider", "http://127.0.0.1:8080/"]

STOPSIGNAL SIGQUIT

CMD ["nginx", "-g", "daemon off;"]
