import { W, H } from "./skinLayout";
import { activeLayer, layers, type RGBA } from "./document";
import {
  activeTool, brushSize, primaryColor, fillLimitToPart,
  shadeDirection, shadeMode, shadeAmount, type ToolId,
} from "./toolState";
import { brushTool, eraserTool } from "./tools/brush";
import { fillTool } from "./tools/fill";
import { eyedropperTool } from "./tools/eyedropper";
import { shadeTool } from "./tools/shade";
import type { Tool, StrokeContext } from "./tools/toolTypes";
import { composite } from "./compositor";
import { pushHistory } from "./history";

const tools: Record<ToolId, Tool> = {
  brush: brushTool,
  eraser: eraserTool,
  fill: fillTool,
  eyedropper: eyedropperTool,
  shade: shadeTool,
};

let strokeLayerId: string | null = null;
let strokeBefore: RGBA | null = null;
let compositeSnapshot: RGBA = new Uint8ClampedArray(W * H * 4);

function currentTool(): Tool {
  return tools[activeTool.value];
}

function makeCtx(pixels: RGBA): StrokeContext {
  return {
    pixels,
    composite: compositeSnapshot,
    color: primaryColor.value,
    size: brushSize.value,
    limitToPart: fillLimitToPart.value,
    shade: { direction: shadeDirection.value, mode: shadeMode.value, amount: shadeAmount.value },
  };
}

function buffersEqual(a: RGBA, b: RGBA): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function beginStroke(x: number, y: number) {
  const layer = activeLayer();
  if (!layer) return;
  strokeLayerId = layer.id;
  strokeBefore = layer.pixels.slice(0) as RGBA;
  compositeSnapshot = composite(layers.value, compositeSnapshot);
  currentTool().onDown(x, y, makeCtx(layer.pixels));
  layers.value = [...layers.value];
}

/** Resets the active tool's "last point" continuity without ending the stroke — used when a 3D raycast jumps across a seam to an unrelated part of the texture. */
export function breakStroke() {
  currentTool().onBreak?.();
}

export function moveStroke(x: number, y: number) {
  if (!strokeLayerId) return;
  const layer = layers.value.find(l => l.id === strokeLayerId);
  if (!layer) return;
  currentTool().onMove(x, y, makeCtx(layer.pixels));
  layers.value = [...layers.value];
}

export function endStroke() {
  if (!strokeLayerId) return;
  const layer = layers.value.find(l => l.id === strokeLayerId);
  if (layer) {
    currentTool().onUp(makeCtx(layer.pixels));
    if (strokeBefore && !buffersEqual(strokeBefore, layer.pixels)) {
      pushHistory({ type: "pixels", layerId: layer.id, before: strokeBefore, after: layer.pixels.slice(0) as RGBA });
    }
    layers.value = [...layers.value];
  }
  strokeLayerId = null;
  strokeBefore = null;
}
