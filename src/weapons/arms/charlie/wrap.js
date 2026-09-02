import * as THREE from 'three';
import { REST_MCP_TILT } from './hand.js';

/**
 * Build-time finger wrap solver. Given the hand's frame in gun space and a signed gap function
 * `gap(point) → metres outside the gripped surface`, find the joint angles that lay each finger onto the
 * surface: sample points along every phalanx are pulled toward contact (clearance → 0) while penetration
 * beyond the pad's squish is penalised stiffly. The joints of one digit are searched jointly (hierarchical
 * grid: root angle → next → tip, with incremental chain matrices and early-out), then refined twice.
 * Handles flat rail faces and small-radius grips alike — no hand-tuned angles, and no per-frame cost.
 *
 * Pose layout (radians): 4 fingers × [mcpFlex, mcpAbd, pipFlex, dipFlex] then thumb [cmcFlex, cmcAbd, mcpFlex, ipFlex].
 */

const D = Math.PI / 180;
const PEN_W = 40; // penetration weight relative to clearance
const REG = 1e-8; // curl regulariser (m² per deg²): a 30° deviation from a natural curl ≈ a 3 mm gap
const PAD_K = 0.9; // pad-side thickness relative to the finger radius (boxy section is flatter on the pad)
// sample points along a phalanx: t along the bone, pull weight, radius scale (1 → pad, cap → sphere end)
const MID_PTS = [
  { t: 0.35, w: 0.6, cap: false },
  { t: 0.7, w: 1.0, cap: false },
  { t: 1.0, w: 1.0, cap: false },
];
const TIP_PTS = [
  { t: 0.3, w: 0.6, cap: false },
  { t: 0.6, w: 1.0, cap: false },
  { t: 0.85, w: 2.0, cap: false },
  { t: 1.0, w: 1.0, cap: true },
];

const _p = new THREE.Vector3();
const _e = new THREE.Euler(0, 0, 0, 'ZXY');
const _q = new THREE.Quaternion();

/** Cost of one phalanx given its gun-space matrix (joint at the origin, +Y along the bone). */
function segmentCost(m, gap, L, r0, r1, pts, squish, pull = 1) {
  let cost = 0;
  for (let k = 0; k < pts.length; k++) {
    const { t, w, cap } = pts[k];
    const s = t * t * (3 - 2 * t);
    const r = (r0 + (r1 - r0) * s) * (cap ? 1 : PAD_K);
    _p.set(0, t * L, 0).applyMatrix4(m);
    const c = gap(_p) - r;
    const allow = r * squish;
    if (c < -allow) cost += PEN_W * (c + allow) * (c + allow);
    else if (c > 0) cost += pull * w * c * c;
  }
  return cost;
}

/**
 * Hierarchical grid search. `levels[i] = { lo, hi, step, set(a, b) → cost }` (1 or 2 angles per level,
 * degrees); `set` must update that level's chain matrix from the parent's. `final(cur) → extra cost`.
 */
function search(levels, idx, accum, cur, best, final) {
  const lv = levels[idx];
  const last = idx === levels.length - 1;
  const n = lv.lo.length;
  for (let a = lv.lo[0]; a <= lv.hi[0] + 1e-6; a += lv.step[0]) {
    for (let b = n > 1 ? lv.lo[1] : 0; b <= (n > 1 ? lv.hi[1] : 0) + 1e-6; b += n > 1 ? lv.step[1] : 1) {
      cur[idx][0] = a;
      if (n > 1) cur[idx][1] = b;
      const c = accum + lv.set(a, b);
      if (c >= best.cost) continue;
      if (last) {
        const tot = c + final(cur);
        if (tot < best.cost) {
          best.cost = tot;
          for (let i = 0; i < levels.length; i++) for (let k = 0; k < cur[i].length; k++) best.a[i][k] = cur[i][k];
        }
      } else {
        search(levels, idx + 1, c, cur, best, final);
      }
    }
  }
}

function solveChain(levels, final) {
  const cur = levels.map((lv) => lv.lo.map(() => 0));
  const best = { cost: Infinity, a: levels.map((lv) => lv.lo.map(() => 0)) };
  search(levels, 0, 0, cur, best, final);
  // two refinement passes around the coarse optimum (step → step/3 → step/9)
  for (let pass = 0; pass < 2; pass++) {
    const fine = levels.map((lv, i) => ({
      lo: lv.lo.map((lo, k) => Math.max(lv.limLo[k], best.a[i][k] - lv.step[k])),
      hi: lv.hi.map((hi, k) => Math.min(lv.limHi[k], best.a[i][k] + lv.step[k])),
      step: lv.step.map((s) => s / 3),
      limLo: lv.limLo,
      limHi: lv.limHi,
      set: lv.set,
    }));
    search(fine, 0, 0, cur, best, final);
    levels = fine;
  }
  return best;
}

const level = (lo, hi, step, set) => ({ lo, hi, step, limLo: lo, limHi: hi, set });

