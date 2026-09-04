// Procedural TIE fighter (original geometry in the spirit of the films): spherical cockpit pod with the
// hexagonal forward viewport, top hatch, twin-cannon chin, two wing pylons and two tall hexagonal solar
// wings with radiating spokes over dark panels, twin ion engine glow at the rear. Built once through the
// shared Kit so it merges into one geometry per material; the parts are then shared by the parked
// InstancedMeshes and the pooled flying meshes.
//
// Local frame: nose toward −Z, wings at ±X, +Y up, origin at the pod centre. Wingspan ≈ 6.6 m, wing 6.4 m
// tall × 4.5 m wide, pod radius 2.2 m.
import * as THREE from "three";
import { Kit, prism } from "../core/kit.js";
import { IMP } from "../core/palette.js";

export const TIE = {
  podR: 2.2,
  wingX: 3.25, // wing centre plane
  wingH: 6.4,
  wingW: 4.5,
  hatchTopY: 2.2 + 0.28, // top of the roof hatch (rack clamp attaches here)
  wingBottomY: -3.2,
  bound: 3.6, // bounding sphere radius
};

const POD_COLOR = new THREE.Color("#5e6672"); // blue-grey Imperial fighter livery
const POD_DARK = new THREE.Color("#3a3f48");
const PANEL_COLOR = new THREE.Color("#171a20"); // solar cells
const FRAME_COLOR = new THREE.Color("#7c838d");

/**
 * Build the TIE geometry. Returns { parts: [{ key, geometry, material, glow }], triangles, glowMaterial }.
 * `materials` is the shared material library; the engine glow uses a private unlit material so it can bloom
 * independently of the alert/rest lighting states.
 */
