import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildMaterials, PALETTE } from "./materials.js";
import { buildShip } from "./ship.js";
import { buildKestrelShell } from "./rooms/kestrel_shell.js";
import { buildSpace } from "./space.js";
import { Player } from "./player.js";
import { Interactions } from "./interact.js";
import { createPost } from "./post.js";
import { createLightingController } from "./lighting.js";
import { createHUD } from "./hud.js";
import { createPerf } from "./perf.js";
import { createAudio } from "./audio.js";
import { CellManager, Cell } from "./cells.js";
import { buildDoors } from "./doors.js";
import { LiftSystem } from "./lifts.js";
import { CameraRig, FAR, NEAR_IN } from "./cameras.js";
import { buildExteriorAll } from "./exterior/index.js";
import { builderFor } from "./rooms/index.js";
import { createTraffic } from "./fighters/traffic.js";
import { createFlightControl } from "./systems/flight.js";
import { createLandingSystem } from "./systems/landing.js";
import { createNetAdapter } from "./net.js";
import { ROOMS, ROOM_BY_ID, DOORS, DECKS, DECK_ORDER, KESTREL, EXTERIOR_VIEWS, roomDoors, SHIP_NAME, HULL } from "./spec.js";

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

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, NEAR_IN, FAR);
scene.add(camera);

const hud = createHUD();
const perf = createPerf(renderer);
const audio = createAudio(camera);

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------
const materials = buildMaterials();
const space = buildSpace(scene, { camera });
space.dust.visible = false;

// Sun: a directional light that follows the far field's sun; its shadow frustum tracks the camera
const sun = new THREE.DirectionalLight(0xfff1dc, 4.2);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.6;
sun.shadow.camera.near = 200;
sun.shadow.camera.far = 6000;
scene.add(sun);
scene.add(sun.target);
// faint "planet-shine" fill so the shadow side of the hull is not pure black
const hemi = new THREE.HemisphereLight(0x3a4a66, 0x2a2e38, 0.45);
scene.add(hemi);

const exterior = buildExteriorAll(scene, materials, camera);

const cells = new CellManager({ scene, materials });
const ctxBase = { materials, audio, accentKey: (room) => accentKeyFor(room) };
function accentKeyFor(room) {
  const c = new THREE.Color(room.accent || "#4f8dff");
  const { h } = c.getHSL({});
  if (h < 0.06 || h > 0.9) return "emitRedImp";
  if (h < 0.16) return "emitAmber";
  if (h < 0.45) return "emitGreen";
  if (h < 0.55) return "emitCyan";
  return "emitBlue";
}

// The Kestrel (original interior) docked on the hangar deck; its real THREE lights become pool specs
let kestrel = null;
let lighting = null;
function buildKestrel() {
  kestrel = buildShip(cells.root, materials, { position: KESTREL.position, yaw: KESTREL.yaw, extra: (kit) => buildKestrelShell(kit) });
  const room = ROOM_BY_ID.kestrel;
  const cell = new Cell(room, materials);
  cell.group = kestrel.group;
  cell.colliders = kestrel.colliders;
  cell.floors = kestrel.floors;
  cell.interactables = kestrel.interactables;
  for (const it of cell.interactables) it.cell = "kestrel";
  const all = [...kestrel.lights.warm, ...kestrel.lights.cool, ...kestrel.lights.teal, ...kestrel.lights.spots];
  const seen = new Set();
  for (const l of all) {
    if (seen.has(l)) continue;
    seen.add(l);
    l.updateMatrixWorld(true);
    const pos = l.getWorldPosition(new THREE.Vector3());
    const spec = { type: l.isSpotLight ? "spot" : "point", pos, color: l.color.clone(), intensity: l.intensity, distance: l.distance || 10, decay: l.decay, priority: l.isSpotLight ? 0.7 : 0.5, cell: "kestrel", source: l };
    if (l.isSpotLight) {
      spec.target = l.target.getWorldPosition(new THREE.Vector3());
      spec.angle = l.angle;
      spec.penumbra = l.penumbra;
      spec.shadow = l.castShadow;
    }
    cell.lights.push(spec);
    if (l.parent) l.parent.remove(l);
    if (l.target && l.target.parent) l.target.parent.remove(l.target);
  }
  cell.built = true;
  cells.registerCell(cell);
  lighting = createLightingController({ lights: kestrel.lights, materials, hemi: null });
  return cell;
}

