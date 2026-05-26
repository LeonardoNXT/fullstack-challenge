import type { PublicRound } from "@crash/contracts";
import { Round, ProvablyFairService } from "../../domain";
import type { Clock } from "../ports/clock";
import type { IdGenerator } from "../ports/id-generator";
import type { RoundRepository } from "../ports/round.repository";
import type { SeedGenerator } from "../ports/seed-generator";
import { toPublicRound } from "../dtos/game-round-view";

export interface OpenRoundInput {
  readonly bettingWindowMs: number;
  readonly clientSeed?: string;
  readonly houseEdgeBps?: number;
  readonly growthBpsPerSecond?: number;
}

export class OpenRoundUseCase {
  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly idGenerator: IdGenerator,
    private readonly seedGenerator: SeedGenerator,
    private readonly clock: Clock,
    private readonly provablyFairService: ProvablyFairService,
  ) {}

  async execute(input: OpenRoundInput): Promise<PublicRound> {
    const now = this.clock.now();
    const serverSeed = this.seedGenerator.nextServerSeed();
    const clientSeed = input.clientSeed ?? "crash-game";
    const nonce = now.getTime();
    const crashPointBps = this.provablyFairService.calculateCrashPoint({
      serverSeed,
      clientSeed,
      nonce,
      houseEdgeBps: input.houseEdgeBps,
    });
    const round = Round.open({
      roundId: this.idGenerator.nextRoundId(),
      serverSeed,
      serverSeedHash: this.provablyFairService.hashServerSeed(serverSeed),
      clientSeed,
      nonce,
      crashPointBps,
      bettingOpenedAt: now,
      bettingClosesAt: new Date(now.getTime() + input.bettingWindowMs),
      growthBpsPerSecond: input.growthBpsPerSecond,
    });

    await this.roundRepository.save(round);

    return toPublicRound(round, now);
  }
}
