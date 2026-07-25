/**
 * main.js — bootstrap, render loop, camera view presets, debug API.
 */
import * as THREE from 'three';
import { buildShip, ROOM } from './ship.js';
import { buildSpace } from './space.js';
import { Player } from './player.js';
import { Interactions, createHUD } from './interact.js';
import { createPost } from './post.js';
import { initMaterials, PALETTE, M } from './materials.js';

const params = new URLSearchParams(location.search);
const SHOT_MODE = params.has('shot');
// Shot mode pins the top rung so the judged frames stay comparable between
// iterations; interactive use starts one rung down and lets the governor decide.
const QUALITY = params.get('quality') || (SHOT_MODE ? 'ultra' : 'auto');
const SHOT_TIME = Number(params.get('t') ?? 41);
const SHOT_TIME_FORCED = params.has('t');

/**
 * Deterministic clock per view preset. The planet loops past the starboard side,
 * so "the planet is framed" happens at a different moment for a camera looking
 * out of the bow than for one looking through a side porthole. Only used in
 * `?shot=1` mode; `?t=` overrides it.
 */
const SHOT_TIMES = {
  // planet ahead and to starboard, moon near the centreline
  cockpit: 5.5,
  // the sightline through a porthole depends on where you stand: from mid-corridor
  // the aperture looks ~50 deg forward of the beam, from right beside it ~18 deg,
  // so the two shots need different moments of the planet's traverse.
  corridor: 21,
  window: 33.5,
  quarters: 33.5,
  galley: 33.5,
  bathroom: 33.5,
};

/* ------------------------------------------------------------- view presets */

/**
 * Camera convention: the camera looks down -Z at yaw 0, and `rotateY(yaw)`
 * turns that direction to (-sin yaw, 0, -cos yaw). So aiming at a point is
 * yaw = atan2(-(tx - px), -(tz - pz)).
 */
export function yawTo(from, to) {
  return Math.atan2(-(to[0] - from[0]), -(to[1] - from[1]));
}
const view = (pos, target, pitch = 0) => ({ pos, yaw: yawTo([pos[0], pos[2]], target), pitch });

export const VIEWS = {
  // down the corridor toward the cockpit door — the money shot
  corridor: view([0.0, 1.70, -3.2], [0.0, -21], -0.02),
  // pilot's seat looking out of the viewport
  cockpit: view([0.02, 1.70, -22.4], [0.05, -27.5], -0.10),
  // crew quarters, framing the bunk and the locker
  quarters: view([-1.72, 1.68, -7.25], [-4.6, -8.95], -0.085),
  // stood at the corridor porthole
  window: view([-0.12, 1.64, -4.10], [1.40, -4.80], -0.015),

  galley: view([2.0, 1.68, -13.9], [4.5, -12.1], -0.06),
  // Stood in the doorway. The old spot (-1.9, -16.2) was *inside* the shower
  // nook's frame post, so the near edge of the frame was a 0.3 m-away smear of
  // hazard-striped trim.
  bathroom: view([-1.62, 1.66, -16.55], [-2.92, -17.78], -0.12),
  bedFront: view([-2.9, 1.64, -7.7], [-4.5, -8.35], -0.24),
  galleyFront: view([3.15, 1.64, -12.25], [1.98, -11.55], -0.16),
  sinkFront: view([-2.1, 1.64, -16.2], [-3.05, -17.55], -0.28),
  aft: view([0, 1.7, -6.0], [0, -1], -0.02),
};

/* ------------------------------------------------------------------- setup */

const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: 'high-performance',
  stencil: false,
  alpha: false,
});
// initial value only — createPost's quality ladder owns the pixel ratio from the
// moment it is constructed
renderer.setPixelRatio(SHOT_MODE ? 1 : Math.min(window.devicePixelRatio, 1.25));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;   // ACES lives in the post chain
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.info.autoReset = false;

initMaterials(renderer);

const scene = new THREE.Scene();
scene.background = null;
scene.fog = new THREE.FogExp2(PALETTE.fogColor, 0.030);

const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 80);
camera.layers.enableAll();
scene.add(camera);

/* -------------------------------------------------------------- PMREM env */

