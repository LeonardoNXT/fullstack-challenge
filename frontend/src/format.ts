export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatMultiplier(multiplierBps: number): string {
  return `${(multiplierBps / 10000).toFixed(2)}x`;
}

export function shortHash(hash: string): string {
  return hash.length <= 18 ? hash : `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}
