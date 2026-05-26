export type GameDomainErrorCode =
  | "INVALID_BET_AMOUNT"
  | "INVALID_AUTO_CASHOUT_MULTIPLIER"
  | "ROUND_NOT_BETTING"
  | "ROUND_NOT_RUNNING"
  | "ROUND_ALREADY_STARTED"
  | "ROUND_ALREADY_CRASHED"
  | "DUPLICATE_BET"
  | "BET_NOT_FOUND"
  | "BET_NOT_ACCEPTED"
  | "BET_ALREADY_SETTLED"
  | "INVALID_ROUND_TRANSITION";

export class GameDomainError extends Error {
  constructor(readonly code: GameDomainErrorCode) {
    super(code);
    this.name = "GameDomainError";
  }
}
