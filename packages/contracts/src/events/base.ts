import type { CorrelationId, EventId } from "../primitives/ids";

export type MessageVersion = 1;

export interface DomainMessage<TType extends string, TPayload> {
  readonly eventId: EventId;
  readonly correlationId: CorrelationId;
  readonly type: TType;
  readonly version: MessageVersion;
  readonly occurredAt: string;
  readonly payload: TPayload;
}
