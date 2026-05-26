import { asPlayerId, type PlayerId } from "@crash/contracts";

export interface KeycloakJwtVerifierConfig {
  readonly issuer: string;
  readonly jwksUrl: string;
  readonly clientId: string;
  readonly clockToleranceSeconds?: number;
  readonly fetchJson?: (url: string) => Promise<unknown>;
}

export interface VerifiedPlayer {
  readonly playerId: PlayerId;
  readonly username: string;
  readonly claims: JwtClaims;
}

export interface JwtClaims {
  readonly sub: string;
  readonly iss: string;
  readonly exp: number;
  readonly aud?: string | readonly string[];
  readonly azp?: string;
  readonly preferred_username?: string;
  readonly [claim: string]: unknown;
}

interface JwtHeader {
  readonly alg: string;
  readonly kid?: string;
  readonly typ?: string;
}

interface Jwks {
  readonly keys: readonly JsonWebKey[];
}

export class KeycloakJwtVerificationError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "KeycloakJwtVerificationError";
  }
}

export class KeycloakJwtVerifier {
  private jwksCache: Jwks | null = null;

  constructor(private readonly config: KeycloakJwtVerifierConfig) {}

  async verify(token: string): Promise<VerifiedPlayer> {
    const { header, claims, signedData, signature } = this.decode(token);

    if (header.alg !== "RS256") {
      throw new KeycloakJwtVerificationError("UNSUPPORTED_JWT_ALGORITHM");
    }

    this.validateClaims(claims);

    const key = await this.findSigningKey(header.kid);
    const cryptoKey = await crypto.subtle.importKey(
      "jwk",
      key,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const isValid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      signature,
      signedData,
    );

    if (!isValid) {
      throw new KeycloakJwtVerificationError("INVALID_JWT_SIGNATURE");
    }

    return {
      playerId: asPlayerId(claims.sub),
      username:
        typeof claims.preferred_username === "string" &&
        claims.preferred_username.trim().length > 0
          ? claims.preferred_username
          : claims.sub,
      claims,
    };
  }

  private decode(token: string): {
    readonly header: JwtHeader;
    readonly claims: JwtClaims;
    readonly signedData: Uint8Array;
    readonly signature: Uint8Array;
  } {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new KeycloakJwtVerificationError("INVALID_JWT_FORMAT");
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = this.parseJson<JwtHeader>(encodedHeader, "INVALID_JWT_HEADER");
    const claims = this.parseJson<JwtClaims>(encodedPayload, "INVALID_JWT_PAYLOAD");

    return {
      header,
      claims,
      signedData: new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
      signature: decodeBase64Url(encodedSignature),
    };
  }

  private parseJson<TValue>(encoded: string, errorCode: string): TValue {
    try {
      return JSON.parse(new TextDecoder().decode(decodeBase64Url(encoded))) as TValue;
    } catch {
      throw new KeycloakJwtVerificationError(errorCode);
    }
  }

  private validateClaims(claims: JwtClaims): void {
    if (typeof claims.sub !== "string" || claims.sub.trim().length === 0) {
      throw new KeycloakJwtVerificationError("INVALID_JWT_SUBJECT");
    }

    if (claims.iss !== this.config.issuer) {
      throw new KeycloakJwtVerificationError("INVALID_JWT_ISSUER");
    }

    if (!this.isClientAccepted(claims)) {
      throw new KeycloakJwtVerificationError("INVALID_JWT_CLIENT");
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const tolerance = this.config.clockToleranceSeconds ?? 30;
    if (typeof claims.exp !== "number" || claims.exp + tolerance < nowSeconds) {
      throw new KeycloakJwtVerificationError("EXPIRED_JWT");
    }
  }

  private isClientAccepted(claims: JwtClaims): boolean {
    const audiences = Array.isArray(claims.aud)
      ? claims.aud
      : typeof claims.aud === "string"
        ? [claims.aud]
        : [];

    return audiences.includes(this.config.clientId) || claims.azp === this.config.clientId;
  }

  private async findSigningKey(kid: string | undefined): Promise<JsonWebKey> {
    const jwks = await this.getJwks();
    const key = jwks.keys.find((candidate) => {
      if (candidate.kty !== "RSA" || candidate.use !== "sig") {
        return false;
      }

      return kid === undefined || candidate.kid === kid;
    });

    if (key === undefined) {
      this.jwksCache = null;
      throw new KeycloakJwtVerificationError("JWT_SIGNING_KEY_NOT_FOUND");
    }

    return key;
  }

  private async getJwks(): Promise<Jwks> {
    if (this.jwksCache !== null) {
      return this.jwksCache;
    }

    const json = await (this.config.fetchJson ?? defaultFetchJson)(this.config.jwksUrl);
    if (!isJwks(json)) {
      throw new KeycloakJwtVerificationError("INVALID_JWKS");
    }

    this.jwksCache = json;
    return json;
  }
}

async function defaultFetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new KeycloakJwtVerificationError("JWKS_FETCH_FAILED");
  }

  return response.json();
}

function isJwks(value: unknown): value is Jwks {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { keys?: unknown }).keys)
  );
}

export function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return Uint8Array.from(Buffer.from(padded, "base64"));
}

export function encodeBase64Url(value: Uint8Array | string): string {
  const buffer =
    typeof value === "string" ? Buffer.from(value, "utf8") : Buffer.from(value);

  return buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
