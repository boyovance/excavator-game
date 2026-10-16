/** Lighten (amount > 0) or darken (amount < 0) a "#rrggbb" colour by mixing it with white or black. */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(mix);
  return `#${channels.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`;
}