export function buildTieParts(materials) {
  const glowMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.62, 0.3), toneMapped: true });
  const kit = new Kit({ ...materials, tieGlow: glowMaterial });
  const R = TIE.podR;

  // ---- cockpit pod
  kit.sphere("plate", 0, 0, 0, R, { segments: 24, color: POD_COLOR });
  // equatorial and meridian seams (thin dark bands) so the sphere reads as plated
  kit.add("paintedMetal", new THREE.TorusGeometry(R + 0.015, 0.05, 4, 28), { pos: [0, 0, 0], rot: [Math.PI / 2, 0, 0], color: IMP.black, uv: "scale", uvScale: [8, 1] });
  kit.add("paintedMetal", new THREE.TorusGeometry(R + 0.015, 0.05, 4, 28), { pos: [0, 0, 0], rot: [0, 0, 0], color: IMP.black, uv: "scale", uvScale: [8, 1] });
  // side hatch discs where the pylons meet the pod
  for (const s of [-1, 1]) {
    kit.cyl("plate", s * (R - 0.15), 0, 0, 1.15, 0.5, "x", { segments: 20, color: POD_DARK });
    kit.cyl("paintedMetal", s * (R + 0.1), 0, 0, 0.75, 0.2, "x", { segments: 16, color: IMP.black });
  }

  // ---- forward viewport: flat snout, dark glazing, hexagonal frame with six spokes
  kit.cyl("plate", 0, 0, -1.75, 1.42, 0.9, "z", { segments: 24, color: POD_DARK });
  kit.cyl("paintedMetal", 0, 0, -2.2, 1.46, 0.08, "z", { segments: 24, color: IMP.black });
  kit.add("darkGloss", new THREE.CircleGeometry(1.25, 6), { pos: [0, 0, -2.245], rot: [0, Math.PI, Math.PI / 6] });
  kit.add("metal", new THREE.TorusGeometry(1.28, 0.09, 6, 6), { pos: [0, 0, -2.25], rot: [0, 0, Math.PI / 6], color: FRAME_COLOR, uv: "scale", uvScale: [4, 1] });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    kit.add("metal", new THREE.BoxGeometry(0.1, 1.2, 0.08), { pos: [Math.cos(a) * 0.62, Math.sin(a) * 0.62, -2.27], rot: [0, 0, a - Math.PI / 2], color: FRAME_COLOR });
  }
  kit.cyl("metal", 0, 0, -2.28, 0.16, 0.06, "z", { segments: 12, color: FRAME_COLOR });

  // ---- roof hatch (the rack clamp grips this)
  kit.cyl("plate", 0, R - 0.05, 0, 0.72, 0.36, "y", { segments: 20, color: POD_DARK });
  kit.cyl("paintedMetal", 0, R + 0.2, 0, 0.5, 0.16, "y", { segments: 16, color: IMP.black });
  kit.add("metal", new THREE.TorusGeometry(0.62, 0.05, 4, 16), { pos: [0, R + 0.13, 0], rot: [Math.PI / 2, 0, 0], color: FRAME_COLOR, uv: "scale", uvScale: [4, 1] });
  // ventral access hatch
  kit.cyl("plate", 0, -R + 0.05, 0.2, 0.6, 0.3, "y", { segments: 16, color: POD_DARK });

  // ---- rear: engine housing (flattened cone) with twin ion exhausts
  kit.add("plate", new THREE.CylinderGeometry(1.05, 1.5, 0.9, 24), { pos: [0, -0.1, 2.15], rot: [Math.PI / 2, 0, 0], color: POD_DARK, uv: "scale", uvScale: [6, 1] });
  kit.cyl("paintedMetal", 0, -0.1, 2.62, 1.05, 0.12, "z", { segments: 24, color: IMP.black });
  for (const s of [-1, 1]) {
    kit.cyl("paintedMetal", s * 0.48, -0.32, 2.7, 0.36, 0.14, "z", { segments: 16, color: IMP.gunmetal });
    kit.add("tieGlow", new THREE.CircleGeometry(0.28, 16), { pos: [s * 0.48, -0.32, 2.78], rot: [0, 0, 0], uv: "keep" });
  }
  kit.cyl("metal", 0, 0.45, 2.7, 0.22, 0.1, "z", { segments: 12, color: FRAME_COLOR });

  // ---- chin: twin laser cannons
  for (const s of [-1, 1]) {
    kit.box("paintedMetal", s * 0.55, -1.55, -1.35, 0.32, 0.36, 0.9, { color: IMP.black });
    kit.cyl("metal", s * 0.55, -1.58, -2.35, 0.09, 1.6, "z", { segments: 10, color: IMP.steelDark });
    kit.cyl("metal", s * 0.55, -1.58, -3.15, 0.13, 0.22, "z", { segments: 10, color: IMP.gunmetal });
  }

  // ---- wing pylons: chamfered struts from the pod to the wing hub
  for (const s of [-1, 1]) {
    const x0 = 1.95;
    const x1 = TIE.wingX - 0.1;
    const pts = s > 0 ? [[x0, -0.62], [x1, -0.5], [x1, 0.5], [x0, 0.62]] : [[-x0, -0.62], [-x0, 0.62], [-x1, 0.5], [-x1, -0.5]];
    kit.add("plate", prism(pts, 2.5), { pos: [0, 0, 0], color: POD_COLOR, uv: "world", texel: 1 });
    kit.box("paintedMetal", s * (x0 + 0.45), 0, 0, 0.32, 1.32, 2.62, { color: IMP.black });
    kit.box("paintedMetal", s * (x1 - 0.15), 0, 0, 0.22, 1.12, 2.1, { color: IMP.trim });
    // conduit on top of the strut
    kit.cyl("metal", s * (x0 + 0.62), 0.66, 0.4, 0.07, 1.2, "x", { segments: 8, color: IMP.steelDark });
  }

  // ---- wings: hexagonal solar panels with frame rims, radiating spokes and the central hub
  const hex = [
    [0, 3.2],
    [2.25, 1.65],
    [2.25, -1.65],
    [0, -3.2],
    [-2.25, -1.65],
    [-2.25, 1.65],
  ]; // (z, y)
  for (const s of [-1, 1]) {
    const x = s * TIE.wingX;
    // panel (very dark, faint blue; the rims and spokes carry the light)
    kit.add("paintedMetal", prism(hex, 0.12), { pos: [x, 0, 0], rot: [0, -Math.PI / 2, 0], color: PANEL_COLOR, uv: "world", texel: 0.5 });
    // cell grid: two thin light seams splitting the panel into six cells
    kit.box("metal", x, 0, 0, 0.16, TIE.wingH - 0.3, 0.05, { color: IMP.gunmetal });
    kit.box("metal", x, 0, 0, 0.16, 0.05, TIE.wingW - 0.3, { color: IMP.gunmetal });
    // rim along the six edges
    for (let i = 0; i < 6; i++) {
      const [z0, y0] = hex[i];
      const [z1, y1] = hex[(i + 1) % 6];
      const L = Math.hypot(z1 - z0, y1 - y0);
      const a = Math.atan2(y1 - y0, z1 - z0);
      kit.add("metal", new THREE.BoxGeometry(0.3, 0.26, L + 0.1), { pos: [x, (y0 + y1) / 2, (z0 + z1) / 2], rot: [-a, 0, 0], color: FRAME_COLOR });
    }
    // spokes: hub to the six corners + the two horizontal mid spokes
    const targets = [...hex, [2.25, 0], [-2.25, 0]];
    for (const [tz, ty] of targets) {
      const L = Math.hypot(tz, ty);
      const a = Math.atan2(ty, tz);
      kit.add("metal", new THREE.BoxGeometry(0.22, 0.16, L), { pos: [x, ty / 2, tz / 2], rot: [-a, 0, 0], color: FRAME_COLOR });
    }
    // hub
    kit.cyl("plate", x, 0, 0, 0.82, 0.62, "x", { segments: 20, color: POD_COLOR });
    kit.cyl("paintedMetal", x + s * 0.34, 0, 0, 0.55, 0.12, "x", { segments: 16, color: IMP.black });
    kit.cyl("metal", x + s * 0.42, 0, 0, 0.2, 0.08, "x", { segments: 10, color: FRAME_COLOR });
  }

  const tmp = new THREE.Group();
  const meshes = kit.build(tmp, { castShadow: true, receiveShadow: true });
  const parts = meshes.map((m) => ({ key: m.name.replace("kit_", ""), geometry: m.geometry, material: m.material, glow: m.material === glowMaterial }));
  for (const p of parts) p.geometry.computeBoundingSphere();
  return { parts, triangles: kit.triangles, glowMaterial };
}

