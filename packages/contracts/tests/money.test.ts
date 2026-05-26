import { describe, expect, test } from "bun:test";
import {
  formatCents,
  isValidBetAmount,
  makeCents,
  multiplyCentsByBps,
  parseCentsFromDecimal,
} from "../src";
import { makeMultiplierBps } from "../src/primitives/multiplier";

describe("money primitives", () => {
  test("parses decimal strings into integer cents", () => {
    expect(parseCentsFromDecimal("1")).toBe(100);
    expect(parseCentsFromDecimal("1.2")).toBe(120);
    expect(parseCentsFromDecimal("1.23")).toBe(123);
    expect(parseCentsFromDecimal("1000,00")).toBe(100000);
  });

  test("rejects unsafe or imprecise money input", () => {
    expect(() => parseCentsFromDecimal("1.234")).toThrow("INVALID_DECIMAL_MONEY");
    expect(() => parseCentsFromDecimal("-1.00")).toThrow("INVALID_DECIMAL_MONEY");
    expect(() => makeCents(10.5)).toThrow("INVALID_CENTS");
  });

  test("validates challenge bet boundaries", () => {
    expect(isValidBetAmount(makeCents(99))).toBe(false);
    expect(isValidBetAmount(makeCents(100))).toBe(true);
    expect(isValidBetAmount(makeCents(100000))).toBe(true);
    expect(isValidBetAmount(makeCents(100001))).toBe(false);
  });

  test("multiplies payouts using integer basis points", () => {
    expect(multiplyCentsByBps(makeCents(123), makeMultiplierBps(15000))).toBe(184);
    expect(multiplyCentsByBps(makeCents(1000), makeMultiplierBps(25000))).toBe(2500);
  });

  test("formats cents for display boundaries", () => {
    expect(formatCents(makeCents(0))).toBe("0.00");
    expect(formatCents(makeCents(123456))).toBe("1234.56");
    expect(formatCents(makeCents(-42))).toBe("-0.42");
  });
});
