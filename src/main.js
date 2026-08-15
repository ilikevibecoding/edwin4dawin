import * as THREE from "three";
import { GLOBAL_SEED } from "./rng.js";
import { createMaterials, createDisplayTexture, setWearAmount } from "./materials.js";
import { CollisionWorld } from "./collision.js";
import { buildSubmarine } from "./submarine.js";
import { buildControlRoom } from "./controlRoom.js";
import { buildCorridor } from "./corridor.js";
import { buildCrewQuarters } from "./crewQuarters.js";
import { buildEngineRoom } from "./engineRoom.js";
import { buildUnderwater } from "./water.js";
import { createReflectionEnv, buildLights, applyLightingState, createInteriorFog } from "./environment.js";
import { createPost } from "./post.js";
import { Player } from "./player.js";
import { InteractionSystem } from "./interact.js";
import { installDebugAPI } from "./debug.js";

const canvas = document.getElementById("c");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const gl = renderer.getContext();
const dbgExt = gl.getExtension?.("WEBGL_debug_renderer_info");
const rendererName = dbgExt ? gl.getParameter(dbgExt.UNMASKED_RENDERER_WEBGL) : "";
const softwareRenderer = /swiftshader|llvmpipe|softpipe|software/i.test(rendererName);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07080a);
scene.fog = createInteriorFog();

const camera = new THREE.PerspectiveCamera(66, window.innerWidth / window.innerHeight, 0.05, 120);
camera.position.set(0, 1.7, 2.4);

const ctx = {
  scene,
  seed: GLOBAL_SEED,
  interactables: [],
  rooms: {},
  displays: {},
  spinners: [],
  lights: null,
  time: 0,
  sonarSweep: 0,
  spinScale: 1,
  events: [],
  lastStatus: "",
  hoverId: null,
  submarineState: "cruising",
  requestedState: "cruising",
};

setWearAmount(0.85);
const mats = createMaterials();
ctx.displays.sonar = createDisplayTexture("sonar", 0);
ctx.displays.nav = createDisplayTexture("nav", 0);
ctx.displays.depth = createDisplayTexture("depth", 0);
ctx.displays.status = createDisplayTexture("status", 0);
ctx.displays.helm = createDisplayTexture("helm", 0);

const envMap = createReflectionEnv(renderer);
scene.environment = envMap;
Object.values(mats).forEach((m) => {
  if (m && m.isMaterial && "envMap" in m) m.envMap = envMap;
});

const collision = new CollisionWorld();
const hull = buildSubmarine(mats, collision);
scene.add(hull);
scene.add(buildControlRoom(mats, collision, ctx));
scene.add(buildCorridor(mats, collision, ctx));
scene.add(buildCrewQuarters(mats, collision, ctx));
scene.add(buildEngineRoom(mats, collision, ctx));

const water = buildUnderwater(mats, renderer);
scene.add(water);

buildLights(scene, ctx);
applyLightingState(ctx, "cruising");

const player = new Player(camera, collision, canvas);
const interact = new InteractionSystem(camera, ctx);
const post = createPost(renderer, scene, camera, { software: softwareRenderer });

const frameTimes = [];
const clock = new THREE.Clock();

const app = {
  renderer,
  scene,
  camera,
  player,
  interact,
  ctx,
  clock,
  frameTimes,
  motionEnabled: true,
  viewName: "walking",
  fixedTime: 0,
  frameId: 0,
  softwareRenderer,
  lastInfo: { calls: 0, triangles: 0, points: 0, lines: 0 },
};

installDebugAPI(app);
window.debugAPI.ready = true;

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  post.setSize(w, h);
}
window.addEventListener("resize", resize);

let displayTick = 0;
function updateDisplays(t) {
  displayTick += 1;
  const dirty = ctx.sonarSweep > 0 || displayTick % 4 === 0;
  if (!dirty) return;
  const sonarT = ctx.sonarSweep > 0 ? t * 3.2 : t * 0.25;
  ctx.displays.sonar.draw(sonarT);
  ctx.displays.sonar.texture.needsUpdate = true;
  if (displayTick % 8 === 0) {
    ctx.displays.nav.draw(t);
    ctx.displays.nav.texture.needsUpdate = true;
    ctx.displays.depth.draw(t);
    ctx.displays.depth.texture.needsUpdate = true;
    ctx.displays.status.draw(t);
    ctx.displays.status.texture.needsUpdate = true;
    ctx.displays.helm.draw(t);
    ctx.displays.helm.texture.needsUpdate = true;
  }
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = app.motionEnabled ? clock.elapsedTime : 12.0;
  ctx.time = t;
  player.update(dt);
  interact.update(dt);
  updateDisplays(t);
  const spin = ctx.spinScale;
  ctx.spinners.forEach((obj) => {
    const node = obj.userData.spin;
    if (node) node.rotation.z += dt * (obj.userData.speed || 4) * spin;
    obj.traverse((c) => {
      if (c.userData?.spin) c.userData.spin.rotation.z += dt * (c.userData.speed || 4) * spin;
    });
  });
  if (water.userData.update) water.userData.update(t, app.motionEnabled);
  if (app.motionEnabled) {
    hull.rotation.z = Math.sin(t * 0.18) * 0.004;
    hull.rotation.x = Math.sin(t * 0.13) * 0.003;
  } else {
    hull.rotation.set(0, 0, 0);
  }
  renderer.info.reset();
  post.render(dt);
  app.lastInfo = {
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    points: renderer.info.render.points,
    lines: renderer.info.render.lines,
  };
  app.frameId += 1;
  frameTimes.push(dt * 1000);
  if (frameTimes.length > 180) frameTimes.shift();
  requestAnimationFrame(tick);
}

tick();

export { app };
