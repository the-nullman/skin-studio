import * as THREE from "three";
import type { PlayerObject } from "skinview3d";
import { PART_NAMES, type PartName, type SkinLayer } from "../core/skinLayout";
import { bodyPartFor } from "./playerModel";

/** Floor grid beneath the model. */
export function makeFloorGrid(): THREE.GridHelper {
  const grid = new THREE.GridHelper(32, 16, 0x888888, 0x444444);
  grid.position.y = -8;
  return grid;
}

type Axis = 0 | 1 | 2;

function addFaceLines(points: number[], size: [number, number, number], uAxis: Axis, vAxis: Axis, nAxis: Axis, nSign: 1 | -1) {
  const half: [number, number, number] = [size[0] / 2, size[1] / 2, size[2] / 2];
  const nVal = half[nAxis] * nSign;
  // Overlay (outer-layer) boxes are inflated by a fractional amount (e.g.
  // 8.5 units) so they're not integer pixel-sized; spacing lines
  // proportionally across [-half, +half] (rather than at unit offsets from
  // the rounded count) guarantees they never overshoot the box's true edge.
  const uCount = Math.max(1, Math.round(size[uAxis]));
  const vCount = Math.max(1, Math.round(size[vAxis]));
  for (let i = 0; i <= uCount; i++) {
    const u = -half[uAxis] + (i / uCount) * size[uAxis];
    const p0 = [0, 0, 0], p1 = [0, 0, 0];
    p0[uAxis] = p1[uAxis] = u;
    p0[nAxis] = p1[nAxis] = nVal;
    p0[vAxis] = -half[vAxis];
    p1[vAxis] = half[vAxis];
    points.push(...p0, ...p1);
  }
  for (let j = 0; j <= vCount; j++) {
    const v = -half[vAxis] + (j / vCount) * size[vAxis];
    const p0 = [0, 0, 0], p1 = [0, 0, 0];
    p0[vAxis] = p1[vAxis] = v;
    p0[nAxis] = p1[nAxis] = nVal;
    p0[uAxis] = -half[uAxis];
    p1[uAxis] = half[uAxis];
    points.push(...p0, ...p1);
  }
}

/** Wireframe with a line at every texel boundary on all 6 faces of a w*h*d box. */
function boxPixelGrid(size: [number, number, number]): THREE.LineSegments {
  const points: number[] = [];
  addFaceLines(points, size, 1, 2, 0, 1);
  addFaceLines(points, size, 1, 2, 0, -1);
  addFaceLines(points, size, 0, 2, 1, 1);
  addFaceLines(points, size, 0, 2, 1, -1);
  addFaceLines(points, size, 0, 1, 2, 1);
  addFaceLines(points, size, 0, 1, 2, -1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  return new THREE.LineSegments(
    geo,
    new THREE.LineBasicMaterial({ color: 0x151515, transparent: true, opacity: 0.4, depthTest: true }),
  );
}

export interface PixelGridWire {
  wire: THREE.LineSegments;
  part: PartName;
  layer: SkinLayer;
}
export type PixelGridOverlay = PixelGridWire[];

/**
 * Builds a per-pixel wireframe overlay for each body part's inner and outer
 * box mesh, tagged with its part/layer so visibility can follow the part
 * toggles. Each wireframe is added as a sibling of its mesh (child of
 * mesh.parent, NOT of a separate tracking group — Object3D.add() reparents,
 * so collecting the wires into a returned group would silently move them out
 * of the model's local coordinate space and misalign them from the mesh).
 * mesh.scale on arms/legs (skinview3d scales unit boxes rather than sizing
 * geometry) means final box size must be computed from geometry params *
 * mesh.scale.
 */
export function makePixelGridOverlay(player: PlayerObject): PixelGridOverlay {
  const wires: PixelGridOverlay = [];
  for (const part of PART_NAMES) {
    const bodyPart = bodyPartFor(player, part);
    for (const layer of ["inner", "outer"] as SkinLayer[]) {
      const mesh = (layer === "inner" ? bodyPart.innerLayer : bodyPart.outerLayer) as THREE.Mesh;
      const geo = mesh.geometry as THREE.BoxGeometry;
      if (!geo?.parameters) continue;
      const size: [number, number, number] = [
        geo.parameters.width * mesh.scale.x,
        geo.parameters.height * mesh.scale.y,
        geo.parameters.depth * mesh.scale.z,
      ];
      const wire = boxPixelGrid(size);
      wire.position.copy(mesh.position);
      wire.rotation.copy(mesh.rotation);
      wire.renderOrder = 10;
      mesh.parent?.add(wire);
      wires.push({ wire, part, layer });
    }
  }
  return wires;
}

export function disposePixelGridOverlay(overlay: PixelGridOverlay) {
  for (const { wire } of overlay) {
    wire.parent?.remove(wire);
    wire.geometry.dispose();
    (wire.material as THREE.Material).dispose();
  }
}

/**
 * Per part, the grid follows the outermost visible skin layer: the outer
 * wireframe when that part's outer layer shows, otherwise the inner one —
 * never both at once (they'd z-fight visually since the boxes are nested).
 */
export function updatePixelGridVisibility(
  overlay: PixelGridOverlay,
  showGrid: boolean,
  partVisible: Record<SkinLayer, Record<PartName, boolean>>,
  layerGroupVisible: Record<SkinLayer, boolean>,
) {
  for (const { wire, part, layer } of overlay) {
    const outerShown = layerGroupVisible.outer && partVisible.outer[part];
    const innerShown = layerGroupVisible.inner && partVisible.inner[part];
    wire.visible = showGrid && (layer === "outer" ? outerShown : innerShown && !outerShown);
  }
}
