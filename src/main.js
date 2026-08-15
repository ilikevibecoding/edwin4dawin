import * as THREE from 'three';
import { SEED, PLAYER } from './layout.js';
import { createMaterials } from './materials.js';
import { buildSubmarine } from './submarine.js';
import { createWaterSystem } from './water.js';
import { createEnvironment } from './environment.js';
import { createPost } from './post.js';
import { createPlayer, setupPointerLock } from './player.js';
import { createInteractions, createAudio } from './interact.js';
import { makeDisplay } from './textures.js';

const canvas = document.getElementById('c');
const promptEl = document.getElementById('prompt');
const statusEl = document.getElementById('status');
const fadeEl = document.getElementById('fade');
const hudEl = document.getElementById('hud');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.physicallyCorrectLights = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070807);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.05, 60);
camera.rotation.order = 'YXZ';

const seed = SEED;
const mats = createMaterials(seed);
const ctx = { mats, animated: [], colliders: [], interactables: [], windows: [] };
const sub = buildSubmarine(ctx);
scene.add(sub);

const env = createEnvironment(renderer, scene, mats);
const water = createWaterSystem(renderer, seed);
const post = createPost(renderer, scene, camera);
const player = createPlayer(camera, ctx.colliders);
const pointer = setupPointerLock(canvas, player);
const audio = createAudio();

let submarineState = 'cruising';
let wearState = 'used';
let silent = false;
let restPhase = 'none';
let motionEnabled = true;
let hudVisible = true;
let sonarPing = 0;
let sonarSweep = 0;
let statusTimer = 0;
let ready = false;
const frameTimes = [];
let last = performance.now();
let simTime = 0;

const views = {
  controlRoom: { pos: [0.08, 1.62, -7.15], look: [0.05, 1.35, -9.6], fov: 62 },
  corridor: { pos: [0.02, 1.62, -3.15], look: [0.0, 1.45, -5.6], fov: 60 },
  crewQuarters: { pos: [0.18, 1.58, 0.95], look: [-0.7, 1.15, -0.6], fov: 60 },
  engineRoom: { pos: [0.05, 1.58, 6.35], look: [0.1, 0.85, 9.6], fov: 62 },
  machineryCloseup: { pos: [0.42, 1.28, 8.55], look: [0.1, 0.7, 9.35], fov: 50 },
  sonarConsole: { pos: [0.42, 1.48, -6.95], look: [0.72, 1.22, -7.55], fov: 48 },
  forwardViewport: { pos: [0.0, 1.55, -9.15], look: [0.0, 1.38, -10.5], fov: 55 },
  porthole: { pos: [0.35, 1.5, -4.85], look: [0.99, 1.42, -4.85], fov: 48 },
  aftWide: { pos: [0.0, 1.7, 5.55], look: [0.05, 0.9, 10.4], fov: 64 },
  walking: { pos: [0.05, 1.7, -5.4], look: [0.0, 1.55, -2.2], fov: 62 },
};

function setView(name) {
  const v = views[name] || views.controlRoom;
  camera.fov = v.fov;
  camera.updateProjectionMatrix();
  camera.position.set(v.pos[0], v.pos[1], v.pos[2]);
  camera.lookAt(v.look[0], v.look[1], v.look[2]);
  player.state.position.copy(camera.position);
  player.state.yaw = camera.rotation.y;
  player.state.pitch = camera.rotation.x;
  player.state.velocity.set(0, 0, 0);
}

function setSubmarineState(name) {
  if (name === 'used' || name === 'clean') {
    wearState = name;
    mats.setWear(name);
    if (name === 'used' && submarineState === 'clean') submarineState = 'cruising';
    if (name === 'clean') env.applyState('clean');
    return;
  }
  submarineState = name;
  silent = name === 'silentRunning';
  env.applyState(name);
}

function setHUD(visible) {
  hudVisible = visible;
  hudEl.style.display = visible ? 'block' : 'none';
}

function showPrompt(text) {
  promptEl.textContent = text;
  promptEl.classList.toggle('visible', Boolean(text) && hudVisible);
}

function showStatus(text) {
  statusEl.textContent = text;
  statusEl.classList.add('visible');
  statusTimer = 2.4;
}

function setFade(on) {
  fadeEl.classList.toggle('on', on);
}

const interactions = createInteractions({
  camera,
  interactables: ctx.interactables,
  onPrompt: showPrompt,
  onStatus: showStatus,
  onFade: setFade,
  onSonar: () => {
    sonarPing = 1;
    audio.ping();
    env.lights.instruments.forEach((l) => {
      l.intensity = 0.7;
    });
  },
  onRest: (phase) => {
    restPhase = phase;
    if (phase === 'start' || phase === 'hold') setSubmarineState('restCycle');
    if (phase === 'end') setSubmarineState(silent ? 'silentRunning' : 'cruising');
  },
  onSilent: () => {
    silent = !silent;
    setSubmarineState(silent ? 'silentRunning' : 'cruising');
    return silent;
  },
});

function bindWindowTargets() {
  const mat = new THREE.MeshBasicMaterial({ map: water.rt.texture });
  ctx.windows.forEach((w) => {
    w.mesh.material.dispose();
    w.mesh.material = mat;
  });
}

