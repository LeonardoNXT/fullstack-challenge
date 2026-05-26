FROM oven/bun:1-alpine

WORKDIR /app

COPY . .
RUN bun install
RUN bun run --cwd services/wallets prisma:generate

WORKDIR /app/services/wallets

EXPOSE 4002

CMD ["bun", "run", "start:docker"]
