import { signal } from "@preact/signals";
import { W, H, allFaceRects, type ModelType, type PartName, type SkinLayer } from "./skinLayout";

/** RGBA (or grayscale mask) pixel buffer, always backed by a plain ArrayBuffer. */
export type RGBA = Uint8ClampedArray<ArrayBuffer>;

/** Photoshop-standard separable blend modes (same set pixi/canvas expose). */
export type BlendMode =
  | "normal" | "multiply" | "screen" | "overlay"
  | "darken" | "lighten" | "color-dodge" | "color-burn"
  | "hard-light" | "soft-light" | "difference" | "exclusion";

export interface PixelLayer {
  id: string;
  kind: "pixel";
  name: string;
  visible: boolean;
  opacity: number;
  blend: BlendMode;
  clipped: boolean;
  pixels: RGBA; // W*H*4 RGBA
  mask: RGBA | null; // W*H grayscale, null = no mask
}

export type Layer = PixelLayer;

export function makeBlankPixels(): RGBA {
  return new Uint8ClampedArray(W * H * 4);
}

let nextId = 1;
export function newId(): string {
  return `l${nextId++}`;
}

export function createPixelLayer(name: string, pixels?: RGBA): PixelLayer {
  return {
    id: newId(),
    kind: "pixel",
    name,
    visible: true,
    opacity: 1,
    blend: "normal",
    clipped: false,
    pixels: pixels ?? makeBlankPixels(),
    mask: null,
  };
}

/**
 * Grey mannequin: every inner-layer face filled with a flat mid grey so a new
 * document shows a paintable grey model instead of a black (blank-texture)
 * one. Outer layer stays transparent. Uses the "default" (Steve) rects — the
 * extra arm column is simply unused when the slim model is active.
 */
export function makeMannequinPixels(): RGBA {
  const px = makeBlankPixels();
  for (const r of allFaceRects("default")) {
    if (r.layer !== "inner") continue;
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        const p = (y * W + x) * 4;
        px[p] = px[p + 1] = px[p + 2] = 128;
        px[p + 3] = 255;
      }
    }
  }
  return px;
}

export const modelType = signal<ModelType>("default");
export const layers = signal<Layer[]>([createPixelLayer("Base", makeMannequinPixels())]);
export const activeLayerId = signal<string>(layers.value[0].id);

export const partVisible = signal<Record<SkinLayer, Record<PartName, boolean>>>({
  inner: { head: true, body: true, rightArm: true, leftArm: true, rightLeg: true, leftLeg: true },
  outer: { head: true, body: true, rightArm: true, leftArm: true, rightLeg: true, leftLeg: true },
});
export const layerGroupVisible = signal<Record<SkinLayer, boolean>>({
  inner: true, outer: true,
});

export function activeLayer(): Layer | undefined {
  return layers.value.find(l => l.id === activeLayerId.value);
}

export function replaceLayers(next: Layer[], activeId?: string) {
  layers.value = next;
  if (activeId) activeLayerId.value = activeId;
  else if (!next.find(l => l.id === activeLayerId.value)) {
    activeLayerId.value = next[next.length - 1]?.id ?? "";
  }
}
