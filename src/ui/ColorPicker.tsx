import { useEffect, useRef, useState } from "preact/hooks";
import { signal, useSignalEffect } from "@preact/signals";
import { primaryColor } from "../core/toolState";
import { hsvToRgb255, hsvToRgba, rgbaToHsv, rgbaToHsl, hslToRgba, rgbaToHex, hexToRgba } from "../core/color";

// The picker fills the panel's width so it grows when the tool strip is
// dragged wider. Clamped at both ends: the SV triangle is rasterized per
// pixel on every color change, so an unbounded size gets expensive.
const SIZE_MIN = 130;
const SIZE_MAX = 320;
const RING_FRACTION = 14 / 148;

function geometry(size: number) {
  const outerR = size / 2 - 1;
  const ringW = Math.max(10, size * RING_FRACTION);
  const innerR = outerR - ringW;
  return { outerR, ringW, innerR, triR: innerR - 4, midR: (outerR + innerR) / 2 };
}

// The picker owns the hue: greys/black/white have no derivable hue, so the
// last chosen hue must survive primaryColor round-trips through such colors.
const pickerHue = signal(0);

const rad = (deg: number) => (deg * Math.PI) / 180;

function triVertices(h: number, r: number, cx: number, cy: number) {
  // Hue vertex at the hue's ring angle; white and black at +/-120deg.
  const at = (deg: number): [number, number] => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))];
  return { vh: at(h), vw: at(h + 120), vb: at(h - 120) };
}

/**
 * Barycentric weights of point p in triangle (vh, vw, vb). In this triangle
 * an HSV color sits at weights (hue, white, black) = (s*v, (1-s)*v, 1-v),
 * which inverts to v = 1-wb and s = wh/v.
 */
function baryWeights(px: number, py: number, vh: [number, number], vw: [number, number], vb: [number, number]) {
  const [x1, y1] = vh, [x2, y2] = vw, [x3, y3] = vb;
  const denom = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
  const wh = ((y2 - y3) * (px - x3) + (x3 - x2) * (py - y3)) / denom;
  const ww = ((y3 - y1) * (px - x3) + (x1 - x3) * (py - y3)) / denom;
  return { wh, ww, wb: 1 - wh - ww };
}

