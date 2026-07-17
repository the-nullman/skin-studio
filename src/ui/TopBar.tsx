import { useRef } from "preact/hooks";
import { modelType, layers, activeLayer, replaceLayers, createPixelLayer, makeMannequinPixels } from "../core/document";
import { importSkinFile, exportPng } from "../core/io";
import { composite } from "../core/compositor";
import { Icon } from "./Icon";

export function TopBar() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onImportClick = () => fileInputRef.current?.click();

  const onFileChange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const { layer, modelType: mt } = await importSkinFile(file);
    replaceLayers([layer], layer.id);
    modelType.value = mt;
    (e.target as HTMLInputElement).value = "";
  };

  const onExport = () => {
    const pixels = composite(layers.value, new Uint8ClampedArray(64 * 64 * 4));
    exportPng(pixels, "skin.png");
  };

  const onNew = () => {
    const layer = createPixelLayer("Base", makeMannequinPixels());
    replaceLayers([layer], layer.id);
  };

  return (
    <div class="topbar">
      <span class="brand">Skin Studio</span>
      <button onClick={onNew}><Icon name="note_add" /> New</button>
      <button onClick={onImportClick}><Icon name="upload" /> Import PNG</button>
      <input ref={fileInputRef} type="file" accept="image/png" style="display:none" onChange={onFileChange} />
      <button onClick={onExport}><Icon name="download" /> Export PNG</button>
      <span class="sep" />
      <div class="model-switch">
        <button
          class={modelType.value === "default" ? "active" : ""}
          onClick={() => (modelType.value = "default")}
        >
          Steve
        </button>
        <button
          class={modelType.value === "slim" ? "active" : ""}
          onClick={() => (modelType.value = "slim")}
        >
          Alex
        </button>
      </div>
      <span class="spacer" />
      <span class="active-layer">{activeLayer()?.name ?? "No layer"}</span>
    </div>
  );
}
