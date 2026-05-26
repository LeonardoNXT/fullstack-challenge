import { describe, expect, test } from "bun:test";
import {
  DEFAULT_HOUSE_EDGE_BPS,
  PROVABLY_FAIR_ALGORITHM,
  ProvablyFairService,
} from "../../src/domain";

describe("ProvablyFairService", () => {
  test("hashes server seed deterministically", () => {
    const service = new ProvablyFairService();

    expect(service.hashServerSeed("server-seed-1")).toBe(
      "a562d93d4bf3b40f7d2ed81c4c43334cc714f2d7d11691a1bec023153998f2e2",
    );
  });

  test("calculates the same crash point for the same inputs", () => {
    const service = new ProvablyFairService();
    const input = {
      serverSeed: "server-seed-1",
      clientSeed: "public-client-seed",
      nonce: 1,
      houseEdgeBps: DEFAULT_HOUSE_EDGE_BPS,
    };

    expect(service.calculateCrashPoint(input)).toBe(service.calculateCrashPoint(input));
  });

  test("returns verification payload with seed hash validity", () => {
    const service = new ProvablyFairService();
    const serverSeed = "server-seed-1";
    const serverSeedHash = service.hashServerSeed(serverSeed);

    const verification = service.verify({
      serverSeed,
      serverSeedHash,
      clientSeed: "public-client-seed",
      nonce: 42,
      houseEdgeBps: 100,
    });

    expect(verification.algorithm).toBe(PROVABLY_FAIR_ALGORITHM);
    expect(verification.validSeedHash).toBe(true);
    expect(verification.crashPointBps).toBeGreaterThanOrEqual(10000);
  });

  test("detects invalid revealed server seed", () => {
    const service = new ProvablyFairService();

    const verification = service.verify({
      serverSeed: "revealed-seed",
      serverSeedHash: service.hashServerSeed("original-seed"),
      clientSeed: "public-client-seed",
      nonce: 42,
    });

    expect(verification.validSeedHash).toBe(false);
  });
});
