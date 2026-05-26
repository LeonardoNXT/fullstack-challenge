import { createHash, createHmac } from "node:crypto";
import { makeMultiplierBps, type MultiplierBps } from "@crash/contracts";

export const PROVABLY_FAIR_ALGORITHM = "hmac-sha256-52bit-v1";
export const DEFAULT_HOUSE_EDGE_BPS = 100;

export interface CrashPointInput {
  readonly serverSeed: string;
  readonly clientSeed: string;
  readonly nonce: number;
  readonly houseEdgeBps?: number;
}

export interface ProvablyFairRoundInput extends CrashPointInput {
  readonly serverSeedHash: string;
}

export interface ProvablyFairVerification {
  readonly algorithm: typeof PROVABLY_FAIR_ALGORITHM;
  readonly serverSeed: string;
  readonly serverSeedHash: string;
  readonly clientSeed: string;
  readonly nonce: number;
  readonly houseEdgeBps: number;
  readonly crashPointBps: MultiplierBps;
  readonly validSeedHash: boolean;
}

const TWO_POW_52 = 2n ** 52n;

export class ProvablyFairService {
  hashServerSeed(serverSeed: string): string {
    return createHash("sha256").update(serverSeed).digest("hex");
  }

  calculateCrashPoint(input: CrashPointInput): MultiplierBps {
    const houseEdgeBps = input.houseEdgeBps ?? DEFAULT_HOUSE_EDGE_BPS;
    const digest = createHmac("sha256", input.serverSeed)
      .update(`${input.clientSeed}:${input.nonce}`)
      .digest("hex");
    const h = BigInt(`0x${digest.slice(0, 13)}`);

    if (h >= TWO_POW_52) {
      return makeMultiplierBps(10000);
    }

    const edgeAdjusted = BigInt(10000 - houseEdgeBps);
    const numerator = edgeAdjusted * TWO_POW_52;
    const denominator = TWO_POW_52 - h;
    const crashPointBps = Number(numerator / denominator);

    return makeMultiplierBps(Math.max(10000, crashPointBps));
  }

  verify(input: ProvablyFairRoundInput): ProvablyFairVerification {
    const houseEdgeBps = input.houseEdgeBps ?? DEFAULT_HOUSE_EDGE_BPS;

    return {
      algorithm: PROVABLY_FAIR_ALGORITHM,
      serverSeed: input.serverSeed,
      serverSeedHash: input.serverSeedHash,
      clientSeed: input.clientSeed,
      nonce: input.nonce,
      houseEdgeBps,
      crashPointBps: this.calculateCrashPoint({ ...input, houseEdgeBps }),
      validSeedHash: this.hashServerSeed(input.serverSeed) === input.serverSeedHash,
    };
  }
}
