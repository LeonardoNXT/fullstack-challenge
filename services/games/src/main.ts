import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true });
  app.use(createPlayerActionRateLimiter());

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("Crash Game - Games API")
      .setDescription("Round lifecycle, bets, cashout and provably fair verification.")
      .setVersion("1.0")
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup("docs", app, document);

  const port = process.env.PORT ?? "4001";
  await app.listen(port, "0.0.0.0");
  console.log(`Games service running on port ${port}`);
}

bootstrap();

interface RateLimitRequest {
  readonly method?: string;
  readonly path?: string;
  readonly originalUrl?: string;
  readonly ip?: string;
  readonly socket?: { readonly remoteAddress?: string };
}

interface RateLimitResponse {
  status(code: number): { json(body: unknown): void };
}

function createPlayerActionRateLimiter() {
  const hits = new Map<string, { count: number; resetAt: number }>();
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? "10000");
  const maxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? "20");

  return (request: RateLimitRequest, response: RateLimitResponse, next: () => void) => {
    const path = request.path ?? request.originalUrl ?? "";
    if (request.method !== "POST" || !["/bet", "/bet/cashout"].includes(path)) {
      next();
      return;
    }

    const now = Date.now();
    const key = `${request.ip ?? request.socket?.remoteAddress ?? "unknown"}:${path}`;
    const current = hits.get(key);
    if (current === undefined || current.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    current.count += 1;
    if (current.count > maxRequests) {
      response.status(429).json({
        code: "RATE_LIMITED",
        message: "Too many player actions. Try again shortly.",
      });
      return;
    }

    next();
  };
}
