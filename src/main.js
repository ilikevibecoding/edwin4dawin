import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildMaterials } from "./materials.js";
import { buildSpace } from "./space.js";
import { buildExterior } from "./exterior/hull.js";
import { RoomManager } from "./core/room.js";
import { ROOM_BUILDERS } from "./rooms/index.js";
import { ROOMS, ROOM_BY_ID, CLUSTERS, BOARDING } from "./core/layout.js";
import { DoorSystem } from "./systems/doors.js";
import { LiftSystem } from "./systems/lifts.js";
import { Player } from "./systems/player.js";
import { CameraRig } from "./systems/camera.js";
import { Modes } from "./systems/transitions.js";
import { AudioSystem } from "./systems/audio.js";
import { SyncState } from "./systems/sync.js";
import { Interactions } from "./interact.js";
import { createPost } from "./post.js";
import { createLightingController } from "./lighting.js";
import { createHUD } from "./hud.js";
import { SYSTEMS } from "./core/systems.js";
import { createFighters } from "./fighters/index.js";
import { createAtmosphere } from "./systems/atmosphere.js";
import { TouchControls, isTouchDevice } from "./systems/touch.js";
import { FlightState } from "./systems/flight.js";

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const bootT0 = performance.now();
const timings = {};

// ---------------------------------------------------------------------------
// Renderer / scene
// ---------------------------------------------------------------------------
const canvas = document.getElementById("view");
const TOUCH = isTouchDevice();
const MOBILE = TOUCH; // render profile follows the input class, not the window size
if (TOUCH) document.body.classList.add("touch");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", stencil: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, MOBILE ? 1.0 : 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.info.autoReset = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 40000);
scene.add(camera);

const hud = createHUD();
hud.setLoading(0.02, "Generating plating, decals and screens…");
await nextFrame();

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------
let t0 = performance.now();
const materials = buildMaterials({ mobile: MOBILE });
timings.materials = +(performance.now() - t0).toFixed(0);
hud.setLoading(0.35, "Laying down 1,600 m of hull…");
await nextFrame();

t0 = performance.now();
const space = buildSpace(scene);
timings.space = +(performance.now() - t0).toFixed(0);

t0 = performance.now();
const exterior = buildExterior(scene, materials);
timings.exterior = +(performance.now() - t0).toFixed(0);
hud.setLoading(0.6, "Powering the command tower…");
await nextFrame();

// sun + fill
const sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
sun.castShadow = true;
sun.shadow.mapSize.set(MOBILE ? 2048 : 4096, MOBILE ? 2048 : 4096);
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.6;
scene.add(sun);
scene.add(sun.target);
// ground colour lifts ceilings and undersides out of black (hemi ground lights downward-facing surfaces)
const hemi = new THREE.HemisphereLight(0x56637a, 0x2a2e36, 0.45);
scene.add(hemi);

// environment: neutral room bootstrap, then a space capture for the hull and an interior capture per cluster
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.25;
{
  // the hull reflects space (planet glow, star field), never the interior captures
  const cubeRT = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType, generateMipmaps: false });
  const cubeCam = new THREE.CubeCamera(1, 20000, cubeRT);
  cubeCam.position.set(0, 300, -300);
  exterior.group.visible = false;
  space.root.position.copy(cubeCam.position);
  cubeCam.update(renderer, scene);
  exterior.group.visible = true;
  const spaceEnv = pmrem.fromCubemap(cubeRT.texture).texture;
  for (const k of ["hull", "hullDark"]) {
    materials[k].envMap = spaceEnv;
    materials[k].envMapIntensity = 0.35;
    materials[k].needsUpdate = true;
  }
  cubeRT.dispose();
  window.__spaceEnv = spaceEnv;
}
const spaceEnv = window.__spaceEnv;
const bootstrapEnv = scene.environment;

