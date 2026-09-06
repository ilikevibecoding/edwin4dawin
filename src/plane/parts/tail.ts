import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Batch, weldSmooth, wingPanel, wingXTE, type WingSpec } from '../geometry';
import { SURF, tailV } from '../textures';
import { at, type BuildContext } from './context';

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
  const TN = 14, TAIL_TE = 0.004;
  const hstabSpec: WingSpec = { span: 2.45, rootChord: 1.05, tipChord: 0.80, sweep: -0.175, dihedral: 0, thickness: 0.12, twist: 0, camber: 0, te: TAIL_TE };
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
  for (const side of [-1, 1]) elevBatch.add(elGeo, at(undefined, undefined, [1, 1, side]));
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
  const dorsalGeo = wingPanel(dorsalSpec, { z0: 0, z1: 0.33, segments: 3, part: 'full', n: 10, tipRound: 0.05, vOf: (z) => tailV(z, 2.0) });
  airframe.add(dorsalGeo, at([-2.94, 0.62, 0], [-Math.PI / 2, 0, 0]));
  mesh(airframe.build(), wingPaint);
  mesh(white.build(), plainPaint);
  const rudder = new THREE.Group();
  rudder.position.set(FIN.x + rudHinge, FIN.y, 0);
  root.add(rudder);
  const rudGeo = wingPanel(finSpec, { z0: 0.08, z1: 1.43, segments: 3, part: 'rear', hingeX: rudHinge, gap: 0.015, capStart: 'rear', capEnd: 'rear', n: TN, vOf: finV });
  rudGeo.translate(-rudHinge, 0, 0);
  mesh(new Batch().add(rudGeo, at(undefined, [-Math.PI / 2, 0, 0])).build(), wingPaint, { parent: rudder });
  fittings.add(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 5), at([-2.0, 0.9, 0], [0, 0, 0.5]), SURF.metal);
  return { elevator, rudder };
}
