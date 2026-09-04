// DEV ONLY (Agent B). Stand-in for src/core/registry.js + src/main.js so Deck 1 modules can be built and
// screenshotted before the scaffold lands. Implements the §7 manifest / §8 ctx contract as written:
// module discovery, validation warnings ("[registry-shim]"), a fixed light pool fed by descriptors,
// active-room streaming (room + door neighbours), views for the harness, and a debugAPI compatible with
// tools/shots.mjs. Nothing in here is game code; delete the folder when src/core/registry.js exists.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildMaterials, PALETTE } from "../../../materials.js";
import { Kit } from "../../../kit.js";
import { Player } from "../../../player.js";
import { createPost } from "../../../post.js";
import { createHUD } from "../../../hud.js";
import { buildSpace } from "../../../space.js";
import { addStandins } from "./standins.js";
import { DOOR_KINDS } from "../shared/doors.js";

const params = new URLSearchParams(location.search);
const onlyRooms = params.get("rooms") ? params.get("rooms").split(",") : null;
const noPost = params.get("post") === "0";

// Deck 1 envelope (§6.3) for validation; y allows the bridge pits (example manifest has min y 236).
const ENVELOPE = { min: [-88, 235, 458], max: [88, 264, 542] };
const APERTURES = {
  bridge: { x: [-19, 19], y: [241.2, 245.4], z: [455.5, 458] },
  observation: { x: [-78, -50], y: [241.5, 244.5], z: [455.5, 458] },
};
const BUDGET = (m) => (m.id === "d1-bridge" ? { tris: 300000, calls: 24, lights: 28 } : { tris: 120000, calls: 16, lights: 14 });

// ---------------------------------------------------------------------------
// Renderer / scene (same settings as main.js)
// ---------------------------------------------------------------------------
const canvas = document.getElementById("view");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", stencil: false });
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.info.autoReset = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x07090d, 0.006);
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 6000);
scene.add(camera);
const hud = createHUD();

const materials = addStandins(PALETTE, buildMaterials());
materials.screens.forEach((m, i) => (materials["screen" + i] = m));
const sharedMats = { ...materials };
delete sharedMats.screens;

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.25;
const hemi = new THREE.HemisphereLight(0x6a7a96, 0x14161a, 0.12);
scene.add(hemi);

// Exterior stand-in so windows look at something: stars from the Kestrel space module plus flat hull slabs at
// the §6.2 envelope heights. A's exterior replaces all of this.
const space = buildSpace(scene);
space.setTime(40);
// the Kestrel sun sprite sits on the bridge window's centre axis and blooms into a 60 px blob; hide it (stand-in only)
space.root.traverse((o) => {
  if (o.isSprite && o.material && (o.material.color.getHex() === 0xfff1d6 || o.material.color.getHex() === 0xffb070)) o.visible = false;
});
{
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x6f747c, roughness: 0.85, metalness: 0.2 });
  const g = new THREE.Group();
  g.name = "exterior-standin";
  const slab = (min, max) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(max[0] - min[0], max[1] - min[1], max[2] - min[2]), hullMat);
    m.position.set((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
    g.add(m);
  };
  slab([-470, -6, -800], [470, 0, 800]); // upper hull plane (flat stand-in for the shallow pyramid)
  slab([-110, 0, 120], [110, 135, 760]); // superstructure block
  slab([-38, 135, 480], [38, 232, 560]); // tower neck
  // bridge head as a hollow shell around Deck 1 (floor, roof, sides, back). The floor stops at 236 under the bridge
  // footprint (x ±20, z 458..512): its pits go down to 237.6 and a 239.5 top filled them from every above-deck view.
  slab([-90, 232, 455], [90, 236, 545]);
  slab([-90, 236, 455], [-20, 239.5, 545]);
  slab([20, 236, 455], [90, 239.5, 545]);
  slab([-20, 236, 455], [20, 239.5, 458]);
  slab([-20, 236, 512], [20, 239.5, 545]);
  slab([-90, 264.5, 455], [90, 268, 545]);
  slab([-90, 232, 455], [-88.2, 268, 545]);
  slab([88.2, 232, 455], [90, 268, 545]);
  slab([-90, 232, 542.2], [90, 268, 545]);
  // front face (z 455..458) with the two apertures left open
  const B = APERTURES.bridge;
  const O = APERTURES.observation;
  slab([-90, 232, 455], [90, B.y[0], 458]); // below both
  slab([-90, B.y[1], 455], [90, 268, 458]); // above both
  slab([B.x[1], B.y[0], 455], [90, B.y[1], 458]); // starboard of the bridge window
  slab([O.x[1], B.y[0], 455], [B.x[0], B.y[1], 458]); // between observation and bridge
  slab([-90, B.y[0], 455], [O.x[0], B.y[1], 458]); // port of the observation window
  slab([O.x[0], B.y[0], 455], [O.x[1], O.y[0], 458]); // under the observation window
  slab([O.x[0], O.y[1], 455], [O.x[1], B.y[1], 458]); // over the observation window
  scene.add(g);
}

