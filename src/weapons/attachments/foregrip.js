import * as THREE from 'three';
import { RAIL, PartsBuilder, railClampShape, extrude, rbox, cylX } from './lib.js';

/**
 * Angled hand stop (BCM KAG style) on the handguard bottom rail: a polymer fin with a forward-leaning rear
 * face the support hand's index finger rests against. Local frame: origin on the bottom rail surface, rail
 * centreline; +Y up (the rail body is above the origin), -Z forward; mm.
 *
 * Returns the suggested support-hand palm centre (gunRoot space) for rig.sockets.gripLeft.
 */
export function buildHandStop(game, rig, mats, atlas, { zCentre = -0.265 } = {}) {
  const group = new THREE.Group();
  group.name = 'HandStop';
  group.position.set(RAIL.x, RAIL.bottomY, zCentre);
  rig.attachments.add(group);

  const b = new PartsBuilder('HandStop');
  const L = 54;
  const HW = 11;

  // clamp (mirrored: the rail body extends upward from the bottom rail face)
  b.add(extrude(railClampShape({ halfWidth: HW, height: 5, jawDepth: 7.0, hookDepth: 5.2, flip: true }), L, { bevel: 0.8 }), mats.polymer, { pos: [0, 0, 0], wear: 0.15 });
  // cross bolt with a slotted head (right) and a nut (left)
  b.add(cylX(2.6, 26), mats.steel, { pos: [0.5, 3.0, 18] });
  b.add(cylX(4.4, 2.8, 24), mats.steel, { pos: [HW + 1.4, 3.0, 18] });
  b.add(rbox(1.2, 6.5, 1.0, 0.25), mats.matte, { pos: [HW + 2.8, 3.0, 18] });
  b.add(cylX(3.6, 2.0, 6), mats.steel, { pos: [-(HW + 1.0), 3.0, 18] });

  // fin body: side profile in (z, y), extruded across x
  const prof = new THREE.Shape();
  const pts = [
    [-27, 0.5],
    [27, 0.5],
    [27, -6],
    [20, -23],
    [12, -28],
    [-10, -28],
    [-19, -20],
    [-25, -9],
    [-27, -4],
  ];
  prof.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) prof.lineTo(pts[i][0], pts[i][1]);
  prof.closePath();
  const fin = extrude(prof, 22, { bevel: 1.6, bevelSeg: 3 });
  fin.rotateY(-Math.PI / 2); // shape x → gunRoot z
  b.add(fin, mats.polymer, { pos: [0, 0, 0], wear: 0.2 });
  // grip ribs across the rear (finger) face
  for (let i = 0; i < 4; i++) {
    const t = (i + 0.5) / 4;
    const z = 27 - 7 * t - 0.6;
    const y = -6 - 17 * t;
    b.add(rbox(18, 1.6, 1.4, 0.5), mats.polymer, { pos: [0, y, z + 0.9], rot: [0.39, 0, 0] });
  }
  b.build(group);

  const labels = new PartsBuilder('HandStopLabels');
  labels.add(atlas.text(12, 3, 'KAG', { size: 2.0, color: '#8e9196' }), atlas.material, { pos: [-(HW + 0.12), -13, 2], rot: [0, -Math.PI / 2, 0] });
  labels.build(group, { castShadow: false });

  // Palm centre for the support hand: just behind the fin, under/left of the handguard (the index finger
  // lands on the fin's rear face). The palm's "up" axis (+Y of the socket) points up-right into the handguard.
  const palm = new THREE.Vector3(-0.026, -0.011, zCentre + 0.067);
  const palmRotation = new THREE.Euler(0, 0, -0.6);
  return { group, palm, palmRotation };
}
