import { describe, expect, test } from "bun:test";
import { formatMultiplier, makeMultiplierBps, parseMultiplierFromDecimal } from "../src";

describe("multiplier primitives", () => {
  test("parses multiplier decimals into basis points", () => {
    expect(parseMultiplierFromDecimal("1.00")).toBe(10000);
    expect(parseMultiplierFromDecimal("1.2345x")).toBe(12345);
    expect(parseMultiplierFromDecimal("2,5")).toBe(25000);
  });

  test("rejects multipliers below one x", () => {
    expect(() => makeMultiplierBps(9999)).toThrow("INVALID_MULTIPLIER_BPS");
    expect(() => parseMultiplierFromDecimal("0.99")).toThrow("INVALID_MULTIPLIER_BPS");
  });

  test("formats multiplier basis points for UI display", () => {
    expect(formatMultiplier(makeMultiplierBps(10000))).toBe("1.00x");
    expect(formatMultiplier(makeMultiplierBps(12345))).toBe("1.23x");
    expect(formatMultiplier(makeMultiplierBps(25000))).toBe("2.50x");
  });
});
