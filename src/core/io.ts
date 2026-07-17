import { loadImage, loadSkinToCanvas, inferModelType } from "skinview-utils";
import { W, H, type ModelType } from "./skinLayout";
import { createPixelLayer, type PixelLayer, type RGBA } from "./document";

export interface ImportResult {
  layer: PixelLayer;
  modelType: ModelType;
}

export async function importSkinFile(file: File): Promise<ImportResult> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    loadSkinToCanvas(canvas, img);
    const ctx = canvas.getContext("2d")!;
    const data = ctx.getImageData(0, 0, W, H).data;
    const pixels = new Uint8ClampedArray(data);
    const model = inferModelType(canvas) as ModelType;
    return { layer: createPixelLayer(file.name.replace(/\.png$/i, "") || "Imported", pixels), modelType: model };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function pixelsToCanvas(pixels: RGBA): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(new ImageData(pixels, W, H), 0, 0);
  return canvas;
}

export function exportPng(pixels: RGBA, filename = "skin.png") {
  const canvas = pixelsToCanvas(pixels);
  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}
