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

/** the pilot's clothes and kit (finishes for the shared parts material) */
const HAIR: Surf = { color: 0x2a1d13, roughness: 0.75, metalness: 0.0 };
const LENS: Surf = { color: 0x0b0d12, roughness: 0.12, metalness: 0.55 };
const MOUTH: Surf = { color: 0x6b3a30, roughness: 0.7, metalness: 0.0 };
const TROUSERS: Surf = { color: 0x4d4a3f, roughness: 0.92, metalness: 0.0 };
const BOOT: Surf = { color: 0x2c2018, roughness: 0.55, metalness: 0.0 };
const CUP_BACK: Surf = { color: 0x35373b, roughness: 0.45, metalness: 0.2 };

/**
 * The pilot in the left seat (all into `cabinKit`): a head built from a cranium and a jaw with a nose, sunglasses,
 * hair under a ball cap and the headset (band, cups, boom mic, cable down to the sidewall jack); a torso in a
 * shirt with collar, placket buttons and a chest pocket, leaning a little forward off the seat back; arms with
 * elbows down to the cuffs (the hands travel with the yoke, see cockpitControls); legs to boots on the pedals.
 * `cockpitEye` is the model's eye point: the eyes sit at the front of the head, and with the cockpit camera's
 * 5 cm near plane everything of the head must stay behind the eye or out of the 62 deg frame, or it fills the
 * view from inside.
 */
