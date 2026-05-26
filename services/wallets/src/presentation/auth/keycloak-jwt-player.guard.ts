import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import {
  KeycloakJwtVerificationError,
  KeycloakJwtVerifier,
} from "@crash/auth";
import type { AuthenticatedPlayer } from "./authenticated-player";
import { KEYCLOAK_JWT_VERIFIER } from "../../wallets.providers";

interface RequestWithAuthHeader {
  readonly headers: Record<string, string | string[] | undefined>;
  user?: AuthenticatedPlayer;
}

@Injectable()
export class KeycloakJwtPlayerGuard implements CanActivate {
  constructor(
    @Inject(KEYCLOAK_JWT_VERIFIER)
    private readonly jwtVerifier: KeycloakJwtVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuthHeader>();
    const authorization = this.getHeader(request.headers, "authorization");

    if (authorization === undefined || !authorization.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }

    try {
      const token = authorization.slice("Bearer ".length).trim();
      const player = await this.jwtVerifier.verify(token);

      request.user = {
        playerId: player.playerId,
        username: player.username,
      };

      return true;
    } catch (error) {
      if (error instanceof KeycloakJwtVerificationError) {
        throw new UnauthorizedException({
          code: error.code,
          message: "Invalid bearer token",
        });
      }

      throw error;
    }
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
}