// ---------------------------------------------------------------------------
// Light pool: 12 point + 4 spot, always present (fixed shader light count); fed by descriptors.
// ---------------------------------------------------------------------------
const POOL = { points: [], spots: [] };
for (let i = 0; i < 12; i++) {
  const l = new THREE.PointLight(0xffffff, 0, 1, 2);
  l.position.set(0, -5000, 0);
  scene.add(l);
  POOL.points.push(l);
}
for (let i = 0; i < 4; i++) {
  const l = new THREE.SpotLight(0xffffff, 0, 1, 0.5, 0.5, 1.8);
  l.position.set(0, -5000, 0);
  scene.add(l);
  scene.add(l.target);
  POOL.spots.push(l);
}
POOL.spots[0].castShadow = true;
POOL.spots[0].shadow.mapSize.set(1024, 1024);

function applyLights(activeRooms, eye, currentId = null) {
  const descs = [];
  for (const r of activeRooms) for (const d of r.lights) descs.push({ d, room: r.manifest.id });
  const dist = (d) => Math.hypot(d.pos[0] - eye.x, d.pos[1] - eye.y, d.pos[2] - eye.z);
  // current room first, then priority, then nearest (approximates "highest-priority/nearest" in §9.4)
  const score = (e) => (e.room === currentId ? 2 : 0) + (e.d.priority || 0) - dist(e.d) / 120;
  descs.sort((a, b) => score(b) - score(a));
  let np = 0;
  let ns = 0;
  for (const { d } of descs) {
    if (d.type === "spot" && ns < POOL.spots.length) {
      const l = POOL.spots[ns++];
      l.position.set(...d.pos);
      l.color.setHex(d.color);
      l.intensity = d.intensity;
      l.distance = d.distance || 20;
      l.angle = d.angle || 0.5;
      l.penumbra = d.penumbra ?? 0.5;
      l.target.position.set(...(d.target || [d.pos[0], d.pos[1] - 1, d.pos[2]]));
    } else if (d.type === "point" && np < POOL.points.length) {
      const l = POOL.points[np++];
      l.position.set(...d.pos);
      l.color.setHex(d.color);
      l.intensity = d.intensity;
      l.distance = d.distance || 12;
    }
  }
  for (let i = np; i < POOL.points.length; i++) {
    POOL.points[i].intensity = 0;
    POOL.points[i].position.set(0, -5000, 0);
  }
  for (let i = ns; i < POOL.spots.length; i++) {
    POOL.spots[i].intensity = 0;
    POOL.spots[i].position.set(0, -5000, 0);
  }
  return { points: np, spots: ns, dropped: Math.max(0, descs.length - np - ns) };
}