function updateDisplays(dt) {
  sonarSweep += dt * 0.7;
  if (sonarPing > 0) sonarPing = Math.max(0, sonarPing - dt * 0.85);
  ctx.animated.forEach((a) => {
    if (a.type === 'fan' && a.object) {
      const spd = silent && a.silentStop ? 0.15 : silent ? a.speed * 0.45 : a.speed;
      a.object.rotation.z += dt * spd;
    }
    if (a.type === 'gauge' && a.object) {
      a.object.rotation.z = a.object.userData.base + Math.sin(simTime * a.speed) * 0.08;
    }
    if (a.type === 'vibrate' && a.object) {
      const amp = silent ? a.amp * 0.3 : a.amp;
      a.object.position.y += Math.sin(simTime * 38) * amp;
    }
    if (a.type === 'sonarDisplay') {
      const { texture, canvas: c, ctx2d } = a;
      const d = makeDisplay('sonar', simTime, { sweep: sonarSweep, ping: sonarPing > 0 ? 1 - sonarPing : 0 });
      ctx2d.clearRect(0, 0, c.width, c.height);
      ctx2d.drawImage(d.canvas, 0, 0);
      d.texture.dispose();
      texture.needsUpdate = true;
    }
    if (a.type === 'display') {
      const d = makeDisplay(a.kind, simTime, { silent, hdg: 247, depth: 412 });
      a.ctx.clearRect(0, 0, a.canvas.width, a.canvas.height);
      a.ctx.drawImage(d.canvas, 0, 0);
      d.texture.dispose();
      a.texture.needsUpdate = true;
    }
  });
}

function getMetrics() {
  const info = renderer.info;
  const avg = frameTimes.length ? frameTimes.reduce((s, v) => s + v, 0) / frameTimes.length : 16.6;
  const sorted = [...frameTimes].sort((a, b) => b - a);
  const p1 = sorted[Math.max(0, Math.floor(sorted.length * 0.01))] || avg;
  const gl = renderer.getContext();
  const dbg = gl.getExtension?.('WEBGL_debug_renderer_info');
  const rendererName = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown';
  return {
    fps: Number((1000 / avg).toFixed(1)),
    averageFrameTimeMs: Number(avg.toFixed(2)),
    onePercentLowFps: Number((1000 / p1).toFixed(1)),
    drawCalls: info.render.calls,
    triangles: info.render.triangles,
    points: info.render.points,
    lines: info.render.lines,
    geometries: info.memory.geometries,
    textures: info.memory.textures,
    programs: info.programs?.length ?? 0,
    renderer: rendererName,
    rendererInfo: {
      vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : '',
      software: /swiftshader|llvmpipe|softpipe|software/i.test(rendererName),
    },
  };
}

function resetScene() {
  silent = false;
  restPhase = 'none';
  sonarPing = 0;
  setSubmarineState('cruising');
  setSubmarineState('used');
  player.setPose(PLAYER.spawn.x, PLAYER.eyeHeight, PLAYER.spawn.z, 0, -0.08);
  setFade(false);
  showPrompt('');
  showStatus('');
  simTime = 8;
  water.state.time = 8;
}

window.debugAPI = {
  setView,
  setSubmarineState,
  setMotionEnabled(enabled) {
    motionEnabled = enabled;
    water.state.motion = enabled;
  },
  setPlayerEnabled(enabled) {
    player.state.enabled = enabled;
  },
  setHUDVisible: setHUD,
  triggerInteraction(name) {
    return interactions.trigger(name);
  },
  resetScene,
  getMetrics,
  getState() {
    return {
      submarineState,
      wearState,
      silent,
      restPhase,
      hover: interactions.getHover()?.name || null,
      prompt: promptEl.textContent,
      status: statusEl.textContent,
      fade: fadeEl.classList.contains('on'),
      pointerLocked: pointer.isLocked(),
      player: { x: player.state.position.x, y: player.state.position.y, z: player.state.position.z },
    };
  },
  ready: false,
};

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  post.setSize(w, h);
}
window.addEventListener('resize', onResize);

function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  simTime += motionEnabled ? dt : 0;
  frameTimes.push(dt * 1000);
  if (frameTimes.length > 120) frameTimes.shift();
  if (statusTimer > 0) {
    statusTimer -= dt;
    if (statusTimer <= 0) statusEl.classList.remove('visible');
  }
  if (sonarPing > 0 && sonarPing < 0.2) {
    env.lights.instruments.forEach((l) => {
      l.intensity = 0.28;
    });
  }
  player.update(dt);
  interactions.update();
  updateDisplays(dt);
  water.update(dt, motionEnabled ? null : water.state.time);
  water.render();
  if (motionEnabled) {
    sub.rotation.z = Math.sin(simTime * 0.18) * 0.004;
    sub.rotation.x = Math.sin(simTime * 0.11) * 0.0025;
  }
  post.render(dt);
  requestAnimationFrame(tick);
}

bindWindowTargets();
resetScene();
ready = true;
window.debugAPI.ready = true;
requestAnimationFrame(tick);
