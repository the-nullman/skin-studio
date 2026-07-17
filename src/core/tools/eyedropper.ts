import { W, H } from "../skinLayout";
import { primaryColor } from "../toolState";
import type { Tool, StrokeContext } from "./toolTypes";

function sample(x: number, y: number, ctx: StrokeContext) {
  const sx = Math.floor(x), sy = Math.floor(y);
  if (sx < 0 || sx >= W || sy < 0 || sy >= H) return;
  const p = (sy * W + sx) * 4;
  const c = ctx.composite;
  primaryColor.value = [c[p], c[p + 1], c[p + 2], c[p + 3]];
}

export const eyedropperTool: Tool = {
  onDown: sample,
  onMove: sample,
  onUp() {},
};
