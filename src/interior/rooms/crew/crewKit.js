// Crew-deck kit: the props the Deck 7 rooms share on top of impKit. Instanced prop batches (one draw
// call per material however many bunks / tables / rifles), interior partitions, counters, shelving,
// dispensers, camera pods, floor stencils, lounge seating and a few small wall fittings. Everything
// goes through the room's Kit or a Frame like impKit does; colliders are registered on the kit.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { Kit, rng } from "../../../kit.js";
import { Frame, wallFrame } from "../../../core/frame.js";
import { IMP, NO_SHADOW_KEYS } from "../../../materials/imperial.js";
import { impDecalRect } from "../../../materials/imperialTextures.js";

const Y = new THREE.Vector3(0, 1, 0);
export const yawQ = (yaw) => new THREE.Quaternion().setFromAxisAngle(Y, yaw);
export const deg = (d) => (d * Math.PI) / 180;

// Emissive material whose glow is tinted by the vertex colour (and the instance colour), so coloured
// strips / indicators of any hue batch into one draw call. vColor is a vec4 in three r185, hence .rgb.
export function makeCrewEmit(intensity = 2.2) {
  const m = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: intensity, roughness: 0.4, metalness: 0, vertexColors: true });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
      #if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
        totalEmissiveRadiance *= vColor.rgb;
      #endif`,
    );
  };
  m.customProgramCacheKey = () => "crewEmitTint";
  return m;
}