/**
 * @param {object} hand   result of buildHand()
 * @param {THREE.Matrix4} design hand root matrix in gun space
 * @param {(p: THREE.Vector3) => number} gap signed distance outside the gripped surface
 * @param {Float32Array} angles pose (in: abductions, out: solved flexions)
 * @param {object} [opt]
 * @param {number} [opt.squish] fraction of the pad radius allowed to sink into the surface (pad compression)
 * @param {number[]} [opt.fingers] finger indices to solve (index 0 … pinky 3)
 * @param {boolean} [opt.thumb] solve the thumb
 * @param {(p: THREE.Vector3) => number} [opt.avoid] extra geometry the digits must stay out of (no pull)
 * @param {(p: THREE.Vector3) => number} [opt.thumbGap] surface the thumb wraps (defaults to `gap`)
 * @param {(mcp: THREE.Vector3, tip: THREE.Vector3) => number} [opt.thumbPrefer] extra thumb cost (m²; a 1 mm gap ≈ 1e-6)
 */
export function solveWrap(hand, design, gap, angles, { squish = 0.15, fingers = [0, 1, 2, 3], thumb = true, avoid = null, thumbGap = null, thumbPrefer = null } = {}) {
  const side = hand.side;
  const m0 = new THREE.Matrix4();
  const m1 = new THREE.Matrix4();
  const m2 = new THREE.Matrix4();
  const cost = (m, surface, L, r0, r1, pts) => {
    let c = segmentCost(m, surface, L, r0, r1, pts, squish);
    if (avoid) c += segmentCost(m, avoid, L, r0, r1, pts, squish, 0);
    return c;
  };

  for (const i of fingers) {
    const f = hand.fingers[i];
    const o = i * 4;
    const abd = angles[o + 1];
    const [L0, L1, L2] = f.len;
    const [r0, r1, r2] = f.r;
    const levels = [
      level([-10], [100], [5], (a) => {
        f.mcp.rotation.set(-(a * D + REST_MCP_TILT), 0, side * (abd + f.splay));
        f.mcp.updateMatrix();
        m0.multiplyMatrices(design, f.mcp.matrix);
        return cost(m0, gap, L0, r0, r1, MID_PTS);
      }),
      level([0], [112], [4], (a) => {
        f.pip.rotation.x = -a * D;
        f.pip.updateMatrix();
        m1.multiplyMatrices(m0, f.pip.matrix);
        return cost(m1, gap, L1, r1, r2, MID_PTS);
      }),
      level([0], [80], [5], (a) => {
        f.dip.rotation.x = -a * D;
        f.dip.updateMatrix();
        m2.multiplyMatrices(m1, f.dip.matrix);
        return cost(m2, gap, L2, r2, r2 * 0.93, TIP_PTS);
      }),
    ];
    const best = solveChain(levels, (cur) => {
      const dPip = cur[1][0] - 1.05 * cur[0][0];
      const dDip = cur[2][0] - 0.5 * cur[1][0];
      return REG * (dPip * dPip + dDip * dDip);
    });
    angles[o] = best.a[0][0] * D;
    angles[o + 2] = best.a[1][0] * D;
    angles[o + 3] = best.a[2][0] * D;
  }

  if (thumb) {
    const t = hand.thumb;
    const tg = thumbGap || gap;
    const [L0, L1, L2] = t.len;
    const [r0, r1, r2] = t.r;
    const pMcp = new THREE.Vector3();
    const pTip = new THREE.Vector3();
    const levels = [
      level([-45, -20], [90, 90], [5, 5], (fl, ab) => {
        _e.set(-fl * D, 0, side * ab * D);
        _q.setFromEuler(_e);
        t.cmc.quaternion.copy(t.base).multiply(_q);
        t.cmc.updateMatrix();
        m0.multiplyMatrices(design, t.cmc.matrix);
        return cost(m0, tg, L0, r0, r1, MID_PTS);
      }),
      level([-20], [70], [6], (a) => {
        t.mcp.rotation.x = -a * D;
        t.mcp.updateMatrix();
        m1.multiplyMatrices(m0, t.mcp.matrix);
        return cost(m1, tg, L1, r1, r2, MID_PTS);
      }),
      level([0], [80], [8], (a) => {
        t.ip.rotation.x = -a * D;
        t.ip.updateMatrix();
        m2.multiplyMatrices(m1, t.ip.matrix);
        return cost(m2, tg, L2, r2, r2 * 0.92, TIP_PTS);
      }),
    ];
    const best = solveChain(levels, (cur) => {
      const dIp = cur[2][0] - 0.5 * cur[1][0];
      let c = REG * dIp * dIp;
      if (thumbPrefer) {
        pMcp.set(0, L0, 0).applyMatrix4(m0);
        pTip.set(0, L2 * 0.85, 0).applyMatrix4(m2);
        c += thumbPrefer(pMcp, pTip);
      }
      return c;
    });
    angles[16] = best.a[0][0] * D;
    angles[17] = best.a[0][1] * D;
    angles[18] = best.a[1][0] * D;
    angles[19] = best.a[2][0] * D;
  }

  hand.applyPose(angles);
  return angles;
}

