export function formatCents(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

export function formatMultiplier(bps: number | undefined): string {
  return `${((bps ?? 10000) / 10000).toFixed(2)}x`;
}

export function formatTimeLeft(targetIso: string | undefined, now = Date.now()): string {
  if (targetIso === undefined) {
    return "0.0s";
  }

  const remaining = Math.max(0, new Date(targetIso).getTime() - now);
  return `${(remaining / 1000).toFixed(1)}s`;
}

export function shortId(value: string | undefined): string {
  if (value === undefined || value.length <= 14) {
    return value ?? "-";
  }

  return `${value.slice(0, 7)}...${value.slice(-5)}`;
}
