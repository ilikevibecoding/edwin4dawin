import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  arcFraction, deckGeometry, flatUv, gridGeometry, halfWidthAt, humpGeometry, inBlock, insetSections, keyedRing, loftGrid, paneGeometry, revealGeometry, revolveGeometry, sectionAt, sectionPerimeter, sectionPoint, smoothStations, strutGeometry, tOfHeight, withStations,
  type LoftGrid, type QuadBlock, type Section,
} from '../geometry';
import { CHEAT_LINE, SURF, type FuselageLayout } from '../textures';
import { at, CABIN_FRONT, CABIN_REAR, FLOOR, SILL, SKIN, WIN_TOP, WS_BASE, type BuildContext } from './context';

/**
 * The fuselage loft every other part is placed against: the stations, the ring parameterisation, the outer skin and
 * the inner (cabin) grids, the window cut-outs and the texture layout the fuselage / cabin maps are painted in.
 */
export interface FuselageFrame {
  /** loft stations, nose first (base stations, cubic in-betweens and the window / bulkhead stations) */
  sections: Section[];
  /** the same stations shrunk by the skin thickness (cabin interior) */
  innerSections: Section[];
  /** ring parameters (t per ring vertex) of a station, see keyedRing */
  ring: (s: Section) => number[];
  outer: LoftGrid;
  inner: LoftGrid;
  /** ring vertex count (R + 1 vertices per station, the seam at the roof crest) */
  R: number;
  /** ring indices of the window-band heights: top of the side windows (jA), windshield base (jB), sill (jC) */
  jA: number;
  jB: number;
  jC: number;
  /** station index of the station at x (exact match) */
  si: (x: number) => number;
  /** side windows [front x, aft x, top height]; pillars are the strips left between them */
  sideWindows: [number, number, number][];
  /** window cut-outs as grid quad blocks (both sides and the wraparound windshield) */
  blocks: QuadBlock[];
  windshield: QuadBlock;
  isWindow: (i: number, j: number) => boolean;
  /** station indices of the firewall and the rear bulkhead */
  iFront: number;
  iRear: number;
  /** half width of the cabin interior at (x, y) */
  innerHalfAt: (x: number, y: number) => number;
  /** where the skin textures land on the loft (u along the body, v around the ring) */
  layout: FuselageLayout;
}

