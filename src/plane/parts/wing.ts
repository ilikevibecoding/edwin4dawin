import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { humpGeometry, sectionAt, weldSmooth, wingLowerY, wingPanel, wingUpperY, wingXLE, wingXTE, type WingSpec } from '../geometry';
import { SURF, wingV } from '../textures';
import { at, WING_POS, type BuildContext } from './context';

export interface WingBuild {
  /** the wing planform; the lights and the float struts are placed against it */
  spec: WingSpec;
  flapL: THREE.Group;
  flapR: THREE.Group;
  aileronL: THREE.Group;
  aileronR: THREE.Group;
}

/** Wing panels (into `airframe`), the wing root fairing (into `white`), flaps and ailerons on their hinges, the pitot tube (into `fittings`). */
export function buildWing(ctx: BuildContext): WingBuild {
  const { mesh, root, fittings, white, airframe } = ctx;
  const { wingPaint } = ctx.mat;
  const { sections } = ctx.fuselage;
  // ------------------------------------------------------------ wing
  // straight trailing edge (sweep chosen so xTE is constant), gentle taper, thin 11% airfoil with washout
  const wingSpec: WingSpec = { span: 7.3, rootChord: 1.95, tipChord: 1.55, sweep: -0.28, dihedral: 0.02, thickness: 0.11, twist: -0.03, camber: 0.02 };
  const xte = wingXTE(wingSpec, 0);
  const flapHinge = xte + 0.52, ailHinge = xte + 0.46;
  const wingVOf = (z: number) => wingV(z, wingSpec.span);
  const WN = 16;
  // panels share their surface vertices along the chord grid: welded, the wing shades as one smooth skin
  const wingGeo = weldSmooth(mergeGeometries([
    wingPanel(wingSpec, { z0: 0, z1: 0.85, segments: 2, part: 'full', hingeX: flapHinge, capEnd: 'rear', n: WN, vOf: wingVOf }),
    wingPanel(wingSpec, { z0: 0.85, z1: 3.55, segments: 5, part: 'front', hingeX: flapHinge, n: WN, vOf: wingVOf }),
    wingPanel(wingSpec, { z0: 3.55, z1: 3.65, segments: 1, part: 'full', hingeX: flapHinge, capStart: 'rear', capEnd: 'rear', n: WN, vOf: wingVOf }),
    wingPanel(wingSpec, { z0: 3.65, z1: 6.90, segments: 6, part: 'front', hingeX: ailHinge, n: WN, vOf: wingVOf }),
    wingPanel(wingSpec, { z0: 6.90, z1: 7.30, segments: 1, part: 'full', hingeX: ailHinge, capStart: 'rear', tipRound: 0.22, n: WN, vOf: wingVOf }),
  ]));
  for (const side of [1, -1]) airframe.add(wingGeo, at(WING_POS, undefined, [1, 1, side]));
  // Wing root fairing: the wing sits on the cabin roof. Between the leading and trailing edges the fairing's top
  // IS the wing's lower surface (a few cm inside the wing so the two never z-fight) out to 68 % of its width,
  // then rolls down tangentially onto the roof at z = FAIR_W, just above the window tops; ahead and behind the
  // wing it tapers into the roof. Its underside is sunk into the skin so nothing shows inside the cabin.
  const roofY = (x: number, z: number) => {
    const s = sectionAt(sections, x), n = s.n ?? 2.2;
    return s.yc + s.top * Math.pow(Math.max(1 - Math.pow(Math.min(Math.abs(z) / s.w, 1), n), 0), 1 / n);
  };
  const wl = (x: number, z = 0) => WING_POS.y + wingLowerY(wingSpec, x - WING_POS.x, z);
  const wu = (x: number, z = 0) => WING_POS.y + wingUpperY(wingSpec, x - WING_POS.x, z);
  const inWing = (x: number, z = 0) => { const lo = wl(x, z), hi = wu(x, z); return lo + Math.min(0.05, 0.5 * (hi - lo)); };
  const xLE = WING_POS.x + wingXLE(wingSpec, 0), xTE = WING_POS.x + xte;
  const FAIR_FWD = 0.45, FAIR_AFT = 0.62, FAIR_W = 0.70;
  const fairF = (x: number) => {
    const d = x > xLE ? (x - xLE) / FAIR_FWD : x < xTE ? (xTE - x) / FAIR_AFT : 0;
    const f = 1 - Math.min(d, 1);
    return f * f * (3 - 2 * f);
  };
  const fairW = (x: number) => 0.30 + (FAIR_W - 0.30) * Math.sqrt(fairF(x));
  // fairing crest height over the roof at (x, z): the wing underside inside the chord, tapering fore and aft
  const crestH = (x: number, z: number) => {
    const zz = Math.min(Math.abs(z), FAIR_W);
    if (x <= xLE && x >= xTE) return inWing(x, zz) - roofY(x, z);
    const xw = x > xLE ? xLE - 0.01 : xTE + 0.01;
    return (inWing(xw, zz) - roofY(xw, z)) * fairF(x);
  };
  const bump = (r: number) => 1 - THREE.MathUtils.smoothstep(r, 0.68, 1);
  const fairXs = [0.45, 0.33, 0.22, 0.13, 0.06].map((d) => xLE + d)
    .concat([0, 0.03, 0.08, 0.15, 0.25, 0.4, 0.55, 0.7, 0.82, 0.91, 0.97, 1].map((f) => xLE - f * wingSpec.rootChord))
    .concat([0.07, 0.16, 0.27, 0.4, 0.52, 0.62].map((d) => xTE - d));
  white.add(humpGeometry(
    fairXs.map((x) => ({ x, w: fairW(x) })),
    (x, z) => roofY(x, z) - 0.012 + Math.max(crestH(x, z) + 0.012, 0) * bump(Math.abs(z) / fairW(x)),
    (x, z) => roofY(x, z) - 0.03,
    24, 6,
  ));
  // control surfaces: rear airfoil segments hinged in the notches, tilted with the dihedral so the hinge is straight
  const mkSurface = (z0: number, z1: number, hingeX: number, segments: number): [THREE.Group, THREE.Group] => {
    const geo = wingPanel({ ...wingSpec, dihedral: 0 }, { z0, z1, segments, part: 'rear', hingeX, gap: 0.02, capStart: 'rear', capEnd: 'rear', n: WN, vOf: wingVOf });
    geo.translate(-hingeX, 0, 0);
    const out: THREE.Group[] = [];
    for (const side of [1, -1]) {
      const hinge = new THREE.Group();
      hinge.position.set(WING_POS.x + hingeX, WING_POS.y, 0);
      hinge.rotation.x = -side * wingSpec.dihedral;
      hinge.scale.z = side;
      const g = new THREE.Group();
      mesh(geo, wingPaint, { parent: g });
      hinge.add(g); root.add(hinge);
      out.push(g);
    }
    return [out[0], out[1]];
  };
  const [flapR, flapL] = mkSurface(0.87, 3.53, flapHinge, 5);
  const [aileronR, aileronL] = mkSurface(3.67, 6.88, ailHinge, 6);
  // pitot tube under the port wing
  fittings.add(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 6), at([WING_POS.x + 0.45, wl(WING_POS.x + 0.25) - 0.06, -3.2], [0, 0, Math.PI / 2]), SURF.metal);
  return { spec: wingSpec, flapL, flapR, aileronL, aileronR };
}
