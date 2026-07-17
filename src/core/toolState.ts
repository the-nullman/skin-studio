import { signal } from "@preact/signals";

export type ToolId = "brush" | "eraser" | "fill" | "eyedropper" | "shade";
export type RGBAColor = [number, number, number, number];

export type ShadeDirection = "darken" | "lighten";
/** "value" moves lightness toward pure black/white; "temperature" shades the
 * painterly way — toward a cool blue-black or a warm near-white (in OKLCH). */
export type ShadeMode = "value" | "temperature";

export const activeTool = signal<ToolId>("brush");
export const brushSize = signal(1);
export const primaryColor = signal<RGBAColor>([60, 60, 60, 255]);
export const fillLimitToPart = signal(true);
export const shadeDirection = signal<ShadeDirection>("darken");
export const shadeMode = signal<ShadeMode>("temperature");
export const shadeAmount = signal(0.1);
