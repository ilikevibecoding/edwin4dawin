// Layout, palette and section generators shared by the Munificent-class frigate builders. Everything is
// measured against the reference stills and the two ICS cutaways; fractions are of the 825 m length,
// counted from the bow (forward is -z, up +y, origin at the hull centre):
//   - 0-33.5 %: the hood — a broad flat-topped arch (172 m beam) that thins to a wedge lip at the nose
//     (a shallow crescent notch seen from above), rises to 53 m at the fin and stays open aft as a cowl
//     over the transceiver drums; its upper flanks are open between 20 % and 29 %;
//   - 26 %: the sensor cross — the 50 m chord dorsal blade to +125 m, the ventral blade to -118 m
//     (243 m tip to tip) and the 426 m lateral wing on a dark spar;
//   - 33.5-51.5 %: the boxy neck (110 m wide, 85 m tall) with round reactor ports and window bands;
//   - 51.5-100 %: the dome — a 168 m flat arch 60 m tall over a dark lower hull, rounded nose, the dark
//     spine trench along its top to the bridge tower at 80-87 %, and the two armour shells thinning past
//     the tower into the long inward-curving stern blades either side of the thruster block (86.4 %).
import { col } from "./munificentGeo.js";
import { smoothTable } from "./munificentHull.js";

export const MUNIFICENT = { length: 825, width: 426, height: 243 };
export const D2R = Math.PI / 180;

export const Z = {
  nose: -412.5,
  hoodOpen0: -247, // upper flank plating stops: open framework with the transceiver drums
  hoodOpen1: -173,
  hoodEnd: -136, // hood aft rim; the neck begins
  fin: -200, // fin / wing station (26 % from the bow)
  neckEnd: 12, // neck meets the dome nose
  domeFull: 70, // dome at its full section; the trench begins
  split: 228, // trench ends; the shells start narrowing into the stern blades
  eng: 300, // stern face with the thrusters
  tip: 412.5,
};
export const Y = {
  domeTop: 59, // peak of the dome; its top slopes down toward the stern (see domeH)
  eave: -5,
  lowerBot: -36,
  keelBot: -63,
  neckTop: 27,
  neckBot: -58,
  hoodPeak: 44,
  hoodFloor: -13,
  deckBot: -27,
  wing: 2,
  finTop: 125,
  lowFinBot: -118,
};
export const HW = {
  dome: 84,
  hood: 84,
  neck: 55,
  lower: 62,
  trench: 17.5,
  wing: 213,
  keel: 40,
  stern: 36,
};
export const SHELL_P = 2.3; // superellipse exponent of the arches (flat-topped)
export const SHELL_TH = 4.5; // armour shell thickness
export const HOOD_P = 2.0; // the hood cowl is a rounder arch than the dome

// palette: vertex tints over the shared plating (mean albedo ~0.62 before tint). Pale grey-white with
// a cool cast (the TCW frigate), a clear step above the Recusant's gunmetal and cooler than the Venator.
export const HULL = col(0xdcdde2);
export const HULL_LT = HULL.clone().multiplyScalar(1.06);
export const HULL_DK = HULL.clone().multiplyScalar(0.84);
export const SOOT = col(0x2a2a2e);
export const GRIME = col(0x707886); // blue-grey weathering streaks (TCW)
export const MACH = 0x7d8088; // exposed machinery on the dark texture
export const MACH_LT = 0x9c9ea6;
export const MACH_DK = 0x45474d;
export const CORE = 0x3a3c42;
export const BLUE = 0x4a6fae; // Banking Clan livery blue (paint)
export const BLUE_DK = 0x243a6a; // emblem spokes
export const WHITE = 0xeef0f4; // emblem field
export const OCHRE = 0xc09a46; // wing stripes
export const WINDOW = 0xffd27a; // yellow running lights (TCW)
export const BRIDGE = 0xa8f5c0; // green-lit bridge band
export const SHELL = col(0x5a5c62); // nozzle bells
export const SHELL_DK = col(0x33353a);
export const PLATE = col(0x3f4147);

