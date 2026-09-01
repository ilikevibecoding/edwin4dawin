import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildMaterials } from "./materials.js";
import { buildShip } from "./ship.js";
import { buildSpace } from "./space.js";
import { Player } from "./player.js";
import { Interactions } from "./interact.js";
import { createPost } from "./post.js";
import { createLightingController } from "./lighting.js";
import { createHUD } from "./hud.js";

// ---------------------------------------------------------------------------
// Renderer / scene
// ---------------------------------------------------------------------------
const canvas = document.getElementById("view");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", stencil: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.info.autoReset = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x0a0c10, 0.03);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 7000);
scene.add(camera);

const hud = createHUD();

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------
const materials = buildMaterials();
const ship = buildShip(scene, materials);
const space = buildSpace(scene);

const hemi = new THREE.HemisphereLight(0x5a6f86, 0x2a1f16, 0.18);
scene.add(hemi);

// Bootstrap environment (neutral room), replaced by a capture of the actual interior below.
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.2;

const lighting = createLightingController({ lights: ship.lights, materials, hemi });

const player = new Player(camera, canvas, ship.colliders);
player.setPose(0, -1.6, 0, 0);
player.onLockChange = (locked) => {
  if (locked) hud.hideStart();
  else if (!debugMode) hud.showStart();
};
hud.startEl.addEventListener("click", () => player.requestLock());

const interactions = new Interactions({ camera, interactables: ship.interactables, lighting, space, player, hud });

// Capture the finished interior into the environment map so metals reflect the real corridor.
function captureEnvironment() {
  const cubeRT = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType, generateMipmaps: false });
  const cubeCam = new THREE.CubeCamera(0.1, 60, cubeRT);
  cubeCam.position.set(0, 1.5, -8);
  const savedFog = scene.fog;
  scene.fog = null;
  space.root.visible = false;
  // keep the light fixtures from turning every metal into a blown-out mirror of them
  const emissives = [materials.emitTeal, materials.emitWarm, materials.emitOrange, materials.emitRed, materials.emitCool, materials.leds, ...materials.screens];
  const saved = emissives.map((m) => m.emissiveIntensity);
  emissives.forEach((m) => (m.emissiveIntensity *= 0.35));
  cubeCam.update(renderer, scene);
  emissives.forEach((m, i) => (m.emissiveIntensity = saved[i]));
  space.root.visible = true;
  scene.fog = savedFog;
  const env = pmrem.fromCubemap(cubeRT.texture).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.4;
  cubeRT.dispose();
}

// ---------------------------------------------------------------------------
// Post
// ---------------------------------------------------------------------------
const post = createPost(renderer, scene, camera);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  post.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Debug API (deterministic camera placement for screenshots)
// ---------------------------------------------------------------------------
let debugMode = false;
const VIEWS = {
  // standing in the cockpit doorway looking over the consoles at the windshield
  cockpit: { x: 0.0, z: -17.6, yaw: 0, pitch: -3, planet: 0, planetOffset: -14, time: 40 },
  // aft end of the corridor looking forward
  corridor: { x: 0.3, z: -0.9, yaw: 4, pitch: -2, planet: 0, planetOffset: 0, time: 40 },
  // inside the crew quarters looking at the bunk
  quarters: { x: -2.3, z: -6.3, yaw: 52, pitch: -8, planet: 1, planetOffset: 19, time: 40 },
  // nose to the port corridor porthole
  window: { x: -0.55, z: -12.55, yaw: 90, pitch: 2, planet: 0, planetOffset: -12, time: 40 },
  // extra QA views
  windshield: { x: 0.0, z: -18.3, yaw: 0, pitch: 2, planet: 0, planetOffset: -10, time: 40 },
  galley: { x: 2.3, z: -10.4, yaw: -70, pitch: -6, planet: 0, planetOffset: 0, time: 40 },
  bathroom: { x: 2.1, z: -3.9, yaw: -100, pitch: -4, planet: 0, planetOffset: 0, time: 40 },
  aft: { x: 0.2, z: -6.5, yaw: 180, pitch: -3, planet: 0, planetOffset: 0, time: 40 },
};

