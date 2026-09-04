// Engines (workstream EXT-A, lighting revised by EXT-C): the stern engine housing (chamfered block
// whose aft face carries a soot gradient and an additive blue spill around every nozzle), the three
// main bells and the four secondary bells built as surfaces of revolution — gimbal collar, necked
// throat, deep flared nozzle with a heat-tempering ramp along the axis, inner bell lined with an
// additive blue sheet so the walls read lit, an unlit radial-falloff core disc (never clipping to
// white), halo + ~2 L plume, stiffener rings, longitudinal coolant ribs — and the pipework /
// manifolds linking the bells across the housing face.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { ENGINES } from "../spec.js";
import { shade, mixC, C, TEXEL, EMIT } from "./hull_util.js";
import { hexa } from "./superstructure.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const Z = V(0, 0, 1);
const IDENT = new THREE.Quaternion();
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Bell profile as [axial fraction, radius fraction]: collar, neck, throat, flare, lip. */
const BELL = [
  [0, 0.8],
  [0.1, 0.8],
  [0.15, 0.73],
  [0.24, 0.71],
  [0.38, 0.77],
  [0.54, 0.87],
  [0.7, 0.95],
  [0.84, 1.0],
  [0.95, 1.025],
  [1, 1.035],
];
function bellR(f) {
  for (let i = 0; i < BELL.length - 1; i++) {
    const [a, ra] = BELL[i];
    const [b, rb] = BELL[i + 1];
    if (f <= b) return ra + (rb - ra) * ((f - a) / (b - a));
  }
  return BELL[BELL.length - 1][1];
}

/** Engine housing block on the stern face (world extents; depth is how far it stands proud of z = zStern). */
export const HOUSING = { hw: 336, y0: -56, y1: 40, depth: 6 };

/** 0..1 soot factor at a point on the stern plane (distance from the nearest nozzle lip). */
export function engineSoot(x, y) {
  let s = 0;
  for (const b of ENGINES.main) s = Math.max(s, 1 - smooth(0, 75, Math.hypot(x - b.x, y - b.y) - b.r));
  for (const b of ENGINES.secondary) s = Math.max(s, 0.8 * (1 - smooth(0, 32, Math.hypot(x - b.x, y - b.y) - b.r)));
  return s;
}

