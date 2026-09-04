// Dorsal superstructure (workstream EXT-A): the three terraces from spec.TERRACES built as stepped
// tiers inscribed in the spec'd draft envelope. Each tier is a slightly inclined wall with a recessed
// window band (real geometry: parallel inset plane + sill / soffit), vertical fins, plated ledges and
// roofs, stepped sloped front faces and large roof blocks with their own window bands.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { TERRACES, terraceHalfWidth, hullTopY, TOWER } from "../spec.js";
import { plateField, shade, mixC, plateTone, fieldNoise, TEXEL } from "./hull_util.js";
import { heavyTurretSites } from "./weapons_layout.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

/** Walls lean in by this much (horizontal m per vertical m); the spec draft is the outer envelope. */
export const INCLINE = 0.12;
/** Ledge heights as fractions of each terrace's height, measured from its base. */
const LEDGES = { t0: [0.42, 0.74], t1: [0.5], t2: [0.5] };
/**
 * Front-face setback per tier (m) and draft (horizontal m per vertical m, leaning aft): each terrace
 * climbs in 2–3 long steps (t0: y ≈ 47 at z = -420, 67 at -350, 84 by -270) instead of one cliff.
 */
const SETBACK = { t0: 70, t1: 40, t2: 40 };
// near-vertical front faces (a 6° lean) so the tier ends read as square-cut cliffs, not ramps
const FRONT_SLOPE = 0.1;
const BAND_H = 2.8;
const RECESS = 0.9;

export function terraceBaseY(t, z) {
  const i = TERRACES.indexOf(t);
  return i <= 0 ? hullTopY(z) : TERRACES[i - 1].yTop;
}
/** y levels from the base to the roof: [yBase, ledge…, yTop]. */
export function tierLevels(t, z) {
  const yB = terraceBaseY(t, z);
  const h = t.yTop - yB;
  return [yB, ...(LEDGES[t.id] || [0.5]).map((f) => yB + f * h), t.yTop];
}
/** Envelope half-width at height y (the spec's lofted side). */
export function envelopeX(t, z, y) {
  return terraceHalfWidth(t, z) + t.draft * (t.yTop - y);
}
/** Half-width of a tier wall at height y; the wall touches the envelope at the tier's top. */
export function tierWallX(t, z, yTierTop, y) {
  return envelopeX(t, z, yTierTop) + INCLINE * (yTierTop - y);
}
/** Footprint half-width where terrace t stands on the surface below it. */
export function terraceBaseHalfWidth(t, z) {
  const lv = tierLevels(t, z);
  return tierWallX(t, z, lv[1], lv[0]);
}
const setback = (t) => SETBACK[t.id] || 8;
/** Station where terrace t's flat roof (y = yTop) begins, aft of the stepped front faces. */
export function terraceRoofZStart(t) {
  const nTiers = (LEDGES[t.id] || [0.5]).length + 1;
  const lvF = tierLevels(t, t.zFront);
  return t.zFront + (nTiers - 1) * setback(t) + (t.yTop - lvF[nTiers - 1]) * FRONT_SLOPE + 0.5;
}

