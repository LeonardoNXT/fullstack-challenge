import { randomBytes } from "node:crypto";
import type { SeedGenerator } from "../../application";

export class CryptoSeedGenerator implements SeedGenerator {
  private deterministicNonce = 0;

  nextServerSeed(): string {
    const prefix = process.env.GAME_DETERMINISTIC_SEED_PREFIX;
    if (prefix !== undefined && prefix.trim().length > 0) {
      this.deterministicNonce += 1;
      return `${prefix}:${this.deterministicNonce}`;
    }

    return randomBytes(32).toString("hex");
  }
}
