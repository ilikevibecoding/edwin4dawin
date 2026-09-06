import * as THREE from 'three';
import { strutGeometry } from '../geometry';
import { SURF } from '../textures';
import { at, FLOOR, SEAT_Y, V3, WRIST, YOKE_HUB, type BuildContext } from './context';

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
  cabinKit.add(new THREE.CylinderGeometry(0.048, 0.052, 0.10, 12), at([headX - 0.005, shoulderY + 0.03, PZ]), SURF.skin);
  for (const side of [-1, 1]) cabinKit.add(new THREE.BoxGeometry(0.09, 0.022, 0.07), at([headX + 0.02, shoulderY + 0.035, PZ + side * 0.06], [side * 0.55, 0, -0.35]), SURF.collar);
  const head = new THREE.SphereGeometry(0.105, 14, 12); head.scale(0.95, 1.12, 0.92);
  cabinKit.add(head, at([headX, headY, PZ]), SURF.skin);
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
    const wrist = WRIST(side).add(YOKE_HUB).add(V3(0, 0, PZ));
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
