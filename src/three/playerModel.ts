import * as THREE from "three";
import { PlayerObject } from "skinview3d";
import type { BodyPart } from "skinview3d";
import type { ModelType, PartName, SkinLayer } from "../core/skinLayout";
import { W, H, PART_NAMES } from "../core/skinLayout";

export function bodyPartFor(player: PlayerObject, part: PartName): BodyPart {
  switch (part) {
    case "head": return player.skin.head;
    case "body": return player.skin.body;
    case "rightArm": return player.skin.rightArm;
    case "leftArm": return player.skin.leftArm;
    case "rightLeg": return player.skin.rightLeg;
    case "leftLeg": return player.skin.leftLeg;
  }
}

export class PlayerModel {
  readonly player = new PlayerObject();
  readonly texture: THREE.CanvasTexture;

  constructor(canvas: HTMLCanvasElement) {
    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.player.skin.map = this.texture;
    // skinview3d maps the skin's "front" UV rect onto each box's +Z face, so
    // the model natively faces +Z — the same side the default camera and the
    // "Front" view preset sit on. Do NOT rotate the player here, or every
    // view preset shows the opposite side of the model from its label.
    this.player.position.y = 8;
    // We don't support capes/elytra; skinview3d's PlayerObject adds an
    // untextured (white) cape mesh visible by default, overlapping the torso.
    this.player.cape.visible = false;
    this.player.elytra.visible = false;
    // skinview3d gives the inner (body) layer a fully opaque material, so a
    // texel erased to alpha 0 renders as solid *black* on the model instead of
    // reading as empty. Alpha-test it the same way the outer layer already is,
    // and the eraser cuts real holes — matching the 2D view's checkerboard.
    for (const part of PART_NAMES) {
      const mesh = bodyPartFor(this.player, part).innerLayer as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.transparent = true;
      mat.alphaTest = 1e-5;
      mat.needsUpdate = true;
    }
  }

  setModelType(m: ModelType) {
    this.player.skin.modelType = m;
  }

  setPartVisible(part: PartName, layer: SkinLayer, visible: boolean) {
    const bodyPart = bodyPartFor(this.player, part);
    (layer === "inner" ? bodyPart.innerLayer : bodyPart.outerLayer).visible = visible;
  }

  setLayerGroupVisible(layer: SkinLayer, visible: boolean) {
    if (layer === "inner") this.player.skin.setInnerLayerVisible(visible);
    else this.player.skin.setOuterLayerVisible(visible);
  }

  markTextureDirty() {
    this.texture.needsUpdate = true;
  }

  dispose() {
    this.texture.dispose();
  }
}

export function makeSourceCanvas(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  return c;
}