/** One flying fighter: a Group with one Mesh per part (shared geometry + material). */
export function makeTieMesh(parts, { glow = true, shadows = true } = {}) {
  const g = new THREE.Group();
  g.name = "tie";
  for (const p of parts) {
    if (p.glow && !glow) continue;
    const m = new THREE.Mesh(p.geometry, p.material);
    m.castShadow = shadows && !p.glow;
    m.receiveShadow = shadows && !p.glow;
    m.frustumCulled = true;
    g.add(m);
  }
  return g;
}

/** Instanced set of parked fighters (no engine glow). Returns { group, meshes, setMatrix(i, m), hide(i), commit() }. */
export function makeTieInstances(parts, count) {
  const group = new THREE.Group();
  group.name = "tie_parked";
  const meshes = [];
  for (const p of parts) {
    if (p.glow) continue;
    const im = new THREE.InstancedMesh(p.geometry, p.material, count);
    im.name = "inst_tie_" + p.key;
    im.castShadow = true;
    im.receiveShadow = true;
    im.frustumCulled = false;
    group.add(im);
    meshes.push(im);
  }
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  return {
    group,
    meshes,
    setMatrix(i, m) {
      for (const im of meshes) im.setMatrixAt(i, m);
    },
    hide(i) {
      for (const im of meshes) im.setMatrixAt(i, zero);
    },
    commit() {
      for (const im of meshes) im.instanceMatrix.needsUpdate = true;
    },
  };
}
