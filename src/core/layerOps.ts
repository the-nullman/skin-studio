import { layers, activeLayerId, createPixelLayer, newId, type BlendMode, type Layer, type RGBA } from "./document";
import { pushHistory } from "./history";

function cloneLayer(l: Layer): Layer {
  return { ...l, pixels: l.pixels.slice(0) as RGBA, mask: l.mask ? (l.mask.slice(0) as RGBA) : null };
}

function snapshot(): Layer[] {
  return layers.value.map(cloneLayer);
}

function commitStructure(before: Layer[], beforeActive: string, after: Layer[], afterActive: string) {
  layers.value = after;
  activeLayerId.value = afterActive;
  pushHistory({ type: "structure", before, beforeActive, after, afterActive });
}

export function addLayer(name = "Layer") {
  const before = snapshot();
  const beforeActive = activeLayerId.value;
  const layer = createPixelLayer(name);
  commitStructure(before, beforeActive, [...layers.value, layer], layer.id);
}

export function deleteLayer(id: string) {
  if (layers.value.length <= 1) return;
  const before = snapshot();
  const beforeActive = activeLayerId.value;
  const after = layers.value.filter(l => l.id !== id);
  const afterActive = after.some(l => l.id === beforeActive) ? beforeActive : after[after.length - 1].id;
  commitStructure(before, beforeActive, after, afterActive);
}

export function duplicateLayer(id: string) {
  const idx = layers.value.findIndex(l => l.id === id);
  if (idx === -1) return;
  const before = snapshot();
  const beforeActive = activeLayerId.value;
  const src = layers.value[idx];
  const copy = cloneLayer(src);
  copy.id = newId();
  copy.name = src.name + " copy";
  const after = [...layers.value.slice(0, idx + 1), copy, ...layers.value.slice(idx + 1)];
  commitStructure(before, beforeActive, after, copy.id);
}

function move(id: string, dir: -1 | 1) {
  const idx = layers.value.findIndex(l => l.id === id);
  const swapIdx = idx + dir;
  if (idx === -1 || swapIdx < 0 || swapIdx >= layers.value.length) return;
  const before = snapshot();
  const beforeActive = activeLayerId.value;
  const after = [...layers.value];
  [after[idx], after[swapIdx]] = [after[swapIdx], after[idx]];
  commitStructure(before, beforeActive, after, beforeActive);
}

export const moveLayerUp = (id: string) => move(id, 1);
export const moveLayerDown = (id: string) => move(id, -1);

export function setLayerName(id: string, name: string) {
  const layer = layers.value.find(l => l.id === id);
  if (!layer || layer.name === name) return;
  pushHistory({ type: "prop", layerId: id, key: "name", before: layer.name, after: name });
  layers.value = layers.value.map(l => (l.id === id ? { ...l, name } : l));
}

export function setLayerVisible(id: string, visible: boolean) {
  const layer = layers.value.find(l => l.id === id);
  if (!layer || layer.visible === visible) return;
  pushHistory({ type: "prop", layerId: id, key: "visible", before: layer.visible, after: visible });
  layers.value = layers.value.map(l => (l.id === id ? { ...l, visible } : l));
}

export function setLayerOpacity(id: string, opacity: number) {
  const layer = layers.value.find(l => l.id === id);
  if (!layer) return;
  pushHistory({ type: "prop", layerId: id, key: "opacity", before: layer.opacity, after: opacity });
  layers.value = layers.value.map(l => (l.id === id ? { ...l, opacity } : l));
}

export function setLayerBlend(id: string, blend: BlendMode) {
  const layer = layers.value.find(l => l.id === id);
  if (!layer || layer.blend === blend) return;
  pushHistory({ type: "prop", layerId: id, key: "blend", before: layer.blend, after: blend });
  layers.value = layers.value.map(l => (l.id === id ? { ...l, blend } : l));
}

export function setLayerClipped(id: string, clipped: boolean) {
  const layer = layers.value.find(l => l.id === id);
  if (!layer || layer.clipped === clipped) return;
  pushHistory({ type: "prop", layerId: id, key: "clipped", before: layer.clipped, after: clipped });
  layers.value = layers.value.map(l => (l.id === id ? { ...l, clipped } : l));
}