export function buildPilot(ctx: BuildContext, cockpitEye: THREE.Vector3): void {
  const { cabinKit } = ctx;
  const XF = cockpitEye.x, YE = cockpitEye.y, PZ = -0.34;
  // ------------------------------------------------------------ head
  // cranium (an ellipsoid whose front is the brow, 1 cm ahead of the eye) over a narrower jaw ending in the chin
  const C = V3(XF - 0.085, YE + 0.02, PZ);
  const ball = (x: number, y: number, z: number, sx: number, sy: number, sz: number, surf: Surf, rot?: [number, number, number], segs = 16) =>
    cabinKit.add(new THREE.SphereGeometry(1, segs, Math.round(segs * 0.75)), at([x, y, z], rot, [sx, sy, sz]), surf);
  ball(C.x, C.y, C.z, 0.095, 0.095, 0.078, SKIN, undefined, 18);
  ball(XF - 0.090, YE - 0.050, PZ, 0.082, 0.070, 0.066, SKIN, undefined, 16);
  // nose: a short bridge off the face below the eye line ending in a rounded tip, drooping a little
  cabinKit.add(new THREE.ConeGeometry(0.012, 0.028, 8), at([XF + 0.002, YE - 0.034, PZ], [0, 0, -Math.PI / 2 - 0.35]), SKIN);
  cabinKit.add(new THREE.SphereGeometry(1, 8, 6), at([XF + 0.015, YE - 0.041, PZ], undefined, [0.010, 0.009, 0.012]), SKIN);
  // mouth: a thin dark line across the front of the jaw
  cabinKit.add(new THREE.BoxGeometry(0.004, 0.003, 0.030), at([XF - 0.013, YE - 0.078, PZ]), MOUTH);
  // neck: from the top of the shirt up and back into the jaw (the head sits a little behind the shoulder line)
  cabinKit.add(tubeAlong([V3(0.975, 0.685, PZ), V3(0.95, 0.765, PZ), V3(0.915, 0.845, PZ)], [0.054, 0.050, 0.046], undefined, 12), undefined, SKIN);
  // hair: the back and sides of the head below the cap's edge, down to the nape
  cabinKit.add(new THREE.SphereGeometry(1, 16, 8, -Math.PI / 2, Math.PI, Math.PI * 0.40, Math.PI * 0.24), at(C, undefined, [0.097, 0.097, 0.080]), HAIR);
  // ball cap: the crown fitted over the cranium, its edge just above the brow, a short peak dipping forward (kept
  // short and high so its tip stays outside the cockpit camera's frame)
  cabinKit.add(new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), at([C.x + 0.003, C.y + 0.003, C.z], undefined, [0.099, 0.099, 0.082]), SURF.cap);
  cabinKit.add(new THREE.BoxGeometry(0.045, 0.006, 0.105), at([XF + 0.036, YE + 0.048, PZ], [0, 0, -0.30]), SURF.cap);
  cabinKit.add(new THREE.SphereGeometry(0.007, 8, 6), at([C.x + 0.003, C.y + 0.101, C.z]), SURF.cap);
  // sunglasses: two large dark wrapped lenses on the eye line in a thin dark frame, a bridge over the nose, thin
  // arms back over the temples to the cups
  for (const side of [-1, 1]) {
    const yaw = -side * 0.32;
    cabinKit.add(new THREE.BoxGeometry(0.004, 0.032, 0.046), at([XF + 0.006, YE - 0.004, PZ + side * 0.033], [0, yaw, 0]), LENS);
    cabinKit.add(new THREE.BoxGeometry(0.002, 0.036, 0.050), at([XF + 0.003, YE - 0.004, PZ + side * 0.033], [0, yaw, 0]), SURF.darkMetal);
    cabinKit.add(strutGeometry(V3(XF - 0.004, YE + 0.008, PZ + side * 0.056), V3(XF - 0.085, YE + 0.012, PZ + side * 0.080), 0.0025, 6), undefined, SURF.darkMetal);
  }
  cabinKit.add(new THREE.BoxGeometry(0.004, 0.006, 0.018), at([XF + 0.007, YE + 0.002, PZ]), SURF.darkMetal);
  // headset: the band over the cap, cups over the ears with a domed back, the boom mic from the left cup to the
  // corner of the mouth (a foam windscreen on the end) and the cable from the left cup down past the shoulder to
  // the jack in the sidewall
  cabinKit.add(new THREE.TorusGeometry(0.110, 0.009, 6, 18, Math.PI), at([C.x, C.y, C.z], [0, Math.PI / 2, 0]), SURF.headset);
  for (const side of [-1, 1]) {
    const cup = V3(XF - 0.085, YE - 0.005, PZ + side * 0.099);
    cabinKit.add(new THREE.CylinderGeometry(0.042, 0.042, 0.030, 14), at(cup, [Math.PI / 2, 0, 0]), SURF.headset);
    cabinKit.add(new THREE.CylinderGeometry(0.030, 0.034, 0.008, 14), at(cup.clone().add(V3(0, 0, side * 0.018)), [Math.PI / 2, 0, 0]), CUP_BACK);
    cabinKit.add(new THREE.BoxGeometry(0.014, 0.05, 0.010), at(cup.clone().add(V3(0, 0.035, side * 0.008))), SURF.headset);
  }
  const boom = [V3(XF - 0.062, YE - 0.018, PZ - 0.108), V3(XF - 0.030, YE - 0.052, PZ - 0.098), V3(XF - 0.005, YE - 0.074, PZ - 0.070), V3(XF + 0.008, YE - 0.080, PZ - 0.046)];
  cabinKit.add(tubeAlong(boom, [0.0035, 0.0035, 0.0032, 0.0032], undefined, 6), undefined, SURF.headset);
  cabinKit.add(new THREE.SphereGeometry(0.013, 10, 7), at(boom[3], undefined, [1.15, 1, 1]), SURF.headset);
  const cable = new THREE.CatmullRomCurve3([V3(XF - 0.085, YE - 0.046, PZ - 0.104), V3(XF - 0.105, YE - 0.16, PZ - 0.14), V3(XF - 0.10, 0.50, PZ - 0.215), V3(XF - 0.03, 0.33, PZ - 0.225), V3(XF + 0.22, 0.30, PZ - 0.23), V3(1.36, 0.31, -0.56)]).getPoints(14);
  cabinKit.add(tubeAlong(cable, cable.map(() => 0.0035), undefined, 6), undefined, SURF.headset);
  // ------------------------------------------------------------ torso
  // a shirt torso lofted from the hips to the shoulder line, deepest at the chest and leaning a little forward
  // off the seat back toward the yoke; round shoulders, an open collar, buttons down the placket, a chest pocket
  // (seated: cushion top 0.14, acromion ~0.60 over it -> the shoulder line at 0.715, the eye 0.79 over the cushion)
  const spine: [number, number, number, number][] = [[0.95, 0.15, 0.120, 0.170], [0.965, 0.32, 0.120, 0.165], [0.985, 0.50, 0.115, 0.185], [0.99, 0.62, 0.110, 0.195], [0.985, 0.705, 0.100, 0.200]];
  cabinKit.add(tubeAlong(spine.map(([x, y]) => V3(x, y, PZ)), spine.map((p) => p[2]), spine.map((p) => p[3]), 18, V3(1, 0, 0)), undefined, SURF.shirt);
  const frontAt = (y: number): [number, number, number] => {
    for (let i = 0; i < spine.length - 1; i++) {
      const [x0, y0, a0, b0] = spine[i], [x1, y1, a1, b1] = spine[i + 1];
      if (y <= y1 || i === spine.length - 2) { const t = THREE.MathUtils.clamp((y - y0) / (y1 - y0), 0, 1); return [x0 + (x1 - x0) * t, a0 + (a1 - a0) * t, b0 + (b1 - b0) * t]; }
    }
    return [spine[0][0], spine[0][2], spine[0][3]];
  };
  const SHOULDER_Y = 0.715, SHOULDER_X = 0.985;
  for (const side of [-1, 1]) cabinKit.add(new THREE.SphereGeometry(0.066, 12, 9), at([SHOULDER_X, SHOULDER_Y, PZ + side * 0.175]), SURF.shirt);
  for (const side of [-1, 1]) cabinKit.add(new THREE.BoxGeometry(0.085, 0.020, 0.075), at([SHOULDER_X + 0.025, 0.75, PZ + side * 0.062], [side * 0.55, 0, -0.35]), SURF.collar);
  for (const y of [0.26, 0.35, 0.44, 0.53, 0.62, 0.69]) { const [x, a] = frontAt(y); cabinKit.add(new THREE.SphereGeometry(0.0055, 8, 6), at([x + a - 0.002, y, PZ]), SURF.lightPlastic); }
  { const [x, a, bz] = frontAt(0.56), dz = -0.095, t = Math.asin(dz / bz);
    const px = x + a * Math.cos(t), pz = PZ + dz, yaw = Math.atan2(-a * Math.sin(t) / bz, Math.cos(t));
    cabinKit.add(new THREE.BoxGeometry(0.006, 0.115, 0.105), at([px + 0.002, 0.56, pz], [0, yaw, 0]), SURF.shirt);
    cabinKit.add(new THREE.BoxGeometry(0.007, 0.030, 0.108), at([px + 0.004, 0.615, pz], [0, yaw, 0]), SURF.shirt);
    cabinKit.add(new THREE.SphereGeometry(0.005, 8, 6), at([px + 0.008, 0.602, pz]), SURF.lightPlastic); }
  // ------------------------------------------------------------ arms
  // upper arm (~36 cm) from the shoulder forward and down to the elbow, forearm (~26 cm) in the sleeve on to a
  // cuff just behind the hand (the wrists and hands travel with the yoke); the elbows show as joints
  for (const side of [-1, 1]) {
    const shoulder = V3(SHOULDER_X, SHOULDER_Y, PZ + side * 0.19), elbow = V3(1.29, 0.535, PZ + side * 0.245);
    const wrist = HAND_WRIST(side).add(YOKE_HUB).add(V3(0, 0, PZ));
    const cuff = wrist.clone().lerp(elbow, 0.11);
    cabinKit.add(tubeAlong([shoulder, shoulder.clone().lerp(elbow, 0.5), elbow], [0.050, 0.047, 0.043], undefined, 10), undefined, SURF.shirt);
    cabinKit.add(new THREE.SphereGeometry(0.046, 10, 7), at(elbow), SURF.shirt);
    cabinKit.add(tubeAlong([elbow, elbow.clone().lerp(cuff, 0.5), cuff], [0.043, 0.040, 0.037], undefined, 10), undefined, SURF.shirt);
    const cDir = wrist.clone().sub(elbow).normalize();
    cabinKit.add(new THREE.CylinderGeometry(0.040, 0.038, 0.026, 12), at(cuff, [0, 0, -Math.atan2(cDir.x, cDir.y)]), SURF.collar);
  }
  // ------------------------------------------------------------ legs
  // thighs along the cushion to the knees, shins down to boots whose toes rest on the pedals, heels on the floor
  for (const side of [-1, 1]) {
    const z = PZ + side * 0.115;
    const hip = V3(1.0, SEAT_Y + 0.13, z - side * 0.01), knee = V3(1.43, SEAT_Y + 0.15, z), ankle = V3(1.77, FLOOR + 0.085, z);
    cabinKit.add(tubeAlong([hip, hip.clone().lerp(knee, 0.5), knee], [0.080, 0.074, 0.062], [0.072, 0.070, 0.060], 10, UP), undefined, TROUSERS);
    cabinKit.add(new THREE.SphereGeometry(0.064, 10, 7), at(knee), TROUSERS);
    cabinKit.add(tubeAlong([knee, knee.clone().lerp(ankle, 0.5), ankle], [0.058, 0.052, 0.044], undefined, 10, UP), undefined, TROUSERS);
    cabinKit.add(new THREE.BoxGeometry(0.27, 0.085, 0.10), at([1.845, FLOOR + 0.095, z], [0, 0, 0.55]), BOOT);
  }
}
