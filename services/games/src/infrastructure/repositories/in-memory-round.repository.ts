import type { PlayerId, RoundId } from "@crash/contracts";
import type { RoundRepository } from "../../application";
import { Round, type BetSnapshot, type RoundSnapshot } from "../../domain";

export class InMemoryRoundRepository implements RoundRepository {
  private readonly roundsById = new Map<RoundId, RoundSnapshot>();
  private readonly insertionOrder: RoundId[] = [];

  async findCurrent(): Promise<Round | null> {
    for (let index = this.insertionOrder.length - 1; index >= 0; index -= 1) {
      const snapshot = this.roundsById.get(this.insertionOrder[index]);
      if (
        snapshot !== undefined &&
        (snapshot.phase === "betting" || snapshot.phase === "running" || snapshot.phase === "crashed")
      ) {
        return Round.rehydrate(snapshot);
      }
    }

    return null;
  }

  async findById(roundId: RoundId): Promise<Round | null> {
    const snapshot = this.roundsById.get(roundId);
    return snapshot === undefined ? null : Round.rehydrate(snapshot);
  }

  async findRecentSettled(limit: number): Promise<readonly Round[]> {
    return this.insertionOrder
      .map((roundId) => this.roundsById.get(roundId))
      .filter((snapshot): snapshot is RoundSnapshot => snapshot?.phase === "settled")
      .slice(-limit)
      .reverse()
      .map((snapshot) => Round.rehydrate(snapshot));
  }

  async findBetsByPlayerId(
    playerId: PlayerId,
    limit: number,
  ): Promise<readonly BetSnapshot[]> {
    return this.insertionOrder
      .map((roundId) => this.roundsById.get(roundId))
      .filter((snapshot): snapshot is RoundSnapshot => snapshot !== undefined)
      .flatMap((snapshot) => snapshot.bets)
      .filter((bet) => bet.playerId === playerId)
      .slice(-limit)
      .reverse();
  }

  async save(round: Round): Promise<void> {
    if (!this.roundsById.has(round.roundId)) {
      this.insertionOrder.push(round.roundId);
    }

    this.roundsById.set(round.roundId, round.toSnapshot());
  }

  clear(): void {
    this.roundsById.clear();
    this.insertionOrder.splice(0, this.insertionOrder.length);
  }
}
