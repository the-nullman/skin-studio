import * as THREE from "three";
import { W, H } from "../core/skinLayout";

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const normalMatrix = new THREE.Matrix3();
const worldNormal = new THREE.Vector3();

export interface TexelHit {
  x: number;
  y: number;
  object: THREE.Object3D;
}

/**
 * True only when the object *and* every ancestor is visible. skinview3d hides
 * the cape and elytra by toggling their parent group, so those meshes keep
 * `visible === true` themselves. Checking the leaf alone let the hidden cape —
 * which hangs behind the body — intercept every click on the model's back, and
 * since its UVs unwrap to the texture's top-left it dropped that paint on the
 * head. Ancestors must be walked.
 */
function isVisible(obj: THREE.Object3D | null): boolean {
  for (let o: THREE.Object3D | null = obj; o; o = o.parent) {
    if (!o.visible) return false;
  }
  return true;
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
 * True when the hit surface faces the camera. The outer-layer meshes are
 * DoubleSide, so a ray that passes through a transparent near face keeps
 * going and also registers hits on the *inside* of the far wall — which is
 * how clicking the model's back used to drop paint on its front (or on a
 * completely unrelated part further along the ray). Interior surfaces are
 * never what the user is pointing at, so they're rejected outright.
 */
function isFrontFacing(hit: THREE.Intersection, rayDir: THREE.Vector3): boolean {
  if (!hit.face) return true;
  normalMatrix.getNormalMatrix(hit.object.matrixWorld);
  worldNormal.copy(hit.face.normal).applyMatrix3(normalMatrix).normalize();
  return worldNormal.dot(rayDir) < 0;
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
  // A pointer event can land before the next animation frame has refreshed
  // the camera (e.g. clicking right after a view preset moves it). The
  // raycaster reads matrixWorld, so refresh it here rather than trusting the
  // render loop to have run since the camera last moved.
  camera.updateMatrixWorld();
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(target, true);
  let fallback: TexelHit | null = null;
  for (const hit of hits) {
    if (!isVisible(hit.object) || !hit.uv) continue;
    if (!isFrontFacing(hit, raycaster.ray.direction)) continue;
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