// ---------------------------------------------------------------------------
// Registry shim
// ---------------------------------------------------------------------------
const warnings = [];
function warn(msg) {
  warnings.push(msg);
  console.warn("[registry-shim] " + msg);
}
const rooms = new Map();
const views = new Map();
const world = {
  rooms,
  get: (id) => rooms.get(id),
  apertures: APERTURES,
  envelopes: { 1: ENVELOPE },
};
const seenAudio = new Set();
const audio = {
  play(name) {
    if (!seenAudio.has(name)) {
      seenAudio.add(name);
      console.log("[audio] play", name);
    }
  },
  loop(name) {
    if (!seenAudio.has(name)) {
      seenAudio.add(name);
      console.log("[audio] loop", name);
    }
    return { stop() {} };
  },
  ambient() {},
};

let player;
let frozenTime = null;
const timer = new THREE.Timer();
const timeFn = () => (frozenTime !== null ? frozenTime : timer.getElapsed());

const mods = import.meta.glob("../*/index.js");

function validate(m) {
  const b = m.bounds;
  if (!m.id || !/^d1-[a-z0-9-]+$/.test(m.id)) warn(`${m.id}: id must be kebab-case with d1- prefix`);
  if (rooms.has(m.id)) warn(`${m.id}: duplicate id`);
  if (!b || !b.min || !b.max) warn(`${m.id}: missing bounds`);
  else {
    for (let i = 0; i < 3; i++) {
      if (b.min[i] < ENVELOPE.min[i] - 1e-6 || b.max[i] > ENVELOPE.max[i] + 1e-6) warn(`${m.id}: bounds outside deck envelope on axis ${"xyz"[i]} (${b.min[i]}..${b.max[i]})`);
    }
  }
  if (!m.spawn || !m.spawn.pos) warn(`${m.id}: missing spawn`);
  else if (b && !inside(m.spawn.pos, b)) warn(`${m.id}: spawn outside bounds`);
  for (const [name, v] of Object.entries(m.views || {})) {
    if (views.has(name)) warn(`${m.id}: duplicate view name ${name}`);
    if (v.pos && b && !inside(v.pos, b)) warn(`${m.id}: view ${name} outside bounds`);
  }
  for (const d of m.doors || []) {
    if (b && !onFace(d.pos, b)) warn(`${m.id}: door ${d.id} pos not on a bounds face`);
  }
}
function inside(p, b, tol = 1e-3) {
  return p[0] >= b.min[0] - tol && p[0] <= b.max[0] + tol && p[1] >= b.min[1] - tol && p[1] <= b.max[1] + tol && p[2] >= b.min[2] - tol && p[2] <= b.max[2] + tol;
}
function onFace(p, b, tol = 0.02) {
  if (!inside(p, b, 0.05)) return false;
  return [0, 2].some((i) => Math.abs(p[i] - b.min[i]) < tol || Math.abs(p[i] - b.max[i]) < tol);
}

function pairDoors() {
  const byId = new Map();
  for (const r of rooms.values()) for (const d of r.manifest.doors || []) (byId.get(d.id) || byId.set(d.id, []).get(d.id)).push({ d, room: r.manifest.id });
  for (const [id, list] of byId) {
    if (list.length === 1) {
      const { d, room } = list[0];
      if (rooms.has(d.to)) warn(`${room}: door ${id} → ${d.to} but ${d.to} does not declare it (would be built locked)`);
      else console.log(`[registry-shim] ${room}: door ${id} → ${d.to} unknown room (locked / future expansion)`);
      continue;
    }
    if (list.length > 2) warn(`door ${id} declared by ${list.length} rooms`);
    const [a, b] = list;
    const gap = Math.hypot(a.d.pos[0] - b.d.pos[0], a.d.pos[1] - b.d.pos[1], a.d.pos[2] - b.d.pos[2]);
    if (gap > 0.75) warn(`door ${id}: positions differ by ${gap.toFixed(2)} m (${a.room} vs ${b.room})`);
    const dot = a.d.dir[0] * b.d.dir[0] + a.d.dir[2] * b.d.dir[2];
    if (dot > -0.99) warn(`door ${id}: dirs are not opposite (${a.room} vs ${b.room})`);
    if (a.d.kind !== b.d.kind) warn(`door ${id}: kinds differ (${a.d.kind} vs ${b.d.kind})`);
    if (a.d.to !== b.room || b.d.to !== a.room) warn(`door ${id}: 'to' mismatch (${a.room}→${a.d.to}, ${b.room}→${b.d.to})`);
    if (params.get("leaves") !== "0") doorLeafStandin(a.d);
  }
  if (params.get("leaves") !== "0") for (const r of rooms.values()) if (r.manifest.lift) doorLeafStandin({ ...r.manifest.lift, kind: "standard" });
}

