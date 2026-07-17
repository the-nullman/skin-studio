import { signal } from "@preact/signals";
import { layers, activeLayerId, type Layer, type RGBA } from "./document";

type PropKey = "name" | "visible" | "opacity" | "blend" | "clipped";

export type HistoryEntry =
  | { type: "pixels"; layerId: string; before: RGBA; after: RGBA }
  | { type: "prop"; layerId: string; key: PropKey; before: unknown; after: unknown }
  | { type: "structure"; before: Layer[]; beforeActive: string; after: Layer[]; afterActive: string };

const MAX_HISTORY = 200;

export const undoStack = signal<HistoryEntry[]>([]);
export const redoStack = signal<HistoryEntry[]>([]);

export function pushHistory(entry: HistoryEntry) {
  const next = [...undoStack.value, entry];
  if (next.length > MAX_HISTORY) next.shift();
  undoStack.value = next;
  redoStack.value = [];
}

function applyPixels(layerId: string, pixels: RGBA) {
  layers.value = layers.value.map(l => (l.id === layerId ? { ...l, pixels } : l));
}

function applyProp(layerId: string, key: PropKey, value: unknown) {
  layers.value = layers.value.map(l => (l.id === layerId ? { ...l, [key]: value } : l));
}

export function undo() {
  const stack = undoStack.value;
  if (stack.length === 0) return;
  const entry = stack[stack.length - 1];
  undoStack.value = stack.slice(0, -1);
  redoStack.value = [...redoStack.value, entry];
  if (entry.type === "pixels") {
    applyPixels(entry.layerId, entry.before.slice(0) as RGBA);
  } else if (entry.type === "prop") {
    applyProp(entry.layerId, entry.key, entry.before);
  } else {
    layers.value = entry.before;
    activeLayerId.value = entry.beforeActive;
  }
}

export function redo() {
  const stack = redoStack.value;
  if (stack.length === 0) return;
  const entry = stack[stack.length - 1];
  redoStack.value = stack.slice(0, -1);
  undoStack.value = [...undoStack.value, entry];
  if (entry.type === "pixels") {
    applyPixels(entry.layerId, entry.after.slice(0) as RGBA);
  } else if (entry.type === "prop") {
    applyProp(entry.layerId, entry.key, entry.after);
  } else {
    layers.value = entry.after;
    activeLayerId.value = entry.afterActive;
  }
}

export function clearHistory() {
  undoStack.value = [];
  redoStack.value = [];
}
