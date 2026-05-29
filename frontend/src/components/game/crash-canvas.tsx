import { useCallback, useEffect, useRef } from "react";
import { useSmoothMultiplier } from "@/hooks/use-smooth-multiplier";
import { useGameStore } from "@/stores/game-store";
import type { PublicRound } from "@/types/game";

/* ──────────────────────────── constants ──────────────────────────── */

const PADDING = { top: 40, right: 30, bottom: 44, left: 62 };

const COLORS = {
  bg: "#050705",

  gridLine: "rgba(255,255,255,0.06)",
  gridText: "rgba(255,255,255,0.36)",

  curveGlow: [
    "rgba(186,255,0,0.08)",
    "rgba(186,255,0,0.24)",
    "rgba(186,255,0,0.7)",
  ],

  curveCore: "#BAFF00",

  fillTop: "rgba(186,255,0,0.18)",
  fillBottom: "rgba(186,255,0,0.0)",

  dotGlow: "rgba(186,255,0,0.68)",
  dotCore: "#FFFFFF",

  crashGlow: [
    "rgba(255,255,255,0.04)",
    "rgba(255,255,255,0.10)",
    "rgba(255,255,255,0.22)",
  ],

  crashCore: "#D4D4D4",

  crashFillTop: "rgba(255,255,255,0.08)",
  crashFillBottom: "rgba(255,255,255,0.0)",

  bettingText: "rgba(255,255,255,0.72)",

  bettingAccent: "#BAFF00",

  multiplierShadow: "rgba(186,255,0,0.48)",
  crashedShadow: "rgba(255,255,255,0.18)",
};

const GLOW_WIDTHS = [18, 10, 4];
const CORE_WIDTH = 2.5;
const DOT_RADIUS = 6;
const DOT_GLOW_RADIUS = 18;

const GROWTH_BPS_PER_SECOND = 1000;

/* ──────────────────────────── types ──────────────────────────── */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

interface CanvasState {
  particles: Particle[];
  crashTriggered: boolean;
  lastCrashRoundId: string | null;
  animationId: number;
  bettingPulse: number;
}

/* ──────────────────────────── helpers ──────────────────────────── */

/** Nice-step intervals for axis labels. */
function niceStep(range: number, targetTicks: number): number {
  const rough = range / targetTicks;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const nice = [1, 2, 2.5, 5, 10];
  for (const n of nice) {
    if (n * pow >= rough) return n * pow;
  }
  return pow * 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/* ──────────────────────────── drawing functions ──────────────────────────── */

function drawGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  maxMultiplier: number,
  maxSeconds: number,
) {
  const plotW = w - PADDING.left - PADDING.right;
  const plotH = h - PADDING.top - PADDING.bottom;

  ctx.save();

  // --- horizontal grid lines (multiplier) ---
  const yStep = niceStep(maxMultiplier - 1, 5);
  ctx.font = "11px Oxanium, Inter, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  for (let m = 1; m <= maxMultiplier; m += yStep) {
    const ratio = Math.log(m) / Math.log(maxMultiplier);
    const y = PADDING.top + plotH * (1 - ratio);

    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.moveTo(PADDING.left, y);
    ctx.lineTo(w - PADDING.right, y);
    ctx.stroke();

    ctx.fillStyle = COLORS.gridText;
    ctx.setLineDash([]);
    ctx.fillText(`${m.toFixed(2)}x`, PADDING.left - 8, y);
  }

  // --- vertical grid lines (time) ---
  const xStep = niceStep(maxSeconds, 6);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  for (let t = 0; t <= maxSeconds; t += xStep) {
    const x = PADDING.left + (t / maxSeconds) * plotW;

    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.moveTo(x, PADDING.top);
    ctx.lineTo(x, h - PADDING.bottom);
    ctx.stroke();

    ctx.fillStyle = COLORS.gridText;
    ctx.setLineDash([]);
    ctx.fillText(`${t.toFixed(0)}s`, x, h - PADDING.bottom + 8);
  }

  // --- axes ---
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(PADDING.left, PADDING.top);
  ctx.lineTo(PADDING.left, h - PADDING.bottom);
  ctx.lineTo(w - PADDING.right, h - PADDING.bottom);
  ctx.stroke();

  ctx.restore();
}