// plank tone: long plating strips ~6 units apart, a few percent brighter or darker each; the argument
// is any coordinate across the planks (degrees around an arch, metres along a flat surface)
export function plankTone(k0) {
  const k = Math.floor((k0 + 10) / 6.2);
  const h = Math.sin(k * 12.9898) * 43758.5453;
  return 1 + (h - Math.floor(h) - 0.5) * 0.18;
}

// ---------------------------------------------------------------------------
// arches: superellipse |x/hw|^p + |y/h|^p = 1, parameter a in [0, PI] (0 = starboard eave, PI/2 = top)
// ---------------------------------------------------------------------------
export function archPt(a, hw, h, p = SHELL_P) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [
    Math.sign(c) * Math.abs(c) ** (2 / p) * hw,
    Math.abs(s) ** (2 / p) * h,
  ];
}

// arc length table of the unit-scaled dome arch so livery can be laid out in metres along the surface
function arcTable(hw, h, p = SHELL_P, n = 400) {
  const s = [0];
  let prev = archPt(0, hw, h, p);
  for (let i = 1; i <= n; i++) {
    const a = (i / n) * Math.PI;
    const pt = archPt(a, hw, h, p);
    s.push(s[i - 1] + Math.hypot(pt[0] - prev[0], pt[1] - prev[1]));
    prev = pt;
  }
  return {
    total: s[n],
    aOfS: (len) => {
      const t = Math.min(s[n], Math.max(0, len));
      let lo = 0;
      let hi = n;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (s[mid] <= t) lo = mid;
        else hi = mid;
      }
      const f = (t - s[lo]) / (s[hi] - s[lo] || 1);
      return ((lo + f) / n) * Math.PI;
    },
    sOfA: (a) => {
      const t = Math.min(Math.PI, Math.max(0, a)) / Math.PI;
      const i = Math.min(n - 1, Math.floor(t * n));
      const f = t * n - i;
      return s[i] + (s[i + 1] - s[i]) * f;
    },
  };
}
// ---- dome / stern blades ----
const prongT = smoothTable([
  [Z.split, 0],
  [255, 0.03],
  [280, 0.12],
  [310, 0.3],
  [340, 0.52],
  [370, 0.74],
  [395, 0.9],
  [Z.tip, 1],
]);
// arch height above the eave: the dome peaks at 58-62 % and its top slopes down all the way to the
// thin tail (WSMI side view: 28 m lower at the tower, a sliver at the tip)
const domeH = smoothTable([
  [Z.neckEnd, Y.domeTop - Y.eave],
  [120, Y.domeTop - Y.eave],
  [170, 60],
  [215, 54],
  [250, 45],
  [290, 34],
  [330, 22],
  [370, 12],
  [395, 6],
  [Z.tip, 1.5],
]);
/** Dome section at z: half-width, arch height, shell centre x offset (starboard) and eave height. */
export function domeSection(z) {
  const h = domeH(z);
  if (z <= Z.split) return { hw: HW.dome, h, cx: 0, yE: Y.eave };
  const t = prongT(z);
  const k = t ** 0.75;
  const tip = t > 0.985 ? (t - 0.985) / 0.015 : 0;
  return {
    hw: (HW.dome - 74 * k) * (1 - 0.9 * tip),
    h,
    cx: 46 * k,
    yE: Y.eave - 20 * t,
  };
}
/** Height of the dome top (trench rim level) at z. */
export function domeTop(z) {
  return Y.eave + domeH(z);
}
// angle of the trench rim on the full dome section
export const A_RIM = Math.acos((HW.trench / HW.dome) ** (SHELL_P / 2));
export const DOME_ARC = arcTable(HW.dome, Y.domeTop - Y.eave);

