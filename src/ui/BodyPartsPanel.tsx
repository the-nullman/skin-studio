import { partVisible, layerGroupVisible, modelType } from "../core/document";
import { PART_LABELS } from "../core/skinLayout";
import type { PartName, SkinLayer } from "../core/skinLayout";

// Doll cells are sized per skin texel: head 8x8, body 8x12, legs 4x12, arms
// 4x12 on Steve but 3x12 on Alex (slim).
const PX_PER_TEXEL = 8;
const dollColumns = (slim: boolean) => {
  const arm = (slim ? 3 : 4) * PX_PER_TEXEL;
  const halfBody = 4 * PX_PER_TEXEL;
  return `${arm}px ${halfBody}px ${halfBody}px ${arm}px`;
};
const dollRows = `${8 * PX_PER_TEXEL}px ${12 * PX_PER_TEXEL}px ${12 * PX_PER_TEXEL}px`;

function togglePart(layer: SkinLayer, part: PartName) {
  const pv = partVisible.value;
  partVisible.value = { ...pv, [layer]: { ...pv[layer], [part]: !pv[layer][part] } };
}

function toggleLayerGroup(layer: SkinLayer) {
  layerGroupVisible.value = { ...layerGroupVisible.value, [layer]: !layerGroupVisible.value[layer] };
}

// The doll is drawn facing the viewer, so the model's right side sits on the
// viewer's left — same mirroring as the 3D front view.
const DOLL_PARTS: { part: PartName; area: string }[] = [
  { part: "head", area: "head" },
  { part: "rightArm", area: "rarm" },
  { part: "body", area: "body" },
  { part: "leftArm", area: "larm" },
  { part: "rightLeg", area: "rleg" },
  { part: "leftLeg", area: "lleg" },
];

/**
 * Body and Outer are independent toggles rather than tabs: turn on either to
 * show that skin layer, both for both. When both are on, each doll cell nests
 * the body block inside the outer layer's frame — the ring toggles the
 * overlay, the block inside it toggles the body.
 */
export function BodyPartsPanel() {
  const pv = partVisible.value;
  const lv = layerGroupVisible.value;
  const both = lv.inner && lv.outer;

  return (
    <div class="panel body-parts-panel">
      <h3>Body parts</h3>
      <div class="part-tabs">
        <button class={lv.inner ? "active" : ""} onClick={() => toggleLayerGroup("inner")}>
          Body
        </button>
        <button class={lv.outer ? "active" : ""} onClick={() => toggleLayerGroup("outer")}>
          Outer layer
        </button>
      </div>
      <div
        class="doll"
        style={{ gridTemplateColumns: dollColumns(modelType.value === "slim"), gridTemplateRows: dollRows }}
      >
        {DOLL_PARTS.map(({ part, area }) => (
          <div key={part} class="doll-cell" style={{ gridArea: area }}>
            {lv.outer && (
              <button
                class={"doll-part outer" + (pv.outer[part] ? " on" : "")}
                title={`${PART_LABELS[part]} — outer layer, click to ${pv.outer[part] ? "hide" : "show"}`}
                onClick={() => togglePart("outer", part)}
              />
            )}
            {lv.inner && (
              <button
                class={"doll-part base" + (both ? " nested" : "") + (pv.inner[part] ? " on" : "")}
                title={`${PART_LABELS[part]} — body, click to ${pv.inner[part] ? "hide" : "show"}`}
                onClick={() => togglePart("inner", part)}
              />
            )}
          </div>
        ))}
      </div>
      <p class="doll-hint">
        {both
          ? "Ring = outer layer, block = body."
          : lv.inner
            ? "Showing body layer only."
            : lv.outer
              ? "Showing outer layer only."
              : "Both layers hidden."}
      </p>
    </div>
  );
}
