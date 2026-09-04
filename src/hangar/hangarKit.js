// Hangar-cluster kit: the big-bay vocabulary shared by the main hangar, fighter maintenance, the
// shuttle bay and the escape-pod bay. Tall armour walls with structural ribs and door cutouts, catwalk
// galleries, deck markings, refuelling gear, carts, ladders, floodlights, cranes. Everything goes
// through the room Kit (merged per material); the few animated parts are baked to per-material
// geometry with bakeParts() and instanced by the room builders.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { Kit, rng } from "../kit.js";
import { wallFrame, X_AXIS } from "../core/frame.js";
import { IMP } from "../materials/imperial.js";
import { impDecalRect, deckMarkRect } from "../materials/imperialTextures.js";
import { pointLightDesc, walkable, railing, crate, ramp } from "../interior/impKit.js";

export { wallFrame };

const RIB = "impPaintedMetal";

// u-spans of [0, length] left after removing the openings (widened by `extra` each side)
export function spans(length, openings, extra = 0) {
  let s = [[0, length]];
  for (const op of openings) {
    const next = [];
    for (const [a, b] of s) {
      const o0 = op.u0 - extra;
      const o1 = op.u1 + extra;
      if (o1 <= a || o0 >= b) next.push([a, b]);
      else {
        if (o0 > a) next.push([a, o0]);
        if (o1 < b) next.push([o1, b]);
      }
    }
    s = next;
  }
  return s.filter(([a, b]) => b - a > 0.05);
}

// ---------------------------------------------------------------------------
// Tall armour wall for bays 10-42 m high. Giant plates between black structural ribs every ribPitch,
// horizontal girders at the tier levels with a cool light band under each, a deep kick plinth and a
// cornice. openings: [{ u0, u1, v0, v1, type: 'door'|'hole' }] are left open through the slab.
// ---------------------------------------------------------------------------
export function bayWall(frame, length, height, opts = {}) {
  const {
    openings = [],
    ribPitch = 10,
    ribW = 1.0,
    ribD = 0.7,
    tiers = null,
    seed = 1,
    tone = IMP.wallMid,
    toneAlt = IMP.wallLight,
    depth = 0.25,
    collide = true,
    tag = "bayWall",
    bandMat = "lightBand",
    kick = 1.2,
    cornice = 1.0,
    features = true,
    featureScale = 1,
  } = opts;
  const rand = rng(seed);
  const holes = openings.filter((o) => o.type === "door" || o.type === "hole");
  let levels = tiers || (height > 30 ? [0, 12, 26, height] : height > 16 ? [0, height * 0.45, height] : [0, height]);
  levels = levels.filter((v, i, a) => i === 0 || v > a[i - 1] + 1.5);
  if (levels[levels.length - 1] !== height) levels.push(height);

  // --- slab (cut around the openings)
  if (!holes.length) frame.box(RIB, length / 2, height / 2, -depth / 2 - 0.001, length, height, depth, { color: IMP.trim, texel: 0.25 });
  else {
    const topV = Math.max(...holes.map((o) => o.v1));
    for (const [a, b] of spans(length, holes)) frame.box(RIB, (a + b) / 2, topV / 2, -depth / 2 - 0.001, b - a, topV, depth, { color: IMP.trim, texel: 0.25 });
    frame.box(RIB, length / 2, (topV + height) / 2, -depth / 2 - 0.001, length, height - topV, depth, { color: IMP.trim, texel: 0.25 });
  }

  // --- rib cuts: regular pitch snapped to the opening edges
  let cuts = [0];
  for (let u = ribPitch; u < length - ribPitch * 0.45; u += ribPitch) cuts.push(u);
  cuts.push(length);
  for (const op of holes) cuts.push(op.u0 - ribW, op.u1 + ribW);
  cuts = cuts.filter((c) => c >= -1e-6 && c <= length + 1e-6).sort((a, b) => a - b);
  cuts = cuts.filter((c, i) => i === 0 || c - cuts[i - 1] > 1.2);
  cuts = cuts.filter((c) => !holes.some((op) => c > op.u0 - ribW + 0.01 && c < op.u1 + ribW - 0.01));
  for (const c of cuts) {
    const cu = Math.min(Math.max(c, ribW / 2), length - ribW / 2);
    frame.box(RIB, cu, height / 2, ribD / 2, ribW, height, ribD, { color: IMP.trim, texel: 0.5 });
    frame.box("impMetal", cu, height / 2, ribD + 0.006, 0.12, height - 2, 0.012, { color: IMP.gunmetal });
    // tier brackets where the girders meet the rib
    for (let j = 1; j < levels.length - 1; j++) frame.box(RIB, cu, levels[j], ribD + 0.1, ribW + 0.4, 1.4, 0.2, { color: IMP.darkMetal, texel: 1 });
  }

  // --- girders + light bands at the intermediate levels
  for (let j = 1; j < levels.length - 1; j++) {
    const v = levels[j];
    const blocked = holes.filter((o) => o.v1 > v - 0.6);
    for (const [a, b] of spans(length, blocked)) {
      const w = b - a;
      frame.box(RIB, (a + b) / 2, v, ribD * 0.55, w, 0.9, ribD * 1.1, { color: IMP.trim, texel: 0.5 });
      frame.box("impMetal", (a + b) / 2, v + 0.47, ribD * 0.55, w, 0.03, ribD * 1.1 + 0.01, { color: IMP.steel });
      if (bandMat) frame.box(bandMat, (a + b) / 2, v - 0.62, 0.1, w - 0.6, 0.24, 0.03, { uv: "keep" });
    }
  }
  // --- kick plinth and cornice
  for (const [a, b] of spans(length, holes, ribW)) {
    frame.box(RIB, (a + b) / 2, kick / 2, ribD * 0.35, b - a, kick, ribD * 0.7, { color: IMP.trim, texel: 0.5 });
    frame.box("impMetal", (a + b) / 2, kick - 0.04, ribD * 0.7 + 0.006, b - a, 0.04, 0.012, { color: IMP.steel });
  }
  for (const [a, b] of spans(length, [])) frame.box(RIB, (a + b) / 2, height - cornice / 2, ribD * 0.5, b - a, cornice, ribD, { color: IMP.trim, texel: 0.5 });

  // --- plates in every bay / tier
  const styles = ["plain", "plain", "plain", "vent", "stencil", "pipes", "hatch", "status", "plain", "seam"];
  for (let i = 0; i < cuts.length - 1; i++) {
    const u0 = cuts[i] + ribW / 2;
    const u1 = cuts[i + 1] - ribW / 2;
    const w = u1 - u0;
    if (w < 0.6) continue;
    const cu = (u0 + u1) / 2;
    const op = holes.find((o) => cu > o.u0 - 1e-3 && cu < o.u1 + 1e-3);
    for (let j = 0; j < levels.length - 1; j++) {
      const v0 = (j === 0 ? kick : levels[j] + 0.5) + 0.12;
      const v1 = (j === levels.length - 2 ? height - cornice : levels[j + 1] - 0.5) - 0.12;
      if (v1 - v0 < 0.5) continue;
      if (op && v0 < op.v1) continue; // the doorway tier
      const cv = (v0 + v1) / 2;
      const paint = rand() < 0.78 ? tone : toneAlt;
      const panelMat = rand() < 0.5 ? "impPanel" : "impPanel1";
      frame.box(panelMat, cu, cv, 0.05, w - 0.16, v1 - v0 - 0.16, 0.1, { color: paint, uv: "keep" });
      // a horizontal seam splits tall plates into two armour courses
      if (v1 - v0 > 6) frame.box(RIB, cu, cv, 0.11, w - 0.16, 0.12, 0.02, { color: IMP.trim, texel: 1 });
      if (!features) continue;
      const style = j === 0 && w > 3 ? styles[Math.floor(rand() * styles.length)] : rand() < 0.25 ? "stencil" : rand() < 0.3 ? "status" : "plain";
      const fh = Math.min(v1 - v0 - 1, 6 * featureScale);
      const fc = j === 0 ? v0 + 0.6 + fh / 2 : cv;
      const fw = Math.min(w - 1.2, 6 * featureScale);
      switch (style) {
        case "vent": {
          frame.box(RIB, cu, fc, 0.13, fw, fh * 0.8, 0.06, { color: IMP.trim, texel: 1 });
          const slats = 7;
          for (let s = 0; s < slats; s++) frame.box("impMetal", cu, fc - fh * 0.4 + 0.3 + (s / (slats - 1)) * (fh * 0.8 - 0.6), 0.2, fw - 0.3, 0.12, 0.16, { color: IMP.gunmetal, tilt: 0.5 });
          break;
        }
        case "stencil": {
          const s = Math.min(fw, fh) * 0.55;
          frame.quad("impDecal", cu, fc, 0.11, s, s, { uvRect: impDecalRect([2, 8, 8, 9, 0, 15][Math.floor(rand() * 6)]) });
          break;
        }
        case "pipes": {
          const n = 2 + Math.floor(rand() * 2);
          for (let p = 0; p < n; p++) {
            const r = 0.12 + rand() * 0.14;
            const pu = cu - fw / 2 + ((p + 0.5) / n) * fw;
            frame.cylV("impMetal", pu, fc, 0.14 + r, r, fh - 0.2, { color: [IMP.steel, IMP.gunmetal, IMP.darkMetal][Math.floor(rand() * 3)], segments: 10 });
            frame.box(RIB, pu, fc - fh / 2 + 0.4, 0.14 + r, r * 2.4, 0.22, r * 2 + 0.2, { color: IMP.trim, texel: 1 });
            frame.box(RIB, pu, fc + fh / 2 - 0.4, 0.14 + r, r * 2.4, 0.22, r * 2 + 0.2, { color: IMP.trim, texel: 1 });
          }
          break;
        }
        case "hatch": {
          const hw = Math.min(fw, 3.2);
          const hh = Math.min(fh, 3.6);
          frame.box(RIB, cu, fc, 0.12, hw + 0.2, hh + 0.2, 0.05, { color: IMP.trim, texel: 1 });
          frame.box("impPanel", cu, fc, 0.16, hw, hh, 0.05, { color: IMP.wallMid, uv: "keep" });
          frame.box("hazard", cu, fc - hh / 2 - 0.3, 0.12, hw + 0.2, 0.3, 0.02, { uv: "world", texel: 1 });
          frame.box("emitAmber", cu + hw / 2 - 0.3, fc + hh / 2 - 0.3, 0.19, 0.24, 0.12, 0.02);
          break;
        }
        case "status": {
          frame.box(RIB, cu, fc, 0.12, Math.min(fw, 4), 0.9, 0.05, { color: IMP.consoleDark, texel: 1 });
          frame.box("blinkSparse", cu, fc, 0.15, Math.min(fw, 4) - 0.3, 0.5, 0.01, { uv: "keep" });
          frame.box("leds", cu, fc - 0.6, 0.13, Math.min(fw, 4) * 0.7, 0.08, 0.01, { uv: "keep" });
          break;
        }
        case "seam":
          frame.box(RIB, cu, fc, 0.11, 0.12, fh, 0.02, { color: IMP.trim, texel: 1 });
          frame.box(RIB, cu, fc, 0.11, fw, 0.12, 0.02, { color: IMP.trim, texel: 1 });
          break;
        default:
          if (rand() < 0.4) frame.box("leds", cu, v0 + 0.4, 0.11, Math.min(2.4, w - 1), 0.08, 0.01, { uv: "keep" });
      }
    }
  }
  if (collide) for (const [a, b] of spans(length, holes)) frame.collider(a, b, 0, height, -depth, ribD + 0.05, tag);
}

