import { randomBytes } from "node:crypto";
import type { SeedGenerator } from "../../application";

export class CryptoSeedGenerator implements SeedGenerator {
  nextServerSeed(): string {
    return randomBytes(32).toString("hex");
  }
}