// Closed door leaves for every paired door (and the lift door), so the shots show doors at rest the way D's doors
// system will (closed until approached) instead of open holes: without them a corridor luminaire 40 m away reads as
// a white blob inside the bridge's aft doorway, and neighbour pool light spills through every opening. `?leaves=0`.
const leafGroup = new THREE.Group();
leafGroup.name = "door-leaf-standins";
scene.add(leafGroup);
const leafMat = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.8, metalness: 0.2 });
const leafSeamMat = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.9, metalness: 0.1 });
function doorLeafStandin(d) {
  const k = DOOR_KINDS[d.kind] || DOOR_KINDS.standard;
  const alongX = Math.abs(d.dir[2]) > 0.5; // door in a wall that runs along x (normal ±z)
  const geo = alongX ? new THREE.BoxGeometry(k.w, k.h, 0.2) : new THREE.BoxGeometry(0.2, k.h, k.w);
  const m = new THREE.Mesh(geo, leafMat);
  m.position.set(d.pos[0], d.pos[1] + k.h / 2, d.pos[2]);
  leafGroup.add(m);
  // centre seam so the leaf reads as a pair
  const seam = new THREE.Mesh(alongX ? new THREE.BoxGeometry(0.04, k.h - 0.1, 0.22) : new THREE.BoxGeometry(0.22, k.h - 0.1, 0.04), leafSeamMat);
  seam.position.copy(m.position);
  leafGroup.add(seam);
}

async function loadModules() {
  const manifests = [];
  for (const [path, load] of Object.entries(mods)) {
    try {
      const mod = await load();
      const m = mod.default;
      if (!m || !m.id) {
        warn(`${path}: default export is not a manifest`);
        continue;
      }
      if (onlyRooms && !onlyRooms.includes(m.id)) continue;
      manifests.push(m);
    } catch (e) {
      warn(`${path}: failed to import: ${e.message}`);
      console.error(e);
    }
  }
  manifests.sort((a, b) => (a.id > b.id ? 1 : -1));
  return manifests;
}

