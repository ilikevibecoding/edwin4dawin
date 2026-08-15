import {
  ACESFilmicToneMapping,
  BasicShadowMap,
  Clock,
  Color,
  PerspectiveCamera,
  SRGBColorSpace,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { SEED } from './seed.js';
import { applyEnvMap, createMaterials, setWearMode } from './materials.js';
import { buildSubmarine } from './submarine.js';
import { createLighting, createPMREM, applyLightingState } from './environment.js';
import { createPost } from './post.js';
import { createPlayer, createWorldCamera } from './player.js';
import { createInteractions } from './interact.js';
import { createDebugAPI } from './debug.js';
import { createUnderwater, updateUnderwater, setWaterFrozen } from './water.js';
import { createWindowVista, updateVista } from './vista.js';
import { drawSonar } from './displays.js';

const canvas = document.getElementById('c');
const renderer = new WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: 'high-performance',
  stencil: false,
});
const glBoot = renderer.getContext();
const dbgBoot = glBoot.getExtension && glBoot.getExtension('WEBGL_debug_renderer_info');
const rendererNameBoot = dbgBoot ? String(glBoot.getParameter(dbgBoot.UNMASKED_RENDERER_WEBGL)) : '';
const softwareGL = /swiftshader|llvmpipe|software/i.test(rendererNameBoot);
renderer.setPixelRatio(softwareGL ? 1 : Math.min(window.devicePixelRatio || 1, 1.25));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = SRGBColorSpace;
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.28;
renderer.shadowMap.enabled = !softwareGL;
renderer.shadowMap.type = BasicShadowMap;
renderer.setClearColor(new Color(0x06141c), 1);

const scene = new Scene();
const playerCam = createWorldCamera();
const debugCamera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 140);

setWearMode('used');
const mats = createMaterials();
const envMap = createPMREM(renderer);
applyEnvMap(mats, envMap, 0.95);

const lights = createLighting(scene);
if (softwareGL) lights.keyControl.castShadow = false;
const water = createUnderwater(scene);
const vista = createWindowVista();
scene.add(vista);
const sub = buildSubmarine(scene, mats);
const player = createPlayer(playerCam, sub.collision, {
  spawn: new Vector3(0.05, 0, 2.15),
});
player.syncCamera(0);
player.bind(canvas);

const app = {
  renderer,
  scene,
  player,
  debugCamera,
  activeCamera: playerCam,
  post: null,
  water,
  waterApi: { setWaterFrozen },
  sub,
  motionEnabled: true,
  lightingState: 'cruising',
  wear: 'used',
  frameTimes: [],
  currentView: 'walking',
  applyState(name) {
    if (name === 'clean' || name === 'used') {
      app.wear = name;
      setWearMode(name);
      return;
    }
    const lighting = name === 'cruising' || name === 'restCycle' || name === 'silentRunning' || name === 'maintenanceLights'
      ? name
      : 'cruising';
    app.lightingState = lighting;
    applyLightingState(lights, lighting);
    const silent = lighting === 'silentRunning';
    app.speedMul = silent ? 0.35 : 1;
    for (const item of sub.interactables) {
      if (item.userData.panelMat && item.userData.panelTexSilent) {
        const tex = silent ? item.userData.panelTexSilent : item.userData.panelTex;
        item.userData.panelMat.map = tex;
        item.userData.panelMat.emissiveMap = tex;
        item.userData.panelMat.needsUpdate = true;
      }
    }
  },
  speedMul: 1,
};

const interactCtx = {
  camera: playerCam,
  scene,
  player,
  lights,
  water,
  applyState: (n) => app.applyState(n),
  getState: () => ({ lighting: app.lightingState }),
  statusText: '',
  promptText: '',
  hovered: null,
  sonarPing: 0,
  onSonar() {
    lights.fillControl.intensity = 1.6;
    window.setTimeout(() => {
      if (app.lightingState === 'cruising') lights.fillControl.intensity = lights._base.fillControl;
    }, 350);
  },
  onSilent() {},
};
const interact = createInteractions(interactCtx);
interact.bind();
for (const obj of sub.interactables) {
  interact.register(obj.userData.interact, obj, obj.userData.prompt);
}
app.interact = interact;

const post = createPost(renderer, scene, playerCam);
app.post = post;
app.sceneStats = { calls: 0, triangles: 0, points: 0, lines: 0 };
const _renderPassRender = post.renderPass.render.bind(post.renderPass);
post.renderPass.render = function renderPassSnap(...args) {
  renderer.info.reset();
  _renderPassRender(...args);
  app.sceneStats = {
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    points: renderer.info.render.points,
    lines: renderer.info.render.lines,
  };
};

const debug = createDebugAPI(app);
debug.ready = true;

const clock = new Clock();
let sonarAnim = null;
for (const a of sub.animators) {
  if (a.type === 'sonar') sonarAnim = a;
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  playerCam.aspect = w / h;
  playerCam.updateProjectionMatrix();
  debugCamera.aspect = w / h;
  debugCamera.updateProjectionMatrix();
  renderer.setSize(w, h);
  post.setSize(w, h);
}
window.addEventListener('resize', resize);

function simulate(dt) {
  player.update(dt);
  interact.update(dt);
  updateUnderwater(water, dt, app.motionEnabled, clock.elapsedTime);
  updateVista(vista, clock.elapsedTime);
  const mul = app.speedMul ?? 1;
  for (const a of sub.animators) {
    if (a.type === 'spin' && a.object) {
      a.object.rotation.z += dt * a.speed * mul;
    } else if (a.type === 'vibrate' && a.object) {
      if (a._baseY == null) a._baseY = a.object.position.y;
      a.object.position.y = a._baseY + Math.sin(clock.elapsedTime * 28) * a.amp * mul;
    } else if (a.type === 'needle' && a.object) {
      a.object.rotation.z = -0.4 + Math.sin(clock.elapsedTime * a.speed) * 0.12;
    }
  }
  if (sonarAnim && (interact.sonarPing > 0 || interact.sonarTime < 0.05)) {
    drawSonar(sonarAnim.tex, interact.sonarTime, interact.sonarPing);
  }
}

app.simulate = simulate;
let lastSim = performance.now();
let lastRaf = 0;
setInterval(() => {
  if (performance.now() - lastRaf < 80) return;
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastSim) / 1000);
  lastSim = now;
  clock.elapsedTime += dt;
  simulate(dt);
}, 50);

function tick(now) {
  lastRaf = now;
  const dt = Math.min(0.05, (now - lastSim) / 1000);
  lastSim = now;
  clock.elapsedTime += dt;
  simulate(dt);
  post.setCamera(app.activeCamera);
  const t0 = performance.now();
  post.render(dt);
  app.frameTimes.push(Math.max(performance.now() - t0, dt * 1000));
  if (app.frameTimes.length > 120) app.frameTimes.shift();
  requestAnimationFrame(tick);
}

player.syncCamera(0);
requestAnimationFrame(tick);

export { SEED, app };
