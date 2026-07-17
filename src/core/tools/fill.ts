import { W, H, faceRectAt } from "../skinLayout";
import { modelType, type RGBA } from "../document";
import type { Tool } from "./toolTypes";

function colorAt(pixels: RGBA, x: number, y: number): [number, number, number, number] {
  const p = (y * W + x) * 4;
  return [pixels[p], pixels[p + 1], pixels[p + 2], pixels[p + 3]];
}

function sameColor(a: [number, number, number, number], b: [number, number, number, number]) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

export const fillTool: Tool = {
  onDown(x, y, ctx) {
    const sx = Math.floor(x), sy = Math.floor(y);
    if (sx < 0 || sx >= W || sy < 0 || sy >= H) return;
    const target = colorAt(ctx.pixels, sx, sy);
    const replacement: [number, number, number, number] = ctx.color;
    if (sameColor(target, replacement)) return;

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
      const p = idx * 4;
      ctx.pixels[p] = replacement[0];
      ctx.pixels[p + 1] = replacement[1];
      ctx.pixels[p + 2] = replacement[2];
      ctx.pixels[p + 3] = replacement[3];
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
  },
  onMove() {},
  onUp() {},
};