const audio = new AudioSystem();
const fighters = createFighters({ scene, materials, audio });
const doors = new DoorSystem({ scene, materials, audio, onStatus: (s) => hud.setStatus(s) });
const rooms = new RoomManager({
  scene,
  materials,
  builders: ROOM_BUILDERS,
  doorSystem: doors,
  onRoomChange: (def, prev) => {
    hud.roomToast(def.title.toUpperCase(), `${def.cluster.toUpperCase()} · DECK ${def.floor} m`);
    audio.setRoom(def); // the audio layer's per-room ambience table is authoritative
    fitSunShadow();
  },
});
rooms.lightBudget = MOBILE ? 8 : 12;
rooms.spotBudget = MOBILE ? 2 : 4;
const player = new Player(camera, canvas, rooms.activeColliders);
const lifts = new LiftSystem({ scene, materials, player, hud, audio });
lifts.attach(rooms);
const rig = new CameraRig(camera, canvas);
const lighting = createLightingController({ materials, rooms, hemi, audio });
const modes = new Modes({ camera, player, rig, rooms, hud, scene, sun, space, exterior, onMode: onModeChange });
modes.precompile = () => renderer.compileAsync(scene, camera).catch(() => {});
const flight = new FlightState();
const interactions = new Interactions({ camera, rooms, lighting, space, player, hud, audio });
const sync = new SyncState({ doors, lifts, lighting, traffic: fighters.traffic });
const atmosphere = createAtmosphere({ scene, camera, materials, rooms });
Object.assign(SYSTEMS, { fighters, audio, hud, rooms, doors, lifts, lighting, exterior, space, camera, player, flight, precompile: modes.precompile });