// Material keys the crew rooms add to the shared library the first time one of them builds.
export function ensureCrewMaterials(mats) {
  if (mats.crewEmit) return mats;
  // emissive tinted by vertex colour: coloured light strips / indicators of any hue in one draw call
  mats.crewEmit = makeCrewEmit(2.2);
  // soft warm emissive for bunk reading lamps and cabin down-lights
  mats.crewEmitSoft = makeCrewEmit(1.2);
  // translucent bacta: blue, glossy, lit from inside by its own light
  mats.bactaFluid = new THREE.MeshPhysicalMaterial({ color: 0x1f8fe6, emissive: 0x0b3e78, emissiveIntensity: 0.9, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.62, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 0.8 });
  // matte painted signage red (medical crosses, restricted lines) — not an emitter
  mats.crewPaintRed = new THREE.MeshStandardMaterial({ color: 0xb8231c, roughness: 0.75, metalness: 0.05, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  mats.crewPaintWhite = new THREE.MeshStandardMaterial({ color: 0xdfe3e8, roughness: 0.6, metalness: 0.05, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  // polished mirror / chrome: fully metallic, reflects the environment map
  mats.crewMirror = new THREE.MeshStandardMaterial({ color: 0xdde4ee, roughness: 0.03, metalness: 1.0, envMapIntensity: 1.6 });
  // pale hygienic gloss deck (medbay): the gloss deck's seams / smear maps over a light dielectric base
  // instead of its charcoal colour map, vertex-tinted like the other floors
  const g = mats.impGloss;
  mats.crewGlossLight = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughnessMap: g ? g.roughnessMap : null, normalMap: g ? g.normalMap : null, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 2.4, metalness: 0.08, envMapIntensity: 0.6 });
  for (const k of ["bactaFluid", "crewEmit", "crewEmitSoft"]) NO_SHADOW_KEYS.add(k);
  return mats;
}

// ---------------------------------------------------------------------------
// Instanced props
// ---------------------------------------------------------------------------
/**
 * Build a prop once through a scratch Kit and instance it at every transform: one draw call per
 * material whatever the count. `build(k)` draws the prop at the origin (yaw 0) with any helper that
 * takes a kit (bunk, crate, chair, table, bench, ...). transforms: { pos, rot | quat, scale, color }.
 * opts.colliders: also register the scratch colliders per instance (yaw-rotated AABB).
 */
export function instancedProp(kit, build, transforms, opts = {}) {
  const scratch = new Kit(kit.materials);
  build(scratch);
  const meshes = [];
  for (const [mat, geos] of scratch.groups) {
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const castShadow = opts.castShadow !== undefined ? opts.castShadow : !(NO_SHADOW_KEYS.has(mat) || mat.startsWith("emit") || mat.startsWith("crewEmit") || mat.startsWith("screen") || mat.startsWith("blink"));
    meshes.push(kit.instanced(mat, merged, transforms, { castShadow, receiveShadow: opts.receiveShadow }));
  }
  if (opts.colliders && scratch.colliders.length) {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3(1, 1, 1);
    const c = new THREE.Vector3();
    for (const t of transforms) {
      if (t.collide === false) continue;
      p.set(...(t.pos || [0, 0, 0]));
      if (t.quat) q.copy(t.quat);
      else if (t.rot) q.setFromEuler(new THREE.Euler(t.rot[0], t.rot[1], t.rot[2]));
      else q.identity();
      m.compose(p, q, s);
      for (const col of scratch.colliders) {
        const min = new THREE.Vector3(Infinity, Infinity, Infinity);
        const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
        for (let i = 0; i < 8; i++) {
          c.set(i & 1 ? col.max.x : col.min.x, i & 2 ? col.max.y : col.min.y, i & 4 ? col.max.z : col.min.z).applyMatrix4(m);
          min.min(c);
          max.max(c);
        }
        kit.collider([min.x, min.y, min.z], [max.x, max.y, max.z], col.tag);
      }
    }
  }
  return meshes;
}

// ---------------------------------------------------------------------------
// Partitions, counters, shelving
// ---------------------------------------------------------------------------
/**
 * Interior partition wall from -> to ([x,z]) at floor y, height h. Panelled on both faces with rib
 * lines every `pitch`, a trim kick and cap. openings: [{ u0, u1, h }] leave doorways (a header
 * closes the gap above when the opening is lower than the wall). One collider per solid segment.
 */
export function partition(kit, from, to, y, h, opts = {}) {
  const { t = 0.16, tone = IMP.wallMid, toneAlt = null, openings = [], pitch = 2.2, tag = "partition", collide = true, panelMat = "impPanel", seed = 3, band = h >= 2.6 ? "lightBand" : null, bandY = 2.0, kick = 0.2, cap = 0.12, features = true } = opts;
  const rand = rng(seed);
  // secondary read on a bay face: seam line, stencil, vent slats or an LED strip (like impWall's plain bays)
  const feature = (bu, side, pw, v0, v1) => {
    const r = rand();
    const n = side * (ht + 0.036);
    const fc = (v0 + v1) / 2;
    if (r < 0.3) frame.box("impPaintedMetal", bu, fc, n, pw - 0.3, 0.02, 0.01, { color: IMP.trim });
    else if (r < 0.55) {
      const g = new THREE.PlaneGeometry(0.34, 0.34);
      if (side < 0) g.rotateY(Math.PI);
      frame.add("impDecal", g, bu + (rand() - 0.5) * (pw - 0.7), v0 + 0.45, n, { uv: "keep", uvRect: impDecalRect(Math.floor(rand() * 16)) });
    } else if (r < 0.72) {
      const vw = Math.min(pw - 0.5, 1.2);
      frame.box("impPaintedMetal", bu, fc, n, vw, 0.5, 0.02, { color: IMP.trim, texel: 1 });
      for (let s = 0; s < 4; s++) frame.box("impMetal", bu, fc - 0.18 + s * 0.12, n + 0.02, vw - 0.12, 0.025, 0.04, { color: IMP.gunmetal });
    } else if (r < 0.85) frame.box("leds", bu, v0 + 0.3, n, Math.min(0.8, pw - 0.6), 0.05, 0.01, { uv: "keep" });
  };
  const { frame, length } = wallFrame(kit, from, to, y);
  const ops = [...openings].sort((a, b) => a.u0 - b.u0);
  // solid spans
  const spans = [];
  let cur = 0;
  for (const op of ops) {
    if (op.u0 > cur + 0.02) spans.push([cur, op.u0]);
    cur = op.u1;
  }
  if (cur < length - 0.02) spans.push([cur, length]);
  const ht = t / 2;
  for (const [a, b] of spans) {
    const len = b - a;
    const cu = (a + b) / 2;
    frame.box("impPaintedMetal", cu, h / 2, 0, len, h, t, { color: IMP.trim, texel: 1 });
    // bays on both faces
    const nb = Math.max(1, Math.round(len / pitch));
    const bw = len / nb;
    for (let i = 0; i < nb; i++) {
      const bu = a + bw * (i + 0.5);
      const pw = bw - 0.1;
      const paint = toneAlt && rand() < 0.25 ? toneAlt : tone;
      for (const s of [-1, 1]) {
        if (band) {
          frame.box(panelMat, bu, (kick + bandY - 0.08) / 2, s * (ht + 0.012), pw, bandY - 0.08 - kick, 0.024, { color: paint, uv: "keep" });
          frame.box(panelMat, bu, (bandY + 0.08 + h - cap) / 2, s * (ht + 0.012), pw, h - cap - bandY - 0.08, 0.024, { color: paint, uv: "keep" });
          frame.box("impPaintedMetal", bu, bandY, s * ht, pw, 0.16, 0.02, { color: IMP.trim, texel: 1 });
          frame.box(band, bu, bandY, s * (ht + 0.014), pw - 0.1, 0.1, 0.012, { uv: "keep" });
          if (features && pw > 1.2) feature(bu, s, pw, kick + 0.1, bandY - 0.2);
        } else {
          frame.box(panelMat, bu, (kick + h - cap) / 2, s * (ht + 0.012), pw, h - cap - kick, 0.024, { color: paint, uv: "keep" });
          if (features && pw > 1.2 && h > 1.6) feature(bu, s, pw, kick + 0.1, Math.min(h - cap - 0.2, 2.0));
        }
      }
      if (i > 0) for (const s of [-1, 1]) frame.box("impPaintedMetal", a + bw * i, h / 2, s * (ht + 0.02), 0.08, h, 0.04, { color: IMP.trim, texel: 1 });
    }
    for (const s of [-1, 1]) {
      frame.box("impPaintedMetal", cu, kick / 2, s * (ht + 0.025), len, kick, 0.05, { color: IMP.trim, texel: 1 });
      frame.box("impPaintedMetal", cu, h - cap / 2, s * (ht + 0.02), len, cap, 0.04, { color: IMP.trim, texel: 1 });
    }
    if (collide) frame.collider(a, b, 0, h, -ht - 0.05, ht + 0.05, tag);
  }
  // openings: jambs + header
  for (const op of ops) {
    const oh = op.h === undefined ? h : op.h;
    for (const ju of [op.u0, op.u1]) frame.box("impPaintedMetal", ju + (ju === op.u0 ? -0.06 : 0.06), oh / 2, 0, 0.12, oh, t + 0.08, { color: IMP.trim, texel: 1 });
    if (oh < h - 0.02) {
      frame.box("impPaintedMetal", (op.u0 + op.u1) / 2, (oh + h) / 2, 0, op.u1 - op.u0 + 0.24, h - oh, t, { color: IMP.trim, texel: 1 });
      frame.box("impPaintedMetal", (op.u0 + op.u1) / 2, oh + 0.06, 0, op.u1 - op.u0 + 0.24, 0.12, t + 0.08, { color: IMP.trim, texel: 1 });
      if (op.sign !== false) {
        frame.box(op.locked ? "emitRed" : "emitBlue", (op.u0 + op.u1) / 2, oh + 0.06, ht + 0.045, 0.3, 0.04, 0.01);
        frame.box(op.locked ? "emitRed" : "emitBlue", (op.u0 + op.u1) / 2, oh + 0.06, -ht - 0.045, 0.3, 0.04, 0.01);
      }
    }
  }
  return { frame, length };
}

// Closed door drawn on a wall / partition frame: recessed split panels, jamb trim, status light, keypad
// and a nameplate decal. u is the door centre, w x h the opening. Purely decorative (no opening).
// n = the wall's face offset (0.06 on a shell wall, t/2 + 0.024 on a partition).
export function fauxDoor(frame, u, w, h, opts = {}) {
  const { locked = false, tone = IMP.wallMid, decal = 15, plate = true, n = 0.06 } = opts;
  frame.box("impPaintedMetal", u, h / 2 + 0.08, n + 0.03, w + 0.4, h + 0.16, 0.06, { color: IMP.trim, texel: 1 });
  for (const s of [-1, 1]) {
    frame.box("impPanel", u + s * (w / 4), h / 2, n + 0.045, w / 2 - 0.03, h - 0.04, 0.02, { color: tone, uv: "keep" });
    frame.box("impPanel", u + s * (w / 4), h * 0.5, n + 0.06, w * 0.34, h * 0.5, 0.008, { color: IMP.wallDark, uv: "keep" });
    frame.box("impPanel", u + s * (w / 4), h * 0.5, n + 0.066, w * 0.24, h * 0.3, 0.006, { color: tone, uv: "keep" });
  }
  frame.box("impMetal", u, h / 2, n + 0.062, 0.03, h - 0.1, 0.01, { color: IMP.steel });
  frame.box(locked ? "emitRed" : "emitBlue", u, h + 0.1, n + 0.065, Math.min(0.8, w * 0.4), 0.05, 0.01);
  frame.box("impPaintedMetal", u + w / 2 + 0.28, 1.25, n + 0.07, 0.16, 0.24, 0.05, { color: IMP.consoleDark, texel: 1 });
  frame.box("blinkSparse", u + w / 2 + 0.28, 1.3, n + 0.1, 0.12, 0.1, 0.006, { uv: "keep" });
  if (plate) frame.quad("impDecal", u - w / 2 - 0.3, 1.75, n + 0.066, 0.3, 0.3, { uvRect: impDecalRect(decal) });
}

/**
 * Counter / worktop. pos = floor centre of the footprint, len along local x, depth d, yaw about y.
 * Dark body on a recessed kick, steel top; `doors` on the local -Z face (the working side), a glowing
 * kick strip on the local +Z face (the public side) when `kickLight` is a material key.
 */
export function counter(kit, pos, len, yaw = 0, opts = {}) {
  const { d = 0.7, h = 0.92, tone = IMP.consoleDark, doors = true, kickLight = null, collide = true, top = "impMetal", topTone = IMP.steel, tag = "counter" } = opts;
  const q = yawQ(yaw);
  const o = new THREE.Vector3(...pos);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const box = (mat, x, y, z, sx, sy, sz, extra = {}) => {
    const p = L(x, y, z);
    return kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  box("impPaintedMetal", 0, 0.05, 0, len - 0.12, 0.1, d - 0.12, { color: IMP.trim, texel: 1 });
  box("impPaintedMetal", 0, 0.1 + (h - 0.16) / 2, 0, len, h - 0.16, d, { color: tone, texel: 1 });
  box(top, 0, h - 0.03, 0, len + 0.06, 0.06, d + 0.06, { color: topTone, texel: 1 });
  box("impPaintedMetal", 0, h - 0.075, 0, len + 0.02, 0.03, d + 0.02, { color: IMP.trim, texel: 1 });
  if (doors) {
    const n = Math.max(1, Math.floor(len / 0.65));
    const dw = len / n;
    for (let i = 0; i < n; i++) {
      const x = -len / 2 + dw * (i + 0.5);
      box("impPanel", x, 0.12 + (h - 0.3) / 2, -d / 2 - 0.008, dw - 0.05, h - 0.3, 0.016, { color: IMP.wallDark, uv: "keep" });
      box("impMetal", x + dw * 0.3, h * 0.6, -d / 2 - 0.02, 0.03, 0.12, 0.012, { color: IMP.steel });
    }
  }
  if (kickLight) box(kickLight, 0, 0.13, d / 2 + 0.004, len - 0.2, 0.02, 0.008);
  if (collide) {
    const a = L(-len / 2, 0, -d / 2);
    const b = L(len / 2, 0, d / 2);
    const c = L(-len / 2, 0, d / 2);
    const e = L(len / 2, 0, -d / 2);
    kit.collider([Math.min(a.x, b.x, c.x, e.x), pos[1], Math.min(a.z, b.z, c.z, e.z)], [Math.max(a.x, b.x, c.x, e.x), pos[1] + h, Math.max(a.z, b.z, c.z, e.z)], tag);
  }
}

/**
 * Open shelving against a wall frame from u0 to u1, `shelves` levels up to height h, depth d, filled
 * with small containers (boxes / canisters / flasks). `glass` closes the front with a pane. Collider.
 */
export function shelfUnit(frame, u0, u1, h, opts = {}) {
  const { d = 0.45, shelves = 4, seed = 11, tone = IMP.wallDark, fill = 0.75, glass = false, palette = null, items = "mixed", collide = true, base = 0.12 } = opts;
  const rand = rng(seed);
  const len = u1 - u0;
  const cu = (u0 + u1) / 2;
  const cols = palette || [IMP.wallMid, IMP.gunmetal, IMP.white, IMP.consoleDark, IMP.steel];
  frame.box("impPaintedMetal", cu, h / 2, d / 2, len, h, 0.03, { color: tone, texel: 1 }); // back
  for (const s of [-1, 1]) frame.box("impPaintedMetal", cu + s * (len / 2 - 0.02), h / 2, d / 2, 0.04, h, d, { color: IMP.trim, texel: 1 });
  frame.box("impPaintedMetal", cu, h - 0.02, d / 2, len, 0.04, d, { color: IMP.trim, texel: 1 });
  frame.box("impPaintedMetal", cu, base / 2, d / 2, len, base, d, { color: IMP.trim, texel: 1 });
  const usable = h - base - 0.06;
  const pitch = usable / shelves;
  for (let s = 0; s < shelves; s++) {
    const v = base + s * pitch;
    if (s > 0) frame.box("impMetal", cu, v, d / 2, len - 0.08, 0.025, d - 0.02, { color: IMP.gunmetal, texel: 1 });
    // contents
    let u = u0 + 0.08;
    while (u < u1 - 0.12) {
      const w = 0.12 + rand() * 0.28;
      if (u + w > u1 - 0.06) break;
      if (rand() < fill) {
        const kind = items === "boxes" ? 0 : items === "cans" ? 1 : rand();
        const col = cols[Math.floor(rand() * cols.length)];
        const ih = Math.min(pitch - 0.08, 0.12 + rand() * (pitch * 0.7));
        if (kind < 0.55) {
          frame.box("impPaintedMetal", u + w / 2, v + 0.013 + ih / 2, d / 2 + (rand() - 0.5) * 0.1, w, ih, Math.min(d - 0.1, 0.2 + rand() * 0.2), { color: col, texel: 2 });
          if (rand() < 0.45) frame.quad("impDecal", u + w / 2, v + 0.013 + ih * 0.55, d - 0.02, Math.min(w, ih) * 0.7, Math.min(w, ih) * 0.7, { uvRect: impDecalRect([0, 3, 6, 9, 15, 5][Math.floor(rand() * 6)]) });
        } else {
          const r = Math.min(w / 2, 0.09);
          frame.cylV("impMetal", u + w / 2, v + 0.013 + ih / 2, d / 2, r, ih, { color: col, segments: 10 });
          if (rand() < 0.5) frame.cylV("impPaintedMetal", u + w / 2, v + 0.013 + ih + 0.015, d / 2, r * 0.7, 0.03, { color: IMP.trim, segments: 10 });
        }
      }
      u += w + 0.03 + rand() * 0.06;
    }
  }
  if (glass) {
    frame.quad("glass", cu, (base + h) / 2, d + 0.005, len - 0.1, h - base - 0.06);
    frame.box("impMetal", cu, (base + h) / 2, d + 0.01, 0.02, h - base - 0.1, 0.02, { color: IMP.steel });
  }
  if (collide) frame.collider(u0, u1, 0, h, -0.02, d + 0.05, "shelf");
}

// Wall cabinet with closed doors (glass or panel) at height v0..v1 on a frame; the doors show shelves
// of small items behind glass.
export function wallCabinet(frame, u0, u1, v0, v1, opts = {}) {
  const { d = 0.35, glass = true, tone = IMP.wallMid, seed = 5, shelves = 2 } = opts;
  const h = v1 - v0;
  const cu = (u0 + u1) / 2;
  const len = u1 - u0;
  frame.box("impPaintedMetal", cu, (v0 + v1) / 2, d / 2, len, h, d, { color: IMP.trim, texel: 1 });
  frame.box("impPaintedMetal", cu, (v0 + v1) / 2, d / 2, len - 0.06, h - 0.06, d - 0.02, { color: IMP.wallDark, texel: 1 });
  const rand = rng(seed);
  for (let s = 0; s < shelves; s++) {
    const v = v0 + 0.06 + ((s + 0.5) / shelves) * (h - 0.12) - 0.04;
    frame.box("impMetal", cu, v, d / 2, len - 0.1, 0.02, d - 0.08, { color: IMP.gunmetal });
    let u = u0 + 0.08;
    while (u < u1 - 0.14) {
      const w = 0.08 + rand() * 0.14;
      const ih = 0.08 + rand() * 0.16;
      const col = [IMP.white, IMP.steel, IMP.wallMid, 0x6fa0ff, 0xb8231c][Math.floor(rand() * 5)];
      if (rand() < 0.5) frame.box("impPaintedMetal", u + w / 2, v + 0.01 + ih / 2, d - 0.14, w, ih, 0.12, { color: col, texel: 2 });
      else frame.cylV("impMetal", u + w / 2, v + 0.01 + ih / 2, d - 0.14, Math.min(0.05, w / 2), ih, { color: col, segments: 8 });
      u += w + 0.04;
    }
  }
  const nd = Math.max(1, Math.round(len / 0.7));
  const dw = len / nd;
  for (let i = 0; i < nd; i++) {
    const du = u0 + dw * (i + 0.5);
    if (glass) frame.quad("glass", du, (v0 + v1) / 2, d + 0.004, dw - 0.08, h - 0.1);
    else frame.box("impPanel", du, (v0 + v1) / 2, d + 0.008, dw - 0.05, h - 0.08, 0.016, { color: tone, uv: "keep" });
    frame.box("impMetal", du + dw * 0.35, (v0 + v1) / 2, d + 0.02, 0.025, 0.14, 0.02, { color: IMP.steel });
  }
  frame.box("emitBlue", u0 + 0.15, v1 - 0.08, d + 0.006, 0.05, 0.02, 0.01);
}

// ---------------------------------------------------------------------------
// Machines & fittings
// ---------------------------------------------------------------------------
/**
 * Free-standing dispenser (rations, drinks, supplies): pos = floor centre, yaw 0 faces +Z (the user
 * stands at +Z). Body with a lit alcove, nozzle and tray, a screen and a keypad. Returns the world
 * position / quaternion of the keypad so the room can hang an interactable there.
 */
export function dispenser(kit, pos, yaw = 0, opts = {}) {
  const { w = 0.9, d = 0.6, h = 2.05, accent = "emitAmber", accentColor = null, screen = 1, tone = IMP.console, collide = true } = opts;
  const q = yawQ(yaw);
  const o = new THREE.Vector3(...pos);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const box = (mat, x, y, z, sx, sy, sz, extra = {}) => {
    const p = L(x, y, z);
    return kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  box("impPaintedMetal", 0, 0.05, 0, w - 0.1, 0.1, d - 0.1, { color: IMP.trim, texel: 1 });
  box("impPaintedMetal", 0, h / 2, 0, w, h, d, { color: tone, texel: 1 });
  box("impPaintedMetal", 0, h / 2, d / 2 + 0.005, w - 0.1, h - 0.1, 0.01, { color: IMP.consoleDark, texel: 1 });
  // alcove (recessed) with tray and nozzle
  const av0 = 0.75;
  const av1 = 1.35;
  box("impPaintedMetal", 0, (av0 + av1) / 2, d / 2 - 0.14, w - 0.3, av1 - av0, 0.02, { color: IMP.black, texel: 1 });
  box("impMetal", 0, av0 + 0.02, d / 2 - 0.08, w - 0.32, 0.03, 0.22, { color: IMP.steel });
  box("impMetal", 0, av1 - 0.02, d / 2 - 0.08, w - 0.32, 0.03, 0.22, { color: IMP.gunmetal });
  for (const s of [-1, 1]) box("impMetal", s * (w / 2 - 0.16), (av0 + av1) / 2, d / 2 - 0.08, 0.03, av1 - av0, 0.22, { color: IMP.gunmetal });
  box(accent, 0, av1 - 0.045, d / 2 - 0.05, w - 0.4, 0.012, 0.15);
  const np = L(0, av1 - 0.16, d / 2 - 0.1);
  kit.add("impMetal", new THREE.CylinderGeometry(0.035, 0.05, 0.2, 10), { pos: [np.x, np.y, np.z], quat: q, color: IMP.steel, uv: "scale", uvScale: [0.3, 0.2] });
  box("impMetal", 0, av0 + 0.06, d / 2 - 0.06, 0.34, 0.04, 0.24, { color: IMP.steel, texel: 2 }); // tray
  // screen + keypad + leds
  box("darkGloss", 0, 1.68, d / 2 + 0.012, w - 0.34, 0.34, 0.01);
  box("screen" + screen, 0, 1.68, d / 2 + 0.018, w - 0.4, 0.28, 0.004, { uv: "keep" });
  box("blink", 0, 0.5, d / 2 + 0.012, w - 0.4, 0.12, 0.008, { uv: "keep" });
  box("leds", 0, 0.32, d / 2 + 0.012, w - 0.5, 0.04, 0.008, { uv: "keep" });
  box("impPaintedMetal", w * 0.28, 1.46, d / 2 + 0.012, 0.16, 0.1, 0.02, { color: IMP.consoleDark, texel: 1 });
  box("impPaintedMetal", 0, h - 0.06, d / 2 + 0.012, w - 0.3, 0.06, 0.012, { color: IMP.trim, texel: 1 });
  const dq = L(-w * 0.25, h - 0.06, d / 2 + 0.02);
  kit.add("impDecal", new THREE.PlaneGeometry(0.3, 0.3), { pos: [dq.x, dq.y, dq.z], quat: q, uv: "keep", uvRect: impDecalRect(opts.decal === undefined ? 15 : opts.decal) });
  if (collide) {
    const a = L(-w / 2, 0, -d / 2);
    const b = L(w / 2, 0, d / 2);
    kit.collider([Math.min(a.x, b.x), pos[1], Math.min(a.z, b.z)], [Math.max(a.x, b.x), pos[1] + h, Math.max(a.z, b.z)], "dispenser");
  }
  const kp = L(w * 0.28, 1.46, d / 2 + 0.03);
  return { keypad: kp, quat: q };
}

/**
 * One interactable made of several small plates (e.g. the keypads of a bank of dispensers): the
 * plates are merged into a single mesh with its own material so the hover highlight can tint it,
 * and one entry is pushed onto ctx.interactables. plates: [{ pos, quat, size:[w,h,d] }].
 * onActivate(api, item) gets the interaction API (api.hud.setStatus(...)).
 */
export function interactPlates(ctx, plates, { id, label, color = 0x9ab4d8, emissive = 0x1a3a6a, onActivate }) {
  const geos = [];
  for (const p of plates) {
    const g = new THREE.BoxGeometry(...p.size);
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p.pos), p.quat || new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)));
    geos.push(g);
  }
  const merged = mergeGeometries(geos, false);
  const material = new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.9, roughness: 0.45, metalness: 0.2 });
  const mesh = new THREE.Mesh(merged, material);
  mesh.name = "interact_" + id;
  ctx.add(mesh);
  ctx.interactables.push({ object: mesh, material, id, label, key: "E", onActivate });
  return mesh;
}

