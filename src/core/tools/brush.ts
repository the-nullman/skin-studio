import { W, H } from "../skinLayout";
import type { RGBA } from "../document";
import type { RGBAColor } from "../toolState";
import type { Tool, StrokeContext } from "./toolTypes";

function setPixel(pixels: RGBA, x: number, y: number, color: RGBAColor) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const p = (y * W + x) * 4;
  pixels[p] = color[0];
  pixels[p + 1] = color[1];
  pixels[p + 2] = color[2];
  pixels[p + 3] = color[3];
}

function stamp(pixels: RGBA, cx: number, cy: number, size: number, color: RGBAColor) {
  const half = Math.floor(size / 2);
  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      setPixel(pixels, cx - half + dx, cy - half + dy, color);
    }
  }
}

/** Bresenham line, calling draw(x,y) for every cell from (x0,y0) to (x1,y1) inclusive. */
export function line(x0: number, y0: number, x1: number, y1: number, draw: (x: number, y: number) => void) {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0, y = y0;
  for (;;) {
    draw(x, y);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

function makeDraggedStampTool(colorFor: (ctx: StrokeContext) => RGBAColor): Tool {
  let last: { x: number; y: number } | null = null;
  return {
    onDown(x, y, ctx) {
      const cx = Math.round(x), cy = Math.round(y);
      last = { x: cx, y: cy };
      stamp(ctx.pixels, cx, cy, ctx.size, colorFor(ctx));
    },
    onMove(x, y, ctx) {
      const cx = Math.round(x), cy = Math.round(y);
      if (!last) {
        last = { x: cx, y: cy };
        stamp(ctx.pixels, cx, cy, ctx.size, colorFor(ctx));
        return;
      }
      line(last.x, last.y, cx, cy, (px, py) => stamp(ctx.pixels, px, py, ctx.size, colorFor(ctx)));
      last = { x: cx, y: cy };
    },
    onUp() {
      last = null;
    },
    onBreak() {
      last = null;
    },
  };
}

export const brushTool: Tool = makeDraggedStampTool(ctx => ctx.color);
export const eraserTool: Tool = makeDraggedStampTool(() => [0, 0, 0, 0]);
