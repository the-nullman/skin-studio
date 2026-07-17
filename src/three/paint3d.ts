import * as THREE from "three";
import { W, H } from "../core/skinLayout";

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

export interface TexelHit {
  x: number;
  y: number;
  object: THREE.Object3D;
}

/** skinview3d's outer-layer meshes are alpha-tested (transparent texels are
 * true holes); inner-layer meshes are opaque and render transparent texels
 * as solid black, so they are always a real, visible surface. */
function isAlphaTested(obj: THREE.Object3D): boolean {
  const mat = (obj as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
  const m = Array.isArray(mat) ? mat[0] : mat;
  return !!m && (m.transparent || m.alphaTest > 0);
}

/**
 * Raycasts from a client-space pointer event into the model, returning the hit
 * texel (in 64x64 texture space) of the nearest surface the user can actually
 * see: a hit on an alpha-tested layer whose texel is fully transparent is a
 * hole the eye looks straight through, so the ray continues to the surface
 * behind it. When nothing opaque is struck at all, falls back to the nearest
 * visible hit so a fresh (blank) outer layer can still be painted.
 */
export function raycastTexel(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  camera: THREE.Camera,
  target: THREE.Object3D,
  alphaAt?: (x: number, y: number) => number,
): TexelHit | null {
  const rect = canvas.getBoundingClientRect();
  ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(target, true);
  let fallback: TexelHit | null = null;
  for (const hit of hits) {
    if (!hit.object.visible || !hit.uv) continue;
    const texel = { x: hit.uv.x * W, y: (1 - hit.uv.y) * H, object: hit.object };
    if (alphaAt && isAlphaTested(hit.object)) {
      const tx = Math.min(W - 1, Math.max(0, Math.floor(texel.x)));
      const ty = Math.min(H - 1, Math.max(0, Math.floor(texel.y)));
      if (alphaAt(tx, ty) === 0) {
        fallback ??= texel;
        continue;
      }
    }
    return texel;
  }
  return fallback;
}
