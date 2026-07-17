import { clampChroma, converter, formatHex, parse } from "culori";
import type { RGBAColor, ShadeDirection, ShadeMode } from "./toolState";

const toHslConv = converter("hsl");
const toRgbConv = converter("rgb");
const toOklchConv = converter("oklch");

/** Fast HSV -> 0-255 RGB for per-pixel rendering loops. h in degrees, s/v in 0-1. */
export function hsvToRgb255(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) { r = c; g = x; }
  else if (hp < 2) { r = x; g = c; }
  else if (hp < 3) { g = c; b = x; }
  else if (hp < 4) { g = x; b = c; }
  else if (hp < 5) { r = x; b = c; }
  else { r = c; b = x; }
  const m = v - c;
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

export function hsvToRgba(h: number, s: number, v: number, alpha: number): RGBAColor {
  const [r, g, b] = hsvToRgb255(h, s, v);
  return [r, g, b, alpha];
}

/** h is undefined for greys (s=0) — callers keep their previous hue then. */
export function rgbaToHsv(c: RGBAColor): { h: number | undefined; s: number; v: number } {
  const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  if (d === 0) return { h: undefined, s, v: max };
  let h: number;
  if (max === r) h = 60 * (((g - b) / d) % 6);
  else if (max === g) h = 60 * ((b - r) / d + 2);
  else h = 60 * ((r - g) / d + 4);
  return { h: ((h % 360) + 360) % 360, s, v: max };
}

export function rgbaToHsl(c: RGBAColor): { h: number | undefined; s: number; l: number } {
  const out = toHslConv({ mode: "rgb", r: c[0] / 255, g: c[1] / 255, b: c[2] / 255 });
  return { h: out.h, s: out.s ?? 0, l: out.l };
}

export function hslToRgba(h: number, s: number, l: number, alpha: number): RGBAColor {
  const out = toRgbConv({ mode: "hsl", h, s, l });
  return [
    Math.round(Math.min(1, Math.max(0, out.r)) * 255),
    Math.round(Math.min(1, Math.max(0, out.g)) * 255),
    Math.round(Math.min(1, Math.max(0, out.b)) * 255),
    alpha,
  ];
}

// Shading works by blending toward an anchor color in OKLCH, like mixing in a
// bit of shadow/highlight paint: repeated passes converge on the anchor and
// never clip. "value" anchors are pure black/white; "temperature" anchors
// follow the painter's rule that shadows run cool and highlights run warm, so
// they sit at a blue-black and a warm off-white instead.
const SHADE_ANCHORS: Record<ShadeMode, Record<ShadeDirection, { l: number; c: number; h?: number }>> = {
  value: {
    darken: { l: 0, c: 0 },
    lighten: { l: 1, c: 0 },
  },
  temperature: {
    darken: { l: 0.13, c: 0.07, h: 264 },
    lighten: { l: 0.97, c: 0.05, h: 105 },
  },
};

export function shadeRgb255(
  rgb: [number, number, number],
  direction: ShadeDirection,
  mode: ShadeMode,
  amount: number,
): [number, number, number] {
  const src = toOklchConv({ mode: "rgb", r: rgb[0] / 255, g: rgb[1] / 255, b: rgb[2] / 255 });
  const anchor = SHADE_ANCHORS[mode][direction];
  const srcC = src.c ?? 0;
  const l = src.l + (anchor.l - src.l) * amount;
  const c = srcC + (anchor.c - srcC) * amount;
  let h = src.h;
  if (anchor.h !== undefined) {
    // Greys have no hue of their own, so they take the anchor's temperature
    // directly; chromatic colors rotate toward it along the shorter arc.
    if (h === undefined || srcC < 1e-4) h = anchor.h;
    else h += (((anchor.h - h + 540) % 360) - 180) * amount;
  }
  const out = toRgbConv(clampChroma({ mode: "oklch", l, c, h }, "oklch"));
  return [
    Math.round(Math.min(1, Math.max(0, out.r)) * 255),
    Math.round(Math.min(1, Math.max(0, out.g)) * 255),
    Math.round(Math.min(1, Math.max(0, out.b)) * 255),
  ];
}

export function rgbaToHex(c: RGBAColor): string {
  return formatHex({ mode: "rgb", r: c[0] / 255, g: c[1] / 255, b: c[2] / 255 });
}

/** Accepts "#rgb", "#rrggbb", bare hex without "#", and CSS color names. */
export function hexToRgba(text: string, alpha: number): RGBAColor | null {
  let t = text.trim();
  if (/^[0-9a-f]{3}$/i.test(t) || /^[0-9a-f]{6}$/i.test(t)) t = "#" + t;
  const parsed = parse(t);
  if (!parsed) return null;
  const out = toRgbConv(parsed);
  if (!out) return null;
  return [Math.round(out.r * 255), Math.round(out.g * 255), Math.round(out.b * 255), alpha];
}
