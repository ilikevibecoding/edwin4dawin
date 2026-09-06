import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Batch, strutGeometry, weldSmooth, wingPanel, wingXTE, withPaint, type WingSpec } from '../geometry';
import { SURF, tailV } from '../textures';
import { at, V3, type BuildContext } from './context';

export interface TailBuild {
  elevator: THREE.Group;
  rudder: THREE.Group;
}

/**
 * Stabiliser, fin and dorsal fillet (into `airframe`), elevator and rudder on their hinges, the antenna wire (into
 * `fittings`). The tail is the last part to add to `airframe` and `white`, so it also merges those two batches into
 * their meshes, at the point in the build order where they were always created.
 */
export function buildTail(ctx: BuildContext): TailBuild {
  const { mesh, root, fittings, white, airframe } = ctx;
  const { wingPaint, plainPaint } = ctx.mat;
  // ------------------------------------------------------------ tail
  // 12 % symmetric sections with a 4 mm/m open trailing edge and a dense chord grid: at 25 m the stabiliser's
  // rounded leading edge and blunt TE still catch light instead of vanishing into a sheet
  const TN = 14, TAIL_TE = 0.003;
  // 13 % section: the stabiliser was named plank-thin from the rear quarter (h03 aircraft_rear B5-C5) at 12 % of a
  // 1.05 m chord; one more percent of depth and a rounder nose read as a structure at 15 m without making the
  // tailplane look inflated against the fin
  const hstabSpec: WingSpec = { span: 2.45, rootChord: 1.05, tipChord: 0.80, sweep: -0.175, dihedral: 0, thickness: 0.13, twist: 0, camber: 0, te: TAIL_TE };
  const hsV = (z: number) => tailV(z, hstabSpec.span);
  const elevHinge = wingXTE(hstabSpec, 0) + 0.34;
  const hsGeo = weldSmooth(mergeGeometries([
    wingPanel(hstabSpec, { z0: 0, z1: 0.10, segments: 1, part: 'full', hingeX: elevHinge, capEnd: 'rear', n: TN, vOf: hsV }),
    wingPanel(hstabSpec, { z0: 0.10, z1: 2.30, segments: 4, part: 'front', hingeX: elevHinge, n: TN, vOf: hsV }),
    wingPanel(hstabSpec, { z0: 2.30, z1: 2.45, segments: 1, part: 'full', hingeX: elevHinge, capStart: 'rear', tipRound: 0.12, n: TN, vOf: hsV }),
  ]));
  const HSTAB = new THREE.Vector3(-4.25, 0.42, 0);
  for (const side of [-1, 1]) airframe.add(hsGeo, at(HSTAB, undefined, [1, 1, side]));
  const elevator = new THREE.Group();
  elevator.position.set(HSTAB.x + elevHinge, HSTAB.y, 0);
  root.add(elevator);
  const elGeo = wingPanel(hstabSpec, { z0: 0.12, z1: 2.28, segments: 4, part: 'rear', hingeX: elevHinge, gap: 0.015, capStart: 'rear', capEnd: 'rear', n: TN, vOf: hsV });
  elGeo.translate(-elevHinge, 0, 0);
  const elevBatch = new Batch();
  // trim tab actuators on both elevators (the tabs' hinge lines and side gaps are painted in the tail band): a horn
  // standing on the upper skin at the tab's hinge with a pushrod down onto the tab. Plain white spot of the wing paint.
  const tabZ0 = 0.38, tabZ1 = 0.88, tabChord = 0.13;
  const tabXOf = (z: number) => wingXTE(hstabSpec, z) + tabChord - elevHinge;
  const hornGeo = withPaint(new THREE.BoxGeometry(0.018, 0.075, 0.012), 0.25, 0.5), rodGeo = withPaint(new THREE.CylinderGeometry(0.005, 0.005, 0.10, 6), 0.25, 0.5);
  for (const side of [-1, 1]) {
    elevBatch.add(elGeo, at(undefined, undefined, [1, 1, side]));
    const zt = (tabZ0 + tabZ1) / 2 - 0.12, xt = tabXOf(zt);
    elevBatch.add(hornGeo, at([xt + 0.02, 0.035, side * zt]));
    elevBatch.add(rodGeo, at([xt - 0.025, 0.041, side * zt], [0, 0, -(Math.PI / 2 - 0.5)]));
  }
  mesh(elevBatch.build(), wingPaint, { parent: elevator });
  // vertical fin: a wing profile rotated upright, rudder hinged in its notch
  const finSpec: WingSpec = { span: 1.55, rootChord: 1.5, tipChord: 0.75, sweep: -0.55, dihedral: 0, thickness: 0.12, twist: 0, camber: 0, te: TAIL_TE };
  const finV = (z: number) => tailV(z, finSpec.span);
  const rudHinge = wingXTE(finSpec, 0) + 0.48;
  const finGeo = weldSmooth(mergeGeometries([
    wingPanel(finSpec, { z0: 0, z1: 0.06, segments: 1, part: 'full', hingeX: rudHinge, capEnd: 'rear', n: TN, vOf: finV }),
    wingPanel(finSpec, { z0: 0.06, z1: 1.45, segments: 3, part: 'front', hingeX: rudHinge, n: TN, vOf: finV }),
    wingPanel(finSpec, { z0: 1.45, z1: 1.55, segments: 1, part: 'full', hingeX: rudHinge, capStart: 'rear', tipRound: 0.10, n: TN, vOf: finV }),
  ]));
  const FIN = new THREE.Vector3(-4.35, 0.45, 0);
  airframe.add(finGeo, at(FIN, [-Math.PI / 2, 0, 0]));
  // dorsal fillet ahead of the fin: a strongly tapered, swept upright airfoil whose root is buried in the spine
  // and whose tip trailing edge sinks into the fin's leading edge (replaces the old slab)
  const dorsalSpec: WingSpec = { span: 0.33, rootChord: 1.3, tipChord: 0.25, sweep: -0.885, dihedral: 0, thickness: 0.10, twist: 0, camber: 0, te: TAIL_TE };
  // (rows of the tail band clear of the elevator trim-tab lines painted at the stabiliser's inboard stations)
  const dorsalGeo = wingPanel(dorsalSpec, { z0: 0, z1: 0.33, segments: 3, part: 'full', n: 10, tipRound: 0.05, vOf: (z) => tailV(z, 1.2) });
  airframe.add(dorsalGeo, at([-2.94, 0.62, 0], [-Math.PI / 2, 0, 0]));
  mesh(airframe.build(), wingPaint);
  mesh(white.build(), plainPaint);
  const rudder = new THREE.Group();
  rudder.position.set(FIN.x + rudHinge, FIN.y, 0);
  root.add(rudder);
  const rudGeo = wingPanel(finSpec, { z0: 0.08, z1: 1.43, segments: 3, part: 'rear', hingeX: rudHinge, gap: 0.015, capStart: 'rear', capEnd: 'rear', n: TN, vOf: finV });
  rudGeo.translate(-rudHinge, 0, 0);
  // ground-adjustable rudder trim tab: the last 13 cm of chord over 40 cm of the rudder's height as its own airfoil
  // segment, hinged at its front edge and bent 3 degrees to port, skins a hair proud of the rudder's so the tab
  // reads as a separate plate with a slot at its hinge (the tail band shares its rows with the stabiliser tips, so
  // this tab cannot be painted the way the elevator tabs are)
  const tabHinge = wingXTE(finSpec, 0.7) + 0.13;
  const tabGeo = wingPanel(finSpec, { z0: 0.50, z1: 0.90, segments: 1, part: 'rear', hingeX: tabHinge, gap: 0.006, capStart: 'rear', capEnd: 'rear', n: TN, vOf: finV });
  tabGeo.translate(-tabHinge, 0, 0);
  tabGeo.scale(1, 1.12, 1);
  tabGeo.rotateZ(0.052);
  tabGeo.translate(tabHinge - rudHinge, 0, 0);
  mesh(new Batch().add(rudGeo, at(undefined, [-Math.PI / 2, 0, 0])).add(tabGeo, at(undefined, [-Math.PI / 2, 0, 0])).build(), wingPaint, { parent: rudder });
  // hinge fittings bridging the gaps (three per surface: the dark slot is interrupted by the brackets it hangs on)
  for (const z of [0.45, 1.2, 1.95]) for (const side of [-1, 1]) fittings.add(new THREE.BoxGeometry(0.07, 0.028, 0.035), at([HSTAB.x + elevHinge, HSTAB.y, side * z]), SURF.darkMetal);
  for (const z of [0.3, 0.8, 1.3]) fittings.add(new THREE.BoxGeometry(0.07, 0.035, 0.028), at([FIN.x + rudHinge, FIN.y + z, 0]), SURF.darkMetal);
  // static wicks on the stabiliser tips and the fin tip
  const wick = (p: [number, number, number], rot: [number, number, number]) => {
    fittings.add(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 6), at(p, rot), SURF.metal);
    fittings.add(new THREE.CylinderGeometry(0.0035, 0.0035, 0.18, 5), at([p[0] - 0.10, p[1] - 0.01, p[2]], rot), SURF.rubber);
  };
  for (const side of [-1, 1]) for (const z of [2.25, 2.40]) wick([HSTAB.x + wingXTE(hstabSpec, z) - 0.01, HSTAB.y, side * z], [0, 0, Math.PI / 2 + 0.1]);
  wick([FIN.x + wingXTE(finSpec, 1.48) - 0.01, FIN.y + 1.48, 0], [0, 0, Math.PI / 2 + 0.1]);
  // antennas: the ADF sense-antenna mast on the spine with its wire to the fin, the VHF blade on the roof behind
  // the wing fairing, a GPS puck ahead of it
  fittings.add(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 5), at([-2.0, 0.9, 0], [0, 0, 0.5]), SURF.metal);
  fittings.add(strutGeometry(V3(-2.12, 1.12, 0), V3(-4.53, 1.75, 0), 0.0035, 4), undefined, SURF.wire);
  fittings.add(new THREE.BoxGeometry(0.10, 0.26, 0.022), at([-1.62, 1.05, 0], [0, 0, 0.42]), SURF.lightPlastic);
  fittings.add(new THREE.CylinderGeometry(0.045, 0.05, 0.02, 12), at([-1.52, 0.955, 0.18]), SURF.lightPlastic);
  return { elevator, rudder };
}
