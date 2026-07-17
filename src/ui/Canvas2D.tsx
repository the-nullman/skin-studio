import { useEffect, useRef, useState } from "preact/hooks";
import { useSignalEffect } from "@preact/signals";
import { layers, modelType, type RGBA } from "../core/document";
import { composite } from "../core/compositor";
import { allFaceRects, W, H } from "../core/skinLayout";
import { beginStroke, moveStroke, endStroke } from "../core/strokeEngine";

const MIN_ZOOM = 2;
const MAX_ZOOM = 32;

export function Canvas2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pixelsRef = useRef<RGBA>(new Uint8ClampedArray(W * H * 4));
  const [zoom, setZoom] = useState(10);
  const [offset, setOffset] = useState({ x: 20, y: 20 });
  const [showGrid, setShowGrid] = useState(true);
  const [showOutlines, setShowOutlines] = useState(true);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const paintingRef = useRef(false);

  const draw = () => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = Math.min(devicePixelRatio, 2);
    const cw = wrap.clientWidth, ch = wrap.clientHeight;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    canvas.style.width = cw + "px";
    canvas.style.height = ch + "px";
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#2b2b2f";
    ctx.fillRect(0, 0, cw, ch);

    // checkerboard behind the texture
    const tile = Math.max(4, zoom / 2);
    ctx.save();
    ctx.beginPath();
    ctx.rect(offset.x, offset.y, W * zoom, H * zoom);
    ctx.clip();
    for (let y = 0; y < H * zoom; y += tile) {
      for (let x = 0; x < W * zoom; x += tile) {
        const even = (Math.floor(x / tile) + Math.floor(y / tile)) % 2 === 0;
        ctx.fillStyle = even ? "#3a3a40" : "#333338";
        ctx.fillRect(offset.x + x, offset.y + y, tile, tile);
      }
    }
    ctx.restore();

    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    off.getContext("2d")!.putImageData(new ImageData(pixelsRef.current, W, H), 0, 0);
    ctx.drawImage(off, offset.x, offset.y, W * zoom, H * zoom);

    if (showOutlines) {
      ctx.strokeStyle = "rgba(120,180,255,0.55)";
      ctx.lineWidth = 1;
      for (const r of allFaceRects(modelType.value)) {
        ctx.strokeRect(offset.x + r.x * zoom + 0.5, offset.y + r.y * zoom + 0.5, r.w * zoom, r.h * zoom);
      }
    }

    if (showGrid && zoom >= 6) {
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x++) {
        ctx.beginPath();
        ctx.moveTo(offset.x + x * zoom + 0.5, offset.y);
        ctx.lineTo(offset.x + x * zoom + 0.5, offset.y + H * zoom);
        ctx.stroke();
      }
      for (let y = 0; y <= H; y++) {
        ctx.beginPath();
        ctx.moveTo(offset.x, offset.y + y * zoom + 0.5);
        ctx.lineTo(offset.x + W * zoom, offset.y + y * zoom + 0.5);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.strokeRect(offset.x + 0.5, offset.y + 0.5, W * zoom, H * zoom);

    if (hover && hover.x >= 0 && hover.x < W && hover.y >= 0 && hover.y < H) {
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1;
      ctx.strokeRect(offset.x + hover.x * zoom + 0.5, offset.y + hover.y * zoom + 0.5, zoom - 1, zoom - 1);
    }
  };

  useSignalEffect(() => {
    const list = layers.value;
    pixelsRef.current = composite(list, pixelsRef.current);
    draw();
  });

  useEffect(() => {
    const ro = new ResizeObserver(draw);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, offset, showGrid, showOutlines, hover]);

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const texX = (mx - offset.x) / zoom, texY = (my - offset.y) / zoom;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
    setOffset({ x: mx - texX * next, y: my - texY * next });
    setZoom(next);
  };

  const toTexel = (e: PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    return { x: (mx - offset.x) / zoom, y: (my - offset.y) / zoom };
  };

  const onPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    if (e.button === 1 || e.button === 2) {
      dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
      return;
    }
    if (e.button === 0) {
      const t = toTexel(e);
      paintingRef.current = true;
      beginStroke(t.x, t.y);
    }
  };
  const onPointerMove = (e: PointerEvent) => {
    if (dragRef.current) {
      const d = dragRef.current;
      setOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) });
      return;
    }
    const t = toTexel(e);
    setHover({ x: Math.floor(t.x), y: Math.floor(t.y) });
    if (paintingRef.current) moveStroke(t.x, t.y);
  };
  const onPointerUp = () => {
    dragRef.current = null;
    if (paintingRef.current) {
      paintingRef.current = false;
      endStroke();
    }
  };
  const onPointerLeave = () => setHover(null);

  return (
    <div class="canvas2d">
      <div class="canvas2d-toolbar">
        <button onClick={() => { setZoom(10); setOffset({ x: 20, y: 20 }); }}>Reset view</button>
        <label>
          <input type="checkbox" checked={showGrid} onChange={e => setShowGrid((e.target as HTMLInputElement).checked)} />
          Grid
        </label>
        <label>
          <input type="checkbox" checked={showOutlines} onChange={e => setShowOutlines((e.target as HTMLInputElement).checked)} />
          Part outlines
        </label>
        <span class="zoom-readout">{Math.round(zoom * 100 / 10)}%</span>
      </div>
      <div class="canvas2d-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerLeave}
          onContextMenu={(e: MouseEvent) => e.preventDefault()}
        />
      </div>
    </div>
  );
}