function draw(canvas: HTMLCanvasElement, size: number, h: number, s: number, v: number) {
  const { ringW, triR, midR } = geometry(size);
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const px = Math.round(size * dpr);
  if (canvas.width !== px) {
    canvas.width = px;
    canvas.height = px;
  }
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);

  const c = size / 2;
  for (let a = 0; a < 360; a += 3) {
    ctx.beginPath();
    ctx.arc(c, c, midR, rad(a - 2), rad(a + 2.2));
    ctx.strokeStyle = `hsl(${a},100%,50%)`;
    ctx.lineWidth = ringW;
    ctx.stroke();
  }

  // SV triangle, rendered per-pixel in device space.
  const { vh, vw, vb } = triVertices(h, triR * dpr, c * dpr, c * dpr);
  const img = ctx.getImageData(0, 0, px, px);
  const data = img.data;
  const lo = Math.max(0, Math.floor((c - triR) * dpr));
  const hi = Math.min(px - 1, Math.ceil((c + triR) * dpr));
  for (let y = lo; y <= hi; y++) {
    for (let x = lo; x <= hi; x++) {
      const { wh, ww, wb } = baryWeights(x + 0.5, y + 0.5, vh, vw, vb);
      if (wh < 0 || ww < 0 || wb < 0) continue;
      const pv = 1 - wb;
      const ps = pv <= 0 ? 0 : Math.min(1, wh / pv);
      const [r, g, b] = hsvToRgb255(h, ps, pv);
      const i = (y * px + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const marker = (x: number, y: number, r: number) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  };
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const markerR = Math.max(4, size * 0.03);
  marker(c + midR * Math.cos(rad(h)), c + midR * Math.sin(rad(h)), markerR);
  const tv = triVertices(h, triR, c, c);
  const mx = s * v * tv.vh[0] + (1 - s) * v * tv.vw[0] + (1 - v) * tv.vb[0];
  const my = s * v * tv.vh[1] + (1 - s) * v * tv.vw[1] + (1 - v) * tv.vb[1];
  marker(mx, my, markerR - 0.5);
}

/** Current HSV with the picker's sticky hue filled in for greys. */
function currentHsv() {
  const { h, s, v } = rgbaToHsv(primaryColor.value);
  return { h: h ?? pickerHue.value, s, v };
}

function rgbaCss([r, g, b, a]: [number, number, number, number]) {
  return `rgba(${r},${g},${b},${a / 255})`;
}

function SliderRow(props: { label: string; max: number; value: number; onInput: (v: number) => void }) {
  return (
    <label class="slider-row">
      <span class="lbl">{props.label}</span>
      <input
        type="range"
        min={0}
        max={props.max}
        value={props.value}
        onInput={e => props.onInput(Number((e.target as HTMLInputElement).value))}
      />
      <span class="val">{props.value}</span>
    </label>
  );
}

export function ColorPicker() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<"hue" | "sv" | null>(null);
  const [size, setSize] = useState(148);
  // Pointer handlers bind once, so they read the live size from a ref.
  const sizeRef = useRef(148);

  // Track the panel width so the picker grows with a dragged splitter.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => {
      const w = wrap.clientWidth;
      if (!w) return;
      const next = Math.round(Math.max(SIZE_MIN, Math.min(SIZE_MAX, w)));
      if (next === sizeRef.current) return;
      sizeRef.current = next;
      setSize(next);
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // Adopt the hue of externally chosen colors (swatches, eyedropper, hex).
  useSignalEffect(() => {
    const { h, s, v } = rgbaToHsv(primaryColor.value);
    if (h !== undefined && s > 0.001 && v > 0.001) pickerHue.value = h;
  });

  useSignalEffect(() => {
    const hue = pickerHue.value;
    const hsv = rgbaToHsv(primaryColor.value);
    const canvas = canvasRef.current;
    if (!canvas) return;
    draw(canvas, sizeRef.current, hsv.h ?? hue, hsv.s, hsv.v);
  });

  // Redraw at the new scale when the panel is resized.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const hsv = rgbaToHsv(primaryColor.peek());
    draw(canvas, size, hsv.h ?? pickerHue.peek(), hsv.s, hsv.v);
  }, [size]);

  useEffect(() => {
    const canvas = canvasRef.current!;

    const pointOf = (e: PointerEvent): [number, number] => {
      const rect = canvas.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    };

    const apply = (e: PointerEvent) => {
      const s0 = sizeRef.current;
      const { triR } = geometry(s0);
      const [x, y] = pointOf(e);
      const cx = x - s0 / 2, cy = y - s0 / 2;
      const alpha = primaryColor.value[3];
      if (dragRef.current === "hue") {
        const h = ((Math.atan2(cy, cx) * 180) / Math.PI + 360) % 360;
        const { s, v } = currentHsv();
        pickerHue.value = h;
        primaryColor.value = hsvToRgba(h, s, v, alpha);
      } else if (dragRef.current === "sv") {
        const h = currentHsv().h;
        const { vh, vw, vb } = triVertices(h, triR, s0 / 2, s0 / 2);
        const w = baryWeights(x, y, vh, vw, vb);
        const wb = Math.min(1, Math.max(0, w.wb));
        const wh = Math.min(1, Math.max(0, w.wh));
        const v = 1 - wb;
        const s = v <= 0 ? 0 : Math.min(1, wh / v);
        primaryColor.value = hsvToRgba(h, s, v, alpha);
      }
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const s0 = sizeRef.current;
      const { outerR, innerR, triR } = geometry(s0);
      const [x, y] = pointOf(e);
      const r = Math.hypot(x - s0 / 2, y - s0 / 2);
      if (r >= innerR - 1 && r <= outerR + 3) dragRef.current = "hue";
      else if (r < innerR) {
        const { h } = currentHsv();
        const { vh, vw, vb } = triVertices(h, triR, s0 / 2, s0 / 2);
        const w = baryWeights(x, y, vh, vw, vb);
        if (w.wh < -0.08 || w.ww < -0.08 || w.wb < -0.08) return;
        dragRef.current = "sv";
      } else return;
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      apply(e);
    };
    const onMove = (e: PointerEvent) => {
      if (dragRef.current) apply(e);
    };
    const onUp = () => (dragRef.current = null);

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const color = primaryColor.value;
  const alpha = color[3];
  const rgbVals = [color[0], color[1], color[2]];
  const hslRaw = rgbaToHsl(color);
  const hsl = { h: hslRaw.h ?? pickerHue.value, s: hslRaw.s, l: hslRaw.l };

  const setChannel = (i: number, v: number) => {
    const next = [...color] as typeof color;
    next[i] = v;
    primaryColor.value = next;
  };

  const applyHex = (input: HTMLInputElement) => {
    const parsed = hexToRgba(input.value, alpha);
    if (parsed) primaryColor.value = parsed;
    else input.value = rgbaToHex(color);
  };

  return (
    <div class="color-picker" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        class="picker-canvas"
        style={{ width: size, height: size }}
      />
      <div class="hex-row">
        <input
          class="hex-input"
          value={rgbaToHex(color)}
          onChange={e => applyHex(e.target as HTMLInputElement)}
          onKeyDown={e => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
        <div class="color-preview-sm" style={{ background: rgbaCss(color) }} />
      </div>
      <h3>RGB</h3>
      {(["R", "G", "B"] as const).map((label, i) => (
        <SliderRow key={label} label={label} max={255} value={rgbVals[i]} onInput={v => setChannel(i, v)} />
      ))}
      <h3>HSL</h3>
      <SliderRow
        label="H"
        max={360}
        value={Math.round(hsl.h)}
        onInput={v => {
          pickerHue.value = v;
          primaryColor.value = hslToRgba(v, hsl.s, hsl.l, alpha);
        }}
      />
      <SliderRow
        label="S"
        max={100}
        value={Math.round(hsl.s * 100)}
        onInput={v => (primaryColor.value = hslToRgba(hsl.h, v / 100, hsl.l, alpha))}
      />
      <SliderRow
        label="L"
        max={100}
        value={Math.round(hsl.l * 100)}
        onInput={v => (primaryColor.value = hslToRgba(hsl.h, hsl.s, v / 100, alpha))}
      />
    </div>
  );
}