// Tray rack: open steel rack with stacked trays on its shelves. pos = floor centre, yaw 0 => open
// face toward +Z. w x d footprint, `levels` shelves.
export function trayRack(kit, pos, yaw = 0, opts = {}) {
  const { w = 1.1, d = 0.6, h = 1.7, levels = 4, trays = 5, tone = IMP.gunmetal, trayColor = IMP.wallMid, collide = true, seed = 3 } = opts;
  const rand = rng(seed);
  const q = yawQ(yaw);
  const o = new THREE.Vector3(...pos);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const box = (mat, x, y, z, sx, sy, sz, extra = {}) => {
    const p = L(x, y, z);
    return kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box("impMetal", sx * (w / 2 - 0.025), h / 2, sz * (d / 2 - 0.025), 0.05, h, 0.05, { color: tone });
  box("impPaintedMetal", 0, h - 0.02, 0, w, 0.04, d, { color: IMP.trim, texel: 1 });
  for (let l = 0; l < levels; l++) {
    const v = 0.12 + (l * (h - 0.3)) / levels;
    box("impMetal", 0, v, 0, w - 0.06, 0.025, d - 0.06, { color: tone, texel: 1 });
    const n = Math.max(1, Math.round(trays * (0.5 + rand() * 0.7)));
    for (let t = 0; t < n; t++) box("impPaintedMetal", (rand() - 0.5) * 0.04, v + 0.0125 + 0.015 + t * 0.03, (rand() - 0.5) * 0.03, w - 0.3, 0.03, d - 0.2, { color: t % 2 ? trayColor : IMP.wallDark, texel: 2 });
  }
  box("impPaintedMetal", 0, h * 0.5, -d / 2 + 0.01, w - 0.1, h - 0.3, 0.02, { color: IMP.wallDark, texel: 1 });
  const dq = L(0, h - 0.1, d / 2 + 0.001);
  kit.add("impDecal", new THREE.PlaneGeometry(0.16, 0.16), { pos: [dq.x, dq.y, dq.z], quat: q, uv: "keep", uvRect: impDecalRect(6) });
  if (collide) {
    const a = L(-w / 2, 0, -d / 2);
    const b = L(w / 2, 0, d / 2);
    kit.collider([Math.min(a.x, b.x), pos[1], Math.min(a.z, b.z)], [Math.max(a.x, b.x), pos[1] + h, Math.max(a.z, b.z)], "trayRack");
  }
}

/**
 * Galley heater / oven unit. pos = floor centre, yaw 0 => front toward +Z. Dark body, glass door with
 * an amber glow inside, cooktop rings, control panel with knobs. glow: material key for the interior.
 */
export function oven(kit, pos, yaw = 0, opts = {}) {
  const { w = 1.3, d = 0.9, h = 1.25, tone = IMP.consoleDark, glow = "emitAmber", glowColor = null, rings = 2, collide = true } = opts;
  const q = yawQ(yaw);
  const o = new THREE.Vector3(...pos);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const box = (mat, x, y, z, sx, sy, sz, extra = {}) => {
    const p = L(x, y, z);
    return kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  box("impPaintedMetal", 0, 0.05, 0, w - 0.1, 0.1, d - 0.1, { color: IMP.trim, texel: 1 });
  box("impPaintedMetal", 0, h / 2, 0, w, h, d, { color: tone, texel: 1 });
  box("impMetal", 0, h - 0.02, 0, w + 0.04, 0.04, d + 0.04, { color: IMP.steel, texel: 1 });
  // oven door: recessed dark cavity, amber glow, glass pane, handle bar
  const dv0 = 0.28;
  const dv1 = 0.88;
  box("impPaintedMetal", 0, (dv0 + dv1) / 2, d / 2 - 0.12, w - 0.36, dv1 - dv0 - 0.06, 0.02, { color: IMP.black, texel: 1 });
  box(glow, 0, dv0 + 0.1, d / 2 - 0.1, w - 0.5, 0.06, 0.06, glowColor ? { color: glowColor } : {});
  box(glow, 0, (dv0 + dv1) / 2, d / 2 - 0.115, w - 0.6, dv1 - dv0 - 0.3, 0.005, glowColor ? { color: glowColor } : {});
  box("impMetal", 0, (dv0 + dv1) / 2, d / 2 + 0.005, w - 0.3, dv1 - dv0, 0.02, { color: IMP.gunmetal, texel: 1 });
  box("glass", 0, (dv0 + dv1) / 2, d / 2 + 0.016, w - 0.42, dv1 - dv0 - 0.12, 0.004);
  box("impMetal", 0, dv1 + 0.06, d / 2 + 0.06, w - 0.4, 0.035, 0.035, { color: IMP.steel });
  for (const s of [-1, 1]) box("impMetal", s * (w / 2 - 0.21), dv1 + 0.06, d / 2 + 0.035, 0.03, 0.03, 0.06, { color: IMP.steel });
  // control panel above the door
  box("impPaintedMetal", 0, h - 0.14, d / 2 + 0.006, w - 0.3, 0.14, 0.012, { color: IMP.wallDark, texel: 1 });
  box("blinkSparse", -w * 0.22, h - 0.14, d / 2 + 0.014, w * 0.3, 0.06, 0.004, { uv: "keep" });
  for (let k = 0; k < 3; k++) {
    const kp = L(w * 0.1 + k * 0.12, h - 0.14, d / 2 + 0.03);
    kit.add("impMetal", new THREE.CylinderGeometry(0.03, 0.03, 0.04, 10), { pos: [kp.x, kp.y, kp.z], quat: q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)), color: IMP.steel, uv: "scale", uvScale: [0.3, 0.2] });
  }
  // cooktop rings
  for (let r = 0; r < rings; r++) {
    const rx = rings === 1 ? 0 : -w / 4 + (r * w) / 2 / (rings - 1);
    const rp = L(rx, h + 0.015, 0);
    kit.add("impMetal", new THREE.CylinderGeometry(0.2, 0.2, 0.03, 16), { pos: [rp.x, rp.y, rp.z], color: IMP.gunmetal, uv: "scale", uvScale: [1, 0.1] });
    kit.add(glow, new THREE.TorusGeometry(0.13, 0.012, 6, 20), { pos: [rp.x, rp.y + 0.016, rp.z], rot: [Math.PI / 2, 0, 0], ...(glowColor ? { color: glowColor } : {}) });
  }
  if (collide) {
    const a = L(-w / 2, 0, -d / 2);
    const b = L(w / 2, 0, d / 2);
    kit.collider([Math.min(a.x, b.x), pos[1], Math.min(a.z, b.z)], [Math.max(a.x, b.x), pos[1] + h, Math.max(a.z, b.z)], "oven");
  }
}

