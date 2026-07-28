/**
 * Headless rig probe.
 *
 * Builds one soldier, drives the animator directly and reports where the pose
 * actually put things: the weapon, the hands, the feet, the crown. Runs in Node
 * in about a second, which makes it the right tool for anything that can be
 * expressed as a number — a rifle pointing at the sky, a hand that cannot reach
 * its grip, a model that is not 1.8 m tall — and leaves the browser captures for
 * the things that can only be judged by looking.
 *
 * Build and run:
 *   npx vite build --ssr src/ai/dev/modelprobe.ts --outDir dist-probe
 *   node dist-probe/modelprobe.js
 */
import * as THREE from 'three';
import { Animator } from '../model/Animator';
import { SoldierFactory } from '../model/Factory';
import { B, BIND, RIG_CROWN } from '../model/Rig';
import { VARIANTS } from '../model/Variants';

// The other modules keep their Node tooling in .mjs, which tsc never sees. This
// one has to be .ts because it imports the rig, so it is inside the typecheck
// and needs the one Node global it uses without pulling in @types/node.
declare const process: { argv: string[] };

const factory = new SoldierFactory();
factory.attach(null);
factory.prebuild();

const feet = new THREE.Vector3(0, 0, 0);
const v = new THREE.Vector3();
const at = (o: THREE.Object3D): string => {
  v.setFromMatrixPosition(o.matrixWorld);
  return `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`;
};

/** Runs the animator to a steady state, the way a held pose reaches one. */
function settle(animator: Animator, frames = 120): void {
  for (let i = 0; i < frames; i++) animator.update(1 / 60, feet, 0, null);
}

interface Case {
  name: string;
  weaponUp: number;
  crouch: number;
  aim: THREE.Vector3;
  reload?: number;
  velocity?: THREE.Vector3;
}

const CASES: Case[] = [
  { name: 'low ready', weaponUp: 0.12, crouch: 0, aim: new THREE.Vector3(0, 1.5, -14) },
  { name: 'shouldered', weaponUp: 1, crouch: 0, aim: new THREE.Vector3(0, 1.5, -14) },
  { name: 'shouldered crouch', weaponUp: 1, crouch: 1, aim: new THREE.Vector3(0, 1.5, -14) },
  { name: 'shouldered high', weaponUp: 1, crouch: 0, aim: new THREE.Vector3(0, 4.5, -14) },
  { name: 'reloading', weaponUp: 0.6, crouch: 0, aim: new THREE.Vector3(0, 1.5, -14), reload: 0.5 },
  {
    name: 'walking',
    weaponUp: 1,
    crouch: 0,
    aim: new THREE.Vector3(0, 1.5, -14),
    velocity: new THREE.Vector3(0, 0, -2.2),
  },
];

const fresh = process.argv.includes('--fresh');
let soldier = factory.create(0, 'rifle');
let animator = new Animator(soldier, 1234);
animator.reset(feet, 0);

for (const c of CASES) {
  if (fresh) {
    soldier = factory.create(0, 'rifle');
    animator = new Animator(soldier, 1234);
    animator.reset(feet, 0);
  }
  animator.weaponUp = c.weaponUp;
  animator.crouch = c.crouch;
  animator.reloadProgress = c.reload ?? -1;
  animator.velocity.copy(c.velocity ?? new THREE.Vector3());
  animator.aimPoint.copy(c.aim);
  settle(animator);

  const holder = soldier.weaponHolder;
  const dir = new THREE.Vector3();
  animator.getAimDir(dir);
  const pitch = (Math.atan2(dir.y, Math.hypot(dir.x, dir.z)) * 180) / Math.PI;
  const bones = soldier.bones;
  const handR = new THREE.Vector3().setFromMatrixPosition(bones[B.handR].matrixWorld);
  const handL = new THREE.Vector3().setFromMatrixPosition(bones[B.handL].matrixWorld);

  // Where the weapon's own grips ended up, so a hand that is not on the weapon
  // shows up as a distance rather than as something to notice in a screenshot.
  const basis = new THREE.Matrix4().multiplyMatrices(soldier.root.matrixWorld, holder.matrix);
  const gripR = soldier.prop.gripRear.clone().applyMatrix4(basis);
  const gripL = soldier.prop.gripFront.clone().applyMatrix4(basis);
  const muzzle = soldier.prop.muzzle.clone().applyMatrix4(basis);

  console.log(
    `${c.name.padEnd(18)} gunPitch=${pitch.toFixed(1)}deg ` +
      `holderY=${holder.position.y.toFixed(2)} muzzleY=${muzzle.y.toFixed(2)} ` +
      `handR=(${handR.x.toFixed(2)},${handR.y.toFixed(2)},${handR.z.toFixed(2)}) ` +
      `offGripR=${handR.distanceTo(gripR).toFixed(3)} ` +
      `handL=(${handL.x.toFixed(2)},${handL.y.toFixed(2)},${handL.z.toFixed(2)}) ` +
      `offGripL=${handL.distanceTo(gripL).toFixed(3)} ` +
      `head=${at(bones[B.head])}`,
  );
}

