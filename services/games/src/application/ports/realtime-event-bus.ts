import type { RealtimeEvent } from "../events/realtime-events";

export interface RealtimeEventBus {
  publish(event: RealtimeEvent): void | Promise<void>;
}
