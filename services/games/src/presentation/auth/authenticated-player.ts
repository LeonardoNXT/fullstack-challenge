import type { PlayerId } from "@crash/contracts";

export interface AuthenticatedPlayer {
  readonly playerId: PlayerId;
  readonly username: string;
}

export interface AuthenticatedRequest {
  readonly user: AuthenticatedPlayer;
  readonly headers: Record<string, string | string[] | undefined>;
}
