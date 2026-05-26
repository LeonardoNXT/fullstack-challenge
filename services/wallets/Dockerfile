FROM oven/bun:1-alpine

WORKDIR /app

COPY . .
RUN bun install

WORKDIR /app/services/wallets

EXPOSE 4002

CMD ["bun", "run", "src/main.ts"]