function buildRoom(m) {
  validate(m);
  const group = new THREE.Group();
  group.name = m.id;
  const mats = { ...sharedMats };
  if (typeof m.materials === "function") Object.assign(mats, m.materials(sharedMats) || {});
  const kit = new Kit(mats);
  const ctx = {
    THREE,
    kit,
    materials: mats,
    PALETTE,
    group,
    lights: [],
    interactables: [],
    audio,
    hud,
    player,
    teleport,
    world: m.kind === "system" ? world : undefined,
    seed: hashSeed(m.id),
    quality: { tier: "high" },
    time: timeFn,
  };
  const t0 = performance.now();
  let result = null;
  try {
    result = m.build(ctx) || {};
  } catch (e) {
    warn(`${m.id}: build threw: ${e.message}`);
    console.error(e);
    result = {};
  }
  let meshes = [];
  try {
    meshes = kit.build(group);
  } catch (e) {
    warn(`${m.id}: kit.build threw: ${e.message}`);
    console.error(e);
  }
  const buildMs = performance.now() - t0;
  scene.add(group);
  // stats
  let tris = 0;
  for (const mesh of meshes) tris += mesh.geometry.attributes.position.count / 3;
  group.traverse((o) => {
    if (o.isMesh && !meshes.includes(o) && o.geometry && o.geometry.attributes.position) {
      const c = o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3;
      tris += c * (o.isInstancedMesh ? o.count : 1);
    }
  });
  const calls = countMeshes(group);
  const budget = BUDGET(m);
  if (tris > budget.tris) warn(`${m.id}: ${Math.round(tris)} tris > budget ${budget.tris}`);
  if (calls > budget.calls) warn(`${m.id}: ${calls} draw calls > budget ${budget.calls}`);
  if (ctx.lights.length > budget.lights) warn(`${m.id}: ${ctx.lights.length} light descriptors > budget ${budget.lights}`);
  if (kit.colliders.length > 400) warn(`${m.id}: ${kit.colliders.length} colliders > 400`);
  if (buildMs > 250) warn(`${m.id}: build ${buildMs.toFixed(0)} ms > 250 ms`);
  for (const d of ctx.lights) {
    if (!["point", "spot"].includes(d.type) || !d.pos || d.color === undefined || d.intensity === undefined) warn(`${m.id}: malformed light descriptor ${JSON.stringify(d)}`);
    else {
      const allow = { min: [...m.bounds.min], max: [...m.bounds.max] };
      for (const ap of m.apertures || []) if (APERTURES[ap]) allow.min[2] = Math.min(allow.min[2], APERTURES[ap].z[0]);
      if (!inside(d.pos, allow, 0.5)) warn(`${m.id}: light at ${d.pos} is outside bounds`);
    }
  }
  // geometry outside bounds (aperture reveal allowed for rooms declaring that aperture)
  const box = new THREE.Box3().setFromObject(group);
  if (!box.isEmpty()) {
    const allow = { min: [...m.bounds.min], max: [...m.bounds.max] };
    for (const ap of m.apertures || []) if (APERTURES[ap]) allow.min[2] = Math.min(allow.min[2], APERTURES[ap].z[0]);
    const tol = 0.06;
    const over = [];
    for (let i = 0; i < 3; i++) {
      const mn = box.min.getComponent(i);
      const mx = box.max.getComponent(i);
      if (mn < allow.min[i] - tol) over.push(`${"xyz"[i]} min ${mn.toFixed(2)} < ${allow.min[i]}`);
      if (mx > allow.max[i] + tol) over.push(`${"xyz"[i]} max ${mx.toFixed(2)} > ${allow.max[i]}`);
    }
    if (over.length) warn(`${m.id}: geometry outside bounds: ${over.join(", ")}`);
  }
  const room = { manifest: m, group, result, kit, lights: ctx.lights, interactables: ctx.interactables, colliders: kit.colliders, stats: { tris: Math.round(tris), calls, buildMs: +buildMs.toFixed(1), descriptors: ctx.lights.length, colliders: kit.colliders.length, interactables: ctx.interactables.length } };
  rooms.set(m.id, room);
  for (const [name, v] of Object.entries(m.views || {})) views.set(name, { room: m.id, view: v });
  console.log(`[registry-shim] built ${m.id}: ${room.stats.tris} tris, ${calls} calls, ${ctx.lights.length} lights, ${kit.colliders.length} colliders, ${buildMs.toFixed(0)} ms`);
  group.visible = false;
  return room;
}
function countMeshes(group) {
  let n = 0;
  group.traverse((o) => {
    if (o.isMesh || o.isPoints || o.isLine) n++;
  });
  return n;
}
function hashSeed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// ---------------------------------------------------------------------------
// Streaming-lite: current room + door neighbours
// ---------------------------------------------------------------------------
let activeIds = [];
let currentRoom = null;
function roomAt(pos) {
  let best = null;
  for (const r of rooms.values()) if (inside(pos, r.manifest.bounds, 0.01)) best = best || r;
  return best;
}
function setActive(room) {
  currentRoom = room;
  const set = new Set([room.manifest.id]);
  for (const d of room.manifest.doors || []) if (rooms.has(d.to)) set.add(d.to);
  for (const r of rooms.values()) if ((r.manifest.doors || []).some((d) => d.to === room.manifest.id)) set.add(r.manifest.id);
  activeIds = [...set];
  const colliders = [];
  for (const r of rooms.values()) {
    const on = set.has(r.manifest.id);
    r.group.visible = on;
    if (on) colliders.push(...r.colliders);
  }
  player.colliders = colliders;
  lightInfo = applyLights(activeIds.map((id) => rooms.get(id)), camera.position, room.manifest.id);
  hud.setStatus(`${room.manifest.name} · active: ${activeIds.join(", ")}`);
}
let lightInfo = { points: 0, spots: 0, dropped: 0 };