/** Point on the (starboard, side = 1) dome shell at station z and arch angle a, lifted radially. */
export function domePoint(z, a, side = 1, lift = 0) {
  const s = domeSection(z);
  const [px, py] = archPt(a, Math.max(0.3, s.hw + lift), Math.max(0.3, s.h + lift));
  return [side * (s.cx + px), s.yE + py, z];
}
/** Outward normal of the dome shell at (z, a) on `side` (finite differences on the section). */
export function domeNormal(z, a, side = 1) {
  const s = domeSection(z);
  const d = 0.002;
  const p0 = archPt(Math.max(0, a - d), s.hw, s.h);
  const p1 = archPt(Math.min(Math.PI, a + d), s.hw, s.h);
  const tx = p1[0] - p0[0];
  const ty = p1[1] - p0[1];
  const len = Math.hypot(tx, ty) || 1;
  // tangent runs from the eave up over the top; outward is (ty, -tx) for the starboard half
  return [(side * ty) / len, -tx / len, 0];
}
/** Dome surface point by arc length s (metres from the starboard eave) instead of angle. */
export function domeSurf(z, s, side = 1, lift = 0) {
  return domePoint(z, DOME_ARC.aOfS(s), side, lift);
}

// ---- hood ----
const hoodHW = smoothTable([
  [Z.nose, 42],
  [-407, 58],
  [-399, 67],
  [-388, 74],
  [-365, 80.5],
  [-330, HW.hood],
  [-300, HW.hood],
  [-200, HW.hood],
  [-165, 82.5],
  [-150, 80],
  [Z.hoodEnd, 76],
]);
const hoodTop = smoothTable([
  [Z.nose, 9],
  [-388, 15],
  [-338, 29],
  [-297, 37],
  [-256, 41],
  [-206, Y.hoodPeak],
  [-165, 41],
  [-148, 38],
  [Z.hoodEnd, 34],
]);
const hoodFloor = smoothTable([
  [Z.nose, 7],
  [-388, 0],
  [-338, -9],
  [-300, Y.hoodFloor],
  [Z.hoodEnd, Y.hoodFloor],
]);
export function hoodSection(z) {
  const yF = hoodFloor(z);
  return { hw: hoodHW(z), yF, h: hoodTop(z) - yF };
}
// the nose lip is a shallow crescent: the centre sits 14 m aft of the corners
export function noseShift(x, z) {
  const k = 1 - Math.min(1, (z - Z.nose) / 60);
  const c = Math.max(0, 1 - (Math.abs(x) / 66) ** 2);
  return 14 * c * k * k;
}
/** Point on the hood arch at station z and angle a (0 = starboard eave, PI = port eave). */
export function hoodPoint(z, a, lift = 0) {
  const s = hoodSection(z);
  const [px, py] = archPt(a, s.hw + lift, s.h + lift, HOOD_P);
  return [px, s.yF + py, z + noseShift(px, z)];
}
export function hoodNormal(z, a) {
  const s = hoodSection(z);
  const d = 0.002;
  const p0 = archPt(Math.max(0, a - d), s.hw, s.h, HOOD_P);
  const p1 = archPt(Math.min(Math.PI, a + d), s.hw, s.h, HOOD_P);
  const tx = p1[0] - p0[0];
  const ty = p1[1] - p0[1];
  const len = Math.hypot(tx, ty) || 1;
  return [ty / len, -tx / len, 0];
}
export const HOOD_ARC = arcTable(HW.hood, Y.hoodPeak - Y.hoodFloor, HOOD_P);
/** Hood surface point by arc length s (metres from the starboard eave) at station z. */
export function hoodSurf(z, s, lift = 0) {
  return hoodPoint(z, HOOD_ARC.aOfS(s), lift);
}

// z stations between z0 and z1 (inclusive of z1 when `end` is set)
export function stations(z0, z1, n, end = true) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(z0 + ((z1 - z0) * i) / n);
  if (end) out.push(z1);
  return out;
}
