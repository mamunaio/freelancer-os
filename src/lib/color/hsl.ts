/**
 * HSL parsing and hex conversion helpers.
 *
 * The product stores brand color as an HSL string ("226 100% 65%") so it can
 * be slotted directly into Tailwind tokens. The settings UI prefers a hex
 * picker, so we round-trip between the two formats here.
 */

export interface Hsl {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

/** "226 100% 65%" → { h: 226, s: 100, l: 65 } */
export function parseHsl(value: string): Hsl | null {
  const match = value.trim().match(
    /^(\d{1,3}(?:\.\d+)?)\s+(\d{1,3}(?:\.\d+)?)%\s+(\d{1,3}(?:\.\d+)?)%$/,
  );
  if (!match) return null;
  return {
    h: clamp(parseFloat(match[1]), 0, 360),
    s: clamp(parseFloat(match[2]), 0, 100),
    l: clamp(parseFloat(match[3]), 0, 100),
  };
}

export function formatHsl(hsl: Hsl): string {
  return `${round(hsl.h)} ${round(hsl.s)}% ${round(hsl.l)}%`;
}

/** Derive a complementary glow color — shifts hue by 25°, keeps saturation/lightness. */
export function deriveGlow(hsl: Hsl): Hsl {
  return {
    h: (hsl.h + 25) % 360,
    s: hsl.s,
    l: hsl.l,
  };
}

export function hslToHex(hsl: Hsl): string {
  const { h, s, l } = hsl;
  const sNorm = s / 100;
  const lNorm = l / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToHsl(hex: string): Hsl | null {
  const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let raw = m[1];
  if (raw.length === 3) raw = raw.split("").map((c) => c + c).join("");

  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }

  return { h, s: s * 100, l: l * 100 };
}

/** Convenience: HSL string ↔ hex string. */
export function hexFromHslString(hsl: string): string | null {
  const parsed = parseHsl(hsl);
  return parsed ? hslToHex(parsed) : null;
}

export function hslStringFromHex(hex: string): string | null {
  const parsed = hexToHsl(hex);
  return parsed ? formatHsl(parsed) : null;
}

/** Eight curated presets — covers most studio brand vibes. */
export const ACCENT_PRESETS: { label: string; hsl: string }[] = [
  { label: "Electric Blue", hsl: "226 100% 65%" },
  { label: "Violet", hsl: "265 90% 65%" },
  { label: "Rose", hsl: "340 85% 62%" },
  { label: "Amber", hsl: "32 95% 58%" },
  { label: "Emerald", hsl: "152 70% 50%" },
  { label: "Cyan", hsl: "190 95% 55%" },
  { label: "Slate", hsl: "215 25% 55%" },
  { label: "Crimson", hsl: "0 80% 60%" },
];

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
function round(n: number): number {
  return Math.round(n);
}
