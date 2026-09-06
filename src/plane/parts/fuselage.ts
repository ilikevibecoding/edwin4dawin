import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  arcFraction, deckGeometry, gridGeometry, halfWidthAt, inBlock, insetSections, keyedRing, loftGrid, paneGeometry, revealGeometry, sectionAt, sectionPerimeter, smoothStations, tOfHeight, withStations,
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
  const base: Section[] = [
    { x: 4.55, yc: 0.02, w: 0.30, top: 0.30, bot: 0.30, n: 2.0 },
    { x: 4.35, yc: 0.02, w: 0.55, top: 0.55, bot: 0.55, n: 2.0 },
    { x: 3.90, yc: 0.02, w: 0.72, top: 0.70, bot: 0.70, n: 2.1 },
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

/** Fuselage skin, the lined cabin shell with its bulkheads, reveals and floor, the glass panes, windshield post and window sills. */
export function buildFuselageShell(ctx: BuildContext): void {
  const { mesh, cabinFixed, cabinShell, cabinKit } = ctx;
  const { paint, glass } = ctx.mat;
  const { outer, inner, innerSections, blocks, windshield, isWindow, iFront, iRear, sideWindows, innerHalfAt } = ctx.fuselage;
  // ------------------------------------------------------------ fuselage shell, cabin, glass
  mesh(gridGeometry(outer, { quad: (i, j) => !isWindow(i, j), capStart: true, capEnd: true }), paint);
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

/** Exterior fittings on the fuselage: door steps, exhaust stubs (`fittings`), the intake scoop and cowl flaps (`white`). */
export function buildFittings(ctx: BuildContext): void {
  const { fittings, white } = ctx;
  const { sections } = ctx.fuselage;
  // ------------------------------------------------------------ exterior fittings (one merged mesh)
  // door steps under the door's bottom line: the tread stands clear of the skin on two brackets. It used to sit at a
  // fixed z inside the boxy cabin's skin, so only a corner poked through the paint as a flat grey rectangle
  // (read as a stray decal / a glass ghost by the iter08 critics).
  for (const side of [-1, 1]) {
    const skinZ = halfWidthAt(sectionAt(sections, 1.3), -0.45);
    fittings.add(new THREE.BoxGeometry(0.3, 0.03, 0.2), at([1.3, -0.45, side * (skinZ + 0.11)]), SURF.darkMetal);
    for (const dx of [-0.11, 0.11]) fittings.add(new THREE.BoxGeometry(0.03, 0.1, 0.18), at([1.3 + dx, -0.40, side * (skinZ + 0.085)], [0, 0, 0]), SURF.darkMetal);
  }
  // engine exhaust stubs
  for (let i = 0; i < 2; i++) fittings.add(new THREE.CylinderGeometry(0.05, 0.06, 0.28, 10), at([2.75 - i * 0.22, -0.5, 0.62 + i * 0.03], [0.6, 0, 1.2]), SURF.exhaust);
  // intake scoop on the cowl top, cowl flaps (white paint batch)
  white.add(new THREE.BoxGeometry(0.5, 0.12, 0.28), at([3.7, 0.70, 0]));
  for (let i = 0; i < 2; i++) white.add(new THREE.BoxGeometry(0.28, 0.04, 0.22), at([3.0, -0.62, (i === 0 ? -1 : 1) * 0.35], [(i === 0 ? -1 : 1) * 0.35, 0, 0]));
}
