import type { RealtimeEvent, RealtimeEventBus } from "../../application";

export class InMemoryRealtimeEventBus implements RealtimeEventBus {
  private readonly eventsValue: RealtimeEvent[] = [];

  publish(event: RealtimeEvent): void {
    this.eventsValue.push(event);
  }

  get events(): readonly RealtimeEvent[] {
    return [...this.eventsValue];
  }

  clear(): void {
    this.eventsValue.splice(0, this.eventsValue.length);
  }
}
