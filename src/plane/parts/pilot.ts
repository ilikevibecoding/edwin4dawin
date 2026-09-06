import * as THREE from 'three';
import { Batch, strutGeometry, type Surf } from '../geometry';
import { SURF } from '../textures';
import { at, DEG, FLOOR, SEAT_Y, UP, V3, WRIST, YOKE_HUB, type BuildContext } from './context';

/** the pilot's skin: a medium tan, a touch less orange than the parts table's, with the soft sheen of skin */
export const SKIN: Surf = { color: 0xc49876, roughness: 0.62, metalness: 0.0 };

/**
 * The wrist joint of a hand on a yoke grip (hub space): the palm's heel lies on the grip's aft-outboard face, so the
 * joint sits 2 cm outboard of the grip's axis and a little below `WRIST`; the static forearm in the cabin kit and
 * the hand travelling with the yoke both end here.
 */
export const HAND_WRIST = (s: number): THREE.Vector3 => WRIST(s).add(new THREE.Vector3(0, -0.004, s * 0.020));

/**
 * Closed tube along a polyline with an elliptical section at every point (semi-axis `ra` along the frame normal,
 * `rb` along the binormal); the frames are carried along the path by parallel transport from an initial normal as
 * close to `up` as the first tangent allows. Flat caps unless `caps` is false. Fingers, palms, wrists and limbs.
 */