function buildCurvePoints(
  w: number,
  h: number,
  maxMultiplier: number,
  maxSeconds: number,
  elapsedSeconds: number,
  currentMultiplier: number,
): Array<[number, number]> {
  const plotW = w - PADDING.left - PADDING.right;
  const plotH = h - PADDING.top - PADDING.bottom;
  const points: Array<[number, number]> = [];

  const steps = Math.max(60, Math.min(300, Math.floor(plotW / 2)));

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * elapsedSeconds;
    const m = 1 + (GROWTH_BPS_PER_SECOND / 10000) * t; // same formula as backend
    const cappedM = Math.min(m, currentMultiplier);

    const xRatio = t / maxSeconds;
    const yRatio =
      maxMultiplier > 1 ? Math.log(cappedM) / Math.log(maxMultiplier) : 0;

    const x = PADDING.left + xRatio * plotW;
    const y = PADDING.top + plotH * (1 - yRatio);

    points.push([x, y]);

    if (cappedM >= currentMultiplier) break;
  }

  return points;
}

function drawCurveFill(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  bottomY: number,
  crashed: boolean,
) {
  if (points.length < 2) return;

  ctx.save();

  const topColor = crashed ? COLORS.crashFillTop : COLORS.fillTop;
  const botColor = crashed ? COLORS.crashFillBottom : COLORS.fillBottom;

  const grad = ctx.createLinearGradient(0, PADDING.top, 0, bottomY);
  grad.addColorStop(0, topColor);
  grad.addColorStop(1, botColor);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(points[0][0], bottomY);
  for (const [x, y] of points) {
    ctx.lineTo(x, y);
  }
  ctx.lineTo(points[points.length - 1][0], bottomY);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawCurveGlow(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  crashed: boolean,
) {
  if (points.length < 2) return;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const glowColors = crashed ? COLORS.crashGlow : COLORS.curveGlow;

  // Glow passes (wide to narrow)
  GLOW_WIDTHS.forEach((width, index) => {
    ctx.lineWidth = width;
    ctx.strokeStyle = glowColors[index];
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.stroke();
  });

  // Core line
  ctx.lineWidth = CORE_WIDTH;
  ctx.strokeStyle = crashed ? COLORS.crashCore : COLORS.curveCore;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.stroke();

  // White-hot inner core
  ctx.lineWidth = 1;
  ctx.strokeStyle = `rgba(255,255,255,${crashed ? 0.3 : 0.45})`;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.stroke();

  ctx.restore();
}

function drawHeadDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  crashed: boolean,
) {
  if (crashed) return;

  ctx.save();

  const pulse = 0.5 + 0.5 * Math.sin(time * 4);
  const glowRadius = DOT_GLOW_RADIUS + pulse * 6;

  // Outer glow
  const grad = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
  grad.addColorStop(0, `rgba(186,255,0,${0.42 + pulse * 0.24})`);
  grad.addColorStop(0.5, "rgba(186,255,0,0.13)");
  grad.addColorStop(1, "rgba(186,255,0,0)");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  // Core dot
  ctx.fillStyle = COLORS.dotCore;
  ctx.shadowColor = COLORS.dotGlow;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function spawnParticles(x: number, y: number): Particle[] {
  const particles: Particle[] = [];
  const count = 40;

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = 1.5 + Math.random() * 4;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - Math.random() * 2,
      life: 1,
      maxLife: 0.6 + Math.random() * 0.8,
      size: 2 + Math.random() * 4,
      hue: 340 + Math.random() * 30, // red-pink range
    });
  }

  return particles;
}

function updateAndDrawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  dt: number,
): Particle[] {
  ctx.save();
  const alive: Particle[] = [];

  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12; // gravity
    p.vx *= 0.98; // drag
    p.life -= dt / p.maxLife;

    if (p.life <= 0) continue;
    alive.push(p);

    const alpha = clamp(p.life, 0, 1);
    const size = p.size * alpha;

    ctx.fillStyle = `hsla(${p.hue}, 85%, 65%, ${alpha})`;
    ctx.shadowColor = `hsla(${p.hue}, 85%, 65%, ${alpha * 0.5})`;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  return alive;
}

function drawMultiplierText(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  multiplier: number,
  crashed: boolean,
) {
  const centerX = w / 2;
  const centerY = (PADDING.top + h - PADDING.bottom) / 2;
  const text = `${(multiplier / 10000).toFixed(2)}x`;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Shadow glow
  ctx.shadowColor = crashed ? COLORS.crashedShadow : COLORS.multiplierShadow;
  ctx.shadowBlur = 30;
  ctx.fillStyle = crashed ? COLORS.crashCore : "#ffffff";
  ctx.font = "bold 64px Oxanium, Inter, sans-serif";
  ctx.fillText(text, centerX, centerY - 12);

  // Sub-label
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "13px Oxanium, Inter, sans-serif";
  ctx.fillText(
    crashed ? "Crash confirmado" : "Multiplicador ao vivo",
    centerX,
    centerY + 28,
  );

  ctx.restore();
}

