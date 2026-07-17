import { describe, it, expect } from "vitest";
import { faceRectAt } from "../skinLayout";
import { fillTool } from "./fill";
import { modelType } from "../document";
import type { StrokeContext } from "./toolTypes";

function blankCtx(color: [number, number, number, number], limitToPart = true): StrokeContext {
  return {
    pixels: new Uint8ClampedArray(64 * 64 * 4) as any,
    composite: new Uint8ClampedArray(64 * 64 * 4) as any,
    color,
    size: 1,
    limitToPart,
    shade: { direction: "darken", mode: "value", amount: 0.1 },
  };
}

describe("faceRectAt", () => {
  it("finds the head front rect for (12,12)", () => {
    const rect = faceRectAt(12, 12, "default");
    expect(rect).toEqual({ part: "head", layer: "inner", face: "front", x: 8, y: 8, w: 8, h: 8 });
  });
  it("finds the head top rect for (12,4)", () => {
    const rect = faceRectAt(12, 4, "default");
    expect(rect).toEqual({ part: "head", layer: "inner", face: "top", x: 8, y: 0, w: 8, h: 8 });
  });
});

describe("fillTool bounded fill", () => {
  it("only fills the head front rect (64 px), not the whole canvas", () => {
    modelType.value = "default";
    const ctx = blankCtx([222, 60, 60, 255], true);
    fillTool.onDown(12, 12, ctx);
    let painted = 0;
    for (let i = 3; i < ctx.pixels.length; i += 4) if (ctx.pixels[i] > 0) painted++;
    expect(painted).toBe(64); // 8x8 face
  });

  it("second fill with a different color only touches its own rect", () => {
    modelType.value = "default";
    const ctx = blankCtx([222, 60, 60, 255], true);
    fillTool.onDown(12, 12, ctx); // front, red
    ctx.color = [80, 200, 120, 255];
    fillTool.onDown(12, 4, ctx); // top, green
    let red = 0, green = 0;
    for (let i = 0; i < ctx.pixels.length; i += 4) {
      if (ctx.pixels[i + 3] === 0) continue;
      if (ctx.pixels[i] === 222) red++;
      if (ctx.pixels[i] === 80) green++;
    }
    expect(red).toBe(64);
    expect(green).toBe(64);
  });
});
