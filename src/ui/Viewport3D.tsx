import { useEffect, useRef, useState } from "preact/hooks";
import { useSignal, useSignalEffect } from "@preact/signals";
import * as THREE from "three";
import { Viewport, type CameraMode, type ViewPreset } from "../three/viewport";
import { PlayerModel, makeSourceCanvas } from "../three/playerModel";
import { makeFloorGrid, makePixelGridOverlay, disposePixelGridOverlay, updatePixelGridVisibility, type PixelGridOverlay } from "../three/grids";
import { raycastTexel, type TexelHit } from "../three/paint3d";
import { layers, modelType, partVisible, layerGroupVisible, type RGBA } from "../core/document";
import { composite } from "../core/compositor";
import { beginStroke, moveStroke, endStroke, breakStroke } from "../core/strokeEngine";
import { PART_NAMES, W } from "../core/skinLayout";
import type { SkinLayer } from "../core/skinLayout";

export function Viewport3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    viewport: Viewport;
    model: PlayerModel;
    sourceCanvas: HTMLCanvasElement;
    sourceCtx: CanvasRenderingContext2D;
    floorGrid: THREE.GridHelper;
    pixelGrid: PixelGridOverlay;
    compositePixels: RGBA | null;
  } | null>(null);

  const [cameraMode, setCameraMode] = useState<CameraMode>("perspective");
  const showFloorGrid = useSignal(true);
  const showPixelGrid = useSignal(false);

  /** Push current part/layer/grid visibility signals onto the model and wires. */
  const applyVisibility = () => {
    const s = stateRef.current;
    if (!s) return;
    const pv = partVisible.peek();
    const lv = layerGroupVisible.peek();
    for (const part of PART_NAMES) {
      for (const layer of ["inner", "outer"] as SkinLayer[]) {
        s.model.setPartVisible(part, layer, pv[layer][part] && lv[layer]);
      }
    }
    updatePixelGridVisibility(s.pixelGrid, showPixelGrid.peek(), pv, lv);
  };

  useEffect(() => {
    const container = containerRef.current!;
    const viewport = new Viewport(container);
    const sourceCanvas = makeSourceCanvas();
    const sourceCtx = sourceCanvas.getContext("2d")!;
    const model = new PlayerModel(sourceCanvas);
    viewport.scene.add(model.player);

    const floorGrid = makeFloorGrid();
    floorGrid.visible = showFloorGrid.peek();
    viewport.scene.add(floorGrid);

    model.setModelType(modelType.value);
    const pixelGrid = makePixelGridOverlay(model.player);

    stateRef.current = { viewport, model, sourceCanvas, sourceCtx, floorGrid, pixelGrid, compositePixels: null };
    applyVisibility();

    if (import.meta.env.DEV) {
      (globalThis as unknown as { __skin3d: unknown }).__skin3d = { viewport, model };
    }

    const canvas = viewport.renderer.domElement;
    let painting = false;
    let lastHit: TexelHit | null = null;
    // A single continuous drag across one UV island never needs to jump this
    // far in one frame; a bigger jump means the ray crossed a seam onto an
    // unrelated part of the texture (different face or object) and the tools'
    // "connect to last point" line-draw must not bridge the two.
    const SEAM_JUMP_TEXELS = 12;

    const alphaAt = (x: number, y: number) =>
      stateRef.current?.compositePixels?.[(y * W + x) * 4 + 3] ?? 255;
    const hitTexel = (e: PointerEvent) =>
      raycastTexel(e.clientX, e.clientY, canvas, viewport.activeCamera, model.player, alphaAt);

    // Decide before OrbitControls sees the press: left-drag paints when it
    // starts on the model, orbits when it starts on empty space. Capture
    // phase on the container runs ahead of OrbitControls' canvas listener.
    const onDownCapture = (e: PointerEvent) => {
      if (e.button !== 0) return;
      viewport.setLeftDragRotate(!hitTexel(e));
    };
    container.addEventListener("pointerdown", onDownCapture, true);

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const hit = hitTexel(e);
      if (!hit) return;
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      painting = true;
      lastHit = hit;
      beginStroke(hit.x, hit.y);
    };
    const onMove = (e: PointerEvent) => {
      if (!painting) return;
      const hit = hitTexel(e);
      if (!hit) return;
      const seamCrossed = lastHit
        && (hit.object !== lastHit.object || Math.hypot(hit.x - lastHit.x, hit.y - lastHit.y) > SEAM_JUMP_TEXELS);
      if (seamCrossed) breakStroke();
      moveStroke(hit.x, hit.y);
      lastHit = hit;
    };
    const onUp = () => {
      if (!painting) return;
      painting = false;
      lastHit = null;
      endStroke();
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    return () => {
      container.removeEventListener("pointerdown", onDownCapture, true);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      disposePixelGridOverlay(pixelGrid);
      model.dispose();
      viewport.dispose();
      stateRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Repaint the texture whenever layers change.
  useSignalEffect(() => {
    const s = stateRef.current;
    const list = layers.value;
    if (!s) return;
    const pixels = composite(list);
    s.compositePixels = pixels;
    s.sourceCtx.putImageData(new ImageData(pixels, 64, 64), 0, 0);
    s.model.markTextureDirty();
  });

  // Model type (steve/alex) — rebuild pixel grid since arm geometry changes.
  useSignalEffect(() => {
    const s = stateRef.current;
    const mt = modelType.value;
    if (!s) return;
    s.model.setModelType(mt);
    disposePixelGridOverlay(s.pixelGrid);
    s.pixelGrid = makePixelGridOverlay(s.model.player);
    applyVisibility();
  });

  // Part / layer-group / pixel-grid visibility (subscribes to all three).
  useSignalEffect(() => {
    void partVisible.value;
    void layerGroupVisible.value;
    void showPixelGrid.value;
    applyVisibility();
  });

  useSignalEffect(() => {
    const s = stateRef.current;
    if (s) s.floorGrid.visible = showFloorGrid.value;
  });

  useEffect(() => {
    stateRef.current?.viewport.setMode(cameraMode);
  }, [cameraMode]);

  const selectView = (v: ViewPreset) => {
    const s = stateRef.current;
    if (!s) return;
    // Axis-aligned presets are for reading proportions, so they imply an
    // orthographic projection; setMode is a no-op when already there.
    s.viewport.setMode("orthographic");
    setCameraMode("orthographic");
    s.viewport.setView(v);
  };

  return (
    <div class="viewport3d">
      <div class="viewport3d-toolbar">
        <button
          class={cameraMode === "perspective" ? "active" : ""}
          onClick={() => setCameraMode("perspective")}
        >
          Perspective
        </button>
        <button
          class={cameraMode === "orthographic" ? "active" : ""}
          onClick={() => setCameraMode("orthographic")}
        >
          Orthographic
        </button>
        <span class="sep" />
        <select
          class="view-select"
          value=""
          onChange={e => {
            const sel = e.target as HTMLSelectElement;
            if (sel.value) selectView(sel.value as ViewPreset);
            sel.value = "";
          }}
        >
          <option value="" disabled>View…</option>
          <option value="front">Front</option>
          <option value="back">Back</option>
          <option value="left">Left</option>
          <option value="right">Right</option>
          <option value="top">Top</option>
          <option value="bottom">Bottom</option>
        </select>
        <span class="sep" />
        <label>
          <input type="checkbox" checked={showFloorGrid.value} onChange={e => (showFloorGrid.value = (e.target as HTMLInputElement).checked)} />
          Floor grid
        </label>
        <label>
          <input type="checkbox" checked={showPixelGrid.value} onChange={e => (showPixelGrid.value = (e.target as HTMLInputElement).checked)} />
          Pixel grid
        </label>
      </div>
      <div class="viewport3d-canvas" ref={containerRef} />
    </div>
  );
}
