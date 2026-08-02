import { W, H, faceRectAt, partTexels } from "../skinLayout";
import { modelType, type RGBA } from "../document";
import type { Tool, StrokeContext } from "./toolTypes";

type Color = [number, number, number, number];

function colorAt(pixels: RGBA, x: number, y: number): Color {
  const p = (y * W + x) * 4;
  return [pixels[p], pixels[p + 1], pixels[p + 2], pixels[p + 3]];
}

function sameColor(a: Color, b: Color) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

function write(pixels: RGBA, idx: number, c: Color) {
  const p = idx * 4;
  pixels[p] = c[0];
  pixels[p + 1] = c[1];
  pixels[p + 2] = c[2];
  pixels[p + 3] = c[3];
}

/**
 * "Whole part" mode: repaint every texel belonging to the clicked part and
 * skin layer — all six faces of that head/arm/leg at once — regardless of the
 * colors already there.
 */
function fillPart(ctx: StrokeContext, sx: number, sy: number) {
  const rect = faceRectAt(sx, sy, modelType.value);
  if (!rect) return;
  const texels = partTexels(rect.part, rect.layer, modelType.value);
  for (let i = 0; i < W * H; i++) {
    if (texels[i]) write(ctx.pixels, i, ctx.color);
  }
}

/** "Same color" mode: 4-connected flood of the contiguous matching region. */
function floodFill(ctx: StrokeContext, sx: number, sy: number) {
  const target = colorAt(ctx.pixels, sx, sy);
  if (sameColor(target, ctx.color)) return;

  let inBounds = (px: number, py: number) => px >= 0 && px < W && py >= 0 && py < H;
  if (ctx.limitToPart) {
    const rect = faceRectAt(sx, sy, modelType.value);
    if (rect) {
      inBounds = (px, py) => px >= rect.x && px < rect.x + rect.w && py >= rect.y && py < rect.y + rect.h;
    }
  }

  const visited = new Uint8Array(W * H);
  const stack: [number, number][] = [[sx, sy]];
  while (stack.length) {
    const [cx, cy] = stack.pop()!;
    if (!inBounds(cx, cy)) continue;
    const idx = cy * W + cx;
    if (visited[idx]) continue;
    visited[idx] = 1;
    if (!sameColor(colorAt(ctx.pixels, cx, cy), target)) continue;
    write(ctx.pixels, idx, ctx.color);
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
}

export const fillTool: Tool = {
  onDown(x, y, ctx) {
    const sx = Math.floor(x), sy = Math.floor(y);
    if (sx < 0 || sx >= W || sy < 0 || sy >= H) return;
    if (ctx.fillMode === "part") fillPart(ctx, sx, sy);
    else floodFill(ctx, sx, sy);
  },
  onMove() {},
  onUp() {},
};
