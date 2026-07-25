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
const QUALITY = params.get('quality') || 'high';
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
  bathroom: view([-1.9, 1.66, -16.2], [-3.2, -17.4], -0.14),
  bedFront: view([-2.9, 1.64, -7.7], [-4.5, -8.35], -0.24),
  galleyFront: view([2.85, 1.60, -11.62], [1.9, -11.5], -0.12),
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
renderer.setPixelRatio(SHOT_MODE ? 1 : Math.min(window.devicePixelRatio, 1.5));
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
let viewLocked = false;
let frames = 0;
let elapsed = 0;
let fixedTime = null;
let cpuMs = 0;
let updateMs = 0;      // JS-side scene update (player, interactions, rig, space)
let renderMs = 0;      // composer.render — on this machine that is software raster
let fpsAvg = 0;
let lastStats = { calls: 0, tris: 0, programs: 0, textures: 0, geometries: 0 };

if (SHOT_MODE) {
  hud.hideSplash();
  fixedTime = SHOT_TIME;
  space.seek(SHOT_TIME);
}

function frame() {
  requestAnimationFrame(frame);
  const t0 = performance.now();

  timer.update();
  let dt = Math.min(0.05, timer.getDelta());
  elapsed += dt;
  const t = fixedTime !== null ? fixedTime + frames / 60 : elapsed;

  renderer.info.reset();

  if (!viewLocked) player.update(dt);
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
  getStats: () => ({
    fps: Math.round(fpsAvg),
    cpuMs: +cpuMs.toFixed(2),
    updateMs: +updateMs.toFixed(2),
    renderMs: +renderMs.toFixed(2),
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