// Security camera pod on a wall or ceiling bracket. pos = mount point, yaw/pitch (deg) of the lens.
export function cameraPod(kit, pos, yawDeg, pitchDeg = -25, opts = {}) {
  const { bracket = "wall", led = "emitRed" } = opts;
  const [x, y, z] = pos;
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(deg(pitchDeg), deg(yawDeg), 0, "YXZ"));
  const o = new THREE.Vector3(x, y, z);
  if (bracket === "wall") kit.box("impPaintedMetal", x, y, z, 0.12, 0.12, 0.12, { color: IMP.trim });
  else kit.box("impPaintedMetal", x, y + 0.08, z, 0.1, 0.16, 0.1, { color: IMP.trim });
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
  const c = o.clone().addScaledVector(fwd, 0.16);
  kit.add("impPaintedMetal", new THREE.BoxGeometry(0.16, 0.14, 0.26), { pos: [c.x, c.y, c.z], quat: q, color: IMP.consoleDark, texel: 1 });
  const lensQ = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
  const lp = o.clone().addScaledVector(fwd, 0.31);
  kit.add("darkGloss", new THREE.CylinderGeometry(0.05, 0.06, 0.05, 12), { pos: [lp.x, lp.y, lp.z], quat: lensQ });
  const ledP = o.clone().addScaledVector(fwd, 0.2).add(new THREE.Vector3(0, 0.08, 0));
  kit.add(led, new THREE.BoxGeometry(0.03, 0.02, 0.03), { pos: [ledP.x, ledP.y, ledP.z], quat: q });
}