// ---------------------------------------------------------------------------
// Ceiling for a big bay: dark slab, coarse plate grid, cross girders every `girderPitch` (along the
// long axis), a few long girders along it, recessed floodlight troughs. box = [x0, z0, x1, z1].
// ---------------------------------------------------------------------------
export function bayCeiling(kit, box, y, opts = {}) {
  const { girderPitch = 10, girderH = 1.4, longitudinals = [], panel = 10, troughs = [], tone = IMP.wallDark, seed = 9, lightMat = "lightSoft" } = opts;
  const rand = rng(seed);
  const [x0, z0, x1, z1] = box;
  const w = x1 - x0;
  const d = z1 - z0;
  kit.boxMM(RIB, [x0, y, z0], [x1, y + 0.3, z1], { color: IMP.trim, texel: 0.25 });
  const nu = Math.max(1, Math.round(w / panel));
  const nv = Math.max(1, Math.round(d / panel));
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const cx = x0 + ((i + 0.5) / nu) * w;
      const cz = z0 + ((j + 0.5) / nv) * d;
      kit.box(rand() < 0.5 ? "impPanel" : "impPanel1", cx, y - 0.04, cz, w / nu - 0.4, 0.08, d / nv - 0.4, { color: rand() < 0.15 ? IMP.gunmetal : tone, uv: "keep" });
    }
  }
  for (let z = z0 + girderPitch; z < z1 - girderPitch * 0.4; z += girderPitch) {
    kit.boxMM(RIB, [x0, y - girderH, z - 0.4], [x1, y, z + 0.4], { color: IMP.trim, texel: 0.5 });
    kit.boxMM("impMetal", [x0, y - girderH - 0.04, z - 0.6], [x1, y - girderH, z + 0.6], { color: IMP.gunmetal });
  }
  for (const x of longitudinals) {
    kit.boxMM(RIB, [x - 0.5, y - girderH - 0.5, z0], [x + 0.5, y, z1], { color: IMP.trim, texel: 0.5 });
    kit.boxMM("impMetal", [x - 0.7, y - girderH - 0.55, z0], [x + 0.7, y - girderH - 0.5, z1], { color: IMP.gunmetal });
  }
  // floodlight troughs: [x, z, len, axis]
  for (const [x, z, len, axis] of troughs) {
    const sx = axis === "x" ? len : 1.6;
    const sz = axis === "x" ? 1.6 : len;
    kit.box(RIB, x, y - 0.3, z, sx + 0.4, 0.5, sz + 0.4, { color: IMP.trim, texel: 1 });
    kit.box(lightMat, x, y - 0.56, z, sx, 0.02, sz, { uv: "keep" });
  }
}

// ---------------------------------------------------------------------------
// Catwalk gallery hugging a wall. from -> to run along the wall face (world [x,z]); `inward` is the
// unit normal into the room; w is the walkway width. Grated deck, brackets to the wall, a lit railing
// on the room side, light strip under the lip. Registers the walkable.
// ---------------------------------------------------------------------------
export function gallery(kit, ctx, from, to, inward, y, w, opts = {}) {
  const { rails = true, bracketPitch = 6, lit = true, tag = "gallery", railGaps = [] } = opts;
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const L = Math.hypot(dx, dz);
  const ux = dx / L;
  const uz = dz / L;
  const [nx, nz] = inward;
  const yaw = Math.atan2(-uz, ux);
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const at = (along, out, dy) => [from[0] + ux * along + nx * out, y + dy, from[1] + uz * along + nz * out];
  const mid = at(L / 2, w / 2, 0);
  kit.add(RIB, new THREE.BoxGeometry(L, 0.3, w), { pos: [mid[0], mid[1] - 0.17, mid[2]], quat: q, color: IMP.trim, texel: 0.5 });
  const g = new THREE.PlaneGeometry(L, w - 0.2);
  g.rotateX(-Math.PI / 2);
  kit.add("impGrate", g, { pos: [mid[0], y + 0.004, mid[2]], quat: q, uv: "scale", uvScale: [L / 1.24, (w - 0.2) / 0.9] });
  const lip = at(L / 2, w, -0.12);
  kit.add("impMetal", new THREE.BoxGeometry(L, 0.4, 0.12), { pos: lip, quat: q, color: IMP.gunmetal, texel: 1 });
  if (lit) kit.add("lightBand", new THREE.BoxGeometry(L - 1, 0.1, 0.05), { pos: at(L / 2, w - 0.02, -0.4), quat: q, uv: "keep" });
  for (let a = bracketPitch / 2; a < L; a += bracketPitch) {
    kit.add(RIB, new THREE.BoxGeometry(0.4, 0.5, w - 0.3), { pos: at(a, (w - 0.3) / 2, -0.55), quat: q, color: IMP.darkMetal, texel: 1 });
    kit.add(RIB, new THREE.BoxGeometry(0.4, 2.2, 0.4), { pos: at(a, 0.3, -1.4), quat: q, color: IMP.darkMetal, texel: 1 });
    const strut = new THREE.BoxGeometry(0.25, Math.hypot(w - 0.8, 2.0), 0.25);
    const sq = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, -Math.atan2(w - 0.8, 2.0)));
    kit.add(RIB, strut, { pos: at(a, (w - 0.3) / 2, -1.45), quat: sq, color: IMP.darkMetal, texel: 1 });
  }
  const x0 = Math.min(from[0], to[0]) + Math.min(0, nx * w);
  const x1 = Math.max(from[0], to[0]) + Math.max(0, nx * w);
  const z0 = Math.min(from[1], to[1]) + Math.min(0, nz * w);
  const z1 = Math.max(from[1], to[1]) + Math.max(0, nz * w);
  walkable(ctx, x0, z0, x1, z1, y, tag);
  if (rails) {
    const a = at(0, w - 0.08, 0);
    for (const [s0, s1] of spans(L, railGaps.map(([u0, u1]) => ({ u0, u1 })))) {
      const pa = [a[0] + ux * s0, a[2] + uz * s0];
      const pb = [a[0] + ux * s1, a[2] + uz * s1];
      railing(kit, pa, pb, y, { h: 1.1, lit: true, postPitch: 2.0 });
    }
  }
  return { L, at };
}

// Flat platform slab (stair landings, raised pads) with grate top and walkable. box = [x0,z0,x1,z1].
export function slab(kit, ctx, box, y, opts = {}) {
  const { thick = 0.3, tag = "slab", grate = true, rails = [], railH = 1.1 } = opts;
  const [x0, z0, x1, z1] = box;
  kit.boxMM(RIB, [x0, y - thick, z0], [x1, y - 0.01, z1], { color: IMP.trim, texel: 0.5 });
  if (grate) {
    const g = new THREE.PlaneGeometry(x1 - x0 - 0.1, z1 - z0 - 0.1);
    g.rotateX(-Math.PI / 2);
    kit.add("impGrate", g, { pos: [(x0 + x1) / 2, y + 0.004, (z0 + z1) / 2], uv: "scale", uvScale: [(x1 - x0) / 1.24, (z1 - z0) / 0.9] });
  } else kit.boxMM("impDeck", [x0, y - 0.02, z0], [x1, y, z1], { color: IMP.wallDark, texel: 0.5 });
  walkable(ctx, x0, z0, x1, z1, y, tag);
  for (const side of rails) {
    if (side === "n") railing(kit, [x0, z0 + 0.08], [x1, z0 + 0.08], y, { h: railH, lit: true });
    if (side === "s") railing(kit, [x1, z1 - 0.08], [x0, z1 - 0.08], y, { h: railH, lit: true });
    if (side === "w") railing(kit, [x0 + 0.08, z1], [x0 + 0.08, z0], y, { h: railH, lit: true });
    if (side === "e") railing(kit, [x1 - 0.08, z0], [x1 - 0.08, z1], y, { h: railH, lit: true });
  }
}

