// THREE side of the composer: turns an appearance's geometry records (species parts, hats, helmets, skirts,
// props) and overlays (hoods) into meshes on a model built by src/npc/model.js, sharing the model's material so
// buildStaticLOD still merges the whole NPC into one draw call. Kept apart from index.js so the composer itself
// stays importable in node (this module needs three + entityMaterial.js).
//
//   const app = composeAppearance(seed, { archetype });
//   const model = buildAppearanceModel(app);      // { root, head, body, ..., material, parts, app }
//   model.root.scale.set(...app.model.scale);      // already applied by buildAppearanceModel; shown for clarity
//   attachBlink(npc, app);                         // app.canvas + app.eyes + app.seed (blink.js)
import * as THREE from 'three';
import { PX, buildHumanoid, buildBoxModel } from '../model.js';
import { TEX_W, TEX_H } from './layout.js';

// same face order / corner logic as model.js applyUV, with the appearance canvas size
export function applyBoxUV(geo, regions, texW = TEX_W, texH = TEX_H) {
  const uv = geo.attributes.uv;
  const order = [regions.left, regions.right, regions.top, regions.bottom, regions.front, regions.back];
  for (let f = 0; f < 6; f++) {
    const r = order[f] || regions.front;
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      const u = uv.getX(i) > 0.5 ? 1 : 0;
      const vTop = uv.getY(i) > 0.5;
      uv.setXY(i, (r[0] + u * r[2]) / texW, (vTop ? r[1] : r[1] + r[3]) / texH);
    }
  }
  uv.needsUpdate = true;
}

// part sizes (px) and the pivot shift model.js applies to each humanoid part
const PART_BOX = { head: [8, 8, 8, [0, 4, 0]], body: [8, 12, 4, [0, 0, 0]], rightArm: [4, 12, 4, [0, -4, 0]], leftArm: [4, 12, 4, [0, -4, 0]], rightLeg: [4, 12, 4, [0, -6, 0]], leftLeg: [4, 12, 4, [0, -6, 0]] };

function boxMesh(b, material) {
  const g = new THREE.BoxGeometry(b.w * PX, b.h * PX, b.d * PX);
  applyBoxUV(g, b.uv);
  const m = new THREE.Mesh(g, material);
  m.position.set(b.x * PX, b.y * PX, b.z * PX);
  if (b.rot) m.rotation.set(b.rot[0], b.rot[1], b.rot[2]);
  m.userData.appearancePart = true;
  return m;
}

// Adds geometry records + overlays to a buildHumanoid() model. Returns the list of created meshes.
export function attachAppearance(model, app) {
  const made = [];
  if (!model || !app || app.model.kind !== 'humanoid') return made;
  const mat = model.material;
  for (const rec of app.geometry || []) {
    const parent = model[rec.attach] || model.body;
    for (const b of rec.boxes) {
      if (!b.uv) continue;
      const m = boxMesh(b, mat);
      m.userData.kind = rec.kind; m.userData.part = rec.part || rec.kind;
      parent.add(m); made.push(m);
    }
  }
  for (const ov of app.overlays || []) {
    if (!ov.uv) continue;
    const spec = PART_BOX[ov.part] || PART_BOX.head;
    const parent = model[ov.part] || model.head;
    const i = ov.inflate ?? 0.5;
    const g = new THREE.BoxGeometry((spec[0] + 2 * i) * PX, (spec[1] + 2 * i) * PX, (spec[2] + 2 * i) * PX);
    applyBoxUV(g, ov.uv);
    g.translate(spec[3][0] * PX, spec[3][1] * PX, spec[3][2] * PX);
    const m = new THREE.Mesh(g, mat);
    m.userData.appearancePart = true; m.userData.kind = ov.kind || 'overlay';
    parent.add(m); made.push(m);
  }
  return made;
}

// Removes what attachAppearance added (outfit change on a persistent NPC).
export function detachAppearance(model) {
  const gone = [];
  model.root.traverse((o) => { if (o.userData && o.userData.appearancePart) gone.push(o); });
  for (const o of gone) { o.parent.remove(o); o.geometry.dispose(); }
  return gone.length;
}

// Full model for an appearance: humanoid + parts, or a droid box model. Applies app.model.scale to root.
export function buildAppearanceModel(app) {
  if (app.model.kind === 'boxes') {
    const m = buildBoxModel(app.model.parts, app.skin);
    m.app = app; m.kind = 'boxes'; m.height = (app.model.height || 32) * PX;
    return m;
  }
  const model = buildHumanoid(app.skin, 'none');
  attachAppearance(model, app);
  const s = app.model.scale || [1, 1, 1];
  model.root.scale.set(s[0], s[1], s[2]);
  model.app = app; model.kind = 'humanoid'; model.height = 32 * PX * s[1];
  return model;
}

// Swap the skin of an existing model to another appearance of the same kind (same seed, new outfit): re-uploads
// the texture and rebuilds the attached parts.
export function reskinModel(model, app) {
  const tex = model.material.uniforms.map.value;
  tex.image = app.skin; tex.needsUpdate = true;
  detachAppearance(model);
  attachAppearance(model, app);
  const s = app.model.scale || [1, 1, 1];
  model.root.scale.set(s[0], s[1], s[2]);
  model.app = app;
  return model;
}