function buildEnvironment() {
  const env = new THREE.Scene();
  const box = (w, h, d, x, y, z, color, emissive = null, ei = 1) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({
        color, roughness: 0.85, metalness: 0.1,
        emissive: emissive ?? 0x000000, emissiveIntensity: ei,
        side: THREE.BackSide,
      }),
    );
    m.position.set(x, y, z);
    env.add(m);
    return m;
  };
  // enclosing shell: dark hull
  box(14, 6, 22, 0, 1.5, 0, 0x2a2f33);
  // warm strips overhead
  const quad = (w, h, x, y, z, rx, ry, color, ei) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    );
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, 0);
    m.material.color.multiplyScalar(ei);
    env.add(m);
  };
  quad(2.2, 8, 0, 4.3, -2, Math.PI / 2, 0, new THREE.Color(PALETTE.warm), 3.2);
  quad(1.2, 6, -3.4, 2.2, 2, 0, Math.PI / 2, new THREE.Color(PALETTE.teal), 1.6);
  quad(1.2, 6, 3.4, 2.2, 2, 0, -Math.PI / 2, new THREE.Color(PALETTE.accent), 1.0);
  // cool window
  quad(5.5, 2.2, 0, 2.0, -9.5, 0, 0, new THREE.Color(PALETTE.cool), 4.0);

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const rt = pmrem.fromScene(env, 0.02, 0.1, 100);
  pmrem.dispose();
  env.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
  return rt.texture;
}

scene.environment = buildEnvironment();
scene.environmentIntensity = 0.42;

/* -------------------------------------------------------------------- ship */

const ship = buildShip({ scene, renderer });
const space = buildSpace();

/* ------------------------------------------------------------------ player */

const hud = createHUD();
const player = new Player({
  camera,
  domElement: renderer.domElement,
  colliders: ship.colliders,
  onLockChange: (locked) => {
    if (locked) hud.hideSplash();
    else if (!SHOT_MODE) hud.showSplash();
  },
});
player.teleport(0, -3.4, Math.PI, 0);

const interactions = new Interactions({
  camera,
  interactables: ship.interactables,
  rig: ship.rig,
  hud,
  onBusyChange: (busy) => { player.enabled = !busy && !viewLocked; },
});

hud.el.splash.addEventListener('click', () => player.requestLock());
renderer.domElement.addEventListener('click', () => { if (!player.locked) player.requestLock(); });

/* -------------------------------------------------------------------- post */

const post = createPost({
  renderer, scene, camera,
  spaceScene: space.scene, spaceCamera: space.camera,
  width: window.innerWidth, height: window.innerHeight,
  quality: QUALITY,
});

/* ------------------------------------------------------------------ resize */

function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  post.setSize(w, h);
}
window.addEventListener('resize', onResize);

/* -------------------------------------------------------------------- loop */

const timer = new THREE.Timer();
// Page Visibility: while the tab is hidden rAF stops, and without this the first
// frame back carries the whole away-time as one delta.
timer.connect(document);

/**
 * Longest real frame the simulation will honour. Only a genuine hitch (tab
 * switch, GC pause, the browser throttling a background window) should ever
 * exceed this; past it we deliberately lose time rather than teleport.
 */
const MAX_FRAME = 0.25;

/**
 * Adaptive quality governor.
 *
 * The demo used to render at a fixed top-rung quality on every machine, which is
 * the difference between "runs beautifully" and "appears to be frozen" depending
 * entirely on whose GPU it landed on. Now frame time is measured and the post
 * ladder is walked to meet a budget.
 *
 * Disabled entirely in `?shot=1` (the harness needs deterministic output) and
 * whenever `?quality=` pins a rung explicitly.
 */
let autoQuality = !SHOT_MODE && (params.get('quality') ?? 'auto') === 'auto';

/**
 * Budgets are on the *real frame interval* (rAF to rAF), not on CPU time spent
 * inside the frame callback. GPU work is asynchronous: timing `performance.now()`
 * around the draw calls reported 2.6 ms on a machine that was managing one frame
 * per second, which had the governor cheerfully climbing the ladder on hardware
 * that could not render at all.
 *
 * The dead band between the two budgets is deliberately wide. A vsynced 60 Hz
 * display reports 16.7 ms whether it has headroom or not, so anything in that
 * range is left alone — chasing a slightly higher pixel ratio is not worth the
 * risk of demoting a display that is already hitting its refresh rate.
 */
const BUDGET_DOWN = 26;    // ms (~38 fps) — sustained worse than this, step down
const BUDGET_UP = 13.5;    // ms (~74 fps) — sustained better than this, step up
const PANIC_MS = 90;       // ~11 fps: the upper rungs are hopeless, go straight to the floor
// Shader compilation and texture upload spike the first frames. The median over
// an 8-sample window already filters those spikes, so this only has to cover the
// very first frames — keeping it short means a machine that cannot cope reaches
// the panic path in ~2 s rather than staring at a slideshow.
const WARMUP_MS = 900;
const CLIMB_BLOCK_MS = 15000;  // after a demotion, stop trying to climb for a while

