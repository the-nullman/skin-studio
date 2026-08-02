import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { raycastTexel } from "./paint3d";

// raycastTexel only calls getBoundingClientRect on the canvas, so a stub is
// enough to drive it headlessly.
const CANVAS = {
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
} as HTMLCanvasElement;

function plate(z: number, name: string, opts: { transparent?: boolean } = {}) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(4, 4, 1),
    new THREE.MeshBasicMaterial(opts.transparent ? { transparent: true, alphaTest: 1e-5 } : {}),
  );
  mesh.position.z = z;
  mesh.name = name;
  return mesh;
}

function camera() {
  const cam = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
  cam.position.set(0, 0, 20);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld();
  return cam;
}

describe("raycastTexel visibility", () => {
  it("skips meshes hidden through an ancestor group, not just their own flag", () => {
    // skinview3d hides the cape by toggling its parent group; the mesh itself
    // stays visible:true. Before this was handled, the hidden cape sat between
    // the camera and the model's back and swallowed every click there.
    const root = new THREE.Group();
    const capeGroup = new THREE.Group();
    capeGroup.visible = false;
    capeGroup.add(plate(2, "cape"));
    root.add(capeGroup, plate(-2, "body"));
    root.updateMatrixWorld(true);

    const hit = raycastTexel(50, 50, CANVAS, camera(), root);
    expect(hit?.object.name).toBe("body");
  });

  it("still returns the nearest surface when nothing is hidden", () => {
    const root = new THREE.Group();
    root.add(plate(2, "near"), plate(-2, "far"));
    root.updateMatrixWorld(true);

    const hit = raycastTexel(50, 50, CANVAS, camera(), root);
    expect(hit?.object.name).toBe("near");
  });

  it("passes through a transparent texel on an alpha-tested layer", () => {
    const root = new THREE.Group();
    root.add(plate(2, "overlay", { transparent: true }), plate(-2, "body"));
    root.updateMatrixWorld(true);

    // Report the overlay's texel as fully transparent — the eye sees through it.
    const hit = raycastTexel(50, 50, CANVAS, camera(), root, () => 0);
    expect(hit?.object.name).toBe("body");
  });

  it("never reports a back-facing interior surface", () => {
    // A single double-sided box: the ray enters the front and exits the back.
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(4, 4, 4),
      new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
    );
    box.name = "shell";
    const root = new THREE.Group();
    root.add(box);
    root.updateMatrixWorld(true);

    const hit = raycastTexel(50, 50, CANVAS, camera(), root)!;
    expect(hit).not.toBeNull();
    // The near (+z) face maps to the box's front UV region, not the far face.
    expect(hit.object.name).toBe("shell");
  });
});