export function buildFuselageFrame(): FuselageFrame {
  // ------------------------------------------------------------ fuselage loft
  // Upper exponent rises through the cabin so the roof is flat enough to carry the wing (the squarer cabin
  // shoulder under the wing, n 6.5, keeps the roof above the window tops out to z 0.70 where the wing root
  // fairing rolls down onto it); the windshield runs from the cowl (x 2.30, y 0.81) up to the roof line (x 1.85, y 1.17).
  // Nose: a radial-engine cowl is a near-cylinder (the R-985 class engine is 1.17 m across) that rounds forward
  // into a nose bowl with a large annular inlet around the spinner; the loft stops at the bowl's front (x 4.50,
  // r 0.55) and the lip that rolls into the inlet duct is a revolved strip added in buildFuselageShell. The old
  // loft closed to a 30 cm point capped flat behind the spinner, which the critics read as a black flat-ended
  // cylinder with a chrome cone and no openings.
  const base: Section[] = [
    { x: 4.50, yc: 0.02, w: 0.550, top: 0.550, bot: 0.550, n: 2.0 },
    { x: 4.36, yc: 0.02, w: 0.635, top: 0.635, bot: 0.635, n: 2.0 },
    { x: 4.10, yc: 0.02, w: 0.690, top: 0.690, bot: 0.690, n: 2.0 },
    { x: 3.90, yc: 0.02, w: 0.710, top: 0.705, bot: 0.705, n: 2.05 },
    { x: 3.20, yc: 0.03, w: 0.75, top: 0.72, bot: 0.70, n: 2.3 },
    { x: 2.60, yc: 0.04, w: 0.77, top: 0.74, bot: 0.70, n: 3.0, nBot: 2.4 },
    { x: 2.30, yc: 0.05, w: 0.78, top: 0.76, bot: 0.70, n: 6.0, nBot: 2.4 },
    { x: 2.15, yc: 0.05, w: 0.79, top: 0.88, bot: 0.70, n: 5.2, nBot: 2.4 },
    { x: 2.00, yc: 0.05, w: 0.80, top: 1.01, bot: 0.70, n: 5.2, nBot: 2.4 },
    { x: 1.85, yc: 0.05, w: 0.80, top: 1.12, bot: 0.70, n: 5.8, nBot: 2.4 },
    { x: 1.73, yc: 0.05, w: 0.80, top: 1.13, bot: 0.70, n: 6.5, nBot: 2.4 },
    { x: 0.95, yc: 0.05, w: 0.80, top: 1.13, bot: 0.70, n: 6.5, nBot: 2.4 },
    { x: 0.00, yc: 0.05, w: 0.80, top: 1.13, bot: 0.68, n: 6.5, nBot: 2.4 },
    { x: -0.40, yc: 0.05, w: 0.79, top: 1.12, bot: 0.66, n: 5.8, nBot: 2.4 },
    { x: -0.90, yc: 0.05, w: 0.76, top: 1.08, bot: 0.62, n: 4.4, nBot: 2.4 },
    { x: -1.25, yc: 0.055, w: 0.71, top: 1.00, bot: 0.57, n: 3.3, nBot: 2.3 },
    // aft body: a DHC-2-class tail cone stays deep and slab-sided well past the cabin (the old 0.62 / 0.42 m
    // depths at -2.6 / -3.7 read as a pencil under the tailplane) and converges to a rounded stern post at
    // -5.5 instead of a 26 cm blade capped flat at -5.35
    { x: -1.60, yc: 0.06, w: 0.64, top: 0.91, bot: 0.52, n: 2.8, nBot: 2.2 },
    { x: -2.60, yc: 0.10, w: 0.50, top: 0.70, bot: 0.40, n: 2.6, nBot: 2.1 },
    { x: -3.70, yc: 0.16, w: 0.35, top: 0.50, bot: 0.27, n: 2.4 },
    { x: -4.70, yc: 0.24, w: 0.21, top: 0.34, bot: 0.15, n: 2.2 },
    { x: -5.15, yc: 0.29, w: 0.11, top: 0.22, bot: 0.08, n: 2.1 },
    { x: -5.40, yc: 0.32, w: 0.045, top: 0.11, bot: 0.035, n: 2.0 },
    { x: -5.50, yc: 0.33, w: 0.012, top: 0.03, bot: 0.01, n: 2.0 },
  ];
  // side windows [front x, aft x, top height]; pillars are the strips left between them
  const sideWindows: [number, number, number][] = [[1.77, 0.95, WIN_TOP], [0.85, -0.42, WIN_TOP], [-0.52, -1.25, WS_BASE]];
  // cubic in-between stations every <= 38 cm so the long cowl, cabin and tail-cone spans loft as curves, then the
  // window / bulkhead stations the cut-outs need
  const sections = withStations(smoothStations(base, 0.38), [CABIN_FRONT, CABIN_REAR, ...sideWindows.flatMap(([a, b]) => [a, b])]);
  const si = (x: number): number => sections.findIndex((s) => Math.abs(s.x - x) < 1e-6);
  // livery sill line (bottom of the white upper body): level along the cabin, drooping toward the tail
  const sillY = (x: number): number => (x >= CABIN_REAR ? SILL : SILL - ((CABIN_REAR - x) / (5.35 + CABIN_REAR)) * 0.10);
  // ring vertices land exactly on the window heights (straight cut-out edges) and on the cheat line edges (the
  // texture's v is the ring parameter, so the paint bands stay at their heights on the boxy cabin sections too);
  // the roof shoulder gets enough segments to read as a smooth headliner from the pilot seat
  const SEG_ROOF = 9, SEG_WS = 2, SEG_WIN = 3;
  const ring = keyedRing([
    { y: WIN_TOP, segs: SEG_ROOF, fallbackT: 0.10 }, { y: WS_BASE, segs: SEG_WS, fallbackT: 0.146 }, { y: (s) => sillY(s.x), segs: SEG_WIN, fallbackT: 0.2125 },
    { y: (s) => sillY(s.x) - CHEAT_LINE.top, segs: 1, fallbackT: 0.23 }, { y: (s) => sillY(s.x) - CHEAT_LINE.bottom, segs: 1, fallbackT: 0.26 },
    { y: (s) => sillY(s.x) - CHEAT_LINE.pin, segs: 1, fallbackT: 0.27 },
  ], 10);
  const jA = SEG_ROOF, jB = jA + SEG_WS, jC = jB + SEG_WIN;
  const outer = loftGrid(sections, ring);
  const R = outer.R;
  // interior shell: same stations and ring parameters, sections shrunk by the skin thickness
  const innerSections = insetSections(sections, SKIN);
  const inner = loftGrid(innerSections, (_s, i) => outer.t[i]);
  const innerHalfAt = (x: number, y: number) => halfWidthAt(sectionAt(innerSections, x), y);
  const blocks: QuadBlock[] = [];
  for (const [xf, xa, top] of sideWindows) {
    const jTop = top === WIN_TOP ? jA : jB;
    blocks.push({ i0: si(xf), i1: si(xa), j0: jTop, j1: jC });
    blocks.push({ i0: si(xf), i1: si(xa), j0: R - jC, j1: R - jTop });
  }
  // wraparound windshield: the top of the loft (across the ring seam) from the port to the starboard WS_BASE height
  const windshield: QuadBlock = { i0: si(CABIN_FRONT), i1: si(1.85), j0: R - jB, j1: R + jB };
  blocks.push(windshield);
  const isWindow = (i: number, j: number) => blocks.some((b) => inBlock(b, R, i, j));
  const iFront = si(CABIN_FRONT), iRear = si(CABIN_REAR);

  const noseX = sections[0].x, length = noseX - sections[sections.length - 1].x;
  // v of height y between stations the way the mesh maps it: the arc-length v at each bracketing station,
  // interpolated linearly along x (a section interpolated first would put the paint edges off the vertex rows)
  const vBetween = (x: number, y: number): number | null => {
    let i = 0;
    while (i < sections.length - 2 && sections[i + 1].x > x) i++;
    const a = sections[i], b = sections[i + 1];
    const f = THREE.MathUtils.clamp((a.x - x) / Math.max(a.x - b.x, 1e-6), 0, 1);
    const ta = tOfHeight(a, y), tb = tOfHeight(b, y);
    if (ta === null && tb === null) return null;
    if (ta === null) return arcFraction(b, tb!);
    if (tb === null) return arcFraction(a, ta);
    return arcFraction(a, ta) + (arcFraction(b, tb) - arcFraction(a, ta)) * f;
  };
  const layout: FuselageLayout = {
    length,
    uOf: (x) => (noseX - x) / length,
    xOf: (u) => noseX - u * length,
    vOf: vBetween,
    topV: (x, z) => {
      const s = sectionAt(sections, x), n = s.n ?? 2.2;
      const r = Math.min(Math.abs(z) / s.w, 0.999);
      return arcFraction(s, tOfHeight(s, s.yc + s.top * Math.pow(1 - Math.pow(r, n), 1 / n) * 0.999) ?? 0);
    },
    perimeter: (x) => sectionPerimeter(sectionAt(sections, x)),
    sillY,
  };
  return { sections, innerSections, ring, outer, inner, R, jA, jB, jC, si, sideWindows, blocks, windshield, isWindow, iFront, iRear, innerHalfAt, layout };
}