let govSamples = [];
let govNextEval = 0;
let govCooldownUntil = 0;
let govClimbBlockedUntil = 0;
let govStart = 0;
let govMedian = 0;

/** @param frameIntervalMs real time since the previous frame. */
function governQuality(nowMs, frameIntervalMs) {
  if (!autoQuality) return;
  if (govStart === 0) govStart = nowMs;
  if (nowMs - govStart < WARMUP_MS) return;

  govSamples.push(frameIntervalMs);
  if (govSamples.length > 40) govSamples.shift();
  if (nowMs < govNextEval || nowMs < govCooldownUntil || govSamples.length < 8) return;
  govNextEval = nowMs + 1000;

  // median, not mean: one GC pause or one texture upload should not demote the
  // whole session
  const sorted = [...govSamples].sort((a, b) => a - b);
  govMedian = sorted[sorted.length >> 1];

  const level = post.level;
  const last = post.levels.length - 1;

  if (govMedian > BUDGET_DOWN && level < last) {
    post.setLevel(govMedian > PANIC_MS ? last : level + 1);
    govSamples = [];
    govCooldownUntil = nowMs + 1500;
    govClimbBlockedUntil = nowMs + CLIMB_BLOCK_MS;
  } else if (govMedian < BUDGET_UP && level > 0 && nowMs > govClimbBlockedUntil) {
    post.setLevel(level - 1);
    govSamples = [];
    govCooldownUntil = nowMs + 2500;
  }
}

let viewLocked = false;
let frames = 0;
let elapsed = 0;
let fixedTime = null;
let cpuMs = 0;
let updateMs = 0;      // JS-side scene update (player, interactions, rig, space)
let renderMs = 0;      // composer.render — on this machine that is software raster
let fpsAvg = 0;
let lastStats = { calls: 0, tris: 0, programs: 0, textures: 0, geometries: 0 };

/**
 * The mirrors are `Reflector`s, so each re-renders the scene from the mirrored
 * camera in `onBeforeRender`. That hook fires for *every* pass that draws the
 * scene — the colour pass and N8AO's depth/normal pass — which would double the
 * cost for no gain. Clamp each mirror to one reflection render per displayed
 * frame; the colour pass runs first, so it is the one that gets it.
 */
for (const mirror of ship.mirrors ?? []) {
  // three.js filters lights by the *camera's* layers, so restricting the mirror's
  // reflection camera cuts both its draw calls and its light count
  const rc = mirror.getReflectionCamera(camera);
  const keep = mirror.userData.reflectLayers;
  if (keep) {
    rc.layers.disableAll();
    for (const l of keep) rc.layers.enable(l);
  }
  const inner = mirror.onBeforeRender;
  let lastFrame = -1;
  mirror.onBeforeRender = function (r, s, c) {
    if (lastFrame === frames) return;
    lastFrame = frames;
    inner.call(this, r, s, c);
  };
}

if (SHOT_MODE) {
  hud.hideSplash();
  fixedTime = SHOT_TIME;
  space.seek(SHOT_TIME);
}

function frame() {
  requestAnimationFrame(frame);
  const t0 = performance.now();

  timer.update();
  /**
   * This used to be `Math.min(0.05, delta)`, which is a slow-motion bug wearing a
   * safety clamp's clothes: it caps the simulation at 20 fps worth of time, so at
   * 10 fps the world runs at half speed and at 5 fps at a quarter. Holding W then
   * moves you a few centimetres a second and the game feels frozen rather than
   * merely choppy. The clamp now only catches real hitches, and the player is
   * substepped instead so collision stays safe at any frame rate.
   */
  const rawDelta = timer.getDelta();
  const dt = Math.min(MAX_FRAME, rawDelta);
  elapsed += dt;
  const t = fixedTime !== null ? fixedTime + frames / 60 : elapsed;

  renderer.info.reset();

  if (!viewLocked) player.advance(dt);
  interactions.update(dt, player.pos);
  ship.rig.update(dt);
  ship.rig.cull(camera.position, 13);
  space.update(t, camera);

  const tUpdate = performance.now();
  post.render(dt);
  const tRender = performance.now();
  updateMs = updateMs * 0.9 + (tUpdate - t0) * 0.1;
  renderMs = renderMs * 0.9 + (tRender - tUpdate) * 0.1;

  frames++;
  const ms = performance.now() - t0;
  governQuality(t0, rawDelta * 1000);
  cpuMs = cpuMs * 0.9 + ms * 0.1;
  fpsAvg = fpsAvg * 0.9 + (1 / Math.max(1e-3, dt)) * 0.1;
  lastStats = {
    calls: renderer.info.render.calls,
    tris: renderer.info.render.triangles,
    programs: renderer.info.programs.length,
    textures: renderer.info.memory.textures,
    geometries: renderer.info.memory.geometries,
  };

  if (frames === 2) {
    hud.hideLoading();
    ready = true;
  }
}

