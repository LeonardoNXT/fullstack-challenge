import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { asPlayerId } from "@crash/contracts";
import type { AuthenticatedPlayer } from "./authenticated-player";

interface JwtPayload {
  readonly sub?: unknown;
  readonly preferred_username?: unknown;
}

interface RequestWithAuthHeader {
  readonly headers: Record<string, string | string[] | undefined>;
  user?: AuthenticatedPlayer;
}

@Injectable()
export class BearerTokenPlayerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithAuthHeader>();
    const authorization = this.getHeader(request.headers, "authorization");

    if (authorization === undefined || !authorization.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }

    const token = authorization.slice("Bearer ".length).trim();
    const payload = this.decodeJwtPayload(token);

    if (typeof payload.sub !== "string" || payload.sub.trim().length === 0) {
      throw new UnauthorizedException("Invalid bearer token subject");
    }

    request.user = {
      playerId: asPlayerId(payload.sub),
      username:
        typeof payload.preferred_username === "string" &&
        payload.preferred_username.trim().length > 0
          ? payload.preferred_username
          : payload.sub,
    };

    return true;
  }

  private getHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string,
  ): string | undefined {
    const value = headers[name] ?? headers[name.toLowerCase()];
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }

  private decodeJwtPayload(token: string): JwtPayload {
    const parts = token.split(".");
    if (parts.length < 2) {
      throw new UnauthorizedException("Invalid bearer token format");
    }

    try {
      const payloadJson = Buffer.from(this.toBase64(parts[1]), "base64").toString("utf8");
      const parsed = JSON.parse(payloadJson) as unknown;

      if (this.isJwtPayload(parsed)) {
        return parsed;
      }
    } catch {
      throw new UnauthorizedException("Invalid bearer token payload");
    }

    throw new UnauthorizedException("Invalid bearer token payload");
  }

  private toBase64(base64Url: string): string {
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    return base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  }

  private isJwtPayload(value: unknown): value is JwtPayload {
    return typeof value === "object" && value !== null;
  }
}
