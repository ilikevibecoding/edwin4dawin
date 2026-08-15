import * as THREE from 'three';
import { LAYOUT, START_POSE } from './layout.js';
import { createMaterials, applyEnvMap } from './materials.js';
import { ColliderWorld } from './colliders.js';
import { createHull, createSharedUtilities } from './submarine.js';
import { createHullDressing } from './dressing.js';
import { createControlRoom } from './controlRoom.js';
import { createCorridor } from './corridor.js';
import { createCrewQuarters } from './crewQuarters.js';
import { createEngineRoom } from './engineRoom.js';
import { createUnderwater } from './water.js';
import { createLighting } from './lighting.js';
import { createReflectionEnvironment, createEnvironmentController } from './environment.js';
import { createPost, configureRenderer, detectSoftwareRenderer } from './post.js';
import { createPlayer } from './player.js';
import { createInteractions, createHUD, createAudio } from './interact.js';
import { createDebugAPI } from './debug.js';
import { tickDisplays } from './displays.js';
import { SeededRandom, DEFAULT_SEED } from './seed.js';

const app = document.getElementById('app');
const canvas = document.createElement('canvas');
app.appendChild(canvas);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
const gpu = detectSoftwareRenderer(renderer);
configureRenderer(renderer, { shadows: !gpu.software });

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x071018);
scene.fog = new THREE.FogExp2(0x1a1814, 0.012);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.05, 120);
camera.position.set(START_POSE.x, START_POSE.y, START_POSE.z);

const rng = new SeededRandom(DEFAULT_SEED);
void rng;

let materials;
try {
  materials = createMaterials();
} catch (err) {
  console.error('materials init failed', err);
  throw err;
}
const { texture: envMap } = createReflectionEnvironment(renderer);
scene.environment = envMap;
applyEnvMap(materials, envMap);

const collider = new ColliderWorld();
const hull = createHull(materials, collider);
const utilities = createSharedUtilities(materials, collider);
const dressing = createHullDressing(materials);
const control = createControlRoom(materials, collider);
const corridor = createCorridor(materials, collider);
const crew = createCrewQuarters(materials, collider);
const engine = createEngineRoom(materials, collider);
const water = createUnderwater(DEFAULT_SEED);
const lights = createLighting(scene);

const interior = new THREE.Group();
interior.name = 'interior';
interior.add(hull, utilities, dressing, control.group, corridor.group, crew.group, engine.group);
scene.add(interior);
scene.add(water.root);

const hud = createHUD();
const audio = createAudio();
const player = createPlayer(camera, collider, canvas);

const displays = [...control.displays, ...engine.displays];
const post = createPost(renderer, scene, camera, { simple: gpu.software });

const env = createEnvironmentController({
  lights,
  materials,
  water,
  machinery: engine.anim,
});
env.setSubmarineState('used');
env.setSubmarineState('cruising');

let sonarPulse = 0;
let restAnim = null;
let motionEnabled = true;
let vesselSway = 0;

const interact = createInteractions({
  camera,
  scene,
  hud,
  onSonar() {
    sonarPulse = 1.8;
    audio.ping();
    hud.setStatus('Sonar pulse transmitted.');
    window.setTimeout(() => hud.setStatus('No immediate contact.'), 900);
    lights.instrument.intensity = 0.85;
    window.setTimeout(() => {
      if (env.getState().mode === 'cruising') lights.instrument.intensity = 0.35;
    }, 700);
  },
  onRest(done) {
    hud.setStatus('6 hours pass.');
    restAnim = { t: 0, phase: 'out', done };
  },
  onSilent() {
    const cur = env.getState().mode;
    if (cur === 'silentRunning') {
      env.setSubmarineState('cruising');
      hud.setStatus('Silent running disengaged.');
    } else {
      env.setSubmarineState('silentRunning');
      hud.setStatus('Silent running engaged.');
    }
  },
});

interact.add(control.sonarTarget, 'sonar', 'E: Active Sonar Ping');
interact.add(crew.bunkTarget, 'rest', 'E: Rest');
interact.add(engine.silentTarget, 'silentRunning', 'E: Silent Running');

function trigger(name) {
  if (name === 'sonar') {
    interact.targets[0] && (interact.targets[0].userData._force = true);
    audio.ping();
    sonarPulse = 1.8;
    hud.setStatus('Sonar pulse transmitted.');
    window.setTimeout(() => hud.setStatus('No immediate contact.'), 900);
    return true;
  }
  if (name === 'rest') {
    hud.setStatus('6 hours pass.');
    restAnim = { t: 0, phase: 'out', done: () => {} };
    return true;
  }
  if (name === 'silentRunning') {
    const cur = env.getState().mode;
    if (cur === 'silentRunning') {
      env.setSubmarineState('cruising');
      hud.setStatus('Silent running disengaged.');
    } else {
      env.setSubmarineState('silentRunning');
      hud.setStatus('Silent running engaged.');
    }
    return true;
  }
  return false;
}