export function buildSuperstructure(ctx) {
  const { chunks, rand } = ctx;
  const tintFor = (base, x, z) => shade(base, 0.95 + fieldNoise(x, z, 90, 11) * 0.1);
  const L = PALETTE.hullLight;
  const M = PALETTE.hullMid;
  const D = PALETTE.hullDark;
  const T = PALETTE.hullTrench;

  TERRACES.forEach((t, ti) => {
    const next = TERRACES[ti + 1] || null;
    const nTiers = (LEDGES[t.id] || [0.5]).length + 1;

    for (let k = 0; k < nTiers; k++) {
      const yLo = (z) => tierLevels(t, z)[k];
      const yHi = (z) => tierLevels(t, z)[k + 1];
      const xAt = (z, y) => tierWallX(t, z, yHi(z), y);
      const zF = t.zFront + k * setback(t);
      const zFrontTop = zF + (yHi(zF) - yLo(zF)) * FRONT_SLOPE;

      // ------------------------------------------------------------ tier walls (both sides)
      const seg0End = Math.min(t.zBack, zFrontTop + 10);
      const segs = [[zF, seg0End, false]];
      let z = seg0End;
      while (z < t.zBack - 1) {
        let len = 30 + rand() * 24;
        for (const e of chunks.edges) if (e > z + 2 && e < z + len) len = e - z;
        const z1 = Math.min(t.zBack, z + len);
        segs.push([z, z1, true]);
        z = z1;
      }
      for (const [z0, z1, hasBand] of segs) {
        const zm = (z0 + z1) / 2;
        const finZ = hasBand && rand() < 0.72 ? clamp(z0 + 4 + rand() * (z1 - z0 - 8), z0 + 3, z1 - 3) : null;
        const finDepth = 2.4 + rand() * 1.4;
        const bandTint = tintFor(k % 2 === 0 ? M : mixC(M, L, 0.5), 0, zm);
        for (const side of [1, -1]) {
          const X = (z, y) => side * xAt(z, y);
          const hint = V(side, 0, 0);
          const far = chunks.batch(zm, "far", "hullPlate1");
          const y0a = yLo(z0);
          const y1a = yHi(z0);
          const y0b = yLo(z1);
          const y1b = yHi(z1);
          if (!hasBand) {
            // front segment: one plane with the slanted front edge (the sloped front face is separate)
            const y1f = yHi(zFrontTop);
            far.quad(V(X(z0, y0a), y0a, z0), V(X(zFrontTop, y1f), y1f, zFrontTop), V(X(z1, y1b), y1b, z1), V(X(z1, y0b), y0b, z1), bandTint, TEXEL, hint);
            continue;
          }
          // recessed window band at 52 % of the tier height
          const yb0 = (z) => yLo(z) + (yHi(z) - yLo(z)) * 0.52 - BAND_H / 2;
          const yb1 = (z) => yb0(z) + BAND_H;
          far.quad(V(X(z0, y0a), y0a, z0), V(X(z0, yb0(z0)), yb0(z0), z0), V(X(z1, yb0(z1)), yb0(z1), z1), V(X(z1, y0b), y0b, z1), bandTint, TEXEL, hint);
          far.quad(V(X(z0, yb1(z0)), yb1(z0), z0), V(X(z0, y1a), y1a, z0), V(X(z1, y1b), y1b, z1), V(X(z1, yb1(z1)), yb1(z1), z1), bandTint, TEXEL, hint);
          const dark = chunks.batch(zm, "far", "hullGreeble");
          const r = side * RECESS;
          dark.quad(V(X(z0, yb0(z0)), yb0(z0), z0), V(X(z0, yb0(z0)) - r, yb0(z0), z0), V(X(z1, yb0(z1)) - r, yb0(z1), z1), V(X(z1, yb0(z1)), yb0(z1), z1), D, TEXEL * 2, V(0, 1, 0));
          dark.quad(V(X(z0, yb1(z0)), yb1(z0), z0), V(X(z0, yb1(z0)) - r, yb1(z0), z0), V(X(z1, yb1(z1)) - r, yb1(z1), z1), V(X(z1, yb1(z1)), yb1(z1), z1), D, TEXEL * 2, V(0, -1, 0));
          dark.quad(V(X(z0, yb0(z0)) - r, yb0(z0), z0), V(X(z0, yb1(z0)) - r, yb1(z0), z0), V(X(z1, yb1(z1)) - r, yb1(z1), z1), V(X(z1, yb0(z1)) - r, yb0(z1), z1), T, TEXEL * 2, hint);
          {
            const g = new THREE.PlaneGeometry(z1 - z0 - 1.2, BAND_H - 0.6);
            const yc = (yb0(zm) + yb1(zm)) / 2;
            const xc = X(zm, yc) - side * (RECESS - 0.3);
            const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), V(side, 0, 0));
            chunks.batch(zm, "far", "cityLights").addGeometry(g, { pos: [xc, yc, zm], quat: q, uv: "scale", uvScale: [(z1 - z0) / 40, 0.34] });
          }
          // raised armour panels on the wall above and below the band (close-range relief)
          {
            const panels = chunks.batch(zm, "near", "hullPlate1");
            const cols = Math.max(1, Math.round((z1 - z0) / 9));
            for (const [yA, yB] of [
              [(z) => yLo(z) + 0.7, (z) => yb0(z) - 0.7],
              [(z) => yb1(z) + 0.7, (z) => yHi(z) - 0.7],
            ]) {
              if (yB(zm) - yA(zm) < 2.2) continue;
              for (let ci = 0; ci < cols; ci++) {
                if (rand() < 0.5) continue;
                const za = z0 + ((z1 - z0) * ci) / cols + 0.8;
                const zb = z0 + ((z1 - z0) * (ci + 1)) / cols - 0.8;
                const c = [V(X(za, yA(za)), yA(za), za), V(X(zb, yA(zb)), yA(zb), zb), V(X(zb, yB(zb)), yB(zb), zb), V(X(za, yB(za)), yB(za), za)];
                const n = new THREE.Vector3().subVectors(c[1], c[0]).cross(new THREE.Vector3().subVectors(c[3], c[0])).normalize();
                if (n.dot(hint) < 0) n.negate();
                panels.frustum(c, n, 0.35 + rand() * 0.35, 0.6, mixC(plateTone(rand), bandTint, 0.55), TEXEL);
              }
            }
          }
          if (finZ !== null) {
            const th = 1.4;
            const yb = yLo(finZ);
            const yt = yHi(finZ) + (k === nTiers - 1 ? 1.5 : 0);
            const fin = chunks.batch(zm, "near", "hullPlate1");
            const c0 = [V(X(finZ, yb) - side * 0.3, yb, finZ - th / 2), V(X(finZ, yb) + side * finDepth, yb, finZ - th / 2), V(X(finZ, yb) + side * finDepth, yb, finZ + th / 2), V(X(finZ, yb) - side * 0.3, yb, finZ + th / 2)];
            const c1 = [V(X(finZ, yt) - side * 0.3, yt, finZ - th / 2), V(X(finZ, yt) + side * finDepth * 0.8, yt, finZ - th / 2), V(X(finZ, yt) + side * finDepth * 0.8, yt, finZ + th / 2), V(X(finZ, yt) - side * 0.3, yt, finZ + th / 2)];
            hexa(fin, c0, c1, mixC(M, D, 0.3), TEXEL, { skipBottom: true, skipSides: new Set([3]) });
          }
        }
      }

      // ---------------------------------------------------------- sloped front face of the tier
      {
        const yA = yLo(zF);
        const yB = yHi(zFrontTop);
        const xa = xAt(zF, yA);
        const xb = xAt(zFrontTop, yB);
        const far = chunks.batch(zF + 5, "far", "hullPlate1");
        const faceTint = tintFor(mixC(L, M, 0.45), 0, zF);
        far.quad(V(-xa, yA, zF), V(xa, yA, zF), V(xb, yB, zFrontTop), V(-xb, yB, zFrontTop), faceTint, TEXEL, V(0, FRONT_SLOPE, -1));
        const n = new THREE.Vector3().crossVectors(V(0, yB - yA, zFrontTop - zF), V(1, 0, 0)).normalize();
        if (n.z > 0) n.negate();
        const h = yB - yA;
        const P = (u, f) => V(u * (xa + (xb - xa) * f), yA + h * f, zF + (zFrontTop - zF) * f);
        // the face in hull tone, read by its steps: raised armour plates, window rows, hatch clusters
        // and horizontal pipe runs (the studio-model "cliff face" detail)
        const plates = chunks.batch(zF + 5, "near", "hullPlate");
        const cols = Math.max(2, Math.round((xa * 2) / 22));
        // window rows across the face (one per ~9 m of height); the armour plates fill the bands
        // between them so no plate ever crosses a window line
        const nWin = Math.max(1, Math.min(3, Math.floor(h / 9)));
        const wins = [];
        for (let wi = 0; wi < nWin; wi++) wins.push((wi + 0.5) / nWin + (rand() - 0.5) * 0.08);
        const bounds = [0.05, ...wins.flatMap((f) => [f - 1.9 / h, f + 1.9 / h]), 0.95];
        for (let bi = 0; bi < bounds.length; bi += 2) {
          const f0 = bounds[bi];
          const f1 = bounds[bi + 1];
          if ((f1 - f0) * h < 2.4) continue;
          for (let ci = 0; ci < cols; ci++) {
            if (rand() < 0.3) continue;
            const u0 = -1 + (2 * ci) / cols + 0.03;
            const u1 = -1 + (2 * (ci + 1)) / cols - 0.03;
            plates.frustum([P(u0, f0), P(u1, f0), P(u1, f1), P(u0, f1)], n, 0.6 + rand() * 0.5, 0.8, mixC(plateTone(rand), faceTint, 0.5), TEXEL);
          }
        }
        // each window row: a 0.6 m warm emissive line inside a 1.5 m dark recess over 60 % of the face
        // width, so it reads as a row of lit windows at scale rather than as a glowing panel
        const WIN = new THREE.Color(0xffd9a0).multiplyScalar(1.3);
        for (const f of wins) {
          const half = xa + (xb - xa) * f;
          if (half * 2 < 12) continue;
          const uw = 0.6 + (rand() - 0.5) * 0.08;
          const uc = (rand() - 0.5) * (0.95 - uw) * 2;
          const rec = chunks.batch(zF + 5, "far", "hullGreeble");
          const fr = 0.75 / h;
          const fw = 0.3 / h;
          const lip = 0.32 / h;
          // dark recess back (on the face, between the raised armour plates) with a sill and a soffit
          // lip standing 0.6 m proud so the strip reads as set back into the cliff
          const on = n.clone().multiplyScalar(0.08);
          rec.quad(P(uc - uw, f - fr).add(on), P(uc + uw, f - fr).add(on), P(uc + uw, f + fr).add(on), P(uc - uw, f + fr).add(on), T, TEXEL * 2, n);
          const lips = chunks.batch(zF + 5, "near", "hullPlate1");
          lips.frustum([P(uc - uw - 0.5 / half, f - fr - lip), P(uc + uw + 0.5 / half, f - fr - lip), P(uc + uw + 0.5 / half, f - fr), P(uc - uw - 0.5 / half, f - fr)], n, 0.6, 0.1, mixC(M, D, 0.3), TEXEL);
          lips.frustum([P(uc - uw - 0.5 / half, f + fr), P(uc + uw + 0.5 / half, f + fr), P(uc + uw + 0.5 / half, f + fr + lip), P(uc - uw - 0.5 / half, f + fr + lip)], n, 0.6, 0.1, mixC(M, D, 0.3), TEXEL);
          const em = chunks.batch(zF + 5, "far", "exta_emit");
          const lit = n.clone().multiplyScalar(0.16);
          // the lit line is broken into 3.5 m panes by 0.5 m mullions
          const paneW = 3.5 / half;
          for (let u = uc - uw + 0.4 / half; u + paneW < uc + uw; u += paneW + 0.5 / half) {
            em.quad(P(u, f - fw).add(lit), P(u + paneW, f - fw).add(lit), P(u + paneW, f + fw).add(lit), P(u, f + fw).add(lit), WIN, 1, n);
          }
        }
        // pipe runs: two or three horizontal conduits on standoffs riding over the armour plates
        // (which stand up to 1.1 m proud), with clamps
        const pipes = chunks.batch(zF + 5, "near", "hullGreeble");
        const nPipe = h > 12 ? 3 : 2;
        for (let pi = 0; pi < nPipe; pi++) {
          const f = 0.12 + (0.76 * (pi + rand() * 0.6)) / nPipe;
          const r = 0.35 + rand() * 0.35;
          const uMax = 0.9 - rand() * 0.35;
          const a = P(-uMax, f).addScaledVector(n, r + 1.25);
          const b2 = P(uMax, f).addScaledVector(n, r + 1.25);
          pipes.tube(a, b2, r, r, 8, mixC(M, D, 0.3), TEXEL * 4);
          const dfc = (r + 0.5) / h;
          for (let cu = -uMax + 0.1; cu < uMax; cu += 0.18 + rand() * 0.1) {
            const du = 0.6 / xa;
            pipes.frustum([P(cu - du, f - dfc), P(cu + du, f - dfc), P(cu + du, f + dfc), P(cu - du, f + dfc)], n, r + 1.35, 0.1, D, TEXEL * 4);
          }
        }
        // hatch clusters: 2–3 groups of 3–4 raised hatches per face, standing on the plate bands
        const hatches = chunks.batch(zF + 5, "near", "hullPlate1");
        const nGroups = Math.max(2, Math.min(3, Math.round(xa / 18)));
        for (let gi = 0; gi < nGroups; gi++) {
          const uc = -0.8 + (1.6 * (gi + 0.2 + rand() * 0.6)) / nGroups;
          const band = bounds.length >= 4 ? 2 * Math.floor(rand() * (bounds.length / 2)) : 0;
          const fc = (bounds[band] + bounds[band + 1]) / 2 + (rand() - 0.5) * 0.02;
          const cnt = 3 + Math.floor(rand() * 2);
          const du = 1.2 / xa;
          const df = 1.2 / h;
          for (let hi = 0; hi < cnt; hi++) {
            const u0 = uc + (hi - (cnt - 1) / 2) * (3.6 / xa);
            hatches.frustum([P(u0 - du, fc - df), P(u0 + du, fc - df), P(u0 + du, fc + df), P(u0 - du, fc + df)], n, 1.5, 0.3, mixC(plateTone(rand), faceTint, 0.4), TEXEL);
            hatches.frustum([P(u0 - du * 0.6, fc - df * 0.6), P(u0 + du * 0.6, fc - df * 0.6), P(u0 + du * 0.6, fc + df * 0.6), P(u0 - du * 0.6, fc + df * 0.6)], n, 1.85, 0.1, D, TEXEL * 2);
          }
        }
      }

      // ---------------------------------------------------------- plated ledge on top of this tier
      if (k < nTiers - 1) {
        const yL = (z) => tierLevels(t, z)[k + 1];
        const zNextFront = t.zFront + (k + 1) * setback(t);
        const xIn = (z) => (z >= zNextFront ? tierWallX(t, z, tierLevels(t, z)[k + 2], yL(z)) - 0.3 : 0);
        const xOut = (z) => envelopeX(t, z, yL(z));
        plateField(chunks, rand, {
          zStart: zFrontTop,
          zEnd: t.zBack,
          rowLen: [7, 12],
          zSplits: [zNextFront],
          strips: (z) => [{ s0: xIn(z), s1: xOut(z), kind: "plate" }],
          point: (z, s) => V(s, yL(z), z),
          normal: V(0, 1, 0),
          cellW: 7,
          slabP: 0.38,
          slabH: [0.35, 0.7],
          skinKey: "hullPlate",
          slabKeys: ["hullPlate", "hullPlate1"],
          tint: (x, y, z) => tintFor(L, x, z),
          slabTint: (r, base) => mixC(plateTone(r), base, 0.4),
        });
      }
    }

    // -------------------------------------------------------------- roof plating
    const neck = TOWER.neck;
    const neckHalfL = (neck.z1 - neck.z0) / 2 + neck.draft * (neck.yTop - neck.yBase) * 0.5 + 0.6;
    const neckZc = (neck.z0 + neck.z1) / 2;
    const neckHw = neck.hw + neck.draft * (neck.yTop - neck.yBase) + 0.6;
    {
      const yR = t.yTop;
      const zStart = terraceRoofZStart(t);
      const zSplits = next ? [next.zFront, next.zBack] : [neckZc - neckHalfL, neckZc + neckHalfL];
      plateField(chunks, rand, {
        zStart,
        zEnd: t.zBack,
        rowLen: [8, 13],
        zSplits,
        strips: (z) => {
          const e = terraceHalfWidth(t, z);
          let x0 = 0;
          if (next && z >= next.zFront && z <= next.zBack) x0 = terraceBaseHalfWidth(next, z) - 0.4;
          else if (!next && z > neckZc - neckHalfL && z < neckZc + neckHalfL) x0 = Math.min(neckHw, e);
          return [
            { s0: 0, s1: x0, kind: "skip" },
            { s0: x0, s1: e, kind: "plate" },
          ];
        },
        point: (z, s) => V(s, yR, z),
        normal: V(0, 1, 0),
        cellW: 8,
        slabP: 0.42,
        slabH: [0.4, 0.9],
        skinKey: "hullPlate",
        slabKeys: ["hullPlate", "hullPlate1"],
        tint: (x, y, z) => tintFor(L, x, z),
        slabTint: (r, base) => mixC(plateTone(r), base, 0.4),
      });
    }

    // -------------------------------------------------------------- roof blocks: an outer row of
    // large blocks along the roof edge and an inner row of lower blocks against the next tier
    {
      const yR = t.yTop;
      const block = (side, xc, zc, w, h, len, tint, { cap = true, vents = 3 } = {}) => {
        const b = chunks.batch(zc, "far", "hullPlate");
        b.box(side * xc, yR + h / 2, zc, w, h, len, tint, TEXEL, { skip: new Set(["-y"]) });
        const near = chunks.batch(zc, "near", "hullPlate1");
        if (cap && rand() < 0.7) near.box(side * xc, yR + h + h * 0.22, zc + (rand() - 0.5) * len * 0.3, w * 0.6, h * 0.44, len * 0.55, mixC(tint, D, 0.3), TEXEL, { skip: new Set(["-y"]) });
        if (h > 4.5) {
          for (const f of [1, -1]) {
            const g = new THREE.PlaneGeometry(len - 3, Math.min(1.8, h * 0.3));
            const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), V(f, 0, 0));
            chunks.batch(zc, "far", "cityLights").addGeometry(g, { pos: [side * xc + f * (w / 2 + 0.3), yR + h * 0.55, zc], quat: q, uv: "scale", uvScale: [(len - 3) / 40, 0.2] });
          }
        }
        const nb = chunks.batch(zc, "near", "hullGreeble");
        for (let i = 0; i < vents; i++) nb.box(side * (xc + (rand() - 0.5) * w * 0.5), yR + h + 0.4, zc + (rand() - 0.5) * len * 0.7, 2 + rand() * 2, 0.8, 2 + rand() * 3, T, TEXEL * 3, { skip: new Set(["-y"]) });
      };
      // the heavy turbolaser batteries stand on this roof (weapons_layout.js): no blocks near them
      const gunZ = ti === 0 ? [...new Set(heavyTurretSites().map((s) => s.z))] : [];
      let z = terraceRoofZStart(t) + 10 + rand() * 30;
      while (z < t.zBack - 30) {
        const len = Math.min(18 + rand() * 34, t.zBack - 6 - z);
        const zc = z + len / 2;
        if (gunZ.some((g) => Math.abs(g - zc) < len / 2 + 24)) {
          z += len + 14 + rand() * 40;
          continue;
        }
        const e = terraceHalfWidth(t, zc);
        let inner = 0;
        if (next && z + len + 2 > next.zFront && z < next.zBack) inner = terraceBaseHalfWidth(next, Math.max(z + len, next.zFront + 0.5));
        else if (!next && zc > neckZc - neckHalfL - len && zc < neckZc + neckHalfL + len) inner = neckHw + 4;
        const w = 9 + rand() * 9;
        const h = 6 + rand() * 7;
        const xc = e - w / 2 - 5 - rand() * 8;
        const outerOK = xc - w / 2 > inner + 5 && xc + w / 2 < e - 2;
        for (const side of [1, -1]) {
          if (outerOK && rand() >= 0.15) block(side, xc, zc, w, h, len, tintFor(rand() < 0.6 ? L : M, side * xc, zc));
          // inner row: lower, shorter blocks when the strip is wide enough for a lane in between
          const w2 = 6 + rand() * 6;
          const xMax = (outerOK ? xc - w / 2 : e - 2) - 4 - w2 / 2;
          const xMin = inner + 4 + w2 / 2;
          if (xMax - xMin > 2 && rand() < 0.6) {
            const len2 = 8 + rand() * Math.max(2, len * 0.7 - 8);
            block(side, xMin + rand() * (xMax - xMin), zc + (rand() - 0.5) * (len - len2), w2, 3.5 + rand() * 4, len2, tintFor(M, side * xMin, zc), { cap: false, vents: 1 });
          }
        }
        z += len + 14 + rand() * 40;
      }
    }
  });
}

/**
 * Hexahedron from 4 bottom corners and 4 top corners (same cyclic order). Faces get outward hints
 * from the centroid, so any convex arrangement renders correctly. skipSides holds side indices
 * (side i joins corners i and i+1).
 */
export function hexa(batch, b, t, color, texel = TEXEL, { skipBottom = false, skipTop = false, skipSides = null } = {}) {
  const c = V(0, 0, 0);
  for (const p of b) c.add(p);
  for (const p of t) c.add(p);
  c.multiplyScalar(1 / 8);
  const hintFor = (pts) => {
    const m = V(0, 0, 0);
    for (const p of pts) m.add(p);
    return m.multiplyScalar(1 / pts.length).sub(c);
  };
  if (!skipBottom) batch.quad(b[0], b[1], b[2], b[3], color, texel, hintFor(b));
  if (!skipTop) batch.quad(t[0], t[1], t[2], t[3], color, texel, hintFor(t));
  for (let i = 0; i < 4; i++) {
    if (skipSides && skipSides.has(i)) continue;
    const j = (i + 1) % 4;
    const pts = [b[i], b[j], t[j], t[i]];
    batch.quad(pts[0], pts[1], pts[2], pts[3], color, texel, hintFor(pts));
  }
}