// ------------------------------------------------------------ cowl geometry shared by the shell and the fittings
/** engine axis height and the nose bowl's inlet radius (the propeller hub barrel is r 0.29 inside it) */
export const COWL_AXIS_Y = 0.02, INLET_R = 0.4225;
/** station of the engine face (baffle plate) seen through the inlet, and of the cowl's trailing edge (firewall seam) */
const ENGINE_FACE_X = 4.21, COWL_TE_X = 3.20;
/** chin (carburettor) scoop under the bowl and the top (oil cooler) scoop behind it: mouth stations and mouth half sizes */
const CHIN = { x0: 4.48, x1: 3.75, w: 0.19, h: 0.12 }, TOP = { x0: 4.02, x1: 3.36, w: 0.16, h: 0.095 };
/** cowl flaps: hinge station, trailing edge station, angular position about the axis (rad from straight down), half width */
const COWL_FLAPS = { hingeX: 3.46, teX: 3.22, angles: [-0.48, 0.48], halfW: 0.13, lift: 0.045 };

/** outer skin radius of the (round) cowl at station x, and the skin height at (x, z) on top / underneath */
function cowlR(sections: Section[], x: number): number { return sectionAt(sections, x).w; }
function skinTopY(sections: Section[], x: number, z: number): number {
  const s = sectionAt(sections, x), n = s.n ?? 2.2;
  return s.yc + s.top * Math.pow(Math.max(1 - Math.pow(Math.min(Math.abs(z) / s.w, 1), n), 0), 1 / n);
}
function skinBottomY(sections: Section[], x: number, z: number): number {
  const s = sectionAt(sections, x), n = s.nBot ?? s.n ?? 2.2;
  return s.yc - s.bot * Math.pow(Math.max(1 - Math.pow(Math.min(Math.abs(z) / s.w, 1), n), 0), 1 / n);
}
/**
 * Scoop hood stations: the hood's ridge (or keel) is a straight line from the mouth's outer edge back to where it
 * meets the skin at x1, so the mouth is the proudest part and the hood tapers into the skin like a real intake
 * fairing; measured against the local skin (which curves 14 cm on the bowl) the height would have peaked well behind
 * the mouth. `skinY(x)` is the skin height on the centreline, `sign` +1 for a hood on top, -1 for one underneath.
 */
