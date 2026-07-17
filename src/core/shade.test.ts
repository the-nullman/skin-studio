import { describe, it, expect } from "vitest";
import { shadeRgb255 } from "./color";
import { shadeTool } from "./tools/shade";
import { makeBlankPixels, type RGBA } from "./document";
import { W } from "./skinLayout";
import type { StrokeContext } from "./tools/toolTypes";

const GREY: [number, number, number] = [128, 128, 128];

function makeCtx(pixels: RGBA, shade: Partial<StrokeContext["shade"]> = {}): StrokeContext {
  return {
    pixels,
    composite: pixels,
    color: [0, 0, 0, 255],
    size: 1,
    limitToPart: false,
    shade: { direction: "darken", mode: "temperature", amount: 0.2, ...shade },
  };
}

function greyPixels(): RGBA {
  const px = makeBlankPixels();
  for (let p = 0; p < px.length; p += 4) {
    px[p] = 128; px[p + 1] = 128; px[p + 2] = 128; px[p + 3] = 255;
  }
  return px;
}

function pixelAt(px: RGBA, x: number, y: number): [number, number, number, number] {
  const p = (y * W + x) * 4;
  return [px[p], px[p + 1], px[p + 2], px[p + 3]];
}

describe("shadeRgb255", () => {
  it("value darken keeps grey neutral and darker", () => {
    const [r, g, b] = shadeRgb255(GREY, "darken", "value", 0.2);
    expect(r).toBe(g);
    expect(g).toBe(b);
    expect(r).toBeLessThan(128);
  });

  it("value lighten keeps grey neutral and lighter", () => {
    const [r, g, b] = shadeRgb255(GREY, "lighten", "value", 0.2);
    expect(r).toBe(g);
    expect(g).toBe(b);
    expect(r).toBeGreaterThan(128);
  });

  it("temperature darken cools: grey shadow turns bluish", () => {
    const [r, g, b] = shadeRgb255(GREY, "darken", "temperature", 0.2);
    expect(b).toBeGreaterThan(r);
    expect(Math.max(r, g, b)).toBeLessThan(128);
  });

  it("temperature lighten warms: grey highlight turns yellowish", () => {
    const [r, g, b] = shadeRgb255(GREY, "lighten", "temperature", 0.2);
    expect(r).toBeGreaterThan(b);
    expect(Math.min(r, g)).toBeGreaterThan(128);
  });

  it("temperature darken on a saturated color stays in gamut and darkens", () => {
    const src: [number, number, number] = [222, 60, 60];
    const out = shadeRgb255(src, "darken", "temperature", 0.2);
    for (const ch of out) {
      expect(ch).toBeGreaterThanOrEqual(0);
      expect(ch).toBeLessThanOrEqual(255);
    }
    expect(out[0]).toBeLessThan(src[0]);
  });

  it("repeated temperature darkening converges near the cool anchor, not pure black", () => {
    let c: [number, number, number] = [...GREY];
    for (let i = 0; i < 60; i++) c = shadeRgb255(c, "darken", "temperature", 0.2);
    expect(c[2]).toBeGreaterThan(0); // still has blue in it
    expect(c[2]).toBeGreaterThan(c[0]);
  });
});

describe("shadeTool", () => {
  it("applies once per texel per stroke, even when the drag recrosses", () => {
    const px = greyPixels();
    const ctx = makeCtx(px);
    shadeTool.onDown(5, 5, ctx);
    shadeTool.onMove(9, 5, ctx); // out along a row...
    shadeTool.onMove(5, 5, ctx); // ...and back across the same texels
    shadeTool.onUp(ctx);
    expect(pixelAt(px, 5, 5)).toEqual([...shadeRgb255(GREY, "darken", "temperature", 0.2), 255]);
  });

  it("a second stroke deepens the shade", () => {
    const px = greyPixels();
    const ctx = makeCtx(px);
    shadeTool.onDown(5, 5, ctx);
    shadeTool.onUp(ctx);
    shadeTool.onDown(5, 5, ctx);
    shadeTool.onUp(ctx);
    const twice = shadeRgb255(shadeRgb255(GREY, "darken", "temperature", 0.2), "darken", "temperature", 0.2);
    expect(pixelAt(px, 5, 5)).toEqual([...twice, 255]);
  });

  it("leaves transparent texels untouched", () => {
    const px = makeBlankPixels();
    const ctx = makeCtx(px, { direction: "lighten" });
    shadeTool.onDown(5, 5, ctx);
    shadeTool.onUp(ctx);
    expect(pixelAt(px, 5, 5)).toEqual([0, 0, 0, 0]);
  });
});
