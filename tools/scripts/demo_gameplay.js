// Scripted gameplay for `node tools/shot.mjs --record ... --script tools/scripts/demo_gameplay.js --enemies`.
// Runs inside the page as async (game, THREE, debug, input) => { ... } while the recorder steps the fixed 60 Hz sim.
// Sequence (≈24 s): sprint into the plaza → ADS firefight with three soldiers → reload → precision air strike
// on a second squad (targeting map, jets, impacts) → survey the aftermath.

const P = game.player;
const W = game.weapons;
const E = game.enemies;
const K = game.killstreaks;
const v = new THREE.Vector3();

debug.setHud(true);
W.debugAim = null;

const frames = async (n, fn) => {
  for (let i = 0; i < n; i++) {
    fn?.(i);
    await debug.waitFrames(1);
  }
};
const nearest = () => {
  let best = null;
  let bd = Infinity;
  for (const e of E.list) {
    if (!e.alive) continue;
    const d = e.position.distanceTo(P.position);
    if (d < bd) {
      bd = d;
      best = e;
    }
  }
  return best;
};
/** Exponential approach of the view toward a world point; returns the remaining angular error (rad). */
const steerTo = (x, y, z, k) => {
  v.set(x, y, z).sub(P.eyePosition);
  const yaw = Math.atan2(-v.x, -v.z);
  const pitch = Math.atan2(v.y, Math.hypot(v.x, v.z));
  let dy = yaw - P.yaw;
  dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  const dp = pitch - P.pitch;
  P.yaw += dy * k;
  P.pitch += dp * k;
  return Math.hypot(dy, dp);
};
const aimAt = (e, k = 0.16, yOff = 1.3) => steerTo(e.position.x, e.position.y + yOff, e.position.z, k);
const spawnAt = (x, z) => E.spawn({ position: new THREE.Vector3(x, 0, z) }); // default yaw faces the player

// --- 0.0 s: first squad steps out in front of the north row (≈30 m), player sprints toward the plaza rose.
spawnAt(-6, -12);
spawnAt(2.5, -14);
spawnAt(10, -11);
input.press('forward');
input.press('sprint');
await frames(60, (i) => input.look(Math.sin(i / 60 * Math.PI) * 2.2, Math.cos(i / 30) * 0.6));
input.press('left');
await frames(45, () => input.look(-1.6, 0.3));
input.release('left');
await frames(40, () => input.look(0.8, -0.4));
input.release('sprint');
await frames(10);
input.release('forward');

// --- ≈2.6 s: ADS and work through the squad with short bursts.
input.press('aim');
let bursts = 0;
for (let n = 0; n < 4 && bursts < 9; n++) {
  const target = nearest();
  if (!target) break;
  await frames(18, () => aimAt(target, 0.2));
  while (target.alive && bursts < 9) {
    await frames(4, () => aimAt(target, 0.35));
    input.press('fire');
    await frames(W.current.ammo > 0 ? 11 : 1, () => aimAt(target, 0.4));
    input.release('fire');
    bursts++;
    await frames(7, () => aimAt(target, 0.3));
  }
}
input.release('aim');

// --- ≈8 s: reload, then a second squad pushes out of the NE street mouth (≈37 m, down the street).
await frames(15, () => input.look(1.4, 0.8));
input.press('reload');
await frames(2);
input.release('reload');
// The second squad walks out of the street mouth toward the plaza (scripted so it stays on the strike line).
const patrol = (x, z) => E.spawn({ position: new THREE.Vector3(x, 0, z) }, { scripted: { move: new THREE.Vector3(10, 0, -20), speed: 1.2, aim: P.position } });
const strikeTargets = [patrol(13, -31), patrol(16.5, -35), patrol(12.5, -38), patrol(17, -28)];
await frames(100, (i) => steerTo(14.5, 1.6, -32, 0.05 + i / 2500));

// --- ≈10 s: call the precision air strike — open the targeting map, hold on it, confirm on the squad.
K.airstrike.available = true;
K.airstrike.state = 'idle';
K.airstrike.beginTargeting();
await frames(85);
let cx = 0;
let cz = 0;
let alive = 0;
for (const e of strikeTargets) {
  if (!e.alive) continue;
  cx += e.position.x;
  cz += e.position.z;
  alive++;
}
if (alive) {
  cx /= alive;
  cz /= alive;
} else {
  cx = 14.5;
  cz = -32;
}
K.airstrike.callAt(cx, cz);

// --- jets inbound (≈4.4 s to impact): look up the strike line, then settle on the target as the bombs walk in.
await frames(50, () => steerTo(cx, 34, cz - 100, 0.05));
await frames(70, () => steerTo(cx, 14, cz - 45, 0.06));
await frames(90, () => steerTo(cx, 3, cz, 0.08));
await frames(90, () => steerTo(cx - 3, 4, cz + 4, 0.03));

// --- aftermath: pan back across the plaza through the hanging dust.
await frames(150, (i) => input.look(-2.4 + i / 100, -0.12));
