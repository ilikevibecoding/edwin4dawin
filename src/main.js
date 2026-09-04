import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildMaterials } from "./materials.js";
import { buildSpace } from "./space.js";
import { buildExterior } from "./exterior/hull.js";
import { buildInterior } from "./interior/registry.js";
import { createTraffic } from "./hangar/traffic.js";
import { LightPool } from "./lightPool.js";
import { Player } from "./player.js";
import { Interactions } from "./interact.js";
import { createPost } from "./post.js";
import { createLightingController } from "./lighting.js";
import { createHUD } from "./hud.js";
import { OrbitCamera } from "./camera/orbit.js";
import { ModeManager, BOARD_POSE } from "./camera/modes.js";
import { createReservedSystems } from "./systems/reserved.js";
import { createAudio } from "./audio/ambience.js";
import { PerfMonitor } from "./perf.js";
import { createTouchControls, isTouchDevice } from "./touch.js";
import { LEGACY_WING, ROOMS } from "./config/shipSpec.js";

// ---------------------------------------------------------------------------
// Renderer / scene
// ---------------------------------------------------------------------------
const canvas = document.getElementById("view");
const TOUCH = isTouchDevice();
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", stencil: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, TOUCH ? 1.0 : 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; // only the pooled interior spots cast; the exterior sun is a material term
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.info.autoReset = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
// interior haze; exterior materials opt out (fog: false)
scene.fog = new THREE.FogExp2(0x0a0c10, 0.012);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 60000);
scene.add(camera);

const hud = createHUD();
const perf = new PerfMonitor(renderer, scene);

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------
const materials = buildMaterials();
const space = buildSpace(scene);
// the far field was authored around a 16 m ship; the Star Destroyer is 1.6 km, so push it out 12x
const SPACE_SCALE = 12;
space.root.scale.setScalar(SPACE_SCALE);
const exterior = buildExterior(scene);
const interior = buildInterior({ scene, materials });
const audio = createAudio();
interior.doors.audio = audio;
interior.lifts.audio = audio;
const traffic = createTraffic({ scene, count: 6, audio });
const pool = new LightPool(scene, { points: 14, spots: 3 });

const hemi = new THREE.HemisphereLight(0x5a6f86, 0x3a2f26, 0.16);
scene.add(hemi);

// Bootstrap environment (neutral room), replaced by a capture of the actual interior below.
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.2;

const lighting = createLightingController({ lights: () => interior.fixturesByFamily(), materials, hemi });

const player = new Player(camera, canvas, interior.colliders(), interior.floors());
player.onLockChange = (locked) => {
  if (locked) {
    hud.hideStart();
    audio.resume();
  } else if (!debugMode && modes.mode === "interior" && !TOUCH) hud.showStart();
};
hud.startEl.addEventListener("click", () => {
  audio.resume();
  if (TOUCH) hud.hideStart();
  else player.requestLock();
});
canvas.addEventListener("click", () => {
  audio.resume();
  if (modes.mode === "interior" && !player.locked && !TOUCH) player.requestLock();
});

const interactions = new Interactions({ camera, interactables: interior.interactables, lighting, space, player, hud });
const orbit = new OrbitCamera(camera, canvas);
const modes = new ModeManager({ camera, player, orbit, interior, exterior, hud, space, traffic });
const touch = TOUCH ? createTouchControls({ canvas, player, orbit, modes, interactions, hud }) : null;
if (TOUCH) hud.setTouch(true);
const reserved = createReservedSystems();
reserved.attach({ scene, interior, exterior, traffic, camera, player });

function refreshZone(zoneId) {
  player.colliders = interior.colliders();
  player.floors = interior.floors();
  pool.setFixtures(interior.fixtures(), interior.spotFixtures());
  audio.setZone(zoneId);
}
interior.onZoneChange = refreshZone;
interior.onSpaceChange = (sp) => {
  hud.setLocation(sp ? `${sp.spec.name || sp.id} · ${sp.deck ? "Deck " + sp.deck : ""}` : "");
  pool.setContext(sp ? sp.id : null, interior.state.visible);
  if (modes.mode === "interior") exterior.setInteriorView(interior.exteriorWindows());
};
modes.onModeChange = (mode) => {
  audio.setZone(mode === "exterior" ? "exterior" : interior.state.zone);
  if (mode === "exterior") exterior.group.visible = true;
  else {
    exterior.setInteriorView(interior.exteriorWindows());
    if (!player.locked && !debugMode && !TOUCH) hud.showStart();
  }
};
refreshZone(interior.state.zone);

