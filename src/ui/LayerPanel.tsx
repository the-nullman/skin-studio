import { layers, activeLayerId, type BlendMode } from "../core/document";
import { BLEND_MODES } from "../core/compositor";
import {
  addLayer, deleteLayer, duplicateLayer,
  moveLayerUp, moveLayerDown, setLayerName, setLayerVisible, setLayerOpacity, setLayerBlend,
} from "../core/layerOps";
import { Icon } from "./Icon";

const blendLabel = (m: BlendMode) => m[0].toUpperCase() + m.slice(1).replace("-", " ");

export function LayerPanel() {
  const list = [...layers.value].reverse();

  return (
    <div class="panel layer-panel">
      <h3>Layers</h3>
      <div class="layer-toolbar">
        <button onClick={() => addLayer()}><Icon name="add" /> New layer</button>
      </div>
      <div class="layer-list">
        {list.map(l => (
          <div
            key={l.id}
            class={"layer-row" + (l.id === activeLayerId.value ? " active" : "")}
            onClick={() => (activeLayerId.value = l.id)}
          >
            <div class="layer-row-top">
              <input
                type="checkbox"
                checked={l.visible}
                onClick={(e: MouseEvent) => e.stopPropagation()}
                onChange={e => setLayerVisible(l.id, (e.target as HTMLInputElement).checked)}
              />
              <input
                class="layer-name"
                value={l.name}
                onClick={(e: MouseEvent) => e.stopPropagation()}
                onChange={e => setLayerName(l.id, (e.target as HTMLInputElement).value)}
              />
            </div>
            <div class="layer-row-mid" onClick={(e: MouseEvent) => e.stopPropagation()}>
              <select
                class="blend-select"
                value={l.blend}
                onChange={e => setLayerBlend(l.id, (e.target as HTMLSelectElement).value as BlendMode)}
              >
                {BLEND_MODES.map(m => (
                  <option key={m} value={m}>{blendLabel(m)}</option>
                ))}
              </select>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={l.opacity}
                onInput={e => setLayerOpacity(l.id, Number((e.target as HTMLInputElement).value))}
              />
            </div>
            <div class="layer-row-bottom" onClick={(e: MouseEvent) => e.stopPropagation()}>
              <button title="Move up" onClick={() => moveLayerUp(l.id)}><Icon name="arrow_upward" /></button>
              <button title="Move down" onClick={() => moveLayerDown(l.id)}><Icon name="arrow_downward" /></button>
              <button title="Duplicate" onClick={() => duplicateLayer(l.id)}><Icon name="content_copy" /></button>
              <button title="Delete" disabled={layers.value.length <= 1} onClick={() => deleteLayer(l.id)}><Icon name="delete" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