player.floorRef = null; // updated each frame from the current room (fall tether is room-relative)
player.onFall = () => {
  const def = rooms.current || ROOM_BY_ID.bridge;
  const s = def.spawn;
  player.setPose(s[0], s[1], s[2], s[3]);
  hud.setStatus("Safety tether engaged — returned to the deck.");
};
player.onLockChange = (locked) => {
  if (locked) {
    hud.hideStart();
    audio.start();
  } else if (!debugMode && modes.isInterior) hud.showStart();
};
hud.startEl.addEventListener("click", () => {
  audio.start();
  if (modes.isInterior) player.requestLock();
  else hud.hideStart();
  // phones: go full screen for an immersive view (ignored where unsupported, e.g. iOS Safari)
  if (TOUCH && document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
});

// ---------------------------------------------------------------------------
// Sun shadow frustum: whole ship outside, the current cluster inside
// ---------------------------------------------------------------------------
const sunDir = new THREE.Vector3();
function fitSunShadow() {
  const cam = sun.shadow.camera;
  if (modes.isInterior && rooms.current) {
    const c = rooms.current;
    const cx = (c.box[0] + c.box[1]) / 2;
    const cz = (c.box[2] + c.box[3]) / 2;
    const cy = c.floor;
    const R = c.cluster === "tower" ? 260 : 200;
    sun.target.position.set(cx, cy, cz);
    cam.left = -R;
    cam.right = R;
    cam.top = R;
    cam.bottom = -R;
    cam.near = 1;
    cam.far = 1200;
    sun.position.copy(sunDir).multiplyScalar(500).add(sun.target.position);
  } else {
    sun.target.position.set(0, 0, -200);
    cam.left = -1000;
    cam.right = 1000;
    cam.top = 1000;
    cam.bottom = -1000;
    cam.near = 1;
    cam.far = 5000;
    sun.position.copy(sunDir).multiplyScalar(2500).add(sun.target.position);
  }
  cam.updateProjectionMatrix();
}

function onModeChange(mode) {
  fitSunShadow();
  hud.showCrosshair(mode === "interior");
  if (post) post.setMode(mode);
  hud.setStartMode(mode);
  if (touchControls) touchControls.setMode(mode);
  if (mode === "exterior") {
    // shared materials (glass, trim) reflect space again instead of the last interior capture
    scene.environment = spaceEnv || bootstrapEnv;
    scene.environmentIntensity = 0.3;
    envCluster = null;
  }
}

// ---------------------------------------------------------------------------
// Post
// ---------------------------------------------------------------------------
const post = createPost(renderer, scene, camera);
const touchControls = TOUCH ? new TouchControls({ player, rig, modes, hud, audio, interactions }) : null;

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  post.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Adaptive quality (pixel ratio + AO quality); never removes content
// ---------------------------------------------------------------------------
const QUALITY_LEVELS = MOBILE
  ? [
      { ratio: 0.5, ao: "Performance" },
      { ratio: 0.66, ao: "Low" },
      { ratio: 0.85, ao: "Low" },
    ]
  : [
      { ratio: 0.66, ao: "Low" },
      { ratio: 0.8, ao: "Low" },
      { ratio: 1.0, ao: "Medium" },
      { ratio: Math.min(window.devicePixelRatio, 1.5), ao: "Medium" },
    ];
const quality = { level: MOBILE ? 1 : QUALITY_LEVELS.length - 1, slow: 0, fast: 0, enabled: true };
if (MOBILE) applyQuality();
function applyQuality() {
  const q = QUALITY_LEVELS[quality.level];
  renderer.setPixelRatio(q.ratio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  post.setSize(window.innerWidth, window.innerHeight);
  // AO quality + bloom chain resolution scale together (mobile has 3 levels, desktop 4)
  if (post.setQuality) post.setQuality(MOBILE ? quality.level : quality.level);
  else post.ao.setQualityMode(q.ao);
}
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
// Environment capture of the current cluster (metals reflect their own room)
// ---------------------------------------------------------------------------
let envCluster = null;
let envRT = null;
function captureEnvironment() {
  if (!modes.isInterior || !rooms.current) return;
  const c = rooms.current;
  if (envCluster === c.cluster) return;
  envCluster = c.cluster;
  const cubeRT = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType, generateMipmaps: false });
  const cubeCam = new THREE.CubeCamera(0.1, 80, cubeRT);
  const s = c.spawn;
  cubeCam.position.set(s[0], s[1] + 1.6, s[2]);
  const savedFog = scene.fog;
  scene.fog = null;
  space.root.visible = false;
  space.root.position.copy(cubeCam.position);
  const em = ["emitWhite", "emitWhiteSoft", "emitRed", "emitBlue", "emitAmber", "emitCyan", "emitViolet", "emitGreen", "screen", "leds"].map((k) => materials[k]);
  const saved = em.map((m) => m.emissiveIntensity);
  em.forEach((m) => (m.emissiveIntensity *= 0.3));
  cubeCam.update(renderer, scene);
  em.forEach((m, i) => (m.emissiveIntensity = saved[i]));
  space.root.visible = true;
  scene.fog = savedFog;
  const rt = pmrem.fromCubemap(cubeRT.texture);
  scene.environment = rt.texture;
  scene.environmentIntensity = 0.45;
  if (envRT) envRT.dispose(); // the previous cluster's PMREM (a leak otherwise)
  envRT = rt;
  cubeRT.dispose();
}

