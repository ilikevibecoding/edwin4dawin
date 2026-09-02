import * as THREE from 'three';
import { MM, RAIL, PartsBuilder, railClampShape, extrude, rbox, cylX, cylY, knurlX, knurlY, torusZ } from './lib.js';

/**
 * Low-profile flip-up rear sight, folded flat on the receiver rail behind the holo (KAC micro / MBUS Pro
 * style): clamp base with a cross-bolt, hinge, a folded aperture leaf with a round aperture drum and a
 * knurled windage wheel on the right, "CRONEN" etched on the rear and left faces of the mount.
 * Local frame: origin at the rail top on the rail centreline; +Y up, -Z forward; mm.
 */
export function buildRearSight(game, rig, mats, atlas, { zCentre = 0.042 } = {}) {
  const group = new THREE.Group();
  group.name = 'RearSight';
  group.position.set(RAIL.x, RAIL.topY, zCentre);
  rig.attachments.add(group);

  const b = new PartsBuilder('RearSight');
  const L = 48;
  const half = L / 2;
  const HW = 11; // clamp half width
  const top = 5.5; // clamp plate top

  // clamp + cross bolt (slotted nut on the right, pin head on the left)
  b.add(extrude(railClampShape({ halfWidth: HW, height: top, jawDepth: 5.9, hookDepth: 5.3 }), L, { bevel: 0.8 }), mats.anod, { pos: [0, 0, 0], wear: 0.5 });
  b.add(cylX(2.6, 28), mats.steel, { pos: [1, -3.0, -8] });
  b.add(cylX(4.6, 3.2, 24), mats.steel, { pos: [HW + 1.6, -3.0, -8] });
  b.add(rbox(1.2, 7, 1.0, 0.25), mats.matte, { pos: [HW + 3.2, -3.0, -8] });
  b.add(cylX(3.4, 1.6, 16), mats.steel, { pos: [-(HW + 0.8), -3.0, -8] });
  // recoil-lug screw on top of the plate at the front
  b.add(cylY(2.6, 1.2, 16), mats.steel, { pos: [0, top + 0.4, -18] });
  b.add(rbox(3.8, 0.8, 0.9, 0.2), mats.matte, { pos: [0, top + 1.0, -18] });

  // hinge barrel across the plate (front) + spring detent
  b.add(cylX(3.2, 20, 20), mats.anod, { pos: [0, top + 2.6, -8.5] });
  b.add(cylX(1.6, 22, 12), mats.steel, { pos: [0, top + 2.6, -8.5] });

  // folded leaf lying rearward on the plate: filleted plate + raised aperture drum (knurled rim) + aperture
  const leafY = top + 1.9; // leaf plate centre
  b.add(rbox(18, 3.4, 30, 1.6), mats.anod, { pos: [0, leafY, 7], wear: 0.55 });
  b.add(rbox(14, 1.2, 8, 0.55), mats.anod, { pos: [0, leafY + 2.2, -3], wear: 0.5 }); // leaf root
  const drumY = leafY + 1.7 + 1.9;
  b.add(knurlY(7.2, 3.8, 32, 0.4), mats.anod, { pos: [0, drumY, 12] });
  b.add(cylY(6.0, 4.0, 32), mats.anod, { pos: [0, drumY + 0.2, 12] });
  b.add(torusZ(2.9, 0.9, 8, 28).rotateX(Math.PI / 2), mats.steel, { pos: [0, drumY + 2.2, 12] }); // aperture ring
  b.add(cylY(2.1, 0.5, 20), mats.matte, { pos: [0, drumY + 2.05, 12] }); // dark aperture hole
  // windage wheel (right) on its axle, with a small index screw on the left; hex sockets in both screw heads
  b.add(cylX(1.8, 10, 12), mats.steel, { pos: [9, drumY, 12] });
  b.add(knurlX(5.6, 4.2, 22, 0.55), mats.anod, { pos: [13.4, drumY, 12] });
  b.add(cylX(3.4, 1.0, 16), mats.steel, { pos: [16.0, drumY, 12] });
  b.add(cylX(1.5, 0.3, 6), mats.matte, { pos: [16.6, drumY, 12] });
  b.add(cylX(2.4, 1.6, 12), mats.steel, { pos: [-9.6, drumY, 12] });
  b.add(cylX(1.1, 0.3, 6), mats.matte, { pos: [-10.5, drumY, 12] });
  // hex socket in the cross-bolt's left pin head
  b.add(cylX(1.5, 0.3, 6), mats.matte, { pos: [-(HW + 1.7), -3.0, -8] });
  // rear notch protector: two small filleted ears at the back of the plate
  for (const x of [-6.5, 6.5]) b.add(rbox(3.4, 3.0, 5, 1.0), mats.anod, { pos: [x, top + 1.5, half - 2.5], wear: 0.6 });
  b.build(group);

  // etched labels: one low-contrast logo on the rear face (visible when the rifle is lowered / at the hip) and
  // the model mark on the right side
  const labels = new PartsBuilder('RearSightLabels');
  labels.add(atlas.text(18, 4.2, 'CRONEN', { size: 2.9, color: '#7e8186', letterSpacing: 0.35 }), atlas.material, { pos: [0, 2.2, half + 0.12], rot: [0, 0, 0] });
  labels.add(atlas.text(14, 3, 'MK.3 REAR', { size: 1.5, color: '#6f7378' }), atlas.material, { pos: [HW + 0.12, 2.4, 8], rot: [0, Math.PI / 2, 0] });
  labels.build(group, { castShadow: false });

  return { group, topY: RAIL.topY + (drumY + 4.2) * MM };
}