// Industrial open stair (axis-aligned): thin treads with steel nosings on two tilted stringers, sloped
// handrails on posts, and the walkable ramp. from = [x,z] of the bottom edge centre, dir = [±1,0] |
// [0,±1] is the direction of ascent, w = width, y0 -> y1. Tall flights read as stairs from across a
// bay instead of the solid wedge impKit.stairs builds for short domestic flights.
export function openStairs(kit, ctx, from, dir, w, y0, y1, opts = {}) {
  const { riser = 0.19, tread = 0.3, rails = true, railH = 1.0, tone = IMP.wallDark, postPitch = 2.4 } = opts;
  const rise = y1 - y0;
  const n = Math.max(1, Math.round(rise / riser));
  const stepH = rise / n;
  const run = n * tread;
  const [ux, uz] = dir;
  const alongX = Math.abs(ux) > 0.5;
  const sx = -uz;
  const sz = ux;
  const at = (along, side, yy) => [from[0] + ux * along + sx * side, yy, from[1] + uz * along + sz * side];
  const dims = (len, h, wid) => (alongX ? new THREE.BoxGeometry(len, h, wid) : new THREE.BoxGeometry(wid, h, len));
  const theta = Math.atan2(rise, run);
  // tilt that raises the far (ascending) end of a box whose long axis runs along the stair
  const tiltQ = alongX ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), theta * ux) : new THREE.Quaternion().setFromAxisAngle(X_AXIS, -theta * uz);
  const slopeLen = Math.hypot(run, rise);
  for (let i = 0; i < n; i++) {
    const along = (i + 0.5) * tread;
    const top = y0 + (i + 1) * stepH;
    kit.add("impDeck", dims(tread, 0.06, w), { pos: at(along, 0, top - 0.03), color: tone, texel: 1 });
    kit.add("impMetal", dims(0.05, 0.02, w), { pos: at(along + tread / 2 - 0.025, 0, top + 0.005), color: IMP.steel });
  }
  for (const s of [-1, 1]) {
    kit.add(RIB, dims(slopeLen, 0.5, 0.1), { pos: at(run / 2, s * (w / 2 - 0.05), y0 + rise / 2 - 0.24), quat: tiltQ, color: IMP.trim, texel: 1 });
    // cross ties under the treads every few steps
    for (let along = tread * 3; along < run - tread; along += tread * 6) {
      kit.add("impMetal", dims(0.08, 0.08, w - 0.2), { pos: at(along, 0, y0 + (along / run) * rise - 0.32), color: IMP.gunmetal });
    }
  }
  // hazard nosing on the deck at the foot and on the last tread
  kit.add("hazard", dims(0.4, 0.012, w + 0.2), { pos: at(-0.2, 0, y0 + 0.006), uv: "world", texel: 1 });
  const axis = alongX ? "x" : "z";
  const ascending = alongX ? ux > 0 : uz > 0;
  const c0 = at(0, -w / 2, 0);
  const c1 = at(run, w / 2, 0);
  ramp(ctx, c0[0], c0[2], c1[0], c1[2], ascending ? y0 : y1, ascending ? y1 : y0, axis, "stairs");
  if (rails) {
    for (const s of [-1, 1]) {
      const side = s * (w / 2 + 0.06);
      kit.add("impMetal", dims(slopeLen, 0.05, 0.06), { pos: at(run / 2, side, y0 + rise / 2 + railH), quat: tiltQ, color: IMP.steel, texel: 1 });
      kit.add("impMetal", dims(slopeLen, 0.03, 0.04), { pos: at(run / 2, side, y0 + rise / 2 + railH * 0.55), quat: tiltQ, color: IMP.steel, texel: 1 });
      for (let along = 0.15; along <= run - 0.1; along += postPitch) {
        const yy = y0 + (along / run) * rise;
        kit.add(RIB, dims(0.07, railH, 0.07), { pos: at(along, side, yy + railH / 2), color: IMP.trim });
      }
      kit.add(RIB, dims(0.07, railH, 0.07), { pos: at(run - 0.05, side, y1 + railH / 2), color: IMP.trim });
      const a = at(0, side, 0);
      const b = at(run, side, 0);
      kit.collider([Math.min(a[0], b[0]) - 0.08, y0, Math.min(a[2], b[2]) - 0.08], [Math.max(a[0], b[0]) + 0.08, y1 + railH + 0.1, Math.max(a[2], b[2]) + 0.08], "stairRail");
    }
  }
  return { run, n };
}

// Support column (deck to underside of a structure), square section
export function pillar(kit, x, z, y0, y1, s = 0.8, opts = {}) {
  const { collide = true, tone = IMP.trim } = opts;
  kit.box(RIB, x, (y0 + y1) / 2, z, s, y1 - y0, s, { color: tone, texel: 0.5 });
  kit.box("impMetal", x, y0 + 0.6, z, s + 0.2, 1.2, s + 0.2, { color: IMP.gunmetal });
  kit.box(RIB, x, y1 - 0.4, z, s + 0.3, 0.8, s + 0.3, { color: IMP.darkMetal, texel: 1 });
  if (collide) kit.collider([x - s / 2 - 0.1, y0, z - s / 2 - 0.1], [x + s / 2 + 0.1, y1, z + s / 2 + 0.1], "pillar");
}

