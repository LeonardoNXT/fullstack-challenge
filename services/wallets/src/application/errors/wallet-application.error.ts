export type WalletApplicationErrorCode = "WALLET_NOT_FOUND";

export class WalletApplicationError extends Error {
  constructor(readonly code: WalletApplicationErrorCode) {
    super(code);
    this.name = "WalletApplicationError";
  }
}
