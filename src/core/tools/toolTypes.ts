import type { RGBA } from "../document";
import type { RGBAColor, ShadeDirection, ShadeMode } from "../toolState";

export interface StrokeContext {
  pixels: RGBA; // active layer buffer, mutated in place
  composite: RGBA; // read-only composited buffer (for eyedropper)
  color: RGBAColor;
  size: number;
  limitToPart: boolean;
  shade: { direction: ShadeDirection; mode: ShadeMode; amount: number };
}

export interface Tool {
  onDown(x: number, y: number, ctx: StrokeContext): void;
  onMove(x: number, y: number, ctx: StrokeContext): void;
  onUp(ctx: StrokeContext): void;
  /** Reset any "last point" continuity (e.g. when a 3D raycast jumps to an unrelated UV island) without ending the stroke. */
  onBreak?(): void;
}