// ---------------------------------------------------------------------------
// Deck markings (deckMarks atlas): 0 lane stripes, 1 landing cross, 2 keep-clear hatch, 3 bay numeral
// ---------------------------------------------------------------------------
export function deckMark(kit, x, z, y, w, d, idx, yaw = 0) {
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  if (yaw) g.rotateY(yaw);
  kit.add("deckMarks", g, { pos: [x, y + 0.012, z], uv: "keep", uvRect: deckMarkRect(idx) });
}
// Lane of repeated stripe cells from -> to ([x,z]) of width w (cell 0 is oriented along its u axis)
export function laneMarks(kit, from, to, y, w) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const L = Math.hypot(dx, dz);
  const yaw = Math.atan2(-dz, dx);
  const n = Math.max(1, Math.round(L / w));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    deckMark(kit, from[0] + dx * t, from[1] + dz * t, y, L / n, w, 0, yaw);
  }
}
// Hazard-striped kerb (box) from min to max corners
export function hazardKerb(kit, min, max, opts = {}) {
  const { collide = true, texel = 0.5, top = false } = opts;
  kit.boxMM("hazard", min, max, { uv: "world", texel });
  if (top) kit.boxMM("impMetal", [min[0], max[1], min[2]], [max[0], max[1] + 0.03, max[2]], { color: IMP.steel });
  if (collide) kit.collider(min, max, "kerb");
}
// Armoured coaming around a deck opening: a dark kerb block with a steel top plate, a crisp hazard band
// on its outboard face and a raised inner lip carrying small white edge lights. `inward` = unit [x,z]
// pointing from the kerb toward the opening. Colliders cover the whole block.
export function armouredKerb(kit, min, max, inward, opts = {}) {
  const { lightPitch = 6, lightMat = "lightBand", lip = 0.35, lipRise = 0.22, collide = true } = opts;
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  const alongX = Math.abs(inward[0]) < 0.5; // kerb runs along x when the opening is to ±z
  kit.boxMM(RIB, min, max, { color: IMP.darkMetal, texel: 0.5 });
  // top plate in painted metal: a bare-metal plate mirrored the dark ceiling and read as a black void
  // at the player's feet
  kit.boxMM(RIB, [x0, y1, z0], [x1, y1 + 0.04, z1], { color: IMP.gunmetal, texel: 0.5 });
  // outboard face: hazard band between two dark rails (world uv keeps the chevrons at a fixed pitch)
  const bandY0 = y0 + 0.1;
  const bandY1 = y1 - 0.08;
  if (alongX) {
    const zf = inward[1] > 0 ? z0 : z1; // outboard face
    const o = inward[1] > 0 ? -0.02 : 0.02;
    kit.boxMM("hazard", [x0 + 0.02, bandY0, Math.min(zf, zf + o)], [x1 - 0.02, bandY1, Math.max(zf, zf + o)], { uv: "world", texel: 1.25 });
    const zl0 = inward[1] > 0 ? z1 - lip : z0;
    const zl1 = inward[1] > 0 ? z1 : z0 + lip;
    kit.boxMM(RIB, [x0, y1, zl0], [x1, y1 + lipRise, zl1], { color: IMP.trim, texel: 0.5 });
    kit.boxMM(RIB, [x0, y1 + lipRise, zl0], [x1, y1 + lipRise + 0.03, zl1], { color: IMP.steel, texel: 0.5 });
    for (let x = x0 + lightPitch / 2; x < x1; x += lightPitch) kit.box(lightMat, x, y1 + lipRise + 0.05, (zl0 + zl1) / 2, 0.5, 0.05, lip - 0.12, { uv: "keep" });
  } else {
    const xf = inward[0] > 0 ? x0 : x1;
    const o = inward[0] > 0 ? -0.02 : 0.02;
    kit.boxMM("hazard", [Math.min(xf, xf + o), bandY0, z0 + 0.02], [Math.max(xf, xf + o), bandY1, z1 - 0.02], { uv: "world", texel: 1.25 });
    const xl0 = inward[0] > 0 ? x1 - lip : x0;
    const xl1 = inward[0] > 0 ? x1 : x0 + lip;
    kit.boxMM(RIB, [xl0, y1, z0], [xl1, y1 + lipRise, z1], { color: IMP.trim, texel: 0.5 });
    kit.boxMM(RIB, [xl0, y1 + lipRise, z0], [xl1, y1 + lipRise + 0.03, z1], { color: IMP.steel, texel: 0.5 });
    for (let z = z0 + lightPitch / 2; z < z1; z += lightPitch) kit.box(lightMat, (xl0 + xl1) / 2, y1 + lipRise + 0.05, z, lip - 0.12, 0.05, 0.5, { uv: "keep" });
  }
  // end caps carry the band round the corners where two kerbs meet
  if (alongX) {
    kit.boxMM("hazard", [x0 - 0.02, bandY0, z0 + 0.02], [x0, bandY1, z1 - 0.02], { uv: "world", texel: 1.25 });
    kit.boxMM("hazard", [x1, bandY0, z0 + 0.02], [x1 + 0.02, bandY1, z1 - 0.02], { uv: "world", texel: 1.25 });
  } else {
    kit.boxMM("hazard", [x0 + 0.02, bandY0, z0 - 0.02], [x1 - 0.02, bandY1, z0], { uv: "world", texel: 1.25 });
    kit.boxMM("hazard", [x0 + 0.02, bandY0, z1], [x1 - 0.02, bandY1, z1 + 0.02], { uv: "world", texel: 1.25 });
  }
  if (collide) kit.collider(min, [x1, y1 + lipRise, z1], "kerb");
}
// Keep-clear hatching as geometry: crisp 45° stripes (thin painted slabs) inside the band
// box = [x0, z0, x1, z1] with solid border lines along both long edges. Replaces the noisy decal hatch
// for the big bands around the launch wells.
export function hatchBand(kit, box, y, opts = {}) {
  const { color = IMP.red, pitch = 2.0, stripe = 0.4, border = 0.22, margin = 0.5, mat = RIB, frame = false } = opts;
  const [x0, z0, x1, z1] = box;
  const w = x1 - x0;
  const d = z1 - z0;
  const alongZ = d >= w; // long axis
  const yb = y + 0.004;
  const yt = y + 0.016;
  // stripes are the lines x + z = c clipped to the inner box (margin inside the border lines); a box
  // rotated +45° about y has its long axis along (1, 0, -1), i.e. along such a line
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4);
  const ix0 = x0 + margin;
  const ix1 = x1 - margin;
  const iz0 = z0 + margin;
  const iz1 = z1 - margin;
  const cMin = ix0 + iz0;
  const cMax = ix1 + iz1;
  const step = pitch * Math.SQRT2;
  const n = Math.floor((cMax - cMin) / step);
  for (let i = 0; i <= n; i++) {
    const c = cMin + ((cMax - cMin) - n * step) / 2 + i * step;
    const za = Math.max(iz0, c - ix1);
    const zb = Math.min(iz1, c - ix0);
    const len = (zb - za) * Math.SQRT2 - stripe;
    if (len < stripe) continue;
    const zm = (za + zb) / 2;
    kit.add(mat, new THREE.BoxGeometry(len, yt - yb, stripe), { pos: [c - zm, (yb + yt) / 2, zm], quat: q, color, texel: 1 });
  }
  // border lines along both long edges (all four with frame: true)
  if (alongZ || frame) {
    kit.boxMM(mat, [x0, yb, z0], [x0 + border, yt, z1], { color, texel: 1 });
    kit.boxMM(mat, [x1 - border, yb, z0], [x1, yt, z1], { color, texel: 1 });
  }
  if (!alongZ || frame) {
    kit.boxMM(mat, [x0, yb, z0], [x1, yt, z0 + border], { color, texel: 1 });
    kit.boxMM(mat, [x0, yb, z1 - border], [x1, yt, z1], { color, texel: 1 });
  }
}
// Taxi-lane marker lights: small recessed emitters along both edges of a lane from -> to ([x,z])
export function taxiLights(kit, from, to, y, opts = {}) {
  const { halfW = 2.6, pitch = 6, mat = "emitBlue", size = 0.26 } = opts;
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const L = Math.hypot(dx, dz);
  if (L < 1) return;
  const ux = dx / L;
  const uz = dz / L;
  const n = Math.max(1, Math.floor(L / pitch));
  for (let i = 0; i <= n; i++) {
    const a = (L - n * pitch) / 2 + i * pitch;
    for (const s of [-1, 1]) {
      const x = from[0] + ux * a - uz * s * halfW;
      const z = from[1] + uz * a + ux * s * halfW;
      kit.box(RIB, x, y + 0.03, z, size + 0.12, 0.06, size + 0.12, { color: IMP.darkMetal, texel: 1 });
      kit.box(mat, x, y + 0.065, z, size, 0.02, size);
    }
  }
}
// Discrete perimeter lights around a raised pad: box = [x0, z0, x1, z1] at surface y. Chunky blocks
// (8 cm tall) instead of a continuous strip, so a grazing view never collapses them to a hairline.
export function padLights(kit, box, y, opts = {}) {
  const { pitch = 3, mat = "lightBand", inset = 0.4 } = opts;
  const [x0, z0, x1, z1] = box;
  const put = (x, z, alongX) => {
    kit.box(RIB, x, y + 0.045, z, alongX ? 0.7 : 0.34, 0.09, alongX ? 0.34 : 0.7, { color: IMP.darkMetal, texel: 1 });
    kit.box(mat, x, y + 0.1, z, alongX ? 0.56 : 0.2, 0.03, alongX ? 0.2 : 0.56, { uv: "keep" });
  };
  for (let x = x0 + inset + pitch / 2; x < x1 - inset; x += pitch) {
    put(x, z0 + inset, true);
    put(x, z1 - inset, true);
  }
  for (let z = z0 + inset + pitch / 2; z < z1 - inset; z += pitch) {
    put(x0 + inset, z, false);
    put(x1 - inset, z, false);
  }
}
// Painted approach chevrons as geometry: n chevrons of width w pointing along dir ([x,z] unit-ish),
// stacked every `pitch` from (x, z) backwards. Crisp at any angle, unlike the atlas decal whose
// neighbouring cells bleed into it at low mips.
export function chevrons(kit, x, z, y, dir, opts = {}) {
  const { n = 3, w = 4, pitch = 1.4, stripe = 0.4, color = IMP.hazardYellow, mat = RIB } = opts;
  const L = Math.hypot(dir[0], dir[1]) || 1;
  const ux = dir[0] / L;
  const uz = dir[1] / L;
  const yaw = Math.atan2(ux, uz); // rotation about y taking +z to (ux, uz)
  const arm = Math.hypot(w / 2, w / 2);
  for (let i = 0; i < n; i++) {
    // tip at distance -i * pitch along dir; the two arms run back and out at 45°
    const tx = x - ux * i * pitch;
    const tz = z - uz * i * pitch;
    for (const s of [-1, 1]) {
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw - s * (Math.PI / 4));
      // arm centre: half-way from the tip back along the arm direction (dir rotated by ±135°)
      const ax = -ux * Math.SQRT1_2 + s * uz * Math.SQRT1_2;
      const az = -uz * Math.SQRT1_2 - s * ux * Math.SQRT1_2;
      kit.add(mat, new THREE.BoxGeometry(stripe, 0.012, arm), { pos: [tx + ax * arm / 2, y + 0.01, tz + az * arm / 2], quat: q, color, texel: 1 });
    }
  }
}
// Stencil decal on the floor
export function floorStencil(kit, x, y, z, s, idx, yaw = 0) {
  const g = new THREE.PlaneGeometry(s, s);
  g.rotateX(-Math.PI / 2);
  if (yaw) g.rotateY(yaw);
  kit.add("impDecal", g, { pos: [x, y + 0.01, z], uv: "keep", uvRect: impDecalRect(idx) });
}

// ---------------------------------------------------------------------------
// Props. Every prop takes pos = floor point (centre) and yaw (0 = its front toward -Z).
// ---------------------------------------------------------------------------
function local(pos, yaw) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const o = new THREE.Vector3(...pos);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  return { q, o, L };
}
function boxer(kit, { q, L }) {
  return (mat, x, y, z, sx, sy, sz, extra = {}) => {
    const p = L(x, y, z);
    const { tilt, ...rest } = extra;
    const qq = tilt ? q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, tilt)) : q;
    return kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [p.x, p.y, p.z], quat: qq, ...rest });
  };
}
function cylAt(kit, { q, L }, mat, x, y, z, r, len, axis, extra = {}) {
  const p = L(x, y, z);
  const g = new THREE.CylinderGeometry(extra.r2 !== undefined ? extra.r2 : r, r, len, extra.segments || 14);
  const rot = axis === "x" ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2) : axis === "z" ? new THREE.Quaternion().setFromAxisAngle(X_AXIS, Math.PI / 2) : new THREE.Quaternion();
  const { r2, segments, ...rest } = extra;
  void r2;
  void segments;
  return kit.add(mat, g, { pos: [p.x, p.y, p.z], quat: q.clone().multiply(rot), uv: "scale", uvScale: [2 * Math.PI * r, len], ...rest });
}
function footprint(kit, { L }, pos, hw, hd, h, tag) {
  const cs = [L(-hw, 0, -hd), L(hw, 0, -hd), L(-hw, 0, hd), L(hw, 0, hd)];
  const xs = cs.map((c) => c.x);
  const zs = cs.map((c) => c.z);
  kit.collider([Math.min(...xs), pos[1], Math.min(...zs)], [Math.max(...xs), pos[1] + h, Math.max(...zs)], tag);
}

