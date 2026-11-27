FROM oven/bun:1.3-alpine
WORKDIR /app
COPY package.json tsconfig.json ./
COPY src ./src
USER bun
ENV PORT=8080
EXPOSE 8080
CMD ["bun", "run", "src/main.ts"]