// ---------------------------------------------------------------------------
// Debug API (deterministic camera placement for screenshots + stats)
// ---------------------------------------------------------------------------
let debugMode = false;
const VIEWS = {
  // exterior
  ext_far: { mode: "exterior", pos: [2600, 900, 1900], target: [0, 60, -150] },
  ext_mid: { mode: "exterior", pos: [900, 380, 700], target: [0, 120, 100] },
  ext_tower: { mode: "exterior", pos: [-220, 260, -60], target: [0, 210, 190] },
  ext_bow: { mode: "exterior", pos: [-500, 120, -1400], target: [0, 20, -600] },
  ext_stern: { mode: "exterior", pos: [500, 60, 1000], target: [0, 0, 480] },
  ext_belly: { mode: "exterior", pos: [180, -260, -40], target: [0, -60, 0] },
  ext_close: { mode: "exterior", pos: [-90, 230, 90], target: [0, 214, 172] },
  // interior (player pose: feet x,y,z, yaw, pitch)
  bridge: { mode: "interior", pos: [0, 210, 203], yaw: 0, pitch: -3 },
  bridge_window: { mode: "interior", pos: [0, 210, 173.5], yaw: 0, pitch: -16 },
  bridge_pit: { mode: "interior", pos: [-8, 208.6, 200], yaw: 20, pitch: 4 },
  cmd_corridor: { mode: "interior", pos: [-40, 210, 209], yaw: -90, pitch: 0 },
  lift_lobby: { mode: "interior", pos: [0, 210, 214], yaw: 180, pitch: 0 },
  hangar: { mode: "interior", pos: [0, -40, -82], yaw: 180, pitch: 14 },
  hangar_well: { mode: "interior", pos: [-36.5, -32, -12], yaw: -105, pitch: -22 },
  shuttle_bay: { mode: "interior", pos: [0, -40, 80], yaw: 180, pitch: 4 },
  reactor: { mode: "interior", pos: [0, -10, 308], yaw: 180, pitch: 14 },
  engineering: { mode: "interior", pos: [0, -10, 274], yaw: 180, pitch: 0 },
  hyperdrive: { mode: "interior", pos: [-54, -10, 276], yaw: 180, pitch: 4 },
  crew_corridor: { mode: "interior", pos: [-50, 6, -126], yaw: -90, pitch: 0 },
  crew_quarters: { mode: "interior", pos: [-49, 6, -134], yaw: 0, pitch: 0 },
  mess: { mode: "interior", pos: [-18, 6, -134], yaw: 0, pitch: 0 },
  medbay: { mode: "interior", pos: [49, 6, -134], yaw: 0, pitch: 0 },
  detention: { mode: "interior", pos: [-12, 6, -182], yaw: 0, pitch: 0 },
};
// every room also gets a view at its spawn point (a few overridden to face the room's hero content)
for (const r of ROOMS) if (!VIEWS["room_" + r.id]) VIEWS["room_" + r.id] = { mode: "interior", pos: [r.spawn[0], r.spawn[1], r.spawn[2]], yaw: r.spawn[3], pitch: 0 };
Object.assign(VIEWS, {
  room_briefing: { mode: "interior", pos: [-23, 210, 226], yaw: 0, pitch: 2 },
  room_comms: { mode: "interior", pos: [23, 210, 213.5], yaw: 180, pitch: 2 },
  room_fighter_maint: { mode: "interior", pos: [-77, -40, -15], yaw: -90, pitch: 4 },
  room_repair_bay: { mode: "interior", pos: [47, -40, 60], yaw: -90, pitch: 3 },
  room_cargo_bay: { mode: "interior", pos: [47, -40, -42], yaw: -90, pitch: 3 },
});

let framesRendered = 0;
let frameMs = 16;
let pendingCapture = null;
const longTasks = [];
if ("PerformanceObserver" in window) {
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) longTasks.push({ t: +e.startTime.toFixed(0), dur: +e.duration.toFixed(0) });
      if (longTasks.length > 100) longTasks.splice(0, longTasks.length - 100);
    }).observe({ entryTypes: ["longtask"] });
  } catch {
    /* unsupported */
  }
}