function scoopStations(sc: { x0: number; x1: number; w: number; h: number }, skinY: (x: number) => number, sign: 1 | -1): { x: number; w: number; h: number }[] {
  const out: { x: number; w: number; h: number }[] = [];
  const yMouth = skinY(sc.x0) + sign * sc.h, yEnd = skinY(sc.x1);
  const fs = [0, 0.06, 0.16, 0.3, 0.46, 0.62, 0.78, 0.9, 1];
  for (const f of fs) {
    const x = sc.x0 + (sc.x1 - sc.x0) * f;
    // the line eases into the skin at the end instead of meeting it at an angle
    const line = yMouth + (yEnd - yMouth) * (1 - Math.pow(1 - f, 1.6));
    const h = Math.max(sign * (line - skinY(x)), 0);
    out.push({ x, w: sc.w * (0.4 + 0.6 * Math.min(h / sc.h, 1)), h });
  }
  return out;
}
const hood = (z: number, w: number, h: number) => h * Math.pow(Math.max(1 - Math.pow(Math.min(Math.abs(z) / w, 1), 2.6), 0), 1 / 2.6);

/**
 * Cowl parts that carry the fuselage paint and merge into the skin mesh: the nose-bowl lip rolling into the inlet
 * (its UVs sit on the texture's u = 0 column, the bare-metal bowl band), the two scoop hoods and the cowl flaps
 * (plain paint spots of the livery: the top of the cowl is the matte anti-glare panel, the belly is yellow).
 */