/**
 * Point one finger at a target: solve [mcpFlex, mcpAbd, pipFlex, dipFlex] so the fingertip pad lands on
 * `target` (gun space) while the phalanges stay out of `avoid` (a gap function, penetration only).
 * Used for the trigger finger, whose pad rests on the trigger rather than wrapping the grip.
 */
export function solveReach(hand, design, finger, target, angles, { avoid = null, squish = 0.15, abd = [-25, 25] } = {}) {
  const side = hand.side;
  const f = hand.fingers[finger];
  const o = finger * 4;
  const [L0, L1, L2] = f.len;
  const [r0, r1, r2] = f.r;
  const m0 = new THREE.Matrix4();
  const m1 = new THREE.Matrix4();
  const m2 = new THREE.Matrix4();
  const tip = new THREE.Vector3();
  const none = () => Infinity;
  const gap = avoid || none;
  const levels = [
    level([-15, abd[0]], [95, abd[1]], [5, 5], (fl, ab) => {
      f.mcp.rotation.set(-(fl * D + REST_MCP_TILT), 0, side * (ab * D + f.splay));
      f.mcp.updateMatrix();
      m0.multiplyMatrices(design, f.mcp.matrix);
      return avoid ? segmentCost(m0, gap, L0, r0, r1, MID_PTS, squish, 0) : 0;
    }),
    level([0], [110], [5], (a) => {
      f.pip.rotation.x = -a * D;
      f.pip.updateMatrix();
      m1.multiplyMatrices(m0, f.pip.matrix);
      return avoid ? segmentCost(m1, gap, L1, r1, r2, MID_PTS, squish, 0) : 0;
    }),
    level([-5], [75], [5], (a) => {
      f.dip.rotation.x = -a * D;
      f.dip.updateMatrix();
      m2.multiplyMatrices(m1, f.dip.matrix);
      tip.set(0, L2 * 0.85, 0).applyMatrix4(m2);
      return tip.distanceToSquared(target) * 4;
    }),
  ];
  const best = solveChain(levels, (cur) => {
    const dDip = cur[2][0] - 0.5 * cur[1][0];
    return REG * dDip * dDip;
  });
  angles[o] = best.a[0][0] * D;
  angles[o + 1] = best.a[0][1] * D;
  angles[o + 2] = best.a[1][0] * D;
  angles[o + 3] = best.a[2][0] * D;
  hand.applyPose(angles);
  return angles;
}

/** Signed gap outside an infinite cylinder (axis through `c` along unit `dir`, radius R). */
export function cylinderGap(c, dir, R) {
  const d = new THREE.Vector3();
  return (p) => {
    d.subVectors(p, c);
    d.addScaledVector(dir, -d.dot(dir));
    return d.length() - R;
  };
}

/**
 * Signed gap outside a quad-rail handguard along the gun's Z axis: round body of radius `rBody` plus four
 * Picatinny rails (half-width `railHalf`) reaching `rRail` at 0°/90°/180°/270° around (cx, cy).
 */
export function quadRailGap(cx, cy, rBody, rRail, railHalf) {
  const box = (qx, qy, hx, hy) => {
    const dx = qx - hx;
    const dy = qy - hy;
    const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
    return outside + Math.min(Math.max(dx, dy), 0);
  };
  return (p) => {
    const x = Math.abs(p.x - cx);
    const y = Math.abs(p.y - cy);
    const body = Math.hypot(x, y) - rBody;
    return Math.min(body, box(x, y, railHalf, rRail), box(x, y, rRail, railHalf));
  };
}

/**
 * Signed gap outside a rounded-rectangle prism (pistol grip): axis through `c` along unit `dir`, half-widths
 * `a` along unit `u` and `b` along `w = dir × u`, superellipse exponent n.
 */
export function prismGap(c, dir, u, a, b, n = 3) {
  const d = new THREE.Vector3();
  const w = new THREE.Vector3().crossVectors(dir, u).normalize();
  return (p) => {
    d.subVectors(p, c);
    const x = Math.abs(d.dot(u));
    const y = Math.abs(d.dot(w));
    const s = Math.pow(Math.pow(x / a, n) + Math.pow(y / b, n), 1 / n);
    // radial distance to the surface along this direction
    const rDir = Math.hypot(x, y) || 1e-6;
    return (s - 1) * (rDir / (s || 1e-6));
  };
}

/** Signed gap outside an axis-aligned box (gun space). */
export function boxGap(min, max) {
  const c = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
  const h = new THREE.Vector3().subVectors(max, min).multiplyScalar(0.5);
  const d = new THREE.Vector3();
  return (p) => {
    d.subVectors(p, c);
    d.set(Math.abs(d.x) - h.x, Math.abs(d.y) - h.y, Math.abs(d.z) - h.z);
    const outside = Math.hypot(Math.max(d.x, 0), Math.max(d.y, 0), Math.max(d.z, 0));
    return outside + Math.min(Math.max(d.x, d.y, d.z), 0);
  };
}

/** Gap of the union of several surfaces (the nearest one wins). */
export function unionGap(...gaps) {
  return (p) => {
    let g = Infinity;
    for (let i = 0; i < gaps.length; i++) {
      const v = gaps[i](p);
      if (v < g) g = v;
    }
    return g;
  };
}
