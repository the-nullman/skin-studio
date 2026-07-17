import {
  activeTool, brushSize, primaryColor, fillLimitToPart,
  shadeDirection, shadeMode, shadeAmount,
  type ToolId, type RGBAColor, type ShadeMode,
} from "../core/toolState";
import { undo, redo, undoStack, redoStack } from "../core/history";
import { ColorPicker } from "./ColorPicker";
import { Icon, type IconName } from "./Icon";

const TOOLS: { id: ToolId; label: string; icon: IconName }[] = [
  { id: "brush", label: "Brush", icon: "brush" },
  { id: "eraser", label: "Eraser", icon: "ink_eraser" },
  { id: "fill", label: "Fill", icon: "format_color_fill" },
  { id: "eyedropper", label: "Eyedropper", icon: "colorize" },
  { id: "shade", label: "Darken/Lighten", icon: "exposure" },
];

const PRESET_COLORS: RGBAColor[] = [
  [17, 17, 20, 255], [255, 255, 255, 255], [136, 84, 52, 255], [224, 178, 138, 255],
  [201, 151, 111, 255], [90, 60, 40, 255], [222, 60, 60, 255], [235, 150, 40, 255],
  [235, 220, 60, 255], [70, 180, 90, 255], [50, 130, 220, 255], [140, 80, 220, 255],
];

function rgba([r, g, b, a]: RGBAColor) {
  return `rgba(${r},${g},${b},${a / 255})`;
}

export function ToolStrip() {
  return (
    <div class="panel tool-strip">
      <h3>Tools</h3>
      {TOOLS.map(t => (
        <button
          key={t.id}
          class={"tool-btn" + (activeTool.value === t.id ? " active" : "")}
          onClick={() => (activeTool.value = t.id)}
        >
          <Icon name={t.icon} /> {t.label}
        </button>
      ))}

      <h3>Brush size</h3>
      <input
        type="number"
        min={1}
        max={8}
        value={brushSize.value}
        onInput={e => {
          const v = Math.max(1, Math.min(8, Number((e.target as HTMLInputElement).value) || 1));
          brushSize.value = v;
        }}
      />

      {activeTool.value === "fill" && (
        <label class="row">
          <input
            type="checkbox"
            checked={fillLimitToPart.value}
            onChange={e => (fillLimitToPart.value = (e.target as HTMLInputElement).checked)}
          />
          Limit to part
        </label>
      )}

      {activeTool.value === "shade" && (
        <>
          <h3>Shading</h3>
          <div class="seg">
            <button
              class={shadeDirection.value === "darken" ? "active" : ""}
              onClick={() => (shadeDirection.value = "darken")}
            >
              Darken
            </button>
            <button
              class={shadeDirection.value === "lighten" ? "active" : ""}
              onClick={() => (shadeDirection.value = "lighten")}
            >
              Lighten
            </button>
          </div>
          <select
            class="view-select mode-select"
            value={shadeMode.value}
            onChange={e => (shadeMode.value = (e.target as HTMLSelectElement).value as ShadeMode)}
          >
            <option value="temperature">Color temperature</option>
            <option value="value">Plain value</option>
          </select>
          <div class="slider-row">
            <input
              type="range"
              min={2}
              max={50}
              value={Math.round(shadeAmount.value * 100)}
              onInput={e => (shadeAmount.value = Number((e.target as HTMLInputElement).value) / 100)}
            />
            <span class="val pct">{Math.round(shadeAmount.value * 100)}%</span>
          </div>
        </>
      )}

      <h3>Color</h3>
      <ColorPicker />
      <h3>Swatches</h3>
      <div class="swatch-grid">
        {PRESET_COLORS.map((c, i) => (
          <button
            key={i}
            class="swatch"
            style={{ background: rgba(c) }}
            onClick={() => (primaryColor.value = c)}
          />
        ))}
      </div>

      <h3>History</h3>
      <div class="row history-actions">
        <button disabled={undoStack.value.length === 0} onClick={undo}><Icon name="undo" /> Undo</button>
        <button disabled={redoStack.value.length === 0} onClick={redo}><Icon name="redo" /> Redo</button>
      </div>
    </div>
  );
}