// Hose reel station: wall-side frame with a drum of coiled fuel hose, nozzle holster, valve and a flow gauge
export function hoseReel(kit, pos, yaw, opts = {}) {
  const { collide = true } = opts;
  const f = local(pos, yaw);
  const box = boxer(kit, f);
  box(RIB, 0, 0.08, 0, 1.6, 0.16, 1.0, { color: IMP.trim, texel: 1 });
  for (const s of [-1, 1]) box(RIB, s * 0.7, 0.9, 0, 0.12, 1.5, 0.7, { color: IMP.darkMetal, texel: 1 });
  cylAt(kit, f, "impMetal", 0, 1.05, 0, 0.55, 1.2, "x", { color: IMP.gunmetal, segments: 16 });
  // coiled hose: torus band around the drum
  const hose = new THREE.TorusGeometry(0.62, 0.12, 8, 24);
  hose.rotateY(Math.PI / 2);
  const hp = f.L(0, 1.05, 0);
  kit.add("impRubber", hose, { pos: [hp.x, hp.y, hp.z], quat: f.q, color: IMP.rubber, uv: "scale", uvScale: [4, 1] });
  for (const s of [-1, 1]) cylAt(kit, f, "impMetal", s * 0.66, 1.05, 0, 0.7, 0.06, "x", { color: IMP.steel, segments: 16 });
  // nozzle holster + hose tail hanging to the deck
  box(RIB, 0.55, 0.5, 0.55, 0.16, 0.5, 0.16, { color: IMP.trim, texel: 1 });
  cylAt(kit, f, "impMetal", 0.55, 0.6, 0.55, 0.06, 0.5, "y", { color: IMP.steel, segments: 10 });
  cylAt(kit, f, "impRubber", -0.3, 0.45, 0.62, 0.06, 0.9, "y", { color: IMP.rubber, segments: 8 });
  // valve + gauge panel
  box(RIB, 0, 1.95, -0.1, 0.9, 0.5, 0.2, { color: IMP.consoleDark, texel: 1 });
  box("blinkSparse", 0, 1.95, 0.005, 0.7, 0.24, 0.01, { uv: "keep" });
  box("emitGreen", 0.3, 2.1, 0.005, 0.08, 0.06, 0.01);
  box("hazard", 0, 0.18, 0.505, 1.6, 0.14, 0.01, { uv: "world", texel: 1 });
  if (collide) footprint(kit, f, pos, 0.85, 0.55, 2.2, "hoseReel");
}

