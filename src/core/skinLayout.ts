// 64x64 skin texture layout. Face rects are derived from each part's box
// unwrap: for a box of size (w,h,d) at origin (ox,oy):
//   top(ox+d,oy,w,d) bottom(ox+d+w,oy,w,d)
//   right(ox,oy+d,d,h) front(ox+d,oy+d,w,h) left(ox+d+w,oy+d,d,h) back(ox+2d+w,oy+d,w,h)

export const W = 64;
export const H = 64;

export type ModelType = "default" | "slim";
export type PartName = "head" | "body" | "rightArm" | "leftArm" | "rightLeg" | "leftLeg";
export type SkinLayer = "inner" | "outer";
export type FaceName = "top" | "bottom" | "right" | "front" | "left" | "back";

export interface FaceRect {
  part: PartName;
  layer: SkinLayer;
  face: FaceName;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PartDef {
  name: PartName;
  label: string;
  size: (m: ModelType) => [number, number, number]; // w,h,d in px
  inner: [number, number];
  outer: [number, number];
}

export const PART_DEFS: PartDef[] = [
  { name: "head", label: "Head", size: () => [8, 8, 8], inner: [0, 0], outer: [32, 0] },
  { name: "body", label: "Body", size: () => [8, 12, 4], inner: [16, 16], outer: [16, 32] },
  { name: "rightArm", label: "Right Arm", size: m => [m === "slim" ? 3 : 4, 12, 4], inner: [40, 16], outer: [40, 32] },
  { name: "leftArm", label: "Left Arm", size: m => [m === "slim" ? 3 : 4, 12, 4], inner: [32, 48], outer: [48, 48] },
  { name: "rightLeg", label: "Right Leg", size: () => [4, 12, 4], inner: [0, 16], outer: [0, 32] },
  { name: "leftLeg", label: "Left Leg", size: () => [4, 12, 4], inner: [16, 48], outer: [0, 48] },
];

export const PART_NAMES: PartName[] = PART_DEFS.map(p => p.name);
export const PART_LABELS: Record<PartName, string> = Object.fromEntries(
  PART_DEFS.map(p => [p.name, p.label]),
) as Record<PartName, string>;

function boxFaces(part: PartDef, layer: SkinLayer, m: ModelType): FaceRect[] {
  const [w, h, d] = part.size(m);
  const [ox, oy] = layer === "inner" ? part.inner : part.outer;
  const f = (face: FaceName, x: number, y: number, fw: number, fh: number): FaceRect => ({
    part: part.name, layer, face, x, y, w: fw, h: fh,
  });
  return [
    f("top", ox + d, oy, w, d),
    f("bottom", ox + d + w, oy, w, d),
    f("right", ox, oy + d, d, h),
    f("front", ox + d, oy + d, w, h),
    f("left", ox + d + w, oy + d, d, h),
    f("back", ox + 2 * d + w, oy + d, w, h),
  ];
}

const faceCache = new Map<ModelType, FaceRect[]>();

export function allFaceRects(m: ModelType): FaceRect[] {
  let r = faceCache.get(m);
  if (!r) {
    r = PART_DEFS.flatMap(p => (["inner", "outer"] as SkinLayer[]).flatMap(l => boxFaces(p, l, m)));
    faceCache.set(m, r);
  }
  return r;
}

const maskCache = new Map<ModelType, Uint8Array>();

/** 1 where the pixel belongs to some face, 0 for dead pixels. */
export function validMask(m: ModelType): Uint8Array {
  let mask = maskCache.get(m);
  if (!mask) {
    mask = new Uint8Array(W * H);
    for (const r of allFaceRects(m)) {
      for (let y = r.y; y < r.y + r.h; y++)
        for (let x = r.x; x < r.x + r.w; x++) mask[y * W + x] = 1;
    }
    maskCache.set(m, mask);
  }
  return mask;
}

export function faceRectAt(x: number, y: number, m: ModelType): FaceRect | null {
  for (const r of allFaceRects(m)) {
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r;
  }
  return null;
}

/** Set of texel indices belonging to a part+layer (the whole unwrapped cross). */
export function partTexels(part: PartName, layer: SkinLayer, m: ModelType): Uint8Array {
  const set = new Uint8Array(W * H);
  for (const r of allFaceRects(m)) {
    if (r.part !== part || r.layer !== layer) continue;
    for (let y = r.y; y < r.y + r.h; y++)
      for (let x = r.x; x < r.x + r.w; x++) set[y * W + x] = 1;
  }
  return set;
}

/** Bounding box of a part+layer region in the texture (for 2D labels/outlines). */
export function partBounds(part: PartName, layer: SkinLayer, m: ModelType) {
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (const r of allFaceRects(m)) {
    if (r.part !== part || r.layer !== layer) continue;
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
