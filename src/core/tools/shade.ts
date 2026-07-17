import { W, H } from "../skinLayout";
import { shadeRgb255 } from "../color";
import { line } from "./brush";
import type { Tool, StrokeContext } from "./toolTypes";

// Each texel is shaded once per stroke no matter how often the drag crosses
// it — scrubbing in place doesn't compound. Release and stroke again for
// another step, which also gives each step its own undo entry.
let last: { x: number; y: number } | null = null;
const visited = new Set<number>();

function stampShade(ctx: StrokeContext, cx: number, cy: number) {
  const half = Math.floor(ctx.size / 2);
  for (let dy = 0; dy < ctx.size; dy++) {
    for (let dx = 0; dx < ctx.size; dx++) {
      const x = cx - half + dx, y = cy - half + dy;
      if (x < 0 || x >= W || y < 0 || y >= H) continue;
      const i = y * W + x;
      if (visited.has(i)) continue;
      visited.add(i);
      const p = i * 4;
      if (ctx.pixels[p + 3] === 0) continue; // nothing to shade
      const { direction, mode, amount } = ctx.shade;
      const [r, g, b] = shadeRgb255(
        [ctx.pixels[p], ctx.pixels[p + 1], ctx.pixels[p + 2]],
        direction, mode, amount,
      );
      ctx.pixels[p] = r;
      ctx.pixels[p + 1] = g;
      ctx.pixels[p + 2] = b;
    }
  }
}

export const shadeTool: Tool = {
  onDown(x, y, ctx) {
    visited.clear();
    const cx = Math.round(x), cy = Math.round(y);
    last = { x: cx, y: cy };
    stampShade(ctx, cx, cy);
  },
  onMove(x, y, ctx) {
    const cx = Math.round(x), cy = Math.round(y);
    if (!last) {
      last = { x: cx, y: cy };
      stampShade(ctx, cx, cy);
      return;
    }
    line(last.x, last.y, cx, cy, (px, py) => stampShade(ctx, px, py));
    last = { x: cx, y: cy };
  },
  onUp() {
    last = null;
    visited.clear();
  },
  onBreak() {
    // Same stroke, so keep `visited` — only the line continuity resets.
    last = null;
  },
};