const player = new Player(camera, canvas, cells.colliders, cells.floors);
let rig = null;
let lifts = null;
let interactions = null;
let doors = [];
let traffic = null;
let net = null;
const flight = createFlightControl(space);
const landing = createLandingSystem();

// ---------------------------------------------------------------------------
// Environment maps: a synthetic Imperial interior for inside, the real sky for the hull
// ---------------------------------------------------------------------------
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.25;
function buildInteriorEnvironment() {
  const env = new THREE.Scene();
  const wall = new THREE.MeshStandardMaterial({ color: 0x3a3d44, roughness: 0.8, metalness: 0.1, side: THREE.BackSide });
  const box = new THREE.Mesh(new THREE.BoxGeometry(24, 7, 34), wall);
  box.position.y = 2.5;
  env.add(box);
  const strip = new THREE.MeshBasicMaterial({ color: 0xe8f0ff });
  for (const x of [-6, 0, 6]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 30), strip);
    m.position.set(x, 5.9, 0);
    env.add(m);
  }
  const blue = new THREE.MeshBasicMaterial({ color: 0x1a3a8a });
  for (const x of [-11.5, 11.5]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 30), blue);
    m.position.set(x, -0.9, 0);
    env.add(m);
  }
  env.add(new THREE.AmbientLight(0x404040, 0.4));
  const tex = pmrem.fromScene(env, 0.02).texture;
  scene.environment = tex;
  scene.environmentIntensity = 0.35;
}
function buildExteriorEnvironment() {
  const cubeRT = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType, generateMipmaps: false });
  const cubeCam = new THREE.CubeCamera(1000, 1e6, cubeRT);
  const savedFog = scene.fog;
  scene.fog = null;
  exterior.group.visible = false;
  cells.root.visible = false;
  const dustVis = space.dust.visible;
  space.dust.visible = false;
  cubeCam.update(renderer, scene);
  space.dust.visible = dustVis;
  cells.root.visible = true;
  exterior.group.visible = true;
  scene.fog = savedFog;
  const env = pmrem.fromCubemap(cubeRT.texture).texture;
  materials.setExteriorEnv(env);
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
  { ratio: Math.min(window.devicePixelRatio, 1.5), ao: "Medium" },
];
const quality = { level: QUALITY_LEVELS.length - 1, slow: 0, fast: 0, enabled: true };
function applyQuality() {
  const q = QUALITY_LEVELS[quality.level];
  renderer.setPixelRatio(q.ratio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  post.setSize(window.innerWidth, window.innerHeight);
  post.ao.setQualityMode(q.ao);
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
// Build all rooms, then doors, lifts, cameras, interactions
// ---------------------------------------------------------------------------
let ready = false;
const buildLog = [];
async function buildInterior() {
  const t0 = performance.now();
  for (const room of ROOMS) {
    if (room.id === "kestrel") continue;
    const builder = await builderFor(room);
    const ctx = { ...ctxBase, doors: roomDoors(room.id), room };
    const tr = performance.now();
    try {
      cells.buildRoom(room.id, builder, ctx);
      buildLog.push({ room: room.id, ms: +(performance.now() - tr).toFixed(1), builder: builder.name });
    } catch (e) {
      console.error(`[rooms] ${room.id} failed:`, e);
      buildLog.push({ room: room.id, error: String(e.message || e) });
    }
    hud.setStartHint(`Building ${room.name}…`);
    await new Promise((r) => setTimeout(r, 0));
  }
  buildKestrel();
  const built = buildDoors(DOORS, cells, { materials, audio });
  doors = built.doors;
  cells.root.add(built.group);
  lifts = new LiftSystem({ cells, player, hud, audio });
  rig = new CameraRig({ camera, player, dom: canvas, hud, cells });
  rig.dust = space.dust;
  interactions = new Interactions({ camera, interactables: cells.interactables, lighting, space, player, hud, audio });
  rig.onModeChange = (mode) => {
    interactions.enabled = mode === "interior";
    hud.showCrosshair(mode === "interior");
    updateModeLine();
    if (mode === "orbit" || mode === "fly") audio.setZone("exterior");
    else if (cells.current) audio.setZone(zoneFor(cells.current.room));
  };
  cells.onCellChange = (cell, prev) => {
    hud.showRoom(`DECK ${cell.room.deck}`, cell.room.name);
    audio.setZone(zoneFor(cell.room));
    if (prev && cell.room.deck !== prev.room.deck) hud.setStatus(`${DECKS[cell.room.deck].name}.`);
  };
  // fighter traffic lives in world coordinates but is parented to the hangar cell so it shows / hides with it
  try {
    traffic = createTraffic({ materials, audio, camera });
    const hangarCell = cells.cells.get("hangar");
    if (hangarCell && traffic.group) {
      traffic.group.position.set(-hangarCell.room.origin[0], -hangarCell.room.origin[1], -hangarCell.room.origin[2]);
      hangarCell.group.add(traffic.group);
    }
  } catch (e) {
    console.error("[fighters] traffic failed:", e);
    traffic = null;
  }
  net = createNetAdapter({ doors, lifts, traffic, rig });
  buildInteriorEnvironment();
  // place the player on the bridge by default (spawn views can override)
  teleport("bridge");
  buildLog.push({ total: +(performance.now() - t0).toFixed(0) });
  ready = true;
  perf.markReady();
  hud.setStartHint("Choose where to board");
  hud.setBoardsEnabled(true);
  updateModeLine();
}
function zoneFor(room) {
  if (room.id === "bridge") return "bridge";
  if (room.deck === "E") return "hangar";
  if (room.id === "reactor") return "reactor";
  if (room.deck === "D") return "engineering";
  if (room.kind === "corridor") return "corridor";
  return "default";
}
function updateModeLine() {
  if (!rig) return;
  const m = rig.mode;
  if (m === "interior") hud.setModeLine("V exterior · H help");
  else if (m === "orbit") hud.setModeLine("drag orbit · wheel zoom · F free flight · 1–9 presets · V back inside");
  else if (m === "fly") hud.setModeLine("WASD Q/E fly · wheel speed · Shift boost · F orbit · V back inside");
  else hud.setModeLine("");
}

/** Put the player at a room's spawn pose (world) and make that room current. */
function teleport(roomId) {
  const p = cells.spawnPose(roomId);
  player.setPose(p.x, p.z, p.yaw, p.pitch, p.y);
  cells.setCurrent(roomId);
  fogDensity = ROOM_BY_ID[roomId].fog;
  scene.fog.density = fogDensity;
}

// ---------------------------------------------------------------------------
// Input: boarding, view toggles, lift deck selection, help, stats
// ---------------------------------------------------------------------------
hud.setBoardsEnabled(false);
hud.onBoard((where) => {
  if (!ready) return;
  audio.unlock();
  hud.hideStart();
  if (where === "exterior") {
    rig.applyPreset("ext_hero");
    hud.setStatus("Exterior view. Drag to orbit, wheel to zoom, V to go back aboard.");
  } else {
    teleport(where === "kestrel" ? "kestrel" : "bridge");
    rig.setMode("interior");
    player.requestLock();
  }
});
canvas.addEventListener("click", () => {
  if (!ready || debugMode) return;
  if (rig.mode === "interior") player.requestLock();
  else if (rig.mode === "fly") canvas.requestPointerLock();
});
player.onLockChange = (locked) => {
  if (locked) hud.hideStart();
};
let showStats = false;
document.addEventListener("keydown", (e) => {
  if (e.code === "F3") {
    e.preventDefault();
    showStats = !showStats;
    hud.toggleStats(showStats);
    return;
  }
  if (!ready) return;
  if (e.code === "KeyH") hud.toggleHelp();
  if (e.code === "KeyV" && !e.repeat) {
    if (rig.mode === "interior") {
      if (document.pointerLockElement) document.exitPointerLock();
      rig.toExterior().then(() => hud.setStatus("Exterior view. Drag to orbit, wheel to zoom, F to fly, V to return."));
    } else if (rig.exterior) {
      rig.toInterior().then(() => {
        hud.setStatus("Back aboard.");
        player.requestLock();
      });
    }
  }
  if (e.code === "KeyF" && rig.exterior && !e.repeat) rig.toggleFly();
  if (/^Digit[0-9]$/.test(e.code)) {
    const n = +e.code.slice(5);
    if (rig.mode === "interior" && lifts && lifts.currentCar && hud.liftMenuVisible()) {
      const deck = DECK_ORDER[n - 1];
      if (deck) lifts.select(deck);
    } else if (rig.exterior) {
      const names = Object.keys(EXTERIOR_VIEWS);
      const name = names[(n + 9) % 10];
      if (name) rig.applyPreset(name);
    }
  }
});
player.onStep = () => audio.play("footstep");

// ---------------------------------------------------------------------------
// Debug API (deterministic camera placement for screenshots and tests)
// ---------------------------------------------------------------------------
let debugMode = false;
// legacy Kestrel views (local Kestrel frame) mapped through its docked transform
const KESTREL_VIEWS = {
  cockpit: { x: 0.0, z: -17.1, yaw: 0, pitch: -4 },
  corridor: { x: 0.4, z: -1.3, yaw: 12, pitch: -2 },
  quarters: { x: -2.3, z: -6.3, yaw: 52, pitch: -8 },
  window: { x: -0.55, z: -12.55, yaw: 90, pitch: 2 },
  windshield: { x: 0.0, z: -18.3, yaw: 0, pitch: 2 },
  galley: { x: 2.3, z: -10.4, yaw: -70, pitch: -6 },
  bathroom: { x: 2.1, z: -3.9, yaw: -100, pitch: -4 },
  aft: { x: 0.2, z: -6.5, yaw: 180, pitch: -3 },
  ramp: { x: 0.0, z: 1.2, yaw: 180, pitch: -12 },
};
function kestrelPose(v) {
  const c = Math.cos(KESTREL.yaw);
  const s = Math.sin(KESTREL.yaw);
  return { x: v.x * c + v.z * s + KESTREL.position.x, z: -v.x * s + v.z * c + KESTREL.position.z, y: KESTREL.position.y, yaw: v.yaw + THREE.MathUtils.radToDeg(KESTREL.yaw), pitch: v.pitch };
}
let framesRendered = 0;
let pendingCapture = null;
let fogDensity = 0.03;
function enterDebug() {
  debugMode = true;
  quality.enabled = false; // deterministic resolution for screenshots
  hud.hideStart();
  player.headBob = false;
  post.finalPass.uniforms.seed.value = 0.37;
  debugAPI.freezeGrain = true;
  framesRendered = 0;
}
const debugAPI = {
  ready: false,
  get views() {
    return [...Object.keys(KESTREL_VIEWS), ...ROOMS.filter((r) => r.id !== "kestrel").map((r) => "room:" + r.id), ...Object.keys(EXTERIOR_VIEWS)];
  },
  /** Kestrel legacy view, "room:<id>" spawn view, or an exterior preset name. */
  setView(name) {
    enterDebug();
    if (KESTREL_VIEWS[name]) {
      const p = kestrelPose(KESTREL_VIEWS[name]);
      rig.setMode("interior");
      player.frozen = true;
      player.setPose(p.x, p.z, p.yaw, p.pitch, p.y);
      cells.setCurrent("kestrel");
      cells.update(player.position, 0, 0);
      return true;
    }
    if (name.startsWith("room:")) {
      const id = name.slice(5);
      if (!ROOM_BY_ID[id]) throw new Error("unknown room " + id);
      rig.setMode("interior");
      player.frozen = true;
      teleport(id);
      cells.update(player.position, 0, 0);
      return true;
    }
    if (EXTERIOR_VIEWS[name]) {
      rig.applyPreset(name);
      // sun forward-left-above at this sky time: hull front-lit from the hero angles, lit planets aft
      space.setTime(EXTERIOR_VIEWS[name].time ?? 195);
      return true;
    }
    throw new Error("unknown view " + name);
  },
  /** Free camera pose for critics: pos [x,y,z], look [x,y,z], interior=true keeps cells as-is. */
  setCamera(pos, look, fov = 60, interior = false) {
    enterDebug();
    if (interior) {
      rig.setMode("interior");
      player.frozen = true;
      player.setPose(pos[0], pos[2], 0, 0, pos[1] - 1.7);
      camera.position.set(pos[0], pos[1], pos[2]);
      camera.lookAt(look[0], look[1], look[2]);
      const e = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
      player.yaw = e.y;
      player.pitch = e.x;
      player.updateCamera(0);
      const c = cells.cellAt(player.position);
      if (c) cells.setCurrent(c.id);
      camera.fov = fov;
      camera.updateProjectionMatrix();
    } else rig.setExterior(pos, look, fov);
    return true;
  },
  teleport(roomId) {
    enterDebug();
    rig.setMode("interior");
    player.frozen = false;
    player.locked = true;
    teleport(roomId);
    return cells.current.id;
  },
  /** Step the simulation without rendering (walk tests): keys is an array of KeyboardEvent codes. */
  simulate(seconds, keys = [], dt = 1 / 60) {
    player.locked = true;
    player.frozen = false;
    player.keys = new Set(keys);
    const n = Math.round(seconds / dt);
    for (let i = 0; i < n; i++) {
      player.update(dt);
      cells.update(player.position, dt, i * dt);
      for (const d of doors) d.update(dt, player.position);
      lifts.update(dt, i * dt);
    }
    player.keys.clear();
    return { pos: player.position.toArray().map((v) => +v.toFixed(2)), cell: cells.current ? cells.current.id : null };
  },
  liftSelect(deck) {
    return lifts.select(deck);
  },
  liftState() {
    return lifts.getState();
  },
  doorStates() {
    return doors.map((d) => d.getState());
  },
  doorNear(maxDist = 4) {
    const near = doors.filter((d) => d.pos.distanceTo(player.position) < maxDist);
    return near.map((d) => ({ id: d.id, openness: +d.openness.toFixed(2), dist: +d.pos.distanceTo(player.position).toFixed(2) }));
  },
  cellInfo() {
    return cells.getStats();
  },
  buildLog: () => buildLog,
  rooms: () => ROOMS.map((r) => ({ id: r.id, name: r.name, deck: r.deck, origin: r.origin, size: r.size, kind: r.kind })),
  advanceSky(dt) {
    space.setTime(space.state.time + dt);
    space.update(0);
    framesRendered = 0;
  },
  capturePixels(x, y, w, h) {
    return new Promise((resolve) => {
      pendingCapture = { x, y, w, h, resolve };
    });
  },
  freezeGrain: false,
  textureDataURL(name) {
    const m = materials[name];
    const img = m && m.map && m.map.image;
    return img && img.toDataURL ? img.toDataURL("image/png") : null;
  },
  lookAt(id) {
    const poses = {
      bed: { x: -3.0, z: -7.6, yaw: 76, pitch: -40 },
      galley: { x: 3.4, z: -10.6, yaw: -78, pitch: -22 },
      bathroom: { x: 2.5, z: -3.7, yaw: -90, pitch: -43 },
    };
    const v = poses[id];
    if (!v) throw new Error("unknown interactable " + id);
    enterDebug();
    rig.setMode("interior");
    player.frozen = false;
    player.locked = true;
    const p = kestrelPose(v);
    player.setPose(p.x, p.z, p.yaw, p.pitch, p.y);
    cells.setCurrent("kestrel");
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
  roomBanner() {
    return hud.roomText();
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
  toExterior: (preset) => rig.toExterior(preset),
  toInterior: () => rig.toInterior(),
  get traffic() {
    return traffic;
  },
  netState: () => (net ? net.getState() : null),
  flight,
  landing,
  cameraState: () => rig.getState(),
  audioLog: () => audio.recent(),
  getStats() {
    return perf.snapshot({
      ...cells.getStats(),
      mode: rig ? rig.mode : "boot",
      exteriorTriangles: Math.round(exterior.triangles),
      poolLights: cells.pool.points.filter((s) => s.light.intensity > 0).length + cells.pool.spots.filter((s) => s.light.intensity > 0).length,
      qualityLevel: quality.level,
    });
  },
  setPixelRatio(r) {
    renderer.setPixelRatio(r);
    renderer.setSize(window.innerWidth, window.innerHeight);
    post.setSize(window.innerWidth, window.innerHeight);
  },
  player,
  space,
  get lighting() {
    return lighting;
  },
  get rig() {
    return rig;
  },
  cells,
  post,
  scene,
  renderer,
  materials,
  exterior,
};
window.debugAPI = debugAPI;

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------
const timer = new THREE.Timer();
let envCaptured = false;
let last = performance.now();
const shipBox = new THREE.Box3(new THREE.Vector3(-HULL.halfWidthStern, -160, HULL.zBow), new THREE.Vector3(HULL.halfWidthStern, 345, HULL.zStern + 60));
const tmpV = new THREE.Vector3();

function updateSun() {
  const dir = space.sunDirection(tmpV);
  const outside = rig.exterior || rig.mode === "transition";
  // shadow frustum centred on the hull point nearest the camera, sized by the camera's distance.
  // Inside the hull the sun shadow is invisible, so the frustum collapses to nothing: the shadow pass
  // then renders zero objects instead of every visible room a second time.
  const center = outside ? shipBox.clampPoint(camera.position, new THREE.Vector3()) : new THREE.Vector3(0, 50000, 0);
  const dist = camera.position.distanceTo(center);
  const S = outside ? THREE.MathUtils.clamp(dist * 1.3 + 80, 140, 1500) : 0.5;
  sun.target.position.copy(center);
  sun.position.copy(center).addScaledVector(dir, 3000);
  const sc = sun.shadow.camera;
  if (Math.abs(sc.right - S) > S * 0.15) {
    sc.left = -S;
    sc.right = S;
    sc.top = S;
    sc.bottom = -S;
    sc.updateProjectionMatrix();
  }
  // deep inside the hull nothing outside can be seen: skip the exterior, the sky and the sun's shadow pass
  const seesOut = outside || [...cells.visibleIds].some((id) => VIEW_ROOMS.has(id));
  if (exterior.group.visible !== seesOut) {
    exterior.group.visible = seesOut;
    space.root.visible = seesOut;
  }
  // outside, only the rooms with openings to space can be seen: hide the rest of the interior
  if (outside !== interiorHiddenForExterior) {
    interiorHiddenForExterior = outside;
    for (const cell of cells.cells.values()) {
      if (outside) cell.group.visible = cell.room.tags.includes("key") || cell.id === "kestrel";
      else cell.group.visible = cell.visible;
    }
    for (const d of doors) d.group.visible = outside ? false : cells.visibleIds.has(d.spec.a) || cells.visibleIds.has(d.spec.b);
  }
}
let interiorHiddenForExterior = false;
// rooms with real openings to space (viewports / the hangar mouth)
const VIEW_ROOMS = new Set(["bridge", "observation", "hangar"]);

function frame() {
  requestAnimationFrame(frame);
  const now = performance.now();
  perf.beginFrame(now, last);
  last = now;
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.1);
  const t = timer.getElapsed();
  renderer.info.reset();
  const js0 = performance.now();

  if (ready && !envCaptured && framesRendered >= 2) {
    buildExteriorEnvironment();
    envCaptured = true;
  }
  if (ready) {
    rig.update(dt);
    if (rig.mode === "interior") player.update(dt);
    space.update(dt);
    if (lighting) lighting.update(dt);
    cells.update(player.position, dt, t);
    for (const d of doors) if (d.group.visible || d.type === "lift") d.update(dt, player.position);
    lifts.update(dt, t);
    interactions.update();
    exterior.update(camera, dt, t);
    if (traffic && (cells.visibleIds.has("hangar") || rig.exterior)) traffic.update(dt, t, camera);
    flight.update(dt);
    updateSun();
    // fog: per-room density inside, none outside
    const target = rig.exterior || rig.mode === "transition" ? 0.00002 : cells.fogTarget;
    fogDensity += (target - fogDensity) * Math.min(1, dt * 2.5);
    scene.fog.density = fogDensity;
    // AO radius per mode (metres): tight inside, wide across the hull
    const aoR = rig.exterior ? 7 : 0.9;
    if (Math.abs(post.ao.configuration.aoRadius - aoR) > 0.01) {
      post.ao.configuration.aoRadius = aoR;
      post.ao.configuration.distanceFalloff = aoR;
    }
    if (framesRendered > 60) updateQuality(dt);
  } else {
    space.update(dt);
  }
  // containment field / glow animation
  materials.field.map.offset.y = (t * 0.05) % 1;
  perf.setJsTime(performance.now() - js0);

  if (!ready) {
    // building: keep the start card responsive, don't burn GPU time on an empty scene
    renderer.clear();
    return;
  }
  if (debugAPI.directRender) renderer.render(scene, camera);
  else post.render(debugAPI.freezeGrain ? 0.37 : t);
  perf.tick();
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
    hud.setStats(`${s.fps} fps  ${s.frameMs} ms (p95 ${s.p95Ms})  js ${s.jsMs} ms\n${s.calls} calls  ${(s.triangles / 1000).toFixed(1)}k tris  ${s.programs} programs\ncells ${s.visibleCells}/${s.cells}  lights ${s.poolLights}  tex ${s.textureMB} MB\n${s.mode} · ${s.current || ""}`);
  }
}

frame();
buildInterior().then(() => {
  debugAPI.ready = true;
  console.log(`[${SHIP_NAME}] ready`, JSON.stringify(buildLog[buildLog.length - 1]));
});
