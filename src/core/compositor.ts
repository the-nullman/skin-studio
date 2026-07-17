import { W, H } from "./skinLayout";
import type { BlendMode, Layer, RGBA } from "./document";

const scratch: RGBA = new Uint8ClampedArray(W * H * 4);

type BlendFn = (b: number, s: number) => number; // backdrop, source in 0-1

// Photoshop's separable blend functions (identical math to pixi's
// advanced-blend-modes / CSS mix-blend-mode). "normal" is null so the hot
// path skips the blend step entirely.
const BLEND_FNS: Record<BlendMode, BlendFn | null> = {
  normal: null,
  multiply: (b, s) => b * s,
  screen: (b, s) => b + s - b * s,
  overlay: (b, s) => (b <= 0.5 ? 2 * b * s : 1 - 2 * (1 - b) * (1 - s)),
  darken: (b, s) => Math.min(b, s),
  lighten: (b, s) => Math.max(b, s),
  "color-dodge": (b, s) => (b === 0 ? 0 : s === 1 ? 1 : Math.min(1, b / (1 - s))),
  "color-burn": (b, s) => (b === 1 ? 1 : s === 0 ? 0 : 1 - Math.min(1, (1 - b) / s)),
  "hard-light": (b, s) => (s <= 0.5 ? 2 * b * s : 1 - 2 * (1 - b) * (1 - s)),
  "soft-light": (b, s) => {
    if (s <= 0.5) return b - (1 - 2 * s) * b * (1 - b);
    const d = b <= 0.25 ? ((16 * b - 12) * b + 4) * b : Math.sqrt(b);
    return b + (2 * s - 1) * (d - b);
  },
  difference: (b, s) => Math.abs(b - s),
  exclusion: (b, s) => b + s - 2 * b * s,
};

export const BLEND_MODES = Object.keys(BLEND_FNS) as BlendMode[];

/** Composite visible layers bottom-to-top into `out` (RGBA, W*H*4). Reuses an internal scratch buffer if out is omitted. */
export function composite(layers: Layer[], out: RGBA = scratch): RGBA {
  out.fill(0);
  for (const layer of layers) {
    if (!layer.visible || layer.opacity <= 0) continue;
    const src = layer.pixels;
    const mask = layer.mask;
    const blend = BLEND_FNS[layer.blend];
    for (let i = 0, p = 0; i < W * H; i++, p += 4) {
      const srcA = (src[p + 3] / 255) * layer.opacity * (mask ? mask[i] / 255 : 1);
      if (srcA <= 0) continue;
      const dstA = out[p + 3] / 255;
      const outA = srcA + dstA * (1 - srcA);
      if (outA <= 0) continue;
      for (let c = 0; c < 3; c++) {
        let s = src[p + c] / 255;
        if (blend && dstA > 0) {
          // Per the PDF/Photoshop model the source color is first blended
          // with the backdrop in proportion to the backdrop's coverage...
          const b = out[p + c] / 255;
          s = (1 - dstA) * s + dstA * blend(b, s);
        }
        // ...then composited source-over as usual.
        out[p + c] = (s * 255 * srcA + out[p + c] * dstA * (1 - srcA)) / outA;
      }
      out[p + 3] = outA * 255;
    }
  }
  return out;
}
