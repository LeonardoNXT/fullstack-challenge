import { describe, expect, test } from "bun:test";
import {
  encodeBase64Url,
  KeycloakJwtVerificationError,
  KeycloakJwtVerifier,
  type JwtClaims,
} from "../src";

const issuer = "http://localhost:8080/realms/crash-game";
const clientId = "crash-game-client";

describe("KeycloakJwtVerifier", () => {
  test("verifies an RS256 token and returns the authenticated player", async () => {
    const fixture = await createSignedToken({
      sub: "player-id",
      preferred_username: "player",
      iss: issuer,
      exp: futureExp(),
      azp: clientId,
    });
    const verifier = new KeycloakJwtVerifier({
      issuer,
      clientId,
      jwksUrl: "memory://jwks",
      fetchJson: async () => ({ keys: [fixture.publicJwk] }),
    });

    const player = await verifier.verify(fixture.token);

    expect(player.playerId).toBe("player-id");
    expect(player.username).toBe("player");
    expect(player.claims.azp).toBe(clientId);
  });

  test("accepts the configured client id in audience", async () => {
    const fixture = await createSignedToken({
      sub: "player-id",
      iss: issuer,
      exp: futureExp(),
      aud: [clientId],
    });
    const verifier = new KeycloakJwtVerifier({
      issuer,
      clientId,
      jwksUrl: "memory://jwks",
      fetchJson: async () => ({ keys: [fixture.publicJwk] }),
    });

    const player = await verifier.verify(fixture.token);

    expect(player.username).toBe("player-id");
  });

  test("rejects invalid issuer", async () => {
    const fixture = await createSignedToken({
      sub: "player-id",
      iss: "http://issuer.invalid",
      exp: futureExp(),
      azp: clientId,
    });
    const verifier = new KeycloakJwtVerifier({
      issuer,
      clientId,
      jwksUrl: "memory://jwks",
      fetchJson: async () => ({ keys: [fixture.publicJwk] }),
    });

    await expect(verifier.verify(fixture.token)).rejects.toThrow(
      new KeycloakJwtVerificationError("INVALID_JWT_ISSUER"),
    );
  });

  test("rejects invalid client", async () => {
    const fixture = await createSignedToken({
      sub: "player-id",
      iss: issuer,
      exp: futureExp(),
      azp: "other-client",
    });
    const verifier = new KeycloakJwtVerifier({
      issuer,
      clientId,
      jwksUrl: "memory://jwks",
      fetchJson: async () => ({ keys: [fixture.publicJwk] }),
    });

    await expect(verifier.verify(fixture.token)).rejects.toThrow(
      new KeycloakJwtVerificationError("INVALID_JWT_CLIENT"),
    );
  });

  test("rejects tampered signatures", async () => {
    const fixture = await createSignedToken({
      sub: "player-id",
      iss: issuer,
      exp: futureExp(),
      azp: clientId,
    });
    const verifier = new KeycloakJwtVerifier({
      issuer,
      clientId,
      jwksUrl: "memory://jwks",
      fetchJson: async () => ({ keys: [fixture.publicJwk] }),
    });
    const [header, , signature] = fixture.token.split(".");
    const tamperedPayload = encodeBase64Url(
      JSON.stringify({
        sub: "attacker",
        iss: issuer,
        exp: futureExp(),
        azp: clientId,
      }),
    );
    const tamperedToken = `${header}.${tamperedPayload}.${signature}`;

    await expect(verifier.verify(tamperedToken)).rejects.toThrow();
  });
});

async function createSignedToken(claims: JwtClaims): Promise<{
  readonly token: string;
  readonly publicJwk: JsonWebKey;
}> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const kid = "test-key";
  const header = { alg: "RS256", typ: "JWT", kid };
  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(claims));
  const signedData = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    keyPair.privateKey,
    signedData,
  );

  return {
    token: `${encodedHeader}.${encodedPayload}.${encodeBase64Url(
      new Uint8Array(signature),
    )}`,
    publicJwk: {
      ...publicJwk,
      kid,
      use: "sig",
      alg: "RS256",
    },
  };
}

function futureExp(): number {
  return Math.floor(Date.now() / 1000) + 3600;
}