function cowlSkinParts(ctx: BuildContext): THREE.BufferGeometry[] {
  const { sections, layout } = ctx.fuselage;
  const out: THREE.BufferGeometry[] = [];
  // lip: traced from the duct interior forward, around the rolled edge and back along the outside into the loft
  // (the last point sits 2 cm inside the loft's skin so the two surfaces cross instead of leaving a hairline)
  const rFront = cowlR(sections, 4.50);
  out.push(revolveGeometry([
    [4.530, INLET_R + 0.0015], [4.550, INLET_R + 0.006], [4.568, INLET_R + 0.020], [4.580, INLET_R + 0.045], [4.578, INLET_R + 0.075],
    [4.562, rFront - 0.022], [4.532, rFront - 0.004], [4.500, rFront + 0.002], [4.470, rFront - 0.006],
  ], 56, { cy: COWL_AXIS_Y, uOf: () => 0.0 }));
  // chin scoop: built as a hump on the mirrored belly (y down) and flipped back
  const chinTop = (x: number, z: number, w: number, h: number) => -skinBottomY(sections, x, z) + hood(z, w, h);
  const chinSt = scoopStations(CHIN, (x) => skinBottomY(sections, x, 0), -1);
  const chin = humpGeometry(chinSt.map((s) => ({ x: s.x, w: s.w })),
    (x, z) => { const s = chinSt.find((c) => Math.abs(c.x - x) < 1e-6)!; return chinTop(x, z, s.w, s.h); },
    (x, z) => -skinBottomY(sections, x, z) - 0.03, 16, 4);
  chin.scale(1, -1, 1);
  // mirroring flips the winding: turn it back so the hood faces out
  { const idx = chin.index!; for (let i = 0; i < idx.count; i += 3) { const b = idx.getX(i + 1); idx.setX(i + 1, idx.getX(i + 2)); idx.setX(i + 2, b); } }
  chin.computeVertexNormals();
  out.push(flatUv(chin, layout.uOf(-2.0), 0.40));
  // top scoop on the anti-glare panel
  const topSt = scoopStations(TOP, (x) => skinTopY(sections, x, 0), 1);
  const top = humpGeometry(topSt.map((s) => ({ x: s.x, w: s.w })),
    (x, z) => { const s = topSt.find((c) => Math.abs(c.x - x) < 1e-6)!; return skinTopY(sections, x, z) + hood(z, s.w, s.h); },
    (x, z) => skinTopY(sections, x, z) - 0.03, 16, 4);
  out.push(flatUv(top, layout.uOf(3.0), layout.topV(3.0, 0.12)));
  // cowl flaps: thin plates hinged at the front, trailing edges lifted off the skin (open a few degrees on the water)
  for (const a of COWL_FLAPS.angles) {
    const len = COWL_FLAPS.hingeX - COWL_FLAPS.teX;
    const plate = new THREE.BoxGeometry(len, 0.008, COWL_FLAPS.halfW * 2);
    plate.applyMatrix4(cowlFlapFrame(sections, a, 0.004));
    out.push(flatUv(plate, layout.uOf(-2.0), 0.40));
  }
  return out;
}

/**
 * Distance from the engine axis to the skin at station x in the direction `a` radians from straight down (positive
 * toward port, the sense a `makeRotationX(a)` turns the straight-down direction), found on the section's actual
 * (superelliptic) outline; `cowlR` is only right for the round bowl.
 */
function skinRadial(sections: Section[], x: number, a: number): number {
  const s = sectionAt(sections, x);
  const p: [number, number] = [0, 0];
  // ring parameter 0.25 (starboard) .. 0.5 (belly) .. 0.75 (port) maps monotonically onto angles -pi/2 .. 0 .. pi/2
  const angleAt = (t: number) => { sectionPoint(s, t, p); return Math.atan2(-p[1], -(p[0] - COWL_AXIS_Y)); };
  let lo = 0.25, hi = 0.75;
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    if (angleAt(mid) < a) lo = mid; else hi = mid;
  }
  sectionPoint(s, (lo + hi) / 2, p);
  return Math.hypot(p[0] - COWL_AXIS_Y, p[1]);
}

/**
 * Frame of a cowl flap plate at angle `a` about the engine axis (0 = straight down): the plate's +X runs from its
 * trailing edge (lifted `lift` off the skin) up to the hinge on the skin; `out` is the offset of the plate's centre
 * plane outward from the skin (half the plate thickness puts its inner face flush with the skin).
 */
