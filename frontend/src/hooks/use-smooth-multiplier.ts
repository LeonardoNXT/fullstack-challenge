import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/stores/game-store";

const DEFAULT_GROWTH_BPS_PER_SECOND = 1000;

export function useSmoothMultiplier(): number {
  const round = useGameStore((state) => state.liveRound);
  const [multiplier, setMultiplier] = useState(10000);
  const roundRef = useRef(round);
  roundRef.current = round;

  useEffect(() => {
    if (round === null || round.phase !== "running" || round.startedAt === undefined) {
      setMultiplier(round?.currentMultiplierBps ?? 10000);
      return;
    }

    // Set initial value
    setMultiplier(round.currentMultiplierBps);

    const serverTimeMs = new Date(round.serverTime).getTime();
    const clientTimeMs = Date.now();
    const timeOffset = serverTimeMs - clientTimeMs;
    const startedAtMs = new Date(round.startedAt).getTime();
    
    let active = true;

    const tick = () => {
      if (!active) {
        return;
      }

      const currentRound = roundRef.current;
      if (currentRound === null || currentRound.phase !== "running") {
        return;
      }

      const estimatedServerTime = Date.now() + timeOffset;
      const elapsedMs = Math.max(0, estimatedServerTime - startedAtMs);
      const currentBps = 10000 + Math.floor((elapsedMs * DEFAULT_GROWTH_BPS_PER_SECOND) / 1000);

      // Capped by crashPointBps if crashPointBps is revealed, otherwise keep growing
      const cappedBps = currentRound.crashPointBps !== undefined
        ? Math.min(currentBps, currentRound.crashPointBps)
        : currentBps;

      setMultiplier(cappedBps);
      requestAnimationFrame(tick);
    };

    const frameId = requestAnimationFrame(tick);

    return () => {
      active = false;
      cancelAnimationFrame(frameId);
    };
  }, [round?.phase, round?.startedAt, round?.roundId]);

  return multiplier;
}