let ready = false;
requestAnimationFrame(frame);

/* ---------------------------------------------------------------- debug API */

function applyView(name) {
  const v = VIEWS[name];
  if (!v) return false;
  if (SHOT_MODE && !SHOT_TIME_FORCED && SHOT_TIMES[name] !== undefined) {
    fixedTime = SHOT_TIMES[name];
    frames = 0;
    space.seek(fixedTime);
  }
  viewLocked = true;
  player.enabled = false;
  player.pos.set(v.pos[0], 0, v.pos[2]);
  player.vel.set(0, 0, 0);
  player.yaw = v.yaw;
  player.pitch = v.pitch;
  camera.position.set(v.pos[0], v.pos[1], v.pos[2]);
  camera.rotation.set(0, 0, 0);
  camera.rotateY(v.yaw);
  camera.rotateX(v.pitch);
  return true;
}

window.debugAPI = {
  get ready() { return ready; },
  get frames() { return frames; },
  resetFrames() { frames = 0; },
  views: Object.keys(VIEWS),
  setView: (name) => applyView(name),
  /** Ad-hoc camera for inspecting details (tools/look.mjs). */
  look(pos, target, fov = null) {
    viewLocked = true;
    player.enabled = false;
    player.pos.set(pos[0], 0, pos[2]);
    player.vel.set(0, 0, 0);
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.up.set(0, 1, 0);
    camera.lookAt(target[0], target[1], target[2]);
    player.yaw = yawTo([pos[0], pos[2]], [target[0], target[2]]);
    player.pitch = 0;
    if (fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    return true;
  },
  releaseView() { viewLocked = false; player.enabled = true; },
  setTime(t) { fixedTime = t; space.seek(t); },
  getTime: () => (fixedTime !== null ? fixedTime : elapsed),
  setLightPreset: (p, s = 0.5) => ship.rig.set(p, s),
  getLightPreset: () => ship.rig.preset,
  interact: (id) => interactions.trigger(id),
  getPrompt: () => hud.getPrompt(),
  getStatusText: () => hud.getStatusText(),
  getToastText: () => hud.getToastText(),
  getLastToast: () => hud.getLastToast(),
  clearToast: () => hud.clearToast(),
  getCaption: () => hud.getCaption(),
  getFadeAlpha: () => hud.getFadeAlpha(),
  isPointerLocked: () => player.locked,
  requestLock: () => player.requestLock(),
  setHudVisible: (v) => hud.setHudVisible(v),
  hideSplash: () => hud.hideSplash(),
  setQuality: (q) => post.setQuality(q),
  setQualityLevel: (i) => post.setLevel(i),
  // lets the harness pin a rung without appending URL params — htmlpreview.github.io
  // takes the target file as its own query string, so extra params corrupt the fetch
  setAutoQuality: (on) => { autoQuality = !!on; govSamples = []; govStart = 0; },
  getQuality: () => ({
    level: post.level, name: post.levelName, auto: autoQuality,
    medianFrameMs: +govMedian.toFixed(1), samples: govSamples.length,
  }),
  getStats: () => ({
    fps: Math.round(fpsAvg),
    cpuMs: +cpuMs.toFixed(2),
    updateMs: +updateMs.toFixed(2),
    renderMs: +renderMs.toFixed(2),
    quality: post.levelName,
    ...lastStats,
    lights: countLights(),
    activeLights: countLights(true),
    shadowCasters: countShadowCasters(),
    colliders: ship.colliders.length,
    interactables: ship.interactables.length,
    preset: ship.rig.preset,
  }),
  scene, camera, renderer, ship, space, post, player, interactions,
};

function countLights(activeOnly = false) {
  let n = 0;
  scene.traverse((o) => { if (o.isLight && (!activeOnly || o.visible)) n++; });
  return n;
}
function countShadowCasters() {
  let n = 0;
  scene.traverse((o) => { if (o.isLight && o.castShadow && o.visible) n++; });
  return n;
}

window.addEventListener('error', (e) => {
  window.__pageError = String(e.message);
});
