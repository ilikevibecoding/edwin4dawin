// Command tower (workstream EXT-A, massing revised by EXT-C): neck storeys with recessed window
// bands and pilasters, a two-step plinth and solid sloped fairings carrying the neck out to the
// bridge module, the bridge module itself (forward face split into plated and recessed dark bands,
// viewport cut-outs and viewGlass planes exactly where spec.TOWER puts them), layered frame steps
// and brow around the viewport strip, side window bands, roof plating, stepped underside, aft docking
// port, sensor blisters, the two shield generator domes with plinths / rings / ribs and the comms mast.
import * as THREE from "three";
import { panelWithHoles } from "../kit.js";
import { PALETTE } from "../materials.js";
import { TOWER } from "../spec.js";
import { plateField, shade, mixC, C, plateTone, fieldNoise, TEXEL, EMIT } from "./hull_util.js";
import { hexa } from "./superstructure.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const Q = (from, to) => new THREE.Quaternion().setFromUnitVectors(from, to);
const Z = V(0, 0, 1);
// gradient helpers must never feed pow() a negative base: one NaN vertex colour in an additive mesh
// gets into the scene env-map capture and PMREM spreads it over every reflective surface
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

export function buildTower(ctx) {
  const { chunks, rand } = ctx;
  const L = PALETTE.hullLight;
  const M = PALETTE.hullMid;
  const D = PALETTE.hullDark;
  const T = PALETTE.hullTrench;
  const tintFor = (base, x, y) => shade(base, 0.95 + fieldNoise(x, y, 60, 17) * 0.1);
  const n = TOWER.neck;
  const b = TOWER.bridge;
  const zc = (n.z0 + n.z1) / 2;
  const hw = (y) => n.hw + n.draft * (n.yTop - y);
  const hl = (y) => (n.z1 - n.z0) / 2 + n.draft * (n.yTop - y) * 0.5;
  const at = (lvl, key) => chunks.batch(zc, lvl, key);

  // stepped plinth under the head: the neck storeys stop 12 m under the soffit and two 6 m slabs
  // carry the load up to the module underside (neck hw ≈ 61 → 65 → 85 → head 105), so the head
  // reads as a block set on a stack of steps rather than a slab on a post
  const PLINTH = [
    { y0: b.y0 - 12, y1: b.y0 - 6, hw: 65, z0: 246, z1: 376 },
    { y0: b.y0 - 6, y1: b.y0, hw: 85, z0: b.z0 + 12, z1: b.z1 - 6 },
  ];
  const yNeckTop = PLINTH[0].y0;
  // chin: a full-width block hanging under the forward edge of the head (depth 8 m proud of the face,
  // 11 m tall) with three hatch clusters — the head gets a jaw below the gallery windows
  const CHIN = { y0: b.y0 - 11, y1: b.y0, hx: b.hw - 6, z0: b.z0 - 8, z1: b.z0 + 12 };

  // ------------------------------------------------------------------ neck: storeys + pilasters
  {
    const storeys = 8;
    const sh = (yNeckTop - n.yBase) / storeys;
    const bandH = 2.6;
    const rec = 0.9;
    const pil = 1.3; // half-width of pilasters
    // faces: normal, point(y, s) with s along the face in [-1, 1]
    const faces = [
      { nrm: V(1, 0, 0), P: (y, s, d = 0) => V(hw(y) - d, y, zc + s * hl(y)), len: (y) => hl(y) },
      { nrm: V(-1, 0, 0), P: (y, s, d = 0) => V(-hw(y) + d, y, zc + s * hl(y)), len: (y) => hl(y) },
      { nrm: V(0, 0, 1), P: (y, s, d = 0) => V(s * hw(y), y, zc + hl(y) - d), len: (y) => hw(y) },
      { nrm: V(0, 0, -1), P: (y, s, d = 0) => V(s * hw(y), y, zc - hl(y) + d), len: (y) => hw(y) },
    ];
    for (const f of faces) {
      // pilaster positions as fractions of the half-length: corners handled separately
      const pilFr = [-1 / 3, 1 / 3];
      const segs = [];
      const bounds = [-1, ...pilFr, 1];
      for (let i = 0; i < bounds.length - 1; i++) segs.push([bounds[i], bounds[i + 1]]);
      for (let k = 0; k < storeys; k++) {
        const y0 = n.yBase + k * sh;
        const y1 = y0 + sh;
        const yb0 = y1 - bandH - 1.0;
        const yb1 = y1 - 1.0;
        const tint = tintFor(k % 3 === 2 ? M : mixC(M, L, 0.55), k * 10, 0);
        for (const [s0, s1] of segs) {
          // margins so the quads stop at the pilasters
          const m0 = (y) => s0 + (s0 === -1 ? pil * 1.3 : pil) / f.len(y);
          const m1 = (y) => s1 - (s1 === 1 ? pil * 1.3 : pil) / f.len(y);
          const far = at("far", "hullPlate1");
          far.quad(f.P(y0, m0(y0)), f.P(y0, m1(y0)), f.P(yb0, m1(yb0)), f.P(yb0, m0(yb0)), tint, TEXEL, f.nrm);
          far.quad(f.P(yb1, m0(yb1)), f.P(yb1, m1(yb1)), f.P(y1, m1(y1)), f.P(y1, m0(y1)), tint, TEXEL, f.nrm);
          const dark = at("far", "hullGreeble");
          dark.quad(f.P(yb0, m0(yb0)), f.P(yb0, m1(yb0)), f.P(yb0, m1(yb0), rec), f.P(yb0, m0(yb0), rec), D, TEXEL * 2, V(0, 1, 0));
          dark.quad(f.P(yb1, m0(yb1)), f.P(yb1, m1(yb1)), f.P(yb1, m1(yb1), rec), f.P(yb1, m0(yb1), rec), D, TEXEL * 2, V(0, -1, 0));
          dark.quad(f.P(yb0, m0(yb0), rec), f.P(yb0, m1(yb0), rec), f.P(yb1, m1(yb1), rec), f.P(yb1, m0(yb1), rec), T, TEXEL * 2, f.nrm);
          const ym = (yb0 + yb1) / 2;
          const a = f.P(ym, m0(ym), rec - 0.3);
          const c = f.P(ym, m1(ym), rec - 0.3);
          const len = a.distanceTo(c);
          const g = new THREE.PlaneGeometry(len - 0.8, bandH - 0.6);
          const mid = a.clone().add(c).multiplyScalar(0.5);
          at("far", "cityLights").addGeometry(g, { pos: [mid.x, mid.y, mid.z], quat: Q(Z, f.nrm), uv: "scale", uvScale: [len / 40, 0.34] });
        }
      }
      // intermediate pilasters (inclined hexahedra), full height
      for (const fr of pilFr) {
        const y0 = n.yBase - 0.5;
        const y1 = yNeckTop + 0.5;
        const rect = (y) => {
          const c = f.P(y, fr);
          const t = f.nrm.z !== 0 ? V(1, 0, 0) : V(0, 0, 1); // along the face
          const o = f.nrm.clone().multiplyScalar(1.2);
          const i = f.nrm.clone().multiplyScalar(-0.4);
          return [c.clone().addScaledVector(t, -pil).add(i), c.clone().addScaledVector(t, pil).add(i), c.clone().addScaledVector(t, pil).add(o), c.clone().addScaledVector(t, -pil).add(o)];
        };
        hexa(at("far", "hullPlate1"), rect(y0), rect(y1), mixC(M, D, 0.25), TEXEL, { skipBottom: true, skipSides: new Set([0]) });
      }
    }
    // corner columns
    for (const sx of [1, -1]) {
      for (const sz of [1, -1]) {
        const rect = (y) => {
          const cx = sx * (hw(y) + 0.2);
          const czz = zc + sz * (hl(y) + 0.2);
          const h = pil * 1.3;
          return [V(cx - h, y, czz - h), V(cx + h, y, czz - h), V(cx + h, y, czz + h), V(cx - h, y, czz + h)];
        };
        hexa(at("far", "hullPlate1"), rect(n.yBase - 0.5), rect(yNeckTop + 0.5), mixC(M, D, 0.25), TEXEL, { skipBottom: true });
      }
    }
    // base skirt and top collar
    const far = at("far", "hullPlate1");
    for (const [yc, hgt, proud, tint] of [
      [n.yBase + 1.25, 2.5, 2.0, D],
      [yNeckTop - 1.5, 3.0, 1.6, mixC(M, D, 0.5)],
    ]) {
      const w = hw(yc) + proud;
      const l = hl(yc) + proud;
      far.box(w - proud / 2, yc, zc, proud, hgt, l * 2, tint, TEXEL, { skip: new Set(["-x"]) });
      far.box(-w + proud / 2, yc, zc, proud, hgt, l * 2, tint, TEXEL, { skip: new Set(["+x"]) });
      far.box(0, yc, zc + l - proud / 2, w * 2, hgt, proud, tint, TEXEL, { skip: new Set(["-z"]) });
      far.box(0, yc, zc - l + proud / 2, w * 2, hgt, proud, tint, TEXEL, { skip: new Set(["+z"]) });
    }
    // plinth steps: plated slabs with a dark recessed reveal at each step's foot and a window band
    // on the lower step's flanks
    PLINTH.forEach((p, i) => {
      const pf = at("far", "hullPlate1");
      const zcP = (p.z0 + p.z1) / 2;
      const tint = tintFor(i === 0 ? mixC(L, M, 0.5) : mixC(L, M, 0.25), 0, p.y0);
      pf.box(0, (p.y0 + p.y1) / 2, zcP, p.hw * 2, p.y1 - p.y0, p.z1 - p.z0, tint, TEXEL, { skip: new Set(i === 1 ? ["+y"] : []) });
      // reveal: a dark 1.2 m band set 0.6 m in at the foot (reads as a shadow line between the steps)
      const dk = at("far", "hullGreeble");
      const yr0 = p.y0 + 0.05;
      const yr1 = p.y0 + 1.4;
      for (const s of [-1, 1]) {
        dk.quad(V(s * (p.hw + 0.05), yr0, p.z0), V(s * (p.hw + 0.05), yr0, p.z1), V(s * (p.hw + 0.05), yr1, p.z1), V(s * (p.hw + 0.05), yr1, p.z0), T, TEXEL * 2, V(s, 0, 0));
        dk.quad(V(-p.hw, yr0, zcP + s * ((p.z1 - p.z0) / 2 + 0.05)), V(p.hw, yr0, zcP + s * ((p.z1 - p.z0) / 2 + 0.05)), V(p.hw, yr1, zcP + s * ((p.z1 - p.z0) / 2 + 0.05)), V(-p.hw, yr1, zcP + s * ((p.z1 - p.z0) / 2 + 0.05)), T, TEXEL * 2, V(0, 0, s));
      }
      if (i === 0) {
        const yw = (p.y0 + p.y1) / 2 + 0.6;
        for (const s of [-1, 1]) {
          const g = new THREE.PlaneGeometry(p.z1 - p.z0 - 24, 1.8);
          at("far", "cityLights").addGeometry(g, { pos: [s * (p.hw + 0.12), yw, zcP], quat: Q(Z, V(s, 0, 0)), uv: "scale", uvScale: [(p.z1 - p.z0 - 24) / 40, 0.34] });
          const g2 = new THREE.PlaneGeometry(p.hw * 2 - 30, 1.8);
          at("far", "cityLights").addGeometry(g2, { pos: [0, yw, zcP + s * ((p.z1 - p.z0) / 2 + 0.12)], quat: Q(Z, V(0, 0, s)), uv: "scale", uvScale: [(p.hw * 2 - 30) / 40, 0.34] });
        }
      }
    });
    // chin block under the forward edge of the head: plated box, a dark reveal along its top edge
    // (shadow line against the face above), three hatch clusters and a pair of lamps on its face
    {
      const c = CHIN;
      const pf = at("far", "hullPlate1");
      const zcC = (c.z0 + c.z1) / 2;
      pf.box(0, (c.y0 + c.y1) / 2, zcC, c.hx * 2, c.y1 - c.y0, c.z1 - c.z0, tintFor(mixC(L, M, 0.35), 0, c.y0), TEXEL, { skip: new Set(["+y", "+z"]) });
      const dk = at("far", "hullGreeble");
      dk.quad(V(-c.hx, c.y1 - 1.3, c.z0 - 0.05), V(c.hx, c.y1 - 1.3, c.z0 - 0.05), V(c.hx, c.y1 + 0.05, c.z0 - 0.05), V(-c.hx, c.y1 + 0.05, c.z0 - 0.05), T, TEXEL * 2, V(0, 0, -1));
      for (const s of [-1, 1]) dk.quad(V(s * (c.hx + 0.05), c.y1 - 1.3, c.z0), V(s * (c.hx + 0.05), c.y1 - 1.3, c.z1), V(s * (c.hx + 0.05), c.y1 + 0.05, c.z1), V(s * (c.hx + 0.05), c.y1 + 0.05, c.z0), T, TEXEL * 2, V(s, 0, 0));
      // dark reveal at the foot (the chin's underside meets the plinth step behind it)
      dk.quad(V(-c.hx, c.y0 - 0.05, c.z0 - 0.05), V(c.hx, c.y0 - 0.05, c.z0 - 0.05), V(c.hx, c.y0 + 0.9, c.z0 - 0.05), V(-c.hx, c.y0 + 0.9, c.z0 - 0.05), T, TEXEL * 2, V(0, 0, -1));
      const hz = at("mid", "hullPlate1");
      for (const xc of [-0.62, 0, 0.62]) {
        const cnt = 3;
        for (let hi = 0; hi < cnt; hi++) {
          const x = xc * c.hx + (hi - 1) * 4.2;
          hz.box(x, c.y0 + 5.2, c.z0 - 0.3, 3.0, 3.0, 0.6, mixC(plateTone(rand), M, 0.5), TEXEL, { skip: new Set(["+z"]) });
          hz.box(x, c.y0 + 5.2, c.z0 - 0.75, 1.9, 1.9, 0.3, D, TEXEL * 2, { skip: new Set(["+z"]) });
        }
      }
      // horizontal conduit along the chin with clamps
      const pipe = at("mid", "hullGreeble");
      pipe.tube(V(-c.hx * 0.92, c.y0 + 2.2, c.z0 - 0.9), V(c.hx * 0.92, c.y0 + 2.2, c.z0 - 0.9), 0.45, 0.45, 8, mixC(M, D, 0.3), TEXEL * 4);
      for (let x = -c.hx * 0.88; x < c.hx * 0.9; x += 9) pipe.box(x, c.y0 + 2.2, c.z0 - 0.5, 1.2, 1.5, 1.0, D, TEXEL * 4, { skip: new Set(["+z"]) });
    }
    // solid sloped fairings from the neck faces up to the head underside (they pass outside the
    // plinth steps): a hexahedron whose outer face slopes from the neck at y 160 to the module edge
    const fair = at("far", "hullPlate1");
    const fTint = mixC(L, M, 0.6);
    const yf0 = 160;
    const yf1 = b.y0 - 0.1;
    for (const sx of [1, -1]) {
      for (const zg of [271, 349]) {
        const th = 15;
        const xi0 = sx * (hw(yf0) - 0.3);
        const xi1 = sx * (hw(yf1) - 0.3);
        const xo = sx * (b.hw - 2.5);
        const bot = [V(xi0, yf0, zg - th), V(xi0 + sx * 0.6, yf0, zg - th), V(xi0 + sx * 0.6, yf0, zg + th), V(xi0, yf0, zg + th)];
        const top = [V(xi1, yf1, zg - th), V(xo, yf1, zg - th), V(xo, yf1, zg + th), V(xi1, yf1, zg + th)];
        hexa(fair, bot, top, fTint, TEXEL, { skipBottom: true, skipTop: true, skipSides: new Set([3]) });
      }
    }
    // fore and aft fairings along the centreline (wider, from y 185)
    for (const sz of [1, -1]) {
      const th = 20;
      const yA = 185;
      const zi0 = zc + sz * (hl(yA) - 0.3);
      const zi1 = zc + sz * (hl(yf1) - 0.3);
      const zo = sz > 0 ? b.z1 - 3 : b.z0 + 6;
      const bot = [V(-th, yA, zi0), V(th, yA, zi0), V(th, yA, zi0 + sz * 0.6), V(-th, yA, zi0 + sz * 0.6)];
      const top = [V(-th, yf1, zi1), V(th, yf1, zi1), V(th, yf1, zo), V(-th, yf1, zo)];
      hexa(fair, bot, top, fTint, TEXEL, { skipBottom: true, skipTop: true, skipSides: new Set([0]) });
    }
  }

  // ------------------------------------------------------------------ bridge module
  {
    const vp = TOWER.viewports;
    const gv = TOWER.galleryViewports;
    const w = b.hw * 2;
    // the face slab is only 1 m thick (z0 .. z0+1): the bridge and observation-gallery interiors start
    // right behind it (their forward walls sit at z0+1 and z0+3), so nothing may reach further aft
    const FACE_T = 1.0;
    const zFace = b.z0 + FACE_T / 2;
    // horizontal pieces of the forward face: [y0, y1, dark?]
    const bandA = [vp.y0 - 2.1, vp.y1 + 2.1];
    const bandB = [gv.y0 - 1.0, gv.y1 + 1.2];
    const pieces = [
      [bandA[1], b.y1, false],
      [bandA[0], bandA[1], true],
      [bandB[1], bandA[0], false],
      [bandB[0], bandB[1], true],
      [b.y0, bandB[0], false],
    ];
    const vw = (vp.hw * 2 - vp.pillar * (vp.count - 1)) / vp.count;
    const gw = (gv.x1 - gv.x0) / gv.count;
    for (const [y0, y1, dark] of pieces) {
      const cy = (y0 + y1) / 2;
      const holes = [];
      if (dark && y0 < vp.y0 && y1 > vp.y1) {
        for (let i = 0; i < vp.count; i++) {
          const x = -vp.hw + vw / 2 + i * (vw + vp.pillar);
          const yc = (vp.y0 + vp.y1) / 2 - cy;
          const hh = (vp.y1 - vp.y0) / 2;
          holes.push({ points: [[x - vw / 2 + 0.25, yc - hh], [x + vw / 2 - 0.25, yc - hh], [x + vw / 2, yc + hh], [x - vw / 2, yc + hh]] });
        }
      }
      if (dark && y0 < gv.y0 && y1 > gv.y1) {
        for (const s of [-1, 1]) {
          for (let i = 0; i < gv.count; i++) {
            const x = s * (gv.x0 + gw * (i + 0.5));
            holes.push({ x, y: (gv.y0 + gv.y1) / 2 - cy, w: gw - 0.9, h: gv.y1 - gv.y0 });
          }
        }
      }
      const face = panelWithHoles(w, y1 - y0, FACE_T, holes);
      face.rotateY(Math.PI); // extrusion along -z: outward normal faces -z (forward)
      at("far", dark ? "hullGreeble" : "hullPlate").addGeometry(face, { pos: [0, cy, zFace], color: dark ? T : tintFor(L, 0, cy), texel: dark ? TEXEL * 2 : TEXEL });
    }
    // viewport glass 1 m inside the face (shared with the bridge / observation interiors)
    at("far", "viewGlass").addGeometry(new THREE.PlaneGeometry(vp.hw * 2 + 1, vp.y1 - vp.y0 + 0.4), { pos: [0, (vp.y0 + vp.y1) / 2, b.z0 + FACE_T / 2], uv: "keep" });
    for (const s of [-1, 1]) at("far", "viewGlass").addGeometry(new THREE.PlaneGeometry(gv.x1 - gv.x0, gv.y1 - gv.y0 + 0.2), { pos: [(s * (gv.x0 + gv.x1)) / 2, (gv.y0 + gv.y1) / 2, b.z0 + FACE_T / 2], uv: "keep" });
    // lit-interior panes between the glass (z0 + 0.5) and the interior walls (z0 + 1): one additive,
    // front-facing plane per window, cool white brighter at the ceiling line, each window a little
    // different. Additive, so the rooms' own consoles and lights still show through the glow; front
    // side only, so from inside the bridge / gallery they are culled and the view out stays open.
    {
      const glowZ = b.z0 + 0.75;
      const fwd = V(0, 0, -1);
      const pane = at("far", "exta_pane");
      const litPane = (x0, x1, y0, y1, tone, top, bottom) => {
        const c = C(tone);
        pane.grid(V(x1, y0, glowZ), V(x0, y0, glowZ), V(x0, y1, glowZ), V(x1, y1, glowZ), 1, 2, (p) => c.clone().multiplyScalar(bottom + (top - bottom) * Math.pow(clamp01((p.y - y0) / (y1 - y0)), 1.6)), 1, fwd);
      };
      // 2–3 console-orange points low in each window (the bridge crew pits' displays seen from outside)
      const consoles = (x0, x1, y0) => {
        const cnt = 2 + Math.floor(rand() * 2);
        const c = C(0xff9a3c).multiplyScalar(1.6);
        for (let i = 0; i < cnt; i++) {
          const x = x0 + 0.6 + (x1 - x0 - 1.2) * ((i + 0.5 + (rand() - 0.5) * 0.5) / cnt);
          const y = y0 + 0.5 + rand() * 0.5;
          pane.quad(V(x + 0.3, y, glowZ - 0.02), V(x - 0.3, y, glowZ - 0.02), V(x - 0.3, y + 0.28, glowZ - 0.02), V(x + 0.3, y + 0.28, glowZ - 0.02), c, 1, fwd);
        }
      };
      for (let i = 0; i < vp.count; i++) {
        const x = -vp.hw + vw / 2 + i * (vw + vp.pillar);
        const k = 0.85 + 0.3 * rand();
        litPane(x - vw / 2 - 0.15, x + vw / 2 + 0.15, vp.y0 - 0.15, vp.y1 + 0.15, 0xc8d8ff, 0.7 * k, 0.32 * k);
        consoles(x - vw / 2, x + vw / 2, vp.y0);
      }
      // observation gallery: the same cool interior tone, dimmer — these read as windows on the deck
      // below the bridge, not as a second row of lit panels
      for (const s of [-1, 1]) {
        for (let i = 0; i < gv.count; i++) {
          const x = s * (gv.x0 + gw * (i + 0.5));
          const k = 0.8 + 0.35 * rand();
          litPane(x - gw / 2 + 0.3, x + gw / 2 - 0.3, gv.y0 - 0.1, gv.y1 + 0.1, 0xc8d8ff, 0.5 * k, 0.24 * k);
          consoles(x - gw / 2 + 0.6, x + gw / 2 - 0.6, gv.y0);
        }
      }
    }
    // corner pilasters, layered plate steps framing the viewport strip, proud plates on the outer
    // light bands, brow (to the pilasters) and sill
    {
      const mid = at("mid", "hullPlate1");
      const farP = at("far", "hullPlate1");
      const pilW = 3.2;
      const xPil = b.hw - pilW / 2 - 0.4;
      for (const s of [-1, 1]) farP.box(s * xPil, (b.y0 + b.y1) / 2, b.z0 - 0.6, pilW, b.y1 - b.y0, 1.2, mixC(M, D, 0.25), TEXEL, { skip: new Set(["+z"]) });
      // three frame layers around the viewport band, each wider and shallower than the last, built
      // as top / bottom bars and side blocks so the band itself and the gallery band stay open
      const frame = [
        { dy: 3.0, hx: vp.hw + 12, proud: 0.75, tint: mixC(L, M, 0.2) },
        { dy: 6.5, hx: vp.hw + 26, proud: 0.45, tint: mixC(L, M, 0.4) },
        { dy: 9.0, hx: xPil - pilW / 2 - 0.8, proud: 0.25, tint: mixC(L, M, 0.55) },
      ];
      let prev = { dy: 0, hx: vp.hw + 7 };
      for (const f of frame) {
        const yLo = bandA[0] - f.dy;
        const yHi = bandA[1] + f.dy;
        const yLoP = bandA[0] - prev.dy;
        const yHiP = bandA[1] + prev.dy;
        const zc2 = b.z0 - f.proud / 2;
        mid.box(0, (yHiP + yHi) / 2, zc2, f.hx * 2, yHi - yHiP, f.proud, tintFor(f.tint, 0, yHi), TEXEL, { skip: new Set(["+z"]) });
        mid.box(0, (yLo + yLoP) / 2, zc2, f.hx * 2, yLoP - yLo, f.proud, tintFor(f.tint, 0, yLo), TEXEL, { skip: new Set(["+z"]) });
        for (const s of [-1, 1]) mid.box(s * ((prev.hx + f.hx) / 2), (yLo + yHi) / 2, zc2, f.hx - prev.hx, yHi - yLo, f.proud, tintFor(f.tint, s * f.hx, 0), TEXEL, { skip: new Set(["+z"]) });
        prev = f;
      }
      // proud plates on the light bands above the frame and above the gallery band
      for (const [y0, y1] of [[bandA[1] + frame[2].dy + 0.6, b.y1 - 0.8], [bandB[1] + 0.6, bandA[0] - frame[2].dy - 0.6]]) {
        if (y1 - y0 < 1.6) continue;
        const cols = 5;
        for (let i = 0; i < cols; i++) {
          const x0 = -b.hw + 1.2 + (i * (w - 2.4)) / cols + 0.7;
          const x1 = -b.hw + 1.2 + ((i + 1) * (w - 2.4)) / cols - 0.7;
          mid.box((x0 + x1) / 2, (y0 + y1) / 2, b.z0 - 0.5, x1 - x0, y1 - y0, 1.0, shade(mixC(plateTone(rand), L, 0.2), 0.84 + rand() * 0.32), TEXEL, { skip: new Set(["+z"]) });
        }
      }
      const far = at("far", "hullTrim");
      // brow runs pilaster to pilaster; the sill stays on the frame
      far.box(0, bandA[1] + 1.5, b.z0 - 1.8, (xPil - pilW / 2) * 2 - 0.4, 3.0, 3.6, D, TEXEL * 3, { skip: new Set(["+z"]) });
      far.box(0, bandA[0] - 0.6, b.z0 - 0.9, frame[0].hx * 2 + 2, 1.2, 1.8, D, TEXEL * 3, { skip: new Set(["+z"]) });
      // four recessed floods per row — housings let into the brow underside / sill top with a cool
      // lens — each throwing an additive wash down (up) the dark band so the strip reads lit when the
      // face is in shadow, without the LED-strip rows of point lights
      const em = at("far", "exta_emit");
      const rec = at("mid", "hullGreeble");
      const wash = at("far", "exta_pool");
      const lens = C(0xfff0d0).multiplyScalar(3.0);
      const washC = C(0xfff0d0).multiplyScalar(0.34);
      const zWash = b.z0 - 0.12;
      const fan = (x, yFrom, yTo, w0, w1, zq = zWash) => {
        // soft pool on the band face from the flood (width w0) to yTo (width w1): the colour falls off
        // both along the throw and towards the sides, and is black on every edge, so it reads as
        // light on the plating rather than as a shape
        const span = yTo - yFrom;
        const wAt = (y) => w0 + (w1 - w0) * Math.abs((y - yFrom) / span);
        const col = (p) => {
          const t = clamp01(Math.abs((p.y - yFrom) / span));
          const along = t < 0.1 ? t / 0.1 : Math.pow(clamp01(1 - (t - 0.1) / 0.9), 1.8);
          const side = clamp01(1 - Math.pow((2 * Math.abs(p.x - x)) / wAt(p.y), 2));
          return washC.clone().multiplyScalar(along * side);
        };
        const ya = yFrom;
        const yb = yTo;
        wash.grid(V(x - wAt(ya) / 2, ya, zq), V(x + wAt(ya) / 2, ya, zq), V(x + wAt(yb) / 2, yb, zq), V(x - wAt(yb) / 2, yb, zq), 6, 5, col, 1, V(0, 0, -1));
      };
      // the wash never crosses the viewport band itself (that is glass, lit from inside): the brow row
      // are uplights on the brow's top face washing the plates above it, the sill row are downlights
      // under the sill washing the plated band down to the gallery windows; both wash quads ride just
      // in front of the proud plates, which stand 1 m off the face
      const yBrowTop = bandA[1] + 3.0;
      for (const fx of [-0.78, -0.26, 0.26, 0.78]) {
        const x = fx * vp.hw;
        // brow row: 1.2 m housing let 0.5 m into the brow top, warm lens on its upper face
        rec.box(x, yBrowTop + 0.2, b.z0 - 2.3, 1.6, 0.5, 1.9, T, TEXEL * 2, { skip: new Set(["-y"]) });
        em.box(x, yBrowTop + 0.5, b.z0 - 2.3, 1.2, 0.16, 1.2, lens, 1, { skip: new Set(["-y"]) });
        fan(x, yBrowTop + 0.5, b.y1 - 0.8, 2.6, 18, b.z0 - 1.03);
        // sill row: housing let into the sill underside, lens on its lower face
        rec.box(x, bandA[0] - 1.05, b.z0 - 1.3, 1.6, 0.5, 1.5, T, TEXEL * 2, { skip: new Set(["+y"]) });
        em.box(x, bandA[0] - 1.32, b.z0 - 1.3, 1.2, 0.16, 0.8, lens, 1, { skip: new Set(["+y"]) });
        fan(x, bandA[0] - 1.35, bandB[1] + 0.6, 2.6, 20, b.z0 - 1.03);
      }
      // sensor blisters on the front flanks and on the roof corners
      for (const s of [-1, 1]) {
        const blister = at("mid", "hullPlate1");
        blister.addGeometry(new THREE.SphereGeometry(3.4, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), { pos: [s * 72, 259.5, b.z0 - 0.4], quat: Q(V(0, 1, 0), V(0, 0, -1)), color: M });
        blister.addGeometry(new THREE.SphereGeometry(3.2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), { pos: [s * 90, b.y1, b.z0 + 12], color: M });
        blister.tube(V(s * 90, b.y1, b.z0 + 12), V(s * 90, b.y1 + 0.8, b.z0 + 12), 3.5, 3.5, 20, D, TEXEL * 3);
      }
    }
    // side faces: pilasters + bands (recessed window bands at decks A and B)
    {
      const pilZ = [b.z0 + FACE_T, 265, 309, 353, b.z1];
      const bands = [
        [b.y0, bandB[0], "plate"],
        [bandB[0], bandB[1], "recess"],
        [bandB[1], bandA[0], "plate"],
        [bandA[0], bandA[1], "recess"],
        [bandA[1], b.y1, "plate"],
      ];
      const rec = 0.9;
      for (const s of [-1, 1]) {
        const x = s * b.hw;
        const nrm = V(s, 0, 0);
        for (let i = 0; i < pilZ.length - 1; i++) {
          const z0 = pilZ[i] + (i === 0 ? 0 : 1.3);
          const z1 = pilZ[i + 1] - (i === pilZ.length - 2 ? 0 : 1.3);
          for (const [y0, y1, kind] of bands) {
            if (kind === "plate") at("far", "hullPlate").quad(V(x, y0, z0), V(x, y0, z1), V(x, y1, z1), V(x, y1, z0), tintFor(L, s * 50, y0), TEXEL, nrm);
            else {
              const xi = x - s * rec;
              const dark = at("far", "hullGreeble");
              dark.quad(V(x, y0, z0), V(x, y0, z1), V(xi, y0, z1), V(xi, y0, z0), D, TEXEL * 2, V(0, 1, 0));
              dark.quad(V(x, y1, z0), V(x, y1, z1), V(xi, y1, z1), V(xi, y1, z0), D, TEXEL * 2, V(0, -1, 0));
              dark.quad(V(xi, y0, z0), V(xi, y0, z1), V(xi, y1, z1), V(xi, y1, z0), T, TEXEL * 2, nrm);
              const g = new THREE.PlaneGeometry(z1 - z0 - 1.0, y1 - y0 - 1.6);
              at("far", "cityLights").addGeometry(g, { pos: [xi + s * 0.3, (y0 + y1) / 2, (z0 + z1) / 2], quat: Q(Z, nrm), uv: "scale", uvScale: [(z1 - z0) / 40, 0.34] });
            }
          }
        }
        for (let i = 1; i < pilZ.length - 1; i++) at("far", "hullPlate1").box(x + s * 0.4, (b.y0 + b.y1) / 2 + 0.3, pilZ[i], 1.6, b.y1 - b.y0 + 0.6, 2.6, mixC(M, D, 0.25), TEXEL, { skip: new Set([s > 0 ? "-x" : "+x"]) });
      }
      // running lights on the module corners
      for (const s of [-1, 1]) {
        at("far", "exta_emit").box(s * (b.hw + 0.4), b.y1 - 2, b.z0 + 8, 0.8, 1.2, 2.5, EMIT.red, 1);
        at("far", "exta_emit").box(s * (b.hw + 0.4), b.y0 + 2, b.z1 - 8, 0.8, 1.2, 2.5, EMIT.white, 1);
      }
    }
    // roof plating (skip dome plinths and the mast base), central spine block
    {
      const domes = TOWER.domes;
      const m = TOWER.mast;
      const STEP = { hx: Math.abs(domes[0].x) - 28.6 - 6, h: 5, z0: b.z0 + FACE_T + 6, z1: b.z1 - 6 };
      plateField(chunks, rand, {
        zStart: b.z0 + FACE_T,
        zEnd: b.z1,
        rowLen: [7, 11],
        strips: () => [{ s0: -b.hw, s1: b.hw, kind: "plate" }],
        point: (z, s) => V(s, b.y1, z),
        normal: V(0, 1, 0),
        mirror: false,
        cellW: 8,
        slabP: 0.45,
        slabH: [0.4, 0.9],
        skinKey: "hullPlate",
        slabKeys: ["hullPlate", "hullPlate1"],
        tint: (x, y, z) => tintFor(L, x, z),
        slabTint: (r, base) => mixC(plateTone(r), base, 0.4),
        slabOK: (x, y, z) => domes.every((d) => Math.hypot(x - d.x, z - d.z) > 31) && Math.abs(x) > STEP.hx + 1,
      });
      // roof step between the domes: a 5 m raised deck set back 6 m from the roof edges, plated on
      // top, with a dark reveal at its foot; the spine block and the mast stand on it
      const far = at("far", "hullPlate1");
      const zcS = (STEP.z0 + STEP.z1) / 2;
      far.box(0, b.y1 + STEP.h / 2, zcS, STEP.hx * 2, STEP.h, STEP.z1 - STEP.z0, tintFor(mixC(L, M, 0.3), 0, 300), TEXEL, { skip: new Set(["-y", "+y"]) });
      plateField(chunks, rand, {
        zStart: STEP.z0,
        zEnd: STEP.z1,
        rowLen: [7, 11],
        strips: () => [{ s0: -STEP.hx, s1: STEP.hx, kind: "plate" }],
        point: (z, s) => V(s, b.y1 + STEP.h, z),
        normal: V(0, 1, 0),
        mirror: false,
        cellW: 8,
        slabP: 0.4,
        slabH: [0.35, 0.8],
        skinKey: "hullPlate",
        slabKeys: ["hullPlate", "hullPlate1"],
        tint: (x, y, z) => tintFor(L, x, z),
        slabTint: (r, base) => mixC(plateTone(r), base, 0.4),
        slabOK: (x, y, z) => !(Math.abs(x - m.x) < 9 && Math.abs(z - m.z) < 9) && Math.abs(x) > 14,
      });
      const dk = at("far", "hullGreeble");
      for (const s of [-1, 1]) dk.quad(V(s * (STEP.hx + 0.05), b.y1, STEP.z0), V(s * (STEP.hx + 0.05), b.y1, STEP.z1), V(s * (STEP.hx + 0.05), b.y1 + 1.2, STEP.z1), V(s * (STEP.hx + 0.05), b.y1 + 1.2, STEP.z0), T, TEXEL * 2, V(s, 0, 0));
      const yS = b.y1 + STEP.h;
      far.box(0, yS + 2, (b.z0 + 6 + m.z - 10) / 2, 26, 4, m.z - 10 - (b.z0 + 6), M, TEXEL, { skip: new Set(["-y"]) });
      const nb = at("near", "hullGreeble");
      for (let z = b.z0 + 14; z < m.z - 16; z += 9) nb.box(0, yS + 4.5, z, 6, 1.0, 4, T, TEXEL * 3, { skip: new Set(["-y"]) });
    }
    // visible strips of the module bottom around the upper plinth step
    {
      const far = at("far", "hullPlate1");
      const down = V(0, -1, 0);
      const pu = PLINTH[1];
      for (const s of [-1, 1]) far.quad(V(s * CHIN.hx, b.y0, b.z0 + FACE_T), V(s * b.hw, b.y0, b.z0 + FACE_T), V(s * b.hw, b.y0, pu.z0), V(s * CHIN.hx, b.y0, pu.z0), M, TEXEL, down);
      far.quad(V(-b.hw, b.y0, pu.z1), V(b.hw, b.y0, pu.z1), V(b.hw, b.y0, b.z1), V(-b.hw, b.y0, b.z1), M, TEXEL, down);
      for (const s of [-1, 1]) far.quad(V(s * pu.hw, b.y0, pu.z0), V(s * b.hw, b.y0, pu.z0), V(s * b.hw, b.y0, pu.z1), V(s * pu.hw, b.y0, pu.z1), M, TEXEL, down);
    }
    // aft face: plated, a recessed deck-A window band and the docking port
    {
      const z = b.z1;
      const nrm = Z;
      const far = at("far", "hullPlate");
      far.quad(V(-b.hw, b.y0, z), V(b.hw, b.y0, z), V(b.hw, bandA[0], z), V(-b.hw, bandA[0], z), tintFor(L, 0, 240), TEXEL, nrm);
      far.quad(V(-b.hw, bandA[1], z), V(b.hw, bandA[1], z), V(b.hw, b.y1, z), V(-b.hw, b.y1, z), tintFor(L, 0, 260), TEXEL, nrm);
      const rec = 0.9;
      const dark = at("far", "hullGreeble");
      dark.quad(V(-b.hw, bandA[0], z), V(b.hw, bandA[0], z), V(b.hw, bandA[0], z - rec), V(-b.hw, bandA[0], z - rec), D, TEXEL * 2, V(0, 1, 0));
      dark.quad(V(-b.hw, bandA[1], z), V(b.hw, bandA[1], z), V(b.hw, bandA[1], z - rec), V(-b.hw, bandA[1], z - rec), D, TEXEL * 2, V(0, -1, 0));
      dark.quad(V(-b.hw, bandA[0], z - rec), V(b.hw, bandA[0], z - rec), V(b.hw, bandA[1], z - rec), V(-b.hw, bandA[1], z - rec), T, TEXEL * 2, nrm);
      for (const s of [-1, 1]) at("far", "cityLights").addGeometry(new THREE.PlaneGeometry(70, bandA[1] - bandA[0] - 1.6), { pos: [s * 55, (bandA[0] + bandA[1]) / 2, z - rec + 0.3], quat: Q(Z, nrm), uv: "scale", uvScale: [70 / 40, 0.34] });
      const mid = at("mid", "hullTrim");
      mid.addGeometry(new THREE.TorusGeometry(6.5, 0.9, 10, 40), { pos: [0, 239, z + 0.9], color: D, texel: TEXEL * 3 });
      mid.disc(V(0, 239, z + 0.5), Z, 5.6, 32, T, TEXEL * 3);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        mid.box(Math.cos(a) * 8.6, 239 + Math.sin(a) * 8.6, z + 1.2, 2.2, 2.2, 2.4, D, TEXEL * 3, { skip: new Set(["-z"]) });
      }
      at("mid", "exta_emit").box(0, 239, z + 0.9, 1.6, 1.6, 0.6, EMIT.blue, 1);
    }
  }

  // ------------------------------------------------------------------ shield generator domes
  for (const d of TOWER.domes) {
    const far = at("far", "hullPlate");
    const yPlinth = b.y1 + 3;
    far.addGeometry(new THREE.SphereGeometry(d.r, 48, 32), { pos: [d.x, d.yCenter, d.z], colorFn: (x, y) => shade(L, 0.93 + 0.08 * Math.min(1, Math.max(0, (y - yPlinth) / (d.r * 1.3)))) });
    far.tube(V(d.x, b.y1, d.z), V(d.x, yPlinth, d.z), 28.6, 28.6, 48, D, TEXEL * 2, { cap1: true });
    const trim = at("far", "hullTrim");
    trim.addGeometry(new THREE.TorusGeometry(d.r + 0.25, 1.1, 10, 64), { pos: [d.x, d.yCenter, d.z], rot: [Math.PI / 2, 0, 0], color: D, texel: TEXEL * 3 });
    const mid = at("mid", "hullTrim");
    // latitude rings: two structural bands plus thinner panel lines between them
    for (const [lat, rad] of [
      [0.5, 0.32],
      [0.95, 0.32],
      [0.25, 0.16],
      [0.72, 0.16],
      [1.18, 0.16],
    ]) {
      const rr = d.r * Math.cos(lat) + 0.2;
      mid.addGeometry(new THREE.TorusGeometry(rr, rad, 6, 56), { pos: [d.x, d.yCenter + d.r * Math.sin(lat), d.z], rot: [Math.PI / 2, 0, 0], color: D, texel: TEXEL * 3 });
    }
    // meridian ribs from the plinth to the pole: 8 heavy ribs, 8 thin panel lines between them
    const a0 = Math.asin((yPlinth - d.yCenter) / d.r);
    for (let i = 0; i < 16; i++) {
      const heavy = i % 2 === 0;
      const g = new THREE.TorusGeometry(d.r + (heavy ? 0.35 : 0.2), heavy ? 0.5 : 0.22, heavy ? 8 : 5, 28, Math.PI / 2 - a0 - (heavy ? 0 : 0.12));
      g.rotateZ(a0);
      g.rotateY((i / 16) * Math.PI * 2);
      mid.addGeometry(g, { pos: [d.x, d.yCenter, d.z], color: heavy ? mixC(M, D, 0.5) : D, texel: TEXEL * 3 });
    }
    mid.tube(V(d.x, d.yCenter + d.r - 0.4, d.z), V(d.x, d.yCenter + d.r + 1.8, d.z), 2.6, 2.2, 16, D, TEXEL * 3, { cap1: true });
    at("far", "exta_emit").box(d.x, d.yCenter + d.r + 2.3, d.z, 0.9, 1.0, 0.9, EMIT.red, 1);
  }

  // ------------------------------------------------------------------ comms mast (lattice)
  {
    const m = TOWER.mast;
    const far = at("far", "hullPlate1");
    far.tube(V(m.x, m.yBase, m.z), V(m.x, m.yBase + 9, m.z), 6.5, 5.2, 20, D, TEXEL * 2, { cap1: true });
    far.tube(V(m.x, m.yBase + 9, m.z), V(m.x, m.yTop, m.z), 2.2, 1.6, 14, M, TEXEL * 3, { cap1: true });
    const mid = at("mid", "hullTrim");
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const px = m.x + Math.cos(a) * 3.0;
      const pz = m.z + Math.sin(a) * 3.0;
      mid.tube(V(px, m.yBase + 9, pz), V(m.x + Math.cos(a) * 1.9, m.yTop - 4, m.z + Math.sin(a) * 1.9), 0.45, 0.35, 8, D, TEXEL * 4);
    }
    for (let y = m.yBase + 15; y < m.yTop - 6; y += 8) {
      const k = (y - m.yBase) / (m.yTop - m.yBase);
      const s = 7.2 - k * 3;
      mid.box(m.x, y, m.z, s, 0.45, 0.45, D, TEXEL * 4);
      mid.box(m.x, y, m.z, 0.45, 0.45, s, D, TEXEL * 4);
    }
    // platforms with rims
    for (const y of [m.yBase + 30, m.yBase + 52]) {
      mid.disc(V(m.x, y, m.z), V(0, 1, 0), 6.8, 8, mixC(M, D, 0.5), TEXEL * 3);
      mid.disc(V(m.x, y - 0.5, m.z), V(0, -1, 0), 6.8, 8, D, TEXEL * 3);
      mid.lathe([{ r: 6.8, t: 0 }, { r: 6.8, t: 0.5 }], V(m.x, y - 0.5, m.z), Q(Z, V(0, 1, 0)), 8, { color: D, texel: TEXEL * 3 });
    }
    // dishes: main (forward-up), secondary (aft)
    const dish = (center, dir, r, depth) => {
      const prof = [];
      for (let i = 0; i <= 6; i++) {
        const f = i / 6;
        prof.push({ r: r * f, t: depth * f * f });
      }
      const q = Q(Z, dir.clone().normalize());
      mid.lathe(prof, center, q, 32, { color: mixC(L, M, 0.5), texel: TEXEL * 3, inside: true });
      mid.lathe(prof.map((p) => ({ r: p.r, t: p.t - 0.3 })), center, q, 32, { color: D, texel: TEXEL * 3 });
      mid.tube(center.clone().addScaledVector(dir.clone().normalize(), -0.2), center.clone().addScaledVector(dir.clone().normalize(), depth + 1.5), 0.3, 0.3, 6, D, TEXEL * 4);
      mid.tube(center.clone().addScaledVector(dir.clone().normalize(), -0.2), center.clone().addScaledVector(dir.clone().normalize(), -3.5), 0.9, 0.9, 8, D, TEXEL * 4);
    };
    dish(V(m.x - 4.5, m.yBase + 46, m.z - 4), V(-0.5, 0.55, -1), 8, 2.2);
    dish(V(m.x + 4.2, m.yBase + 60, m.z + 3.5), V(0.6, 0.35, 1), 4.5, 1.2);
    // antenna rods at the top
    for (const [dx, dz, h] of [[0, 0, 14], [1.6, 1.2, 9], [-1.5, 1.4, 7]]) mid.tube(V(m.x + dx, m.yTop - 1, m.z + dz), V(m.x + dx, m.yTop - 1 + h, m.z + dz), 0.22, 0.14, 6, D, TEXEL * 4);
    at("far", "exta_emit").box(m.x, m.yTop + 13.6, m.z, 0.8, 1.0, 0.8, EMIT.red, 1);
    at("far", "exta_emit").box(m.x + 1.6, m.yTop + 8.4, m.z + 1.2, 0.6, 0.6, 0.6, EMIT.white, 1);
  }
}
