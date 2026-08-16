// Application entry: renderer, scene assembly, loop, ship motion, metrics.
// Owner: lead agent.

import * as THREE from 'three';
import { setGlobalSeed } from './rng.js';

const params = new URLSearchParams(location.search);
setGlobalSeed(parseInt(params.get('seed') || '1337', 10));
const QUALITY = params.get('quality') || 'high';

import * as M from './materials.js';
import * as K from './greebles.js';
import * as C from './collision.js';
import { mergeStaticMeshes } from './mergeStatic.js';
import { createEnvironment } from './environment.js';
import { createPlayer } from './player.js';
import { createHUD } from './hud.js';
import { createInteract } from './interact.js';
import { createPost } from './post.js';
import { installDebugAPI } from './debug.js';
import * as submarine from './submarine.js';
import * as controlRoom from './controlRoom.js';
import * as corridor from './corridor.js';
import * as crewQuarters from './crewQuarters.js';
import * as engineRoom from './engineRoom.js';
import * as water from './water.js';

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false; // static lights; re-render maps only on lighting changes
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.info.autoReset = false;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x041418);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.06, 240);

// ---- shared context --------------------------------------------------------
const animFns = [];
const time = {
  simTime: 0,
  motion: true,
  setMotion(v) { this.motion = v; },
  setSim(t) { this.simTime = t; },
};
const hud = createHUD();
const env = createEnvironment(scene, renderer);
const player = createPlayer(camera, renderer.domElement);
const interact = createInteract(camera, hud);

// frame-driven scheduler (in-page timers are throttled when headless/hidden)
const schedItems = [];
const sched = {
  after(seconds, fn) { schedItems.push({ t: seconds, fn }); },
};

const ctx = {
  scene, camera, renderer, hud, env, player, interact, time, sched, quality: QUALITY,
  collision: C,
  anim: { add(fn) { animFns.push(fn); } },
  lights: { register: env.register },
  getRenderCostMs: () => lastFrameCostMs,
  // test pump: renders one frame and blocks until the GPU queue drains, so
  // rapid external polling cannot oversubmit a slow software rasterizer
  pumpFrame: () => { frame(); try { renderer.getContext().finish(); } catch (e) { /* context lost */ } return framesRendered; },
};

// ---- build world ------------------------------------------------------------
env.buildPMREM();
scene.add(player.object);

const world = new THREE.Group();
world.name = 'world';
scene.add(world);

world.add(submarine.build(ctx));
world.add(controlRoom.build(ctx));
world.add(corridor.build(ctx));
world.add(crewQuarters.build(ctx));
world.add(engineRoom.build(ctx));
scene.add(water.build(ctx));

K.finalizeInstancers(world);
mergeStaticMeshes(world);

player.teleport(0, 2.4, 0, 0);
installDebugAPI(ctx);
window.__ctx = ctx; // for tooling (custom debug poses)

// ---- resize ------------------------------------------------------------------
let post = createPost(renderer, scene, camera, { width: window.innerWidth, height: window.innerHeight, quality: QUALITY });
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  post.setSize(window.innerWidth, window.innerHeight);
});

// ---- ship motion --------------------------------------------------------------
function shipSway(t) {
  const roll = Math.sin(t * 0.11) * 0.0038 + Math.sin(t * 0.231) * 0.0014;
  const pitch = Math.sin(t * 0.087) * 0.0021 + Math.sin(t * 0.17) * 0.0008;
  return { roll, pitch };
}

// ---- main loop -----------------------------------------------------------------
const clock = new THREE.Clock(); // simple delta source; deprecation warning is harmless
let framesRendered = 0;

// rAF can stall in headless/backgrounded contexts (headless renders on demand);
// a watchdog timer keeps the simulation ticking when something is actually
// animating (player enabled or motion on). It adapts to frame cost so a slow
// software rasterizer keeps idle headroom for on-demand screenshot frames.
let rafId = 0, watchdog = 0, lastFrameCostMs = 16;
function schedule() {
  cancelAnimationFrame(rafId); // never stack pending rAF callbacks
  rafId = requestAnimationFrame(frame);
  clearTimeout(watchdog);
  const delay = Math.max(110, Math.min(4000, lastFrameCostMs * 2.5));
  watchdog = setTimeout(() => {
    if (!time.motion && !player.state.enabled) { schedule(); return; }
    cancelAnimationFrame(rafId);
    frame();
  }, delay);
}

let inFrame = false;
function frame() {
  if (inFrame) return;
  inFrame = true;
  try { frameBody(); } finally { inFrame = false; }
}

function frameBody() {
  const frameStart = performance.now();
  schedule();
  const rawDt = clock.getDelta();
  const dt = Math.min(0.1, rawDt);
  if (time.motion) time.simTime += dt;

  renderer.info.reset();

  const wallDt = Math.min(0.65, rawDt);
  for (let i = schedItems.length - 1; i >= 0; i--) {
    schedItems[i].t -= wallDt;
    if (schedItems[i].t <= 0) {
      const fn = schedItems[i].fn;
      schedItems.splice(i, 1);
      fn();
    }
  }
  hud.update(wallDt);
  player.update(dt);
  interact.update(dt, player.state.enabled);
  env.update(dt, renderer);
  // shadow maps hold depth only; every shadow caster is static, so render the
  // maps once on boot and never again (intensity changes don't affect depth)
  if (framesRendered < 6) renderer.shadowMap.needsUpdate = true;
  K.kitTick(time.simTime, time.motion ? dt : 0);
  for (const fn of animFns) fn(time.simTime, time.motion ? dt : 0);

  // compose camera-local offsets: head bob + ship sway + machinery vibration
  const sway = time.motion || true ? shipSway(time.simTime) : { roll: 0, pitch: 0 };
  const bob = player.state.bob || { x: 0, y: 0, roll: 0 };
  const engineProx = THREE.MathUtils.clamp(1 - Math.abs(player.object.position.z - 20) / 6, 0, 1);
  const vib = engineProx * 0.0009 * K.getMachineryFactor() * Math.sin(time.simTime * 41.0);
  camera.position.set(bob.x, bob.y + vib, 0);
  camera.rotation.set(sway.pitch, 0, bob.roll + sway.roll);

  post.render(time.simTime);

  if (ctx.metricsSink && framesRendered > 2) ctx.metricsSink.push(rawDt);
  framesRendered++;
  window.__frameCount = framesRendered;
  if (framesRendered === 3) {
    window.__ready = true;
  }
  lastFrameCostMs = performance.now() - frameStart;
}
schedule();