export function buildEngines(ctx) {
  const { chunks, rand } = ctx;
  const e = ENGINES;
  const D = PALETTE.hullDark;
  const T = PALETTE.hullTrench;
  const blue = C(PALETTE.engineBlue);
  const H = HOUSING;
  const zF = e.z + H.depth; // housing aft face
  const at = (lvl, key) => chunks.batch(e.z + 30, lvl, key);
  const bells = [...e.main.map((b) => ({ ...b, main: true })), ...e.secondary.map((b) => ({ ...b, main: false }))];

  // ------------------------------------------------------------------ housing
  {
    const b = [V(-H.hw, H.y0, e.z), V(H.hw, H.y0, e.z), V(H.hw, H.y1, e.z), V(-H.hw, H.y1, e.z)];
    const t = [V(-H.hw + 5, H.y0 + 4, zF), V(H.hw - 5, H.y0 + 4, zF), V(H.hw - 5, H.y1 - 3, zF), V(-H.hw + 5, H.y1 - 3, zF)];
    // plated housing in the hull's mid tone so the soot blooms around the nozzles actually read:
    // the wash blackens the face to ~30 % of its albedo at the lips and fades out over ~75 m
    const far = at("far", "hullPlate1");
    const M = PALETTE.hullMid;
    hexa(far, b, t, mixC(M, D, 0.35), TEXEL, { skipBottom: true, skipTop: true });
    far.grid(t[0], t[1], t[2], t[3], 56, 10, (p) => shade(mixC(M, PALETTE.hullLight, 0.2), 1 - 0.72 * engineSoot(p.x, p.y)), TEXEL, Z);
    // blue spill from the nozzles on the sooted face: an additive gradient around every bell, clipped
    // to the housing by building it as a second grid over the same face 0.35 m proud
    {
      const spill = (x, y) => {
        let s = 0;
        for (const n of bells) {
          const R0 = n.r * 0.8 + 2;
          const R1 = n.r * 2.1;
          s += (n.main ? 0.11 : 0.07) * (1 - smooth(R0, R1, Math.hypot(x - n.x, y - n.y)));
        }
        return Math.min(s, 0.14);
      };
      const zS = zF + 0.35;
      const g = t.map((p) => V(p.x, p.y, zS));
      at("far", "exta_pool").grid(g[0], g[1], g[2], g[3], 84, 14, (p) => blue.clone().multiplyScalar(spill(p.x, p.y)), 1, Z);
    }
    const trim = at("far", "hullTrim");
    trim.box(0, H.y1 - 4.5, zF + 0.6, (H.hw - 5) * 2 + 1, 3, 1.4, T, TEXEL * 3, { skip: new Set(["-z"]) });
    trim.box(0, H.y0 + 5.5, zF + 0.6, (H.hw - 5) * 2 + 1, 3, 1.4, T, TEXEL * 3, { skip: new Set(["-z"]) });
    // vertical armour ribs on the housing's outer flanks
    for (const s of [-1, 1]) {
      for (const y of [-40, -20, 0, 20]) far.box(s * (H.hw - 2.4), y, e.z + 2.6, 1.6, 2.2, 5.2, D, TEXEL * 3, { skip: new Set(["-z"]) });
      at("far", "exta_emit").box(s * (H.hw - 8), H.y1 - 8, zF + 0.5, 1.5, 1.5, 1.0, EMIT.red, 1);
      at("far", "exta_emit").box(s * (H.hw - 8), H.y0 + 9, zF + 0.5, 1.5, 1.5, 1.0, EMIT.white, 1);
    }
  }

  // ------------------------------------------------------------------ bells
  for (const b of bells) {
    const L = b.main ? e.length : e.length * 0.6;
    const r = b.r;
    const segs = b.main ? 56 : 32;
    const o = V(b.x, b.y, e.z);
    const prof = BELL.map(([f, k]) => ({ r: r * k, t: f * L }));
    // outer skin: heat-tempering ramp along the axis (u), the outer 20 % of the bell wall darkened
    // (scorched flare) so the lip reads as a dark rim around the lit mouth
    at("far", "exta_heat").lathe(prof, o, IDENT, segs, { uv: "axial", colorAt: (i, f) => shade(0xffffff, (0.9 + 0.1 * (1 - f) + (rand() - 0.5) * 0.04) * (1 - 0.42 * smooth(0.78, 1.0, f))) });
    // inner bell from the throat to the lip: a radial gradient from the glow-tinted throat to a dark
    // blue 0x2a4a80 rim (the sun sits aft of the ship and shines straight into the nozzles, so a light
    // tint here would wash the whole opening into a flat sheet)
    const wallIn = b.main ? 0.7 : 0.4;
    const rim = C(0x2a4a80);
    const inner = prof.filter((p) => p.t >= 0.24 * L - 1e-6).map((p) => ({ r: p.r - wallIn, t: p.t }));
    at("far", "hullGreeble").lathe(inner, o, IDENT, segs, { inside: true, colorAt: (i, f) => mixC(mixC(shade(T, 0.85), rim, 0.5 + 0.5 * f), blue, 0.45 * Math.pow(1 - f, 2)), texel: TEXEL * 3 });
    // interior stiffener rings, slightly embedded in the wall so nothing is coplanar
    {
      const rings = at("mid", "hullTrim");
      for (const f of b.main ? [0.4, 0.55, 0.7, 0.85] : [0.5, 0.75]) {
        const R = r * bellR(f) - wallIn - 0.25;
        rings.addGeometry(new THREE.TorusGeometry(R, b.main ? 0.45 : 0.3, 8, segs), { pos: [b.x, b.y, e.z + f * L], color: shade(T, 0.7), texel: TEXEL * 3 });
      }
    }
    // throat: an opaque, unlit gradient disc — pale core at ~60 % (0xdfeeff, so it never clips to
    // hard white under ACES), falling off radially through blue to a dark rim where it meets the
    // inner wall. Built as a centre disc plus two annuli so the falloff is a curve, not a line.
    {
      const core = at("far", "exta_emit");
      const zT = e.z + 0.24 * L + 0.4;
      const cC = C(0xdfeeff);
      const rT = r * 0.71 - 0.2;
      const stops = [
        [0, cC.clone().multiplyScalar(1.05)],
        [0.3, cC.clone().multiplyScalar(0.62)],
        [0.55, blue.clone().multiplyScalar(0.3)],
        [1.0, blue.clone().multiplyScalar(0.08)],
      ];
      core.disc(V(b.x, b.y, zT), Z, rT * stops[1][0], segs, stops[0][1], 1, { colorOut: stops[1][1] });
      for (let i = 1; i < stops.length - 1; i++) core.disc(V(b.x, b.y, zT), Z, rT * stops[i + 1][0], segs, stops[i][1], 1, { rIn: rT * stops[i][0], colorOut: stops[i + 1][1] });
    }
    // additive glow (flickers with exta_glow): a sheet lining the inner wall so the bell reads lit
    // from the throat out, a hot core cone, a long faint plume past the lip
    const glow = at("far", "exta_glow");
    const cone = (f0, f1, r0, r1, c0, pow, n = 6) => {
      const p = [];
      for (let i = 0; i <= n; i++) {
        const k = i / n;
        p.push({ r: r * (r0 + (r1 - r0) * k), t: L * (f0 + (f1 - f0) * k) });
      }
      glow.lathe(p, o, IDENT, segs, { colorAt: (i, f) => C(c0).clone().multiplyScalar(Math.pow(1 - f, pow)) });
    };
    // the wall sheet follows the bell profile 0.3 m inside the inner wall; its falloff is steep (most of
    // the light in the throat third) so obliquely stacked layers never flatten the opening into haze
    {
      const p = [];
      for (let f = 0.25; f <= 0.97; f += 0.09) p.push({ r: r * bellR(f) - wallIn - 0.3, t: L * f });
      glow.lathe(p, o, IDENT, segs, { colorAt: (i, f) => blue.clone().multiplyScalar(0.01 + 0.2 * Math.pow(1 - f, 2.6)) });
    }
    cone(0.25, 0.5, 0.42, 0.28, C(0xffffff).multiplyScalar(0.45), 2.0);
    // plume: ~2 L long, very faint (0.01 additive — a haze behind the ship, not a beam)
    cone(1.0, 3.0, 1.0, 0.32, blue.clone().multiplyScalar(0.012), 1.6, 8);
    // dim vertex-gradient halo just behind the lip (the old additive glowDisc sprite over the core is
    // gone: at alpha 1 it was what pushed the centre to clipped white)
    glow.disc(V(b.x, b.y, e.z + L + 1.5), Z, r * 1.25, segs, blue.clone().multiplyScalar(0.04), 1, { colorOut: 0x000000 });
    // lip ring, gimbal collar at the housing face, stiffener rings
    const trim = at("far", "hullTrim");
    trim.addGeometry(new THREE.TorusGeometry(r * 1.035 + 0.15, b.main ? 1.0 : 0.6, 10, segs), { pos: [b.x, b.y, e.z + L], color: T, texel: TEXEL * 3 });
    trim.addGeometry(new THREE.TorusGeometry(r * 0.8 + 0.8, b.main ? 1.5 : 0.9, 10, segs), { pos: [b.x, b.y, zF + 1.4], color: D, texel: TEXEL * 3 });
    const mid = at("mid", "hullTrim");
    for (const f of b.main ? [0.44, 0.6, 0.76] : [0.5, 0.75]) mid.addGeometry(new THREE.TorusGeometry(r * bellR(f) + 0.3, b.main ? 0.6 : 0.4, 8, segs), { pos: [b.x, b.y, e.z + f * L], color: D, texel: TEXEL * 3 });
    // longitudinal coolant ribs following the flare
    const pipes = at("mid", "hullGreeble");
    const nR = b.main ? 14 : 8;
    const rr = b.main ? 0.34 : 0.22;
    for (let i = 0; i < nR; i++) {
      const a = (i / nR) * Math.PI * 2 + Math.PI / nR;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      let prev = null;
      for (const f of [0.3, 0.42, 0.54, 0.66, 0.78, 0.9]) {
        const R = r * bellR(f) + rr + 0.15;
        const p = V(b.x + R * ca, b.y + R * sa, e.z + f * L);
        if (prev) pipes.tube(prev, p, rr, rr, 6, D, TEXEL * 4);
        prev = p;
      }
      // rib feet: small blocks where the ribs meet the gimbal collar
      const R0 = r * 0.8 + 0.6;
      pipes.box(b.x + R0 * ca, b.y + R0 * sa, zF + 2.2, rr * 4, rr * 4, 2.4, D, TEXEL * 4, { quat: new THREE.Quaternion().setFromAxisAngle(Z, a) });
    }
    // mount struts from the housing face to the bell at 45° (main bells)
    if (b.main) {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const R = r * bellR(0.3) + 0.3;
        pipes.tube(V(b.x + (r * 0.8 + 6) * Math.cos(a), b.y + (r * 0.8 + 6) * Math.sin(a), zF), V(b.x + R * Math.cos(a), b.y + R * Math.sin(a), e.z + 0.3 * L), 0.9, 0.6, 8, D, TEXEL * 4);
      }
    }
  }

  // ------------------------------------------------------------------ pipework across the housing face
  {
    const pipe = at("far", "hullGreeble");
    const flange = at("mid", "hullTrim");
    const zP = zF + 3.2;
    const mains = [H.y1 - 9.5, H.y0 + 10.5];
    for (const y of mains) {
      pipe.tube(V(-H.hw + 14, y, zP), V(H.hw - 14, y, zP), 1.5, 1.5, 12, D, TEXEL * 4, { cap0: true, cap1: true });
      for (let x = -H.hw + 30; x < H.hw - 20; x += 44) flange.tube(V(x - 1.2, y, zP), V(x + 1.2, y, zP), 2.1, 2.1, 12, T, TEXEL * 4, { cap0: true, cap1: true });
    }
    // drops from the mains onto each main bell's collar
    for (const b of e.main) {
      for (const s of [-1, 1]) {
        const x = b.x + s * 22;
        const dy = Math.sqrt(Math.max(0, (b.r * 0.8) ** 2 - 22 * 22));
        pipe.tube(V(x, mains[0], zP), V(x, b.y + dy - 0.6, zP), 0.9, 0.9, 8, D, TEXEL * 4);
        pipe.tube(V(x, mains[1], zP), V(x, b.y - dy + 0.6, zP), 0.9, 0.9, 8, D, TEXEL * 4);
      }
    }
    // drops onto the secondary bells
    for (const b of e.secondary) {
      pipe.tube(V(b.x, mains[0], zP), V(b.x, b.y + b.r * 0.8 - 0.4, zP), 0.7, 0.7, 8, D, TEXEL * 4);
      pipe.tube(V(b.x, mains[1], zP), V(b.x, b.y - b.r * 0.8 + 0.4, zP), 0.7, 0.7, 8, D, TEXEL * 4);
    }
    // manifold blocks between the outer main bells and the outboard secondaries
    for (const s of [-1, 1]) {
      const x = s * 245;
      pipe.box(x, -8, zF + 4, 12, 26, 8, mixC(D, T, 0.5), TEXEL * 3, { skip: new Set(["-z"]) });
      pipe.tube(V(x, 5, zP), V(x, mains[0], zP), 1.1, 1.1, 8, D, TEXEL * 4);
      pipe.tube(V(x, -21, zP), V(x, mains[1], zP), 1.1, 1.1, 8, D, TEXEL * 4);
      for (let k = 0; k < 3; k++) flange.box(x + (k - 1) * 3.4, -8, zF + 8.6, 2.2, 18, 1.2, T, TEXEL * 4, { skip: new Set(["-z"]) });
      at("mid", "exta_emit").box(x, 4.2, zF + 8.4, 1.2, 1.2, 0.6, EMIT.amber, 1);
    }
  }
}