// Fuel bowser: a towable tanker cart. Horizontal tank on a chassis, four wheels, hose reel, hazard band.
export function bowser(kit, pos, yaw, opts = {}) {
  const { collide = true, tone = IMP.wallMid } = opts;
  const f = local(pos, yaw);
  const box = boxer(kit, f);
  box(RIB, 0, 0.55, 0, 2.0, 0.24, 4.2, { color: IMP.trim, texel: 1 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cylAt(kit, f, "impRubber", sx * 1.05, 0.42, sz * 1.5, 0.42, 0.34, "x", { color: IMP.rubber, segments: 14 });
  cylAt(kit, f, RIB, 0, 1.55, 0, 0.95, 3.8, "z", { color: tone, texel: 1, segments: 20 });
  for (const s of [-1, 1]) cylAt(kit, f, "impMetal", 0, 1.55, s * 1.95, 0.62, 0.3, "z", { color: IMP.gunmetal, segments: 16, r2: 0.5 });
  for (const z of [-1.1, 1.1]) box("impMetal", 0, 1.55, z, 2.0, 2.0, 0.12, { color: IMP.gunmetal });
  box("hazard", 0, 1.55, 0, 1.95, 0.35, 3.0, { uv: "world", texel: 1 });
  box(RIB, 0, 2.6, -0.6, 0.6, 0.3, 1.2, { color: IMP.darkMetal, texel: 1 });
  cylAt(kit, f, "impMetal", 0, 2.75, -0.6, 0.12, 0.4, "y", { color: IMP.steel, segments: 10 });
  // pump cabinet at the rear with hose
  box(RIB, 0, 1.0, 2.35, 1.4, 1.0, 0.5, { color: IMP.consoleDark, texel: 1 });
  box("blinkSparse", 0, 1.25, 2.61, 0.9, 0.2, 0.01, { uv: "keep" });
  box("emitAmber", -0.5, 1.4, 2.61, 0.1, 0.06, 0.01);
  const hose = new THREE.TorusGeometry(0.45, 0.07, 8, 20);
  hose.rotateY(Math.PI / 2);
  const hp = f.L(-0.98, 1.3, 1.0);
  kit.add("impRubber", hose, { pos: [hp.x, hp.y, hp.z], quat: f.q, color: IMP.rubber, uv: "scale", uvScale: [3, 1] });
  // tow bar
  box("impMetal", 0, 0.5, -2.7, 0.12, 0.1, 1.0, { color: IMP.steel });
  box("impMetal", 0, 0.5, -3.2, 0.5, 0.1, 0.12, { color: IMP.steel });
  if (collide) footprint(kit, f, pos, 1.2, 2.5, 2.7, "bowser");
}

// Tool cart with drawers, a top tray of tools and a handle
export function toolCart(kit, pos, yaw, opts = {}) {
  const { collide = true, tone = IMP.gunmetal, seed = 1 } = opts;
  const rand = rng(seed);
  const f = local(pos, yaw);
  const box = boxer(kit, f);
  box(RIB, 0, 0.55, 0, 1.1, 0.8, 0.6, { color: tone, texel: 1 });
  for (let i = 0; i < 4; i++) {
    box(RIB, 0, 0.25 + i * 0.19, 0.305, 0.98, 0.15, 0.01, { color: IMP.trim, texel: 1 });
    box("impMetal", 0, 0.25 + i * 0.19, 0.32, 0.4, 0.03, 0.02, { color: IMP.steel });
  }
  box("impMetal", 0, 0.97, 0, 1.16, 0.04, 0.66, { color: IMP.steel });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cylAt(kit, f, "impRubber", sx * 0.45, 0.1, sz * 0.22, 0.1, 0.08, "x", { color: IMP.rubber, segments: 10 });
  box("impMetal", 0.62, 0.75, 0, 0.04, 0.6, 0.04, { color: IMP.steel });
  box("impMetal", 0.62, 1.05, 0, 0.04, 0.04, 0.5, { color: IMP.steel });
  // tools in the tray
  for (let i = 0; i < 4; i++) box(rand() < 0.5 ? "impMetal" : "impRubber", -0.35 + i * 0.22, 1.02, (rand() - 0.5) * 0.3, 0.08, 0.05, 0.3 + rand() * 0.2, { color: rand() < 0.5 ? IMP.steel : IMP.rubber });
  box("emitAmber", -0.4, 0.9, 0.305, 0.08, 0.04, 0.01);
  if (collide) footprint(kit, f, pos, 0.62, 0.35, 1.05, "toolCart");
}

// Wall ladder in a wall frame: rails + rungs from v0 to v1 at u, with safety hoops above 3 m
export function wallLadder(frame, u, v0, v1, opts = {}) {
  const { w = 0.5, hoops = true } = opts;
  const h = v1 - v0;
  for (const s of [-1, 1]) frame.box("impMetal", u + s * (w / 2), (v0 + v1) / 2, 0.16, 0.06, h, 0.06, { color: IMP.steel });
  for (let v = v0 + 0.3; v < v1 - 0.1; v += 0.32) frame.box("impMetal", u, v, 0.16, w, 0.035, 0.035, { color: IMP.steel });
  for (let v = v0; v < v1; v += 2.4) frame.box(RIB, u, v + 0.1, 0.1, w + 0.2, 0.08, 0.2, { color: IMP.trim, texel: 1 });
  if (hoops) for (let v = v0 + 3; v < v1 - 1; v += 1.6) frame.box("impMetal", u, v, 0.55, w + 0.5, 0.05, 0.8, { color: IMP.gunmetal });
}

// Fire-suppression station: two red bottles on a wall bracket with a placard and a hose
export function fireStation(frame, u, opts = {}) {
  const { big = false } = opts;
  const r = big ? 0.32 : 0.18;
  const h = big ? 1.7 : 1.0;
  frame.box(RIB, u, h * 0.55, 0.12, r * 4.8, 0.14, 0.24 + r, { color: IMP.trim, texel: 1 });
  frame.box(RIB, u, 0.05, 0.16 + r, r * 4.8, 0.1, r * 2.2, { color: IMP.trim, texel: 1 });
  for (const s of [-1, 1]) {
    frame.cylV("impMetal", u + s * r * 1.3, h / 2 + 0.1, 0.16 + r, r, h, { color: IMP.red, segments: 14 });
    frame.cylV("impMetal", u + s * r * 1.3, h + 0.16, 0.16 + r, r * 0.35, 0.16, { color: IMP.steel, segments: 8 });
  }
  frame.quad("impDecal", u, h + 0.6, 0.02, 0.5, 0.5, { uvRect: impDecalRect(13) });
  frame.box("emitRed", u, h + 0.95, 0.03, 0.1, 0.05, 0.02);
  frame.collider(u - r * 2.6, u + r * 2.6, 0, h + 0.4, 0, 0.2 + 2 * r, "fireStation");
}

// Deck floodlight mast: a tall post with a bank of light panels aimed across the bay + a point light
export function floodMast(kit, ctx, pos, yaw, opts = {}) {
  const { h = 7, intensity = 14, distance = 46, priority = 1, color = 0xdfe8ff, panels = 3 } = opts;
  const f = local(pos, yaw);
  const box = boxer(kit, f);
  box(RIB, 0, 0.12, 0, 1.6, 0.24, 1.6, { color: IMP.trim, texel: 1 });
  box("hazard", 0, 0.12, 0, 1.62, 0.16, 1.62, { uv: "world", texel: 1 });
  cylAt(kit, f, RIB, 0, h / 2, 0, 0.16, h, "y", { color: IMP.darkMetal, texel: 1, segments: 10 });
  box(RIB, 0, h - 0.4, 0.2, panels * 0.9 + 0.2, 0.9, 0.4, { color: IMP.trim, texel: 1 });
  for (let i = 0; i < panels; i++) {
    const x = -((panels - 1) * 0.9) / 2 + i * 0.9;
    box(RIB, x, h - 0.4, -0.12, 0.8, 0.8, 0.3, { color: IMP.darkMetal, texel: 1, tilt: 0.35 });
    box("lightSoft", x, h - 0.4, -0.29, 0.7, 0.7, 0.02, { uv: "keep", tilt: 0.35 });
  }
  box("emitAmber", 0, h + 0.15, 0, 0.12, 0.08, 0.12);
  kit.collider([pos[0] - 0.8, pos[1], pos[2] - 0.8], [pos[0] + 0.8, pos[1] + h, pos[2] + 0.8], "floodMast");
  const lp = f.L(0, h - 0.6, -1.6);
  pointLightDesc(ctx, color, intensity, distance, [lp.x, lp.y, lp.z], priority);
}

// Big horizontal tank on saddles with a hazard band and valve manifold. axis 'x'|'z'
export function fuelTank(kit, pos, r, len, axis, opts = {}) {
  const { tone = IMP.wallMid, collide = true, band = true } = opts;
  const yaw = axis === "x" ? Math.PI / 2 : 0;
  const f = local(pos, yaw);
  const box = boxer(kit, f);
  const cy = r + 0.5;
  for (const z of [-len * 0.3, len * 0.3]) box(RIB, 0, 0.35, z, r * 1.8, 0.7, 0.6, { color: IMP.trim, texel: 1 });
  cylAt(kit, f, RIB, 0, cy, 0, r, len, "z", { color: tone, texel: 1, segments: 24 });
  for (const s of [-1, 1]) cylAt(kit, f, "impMetal", 0, cy, s * (len / 2 + 0.1), r * 0.7, 0.2, "z", { color: IMP.gunmetal, segments: 20, r2: r * 0.55 });
  for (const z of [-len * 0.3, 0, len * 0.3]) box("impMetal", 0, cy, z, r * 2 + 0.06, r * 2 + 0.06, 0.1, { color: IMP.gunmetal });
  if (band) box("hazard", 0, cy, len * 0.1, r * 2 + 0.02, 0.4, len * 0.2, { uv: "world", texel: 1 });
  box(RIB, 0, cy + r + 0.25, 0, 0.7, 0.5, 1.4, { color: IMP.darkMetal, texel: 1 });
  cylAt(kit, f, "impMetal", 0, cy + r + 0.6, 0.4, 0.1, 0.4, "y", { color: IMP.steel, segments: 10 });
  cylAt(kit, f, "impMetal", 0, cy + r + 0.75, 0.4, 0.28, 0.06, "y", { color: IMP.red, segments: 12 });
  box("blinkSparse", 0.36, cy + r + 0.25, 0, 0.01, 0.2, 0.9, { uv: "keep" });
  if (collide) footprint(kit, f, pos, r + 0.1, len / 2 + 0.2, cy + r, "fuelTank");
}

// Parts rack: open shelving with bins and spare parts
export function partsRack(kit, pos, yaw, opts = {}) {
  const { w = 3, h = 2.4, d = 1.0, shelves = 4, seed = 2, collide = true } = opts;
  const rand = rng(seed);
  const f = local(pos, yaw);
  const box = boxer(kit, f);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(RIB, sx * (w / 2 - 0.05), h / 2, sz * (d / 2 - 0.05), 0.1, h, 0.1, { color: IMP.trim, texel: 1 });
  for (let s = 0; s < shelves; s++) {
    const y = 0.25 + (s / (shelves - 1)) * (h - 0.5);
    box("impMetal", 0, y, 0, w, 0.05, d, { color: IMP.gunmetal });
    const n = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const bw = (w - 0.4) / n - 0.1;
      const x = -w / 2 + 0.2 + bw / 2 + i * ((w - 0.4) / n);
      const kind = rand();
      if (kind < 0.5) box(RIB, x, y + 0.2, 0, bw, 0.36, d - 0.2, { color: [IMP.consoleDark, IMP.gunmetal, IMP.wallDark][Math.floor(rand() * 3)], texel: 1 });
      else if (kind < 0.8) cylAt(kit, f, "impMetal", x, y + 0.22, 0, Math.min(bw / 2, 0.3), 0.4, "y", { color: IMP.steel, segments: 12 });
      else box("impMetal", x, y + 0.08, 0, bw, 0.12, d - 0.3, { color: IMP.steel });
    }
  }
  box("impDecal", -w / 2 + 0.35, h - 0.25, d / 2 + 0.004, 0.4, 0.4, 0.004, { uv: "keep", uvRect: impDecalRect(6) });
  if (collide) footprint(kit, f, pos, w / 2, d / 2, h, "partsRack");
}

// Mobile service gantry: wheeled platform with stairs, rails, a work light. Not walkable (a prop).
export function serviceGantry(kit, pos, yaw, opts = {}) {
  const { h = 3.2, w = 2.4, len = 3.0, collide = true } = opts;
  const f = local(pos, yaw);
  const box = boxer(kit, f);
  box(RIB, 0, 0.2, 0, w, 0.16, len + 2.4, { color: IMP.trim, texel: 1 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cylAt(kit, f, "impRubber", sx * (w / 2 - 0.15), 0.18, sz * (len / 2 + 0.9), 0.18, 0.2, "x", { color: IMP.rubber, segments: 10 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(RIB, sx * (w / 2 - 0.08), h / 2, sz * (len / 2 - 0.08), 0.12, h, 0.12, { color: IMP.darkMetal, texel: 1 });
  box(RIB, 0, h, 0, w, 0.12, len, { color: IMP.trim, texel: 1 });
  const g = new THREE.PlaneGeometry(w - 0.1, len - 0.1);
  g.rotateX(-Math.PI / 2);
  const gp = f.L(0, h + 0.065, 0);
  kit.add("impGrate", g, { pos: [gp.x, gp.y, gp.z], quat: f.q, uv: "scale", uvScale: [w / 1.24, len / 0.9] });
  // rails on three sides
  for (const sx of [-1, 1]) {
    box("impMetal", sx * (w / 2 - 0.03), h + 1.0, 0, 0.05, 0.05, len, { color: IMP.steel });
    for (const z of [-len / 2 + 0.05, 0, len / 2 - 0.05]) box(RIB, sx * (w / 2 - 0.03), h + 0.5, z, 0.05, 1.0, 0.05, { color: IMP.trim });
  }
  box("impMetal", 0, h + 1.0, -len / 2 + 0.03, w, 0.05, 0.05, { color: IMP.steel });
  // stair at the +z end
  const n = Math.round(h / 0.22);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    box("impDeck", 0, 0.28 + t * (h - 0.3), len / 2 + 1.2 - t * 2.4, w - 0.3, 0.06, 0.32, { color: IMP.wallDark, texel: 1 });
  }
  for (const sx of [-1, 1]) {
    const bar = new THREE.BoxGeometry(0.05, 0.05, Math.hypot(2.4, h));
    const bq = f.q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, -Math.atan2(h, 2.4)));
    const bp = f.L(sx * (w / 2 - 0.05), h / 2 + 1.0, len / 2 + 1.2 - 1.2);
    kit.add("impMetal", bar, { pos: [bp.x, bp.y, bp.z], quat: bq, color: IMP.steel });
  }
  // work light
  box(RIB, 0, h + 1.4, -len / 2 + 0.1, 0.5, 0.3, 0.2, { color: IMP.darkMetal, texel: 1 });
  box("lightSoft", 0, h + 1.4, -len / 2 - 0.01, 0.4, 0.2, 0.02, { uv: "keep" });
  box("hazard", 0, 0.2, 0, w + 0.02, 0.12, len + 2.4, { uv: "world", texel: 1 });
  if (collide) footprint(kit, f, pos, w / 2 + 0.1, len / 2 + 1.3, h + 1.2, "gantry");
}

// Maintenance cradle for a TIE: skids under both wing bottom edges with padded saddles, a central
// pedestal under the cockpit ball. pos = floor point under the fighter centre, yaw = fighter yaw. The
// fighter centre then sits at pos.y + hang (wing bottoms 0.65 m up, ball bottom on the pedestal pad).
export const TIE_CRADLE_HANG = 4.4;
export function tieCradle(kit, pos, yaw, opts = {}) {
  const { collide = true, wings = [-1, 1] } = opts;
  const f = local(pos, yaw);
  const box = boxer(kit, f);
  for (const sx of wings) {
    box(RIB, sx * 3.35, 0.14, 0, 0.7, 0.28, 7.0, { color: IMP.trim, texel: 1 });
    box("hazard", sx * 3.35, 0.14, 0, 0.72, 0.16, 6.6, { uv: "world", texel: 1 });
    for (const z of [-1.7, 1.7]) {
      box(RIB, sx * 3.35, 0.45, z, 0.9, 0.34, 0.7, { color: IMP.hazardYellow, texel: 1 });
      box("impRubber", sx * 3.35, 0.66, z, 0.5, 0.12, 0.6, { color: IMP.rubber });
      for (const s of [-1, 1]) box(RIB, sx * 3.35 + s * 0.3, 0.8, z, 0.08, 0.36, 0.6, { color: IMP.darkMetal, texel: 1 });
    }
    for (const z of [-3.2, 3.2]) box("impMetal", sx * 3.35, 0.06, z, 1.0, 0.12, 0.4, { color: IMP.gunmetal });
  }
  for (const z of [-2.4, 2.4]) box(RIB, 0, 0.16, z, wings.length > 1 ? 7.4 : 3.9, 0.22, 0.34, { color: IMP.darkMetal, texel: 1 });
  // pedestal + saddle pad under the ball (ball bottom at hang - 2.1 = 2.3)
  box(RIB, 0, 1.15, 0, 1.1, 1.9, 1.1, { color: IMP.darkMetal, texel: 1 });
  box(RIB, 0, 2.18, 0, 1.7, 0.16, 1.3, { color: IMP.trim, texel: 1 });
  box("impRubber", 0, 2.3, 0, 1.4, 0.1, 1.1, { color: IMP.rubber });
  for (const s of [-1, 1]) box("impRubber", s * 0.62, 2.42, 0, 0.16, 0.16, 1.1, { color: IMP.rubber });
  box("blinkSparse", 0, 1.4, 0.56, 0.6, 0.2, 0.01, { uv: "keep" });
  box("emitGreen", 0.3, 1.7, 0.56, 0.08, 0.06, 0.01);
  if (collide) {
    for (const sx of wings) footprint(kit, f, [f.L(sx * 3.35, 0, 0).x, pos[1], f.L(sx * 3.35, 0, 0).z], 0.5, 3.5, 1.0, "cradle");
    footprint(kit, f, pos, 0.9, 0.9, 2.4, "cradle");
  }
}

// A-frame stand a detached wing panel leans against (the wing itself: tie.js addTIEWing with
// tilt = -lean about its chord). pos = floor point under the wing centre, yaw = wing yaw; the stand is
// built on the local -x side, the side the top of the wing leans toward.
export function wingStand(kit, pos, yaw, opts = {}) {
  const { lean = 0.2, collide = true } = opts;
  const f = local(pos, yaw);
  const box = boxer(kit, f);
  const hBar = 5.0;
  const xBar = -(hBar - 3.75 * Math.cos(lean)) * Math.tan(lean) - 0.25;
  for (const z of [-1.4, 1.4]) {
    // inclined leg from the base out at -x to the bar
    const xFoot = xBar - 1.6;
    const len = Math.hypot(hBar, xFoot - xBar);
    const g = new THREE.BoxGeometry(0.14, len, 0.14);
    const q = f.q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.atan2(xFoot - xBar, hBar)));
    const p = f.L((xFoot + xBar) / 2, hBar / 2, z);
    kit.add(RIB, g, { pos: [p.x, p.y, p.z], quat: q, color: IMP.trim, texel: 1 });
    box(RIB, xBar - 0.02, hBar / 2, z, 0.14, hBar, 0.14, { color: IMP.trim, texel: 1 });
    box(RIB, xBar - 0.8, 0.08, z, 1.9, 0.16, 0.3, { color: IMP.darkMetal, texel: 1 });
  }
  box("impMetal", xBar, hBar, 0, 0.12, 0.12, 3.2, { color: IMP.steel });
  box("impRubber", xBar + 0.1, hBar, 0, 0.1, 0.4, 3.0, { color: IMP.rubber });
  box("impMetal", xBar - 0.02, hBar * 0.55, 0, 0.1, 0.1, 3.0, { color: IMP.steel });
  box("hazard", xBar - 0.8, 0.17, 0, 1.9, 0.02, 3.1, { uv: "world", texel: 1 });
  // chocks under the wing's bottom edge
  const xBottom = 3.75 * Math.sin(lean);
  for (const z of [-1.2, 1.2]) box("impRubber", xBottom, 0.12, z, 0.6, 0.24, 0.5, { color: IMP.rubber });
  if (collide) footprint(kit, f, [f.L(xBar - 0.6, 0, 0).x, pos[1], f.L(xBar - 0.6, 0, 0).z], 1.3, 1.7, hBar, "wingStand");
}

