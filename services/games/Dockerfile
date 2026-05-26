FROM oven/bun:1-alpine

WORKDIR /app

COPY . .
RUN bun install

WORKDIR /app/services/games

EXPOSE 4001

CMD ["bun", "run", "src/main.ts"]
