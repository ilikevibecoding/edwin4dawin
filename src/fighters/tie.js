// Procedural TIE-style fighter (original geometry evoking the classic look) and an instanced pool.
//
//   buildTieGeometry(materials?) -> { parts: [{ key, matKey, geometry, triangles }], byKey, triangles, bounds }
//       one merged BufferGeometry per material key (vertex colours + UVs baked, ready for instancing)
//   createTiePool(materials, count) -> { group, setInstance(i, matrix4, visible), count, parts, triangles }
//       one THREE.InstancedMesh per material part: 24 fighters cost as many draw calls as there are parts (6)
//   fighterMaterials(materials) -> the fighter's own light-domain variants of the library materials
//
// Instance frame: metres, y up, nose along -z, wings in the yz plane at x = ±HANGAR.tie.wingHalfSpan.
// Envelope from spec.HANGAR.tie: pod radius 1.75, wing half-span 3.3, wing 7.6 tall × 4.4 wide, 0.25 thick.
//
// Light domain: the fighters live in the hangar (interior lights) and outside (sun). Neither library domain
// fits both, so the pool clones the library materials and patches the sun term with a factor derived from the
// fragment's world height: full sun below the ventral hull skin, none inside the hangar. Interior point /
// spot lights stay on everywhere (there are none in space anyway).
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { Kit, prism } from "../kit.js";
import { PALETTE } from "../materials.js";
import { HANGAR } from "../spec.js";

const TIE = HANGAR.tie;
const WING_T = 0.25;
const HEX_TEXEL = 0.19; // hex cells ≈ 0.4 m on the wing faces

// Hexagon outline in the wing plane (u along the fighter's z, v up). Elongated: vertical long sides, pointed top / bottom.
export function wingOutline() {
  const hw = TIE.wingW / 2; // 2.2
  const hh = TIE.wingH / 2; // 3.8
  const side = 2.05; // half-length of the vertical edges
  return [
    [0, hh],
    [hw, side],
    [hw, -side],
    [0, -hh],
    [-hw, -side],
    [-hw, side],
  ];
}

const BLACK = PALETTE.impBlack;
const POD = PALETTE.impGreyDark;
const CHARCOAL = PALETTE.impCharcoal;
const GREY = PALETTE.impGrey;
// the hex texture is dark by design; lift the wing faces a little so the cell pattern reads at hangar light levels
const PANEL_TINT = new THREE.Color(1.35, 1.38, 1.5);
const RIB = new THREE.Color("#4a4e57");

/**
 * Kit-bash one fighter into `kit` at the origin (instance frame). Exposed so a room builder can also place
 * a static fighter (e.g. one being serviced in the fighter bay) merged into its own kit.
 */