// Ceiling bridge crane: rails on brackets along two side walls (running along z at x = rx0 / rx1),
// a bridge across x at z, a trolley at trolleyX with the hook block hookDrop below the rail.
export function bridgeCrane(kit, { rx0, rx1, z0, z1, z, y, trolleyX = 0, hookDrop = 4, tone = IMP.wallDark }) {
  for (const rx of [rx0, rx1]) {
    const s = rx < (rx0 + rx1) / 2 ? -1 : 1;
    kit.boxMM(RIB, [rx - 0.4, y - 0.5, z0], [rx + 0.4, y, z1], { color: IMP.trim, texel: 0.5 });
    kit.boxMM("impMetal", [rx - 0.2, y, z0], [rx + 0.2, y + 0.1, z1], { color: IMP.steel });
    for (let zz = z0 + 2; zz < z1; zz += 5) kit.box(RIB, rx + s * 0.5, y - 0.8, zz, 0.8, 1.2, 0.5, { color: IMP.darkMetal, texel: 1 });
  }
  const L = rx1 - rx0 + 0.6;
  const cx = (rx0 + rx1) / 2;
  kit.box(RIB, cx, y + 0.75, z, L, 1.3, 1.0, { color: tone, texel: 0.5 });
  kit.box(RIB, cx, y + 0.75, z, L, 0.25, 1.2, { color: IMP.trim, texel: 0.5 });
  kit.box("hazard", cx, y + 1.45, z, L, 0.12, 1.02, { uv: "world", texel: 1 });
  for (const rx of [rx0, rx1]) kit.box(RIB, rx, y + 0.5, z, 1.4, 1.2, 2.0, { color: IMP.darkMetal, texel: 1 });
  kit.box(RIB, trolleyX, y + 0.1, z, 2.4, 1.0, 1.8, { color: IMP.darkMetal, texel: 1 });
  kit.cyl("impMetal", trolleyX, y - 0.25, z, 0.4, 1.4, "x", { color: IMP.gunmetal, segments: 14 });
  kit.box("emitAmber", trolleyX, y + 0.62, z + 0.91, 1.2, 0.08, 0.01);
  kit.box("impMetal", trolleyX, y - hookDrop / 2 - 0.4, z, 0.05, hookDrop, 0.05, { color: IMP.steel });
  kit.box(RIB, trolleyX, y - hookDrop - 0.7, z, 1.0, 0.7, 0.5, { color: IMP.hazardYellow, texel: 1 });
  kit.box("impMetal", trolleyX, y - hookDrop - 1.35, z, 0.16, 0.7, 0.4, { color: IMP.steel });
  return { hookY: y - hookDrop - 1.7 };
}

// Stack of cargo containers (uses the shared crate), n high
export function crateStack(kit, pos, yaw, opts = {}) {
  const { seed = 1, n = 2, size = [2.2, 1.4, 1.6] } = opts;
  const [w, h, d] = size;
  for (let i = 0; i < n; i++) crate(kit, [pos[0], pos[1] + i * h, pos[2]], [w - i * 0.15, h, d - i * 0.1], { yaw: yaw + (i % 2 ? 0.08 : 0), seed: seed + i, collide: i === 0 });
}

// Deck tractor: a low tug that tows sleds and fighters across the deck. Chassis on four wheels, open
// cab at the rear with a dark canopy, amber beacon, hitch at the front (yaw 0 = front toward -Z).
export function deckTractor(kit, pos, yaw, opts = {}) {
  const { collide = true, tone = IMP.wallMid } = opts;
  const f = local(pos, yaw);
  const box = boxer(kit, f);
  box(RIB, 0, 0.62, 0.1, 1.9, 0.5, 3.4, { color: IMP.darkMetal, texel: 1 });
  box(RIB, 0, 0.98, -0.75, 1.7, 0.3, 1.7, { color: tone, texel: 1 }); // bonnet
  box("hazard", 0, 0.5, 0.1, 1.92, 0.16, 3.42, { uv: "world", texel: 1 });
  for (const sx of [-1, 1]) for (const sz of [-1.15, 1.15]) cylAt(kit, f, "impRubber", sx * 1.0, 0.45, sz, 0.45, 0.4, "x", { color: IMP.rubber, segments: 14 });
  for (const sx of [-1, 1]) for (const sz of [-1.15, 1.15]) cylAt(kit, f, "impMetal", sx * 1.21, 0.45, sz, 0.22, 0.04, "x", { color: IMP.steel, segments: 10 });
  // cab: seat + control column + canopy frame
  box(RIB, 0, 1.15, 0.9, 1.5, 0.6, 1.2, { color: tone, texel: 1 });
  box("impRubber", 0, 1.5, 1.25, 0.9, 0.12, 0.5, { color: IMP.rubber });
  box("impRubber", 0, 1.85, 1.5, 0.9, 0.6, 0.12, { color: IMP.rubber });
  box(RIB, 0, 1.7, 0.4, 0.6, 0.5, 0.2, { color: IMP.consoleDark, texel: 1, tilt: -0.4 });
  box("blinkSparse", 0, 1.8, 0.28, 0.5, 0.18, 0.01, { uv: "keep", tilt: -0.4 });
  for (const sx of [-1, 1]) box(RIB, sx * 0.74, 1.95, 1.55, 0.08, 1.3, 0.08, { color: IMP.trim, texel: 1 });
  for (const sx of [-1, 1]) box(RIB, sx * 0.74, 2.15, 0.25, 0.08, 0.9, 0.08, { color: IMP.trim, texel: 1 });
  box(RIB, 0, 2.62, 0.9, 1.6, 0.1, 1.5, { color: IMP.trim, texel: 1 });
  box("darkGloss", 0, 2.1, 0.22, 1.4, 0.9, 0.06); // tinted windscreen (a key every bay already batches)
  box("emitAmber", 0, 2.75, 1.2, 0.22, 0.16, 0.22);
  // headlights, hitch, rear pintle
  for (const sx of [-1, 1]) box("emitBlue", sx * 0.6, 0.98, -1.61, 0.3, 0.1, 0.02);
  box("impMetal", 0, 0.55, -2.0, 0.14, 0.12, 0.7, { color: IMP.steel });
  box("impMetal", 0, 0.62, -2.3, 0.3, 0.26, 0.12, { color: IMP.steel });
  box("impMetal", 0, 0.62, 1.95, 0.4, 0.3, 0.3, { color: IMP.gunmetal });
  if (collide) footprint(kit, f, pos, 1.0, 2.0, 2.7, "tractor");
}