const frameTimes = [];
let last = performance.now();
let frames = 0;
let fps = 60;
let lastInfo = {
  render: { calls: 0, triangles: 0, points: 0, lines: 0 },
  memory: { geometries: 0, textures: 0 },
  programs: [],
};
let frameCount = 0;

function collectSceneStats() {
  let meshes = 0;
  let triangles = 0;
  let points = 0;
  scene.traverse((o) => {
    if (o.isInstancedMesh && o.geometry) {
      const idx = o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count;
      triangles += (idx / 3) * o.count;
      meshes += 1;
    } else if (o.isMesh && o.geometry) {
      const idx = o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count;
      triangles += idx / 3;
      meshes += 1;
    } else if (o.isPoints && o.geometry) {
      points += o.geometry.attributes.position?.count ?? 0;
    }
  });
  return { meshes, triangles: Math.round(triangles), points };
}

function getMetrics() {
  const info = lastInfo;
  const avg = frameTimes.length ? frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length : 16.6;
  const sorted = [...frameTimes].sort((a, b) => b - a);
  const onePct = sorted[Math.max(0, Math.floor(sorted.length * 0.01))] || avg;
  const gl = renderer.getContext();
  const dbg = gl.getExtension?.('WEBGL_debug_renderer_info');
  const rendererName = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown';
  return {
    fps,
    averageFrameTimeMs: Number(avg.toFixed(2)),
    onePercentLowFps: Number((1000 / onePct).toFixed(2)),
    drawCalls: Math.max(info.render.calls, collectSceneStats().meshes),
    triangles: Math.max(info.render.triangles, collectSceneStats().triangles),
    points: Math.max(info.render.points, collectSceneStats().points),
    lines: info.render.lines,
    geometries: info.memory.geometries,
    textures: info.memory.textures,
    programs: info.programs?.length ?? 0,
    renderer: rendererName,
    rendererInfo: {
      vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : '',
      version: gl.getParameter(gl.VERSION),
    },
  };
}

function resetScene() {
  player.setPose(START_POSE.x, START_POSE.y, START_POSE.z, START_POSE.yaw, START_POSE.pitch);
  env.setSubmarineState('used');
  env.setSubmarineState('cruising');
  hud.setFade(0);
  hud.setStatus('');
  hud.setPrompt('');
  sonarPulse = 0;
  restAnim = null;
  water.setTime(8);
  interior.rotation.set(0, 0, 0);
}

const debugAPI = createDebugAPI({
  camera,
  player,
  env,
  hud,
  water,
  interact,
  getMetrics,
  resetScene,
  trigger,
  get motionEnabled() {
    return motionEnabled;
  },
  set motionEnabled(v) {
    motionEnabled = v;
  },
});

document.getElementById('blocker')?.addEventListener('click', () => {
  hud.hideBlocker();
  canvas.requestPointerLock?.();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  post.setSize(window.innerWidth, window.innerHeight);
});

water.setTime(8);

function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  frames++;
  frameTimes.push(dt * 1000);
  if (frameTimes.length > 180) frameTimes.shift();
  if (frames % 30 === 0) fps = Math.round(1000 / (frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length));

  player.update(dt);
  interact.update();
  hud.update(dt);
  engine.anim.update(dt);
  if (motionEnabled) water.update(dt);

  vesselSway += dt;
  if (motionEnabled) {
    interior.rotation.z = Math.sin(vesselSway * 0.22) * 0.004;
    interior.rotation.x = Math.sin(vesselSway * 0.15) * 0.0025;
  } else {
    interior.rotation.set(0, 0, 0);
  }

  const t = now * 0.001;
  tickDisplays(displays, t + sonarPulse * 8);
  if (sonarPulse > 0) sonarPulse = Math.max(0, sonarPulse - dt);

  if (restAnim) {
    restAnim.t += dt;
    if (restAnim.phase === 'out') {
      hud.setFade(Math.min(1, restAnim.t / 0.7));
      if (restAnim.t > 0.75) {
        env.setSubmarineState('restCycle');
        hud.setStatus('6 hours pass.');
        restAnim = { t: 0, phase: 'hold', done: restAnim.done };
      }
    } else if (restAnim.phase === 'hold') {
      hud.setFade(1);
      if (restAnim.t > 1.1) restAnim = { t: 0, phase: 'in', done: restAnim.done };
    } else if (restAnim.phase === 'in') {
      hud.setFade(Math.max(0, 1 - restAnim.t / 0.9));
      if (restAnim.t > 0.4) env.setSubmarineState('cruising');
      if (restAnim.t > 1.0) {
        hud.setFade(0);
        hud.setStatus('Rested.');
        restAnim.done?.();
        restAnim = null;
      }
    }
  }

  renderer.info.reset();
  post.render(dt);
  lastInfo = {
    render: { ...renderer.info.render },
    memory: { ...renderer.info.memory },
    programs: renderer.info.programs ? [...renderer.info.programs] : [],
  };
  frameCount += 1;
  debugAPI.frameCount = frameCount;
  requestAnimationFrame(tick);
}

debugAPI.ready = true;
window.debugAPI = debugAPI;
requestAnimationFrame(tick);
