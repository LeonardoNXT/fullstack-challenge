import type { Brand } from "./brand";

export type MultiplierBps = Brand<number, "MultiplierBps">;

export const ONE_X_BPS = 10000 as MultiplierBps;

export function makeMultiplierBps(value: number): MultiplierBps {
  if (!Number.isSafeInteger(value) || value < ONE_X_BPS) {
    throw new Error("INVALID_MULTIPLIER_BPS");
  }

  return value as MultiplierBps;
}

export function parseMultiplierFromDecimal(input: string): MultiplierBps {
  const normalized = input.trim().replace(",", ".").replace(/x$/i, "");
  const match = /^([0-9]+)(?:\.([0-9]{1,4}))?$/.exec(normalized);

  if (match === null) {
    throw new Error("INVALID_DECIMAL_MULTIPLIER");
  }

  const units = Number(match[1]);
  const decimals = (match[2] ?? "").padEnd(4, "0");
  const bps = units * 10000 + (decimals.length === 0 ? 0 : Number(decimals));

  return makeMultiplierBps(bps);
}

export function formatMultiplier(multiplierBps: MultiplierBps): string {
  const units = Math.floor(multiplierBps / 10000);
  const decimals = Math.floor((multiplierBps % 10000) / 100);

  return `${units}.${String(decimals).padStart(2, "0")}x`;
}
