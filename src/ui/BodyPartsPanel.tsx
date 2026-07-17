import { useState } from "preact/hooks";
import { partVisible, layerGroupVisible, modelType } from "../core/document";
import { PART_LABELS } from "../core/skinLayout";
import type { PartName, SkinLayer } from "../core/skinLayout";

// Doll cells are sized at 5 CSS px per skin texel: head 8x8, body 8x12,
// legs 4x12, arms 4x12 on Steve but 3x12 on Alex (slim).
const PX_PER_TEXEL = 5;
const dollColumns = (slim: boolean) => {
  const arm = (slim ? 3 : 4) * PX_PER_TEXEL;
  const halfBody = 4 * PX_PER_TEXEL;
  return `${arm}px ${halfBody}px ${halfBody}px ${arm}px`;
};

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

export function BodyPartsPanel() {
  const [tab, setTab] = useState<SkinLayer>("inner");
  const pv = partVisible.value;
  const lv = layerGroupVisible.value;

  return (
    <div class="panel body-parts-panel">
      <h3>Body parts</h3>
      <div class="part-tabs">
        <button class={tab === "inner" ? "active" : ""} onClick={() => setTab("inner")}>Body</button>
        <button class={tab === "outer" ? "active" : ""} onClick={() => setTab("outer")}>Outer layer</button>
      </div>
      <label class="row">
        <input type="checkbox" checked={lv[tab]} onChange={() => toggleLayerGroup(tab)} />
        {tab === "inner" ? "Show body layer" : "Show outer layer"}
      </label>
      <div
        class={"doll" + (lv[tab] ? "" : " dim")}
        style={{ gridTemplateColumns: dollColumns(modelType.value === "slim") }}
      >
        {DOLL_PARTS.map(({ part, area }) => (
          <button
            key={part}
            class={"doll-part" + (pv[tab][part] ? " on" : "")}
            style={{ gridArea: area }}
            title={`${PART_LABELS[part]} — click to ${pv[tab][part] ? "hide" : "show"}`}
            onClick={() => togglePart(tab, part)}
          />
        ))}
      </div>
    </div>
  );
}
