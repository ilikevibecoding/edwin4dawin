import * as THREE from 'three';
import { MM, RAIL, PartsBuilder, railClampShape, chamferRect, extrude, rbox, cylX, cylY, knurlX, knurlY, torusZ } from './lib.js';

/**
 * Low-profile flip-up rear sight, folded flat on the receiver rail behind the holo (KAC micro / MBUS Pro
 * style). Machined-aluminium read from the hip (the side the shooter sees): a stepped body — clamp base with
 * 45° chamfers on its top edges and both ends, a narrower chamfered deck (the folded leaf assembly) on top of
 * it — the aperture drum proud of the deck with its knurled rim and steel aperture ring, the windage wheel on
 * the right, two cross bolts with hex-socket cap heads on the left, a raised legend plate with "CRONEN" on the
 * left flank. Local frame: origin at the rail top on the rail centreline; +Y up, -Z forward; mm.
 */
export function buildRearSight(game, rig, mats, atlas, { zCentre = 0.042 } = {}) {
  const group = new THREE.Group();
  group.name = 'RearSight';
  group.position.set(RAIL.x, RAIL.topY, zCentre);
  rig.attachments.add(group);

  const b = new PartsBuilder('RearSight');
  const L = 44;
  const HW = 11; // clamp half width
  const baseTop = 4.0; // clamp plate top

  // --- clamp base: 1.5 mm chamfers on the top edges (profile) and both ends (extrude bevel)
  b.add(extrude(railClampShape({ halfWidth: HW, height: baseTop, jawDepth: 5.9, hookDepth: 5.3, chamfer: 1.5 }), L, { bevel: 1.2 }), mats.anod, { pos: [0, 0, 0], wear: 0.5 });
  // two cross bolts: hex-socket cap heads on the left, slotted nuts on the right
  for (const z of [-12, 12]) {
    b.add(cylX(2.6, 28), mats.steel, { pos: [1, -3.0, z] });
    b.add(cylX(4.4, 3.0, 24), mats.steel, { pos: [HW + 1.5, -3.0, z] });
    b.add(rbox(1.2, 6.6, 1.0, 0.25), mats.matte, { pos: [HW + 3.05, -3.0, z] });
    b.add(cylX(3.2, 1.8, 20), mats.steel, { pos: [-(HW + 0.9), -3.0, z] });
    b.add(cylX(1.5, 0.3, 6), mats.matte, { pos: [-(HW + 1.85), -3.0, z] });
  }

  // --- deck: the folded leaf assembly, a chamfered slab (1.8 mm at 45°) narrower than the base so the base's
  // chamfer and ledge read as a step; chamfered ends. Sunk 0.3 mm into the base so no face is coplanar.
  const deckW = 18;
  const deckH = 6.3;
  const deckL = 34;
  const deckZ = 3;
  const deckY0 = baseTop - 0.3;
  const deckY1 = deckY0 + deckH; // 10
  b.add(extrude(chamferRect(deckW, deckH, 1.8, 0, new THREE.Shape(), 0, (deckY0 + deckY1) / 2), deckL, { bevel: 1.5 }), mats.anod, { pos: [0, 0, deckZ], wear: 0.55 });
  // hinge barrel across the front of the deck + its steel pin
  const hingeZ = deckZ - deckL / 2 - 0.5;
  b.add(cylX(3.4, deckW + 1, 24), mats.anod, { pos: [0, deckY0 + 3.4, hingeZ], wear: 0.4 });
  b.add(cylX(1.5, deckW + 4, 12), mats.steel, { pos: [0, deckY0 + 3.4, hingeZ] });
  // rear notch protector: two filleted ears at the back of the deck
  for (const x of [-6, 6]) b.add(rbox(3.4, 3.0, 5, 1.0), mats.anod, { pos: [x, deckY1 + 1.2, deckZ + deckL / 2 - 2.5], wear: 0.6 });

  // --- aperture drum, proud of the deck: knurled rim, cap, steel aperture ring, dark aperture
  const drumZ = deckZ + 5;
  const drumY = deckY1 + 1.8; // rim centre
  b.add(knurlY(7.0, 3.6, 32, 0.4), mats.anod, { pos: [0, drumY, drumZ] });
  b.add(cylY(5.8, 4.2, 32), mats.anod, { pos: [0, drumY + 0.3, drumZ] });
  b.add(torusZ(2.9, 0.9, 8, 28).rotateX(Math.PI / 2), mats.steel, { pos: [0, drumY + 2.4, drumZ] }); // aperture ring
  b.add(cylY(2.1, 0.5, 20), mats.matte, { pos: [0, drumY + 2.25, drumZ] }); // dark aperture hole
  // windage wheel (right) on its axle, index screw (left); hex sockets in both heads
  b.add(cylX(1.8, 10, 12), mats.steel, { pos: [8.5, drumY, drumZ] });
  b.add(knurlX(5.4, 4.0, 22, 0.55), mats.anod, { pos: [12.6, drumY, drumZ] });
  b.add(cylX(3.4, 1.0, 16), mats.steel, { pos: [15.1, drumY, drumZ] });
  b.add(cylX(1.5, 0.3, 6), mats.matte, { pos: [15.7, drumY, drumZ] });
  b.add(cylX(2.6, 1.8, 12), mats.steel, { pos: [-(deckW / 2 + 0.6), drumY, drumZ] });
  b.add(cylX(1.2, 0.3, 6), mats.matte, { pos: [-(deckW / 2 + 1.6), drumY, drumZ] });

  // --- legend plate: a raised, filleted plate on the left flank of the deck (the hip-visible side)
  const plateX = -(deckW / 2 + 0.3);
  const plateY = (deckY0 + 0.4 + deckY1 - 1.8) / 2;
  b.add(rbox(0.8, 3.2, 20, 0.3), mats.anod, { pos: [plateX, plateY, deckZ], wear: 0.6 });
  b.build(group);

  // etched labels: the logo on the legend plate, dim but legible (this flank is sunlit at the hip — mid-grey in
  // the atlas rendered at L ≈ 165; the reference logo sits at ≈ 70), the model mark on the right flank
  const labels = new PartsBuilder('RearSightLabels');
  labels.add(atlas.text(19, 3.0, 'CRONEN', { size: 2.3, color: '#34363a', letterSpacing: 0.3 }), atlas.material, { pos: [plateX - 0.4 - 0.12, plateY, deckZ], rot: [0, -Math.PI / 2, 0] });
  labels.add(atlas.text(14, 2.6, 'MK.3 REAR', { size: 1.4, color: '#4a4d52' }), atlas.material, { pos: [deckW / 2 + 0.12, plateY, deckZ], rot: [0, Math.PI / 2, 0] });
  labels.build(group, { castShadow: false });

  return { group, topY: RAIL.topY + (drumY + 2.9) * MM };
}
