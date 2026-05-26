import type { Brand } from "./brand";

export type UUID = Brand<string, "UUID">;
export type PlayerId = Brand<string, "PlayerId">;
export type RoundId = Brand<string, "RoundId">;
export type BetId = Brand<string, "BetId">;
export type EventId = Brand<string, "EventId">;
export type CorrelationId = Brand<string, "CorrelationId">;

export function asUUID(value: string): UUID {
  if (!isUUID(value)) {
    throw new Error("INVALID_UUID");
  }

  return value as UUID;
}

export function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function asPlayerId(value: string): PlayerId {
  if (value.trim().length === 0) {
    throw new Error("INVALID_PLAYER_ID");
  }

  return value as PlayerId;
}
