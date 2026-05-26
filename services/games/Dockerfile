FROM oven/bun:1-alpine

WORKDIR /app

COPY . .
RUN bun install
RUN bun run --cwd services/games prisma:generate

WORKDIR /app/services/games

EXPOSE 4001

CMD ["bun", "run", "start:docker"]