// Cargo sled: a flat bed on two skids with a tow bar and a load of crates (or a tank when load = 'tank')
export function cargoSled(kit, pos, yaw, opts = {}) {
  const { collide = true, seed = 3, load = "crates", n = 2 } = opts;
  const f = local(pos, yaw);
  const box = boxer(kit, f);
  for (const sx of [-1, 1]) box(RIB, sx * 1.05, 0.12, 0, 0.3, 0.24, 4.4, { color: IMP.trim, texel: 1 });
  box(RIB, 0, 0.32, 0, 2.5, 0.16, 4.0, { color: IMP.darkMetal, texel: 1 });
  box("hazard", 0, 0.32, 0, 2.52, 0.1, 4.02, { uv: "world", texel: 1 });
  box("impMetal", 0, 0.28, -2.6, 0.12, 0.1, 1.2, { color: IMP.steel });
  box("impMetal", 0, 0.28, -3.15, 0.5, 0.1, 0.12, { color: IMP.steel });
  for (const sz of [-1.8, 1.8]) for (const sx of [-1, 1]) box(RIB, sx * 1.15, 0.7, sz, 0.1, 0.6, 0.1, { color: IMP.hazardYellow, texel: 1 });
  const top = 0.4;
  if (load === "tank") {
    cylAt(kit, f, RIB, 0, top + 0.9, 0, 0.85, 3.4, "z", { color: IMP.wallLight, texel: 1, segments: 18 });
    for (const z of [-1.0, 1.0]) box("impMetal", 0, top + 0.9, z, 1.8, 1.8, 0.1, { color: IMP.gunmetal });
    box("hazard", 0, top + 0.9, 0, 1.75, 0.3, 1.2, { uv: "world", texel: 1 });
  } else {
    const p = f.L(0, top, 0);
    for (let i = 0; i < n; i++) crate(kit, [p.x, p.y + i * 1.2, p.z], [2.0 - i * 0.1, 1.2, 3.2 - i * 0.2], { yaw: yaw + (i % 2 ? 0.05 : 0), seed: seed + i, collide: false });
  }
  if (collide) footprint(kit, f, pos, 1.3, 2.3, 2.6, "sled");
}

// Ground power unit: a generator cabinet with vent slats, exhaust stack, panel and a cable reel;
// returns the cable outlet [x,y,z] so callers can run a pipeRun to the craft it feeds.
export function generator(kit, pos, yaw, opts = {}) {
  const { collide = true, tone = IMP.consoleDark } = opts;
  const f = local(pos, yaw);
  const box = boxer(kit, f);
  box(RIB, 0, 0.12, 0, 1.6, 0.24, 2.4, { color: IMP.trim, texel: 1 });
  box("hazard", 0, 0.12, 0, 1.62, 0.16, 2.42, { uv: "world", texel: 1 });
  box(RIB, 0, 0.95, 0, 1.4, 1.4, 2.2, { color: tone, texel: 1 });
  box(RIB, 0, 1.7, 0, 1.46, 0.12, 2.26, { color: IMP.trim, texel: 1 });
  for (const sx of [-1, 1]) for (let s = 0; s < 5; s++) box("impMetal", sx * 0.71, 0.5 + s * 0.2, -0.4, 0.02, 0.06, 1.0, { color: IMP.gunmetal });
  cylAt(kit, f, "impMetal", 0.4, 2.0, 0.6, 0.14, 0.6, "y", { color: IMP.gunmetal, segments: 10 });
  box(RIB, -0.3, 1.2, 1.115, 0.7, 0.5, 0.03, { color: IMP.wallDark, texel: 1 });
  box("blinkSparse", -0.3, 1.25, 1.135, 0.56, 0.24, 0.01, { uv: "keep" });
  box("emitGreen", -0.55, 0.9, 1.135, 0.08, 0.06, 0.01);
  box("emitAmber", -0.05, 0.9, 1.135, 0.08, 0.06, 0.01);
  // cable reel on the +x side, cable tail to the deck
  cylAt(kit, f, "impMetal", 0.82, 0.9, 0.3, 0.42, 0.24, "x", { color: IMP.gunmetal, segments: 14 });
  const coil = new THREE.TorusGeometry(0.34, 0.08, 6, 18);
  coil.rotateY(Math.PI / 2);
  const cp = f.L(0.94, 0.9, 0.3);
  kit.add("impRubber", coil, { pos: [cp.x, cp.y, cp.z], quat: f.q, color: IMP.rubber, uv: "scale", uvScale: [3, 1] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cylAt(kit, f, "impRubber", sx * 0.7, 0.14, sz * 0.95, 0.14, 0.12, "x", { color: IMP.rubber, segments: 10 });
  if (collide) footprint(kit, f, pos, 0.95, 1.25, 2.0, "generator");
  const out = f.L(0.95, 0.5, 0.3);
  return [out.x, out.y, out.z];
}

// Rolling maintenance ladder: an inclined stair on a wheeled frame up to a small railed platform
export function rollingLadder(kit, pos, yaw, opts = {}) {
  const { h = 2.6, collide = true } = opts;
  const f = local(pos, yaw);
  const box = boxer(kit, f);
  const run = h * 0.75;
  const w = 0.9;
  box(RIB, 0, 0.1, 0, w + 0.3, 0.12, run + 1.2, { color: IMP.trim, texel: 1 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cylAt(kit, f, "impRubber", sx * (w / 2 + 0.1), 0.12, sz * (run / 2 + 0.4), 0.12, 0.1, "x", { color: IMP.rubber, segments: 10 });
  const n = Math.max(3, Math.round(h / 0.26));
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    box("impDeck", 0, 0.12 + t * (h - 0.12), run / 2 - t * run, w - 0.1, 0.05, 0.28, { color: IMP.wallDark, texel: 1 });
  }
  for (const sx of [-1, 1]) {
    const bar = new THREE.BoxGeometry(0.08, 0.12, Math.hypot(run, h));
    // the flight climbs toward -z: a negative tilt about x raises the -z end
    const bq = f.q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, -Math.atan2(h, run)));
    const bp = f.L(sx * (w / 2), h / 2 + 0.1, 0);
    kit.add(RIB, bar, { pos: [bp.x, bp.y, bp.z], quat: bq, color: IMP.hazardYellow, texel: 1 });
    const rail = new THREE.BoxGeometry(0.04, 0.04, Math.hypot(run, h));
    const rp = f.L(sx * (w / 2 + 0.02), h / 2 + 1.0, 0);
    kit.add("impMetal", rail, { pos: [rp.x, rp.y, rp.z], quat: bq, color: IMP.steel });
    for (const z of [run / 2 - 0.1, -run / 2 + 0.1]) box(RIB, sx * (w / 2 + 0.02), (z > 0 ? 0.12 : h) + 0.5, z, 0.05, 1.0, 0.05, { color: IMP.trim });
    box(RIB, sx * (w / 2 + 0.02), h + 0.9, -run / 2 - 0.5, 0.05, 0.05, 1.0, { color: IMP.trim });
  }
  box("impDeck", 0, h + 0.03, -run / 2 - 0.5, w, 0.06, 1.0, { color: IMP.wallDark, texel: 1 });
  box("hazard", 0, h + 0.03, -run / 2 - 0.5, w + 0.02, 0.04, 1.02, { uv: "world", texel: 1 });
  for (const sx of [-1, 1]) box(RIB, sx * (w / 2 - 0.05), h / 2, -run / 2 - 0.95, 0.08, h, 0.08, { color: IMP.trim, texel: 1 });
  if (collide) footprint(kit, f, pos, w / 2 + 0.2, run / 2 + 0.7, h + 1.0, "ladder");
}

// Wall console bank in a wall frame (tall wall consoles are 2 m; these are big bay status boards)
export function statusBoard(frame, u, v, w, h, opts = {}) {
  const { seed = 4 } = opts;
  const rand = rng(seed);
  frame.box(RIB, u, v, 0.08, w + 0.3, h + 0.3, 0.16, { color: IMP.consoleDark, texel: 1 });
  const cols = Math.max(1, Math.round(w / 1.6));
  for (let i = 0; i < cols; i++) {
    const cu = u - w / 2 + (w / cols) * (i + 0.5);
    frame.box("darkGloss", cu, v + h * 0.12, 0.17, w / cols - 0.16, h * 0.62, 0.01);
    frame.box("screen" + Math.floor(rand() * 3), cu, v + h * 0.12, 0.176, w / cols - 0.24, h * 0.56, 0.004, { uv: "keep" });
  }
  frame.box("blink", u, v - h * 0.36, 0.17, w - 0.3, h * 0.2, 0.01, { uv: "keep" });
  frame.box("leds", u, v - h / 2 - 0.05, 0.165, Math.min(w, 3), 0.06, 0.01, { uv: "keep" });
}

// ---------------------------------------------------------------------------
// Baking helpers for animated / instanced parts
// ---------------------------------------------------------------------------
// Run fn(kit) on a scratch Kit and return Map(materialKey -> merged geometry) with vertex colours baked.
export function bakeParts(mats, fn) {
  const k = new Kit(mats);
  fn(k);
  const out = new Map();
  for (const [key, geos] of k.groups) {
    const g = mergeGeometries(geos, false);
    if (!g) continue;
    g.computeBoundingSphere();
    g.computeBoundingBox();
    out.set(key, g);
  }
  return out;
}
// One InstancedMesh per baked material, `count` instances, all registered on the room kit.
// Returns { meshes, set(i, matrix), commit() }.
export function instancedSet(kit, mats, parts, count, { shadow = true, noShadow = null } = {}) {
  const meshes = [];
  for (const [key, geo] of parts) {
    const material = mats[key];
    if (!material) throw new Error("instancedSet: unknown material " + key);
    const im = new THREE.InstancedMesh(geo, material, count);
    im.name = "inst_" + key;
    const emissive = noShadow ? noShadow.has(key) : key.startsWith("emit") || key.startsWith("light") || key === "beam" || key === "beaconGlow";
    im.castShadow = shadow && !emissive;
    im.receiveShadow = !emissive;
    im.frustumCulled = true;
    kit.object(im);
    meshes.push(im);
  }
  const set = (i, m) => {
    for (const im of meshes) im.setMatrixAt(i, m);
  };
  const commit = () => {
    for (const im of meshes) {
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
    }
  };
  return { meshes, set, commit };
}
// Build a dynamic Group from a scratch Kit (one mesh per material) — for animated assemblies like cranes.
export function bakeGroup(mats, fn, { noShadow = null } = {}) {
  const k = new Kit(mats);
  fn(k);
  const g = new THREE.Group();
  k.build(g, { noShadow });
  return g;
}
