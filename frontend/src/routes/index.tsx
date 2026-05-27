import { createFileRoute } from "@tanstack/react-router";
import { GameDashboard } from "@/components/game/game-dashboard";

export const Route = createFileRoute("/")({
  component: GameDashboard,
});
