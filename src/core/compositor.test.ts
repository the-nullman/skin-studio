import { describe, it, expect } from "vitest";
import { composite } from "./compositor";
import { createPixelLayer, makeBlankPixels, type BlendMode, type RGBA } from "./document";

function solidLayer(rgba: [number, number, number, number], blend: BlendMode = "normal") {
  const px = makeBlankPixels();
  for (let p = 0; p < px.length; p += 4) {
    px[p] = rgba[0]; px[p + 1] = rgba[1]; px[p + 2] = rgba[2]; px[p + 3] = rgba[3];
  }
  const layer = createPixelLayer("t", px);
  layer.blend = blend;
  return layer;
}

function firstPixel(out: RGBA): [number, number, number, number] {
  return [out[0], out[1], out[2], out[3]];
}

describe("compositor blend modes", () => {
  it("multiply darkens: 50% grey over white -> 50% grey", () => {
    const out = composite([solidLayer([255, 255, 255, 255]), solidLayer([128, 128, 128, 255], "multiply")]);
    expect(firstPixel(out)).toEqual([128, 128, 128, 255]);
  });

  it("screen lightens: 50% grey over black -> 50% grey", () => {
    const out = composite([solidLayer([0, 0, 0, 255]), solidLayer([128, 128, 128, 255], "screen")]);
    expect(firstPixel(out)).toEqual([128, 128, 128, 255]);
  });

  it("multiply over transparent backdrop behaves like normal", () => {
    const out = composite([solidLayer([200, 100, 50, 255], "multiply")]);
    expect(firstPixel(out)).toEqual([200, 100, 50, 255]);
  });

  it("difference of a color with itself is black", () => {
    const out = composite([solidLayer([90, 140, 200, 255]), solidLayer([90, 140, 200, 255], "difference")]);
    expect(firstPixel(out)).toEqual([0, 0, 0, 255]);
  });
});