function teleport(arg) {
  let pos;
  let yaw = 0;
  if (typeof arg === "string") {
    const r = rooms.get(arg);
    if (!r) throw new Error("unknown room " + arg);
    pos = r.manifest.spawn.pos;
    yaw = r.manifest.spawn.yaw || 0;
  } else {
    pos = arg.pos;
    yaw = arg.yaw || 0;
  }
  setPose(pos, yaw, 0);
  const r = roomAt(pos) || currentRoom;
  if (r) setActive(r);
}
function setPose(pos, yawDeg, pitchDeg) {
  player.position.set(pos[0], pos[1], pos[2]);
  player.yaw = THREE.MathUtils.degToRad(yawDeg);
  player.pitch = THREE.MathUtils.degToRad(pitchDeg);
  player.velocity.set(0, 0, 0);
  player.bobPhase = 0;
  player.bobAmount = 0;
  player.updateCamera(0);
  camera.updateMatrixWorld(true);
}

// ---------------------------------------------------------------------------
// Environment capture from the current eye position (metals need a real interior in the env map)
// ---------------------------------------------------------------------------
function captureEnvironment() {
  const cubeRT = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType, generateMipmaps: false });
  const cubeCam = new THREE.CubeCamera(0.1, 200, cubeRT);
  cubeCam.position.copy(camera.position);
  const savedFog = scene.fog;
  scene.fog = null;
  const emissives = Object.values(materials).filter((m) => m && m.isMaterial && m.emissiveIntensity !== undefined && m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b > 0.5 || m.emissiveMap));
  const saved = emissives.map((m) => m.emissiveIntensity);
  emissives.forEach((m) => (m.emissiveIntensity *= 0.25));
  cubeCam.update(renderer, scene);
  emissives.forEach((m, i) => (m.emissiveIntensity = saved[i]));
  scene.fog = savedFog;
  if (scene.environment && scene.environment !== baseEnv) scene.environment.dispose();
  scene.environment = pmrem.fromCubemap(cubeRT.texture).texture;
  scene.environmentIntensity = 0.45;
  cubeRT.dispose();
}
const baseEnv = scene.environment;

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
player = new Player(camera, canvas, []);
player.onLockChange = (locked) => {
  if (locked) hud.hideStart();
  else if (!debugMode) hud.showStart();
};
hud.startEl.addEventListener("click", () => player.requestLock());
const post = createPost(renderer, scene, camera);
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  post.setSize(window.innerWidth, window.innerHeight);
});

let debugMode = false;
let exteriorView = false;
let framesRendered = 0;
let frameMs = 16;
let pendingCapture = null;
let needEnv = true;