const debugAPI = {
  ready: false,
  views: Object.keys(VIEWS),
  /** setView(name | {mode, pos, target|yaw,pitch}) */
  setView(v) {
    if (typeof v === "string") {
      if (!VIEWS[v]) throw new Error("unknown view " + v);
      v = VIEWS[v];
    }
    debugMode = true;
    quality.enabled = false;
    hud.hideStart();
    hud.hideLoading();
    player.headBob = false;
    if (v.mode === "exterior") {
      modes.applyMode("exterior");
      rig.autoRotate = false;
      rig.setOrbit(v.pos, v.target);
    } else {
      modes.enterInterior(v.pos, v.yaw || 0, v.pitch || 0);
      player.frozen = true;
      rooms.update(0, 0, player.position);
      captureEnvironment();
    }
    if (v.time !== undefined) space.setTime(v.time);
    post.finalPass.uniforms.seed.value = 0.37;
    debugAPI.freezeGrain = true;
    framesRendered = 0;
    return true;
  },
  /** Walk-test helper: move the player by (dx, dz) with collision, returns the new position and room. */
  nudge(dx, dz, steps = 30) {
    player.frozen = false;
    player.locked = true;
    // sub-step so a wall can never be tunnelled (same rule as Player.update)
    const len = Math.hypot(dx, dz);
    steps = Math.max(steps, Math.ceil(len / 0.2));
    for (let i = 0; i < steps; i++) {
      player.position.x += dx / steps;
      player.resolveCollisions("x");
      player.position.z += dz / steps;
      player.resolveCollisions("z");
      const g = player.groundHeight();
      if (g !== null) player.position.y = g;
      rooms.update(1 / 60, 0, player.position);
      doors.update(1 / 60, player.position);
      lifts.update(1 / 60, player.position);
    }
    player.frozen = true;
    return { pos: player.position.toArray().map((x) => +x.toFixed(2)), room: rooms.current ? rooms.current.id : null };
  },
  advanceSky(dt) {
    space.setTime(space.state.time + dt);
    space.update(0);
    framesRendered = 0;
  },
  /** Advance the simulation (doors, lifts, animators) by dt without rendering. */
  simulate(dt) {
    const steps = Math.max(1, Math.ceil(dt / 0.05));
    for (let i = 0; i < steps; i++) {
      const h = dt / steps;
      doors.update(h, player.position);
      lifts.update(h, player.position);
      rooms.update(h, 0, player.position);
      exterior.update(h, space.state.time);
      fighters.update(h, space.state.time, { mode: modes.mode, cameraPos: camera.position, playerPos: player.position, hangarVisible: rooms.visibleIds.has("hangar") });
    }
  },
  capturePixels(x, y, w, h) {
    return new Promise((resolve) => {
      pendingCapture = { x, y, w, h, resolve };
    });
  },
  freezeGrain: false,
  textureDataURL(name) {
    const m = materials[name];
    const img = m && (m.map || m.emissiveMap) && (m.map || m.emissiveMap).image;
    return img && img.toDataURL ? img.toDataURL("image/png") : null;
  },
  interact(id) {
    return interactions.activate(id);
  },
  hovered() {
    return interactions.hovered ? interactions.hovered.id : null;
  },
  pressKey(code) {
    document.dispatchEvent(new KeyboardEvent("keydown", { code }));
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
  setAlert(t) {
    lighting.setAlert(t, true);
  },
  board() {
    return modes.board();
  },
  exitToExterior() {
    return modes.exit();
  },
  frames() {
    return framesRendered;
  },
  getStats() {
    const info = renderer.info;
    let visibleObjects = 0;
    let visibleLights = 0;
    scene.traverseVisible((o) => {
      if (o.isMesh || o.isPoints || o.isSprite || o.isLine) visibleObjects++;
      if (o.isLight && o.intensity > 0) visibleLights++;
    });
    const mem = performance.memory ? { jsHeapMB: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) } : {};
    return {
      mode: modes.mode,
      frameMs: +frameMs.toFixed(2),
      fps: +(1000 / frameMs).toFixed(1),
      calls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs ? info.programs.length : 0,
      visibleObjects,
      visibleLights,
      colliders: rooms.activeColliders.length,
      rooms: rooms.stats(),
      exteriorTriangles: exterior.triangles,
      fighters: fighters.stats(),
      qualityLevel: quality.level,
      pixelRatio: renderer.getPixelRatio(),
      touch: TOUCH,
      mobile: MOBILE,
      boot: { ...timings, materials: materials.timings, totalMs: +(bootReady - bootT0).toFixed(0) },
      longTasks: longTasks.slice(-20),
      doors: doors.snapshot(),
      ...mem,
    };
  },
  setPixelRatio(r) {
    renderer.setPixelRatio(r);
    renderer.setSize(window.innerWidth, window.innerHeight);
    post.setSize(window.innerWidth, window.innerHeight);
  },
  player,
  rooms,
  doors,
  lifts,
  space,
  lighting,
  post,
  scene,
  renderer,
  modes,
  rig,
  sync,
  materials,
  exterior,
  flight,
  fighters,
  traffic: fighters.traffic,
  atmosphere,
  layout: { ROOMS, ROOM_BY_ID, CLUSTERS, BOARDING },
};
window.debugAPI = debugAPI;