// Floor stencil (impDecal cell) facing up at (x, y, z), size s, yaw in degrees.
export function floorDecal(kit, x, y, z, s, idx, yawDeg = 0) {
  const g = new THREE.PlaneGeometry(s, s);
  g.rotateX(-Math.PI / 2);
  g.rotateY(deg(yawDeg));
  kit.add("impDecal", g, { pos: [x, y + 0.004, z], uv: "keep", uvRect: impDecalRect(idx) });
}

// Painted floor line (matte red/white/yellow paint) from -> to ([x,z]), width w.
export function floorLine(kit, from, to, y, w = 0.1, mat = "crewPaintRed") {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const L = Math.hypot(dx, dz);
  if (L < 0.01) return;
  const yaw = Math.atan2(-dz, dx);
  kit.add(mat, new THREE.BoxGeometry(L, 0.004, w), { pos: [from[0] + dx / 2, y + 0.004, from[1] + dz / 2], quat: yawQ(yaw) });
}

// Medical cross (two painted bars) on a wall frame at (u, v), arm length s
export function medCross(frame, u, v, s = 0.5, n = 0.064, mat = "crewPaintRed") {
  frame.box(mat, u, v, n, s, s * 0.3, 0.006);
  frame.box(mat, u, v, n, s * 0.3, s, 0.006);
}