export function tubeAlong(pts: THREE.Vector3[], ra: number[], rb: number[] = ra, radial = 8, up: THREE.Vector3 = UP, caps = true): THREE.BufferGeometry {
  const n = pts.length;
  const T: THREE.Vector3[] = [], N: THREE.Vector3[] = [], B: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) T.push(pts[Math.min(i + 1, n - 1)].clone().sub(pts[Math.max(i - 1, 0)]).normalize());
  let nrm = up.clone().addScaledVector(T[0], -up.dot(T[0]));
  if (nrm.lengthSq() < 1e-8) nrm = new THREE.Vector3(1, 0, 0).addScaledVector(T[0], -T[0].x);
  nrm.normalize();
  for (let i = 0; i < n; i++) {
    if (i > 0) nrm = nrm.clone().addScaledVector(T[i], -nrm.dot(T[i])).normalize();
    N.push(nrm); B.push(new THREE.Vector3().crossVectors(T[i], nrm));
  }
  const pos: number[] = [], normal: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i < n; i++) for (let k = 0; k < radial; k++) {
    const phi = (k / radial) * Math.PI * 2, c = Math.cos(phi), s = Math.sin(phi);
    const p = pts[i].clone().addScaledVector(N[i], ra[i] * c).addScaledVector(B[i], rb[i] * s);
    const nn = N[i].clone().multiplyScalar(c / Math.max(ra[i], 1e-4)).addScaledVector(B[i], s / Math.max(rb[i], 1e-4)).normalize();
    pos.push(p.x, p.y, p.z); normal.push(nn.x, nn.y, nn.z); uv.push(k / radial, i / (n - 1));
  }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < radial; k++) {
    const a = i * radial + k, b = i * radial + (k + 1) % radial, c = a + radial, d = b + radial;
    idx.push(a, b, c, b, d, c);
  }
  if (caps) for (const [i, dir] of [[0, -1], [n - 1, 1]] as [number, number][]) {
    const ci = pos.length / 3;
    pos.push(pts[i].x, pts[i].y, pts[i].z); normal.push(T[i].x * dir, T[i].y * dir, T[i].z * dir); uv.push(0.5, i === 0 ? 0 : 1);
    for (let k = 0; k < radial; k++) {
      const a = i * radial + k, b = i * radial + (k + 1) % radial;
      if (dir < 0) idx.push(ci, b, a); else idx.push(ci, a, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/**
 * A hand in a hammer grip on a vertical grip of radius `gripR` whose axis is the local y axis, built in the grip
 * frame: x forward (the fingers wrap around the front), y up the grip (index finger at the top), z outboard (the
 * back of the hand). A mirrored frame (negative determinant) makes the other hand. `wrist` is the wrist joint in
 * the same frame (aft and a little outboard of the axis); the skin runs on past it into the sleeve's cuff. `watch`
 * straps a wristwatch on the back of the wrist.
 */
export function handGeometry(gripR: number, wrist: THREE.Vector3, watch = false): THREE.BufferGeometry {
  const b = new Batch(SKIN);
  const P = (theta: number, r: number, y: number) => new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta));
  // four fingers stacked along the grip, each curled around it on a circle just clear of the rubber: the knuckle
  // stands proud at the front-outboard, the tip comes round to the aft-inboard side almost to the thumb. Tapered
  // along their length with a joint bulge at each knuckle; the outer fingers curl a little less far.
  const fingers: [number, number, number][] = [[0.030, 0.0092, 1.0], [0.011, 0.0096, 1.06], [-0.008, 0.0090, 0.98], [-0.027, 0.0078, 0.80]];
  const th0 = 55 * DEG;
  for (const [y, r, len] of fingers) {
    const wrap = 190 * DEG * len, M = 12;
    const pts: THREE.Vector3[] = [], ra: number[] = [];
    for (let i = 0; i <= M; i++) {
      const t = i / M, rr = r * (1 - 0.26 * t);
      pts.push(P(th0 - wrap * t, gripR + 0.001 + rr, y - 0.004 * t));
      ra.push(rr);
    }
    b.add(tubeAlong(pts, ra, ra, 8, UP));
    b.add(new THREE.SphereGeometry(r * 1.12, 8, 6), at(pts[0]));
    b.add(new THREE.SphereGeometry(r * 0.99, 7, 5), at(pts[Math.round(M * 0.46)]));
    b.add(new THREE.SphereGeometry(r * 0.88, 7, 5), at(pts[Math.round(M * 0.76)]));
    b.add(new THREE.SphereGeometry(r * 0.75, 7, 5), at(pts[M]));
  }
  // the palm: a slab lying on the grip's outboard face, wider at the knuckles than at the wrist, thickest at the
  // heel; the thenar bulge (thumb base) wraps the grip's aft side at the top, the hypothenar heel at the bottom
  const palm: [number, number, number, number][] = [[-0.062, 0.026, 0.0135, 0.031], [-0.042, 0.030, 0.0145, 0.036], [-0.020, 0.031, 0.0135, 0.040], [0.002, 0.029, 0.0120, 0.042], [0.019, 0.025, 0.0105, 0.041]];
  const OUT = new THREE.Vector3(0, 0, 1);
  b.add(tubeAlong(palm.map(([x, z]) => new THREE.Vector3(x, 0.002, z)), palm.map((p) => p[2]), palm.map((p) => p[3]), 12, OUT));
  b.add(new THREE.SphereGeometry(1, 10, 8), at([-0.040, 0.026, 0.013], [0, 0.35, -0.25], [0.023, 0.018, 0.013]));
  b.add(new THREE.SphereGeometry(1, 10, 8), at([-0.052, -0.026, 0.024], [0, 0.2, 0.3], [0.020, 0.013, 0.015]));
  // the thumb: from the thenar up over the grip's aft face toward the inboard side, its tip resting on the top of
  // the grip just behind the switches
  const thumb = [new THREE.Vector3(-0.040, 0.030, 0.008), new THREE.Vector3(-0.034, 0.047, -0.003), new THREE.Vector3(-0.026, 0.059, -0.012), new THREE.Vector3(-0.017, 0.064, -0.017)];
  b.add(tubeAlong(thumb, [0.0125, 0.0108, 0.0098, 0.0085], undefined, 8, OUT));
  b.add(new THREE.SphereGeometry(0.0112, 8, 6), at(thumb[1]));
  b.add(new THREE.SphereGeometry(0.0098, 7, 5), at(thumb[2]));
  b.add(new THREE.SphereGeometry(0.0086, 7, 5), at(thumb[3]));
  // the wrist: from the heel of the palm back through the joint and on into the cuff (flatter than it is wide)
  const heel = new THREE.Vector3(-0.062, 0.002, 0.026);
  const fore = wrist.clone().sub(heel).normalize();
  const wristEnd = wrist.clone().addScaledVector(fore, 0.036);
  b.add(tubeAlong([heel, heel.clone().lerp(wrist, 0.5), wrist.clone(), wristEnd], [0.0135, 0.016, 0.019, 0.0205], [0.031, 0.029, 0.026, 0.026], 12, OUT));
  if (watch) {
    // strap around the wrist behind the joint, the case on the back of the wrist with a dark crystal
    const wc = wrist.clone().addScaledVector(fore, 0.010);
    const a = wc.clone().addScaledVector(fore, -0.005), c = wc.clone().addScaledVector(fore, 0.005);
    b.add(tubeAlong([a, c], [0.0225, 0.0225], [0.0295, 0.0295], 14, OUT), undefined, SURF.belt);
    const face = wc.clone().add(new THREE.Vector3(0, 0, 0.0225 + 0.003));
    b.add(new THREE.CylinderGeometry(0.0165, 0.0165, 0.0075, 14), at(face, [Math.PI / 2, 0, 0]), SURF.metal);
    b.add(new THREE.CylinderGeometry(0.0130, 0.0130, 0.002, 14), at(face.clone().add(new THREE.Vector3(0, 0, 0.0045)), [Math.PI / 2, 0, 0]), SURF.headset);
  }
  return b.build();
}

/**
 * The pilot in the left seat: torso, head with cap and headset, arms down to the cuffs (the hands travel with the
 * yoke, see cockpitControls) and legs to the pedals (all into `cabinKit`). `cockpitEye` is the model's eye point.
 */
export function buildPilot(ctx: BuildContext, cockpitEye: THREE.Vector3): void {
  const { cabinKit } = ctx;
  // pilot: torso, head with headset, arms from the shoulders to the yoke grips. The eyes (cockpitEye) sit at the
  // front of the head: with the cockpit camera's 5 cm near plane the head, headband and earcups must all be
  // behind the eye or they fill the frame from inside
  const headY = cockpitEye.y - 0.03, headX = cockpitEye.x - 0.10, PZ = -0.34;
  const shoulderY = SEAT_Y + 0.06 + 0.52;
  // torso in a navy shirt with rounded shoulders, an open collar showing the neck, the head a slightly tall
  // ovoid under a ball cap (crown + peak) with the headset band over the cap, ear cups and a boom mic to the mouth
  cabinKit.add(new THREE.BoxGeometry(0.26, 0.52, 0.40), at([headX - 0.02, SEAT_Y + 0.06 + 0.26, PZ]), SURF.shirt);
  for (const side of [-1, 1]) cabinKit.add(new THREE.SphereGeometry(0.065, 10, 8), at([headX - 0.02, shoulderY, PZ + side * 0.17]), SURF.shirt);
  cabinKit.add(new THREE.CylinderGeometry(0.048, 0.052, 0.10, 12), at([headX - 0.005, shoulderY + 0.03, PZ]), SKIN);
  for (const side of [-1, 1]) cabinKit.add(new THREE.BoxGeometry(0.09, 0.022, 0.07), at([headX + 0.02, shoulderY + 0.035, PZ + side * 0.06], [side * 0.55, 0, -0.35]), SURF.collar);
  const head = new THREE.SphereGeometry(0.105, 14, 12); head.scale(0.95, 1.12, 0.92);
  cabinKit.add(head, at([headX, headY, PZ]), SKIN);
  cabinKit.add(new THREE.SphereGeometry(0.108, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.44), at([headX + 0.005, headY + 0.012, PZ], [0, 0, -0.10]), SURF.cap);
  cabinKit.add(new THREE.BoxGeometry(0.075, 0.008, 0.11), at([headX + 0.115, headY + 0.055, PZ], [0, 0, -0.18]), SURF.cap);
  cabinKit.add(new THREE.TorusGeometry(0.118, 0.016, 6, 16, Math.PI), at([headX, headY + 0.035, PZ], [0, Math.PI / 2, 0]), SURF.headset);
  for (const side of [-1, 1]) cabinKit.add(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 10), at([headX, headY - 0.01, PZ + side * 0.115], [Math.PI / 2, 0, 0]), SURF.headset);
  { const micA = V3(headX + 0.01, headY - 0.03, PZ - 0.125), micB = V3(headX + 0.10, headY - 0.075, PZ - 0.05);
    cabinKit.add(strutGeometry(micA, micB, 0.004, 6), undefined, SURF.headset);
    cabinKit.add(new THREE.SphereGeometry(0.013, 8, 6), at(micB), SURF.headset); }
  // arms: upper arm from the shoulder down to an elbow by the hip, forearm in the sleeve forward to a cuff just
  // behind the hand (the wrists and hands travel with the yoke)
  for (const side of [-1, 1]) {
    const shoulder = V3(headX - 0.02, shoulderY, PZ + side * 0.19), elbow = V3(1.15, 0.50, PZ + side * 0.24);
    const wrist = HAND_WRIST(side).add(YOKE_HUB).add(V3(0, 0, PZ));
    const cuff = wrist.clone().lerp(elbow, 0.10);
    cabinKit.add(strutGeometry(shoulder, elbow, 0.045, 8), undefined, SURF.shirt);
    cabinKit.add(new THREE.SphereGeometry(0.046, 8, 6), at(elbow), SURF.shirt);
    cabinKit.add(strutGeometry(elbow, cuff, 0.040, 8), undefined, SURF.shirt);
    const cDir = wrist.clone().sub(elbow).normalize();
    cabinKit.add(new THREE.CylinderGeometry(0.043, 0.041, 0.025, 10), at(cuff, [0, 0, -Math.atan2(cDir.x, cDir.y)]), SURF.collar);
  }
  // legs to the pedals
  for (const side of [-1, 1]) {
    cabinKit.add(strutGeometry(V3(1.05, SEAT_Y + 0.10, -0.34 + side * 0.11), V3(1.45, SEAT_Y + 0.12, -0.34 + side * 0.12), 0.07, 8), undefined, SURF.plastic);
    cabinKit.add(strutGeometry(V3(1.45, SEAT_Y + 0.12, -0.34 + side * 0.12), V3(1.90, FLOOR + 0.06, -0.34 + side * 0.12), 0.055, 8), undefined, SURF.plastic);
  }
}