// ---------------------------------------------------------------------------
// Input: mode keys, stats
// ---------------------------------------------------------------------------
let showStats = false;
document.addEventListener("keydown", (e) => {
  if (e.code === "F3") {
    showStats = !showStats;
    hud.toggleStats(showStats);
    e.preventDefault();
    return;
  }
  if (hud.menuOpen()) return;
  if (e.code === "Enter" || e.code === "KeyB" || e.code === "KeyV" || e.code === "KeyF") modes.handleKey(e.code);
  if (e.code === "KeyR" && e.shiftKey) lighting.setAlert(lighting.alert > 0.5 ? 0 : 1);
});
canvas.addEventListener("click", () => {
  if (modes.isInterior && !player.locked && !modes.busy) player.requestLock();
});

// ---------------------------------------------------------------------------
// Start: exterior orbit, then the start card
// ---------------------------------------------------------------------------
hud.setLoading(0.85, "Ready. Holding orbit.");
modes.startExterior();
sunDir.copy(space.sunWorld).normalize();
fitSunShadow();
await nextFrame();
hud.hideLoading();
hud.setStartMode("exterior");
hud.showStart();
const bootReady = performance.now();
timings.boot = +(bootReady - bootT0).toFixed(0);

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------
const timer = new THREE.Timer();
let last = performance.now();
let envFrames = 0;
const GLAZING_CENTER = new THREE.Vector3(0, 213, 170);

function frame() {
  requestAnimationFrame(frame);
  const now = performance.now();
  frameMs += (now - last - frameMs) * 0.1;
  last = now;
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.1);
  const t = timer.getElapsed();
  renderer.info.reset();

  // streaming: at most one room per frame while a cluster is prefetching
  rooms.step();

  if (touchControls) touchControls.update(dt);
  player.update(dt);
  rig.update(dt);
  if (modes.isInterior) {
    player.floorRef = rooms.current ? rooms.current.floor : null;
    rooms.update(dt, t, player.position);
    doors.update(dt, player.position);
    lifts.update(dt, player.position);
    audio.listener = player.position;
    if (envFrames++ % 240 === 5) captureEnvironment();
  } else {
    // the glazed tower rooms stay resident only while the camera is close enough to see into them
    const near = camera.position.distanceTo(GLAZING_CENTER) < 360;
    if (near !== rooms.peek) rooms.setExteriorPeek(near);
    rooms.updateAnimators(dt, t);
  }
  space.update(dt);
  space.root.position.copy(camera.position);
  sunDir.copy(space.sunWorld).normalize();
  sun.position.copy(sunDir).multiplyScalar(modes.isInterior ? 500 : 2500).add(sun.target.position);
  exterior.update(dt, t);
  fighters.update(dt, t, { mode: modes.mode, cameraPos: camera.position, playerPos: player.position, hangarVisible: rooms.visibleIds.has("hangar") });
  atmosphere.update(dt, t, { mode: modes.mode, playerPos: player.position, currentRoom: rooms.current });
  lighting.update(dt);
  if (audio.update) audio.update(dt);
  interactions.update();
  sync.tick(dt);
  if (framesRendered > 60) updateQuality(dt);

  if (debugAPI.directRender) renderer.render(scene, camera);
  else post.render(debugAPI.freezeGrain ? 0.37 : t);
  framesRendered++;
  if (pendingCapture) {
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
    hud.setStats(`${s.fps} fps  ${s.frameMs} ms\n${s.calls} calls  ${(s.triangles / 1000).toFixed(0)}k tris\n${s.visibleLights} lights  ${s.visibleObjects} objects\nrooms ${s.rooms.visible.length}/${s.rooms.built} built  ${s.colliders} colliders\n${s.jsHeapMB ? s.jsHeapMB + " MB heap" : ""}`);
  }
}

debugAPI.ready = true;
frame();