// Small nameplate: dark plate with a decal and a status LED, on a frame. n = the wall's face offset
// (0.06 on a shell wall, t/2 + 0.024 on a partition).
export function namePlate(frame, u, v, opts = {}) {
  const { decal = 15, led = "emitBlue", w = 0.5, n = 0.06, ledColor } = opts;
  frame.box("impPaintedMetal", u, v, n + 0.015, w, 0.2, 0.03, { color: IMP.consoleDark, texel: 1 });
  frame.quad("impDecal", u - w * 0.15, v, n + 0.033, 0.18, 0.18, { uvRect: impDecalRect(decal) });
  frame.box(led, u + w * 0.35, v, n + 0.033, 0.06, 0.04, 0.006, ledColor ? { color: ledColor } : {});
}

// Mirror + basin: a wash station on a wall frame at u (sink counter continuous from u0..u1 is the
// caller's job via counter()); this adds the basin recess, tap, mirror and shelf light.
export function washStation(frame, u, opts = {}) {
  const { counterH = 0.88, counterD = 0.55, mirror = true, light = "lightBand" } = opts;
  frame.box("darkGloss", u, counterH + 0.002, counterD / 2, 0.42, 0.01, 0.34);
  frame.box("impMetal", u, counterH - 0.06, counterD / 2, 0.36, 0.12, 0.28, { color: IMP.steel, texel: 2 });
  frame.cylV("impMetal", u, counterH + 0.12, 0.08, 0.018, 0.24, { color: IMP.steel, segments: 8 });
  frame.box("impMetal", u, counterH + 0.23, 0.15, 0.036, 0.03, 0.16, { color: IMP.steel });
  frame.box("impPaintedMetal", u, counterH + 0.1, 0.03, 0.1, 0.06, 0.06, { color: IMP.consoleDark });
  frame.box("emitBlue", u - 0.03, counterH + 0.1, 0.061, 0.02, 0.02, 0.006);
  // the mirror sits proud of the shell's wall panels (their face is at n = 0.06) and under the light band
  if (mirror) {
    frame.box("impMetal", u, 1.55, 0.07, 0.56, 0.7, 0.02, { color: IMP.steel });
    frame.box("crewMirror", u, 1.55, 0.085, 0.5, 0.64, 0.01);
    frame.box("impPaintedMetal", u, 1.925, 0.08, 0.56, 0.07, 0.04, { color: IMP.trim, texel: 1 });
    frame.box(light, u, 1.925, 0.102, 0.5, 0.04, 0.006, { uv: "keep" });
  }
}

