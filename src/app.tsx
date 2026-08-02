import { useEffect } from "preact/hooks";
import { TopBar } from "./ui/TopBar";
import { BodyPartsPanel } from "./ui/BodyPartsPanel";
import { ToolStrip } from "./ui/ToolStrip";
import { Canvas2D } from "./ui/Canvas2D";
import { Viewport3D } from "./ui/Viewport3D";
import { LayerPanel } from "./ui/LayerPanel";
import { Resizer } from "./ui/Resizer";
import { undo, redo } from "./core/history";

export function App() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod || e.key.toLowerCase() !== "z") return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div class="app">
      <TopBar />
      <div class="app-body">
        <ToolStrip />
        <Resizer cssVar="--left-w" min={150} max={420} />
        <div class="viewports">
          <Canvas2D />
          <Resizer cssVar="--v2d-w" min={220} max={1600} />
          <Viewport3D />
        </div>
        <Resizer cssVar="--right-w" min={190} max={560} trailing />
        <div class="right-col">
          <LayerPanel />
          <BodyPartsPanel />
        </div>
      </div>
    </div>
  );
}
