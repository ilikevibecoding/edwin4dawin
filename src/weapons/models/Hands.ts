import * as THREE from 'three';
import { GunKit } from './GunKit';

/**
 * First-person gloved tactical hands.
 *
 * Each hand is built in a canonical palm-down frame: the wrist sits at the
 * origin, the forearm/sleeve runs +Z (back toward the camera) and the fingers
 * extend -Z (forward) and curl down -Y, so the hand naturally wraps something
 * lying under the palm. The ViewModel positions and rotates each hand onto a
 * weapon's grip anchors, and the animator can articulate the finger curl and
 * pull the support hand away during reloads.
 */

export interface Hand {
  group: THREE.Group;
  /** Knuckle roots so the animator can curl the fingers. */
  fingers: THREE.Object3D[];
  /** The trigger finger (index) root, curled onto the trigger. */
  triggerFinger: THREE.Object3D;
  /** Sleeve/forearm — collapsed by the animator in ADS so it doesn't loom. */
  forearm: THREE.Object3D;
}

// A tapered three-segment finger: a slight knuckle bulge at the base narrowing
// to the tip, so it reads as a gloved digit rather than a uniform sausage.
function buildFinger(kit: GunKit, length: number, thickness: number, curl: number): THREE.Object3D {
  const root = new THREE.Object3D();
  const seg = length / 3;
  const mat = kit.mat('glove');
  const bev = thickness * 0.32;

  // Proximal segment with a knuckle bulge.
  const s1 = kit.box(thickness * 1.06, thickness * 1.16, seg * 1.05, mat, bev);
  s1.position.z = -seg / 2;
  root.add(s1);
  // Knuckle crease (dark seam across the first joint).
  const crease = kit.box(thickness * 1.12, thickness * 0.04, thickness * 0.16, 'black', 0);
  crease.position.set(0, thickness * 0.55, -seg);
  root.add(crease);

  const j2 = new THREE.Object3D();
  j2.position.z = -seg;
  j2.rotation.x = curl * 0.95;
  const s2 = kit.box(thickness * 0.88, thickness * 0.95, seg, mat, bev);
  s2.position.z = -seg / 2;
  j2.add(s2);
  root.add(j2);

  const j3 = new THREE.Object3D();
  j3.position.z = -seg;
  j3.rotation.x = curl * 1.2;
  // Tapered tip.
  const s3 = kit.box(thickness * 0.68, thickness * 0.76, seg * 0.88, mat, bev * 0.8);
  s3.position.z = -seg * 0.44;
  j3.add(s3);
  j2.add(j3);

  root.rotation.x = curl * 0.6;
  return root;
}

export function buildHand(kit: GunKit, side: 1 | -1): Hand {
  const group = new THREE.Group();
  const glove = kit.mat('glove');

  // Sleeve / forearm with a cuff.
  const forearm = kit.tubeZ(0.03, 0.038, 0.15, glove, 16);
  forearm.scale.set(1, 0.82, 1);
  forearm.position.set(0, -0.006, 0.17);
  // tubeZ extends -Z; flip so it goes +Z (back toward camera).
  forearm.rotation.y = Math.PI;
  group.add(forearm);
  const cuff = kit.box(0.07, 0.058, 0.03, 'black', 0.01);
  cuff.position.set(0, -0.006, 0.05);
  group.add(cuff);
  // Wrist strap detail.
  const strap = kit.box(0.072, 0.012, 0.03, 'polymer_grey', 0.004);
  strap.position.set(0, 0.019, 0.055);
  group.add(strap);

  // Palm / back of hand (slightly slimmer than before).
  const palm = kit.box(0.058, 0.028, 0.086, glove, 0.012);
  palm.position.set(0, 0, -0.03);
  group.add(palm);
  // Knuckle pad.
  const knucklePad = kit.box(0.054, 0.011, 0.02, 'rubber', 0.004);
  knucklePad.position.set(0, 0.017, -0.064);
  group.add(knucklePad);
  // Back-of-hand stitching seams for fabric read.
  for (const sx of [-0.014, 0.014]) {
    const seam = kit.box(0.002, 0.004, 0.06, 'black', 0);
    seam.position.set(sx, 0.015, -0.03);
    group.add(seam);
  }

  // Four tapered fingers along the front edge (tight — reads as a grip).
  const fingers: THREE.Object3D[] = [];
  const lengths = [0.05, 0.056, 0.052, 0.044];
  for (let i = 0; i < 4; i++) {
    const f = buildFinger(kit, lengths[i], 0.0135, 0.7);
    const x = side * (-0.02 + i * 0.0132);
    f.position.set(x, -0.006, -0.068);
    group.add(f);
    fingers.push(f);
  }

  // Thumb on the inner side, wrapping across.
  const thumb = new THREE.Object3D();
  const t1 = kit.box(0.016, 0.016, 0.03, glove, 0.006);
  t1.position.z = -0.015;
  thumb.add(t1);
  const tj = new THREE.Object3D();
  tj.position.z = -0.03;
  tj.rotation.x = 0.6;
  const t2 = kit.box(0.014, 0.014, 0.026, glove, 0.005);
  t2.position.z = -0.013;
  tj.add(t2);
  thumb.add(tj);
  thumb.position.set(-side * 0.03, -0.006, -0.028);
  thumb.rotation.set(0.4, side * 0.9, 0);
  group.add(thumb);

  return { group, fingers, triggerFinger: fingers[0], forearm };
}