// ---------------------------------------------------------------------------
// Beds
// ---------------------------------------------------------------------------
// Single platform bed (officer cabins, medbay recovery). pos = floor centre, yaw 0 => head toward -Z.
// Drawer fronts on the local +X side, headboard with a reading lamp and a shelf, pillow, blanket.
export function bed(kit, pos, yaw = 0, opts = {}) {
  const { w = 1.0, l = 2.1, color = IMP.fabricGrey, blanket = IMP.fabricBlack, collide = true, tone = IMP.trim, lamp = "crewEmit", shelf = true, side = 1 } = opts;
  const q = yawQ(yaw);
  const o = new THREE.Vector3(...pos);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const box = (mat, x, y, z, sx, sy, sz, extra = {}) => {
    const p = L(x, y, z);
    return kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  box("impPaintedMetal", 0, 0.06, 0, w - 0.16, 0.12, l - 0.16, { color: IMP.consoleDark, texel: 1 });
  box("impPaintedMetal", 0, 0.28, 0, w, 0.32, l, { color: tone, texel: 1 });
  for (const dz of [-l * 0.25, l * 0.25]) {
    box("impPanel", side * (w / 2 + 0.008), 0.26, dz, 0.016, 0.2, l * 0.42, { color: IMP.wallDark, uv: "keep" });
    box("impMetal", side * (w / 2 + 0.02), 0.26, dz + l * 0.12, 0.012, 0.03, 0.12, { color: IMP.steel });
  }
  box("impFabric", 0, 0.51, 0, w - 0.06, 0.14, l - 0.08, { color, uv: "world", texel: 2 });
  box("impFabric", 0, 0.6, -l / 2 + 0.35, w * 0.7, 0.1, 0.42, { color: IMP.white, uv: "world", texel: 2 });
  box("impFabric", 0, 0.6, l * 0.14, w - 0.02, 0.05, l * 0.62, { color: blanket, uv: "world", texel: 2 });
  // headboard, lamp, shelf
  box("impPaintedMetal", 0, 0.85, -l / 2 - 0.02, w + 0.04, 0.9, 0.06, { color: IMP.consoleDark, texel: 1 });
  box(lamp, 0, 1.18, -l / 2 + 0.015, w * 0.4, 0.03, 0.012, { color: 0xffc890 });
  if (shelf) {
    box("impMetal", 0, 1.62, -l / 2 + 0.1, w, 0.03, 0.26, { color: IMP.steel, texel: 1 });
    box("darkGloss", -w * 0.25, 1.645, -l / 2 + 0.1, 0.16, 0.012, 0.22);
    kit.add("impMetal", new THREE.CylinderGeometry(0.04, 0.035, 0.1, 10), { pos: L(w * 0.2, 1.685, -l / 2 + 0.1).toArray(), color: IMP.gunmetal, uv: "scale", uvScale: [0.3, 0.2] });
  }
  if (collide) {
    const a = L(-w / 2 - 0.02, 0, -l / 2 - 0.06);
    const b = L(w / 2 + 0.02, 0, l / 2);
    kit.collider([Math.min(a.x, b.x), pos[1], Math.min(a.z, b.z)], [Math.max(a.x, b.x), pos[1] + 1.0, Math.max(a.z, b.z)], "bed");
  }
}

// ---------------------------------------------------------------------------
// Seating
// ---------------------------------------------------------------------------
// Low lounge armchair. pos = floor centre, yaw 0 faces -Z.
export function loungeChair(kit, pos, yaw = 0, opts = {}) {
  const { color = IMP.fabricBlack, collide = true, tone = IMP.trim } = opts;
  const q = yawQ(yaw);
  const o = new THREE.Vector3(...pos);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const box = (mat, x, y, z, sx, sy, sz, extra = {}) => {
    const p = L(x, y, z);
    return kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  box("impPaintedMetal", 0, 0.1, 0, 0.7, 0.2, 0.7, { color: tone, texel: 1 });
  box("impRubber", 0, 0.32, 0.02, 0.76, 0.24, 0.72, { color: IMP.rubber });
  box("impFabric", 0, 0.45, 0.04, 0.6, 0.06, 0.6, { color, uv: "world", texel: 2 });
  box("impRubber", 0, 0.66, 0.36, 0.76, 0.56, 0.16, { color: IMP.rubber });
  box("impFabric", 0, 0.68, 0.275, 0.6, 0.44, 0.03, { color, uv: "world", texel: 2 });
  for (const s of [-1, 1]) {
    box("impPaintedMetal", s * 0.35, 0.47, 0.05, 0.08, 0.26, 0.62, { color: tone, texel: 1 });
    box("impRubber", s * 0.35, 0.62, 0.05, 0.1, 0.05, 0.6, { color: IMP.rubber });
  }
  if (collide) {
    const a = L(-0.4, 0, -0.38);
    const b = L(0.4, 0, 0.45);
    kit.collider([Math.min(a.x, b.x), pos[1], Math.min(a.z, b.z)], [Math.max(a.x, b.x), pos[1] + 1.0, Math.max(a.z, b.z)], "chair");
  }
}

// Bar stool: pedestal + round seat
export function stool(kit, pos, opts = {}) {
  const { h = 0.72, color = IMP.fabricBlack, collide = true } = opts;
  const [x, y, z] = pos;
  kit.add("impPaintedMetal", new THREE.CylinderGeometry(0.2, 0.24, 0.04, 14), { pos: [x, y + 0.02, z], color: IMP.trim, uv: "scale", uvScale: [1, 1] });
  kit.add("impMetal", new THREE.CylinderGeometry(0.035, 0.045, h - 0.1, 10), { pos: [x, y + (h - 0.1) / 2 + 0.04, z], color: IMP.gunmetal, uv: "scale", uvScale: [0.3, 1] });
  kit.add("impRubber", new THREE.CylinderGeometry(0.19, 0.17, 0.06, 16), { pos: [x, y + h - 0.05, z], color: IMP.rubber, uv: "scale", uvScale: [1, 1] });
  kit.add("impFabric", new THREE.CylinderGeometry(0.17, 0.17, 0.03, 16), { pos: [x, y + h - 0.005, z], color, uv: "scale", uvScale: [1, 1] });
  if (collide) kit.collider([x - 0.2, y, z - 0.2], [x + 0.2, y + h, z + 0.2], "stool");
}

// Low round side table (lounge)
export function sideTable(kit, pos, r = 0.35, h = 0.5, opts = {}) {
  const [x, y, z] = pos;
  kit.add("impPaintedMetal", new THREE.CylinderGeometry(0.22, 0.26, 0.04, 14), { pos: [x, y + 0.02, z], color: IMP.trim, uv: "scale", uvScale: [1, 1] });
  kit.add("impMetal", new THREE.CylinderGeometry(0.04, 0.04, h - 0.08, 10), { pos: [x, y + h / 2, z], color: IMP.gunmetal, uv: "scale", uvScale: [0.3, 1] });
  kit.add("impPaintedMetal", new THREE.CylinderGeometry(r, r, 0.04, 20), { pos: [x, y + h - 0.02, z], color: opts.tone || IMP.consoleDark, uv: "scale", uvScale: [2, 1] });
  kit.add("impMetal", new THREE.TorusGeometry(r, 0.012, 6, 28), { pos: [x, y + h, z], rot: [Math.PI / 2, 0, 0], color: IMP.steel, uv: "scale", uvScale: [1, 1] });
  if (opts.collide !== false) kit.collider([x - r, y, z - r], [x + r, y + h, z + r], "table");
}

// ---------------------------------------------------------------------------
// Ceiling fittings
// ---------------------------------------------------------------------------
// Emissive ceiling strip with a trim frame (no light descriptor). axis 'x'|'z', len along it.
export function ceilingStrip(kit, pos, len, axis, opts = {}) {
  const { mat = "lightBand", w = 0.24 } = opts;
  const [x, y, z] = pos;
  const sx = axis === "x" ? len : w + 0.14;
  const sz = axis === "x" ? w + 0.14 : len;
  kit.box("impPaintedMetal", x, y - 0.04, z, sx, 0.08, sz, { color: IMP.trim, texel: 1 });
  kit.box(mat, x, y - 0.082, z, axis === "x" ? len - 0.16 : w, 0.008, axis === "x" ? w : len - 0.16, { uv: "keep" });
}

// Ceiling duct / hood: a box with a slatted intake face hanging under the ceiling
export function ductBox(kit, pos, size, opts = {}) {
  const [x, y, z] = pos;
  const [w, h, d] = size;
  kit.box("impPaintedMetal", x, y - h / 2, z, w, h, d, { color: opts.tone || IMP.gunmetal, texel: 1 });
  kit.box("impPaintedMetal", x, y - h, z, w - 0.2, 0.03, d - 0.2, { color: IMP.trim, texel: 1 });
  const slats = Math.max(3, Math.floor((w - 0.4) / 0.12));
  for (let i = 0; i < slats; i++) kit.box("impMetal", x - (w - 0.4) / 2 + (i + 0.5) * ((w - 0.4) / slats), y - h - 0.02, z, 0.03, 0.02, d - 0.4, { color: IMP.steel });
}

export { Frame, wallFrame, rng, IMP, impDecalRect };