// Standing bind measurements, which is what the hitbox and the ragdoll assume.
animator.weaponUp = 1;
animator.crouch = 0;
animator.reloadProgress = -1;
animator.velocity.set(0, 0, 0);
animator.aimPoint.set(0, 1.5, -14);
settle(animator);
const box = new THREE.Box3();
soldier.root.updateMatrixWorld(true);
const skin = soldier.mesh;
const position = skin.geometry.getAttribute('position');
const point = new THREE.Vector3();
for (let i = 0; i < position.count; i++) {
  skin.getVertexPosition(i, point);
  point.applyMatrix4(skin.matrixWorld);
  box.expandByPoint(point);
}
const size = new THREE.Vector3();
box.getSize(size);
console.log(
  `\nskinned bounds min=(${box.min.x.toFixed(2)},${box.min.y.toFixed(2)},${box.min.z.toFixed(2)}) ` +
    `size=(${size.x.toFixed(2)},${size.y.toFixed(2)},${size.z.toFixed(2)})`,
);

for (let variantIndex = 0; variantIndex < VARIANTS.length; variantIndex++) {
  const one = factory.create(variantIndex, 'rifle');
  console.log(
    `variant ${variantIndex} ${VARIANTS[variantIndex].name.padEnd(10)} ` +
      `lod0=${one.triangles} lod1=${one.lodTriangles}`,
  );
}
console.log(`factory ${JSON.stringify(factory.stats)}`);

/**
 * Joint dump.
 *
 * The capture is 1280x720 and a soldier at four metres is a couple of hundred
 * pixels tall, which is enough to see that a stance looks wrong and nowhere near
 * enough to say by how much. These are the spans a human body has known values
 * for, so a splayed stance or an arm hanging off the weapon shows up as a number
 * that is simply not anatomical.
 */
if (process.argv.includes('--joints')) {
  const world = (index: number, out: THREE.Vector3): THREE.Vector3 =>
    out.setFromMatrixPosition(soldier.bones[index].matrixWorld);
  const a = new THREE.Vector3();
  const c = new THREE.Vector3();
  const feetOut = new THREE.Vector3();
  const span = (i: number, j: number): number => world(i, a).distanceTo(world(j, c));
  const POSES: Array<{ name: string; weaponUp: number; crouch: number; speed: number }> = [
    { name: 'stand shouldered', weaponUp: 1, crouch: 0, speed: 0 },
    { name: 'stand low ready', weaponUp: 0.12, crouch: 0, speed: 0 },
    { name: 'crouch shouldered', weaponUp: 1, crouch: 1, speed: 0 },
    { name: 'walk 2.2', weaponUp: 1, crouch: 0, speed: 2.2 },
    { name: 'combat walk 3.1', weaponUp: 1, crouch: 0, speed: 3.1 },
    { name: 'run 5.3', weaponUp: 1, crouch: 0, speed: 5.3 },
    { name: 'sprint 6.4', weaponUp: 0.2, crouch: 0, speed: 6.4 },
    { name: 'crouch walk 1.35', weaponUp: 1, crouch: 1, speed: 1.35 },
  ];
  console.log('\njoint spans (metres)');
  for (const p of POSES) {
    const s3 = factory.create(0, 'rifle');
    const a3 = new Animator(s3, 1234);
    // The body has to travel, not just claim a velocity. Holding it still while
    // the animator believes it is walking leaves every planted foot half a metre
    // in front of a pelvis that never catches up, and the reach clamp then reads
    // as a permanent crouch that the running game never actually shows.
    const walker = feet.clone();
    a3.reset(walker, 0);
    a3.weaponUp = p.weaponUp;
    a3.crouch = p.crouch;
    a3.reloadProgress = -1;
    a3.velocity.set(0, 0, -p.speed);
    let lowest = Infinity;
    let highest = -Infinity;
    for (let i = 0; i < 240; i++) {
      walker.addScaledVector(a3.velocity, 1 / 60);
      a3.aimPoint.set(walker.x, walker.y + 1.5, walker.z - 14);
      a3.update(1 / 60, walker, 0, null);
      // Sample the pelvis over the last two gait cycles only, once the step
      // machine has settled into its rhythm.
      if (i > 160) {
        const y = s3.bones[B.hips].matrixWorld.elements[13] - walker.y;
        lowest = Math.min(lowest, y);
        highest = Math.max(highest, y);
      }
    }
    feetOut.copy(walker);
    soldier = s3;
    const ankleGap = Math.abs(world(B.footL, a).x - world(B.footR, c).x);
    const kneeGap = Math.abs(world(B.legL, a).x - world(B.legR, c).x);
    const bob = highest - lowest;
    const shoulders = span(B.armL, B.armR);
    const head = world(B.head, a).y - feetOut.y;
    const hips = world(B.hips, a).y - feetOut.y;
    // Crown, i.e. what the player sees the top of. The head bone is the base of
    // the skull; RIG_CROWN is where the bind pose puts the top of it.
    const crown = head + (RIG_CROWN - BIND[B.head][1]);
    // How far each hand sits from its own shoulder joint, against a 0.49 m arm.
    // Near 0.49 is an arm locked straight, near 0.2 is a hand in the armpit.
    const reachL = span(B.armL, B.handL);
    const reachR = span(B.armR, B.handR);
    console.log(
      `  ${p.name.padEnd(18)} ankleGap=${ankleGap.toFixed(2)} kneeGap=${kneeGap.toFixed(2)} ` +
        `shoulders=${shoulders.toFixed(2)} hipY=${hips.toFixed(2)} bob=${bob.toFixed(3)} ` +
        `crown=${crown.toFixed(2)} reachL=${reachL.toFixed(2)} reachR=${reachR.toFixed(2)}`,
    );
  }
}