function cowlFlapFrame(sections: Section[], a: number, out: number, lift = COWL_FLAPS.lift): THREE.Matrix4 {
  const rTe = skinRadial(sections, COWL_FLAPS.teX, a), rH = skinRadial(sections, COWL_FLAPS.hingeX, a), len = COWL_FLAPS.hingeX - COWL_FLAPS.teX;
  // in the straight-down frame (relative to the axis, -y is outward): hinge end on the skin, trailing end `lift` proud of it
  const yA = -rH - out, yB = -rTe - lift - out;
  const theta = Math.atan2(yA - yB, len);
  return new THREE.Matrix4().makeTranslation(0, COWL_AXIS_Y, 0)
    .multiply(new THREE.Matrix4().makeRotationX(a))
    .multiply(new THREE.Matrix4().makeTranslation((COWL_FLAPS.hingeX + COWL_FLAPS.teX) / 2, (yA + yB) / 2, 0))
    .multiply(new THREE.Matrix4().makeRotationZ(theta));
}

/** Fuselage skin, the lined cabin shell with its bulkheads, reveals and floor, the glass panes, windshield post and window sills. */
export function buildFuselageShell(ctx: BuildContext): void {
  const { mesh, cabinFixed, cabinShell, cabinKit } = ctx;
  const { paint, glass } = ctx.mat;
  const { outer, inner, innerSections, blocks, windshield, isWindow, iFront, iRear, sideWindows, innerHalfAt } = ctx.fuselage;
  // ------------------------------------------------------------ fuselage shell, cabin, glass
  // the nose is open into the inlet duct (the engine face closes it, see buildFittings); the stern post is capped
  const skin = mergeGeometries([gridGeometry(outer, { quad: (i, j) => !isWindow(i, j), capStart: false, capEnd: true }), ...cowlSkinParts(ctx)]);
  if (!skin) throw new Error('fuselage: skin parts have incompatible attributes');
  mesh(skin, paint);
  cabinShell.add(gridGeometry(inner, { i0: iFront, i1: iRear, quad: (i, j) => !isWindow(i, j), flip: true }));
  cabinFixed.add(gridGeometry(inner, { i0: iFront, i1: iRear, quad: () => false, flip: true, capStart: true, capEnd: true }), undefined, SURF.bulkhead);
  for (const b of blocks) cabinFixed.add(revealGeometry(outer, inner, b), undefined, SURF.trim);
  cabinFixed.add(deckGeometry(innerSections, FLOOR, -1.55, 1.95, 0.01), undefined, SURF.carpet);
  // every pane with its own UV / size, outer panes first (seen from outside) then the flipped inner panes
  const glassGeo = mergeGeometries([
    ...blocks.map((b) => paneGeometry(outer, b, false, b === windshield)),
    ...blocks.map((b) => paneGeometry(inner, b, true, b === windshield)),
  ]);
  // the mesh origin sits at the windshield centre: transparent objects sort by their origin's depth, and with
  // the origin at the datum (behind the pilot's eye) the panes sorted as the farthest object from the cockpit
  // and the propeller blur disc was drawn over them. Same renderOrder as the disc so the two sort by depth:
  // from the seat the disc is beyond the windshield, from ahead of the aircraft it is in front of it.
  const glassOrigin = new THREE.Vector3(2.05, 1.0, 0);
  glassGeo.translate(-glassOrigin.x, -glassOrigin.y, -glassOrigin.z);
  const glassMesh = mesh(glassGeo, glass, { cast: false, receive: false });
  glassMesh.position.copy(glassOrigin);
  glassMesh.renderOrder = 15;
  // windshield centre post between the two panes along the glass centreline
  const wsBase = new THREE.Vector3(CABIN_FRONT, 0.81, 0), wsTop = new THREE.Vector3(1.85, 1.17, 0);
  const postPos = wsBase.clone().add(wsTop).multiplyScalar(0.5); postPos.y -= SKIN * 0.5;
  cabinKit.add(new THREE.BoxGeometry(wsBase.distanceTo(wsTop) + 0.04, 0.028, 0.026), at(postPos, [0, 0, Math.atan2(wsTop.y - wsBase.y, wsTop.x - wsBase.x)]), SURF.trim);
  // window sills: a ledge along the bottom of every side window inside the reveal, and a slim cap over the top edge
  for (const [xf, xa, top] of sideWindows) {
    for (const s of [-1, 1]) {
      const xm = (xf + xa) / 2, len = xf - xa - 0.02;
      cabinKit.add(new THREE.BoxGeometry(len, 0.022, 0.05), at([xm, SILL - 0.011, s * (innerHalfAt(xm, SILL) - 0.02)], [0, 0, 0], [1, 1, 1]), SURF.sill);
      cabinKit.add(new THREE.BoxGeometry(len, 0.016, 0.03), at([xm, top + 0.008, s * (innerHalfAt(xm, top) - 0.012)]), SURF.trim);
    }
  }
}

