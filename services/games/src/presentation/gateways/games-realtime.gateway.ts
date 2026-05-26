import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import type { Server } from "socket.io";
import type { RealtimeEvent, RealtimeEventBus } from "../../application";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class GamesRealtimeGateway implements RealtimeEventBus {
  @WebSocketServer()
  private server: Server | undefined;

  publish(event: RealtimeEvent): void {
    this.server?.emit(event.type, event.payload);
  }
}
