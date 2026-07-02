import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Input } from './input.js';
import { buildHouse } from './house.js';
import { buildOutside } from './world.js';
import { PhysicsWorld } from './physics.js';
import { spawnProps } from './props.js';
import { Robot } from './robot.js';
import { Sfx } from './audio.js';

const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfe0f2);
scene.fog = new THREE.Fog(0xd8ecf7, 45, 100);

// image-based fill light so materials get soft reflections/sheen
{
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.4;
  pmrem.dispose();
}

const camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.05, 160);

// ---------- world ----------
const house = buildHouse(scene);
const outside = buildOutside(scene);
const physics = new PhysicsWorld(house.colliders);
const sfx = new Sfx();
physics.onImpact = (prop, speed) => sfx.impact(speed);

const totalProps = spawnProps(scene, physics);
physics.warmUp(); // settle initial scatter before first frame

// ---------- HUD ----------
const el = {
  held: document.getElementById('held'),
  score: document.getElementById('score'),
  fps: document.getElementById('fps'),
  toast: document.getElementById('toast'),
  splash: document.getElementById('splash'),
};
let binnedCount = 0;
el.score.textContent = `0 / ${totalProps}`;

let toastTimer = 0;
function toast(msg, ms = 1600) {
  el.toast.textContent = msg;
  el.toast.style.opacity = 1;
  toastTimer = ms / 1000;
}

// ---------- robot ----------
const robot = new Robot(scene, physics, house.colliders, {
  onGripClose: () => sfx.gripClose(),
  onGripOpen: () => sfx.gripOpen(),
  onGrab: (prop) => {
    sfx.grabOk();
    el.held.textContent = prop.name;
    toast(`GRIP LOCKED — ${prop.name}`);
  },
  onGrabFail: () => {
    sfx.grabFail();
    toast('GRIP CLOSED ON NOTHING');
  },
  onRelease: (prop) => {
    sfx.drop();
    el.held.textContent = '— EMPTY —';
    if (!heldByEither()) el.held.textContent = '— EMPTY —';
    prop.justReleased = 0.2;
  },
  onServo: (moving) => sfx.servo(moving),
});
robot.attachCamera(camera);

function heldByEither() {
  return robot.arms.R.holding || robot.arms.L.holding;
}

// ---------- input ----------
const input = new Input(canvas);
document.getElementById('splash').addEventListener('click', () => {
  sfx.resume();
  input.requestLock();
});
canvas.addEventListener('click', () => {
  sfx.resume();
  input.requestLock();
});
input.onLockChange = (locked) => {
  el.splash.style.display = locked ? 'none' : 'flex';
};
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- container scoring (kitchen bin + bedroom laundry basket) ----------
function insideBin(pos, b) {
  return pos.x > b.min.x && pos.x < b.max.x &&
    pos.z > b.min.z && pos.z < b.max.z && pos.y < b.max.y;
}

function checkBinned() {
  for (const p of physics.props) {
    if (p.held) continue;
    const pos = p.obj.position;
    let holder = null;
    for (const bin of house.bins) {
      if (insideBin(pos, bin.inner)) { holder = bin; break; }
    }
    if (!p.binned && holder && p.vel.lengthSq() < 1.2) {
      p.binned = true;
      binnedCount++;
      el.score.textContent = `${binnedCount} / ${totalProps}`;
      sfx.binned();
      toast(`${p.name} IN THE ${holder.name} — NICE`, 1900);
      if (binnedCount === totalProps) toast('HOUSE CLEAN. GOOD ROBOT.', 6000);
    } else if (p.binned && !holder) {
      p.binned = false;
      binnedCount--;
      el.score.textContent = `${binnedCount} / ${totalProps}`;
    }
  }
}

// ---------- test hooks (used by the Playwright eval) ----------
window.__game = {
  robot, physics, camera, scene, renderer, outside, house,
  key(code, down = true) {
    const ev = new KeyboardEvent(down ? 'keydown' : 'keyup', { code });
    window.dispatchEvent(ev);
  },
  look(dx, dy) { robot.addLook(dx, dy); },
  stats() {
    return {
      pos: robot.root.position.toArray(),
      yaw: robot.yaw,
      arm: {
        theta: robot.arms.R.theta,
        reach: robot.arms.R.reach,
        height: robot.arms.R.height,
        holding: robot.arms.R.holding ? robot.arms.R.holding.name : null,
        gripT: robot.arms.R.gripT,
      },
      props: physics.props.map((p) => ({
        name: p.name, room: p.room,
        pos: p.obj.position.toArray().map((v) => +v.toFixed(3)),
        sleeping: p.sleeping, held: p.held, binned: p.binned,
      })),
      binned: binnedCount,
      fps: fpsNow,
      simMs: +simMsAvg.toFixed(3),
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
    };
  },
  teleport(x, z, yaw) {
    robot.root.position.set(x, 0, z);
    robot.yaw = yaw;
    robot.prevPos.set(x, 0, z);
  },
  setHead(yaw, pitch) {
    robot.headYaw = yaw;
    robot.headPitch = pitch;
  },
  setArm(theta, reach, height) {
    const a = robot.arms.R;
    a.theta = theta; a.reach = reach; a.height = height;
  },
  step(frames = 1, dt = 1 / 60) {
    for (let i = 0; i < frames; i++) tick(dt, true);
  },
};

// ---------- main loop ----------
const clock = new THREE.Clock();
let fpsNow = 0;
let fpsAccum = 0;
let fpsFrames = 0;
let simMsAvg = 0; // JS cost per frame (sim only, excludes GPU)

function readCommands() {
  const shift = input.down('ShiftLeft') || input.down('ShiftRight');
  const armCmd = {
    dTheta: (input.down('ArrowLeft') ? -1.4 : 0) + (input.down('ArrowRight') ? 1.4 : 0),
    dReach: (input.down('KeyQ') ? 0.5 : 0) + (input.down('KeyE') ? -0.5 : 0),
    dHeight: (input.down('ArrowUp') ? 0.75 : 0) + (input.down('ArrowDown') ? -0.75 : 0),
    toggle: input.takePressed('Space'),
  };
  const idle = { dTheta: 0, dReach: 0, dHeight: 0, toggle: false };
  return {
    fwd: (input.down('KeyW') ? 1 : 0) + (input.down('KeyS') ? -1 : 0),
    turn: (input.down('KeyA') ? 1 : 0) + (input.down('KeyD') ? -1 : 0),
    arms: shift ? { L: armCmd, R: idle } : { R: armCmd, L: idle },
  };
}

function tick(dt, scripted = false) {
  const { dx, dy } = input.consumeMouse();
  if (!scripted && (dx || dy)) robot.addLook(dx, dy);

  const cmd = readCommands();
  robot.update(dt, cmd);
  physics.step(dt);
  outside.update(dt);
  checkBinned();
  input.endFrame();

  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) el.toast.style.opacity = 0;
  }
}

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t0 = performance.now();
  tick(dt);
  simMsAvg += (performance.now() - t0 - simMsAvg) * 0.05;
  renderer.render(scene, camera);

  fpsAccum += dt;
  fpsFrames++;
  if (fpsAccum >= 0.5) {
    fpsNow = Math.round(fpsFrames / fpsAccum);
    el.fps.textContent = `${fpsNow} FPS`;
    fpsAccum = 0;
    fpsFrames = 0;
  }
});
