export type WalletDomainErrorCode =
  | "INVALID_INITIAL_BALANCE"
  | "INVALID_LEDGER_AMOUNT"
  | "INSUFFICIENT_BALANCE";

export class WalletDomainError extends Error {
  constructor(readonly code: WalletDomainErrorCode) {
    super(code);
    this.name = "WalletDomainError";
  }
}