function drawBettingPhase(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  round: PublicRound | null,
  pulse: number,
) {
  const centerX = w / 2;
  const centerY = (PADDING.top + h - PADDING.bottom) / 2;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Pulsing ring
  const ringRadius = 60 + pulse * 8;
  const ringAlpha = 0.08 + pulse * 0.06;
  ctx.strokeStyle = `rgba(186,255,0,${ringAlpha})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Second ring
  const ring2Radius = 80 + pulse * 12;
  ctx.strokeStyle = `rgba(186,255,0,${ringAlpha * 0.5})`;
  ctx.beginPath();
  ctx.arc(centerX, centerY, ring2Radius, 0, Math.PI * 2);
  ctx.stroke();

  // Countdown text
  if (round !== null) {
    const remaining = Math.max(
      0,
      new Date(round.bettingClosesAt).getTime() - Date.now(),
    );
    const seconds = (remaining / 1000).toFixed(1);

    ctx.shadowColor = COLORS.multiplierShadow;
    ctx.shadowBlur = 20;
    ctx.fillStyle = COLORS.bettingAccent;
    ctx.font = "bold 52px Oxanium, Inter, sans-serif";
    ctx.fillText(`${seconds}s`, centerX, centerY - 12);

    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.bettingText;
    ctx.font = "14px Oxanium, Inter, sans-serif";
    ctx.fillText("Apostas abertas", centerX, centerY + 28);
  }

  ctx.restore();
}

function drawWaitingState(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pulse: number,
) {
  const centerX = w / 2;
  const centerY = (PADDING.top + h - PADDING.bottom) / 2;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Breathing dots
  for (let i = 0; i < 3; i++) {
    const dotPulse = Math.sin(pulse * Math.PI * 2 + i * 1.2);
    const alpha = 0.3 + dotPulse * 0.3;
    const radius = 4 + dotPulse * 2;

    ctx.fillStyle = `rgba(186,255,0,${alpha})`;
    ctx.beginPath();
    ctx.arc(centerX - 20 + i * 20, centerY + 10, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = COLORS.bettingText;
  ctx.font = "14px Oxanium, Inter, sans-serif";
  ctx.fillText("Sincronizando...", centerX, centerY - 14);

  ctx.restore();
}

/* ──────────────────────────── component ──────────────────────────── */

export function CrashCanvas({ round }: { readonly round: PublicRound | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<CanvasState>({
    particles: [],
    crashTriggered: false,
    lastCrashRoundId: null,
    animationId: 0,
    bettingPulse: 0,
  });
  const multiplier = useSmoothMultiplier();
  const roundRef = useRef(round);
  roundRef.current = round;
  const multiplierRef = useRef(multiplier);
  multiplierRef.current = multiplier;

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;

    const ctx = canvas.getContext("2d");
    if (ctx === null) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width * dpr;
    const h = rect.height * dpr;

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cw = rect.width;
    const ch = rect.height;

    const now = performance.now() / 1000;
    const dt = 1 / 60;
    const currentRound = roundRef.current;
    const currentMultiplier = multiplierRef.current;
    const state = stateRef.current;
    const phase = currentRound?.phase ?? null;
    const crashed = phase === "crashed" || phase === "settled";

    // Clear
    ctx.clearRect(0, 0, cw, ch);

    // Background fill
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, cw, ch);

    // Subtle radial glow behind chart area
    const bgGrad = ctx.createRadialGradient(
      cw / 2,
      ch / 2,
      0,
      cw / 2,
      ch / 2,
      cw * 0.6,
    );
    bgGrad.addColorStop(0, crashed ? "rgba(255,98,98,0.06)" : "rgba(186,255,0,0.08)");
    bgGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, cw, ch);

    if (phase === "betting") {
      // Draw grid with default scale
      drawGrid(ctx, cw, ch, 3, 10);

      state.bettingPulse += dt;
      drawBettingPhase(
        ctx,
        cw,
        ch,
        currentRound,
        Math.sin(state.bettingPulse * 2) * 0.5 + 0.5,
      );

      // Reset crash state for next round
      state.crashTriggered = false;
    } else if (phase === "running" || crashed) {
      const multValue = currentMultiplier / 10000;

      // Compute elapsed seconds
      let elapsedSeconds = 0;
      if (currentRound?.startedAt !== undefined) {
        const serverTimeMs = new Date(currentRound.serverTime).getTime();
        const clientTimeMs = Date.now();
        const timeOffset = serverTimeMs - clientTimeMs;
        const startedAtMs = new Date(currentRound.startedAt).getTime();
        elapsedSeconds = Math.max(
          0,
          (Date.now() + timeOffset - startedAtMs) / 1000,
        );
      }

      // Dynamic scale with headroom
      const maxMultiplier = Math.max(2, multValue * 1.35);
      const maxSeconds = Math.max(5, elapsedSeconds * 1.25);

      drawGrid(ctx, cw, ch, maxMultiplier, maxSeconds);

      const points = buildCurvePoints(
        cw,
        ch,
        maxMultiplier,
        maxSeconds,
        elapsedSeconds,
        multValue,
      );

      if (points.length >= 2) {
        const bottomY = ch - PADDING.bottom;
        drawCurveFill(ctx, points, bottomY, crashed);
        drawCurveGlow(ctx, points, crashed);

        const head = points[points.length - 1];
        drawHeadDot(ctx, head[0], head[1], now, crashed);

        // Crash explosion
        if (
          crashed &&
          !state.crashTriggered &&
          state.lastCrashRoundId !== currentRound?.roundId
        ) {
          state.particles = spawnParticles(head[0], head[1]);
          state.crashTriggered = true;
          state.lastCrashRoundId = currentRound?.roundId ?? null;
        }
      }

      drawMultiplierText(ctx, cw, ch, currentMultiplier, crashed);

      // Particles
      if (state.particles.length > 0) {
        state.particles = updateAndDrawParticles(ctx, state.particles, dt);
      }

      state.bettingPulse = 0;
    } else {
      // No round or unknown phase
      drawGrid(ctx, cw, ch, 3, 10);
      state.bettingPulse += dt;
      drawWaitingState(ctx, cw, ch, state.bettingPulse);
    }

    state.animationId = requestAnimationFrame(render);
  }, []);

  useEffect(() => {
    const state = stateRef.current;
    state.animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(state.animationId);
    };
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      className="crash-canvas"
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        borderRadius: "inherit",
      }}
    />
  );
}
