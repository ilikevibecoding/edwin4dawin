// Command tower (workstream EXT-A): neck storeys with recessed window bands and pilasters, gusset
// buttresses under the bridge module, the bridge module itself (forward face split into plated and
// recessed dark bands, viewport cut-outs and viewGlass planes exactly where spec.TOWER puts them),
// brow / sill, side window bands, roof plating, stepped underside, aft docking port, sensor blisters,
// the two shield generator domes with plinths / rings / ribs and the lattice comms mast.
import * as THREE from "three";
import { panelWithHoles } from "../kit.js";
import { PALETTE } from "../materials.js";
import { TOWER } from "../spec.js";
import { plateField, shade, mixC, plateTone, fieldNoise, TEXEL, EMIT } from "./hull_util.js";
import { hexa } from "./superstructure.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const Q = (from, to) => new THREE.Quaternion().setFromUnitVectors(from, to);
const Z = V(0, 0, 1);

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

  // ------------------------------------------------------------------ neck: storeys + pilasters
  {
    const storeys = 8;
    const sh = (n.yTop - n.yBase) / storeys;
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
        const y1 = n.yTop + 0.5;
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
        hexa(at("far", "hullPlate1"), rect(n.yBase - 0.5), rect(n.yTop + 0.5), mixC(M, D, 0.25), TEXEL, { skipBottom: true });
      }
    }
    // base skirt and top collar
    const far = at("far", "hullPlate1");
    for (const [yc, hgt, proud, tint] of [
      [n.yBase + 1.25, 2.5, 2.0, D],
      [n.yTop - 1.5, 3.0, 1.6, mixC(M, D, 0.5)],
    ]) {
      const w = hw(yc) + proud;
      const l = hl(yc) + proud;
      far.box(w - proud / 2, yc, zc, proud, hgt, l * 2, tint, TEXEL, { skip: new Set(["-x"]) });
      far.box(-w + proud / 2, yc, zc, proud, hgt, l * 2, tint, TEXEL, { skip: new Set(["+x"]) });
      far.box(0, yc, zc + l - proud / 2, w * 2, hgt, proud, tint, TEXEL, { skip: new Set(["-z"]) });
      far.box(0, yc, zc - l + proud / 2, w * 2, hgt, proud, tint, TEXEL, { skip: new Set(["+z"]) });
    }
    // gusset buttresses from the neck faces up to the module underside
    const gus = at("far", "hullPlate1");
    const yg0 = 176;
    const yg1 = b.y0 - 0.2;
    const gusset = (pA, pB, pC, thick, axis) => {
      // triangle A (low, on the neck), B (outer, under the module), C (high, on the neck) extruded ±thick/2 along axis
      const off = axis.clone().multiplyScalar(thick / 2);
      const A0 = pA.clone().sub(off);
      const B0 = pB.clone().sub(off);
      const C0 = pC.clone().sub(off);
      const A1 = pA.clone().add(off);
      const B1 = pB.clone().add(off);
      const C1 = pC.clone().add(off);
      const tint = mixC(M, D, 0.35);
      gus.tri(A0, B0, C0, tint, TEXEL, axis.clone().negate());
      gus.tri(A1, B1, C1, tint, TEXEL, axis);
      const mid = pB.clone().sub(pA);
      const out = new THREE.Vector3().crossVectors(mid, axis);
      if (out.dot(pB.clone().sub(pC)) < 0) out.negate();
      gus.quad(A0, B0, B1, A1, tint, TEXEL, out);
    };
    for (const sx of [1, -1]) {
      for (const zg of [272, 348]) {
        gusset(V(sx * (hw(yg0) - 0.3), yg0, zg), V(sx * (b.hw - 2), yg1, zg), V(sx * (hw(yg1) - 0.3), yg1, zg), 10, Z);
      }
    }
    gusset(V(0, 190, zc + hl(190) - 0.3), V(0, yg1, b.z1 - 3), V(0, yg1, zc + hl(yg1) - 0.3), 16, V(1, 0, 0));
    gusset(V(0, 190, zc - hl(190) + 0.3), V(0, yg1, b.z0 + 9), V(0, yg1, zc - hl(yg1) + 0.3), 16, V(1, 0, 0));
  }

  // ------------------------------------------------------------------ bridge module
  {
    const vp = TOWER.viewports;
    const gv = TOWER.galleryViewports;
    const w = b.hw * 2;
    const zFace = b.z0 + 3; // panel centre; the panel spans z0 .. z0 + 6 exactly as the skeleton did
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
      const face = panelWithHoles(w, y1 - y0, 6, holes);
      face.rotateY(Math.PI); // extrusion along -z: outward normal faces -z (forward)
      at("far", dark ? "hullGreeble" : "hullPlate").addGeometry(face, { pos: [0, cy, zFace], color: dark ? T : tintFor(L, 0, cy), texel: dark ? TEXEL * 2 : TEXEL });
    }
    // viewport glass 1 m inside the face (shared with the bridge / observation interiors)
    at("far", "viewGlass").addGeometry(new THREE.PlaneGeometry(vp.hw * 2 + 1, vp.y1 - vp.y0 + 0.4), { pos: [0, (vp.y0 + vp.y1) / 2, b.z0 + 1.0], uv: "keep" });
    for (const s of [-1, 1]) at("far", "viewGlass").addGeometry(new THREE.PlaneGeometry(gv.x1 - gv.x0, gv.y1 - gv.y0 + 0.2), { pos: [(s * (gv.x0 + gv.x1)) / 2, (gv.y0 + gv.y1) / 2, b.z0 + 1.0], uv: "keep" });
    // proud plates on the light bands of the face (mid), brow and sill (far)
    {
      const mid = at("mid", "hullPlate1");
      const cols = 5;
      for (const [y0, y1] of [[bandA[1] + 0.6, b.y1 - 0.8], [bandB[1] + 0.6, bandA[0] - 0.6]]) {
        for (let i = 0; i < cols; i++) {
          const x0 = -b.hw + 1.2 + (i * (w - 2.4)) / cols + 0.7;
          const x1 = -b.hw + 1.2 + ((i + 1) * (w - 2.4)) / cols - 0.7;
          mid.box((x0 + x1) / 2, (y0 + y1) / 2, b.z0 - 0.5, x1 - x0, y1 - y0, 1.0, mixC(plateTone(rand), L, 0.5), TEXEL, { skip: new Set(["+z"]) });
        }
      }
      const far = at("far", "hullTrim");
      far.box(0, bandA[1] + 1.5, b.z0 - 1.8, vp.hw * 2 + 14, 3.0, 3.6, D, TEXEL * 3, { skip: new Set(["+z"]) });
      far.box(0, bandA[0] - 0.6, b.z0 - 0.75, vp.hw * 2 + 14, 1.2, 1.5, D, TEXEL * 3, { skip: new Set(["+z"]) });
      // floodlights under the brow and on the sill wash the viewport band when the face is in shadow
      const em = at("far", "exta_emit");
      const dim = EMIT.white.clone().multiplyScalar(0.45);
      for (let x = -vp.hw - 4; x <= vp.hw + 4; x += 5.5) {
        em.box(x, bandA[1] - 0.25, b.z0 - 2.9, 0.7, 0.5, 0.9, dim, 1, { skip: new Set(["+y"]) });
        em.box(x, bandA[0] + 0.25, b.z0 - 1.2, 0.7, 0.5, 0.7, dim, 1, { skip: new Set(["-y"]) });
      }
      // gallery deck: a light at each end of the observation windows
      for (const s of [-1, 1]) em.box(s * (gv.x1 + 3), (gv.y0 + gv.y1) / 2, b.z0 - 0.4, 0.8, 0.8, 0.8, EMIT.amber, 1, { skip: new Set(["+z"]) });
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
      const pilZ = [b.z0 + 6, 265, 309, 353, b.z1];
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
      plateField(chunks, rand, {
        zStart: b.z0 + 6,
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
        slabOK: (x, y, z) => domes.every((d) => Math.hypot(x - d.x, z - d.z) > 31) && !(Math.abs(x - m.x) < 9 && Math.abs(z - m.z) < 9),
      });
      const far = at("far", "hullPlate1");
      far.box(0, b.y1 + 2, (b.z0 + 6 + m.z - 10) / 2, 26, 4, m.z - 10 - (b.z0 + 6), M, TEXEL, { skip: new Set(["-y"]) });
      const nb = at("near", "hullGreeble");
      for (let z = b.z0 + 14; z < m.z - 16; z += 9) nb.box(0, b.y1 + 4.5, z, 6, 1.0, 4, T, TEXEL * 3, { skip: new Set(["-y"]) });
    }
    // underside steps + visible strips of the module bottom
    {
      const far = at("far", "hullPlate1");
      far.box(0, b.y0 - 3, (b.z0 + 12 + b.z1 - 6) / 2, (b.hw - 8) * 2, 6, b.z1 - 6 - (b.z0 + 12), M, TEXEL, { skip: new Set(["+y"]) });
      far.box(0, b.y0 - 8.25, (b.z0 + 25 + b.z1 - 13) / 2, (b.hw - 24) * 2, 4.5, b.z1 - 13 - (b.z0 + 25), mixC(M, D, 0.4), TEXEL, { skip: new Set(["+y"]) });
      const down = V(0, -1, 0);
      far.quad(V(-b.hw, b.y0, b.z0 + 6), V(b.hw, b.y0, b.z0 + 6), V(b.hw, b.y0, b.z0 + 12), V(-b.hw, b.y0, b.z0 + 12), M, TEXEL, down);
      far.quad(V(-b.hw, b.y0, b.z1 - 6), V(b.hw, b.y0, b.z1 - 6), V(b.hw, b.y0, b.z1), V(-b.hw, b.y0, b.z1), M, TEXEL, down);
      for (const s of [-1, 1]) far.quad(V(s * (b.hw - 8), b.y0, b.z0 + 12), V(s * b.hw, b.y0, b.z0 + 12), V(s * b.hw, b.y0, b.z1 - 6), V(s * (b.hw - 8), b.y0, b.z1 - 6), M, TEXEL, down);
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