export function kitbashTie(kit, opts = {}) {
  const { podKey = "impMetal", frameKey = "impTrim", panelKey = "hexPanel", glassKey = "impGloss", thrusterKey = "emitRedImp", glowKey = "glowDisc" } = opts;
  const R = TIE.ballR;
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();

  // ---------------- cockpit pod ----------------
  kit.add(podKey, new THREE.SphereGeometry(R, 30, 20), { color: POD, texel: 0.6 });
  // shallow panel seams around the pod's lower equator (four short plates, barely proud)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const x = Math.cos(a) * (R - 0.01);
    const z = Math.sin(a) * (R - 0.01);
    kit.add(frameKey, new THREE.BoxGeometry(0.05, 0.34, 0.8), { pos: [x, -0.45, z], rot: [0, -a, 0], color: CHARCOAL });
  }
  // access panels (thin raised plates) on the sphere at spherical coordinates
  const panel = (theta, phi, w, h, key = podKey, color = GREY) => {
    const n = new THREE.Vector3(Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi));
    const p = n.clone().multiplyScalar(R + 0.005);
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    kit.add(key, new THREE.BoxGeometry(w, h, 0.07), { pos: [p.x, p.y, p.z], quat: q, color });
  };
  panel(0.62, -Math.PI / 2 - 0.55, 0.5, 0.36); // upper front left
  panel(0.62, -Math.PI / 2 + 0.55, 0.5, 0.36); // upper front right
  panel(1.2, Math.PI / 2 + 0.75, 0.45, 0.32, frameKey, CHARCOAL); // rear left
  panel(1.2, Math.PI / 2 - 0.75, 0.45, 0.32, frameKey, CHARCOAL); // rear right
  panel(2.35, -Math.PI / 2, 0.7, 0.3, frameKey, CHARCOAL); // lower front (sensor housing)
  // sensor blisters
  for (const s of [-1, 1]) {
    const n = new THREE.Vector3(s * 0.55, 0.35, -0.76).normalize();
    const p = n.clone().multiplyScalar(R - 0.02);
    kit.add(frameKey, new THREE.SphereGeometry(0.11, 10, 7), { pos: [p.x, p.y, p.z], color: CHARCOAL });
  }

  // ---------------- forward viewport: octagonal frame, 8 spokes, hub, dark glass cap ----------------
  const WIN_R = 0.9; // window radius on the sphere
  const zWin = -Math.sqrt(R * R - WIN_R * WIN_R); // z of the window ring on the sphere surface
  // dark glass: a spherical cap slightly proud of the pod
  {
    const cap = new THREE.SphereGeometry(R + 0.015, 24, 6, 0, Math.PI * 2, 0, Math.asin(WIN_R / R) + 0.02);
    cap.rotateX(-Math.PI / 2); // pole toward -z
    kit.add(glassKey, cap, { color: 0xffffff });
  }
  // octagonal ring: 8 bars tangent to the sphere
  const tilt = Math.asin(WIN_R / R);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const cx = Math.cos(a) * WIN_R;
    const cy = Math.sin(a) * WIN_R;
    const len = 2 * WIN_R * Math.tan(Math.PI / 8) + 0.02;
    // bar along the tangent direction, lying on the cap: rotate about z by a, then tilt outward
    e.set(0, 0, a + Math.PI / 2, "ZYX");
    q.setFromEuler(e);
    const tiltQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(Math.cos(a + Math.PI / 2), Math.sin(a + Math.PI / 2), 0), -tilt);
    const qq = tiltQ.multiply(q);
    kit.add(frameKey, new THREE.BoxGeometry(len, 0.13, 0.16), { pos: [cx * 1.0, cy * 1.0, zWin - 0.05], quat: qq, color: BLACK });
  }
  // spokes from the hub to the ring corners
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r0 = 0.2;
    const r1 = WIN_R * 1.0;
    const rm = (r0 + r1) / 2;
    const len = r1 - r0;
    const zm = -Math.sqrt(R * R - rm * rm) - 0.03;
    const slope = Math.asin(rm / R) * 0.8;
    // spoke along the radial direction, tilted to follow the cap
    const radial = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
    const perp = new THREE.Vector3(-Math.sin(a), Math.cos(a), 0);
    const qz = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), a);
    const qt = new THREE.Quaternion().setFromAxisAngle(perp, -slope);
    kit.add(frameKey, new THREE.BoxGeometry(len, 0.07, 0.12), { pos: [radial.x * rm, radial.y * rm, zm], quat: qt.multiply(qz), color: BLACK });
  }
  // hub
  kit.add(frameKey, new THREE.CylinderGeometry(0.22, 0.24, 0.12, 16), { pos: [0, 0, -R - 0.03], rot: [Math.PI / 2, 0, 0], color: BLACK });
  kit.add(glassKey, new THREE.CylinderGeometry(0.12, 0.12, 0.04, 12), { pos: [0, 0, -R - 0.1], rot: [Math.PI / 2, 0, 0], color: 0xffffff });

  // ---------------- top hatch ring ----------------
  kit.add(frameKey, new THREE.CylinderGeometry(0.62, 0.66, 0.26, 20, 1, true), { pos: [0, R - 0.02, 0.1], color: BLACK });
  kit.add(podKey, new THREE.CylinderGeometry(0.5, 0.56, 0.16, 16), { pos: [0, R + 0.1, 0.1], color: CHARCOAL });
  kit.add(frameKey, new THREE.BoxGeometry(0.16, 0.08, 0.5), { pos: [0, R + 0.2, 0.1], color: BLACK });
  for (const s of [-1, 1]) kit.add(frameKey, new THREE.BoxGeometry(0.1, 0.1, 0.24), { pos: [s * 0.62, R + 0.02, 0.1], color: BLACK });
  // small antenna aft of the hatch
  kit.add(frameKey, new THREE.CylinderGeometry(0.02, 0.03, 0.55, 6), { pos: [0.35, R + 0.15, 0.75], color: BLACK });

  // ---------------- rear: thruster block and twin ports ----------------
  kit.add(frameKey, new THREE.BoxGeometry(1.7, 1.05, 0.5), { pos: [0, -0.2, R - 0.22], color: CHARCOAL });
  for (const s of [-1, 1]) {
    const x = s * 0.5;
    const y = -0.2;
    kit.add(frameKey, new THREE.CylinderGeometry(0.34, 0.3, 0.32, 18, 1, true), { pos: [x, y, R + 0.02], rot: [Math.PI / 2, 0, 0], color: BLACK });
    kit.add(thrusterKey, new THREE.CircleGeometry(0.26, 18), { pos: [x, y, R + 0.1], rot: [0, 0, 0], color: 0xffffff });
    kit.add(glowKey, new THREE.PlaneGeometry(1.1, 1.1), { pos: [x, y, R + 0.22], color: PALETTE.impRed, uv: "keep" });
  }
  // surface conduits from the hatch ring aft-down to the thruster block (torus arcs hugging the pod)
  for (const s of [-1, 1]) {
    const x = s * 0.38;
    const r = Math.sqrt(R * R - x * x) + 0.03;
    const g = new THREE.TorusGeometry(r, 0.045, 6, 12, Math.PI / 2 - 0.55);
    g.rotateZ(Math.PI / 2 + 0.25); // start just behind the top
    g.rotateY(Math.PI / 2); // ring into the yz plane: angle 0 = -z, pi/2 = +y, pi = +z
    kit.add(frameKey, g, { pos: [x, 0, 0], color: CHARCOAL });
  }

  // ---------------- wing pylons ----------------
  for (const s of [-1, 1]) {
    const x0 = R - 0.25; // inside the pod surface
    const x1 = TIE.wingHalfSpan - WING_T / 2; // wing inner face
    const mid = (x0 + x1) / 2;
    kit.add(podKey, new THREE.CylinderGeometry(0.42, 0.42, x1 - x0, 16), { pos: [s * mid, 0, 0], rot: [0, 0, Math.PI / 2], color: CHARCOAL, texel: 0.8 });
    // collar against the pod and flange against the wing hub
    kit.add(frameKey, new THREE.CylinderGeometry(0.66, 0.6, 0.34, 16), { pos: [s * (x0 + 0.42), 0, 0], rot: [0, 0, Math.PI / 2], color: BLACK });
    kit.add(frameKey, new THREE.CylinderGeometry(0.62, 0.78, 0.3, 16), { pos: [s * (x1 - 0.14), 0, 0], rot: [0, 0, Math.PI / 2], color: BLACK });
    // ribs along the pylon
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      kit.add(frameKey, new THREE.BoxGeometry(x1 - x0 - 0.7, 0.09, 0.09), { pos: [s * mid, Math.cos(a) * 0.44, Math.sin(a) * 0.44], color: CHARCOAL });
    }
  }

  // ---------------- twin cannons under the pod ----------------
  for (const s of [-1, 1]) {
    const x = s * 0.45;
    kit.add(frameKey, new THREE.BoxGeometry(0.28, 0.34, 0.7), { pos: [x, -1.32, -1.0], color: CHARCOAL });
    kit.add(frameKey, new THREE.CylinderGeometry(0.11, 0.13, 0.5, 10), { pos: [x, -1.36, -1.55], rot: [Math.PI / 2, 0, 0], color: BLACK });
    kit.add(podKey, new THREE.CylinderGeometry(0.055, 0.07, 0.9, 8), { pos: [x, -1.36, -2.2], rot: [Math.PI / 2, 0, 0], color: CHARCOAL });
    kit.add(frameKey, new THREE.CylinderGeometry(0.09, 0.09, 0.12, 8), { pos: [x, -1.36, -2.62], rot: [Math.PI / 2, 0, 0], color: BLACK });
  }

  // ---------------- solar wings ----------------
  const outline = wingOutline();
  for (const s of [-1, 1]) {
    const xc = s * TIE.wingHalfSpan;
    // panel: hexagon extruded along x (prism extrudes along z, then rotate so its axis is x)
    const g = prism(outline.map(([u, v]) => [u, v]), WING_T);
    // prism lies in the (x=u, y=v) plane extruded along z; rotate about y so u -> -z (wing plane = yz)
    kit.add(panelKey, g, { pos: [xc, 0, 0], rot: [0, Math.PI / 2, 0], color: PANEL_TINT, texel: HEX_TEXEL });
    // hub discs (both faces) with a raised boss on the outer face
    for (const f of [-1, 1]) {
      const xf = xc + f * (WING_T / 2 + 0.06);
      kit.add(frameKey, new THREE.CylinderGeometry(0.95, 0.95, 0.12, 24), { pos: [xf, 0, 0], rot: [0, 0, Math.PI / 2], color: BLACK });
    }
    kit.add(frameKey, new THREE.CylinderGeometry(0.45, 0.6, 0.18, 16), { pos: [xc + s * (WING_T / 2 + 0.2), 0, 0], rot: [0, 0, Math.PI / 2], color: CHARCOAL });
    // rim bars along the six edges and spokes from the hub to the six vertices, on both faces.
    // Outline (u, v) maps to world (z = -u, y = v). A box whose long axis is z, rotated about x by phi, points
    // along (y, z) = (-sin phi, cos phi); for a direction (dv, -du) that is phi = atan2(-dv, -du).
    for (let i = 0; i < 6; i++) {
      const [u0, v0] = outline[i];
      const [u1, v1] = outline[(i + 1) % 6];
      const du = u1 - u0;
      const dv = v1 - v0;
      const len = Math.hypot(du, dv);
      const phi = Math.atan2(-dv, -du);
      // rim: spans the wing thickness plus a small overhang on each face
      kit.add(frameKey, new THREE.BoxGeometry(WING_T + 0.14, 0.26, len + 0.06), { pos: [xc, (v0 + v1) / 2, -(u0 + u1) / 2], rot: [phi, 0, 0], color: BLACK });
      // spoke from the hub to vertex i
      const rlen = Math.hypot(u0, v0);
      const sphi = Math.atan2(-v0, -u0);
      const inner = 0.85;
      const slen = rlen - inner;
      const cm = (inner + rlen) / 2;
      for (const f of [-1, 1]) {
        const xf = xc + f * (WING_T / 2 + 0.05);
        kit.add(frameKey, new THREE.BoxGeometry(0.1, 0.2, slen), { pos: [xf, (v0 / rlen) * cm, (-u0 / rlen) * cm], rot: [sphi, 0, 0], color: BLACK });
        // lighter cap rib on top of the black spoke so the frame separates from the panels
        kit.add(podKey, new THREE.BoxGeometry(0.05, 0.09, slen - 0.2), { pos: [xf + f * 0.05, (v0 / rlen) * cm, (-u0 / rlen) * cm], rot: [sphi, 0, 0], color: RIB, texel: 0.5 });
      }
    }
    // three horizontal stiffeners across each face (the classic panel sub-divisions)
    for (const f of [-1, 1]) {
      const xf = xc + f * (WING_T / 2 + 0.035);
      for (const v of [-2.05, 0, 2.05]) {
        const w = v === 0 ? TIE.wingW - 0.3 : TIE.wingW - 0.35;
        kit.add(frameKey, new THREE.BoxGeometry(0.07, 0.1, w), { pos: [xf, v * 0.5, 0], color: BLACK });
      }
    }
    // running lights at the wing's top and bottom vertices: a small emitter on the rim plus crossed glow
    // planes so the halo reads from every direction
    for (const sv of [-1, 1]) {
      const y = sv * (TIE.wingH / 2 - 0.16);
      kit.add(thrusterKey, new THREE.BoxGeometry(0.14, 0.12, 0.3), { pos: [xc, y, 0], color: 0xffffff });
      kit.add(glowKey, new THREE.PlaneGeometry(0.6, 0.6), { pos: [xc + s * 0.25, y, 0], rot: [0, Math.PI / 2, 0], uv: "keep" });
      kit.add(glowKey, new THREE.PlaneGeometry(0.6, 0.6), { pos: [xc, y + sv * 0.2, 0], rot: [Math.PI / 2, 0, 0], uv: "keep" });
    }
  }
}