/**
 * Stability sweep.
 *
 * The arm solver writes bone quaternions and reads them back through
 * `matrixWorld` on the next frame, so any magnitude error it leaves behind is
 * fed straight back in. A held pose settles on a fixed point and hides it; a
 * pose that keeps moving does not. This runs each state long enough for that to
 * show and reports the frame the chain leaves the unit sphere.
 */
if (process.argv.includes('--stability')) {
  const STATES: Array<{ name: string; weaponUp: number; crouch: number; speed: number; aimY: number }> = [
    { name: 'idle shouldered', weaponUp: 1, crouch: 0, speed: 0, aimY: 1.5 },
    { name: 'idle low ready', weaponUp: 0.12, crouch: 0, speed: 0, aimY: 1.5 },
    { name: 'walk shouldered', weaponUp: 1, crouch: 0, speed: 2.2, aimY: 1.5 },
    { name: 'walk low ready', weaponUp: 0.15, crouch: 0, speed: 2.2, aimY: 1.5 },
    { name: 'run shouldered', weaponUp: 1, crouch: 0, speed: 5.3, aimY: 1.5 },
    { name: 'crouch walk', weaponUp: 1, crouch: 1, speed: 1.35, aimY: 1.5 },
    { name: 'walk aim high', weaponUp: 1, crouch: 0, speed: 2.2, aimY: 4 },
    { name: 'walk aim low', weaponUp: 1, crouch: 0, speed: 2.2, aimY: 0.3 },
  ];
  const drift = (q: THREE.Quaternion): number => Math.abs(q.length() - 1);
  for (const state of STATES) {
    const s2 = factory.create(0, 'rifle');
    const a2 = new Animator(s2, 1234);
    a2.reset(feet, 0);
    a2.weaponUp = state.weaponUp;
    a2.crouch = state.crouch;
    a2.reloadProgress = -1;
    a2.velocity.set(0, 0, -state.speed);
    a2.aimPoint.set(0, state.aimY, -14);
    const b = s2.bones;
    const hand = new THREE.Vector3();
    let broke = -1;
    let worst = 0;
    for (let i = 0; i < 900; i++) {
      a2.update(1 / 60, feet, 0, null);
      const d = Math.max(drift(b[B.armL].quaternion), drift(b[B.armR].quaternion));
      worst = Math.max(worst, d);
      if (broke < 0 && d > 1e-3) broke = i;
      if (d > 1e3) break;
    }
    hand.setFromMatrixPosition(b[B.handL].matrixWorld);
    console.log(
      `  ${state.name.padEnd(18)} diverges=${broke < 0 ? 'no' : `frame ${broke}`} ` +
        `worstDrift=${worst.toExponential(2)} handL=${hand.length().toExponential(2)}`,
    );
  }
}
