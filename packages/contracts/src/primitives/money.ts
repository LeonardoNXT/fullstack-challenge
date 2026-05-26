import type { Brand } from "./brand";
import type { MultiplierBps } from "./multiplier";

export type Cents = Brand<number, "Cents">;

export const MIN_BET_AMOUNT_CENTS = 100 as Cents;
export const MAX_BET_AMOUNT_CENTS = 100000 as Cents;

export function makeCents(value: number): Cents {
  if (!Number.isSafeInteger(value)) {
    throw new Error("INVALID_CENTS");
  }

  return value as Cents;
}

export function assertPositiveCents(value: Cents): void {
  if (value <= 0) {
    throw new Error("CENTS_MUST_BE_POSITIVE");
  }
}

export function parseCentsFromDecimal(input: string): Cents {
  const normalized = input.trim().replace(",", ".");
  const match = /^([0-9]+)(?:\.([0-9]{1,2}))?$/.exec(normalized);

  if (match === null) {
    throw new Error("INVALID_DECIMAL_MONEY");
  }

  const units = Number(match[1]);
  const centsText = (match[2] ?? "").padEnd(2, "0");
  const cents = centsText.length === 0 ? 0 : Number(centsText);

  return makeCents(units * 100 + cents);
}

export function addCents(left: Cents, right: Cents): Cents {
  return makeCents(left + right);
}

export function subtractCents(left: Cents, right: Cents): Cents {
  return makeCents(left - right);
}

export function isValidBetAmount(amountCents: Cents): boolean {
  return amountCents >= MIN_BET_AMOUNT_CENTS && amountCents <= MAX_BET_AMOUNT_CENTS;
}

export function multiplyCentsByBps(amountCents: Cents, multiplierBps: MultiplierBps): Cents {
  const payout = (BigInt(amountCents) * BigInt(multiplierBps)) / 10000n;
  const asNumber = Number(payout);

  return makeCents(asNumber);
}

export function formatCents(amountCents: Cents): string {
  const sign = amountCents < 0 ? "-" : "";
  const absolute = Math.abs(amountCents);
  const units = Math.floor(absolute / 100);
  const cents = String(absolute % 100).padStart(2, "0");

  return `${sign}${units}.${cents}`;
}