/** Merge the kit-bashed fighter into one geometry per material key. */
export function buildTieGeometry(materials = null, opts = {}) {
  const kit = new Kit(materials || {});
  kitbashTie(kit, opts);
  const parts = [];
  const byKey = new Map();
  const bounds = new THREE.Box3();
  let triangles = 0;
  for (const [key, geos] of kit.groups) {
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    merged.computeBoundingBox();
    merged.computeBoundingSphere();
    bounds.union(merged.boundingBox);
    const tri = merged.attributes.position.count / 3;
    triangles += tri;
    const part = { key, matKey: key, geometry: merged, triangles: tri };
    parts.push(part);
    byKey.set(key, part);
  }
  kit.groups.clear();
  return { parts, byKey, triangles, bounds };
}

// ---------------------------------------------------------------------------
// Fighter light domain (see file header)
// ---------------------------------------------------------------------------
const SUN_CHUNK = THREE.ShaderChunk.lights_fragment_begin.replace(/getDirectionalLightInfo\( directionalLight, directLight \);/g, "getDirectionalLightInfo( directionalLight, directLight ); directLight.color *= fighterSun;");
// Outside the hull the fighters fly in the ship's shadow most of the time; a faint planet-shine fill keeps them
// readable against the black underside. Zero inside the hangar (the interior lights take over).
const FILL_CHUNK = "#include <lights_fragment_end>\nreflectedLight.indirectDiffuse += fighterSun * vec3( 0.42, 0.46, 0.58 ) * BRDF_Lambert( diffuseColor.rgb );";
function fighterPatch(shader) {
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying float vFighterY;")
    .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\n{ vec4 fwp = vec4( transformed, 1.0 );\n#ifdef USE_INSTANCING\n\tfwp = instanceMatrix * fwp;\n#endif\n\tfwp = modelMatrix * fwp; vFighterY = fwp.y; }");
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", "#include <common>\nvarying float vFighterY;")
    .replace("#include <lights_fragment_begin>", "float fighterSun = 1.0 - smoothstep( -85.0, -50.0, vFighterY );\n" + SUN_CHUNK)
    .replace("#include <lights_fragment_end>", FILL_CHUNK);
}
const _fighterMatCache = new WeakMap();
/** Clone the library materials the fighter uses and give them the fighter light domain (cached per library). */
export function fighterMaterials(materials) {
  let cache = _fighterMatCache.get(materials);
  if (cache) return cache;
  cache = {};
  for (const key of ["impMetal", "impTrim", "hexPanel", "impGloss", "emitRedImp"]) {
    const src = materials[key];
    if (!src) continue;
    const m = src.clone();
    m.name = "fighter_" + key;
    if (m.isMeshStandardMaterial) {
      m.onBeforeCompile = fighterPatch;
      m.customProgramCacheKey = () => "fighter";
      m.userData.domain = "fighter";
      m.needsUpdate = true;
    }
    cache[key] = m;
  }
  cache.glowDisc = materials.glowDisc; // unlit additive: shared as-is
  _fighterMatCache.set(materials, cache);
  return cache;
}

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

/**
 * Instanced fighter pool: one InstancedMesh per material part. Instances start hidden (zero scale).
 * setInstance(i, matrix, visible) writes the same matrix into every part.
 */
export function createTiePool(materials, count) {
  const built = buildTieGeometry(materials);
  const fmats = fighterMaterials(materials);
  const group = new THREE.Group();
  group.name = "tie_pool";
  const meshes = [];
  for (const part of built.parts) {
    const material = fmats[part.key] || materials[part.key];
    if (!material) throw new Error("tie: unknown material " + part.key);
    const im = new THREE.InstancedMesh(part.geometry, material, count);
    im.name = "tie_" + part.key;
    im.frustumCulled = false; // instances range from the racks to kilometres outside
    im.castShadow = !part.key.startsWith("emit") && part.key !== "glowDisc";
    im.receiveShadow = part.key !== "glowDisc";
    for (let i = 0; i < count; i++) im.setMatrixAt(i, ZERO);
    im.instanceMatrix.needsUpdate = true;
    group.add(im);
    meshes.push(im);
  }
  return {
    group,
    count,
    parts: built.parts,
    meshes,
    triangles: built.triangles,
    bounds: built.bounds,
    setInstance(i, matrix, visible = true) {
      const m = visible ? matrix : ZERO;
      for (let k = 0; k < meshes.length; k++) {
        meshes[k].setMatrixAt(i, m);
        meshes[k].instanceMatrix.needsUpdate = true;
      }
    },
  };
}