/**
 * Exterior fittings on the fuselage (all into `fittings`, one merged mesh): the engine seen through the inlet with
 * the duct behind the nose bowl, the scoop mouths, the openings under the cowl flaps, the exhaust tailpipe with its
 * heat shield, and the door steps.
 */
export function buildFittings(ctx: BuildContext): void {
  const { fittings } = ctx;
  const { sections } = ctx.fuselage;
  const AX = COWL_AXIS_Y;
  // ------------------------------------------------------------ engine and inlet duct
  // One revolved profile: the reduction-gear nose case (r 0.21, stepping down to the shaft housing that runs into
  // the propeller hub barrel at x 4.44), the baffle plate closing the duct at the engine face, and the duct interior
  // running forward to the lip (which starts at x 4.53, r INLET_R: a 4 mm step hides the seam in shadow). Traced
  // -X along the case, +r across the baffle and +X along the duct so every part faces the viewer looking in.
  fittings.add(revolveGeometry([
    [4.45, 0.10], [4.40, 0.10], [4.40, 0.10], [4.40, 0.165], [4.385, 0.21], [4.385, 0.21], [4.21, 0.21], [4.21, 0.21],
    [4.21, 0.475], [4.21, 0.475], [4.30, 0.462], [4.42, 0.440], [4.525, 0.4265],
  ], 40, { cy: AX }), undefined, (x, y, z) => (Math.hypot(y - AX, z) < 0.212 ? SURF.engineCase : x < 4.215 ? SURF.baffle : SURF.duct));
  // nine cylinders (R-985 class: #1 upright) with their heads: the barrels from r 0.20 to beyond the inlet radius, so
  // the lip hides their outer ends the way a real cowl does; two pushrod tubes per cylinder from the nose case to the
  // head, and the ignition harness ring around the case
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const spin = new THREE.Matrix4().makeTranslation(0, AX, 0).multiply(new THREE.Matrix4().makeRotationX(a));
    fittings.add(new THREE.BoxGeometry(0.125, 0.30, 0.11), spin.clone().multiply(new THREE.Matrix4().makeTranslation(4.275, 0.36, 0)), SURF.cylinder);
    fittings.add(new THREE.BoxGeometry(0.07, 0.12, 0.10), spin.clone().multiply(new THREE.Matrix4().makeTranslation(4.34, 0.30, 0)), SURF.cylinder);
    for (const dz of [-0.035, 0.035]) {
      const a0 = new THREE.Vector3(4.375, AX + 0.20, dz), b0 = new THREE.Vector3(4.31, AX + 0.36, dz * 1.4);
      fittings.add(strutGeometry(a0, b0, 0.011, 6), spin.clone().multiply(new THREE.Matrix4().makeTranslation(0, -AX, 0)), SURF.engineCase);
    }
  }
  fittings.add(new THREE.TorusGeometry(0.265, 0.013, 6, 36), at([4.37, AX, 0], [0, Math.PI / 2, 0]), SURF.rubber);
  // ------------------------------------------------------------ scoop mouths and cowl-flap openings
  // dark plates a hair ahead of the scoop hoods' front caps: the intakes read as openings, not yellow bumps
  fittings.add(new THREE.BoxGeometry(0.006, CHIN.h * 0.58, CHIN.w * 1.36), at([CHIN.x0 + 0.002, skinBottomY(sections, CHIN.x0, 0) - CHIN.h * 0.5, 0]), SURF.duct);
  fittings.add(new THREE.BoxGeometry(0.006, TOP.h * 0.58, TOP.w * 1.36), at([TOP.x0 + 0.002, skinTopY(sections, TOP.x0, 0) + TOP.h * 0.5, 0]), SURF.duct);
  // the opening a lifted cowl flap uncovers: a dark plate lying on the skin under each flap
  for (const a of COWL_FLAPS.angles) {
    const len = COWL_FLAPS.hingeX - COWL_FLAPS.teX;
    fittings.add(new THREE.BoxGeometry(len - 0.01, 0.004, COWL_FLAPS.halfW * 2 - 0.01), cowlFlapFrame(sections, a, 0.003, 0), SURF.duct);
  }
  // ------------------------------------------------------------ exhaust
  // The collector's tailpipe leaves the lower starboard cowl just ahead of the firewall seam and runs aft, down and
  // outboard to a flared mouth near the exhaust hardpoint (model.ts exhaustPos 2.6, -0.55, 0.66, where the smoke
  // starts); a stainless heat shield stands off the skin above it. The old two stubs were closed cylinders poking
  // out of the belly at an angle, with nothing joining them to the engine.
  const exitA = -0.78;
  const rExit = skinRadial(sections, 3.12, exitA);
  const pExit = new THREE.Vector3(3.12, AX - rExit * Math.cos(exitA) + 0.01, -rExit * Math.sin(exitA) - 0.01);
  const pElbow = new THREE.Vector3(2.98, -0.585, 0.585), pMouth = new THREE.Vector3(2.64, -0.60, 0.655);
  fittings.add(strutGeometry(pExit, pElbow, 0.042, 12), undefined, SURF.exhaust);
  fittings.add(new THREE.SphereGeometry(0.042, 12, 8), at(pElbow), SURF.exhaust);
  fittings.add(strutGeometry(pElbow, pMouth, 0.042, 12), undefined, SURF.exhaust);
  const mouthDir = pMouth.clone().sub(pElbow).normalize();
  const flareQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), mouthDir);
  fittings.add(new THREE.CylinderGeometry(0.052, 0.043, 0.07, 12, 1, true), new THREE.Matrix4().compose(pMouth.clone().addScaledVector(mouthDir, -0.035), flareQ, new THREE.Vector3(1, 1, 1)), SURF.exhaust);
  fittings.add(new THREE.CircleGeometry(0.05, 12), new THREE.Matrix4().compose(pMouth.clone().addScaledVector(mouthDir, -0.02), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), mouthDir), new THREE.Vector3(1, 1, 1)), SURF.soot);
  // heat shield: a stainless plate between the tailpipe and the skin, 3 cm off the paint, following the skin's slope
  {
    const aS = exitA - 0.10, x0 = 2.99, x1 = 2.66, off = 0.03;
    const r0 = skinRadial(sections, x0, aS) + off, r1 = skinRadial(sections, x1, aS) + off, rm = (r0 + r1) / 2;
    const c = new THREE.Vector3((x0 + x1) / 2, AX - rm * Math.cos(aS), -rm * Math.sin(aS));
    // the skin's radial grows toward the tail here: tilt the plate in the straight-down frame before turning it to aS
    fittings.add(new THREE.BoxGeometry(x0 - x1, 0.004, 0.17), at(c, [aS, 0, -Math.atan2(r0 - r1, x0 - x1)]), SURF.metal);
  }
  // ------------------------------------------------------------ door steps
  // under the door's bottom line: the tread stands clear of the skin on two brackets. It used to sit at a fixed z
  // inside the boxy cabin's skin, so only a corner poked through the paint as a flat grey rectangle (read as a stray
  // decal / a glass ghost by the iter08 critics).
  for (const side of [-1, 1]) {
    const skinZ = halfWidthAt(sectionAt(sections, 1.3), -0.45);
    fittings.add(new THREE.BoxGeometry(0.3, 0.03, 0.2), at([1.3, -0.45, side * (skinZ + 0.11)]), SURF.darkMetal);
    for (const dx of [-0.11, 0.11]) fittings.add(new THREE.BoxGeometry(0.03, 0.1, 0.18), at([1.3 + dx, -0.40, side * (skinZ + 0.085)], [0, 0, 0]), SURF.darkMetal);
  }
}