const debugAPI = {
  ready: false,
  views: [],
  warnings,
  rooms: {},
  setView(name) {
    const v = views.get(name);
    if (!v) throw new Error("unknown view " + name);
    debugMode = true;
    hud.hideStart();
    player.headBob = false;
    player.frozen = true;
    frozenTime = 40;
    space.setTime(40);
    if (v.view.mode === "exterior") {
      exteriorView = true;
      camera.position.set(...v.view.camPos);
      camera.lookAt(...v.view.lookAt);
      camera.updateMatrixWorld(true);
      for (const r of rooms.values()) r.group.visible = true;
      lightInfo = applyLights([...rooms.values()], camera.position);
    } else {
      exteriorView = false;
      setPose(v.view.pos, v.view.yaw || 0, v.view.pitch || 0);
      setActive(rooms.get(v.room));
    }
    post.finalPass.uniforms.seed.value = 0.37;
    debugAPI.freezeGrain = true;
    needEnv = true;
    framesRendered = 0;
    return true;
  },
  teleport,
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
  frames() {
    return framesRendered;
  },
  getStats() {
    const info = renderer.info;
    const active = activeIds.map((id) => rooms.get(id));
    return {
      frameMs: +frameMs.toFixed(2),
      fps: +(1000 / frameMs).toFixed(1),
      calls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs ? info.programs.length : 0,
      colliders: player.colliders.length,
      lights: lightInfo.points + lightInfo.spots,
      lightsDropped: lightInfo.dropped,
      descriptors: active.reduce((n, r) => n + r.lights.length, 0),
      active: activeIds,
      current: currentRoom ? currentRoom.manifest.id : null,
      pixelRatio: renderer.getPixelRatio(),
    };
  },
  roomStats() {
    const out = {};
    for (const r of rooms.values()) out[r.manifest.id] = r.stats;
    return out;
  },
  // compatibility stubs for tools/shots.mjs (Kestrel interaction passes)
  lookAt() {
    return false;
  },
  hovered() {
    return null;
  },
  interact() {
    return false;
  },
  pressE() {},
  status() {
    return hud.statusText();
  },
  fadeOpacity() {
    return hud.fadeOpacity();
  },
  setRest() {},
  restLevel() {
    return 0;
  },
  setPixelRatio(r) {
    renderer.setPixelRatio(r);
    renderer.setSize(window.innerWidth, window.innerHeight);
    post.setSize(window.innerWidth, window.innerHeight);
  },
  player,
  space,
  post,
  scene,
  renderer,
  camera,
};
window.debugAPI = debugAPI;

let showStats = false;
document.addEventListener("keydown", (e) => {
  if (e.code === "F3") {
    showStats = !showStats;
    hud.toggleStats(showStats);
  }
});

let last = performance.now();
function frame() {
  requestAnimationFrame(frame);
  const now = performance.now();
  frameMs += (now - last - frameMs) * 0.1;
  last = now;
  timer.update();
  const dt = frozenTime !== null ? 0 : Math.min(timer.getDelta(), 0.1);
  const t = timeFn();
  renderer.info.reset();

  if (needEnv && framesRendered >= 1) {
    captureEnvironment();
    needEnv = false;
  }
  if (!exteriorView) {
    player.update(dt);
    if (!debugMode) {
      const r = roomAt([player.position.x, player.position.y, player.position.z]);
      if (r && r !== currentRoom) setActive(r);
    }
  }
  space.update(dt);
  for (const id of activeIds) {
    const r = rooms.get(id);
    if (r && r.result && typeof r.result.update === "function") r.result.update(dt, t);
  }
  if (noPost) renderer.render(scene, camera);
  else post.render(debugAPI.freezeGrain ? 0.37 : t);
  framesRendered++;
  if (pendingCapture) {
    const { x, y, w, h, resolve } = pendingCapture;
    pendingCapture = null;
    const c2 = document.createElement("canvas");
    c2.width = w;
    c2.height = h;
    const g = c2.getContext("2d");
    const pr = renderer.getPixelRatio();
    g.drawImage(canvas, x * pr, y * pr, w * pr, h * pr, 0, 0, w, h);
    resolve(Array.from(g.getImageData(0, 0, w, h).data));
  }
  if (showStats) {
    const s = debugAPI.getStats();
    hud.setStats(`${s.fps} fps  ${s.frameMs} ms\n${s.calls} calls  ${(s.triangles / 1000).toFixed(1)}k tris\n${s.lights} lights (${s.descriptors} desc)\n${s.current}`);
  }
}

(async () => {
  const manifests = await loadModules();
  hud.setStatus(`Building ${manifests.length} modules…`);
  for (const m of manifests) {
    buildRoom(m);
    await new Promise((r) => setTimeout(r, 0));
  }
  pairDoors();
  debugAPI.views = [...views.keys()];
  debugAPI.rooms = debugAPI.roomStats();
  const spawnId = params.get("spawn") || (rooms.has("d1-bridge") ? "d1-bridge" : manifests[0] && manifests[0].id);
  if (spawnId && rooms.has(spawnId)) teleport(spawnId);
  console.log(`[registry-shim] ${rooms.size} modules, ${views.size} views, ${warnings.length} warnings`);
  debugAPI.ready = true;
  frame();
})();
