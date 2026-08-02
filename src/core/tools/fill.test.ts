import { describe, it, expect } from "vitest";
import { faceRectAt } from "../skinLayout";
import { fillTool } from "./fill";
import { modelType } from "../document";
import type { StrokeContext } from "./toolTypes";
import type { FillMode } from "../toolState";

function blankCtx(
  color: [number, number, number, number],
  limitToPart = true,
  fillMode: FillMode = "color",
): StrokeContext {
  return {
    pixels: new Uint8ClampedArray(64 * 64 * 4) as any,
    composite: new Uint8ClampedArray(64 * 64 * 4) as any,
    color,
    size: 1,
    limitToPart,
    fillMode,
    shade: { direction: "darken", mode: "value", amount: 0.1 },
  };
}

function paintedCount(pixels: StrokeContext["pixels"]) {
  let n = 0;
  for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) n++;
  return n;
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
    expect(paintedCount(ctx.pixels)).toBe(64); // 8x8 face
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

describe("fillTool whole-part mode", () => {
  it("fills all six faces of the clicked part (head inner = 6 * 8x8)", () => {
    modelType.value = "default";
    const ctx = blankCtx([222, 60, 60, 255], true, "part");
    fillTool.onDown(12, 12, ctx); // head inner, front face
    expect(paintedCount(ctx.pixels)).toBe(384);
  });

  it("ignores existing colors instead of flooding only the matching region", () => {
    modelType.value = "default";
    const ctx = blankCtx([80, 200, 120, 255], true, "color");
    fillTool.onDown(12, 12, ctx); // one face green
    ctx.color = [222, 60, 60, 255];
    ctx.fillMode = "part";
    fillTool.onDown(12, 12, ctx); // whole head red, green face included
    let red = 0;
    for (let i = 0; i < ctx.pixels.length; i += 4) {
      if (ctx.pixels[i + 3] > 0 && ctx.pixels[i] === 222) red++;
    }
    expect(red).toBe(384);
  });

  it("stays on the clicked skin layer — the head overlay is untouched", () => {
    modelType.value = "default";
    const ctx = blankCtx([222, 60, 60, 255], true, "part");
    fillTool.onDown(12, 12, ctx); // inner head
    // Head outer starts at (32,0); its front face is at (40,8).
    const p = (8 * 64 + 40) * 4;
    expect(ctx.pixels[p + 3]).toBe(0);
  });
});
