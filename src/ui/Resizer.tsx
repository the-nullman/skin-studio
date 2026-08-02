import { useRef } from "preact/hooks";

interface ResizerProps {
  /** Custom property written on the handle's parent, e.g. "--left-w". */
  cssVar: string;
  min: number;
  max: number;
  /** Resize the sibling *after* the handle instead of the one before it. */
  trailing?: boolean;
}

/**
 * A drag handle that sits between two grid columns and resizes the adjacent
 * pane by writing a pixel width into a CSS custom property on the parent.
 * Panes read that property in their `grid-template-columns`, so the layout —
 * not this component — decides which track the value drives.
 */
export function Resizer({ cssVar, min, max, trailing = false }: ResizerProps) {
  const drag = useRef<{ startX: number; startW: number } | null>(null);

  const onPointerDown = (e: PointerEvent) => {
    const handle = e.currentTarget as HTMLElement;
    const pane = (trailing ? handle.nextElementSibling : handle.previousElementSibling) as HTMLElement | null;
    if (!pane) return;
    drag.current = { startX: e.clientX, startW: pane.getBoundingClientRect().width };
    handle.setPointerCapture(e.pointerId);
    handle.classList.add("dragging");
    e.preventDefault();
  };

  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const handle = e.currentTarget as HTMLElement;
    // Dragging a trailing handle left must *grow* the pane on its right.
    const dx = (e.clientX - d.startX) * (trailing ? -1 : 1);
    const w = Math.max(min, Math.min(max, d.startW + dx));
    handle.parentElement?.style.setProperty(cssVar, `${w}px`);
  };

  const onPointerUp = (e: PointerEvent) => {
    drag.current = null;
    const handle = e.currentTarget as HTMLElement;
    handle.classList.remove("dragging");
    handle.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      class="resizer"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}
