import {
  addCents,
  assertPositiveCents,
  makeCents,
  subtractCents,
  type Cents,
  type OperationId,
  type PlayerId,
} from "@crash/contracts";
import { WalletDomainError } from "../errors/wallet-domain.error";

export type LedgerEntryType = "credit" | "debit";

export interface LedgerEntry {
  readonly operationId: OperationId;
  readonly type: LedgerEntryType;
  readonly amountCents: Cents;
  readonly balanceAfterCents: Cents;
  readonly occurredAt: Date;
  readonly reason: string;
}

export interface WalletSnapshot {
  readonly playerId: PlayerId;
  readonly balanceCents: Cents;
  readonly ledgerEntries: readonly LedgerEntry[];
}

export interface WalletMutationResult {
  readonly applied: boolean;
  readonly wallet: Wallet;
  readonly ledgerEntry?: LedgerEntry;
}

export class Wallet {
  private constructor(
    readonly playerId: PlayerId,
    private balanceCentsValue: Cents,
    private readonly ledgerEntriesValue: LedgerEntry[],
  ) {}

  static create(playerId: PlayerId, initialBalanceCents = makeCents(0)): Wallet {
    if (initialBalanceCents < 0) {
      throw new WalletDomainError("INVALID_INITIAL_BALANCE");
    }

    return new Wallet(playerId, initialBalanceCents, []);
  }

  static rehydrate(snapshot: WalletSnapshot): Wallet {
    return new Wallet(snapshot.playerId, snapshot.balanceCents, [...snapshot.ledgerEntries]);
  }

  get balanceCents(): Cents {
    return this.balanceCentsValue;
  }

  get ledgerEntries(): readonly LedgerEntry[] {
    return [...this.ledgerEntriesValue];
  }

  credit(
    operationId: OperationId,
    amountCents: Cents,
    reason: string,
    occurredAt = new Date(),
  ): WalletMutationResult {
    this.assertLedgerAmount(amountCents);

    const existingEntry = this.findLedgerEntry(operationId);
    if (existingEntry !== undefined) {
      return { applied: false, wallet: this, ledgerEntry: existingEntry };
    }

    const nextBalanceCents = addCents(this.balanceCentsValue, amountCents);
    const entry = this.createLedgerEntry(
      operationId,
      "credit",
      amountCents,
      nextBalanceCents,
      reason,
      occurredAt,
    );

    this.balanceCentsValue = nextBalanceCents;
    this.ledgerEntriesValue.push(entry);

    return { applied: true, wallet: this, ledgerEntry: entry };
  }

  debit(
    operationId: OperationId,
    amountCents: Cents,
    reason: string,
    occurredAt = new Date(),
  ): WalletMutationResult {
    this.assertLedgerAmount(amountCents);

    const existingEntry = this.findLedgerEntry(operationId);
    if (existingEntry !== undefined) {
      return { applied: false, wallet: this, ledgerEntry: existingEntry };
    }

    if (this.balanceCentsValue < amountCents) {
      throw new WalletDomainError("INSUFFICIENT_BALANCE");
    }

    const nextBalanceCents = subtractCents(this.balanceCentsValue, amountCents);
    const entry = this.createLedgerEntry(
      operationId,
      "debit",
      amountCents,
      nextBalanceCents,
      reason,
      occurredAt,
    );

    this.balanceCentsValue = nextBalanceCents;
    this.ledgerEntriesValue.push(entry);

    return { applied: true, wallet: this, ledgerEntry: entry };
  }

  toSnapshot(): WalletSnapshot {
    return {
      playerId: this.playerId,
      balanceCents: this.balanceCentsValue,
      ledgerEntries: this.ledgerEntries,
    };
  }

  private assertLedgerAmount(amountCents: Cents): void {
    try {
      assertPositiveCents(amountCents);
    } catch {
      throw new WalletDomainError("INVALID_LEDGER_AMOUNT");
    }
  }

  private findLedgerEntry(operationId: OperationId): LedgerEntry | undefined {
    return this.ledgerEntriesValue.find((entry) => entry.operationId === operationId);
  }

  private createLedgerEntry(
    operationId: OperationId,
    type: LedgerEntryType,
    amountCents: Cents,
    balanceAfterCents: Cents,
    reason: string,
    occurredAt: Date,
  ): LedgerEntry {
    return {
      operationId,
      type,
      amountCents,
      balanceAfterCents,
      occurredAt,
      reason,
    };
  }
}