// Capture the finished interior into the environment map so metals reflect a real Imperial corridor.
function captureEnvironment() {
  const cubeRT = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType, generateMipmaps: false });
  const cubeCam = new THREE.CubeCamera(0.1, 80, cubeRT);
  cubeCam.position.set(0, 266.5, 520); // command-deck spine corridor
  const savedFog = scene.fog;
  const savedInterior = interior.root.visible;
  const savedExterior = exterior.group.visible;
  const savedVis = new Map();
  scene.fog = null;
  space.root.visible = false;
  exterior.group.visible = false;
  traffic.group.visible = false;
  interior.root.visible = true;
  for (const sp of interior.activeZone.spaces) {
    savedVis.set(sp, sp.group.visible);
    sp.group.visible = true;
  }
  const emissives = Object.entries(materials)
    .filter(([k, m]) => k.startsWith("emit") && m.isMaterial)
    .map(([, m]) => m)
    .concat([materials.leds, ...materials.screens]);
  const saved = emissives.map((m) => m.emissiveIntensity);
  emissives.forEach((m) => (m.emissiveIntensity *= 0.25));
  pool.settle(cubeCam.position);
  cubeCam.update(renderer, scene);
  emissives.forEach((m, i) => (m.emissiveIntensity = saved[i]));
  for (const [sp, v] of savedVis) sp.group.visible = v;
  space.root.visible = true;
  exterior.group.visible = savedExterior;
  traffic.group.visible = true;
  interior.root.visible = savedInterior;
  scene.fog = savedFog;
  const env = pmrem.fromCubemap(cubeRT.texture).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.45;
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
// Adaptive quality: hold 60 fps on mid-range GPUs by stepping render resolution and AO quality,
// never by removing content. Steps down after ~0.5 s of slow frames, back up after ~10 s of headroom.
// ---------------------------------------------------------------------------
const QUALITY_LEVELS = [
  { ratio: 0.66, ao: "Low" },
  { ratio: 0.8, ao: "Low" },
  { ratio: 1.0, ao: "Medium" },
  { ratio: Math.min(window.devicePixelRatio, TOUCH ? 1.0 : 1.5), ao: "Medium" },
];
// phones start low and climb only if they keep up
const quality = { level: TOUCH ? 0 : QUALITY_LEVELS.length - 1, slow: 0, fast: 0, enabled: true };
function applyQuality() {
  const q = QUALITY_LEVELS[quality.level];
  renderer.setPixelRatio(q.ratio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  post.setSize(window.innerWidth, window.innerHeight);
  post.ao.setQualityMode(q.ao);
}
if (TOUCH) applyQuality();
function updateQuality(dt) {
  if (!quality.enabled) return;
  if (dt > 1 / 52) {
    quality.slow++;
    quality.fast = 0;
  } else if (dt < 1 / 75) {
    quality.fast++;
    quality.slow = 0;
  }
  if (quality.slow > 30 && quality.level > 0) {
    quality.level--;
    quality.slow = 0;
    applyQuality();
  } else if (quality.fast > 600 && quality.level < QUALITY_LEVELS.length - 1) {
    quality.level++;
    quality.fast = 0;
    applyQuality();
  }
}

// ---------------------------------------------------------------------------
// Debug API (deterministic camera placement for screenshots and checks)
// ---------------------------------------------------------------------------
let debugMode = false;
const W = LEGACY_WING;
// legacy views (wing-local coordinates from the freighter phase, offset into the command deck)
const LEGACY_VIEWS = {
  cockpit: { x: 0.0, z: -17.1, yaw: 0, pitch: -4, planet: 0, planetOffset: -12, time: 40 },
  corridor: { x: 0.4, z: -1.3, yaw: 12, pitch: -2, planet: 1, planetOffset: 51, time: 40 },
  quarters: { x: -2.3, z: -6.3, yaw: 52, pitch: -8, planet: 1, planetOffset: 26, time: 40 },
  window: { x: -0.55, z: -12.55, yaw: 90, pitch: 2, planet: 0, planetOffset: -12, time: 40 },
  windshield: { x: 0.0, z: -18.3, yaw: 0, pitch: 2, planet: 0, planetOffset: -10, time: 40 },
  galley: { x: 2.3, z: -10.4, yaw: -70, pitch: -6, planet: 0, planetOffset: 0, time: 40 },
  bathroom: { x: 2.1, z: -3.9, yaw: -100, pitch: -4, planet: 0, planetOffset: 0, time: 40 },
  aft: { x: 0.2, z: -6.5, yaw: 180, pitch: -3, planet: 0, planetOffset: 0, time: 40 },
};
const VIEWS = {};
for (const [k, v] of Object.entries(LEGACY_VIEWS)) VIEWS[k] = { ...v, x: v.x + W.x, z: v.z + W.z, y: W.y, zone: "tower", kind: "interior" };
// one view per room / corridor from the registry
for (const id of [...interior.roomIds, ...interior.corridorIds]) {
  const v = interior.viewFor(id);
  if (v) VIEWS["room:" + id] = { ...v, kind: "interior", planet: 0, planetOffset: 0, time: 40 };
}
// hand-placed interior views
VIEWS.bridge = { x: 0, z: 490.5, y: 265, yaw: 0, pitch: -3, zone: "tower", kind: "interior", planet: 0, planetOffset: -10, time: 40 };
VIEWS.bridgeAft = { x: 0, z: 474, y: 265, yaw: 180, pitch: -4, zone: "tower", kind: "interior", planet: 0, planetOffset: 0, time: 40 };
VIEWS.hangarDeck = { x: -26, z: 465, y: -80, yaw: -70, pitch: 4, zone: "hangar", kind: "interior", planet: 0, planetOffset: 0, time: 40 };
VIEWS.hangarWell = { x: -21.5, z: 500, y: -80, yaw: -35, pitch: -18, zone: "hangar", kind: "interior", planet: 1, planetOffset: 0, time: 40 };
// exterior views (yaw: camera bearing around +Y measured from +Z, so ~2.2 is a forward-starboard quarter)
VIEWS.ext_far = { kind: "exterior", target: [0, 40, 0], distance: 5200, yaw: 2.3, pitch: 0.22, planet: 0, planetOffset: 40, time: 40 };
VIEWS.ext_mid = { kind: "exterior", target: [0, 60, 200], distance: 2300, yaw: 1.75, pitch: 0.3, planet: 1, planetOffset: 60, time: 40 };
VIEWS.ext_close = { kind: "exterior", target: [-200, 80, 300], distance: 320, yaw: 2.0, pitch: 0.35, planet: 0, planetOffset: 0, time: 40 };
VIEWS.ext_tower = { kind: "exterior", target: [0, 260, 530], distance: 600, yaw: 2.6, pitch: 0.15, planet: 0, planetOffset: 0, time: 40 };
VIEWS.ext_bridgeFace = { kind: "exterior", target: [0, 268, 470], distance: 140, yaw: Math.PI, pitch: 0.05, planet: 0, planetOffset: 0, time: 40 };
VIEWS.ext_belly = { kind: "exterior", target: [0, -82, 465], distance: 600, yaw: 2.4, pitch: -0.75, planet: 1, planetOffset: 0, time: 40 };
VIEWS.ext_stern = { kind: "exterior", target: [0, 20, 800], distance: 1300, yaw: 0.35, pitch: 0.15, planet: 0, planetOffset: 0, time: 40 };
VIEWS.ext_bow = { kind: "exterior", target: [0, 0, -600], distance: 1500, yaw: 2.9, pitch: 0.3, planet: 0, planetOffset: 0, time: 40 };

let framesRendered = 0;
let pendingCapture = null;
const debugAPI = {
  ready: false,
  views: Object.keys(VIEWS),
  setView(name) {
    const v = VIEWS[name];
    if (!v) throw new Error("unknown view " + name);
    debugMode = true;
    quality.enabled = false; // deterministic resolution for screenshots
    hud.hideStart();
    player.headBob = false;
    if (v.kind === "exterior") {
      modes.setExterior({ target: v.target, distance: v.distance, yaw: v.yaw, pitch: v.pitch });
      orbit.update(0);
    } else {
      modes.setInterior({ x: v.x, z: v.z, y: v.y, yaw: v.yaw, pitch: v.pitch, zone: v.zone });
      player.frozen = true;
    }
    camera.updateMatrixWorld(true);
    // frame the requested planet relative to where the camera looks (XZ bearing + offset)
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, -1);
    dir.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(v.planetOffset || 0));
    space.setTime(v.time ?? 40);
    space.framePlanet(v.planet ?? 0, dir);
    exterior.update(camera.position, space.sunWorld);
    pool.settle(camera.position);
    post.finalPass.uniforms.seed.value = 0.37;
    debugAPI.freezeGrain = true;
    framesRendered = 0;
    return true;
  },
  setMode(mode) {
    debugMode = true;
    if (mode === "exterior") modes.setExterior();
    else modes.setInterior();
    framesRendered = 0;
  },
  board() {
    modes.boardShip();
  },
  exitShip() {
    modes.exitToExterior();
  },
  mode() {
    return modes.mode;
  },
  transitionProgress() {
    return modes.transition ? modes.transition.t : null;
  },
  // Teleport inside the active zone (x, z; y from floors) and settle lights
  teleport(x, z, yaw = 0, pitch = 0) {
    player.setPose(x, z, yaw, pitch);
    interior.update(0, player);
    pool.settle(camera.position);
    framesRendered = 0;
  },
  // Place the player inside the named lift car and start the ride to the next deck
  ride(liftId) {
    const lift = interior.lifts.lifts.find((l) => l.id === liftId);
    if (!lift) throw new Error("unknown lift " + liftId);
    const s = lift.spec;
    player.frozen = false;
    player.locked = true;
    player.setPose((s.x0 + s.x1) / 2, (s.z0 + s.z1) / 2, 0, 0, lift.decks[lift.deckIndex].y);
    interior.update(0, player);
    return interior.lifts.travelNext(lift);
  },
  liftState(liftId) {
    return interior.lifts.serialize().find((l) => l.id === liftId);
  },
  spaceId() {
    return interior.state.space;
  },
  zone() {
    return interior.state.zone;
  },
  setZone(z) {
    interior.setActiveZone(z);
    refreshZone(z);
  },
  doors() {
    return interior.doors.serialize();
  },
  trafficState() {
    return { counts: traffic.counts(), states: traffic.serialize() };
  },
  reserved() {
    return reserved.describe();
  },
  rooms() {
    return ROOMS.map((r) => ({ id: r.id, name: r.name, deck: r.deck, built: !!interior.spaces[r.id] }));
  },
  connectivity() {
    return interior.connectivity("bridge");
  },
  audioLog() {
    return audio.log.slice(-20);
  },
  // Advance only the sky (stars / planets / dust) by dt seconds; interior stays put. For drift measurement.
  advanceSky(dt) {
    space.setTime(space.state.time + dt);
    space.update(0, camera.position);
    framesRendered = 0;
  },
  // Advance simulation systems (lifts, doors, traffic, machinery) by dt seconds without moving the camera
  advanceSim(dt) {
    const step = 1 / 30;
    for (let t = 0; t < dt; t += step) {
      if (modes.mode === "interior") player.update(step);
      interior.update(step, player);
      traffic.update(step);
      modes.update(step);
    }
    framesRendered = 0;
  },
  // Resolve with RGBA bytes of a screen region (CSS px) from the next rendered frame.
  capturePixels(x, y, w, h) {
    return new Promise((resolve) => {
      pendingCapture = { x, y, w, h, resolve };
    });
  },
  freezeGrain: false,
  // PNG data URL of a material's albedo canvas (texture QA)
  textureDataURL(name) {
    const m = materials[name];
    const img = m && m.map && m.map.image;
    return img && img.toDataURL ? img.toDataURL("image/png") : null;
  },
  // Place the player in front of an interactable, looking at it (for prompt / interaction tests)
  lookAt(id) {
    const poses = {
      bed: { x: -3.0 + W.x, z: -7.6 + W.z, yaw: 76, pitch: -40 },
      galley: { x: 3.4 + W.x, z: -10.6 + W.z, yaw: -78, pitch: -22 },
      bathroom: { x: 2.5 + W.x, z: -3.7 + W.z, yaw: -90, pitch: -43 },
    };
    const p = poses[id];
    if (!p) throw new Error("unknown interactable " + id);
    debugMode = true;
    quality.enabled = false;
    hud.hideStart();
    player.headBob = false;
    modes.setInterior({ x: p.x, z: p.z, y: W.y, yaw: p.yaw, pitch: p.pitch, zone: "tower" });
    player.frozen = false;
    player.locked = true; // simulate pointer lock for the interaction gate
    interactions.update();
    pool.settle(camera.position);
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
    return {
      ...perf.stats(),
      colliders: player.colliders.length,
      floors: player.floors.length,
      lights: pool.activeCount,
      fixtures: interior.fixtures().length,
      zone: interior.state.zone,
      space: interior.state.space,
      mode: modes.mode,
      exteriorDetail: exterior.stats.visibleDetail,
      zoneBuildMs: interior.stats.buildMs,
      traffic: traffic.counts(),
      qualityLevel: quality.level,
      pixelRatio: renderer.getPixelRatio(),
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
  interior,
  exterior,
  traffic,
  modes,
  pool,
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

function frame() {
  requestAnimationFrame(frame);
  const now = performance.now();
  perf.beginFrame(now);
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.1);
  const t = timer.getElapsed();
  renderer.info.reset();

  if (!envCaptured && framesRendered >= 2) {
    perf.timeCompile(() => captureEnvironment());
    envCaptured = true;
  }

  modes.update(dt);
  if (modes.mode === "interior") {
    player.update(dt);
    interior.update(dt, player);
    interactions.update();
  } else if (modes.mode === "transition") {
    interior.update(dt, player);
  }
  traffic.update(dt);
  space.update(dt, camera.position);
  exterior.update(camera.position, space.sunWorld);
  lighting.update(dt);
  pool.update(camera.position, dt);
  reserved.update(dt);
  audio.setListener(camera.position);
  if (framesRendered > 60) updateQuality(dt);
  if (touch) touch.update();

  if (debugAPI.directRender) renderer.render(scene, camera);
  else post.render(debugAPI.freezeGrain ? 0.37 : t);
  framesRendered++;
  if (pendingCapture) {
    // copy the freshly presented frame synchronously (valid without preserveDrawingBuffer)
    const { x, y, w, h, resolve } = pendingCapture;
    pendingCapture = null;
    const c2 = document.createElement("canvas");
    c2.width = w;
    c2.height = h;
    const ctx = c2.getContext("2d");
    const pr = renderer.getPixelRatio();
    ctx.drawImage(canvas, x * pr, y * pr, w * pr, h * pr, 0, 0, w, h);
    resolve(Array.from(ctx.getImageData(0, 0, w, h).data));
  }
  if (showStats) {
    const s = debugAPI.getStats();
    hud.setStats(`${s.fps} fps  ${s.frameMs} ms (p95 ${s.p95Ms})  js ${s.jsMs} ms\n${s.calls} calls  ${(s.triangles / 1000).toFixed(1)}k tris  ${s.visibleObjects} objects\n${s.lights} lights / ${s.fixtures} fixtures  tex ${s.textureMemMB} MB${s.heapMB ? "  heap " + s.heapMB + " MB" : ""}\n${s.mode} · ${s.zone} · ${s.space || "-"}`);
  }
  perf.endFrame(performance.now());
}

// start outside, looking at the ship; B / V boards
modes.setExterior();
perf.markReady();
debugAPI.ready = true;
frame();

// stream the other zones in while the player looks at the exterior, so lift rides never build on arrival
const prebuild = ["engineering", "hangar"];
function prebuildNext() {
  const z = prebuild.shift();
  if (!z) return;
  interior.buildZone(z);
  setTimeout(prebuildNext, 1500);
}
setTimeout(prebuildNext, 2500);
