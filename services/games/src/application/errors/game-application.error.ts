export type GameApplicationErrorCode = "CURRENT_ROUND_NOT_FOUND" | "ROUND_NOT_FOUND";

export class GameApplicationError extends Error {
  constructor(readonly code: GameApplicationErrorCode) {
    super(code);
    this.name = "GameApplicationError";
  }
}