let framesRendered = 0;
let frameMs = 16;
const debugAPI = {
  ready: false,
  views: Object.keys(VIEWS),
  setView(name) {
    const v = VIEWS[name];
    if (!v) throw new Error("unknown view " + name);
    debugMode = true;
    hud.hideStart();
    player.headBob = false;
    player.frozen = true;
    player.setPose(v.x, v.z, v.yaw, v.pitch);
    const yaw = THREE.MathUtils.degToRad(v.yaw + (v.planetOffset || 0));
    space.setTime(v.time ?? 40);
    space.framePlanet(v.planet ?? 0, new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)));
    post.finalPass.uniforms.seed.value = 0.37;
    framesRendered = 0;
    return true;
  },
  // Place the player in front of an interactable, looking at it (for prompt / interaction tests)
  lookAt(id) {
    const poses = {
      bed: { x: -3.0, z: -7.6, yaw: 76, pitch: -40 },
      galley: { x: 3.4, z: -10.6, yaw: -78, pitch: -22 },
      bathroom: { x: 2.5, z: -3.7, yaw: -90, pitch: -43 },
    };
    const p = poses[id];
    if (!p) throw new Error("unknown interactable " + id);
    debugMode = true;
    hud.hideStart();
    player.headBob = false;
    player.frozen = false;
    player.locked = true; // simulate pointer lock for the interaction gate
    player.setPose(p.x, p.z, p.yaw, p.pitch);
    interactions.update();
    framesRendered = 0;
    return !!interactions.hovered;
  },
  hovered() {
    return interactions.hovered ? interactions.hovered.id : null;
  },
  interact(id) {
    return interactions.activate(id);
  },
  pressE() {
    document.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" }));
  },
  status() {
    return hud.statusText();
  },
  fadeOpacity() {
    return hud.fadeOpacity();
  },
  setRest(t) {
    lighting.setRest(t, true);
  },
  restLevel() {
    return lighting.rest;
  },
  frames() {
    return framesRendered;
  },
  getStats() {
    const info = renderer.info;
    return {
      frameMs: +frameMs.toFixed(2),
      fps: +(1000 / frameMs).toFixed(1),
      calls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs ? info.programs.length : 0,
      colliders: ship.colliders.length,
      lights: ship.lights.warm.length + ship.lights.cool.length + ship.lights.teal.length + ship.lights.spots.length,
    };
  },
  setPixelRatio(r) {
    renderer.setPixelRatio(r);
    renderer.setSize(window.innerWidth, window.innerHeight);
    post.setSize(window.innerWidth, window.innerHeight);
  },
  player,
  space,
  lighting,
  post,
  scene,
  renderer,
};
window.debugAPI = debugAPI;

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------
let showStats = false;
document.addEventListener("keydown", (e) => {
  if (e.code === "F3") {
    showStats = !showStats;
    hud.toggleStats(showStats);
  }
});

const timer = new THREE.Timer();
let envCaptured = false;
let last = performance.now();

function frame() {
  requestAnimationFrame(frame);
  const now = performance.now();
  frameMs += (now - last - frameMs) * 0.1;
  last = now;
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.1);
  const t = timer.getElapsed();
  renderer.info.reset();

  if (!envCaptured && framesRendered >= 2) {
    captureEnvironment();
    envCaptured = true;
  }

  player.update(dt);
  space.update(dt);
  lighting.update(dt);
  interactions.update();

  if (debugAPI.directRender) renderer.render(scene, camera);
  else post.render(t);
  framesRendered++;
  if (showStats) {
    const s = debugAPI.getStats();
    hud.setStats(`${s.fps} fps  ${s.frameMs} ms\n${s.calls} calls  ${(s.triangles / 1000).toFixed(1)}k tris\n${s.lights} lights`);
  }
}

debugAPI.ready = true;
frame();
