import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildMaterials } from "./materials.js";
import { buildSpace } from "./space.js";
import { Player } from "./player.js";
import { Interactions } from "./interact.js";
import { createPost } from "./post.js";
import { createHUD } from "./hud.js";
import { createInterior } from "./interior/interior.js";
import { buildExterior } from "./exterior/exterior.js";
import { createTraffic } from "./traffic/fighters.js";
import { CameraDirector } from "./camera/director.js";
import { createMetrics } from "./perf/metrics.js";
import { createAudioBus } from "./fx/audio.js";
import { createReservedSystems } from "./systems/reserved.js";
import { hasDedicatedBuilder } from "./interior/rooms/index.js";
import { DECKS } from "./interior/layout.js";

// ---------------------------------------------------------------------------
// Renderer / scene. Reverse-Z (EXT_clip_control) gives the depth precision to render a 0.08 m near
// plane inside the bridge and the 1,600 m hull through its windows in one pass; logarithmic depth
// is the fallback where the extension is missing.
// ---------------------------------------------------------------------------
const canvas = document.getElementById("view");
const probe = document.createElement("canvas").getContext("webgl2");
const reverseDepth = !!(probe && probe.getExtension("EXT_clip_control"));
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", stencil: false, reverseDepthBuffer: reverseDepth, logarithmicDepthBuffer: !reverseDepth });
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
const INTERIOR_FOG = new THREE.FogExp2(0x0a0c10, 0.006);
scene.fog = INTERIOR_FOG;

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.08, 60000);
scene.add(camera);

const hud = createHUD();
const audio = createAudioBus();
const metrics = createMetrics(renderer, scene);
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

// ---------------------------------------------------------------------------
// World (staged so the loading bar can update between the heavy synchronous builds)
// ---------------------------------------------------------------------------
let materials, space, exterior, interior, traffic, player, interactions, director, post, systems;
const hemi = new THREE.HemisphereLight(0x5a6f86, 0x2a2f38, 0.18);
scene.add(hemi);
const pmrem = new THREE.PMREMGenerator(renderer);

async function init() {
  hud.setLoading(0.05, "Generating materials…");
  await nextFrame();
  materials = buildMaterials();
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  hud.setLoading(0.25, "Charting the star field…");
  await nextFrame();
  space = buildSpace(scene, { scale: 9, turnRateDeg: 0.22, dustRange: 1100, dustSpeed: 140, dustCount: 70, dustOpacity: 0.22 });

  hud.setLoading(0.4, "Laying hull plating…");
  await nextFrame();
  exterior = buildExterior(scene, materials);

  hud.setLoading(0.55, "Fuelling the fighter wing…");
  await nextFrame();
  traffic = createTraffic({ scene, materials, audio, count: 8 });
  systems = createReservedSystems(traffic);

  hud.setLoading(0.65, "Pressurising decks…");
  await nextFrame();
  player = new Player(camera, canvas, []);
  interior = createInterior({ scene, materials, player, hud, audio, traffic, exterior });
  interior.ensureDeckBuilt("bridge");

  hud.setLoading(0.9, "Powering post-processing…");
  await nextFrame();
  post = createPost(renderer, scene, camera);
  interactions = new Interactions({ camera, interactables: [], lighting: null, space, player, hud, audio });
  director = new CameraDirector({ camera, canvas, player, interior, exterior, space, hud, post, scene, audio });
  director.onModeChange = (mode) => {
    interactions.enabled = mode === "interior";
    audio.setZone(mode === "exterior" ? "exterior" : zoneFor(interior.currentSector));
  };
  interior.onSectorChange((sector) => {
    hud.setLocation(sector.deck.name, sector.def.name);
    interactions.setItems(interior.visibleSectors.flatMap((s) => s.interactables));
    audio.setZone(zoneFor(sector));
  });
  interior.teleport("d1_bridge", { yaw: 0 });
  hud.setLocation(interior.currentSector.deck.name, interior.currentSector.def.name);
  interactions.setItems(interior.visibleSectors.flatMap((s) => s.interactables));
  player.onLockChange = (locked) => {
    if (locked) hud.hideStart();
    else if (!debugMode && director.mode === "interior") hud.showStart();
  };
  player.onStep = (pos) => audio.event("footstep", pos);
  hud.startEl.addEventListener("click", () => {
    audio.unlock();
    if (director.mode === "interior") player.requestLock();
    else hud.hideStart();
  });
  canvas.addEventListener("click", () => {
    audio.unlock();
    if (director.mode === "interior" && !player.locked && !debugMode) player.requestLock();
  });
  director.applyModeSettings();
  hud.setMode("interior");
  hud.setHint("WASD move · Shift sprint · mouse look · E interact · V exterior view · F3 stats");
  hud.setLoading(1);
  hud.showStart();
  metrics.markReady();
  debugAPI.ready = true;
}

function zoneFor(sector) {
  if (!sector) return "corridor";
  const id = sector.id;
  if (id === "d5_hangar" || id === "d5_fighterbay" || id === "d5_shuttlebay") return "hangar";
  if (id.startsWith("d4_")) return "engineering";
  if (id === "d1_bridge") return "bridge";
  if (sector.def.kind === "lift") return "lift";
  return "corridor";
}

// ---------------------------------------------------------------------------
// Resize / adaptive quality (resolution + AO quality; never removes content)
// ---------------------------------------------------------------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (post) post.setSize(window.innerWidth, window.innerHeight);
});
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
// Debug API (deterministic camera placement for screenshots + navigation / perf tests)
// ---------------------------------------------------------------------------
let debugMode = false;
// interior views: sector + deck-local x/z + yaw/pitch (deg)
const INTERIOR_VIEWS = {
  bridge_aft: { sector: "d1_bridge", x: 0, z: -17, yaw: 0, pitch: -4 },
  bridge_window: { sector: "d1_bridge", x: 0, z: -44, yaw: 0, pitch: -8 },
  bridge_pit: { sector: "d1_bridge", x: 6.5, z: -28, yaw: -90, pitch: -6 },
  bridge_side: { sector: "d1_bridge", x: -18, z: -30, yaw: 70, pitch: -3 },
  lobby: { sector: "d1_lobby", x: 0, z: 1, yaw: 180, pitch: -2 },
  corridor_bridge: { sector: "d1_corridor", x: 0, z: -4, yaw: 0, pitch: -2 },
  lift: { sector: "d1_lift", x: 0, z: 4.2, yaw: 180, pitch: -6 },
  comms: { sector: "d1_comms", x: 4, z: -8.5, yaw: -90, pitch: -3 },
  intel: { sector: "d1_intel", x: -4, z: -8.5, yaw: 90, pitch: -3 },
  tactical: { sector: "d2_tactical", x: -4, z: -16, yaw: 90, pitch: -6 },
  navigation: { sector: "d2_nav", x: 4, z: -18, yaw: -90, pitch: -4 },
  briefing: { sector: "d2_briefing", x: 4, z: -7.5, yaw: -90, pitch: -4 },
  officers: { sector: "d2_officers", x: -7, z: 0, yaw: 90, pitch: -4 },
  observation: { sector: "d2_observation", x: 0, z: -36, yaw: 0, pitch: -3 },
  mess: { sector: "d3_mess", x: 5, z: -19, yaw: -90, pitch: -4 },
  quarters: { sector: "d3_quarters", x: -5, z: -19, yaw: 90, pitch: -4 },
  medbay: { sector: "d3_medbay", x: 5, z: -53, yaw: -90, pitch: -4 },
  recreation: { sector: "d3_rec", x: -5, z: -53, yaw: 90, pitch: -4 },
  armory: { sector: "d3_armory", x: -44, z: -36, yaw: 90, pitch: -4 },
  detention: { sector: "d3_detention", x: 44, z: -36, yaw: -90, pitch: -4 },
  escape: { sector: "d3_escape", x: 0, z: -72, yaw: 0, pitch: -4 },
  lifesupport: { sector: "d3_lifesupport", x: -7, z: 0, yaw: 90, pitch: -4 },
  corridor_crew: { sector: "d3_corridor", x: 0, z: -6, yaw: 0, pitch: -2 },
  engineering: { sector: "d4_engctrl", x: -5, z: -19, yaw: 90, pitch: -4 },
  hyperdrive: { sector: "d4_hyperdrive", x: 5, z: -19, yaw: -90, pitch: -4 },
  maintenance: { sector: "d4_maintenance", x: 5, z: -50, yaw: -90, pitch: -4 },
  cargo: { sector: "d4_cargo", x: -5, z: -50, yaw: 90, pitch: -4 },
  reactor: { sector: "d4_reactor", x: 0, z: -67, yaw: 0, pitch: -2 },
  hangar_entry: { sector: "d5_hangar", x: 0, z: -37, yaw: 0, pitch: -4 },
  hangar_deck: { sector: "d5_hangar", x: -20, z: -60, yaw: 40, pitch: -2 },
  hangar_racks: { sector: "d5_hangar", x: 10, z: -95, yaw: -110, pitch: 10 },
  fighterbay: { sector: "d5_fighterbay", x: 38, z: -100, yaw: -90, pitch: -4 },
  shuttlebay: { sector: "d5_shuttlebay", x: -38, z: -105, yaw: 90, pitch: -4 },
  hangar_cargo: { sector: "d5_cargo", x: 5, z: -19, yaw: -90, pitch: -4 },
};

let framesRendered = 0;
let pendingCapture = null;
const debugAPI = {
  ready: false,
  get views() {
    return [...Object.keys(exterior ? exterior.stations : {}), ...Object.keys(INTERIOR_VIEWS)];
  },
  interiorViews: Object.keys(INTERIOR_VIEWS),
  async setView(name) {
    debugMode = true;
    quality.enabled = false;
    hud.hideStart();
    player.headBob = false;
    post.finalPass.uniforms.seed.value = 0.37;
    debugAPI.freezeGrain = true;
    if (name.startsWith("ext@")) {
      // ad-hoc exterior camera: ext@px,py,pz,lx,ly,lz
      const n = name.slice(4).split(",").map(Number);
      await director.toExterior("exterior_medium", true);
      exterior.stations.__adhoc = { pos: [n[0], n[1], n[2]], look: [n[3], n[4], n[5]] };
      director.goToStation("__adhoc", true);
      hud.fadeOut(0);
    } else if (exterior.stations[name]) {
      await director.toExterior(name, true);
      director.goToStation(name, true);
      hud.fadeOut(0);
    } else {
      // ad-hoc interior camera: <sectorId>@x,z,yaw,pitch[,y]  (deck-local metres / degrees)
      let v = INTERIOR_VIEWS[name];
      if (!v && name.includes("@")) {
        const [sector, rest] = name.split("@");
        const n = rest.split(",").map(Number);
        v = { sector, x: n[0], z: n[1], yaw: n[2] || 0, pitch: n[3] || 0, y: n.length > 4 ? n[4] : undefined };
      }
      if (!v) throw new Error("unknown view " + name);
      await director.toInterior(v.sector, true);
      interior.teleport(v.sector, { x: v.x, z: v.z, yaw: v.yaw, pitch: v.pitch, y: v.y });
      player.frozen = true;
      hud.fadeOut(0);
    }
    space.setTime(40);
    framesRendered = 0;
    return true;
  },
  /** Walk-through helper: teleport to a sector spawn (interior mode). */
  async teleport(sectorId) {
    debugMode = true;
    hud.hideStart();
    if (director.mode !== "interior") await director.toInterior(sectorId, true);
    const s = interior.teleport(sectorId);
    player.frozen = false;
    player.locked = true;
    framesRendered = 0;
    return { sector: s.id, pos: player.position.toArray(), floorY: s.floorY, visible: interior.visibleSectors.map((x) => x.id) };
  },
  /** Move the player toward a world point for `seconds` using the real controller (collision test). */
  walkTo(x, z, seconds = 2, dt = 1 / 60) {
    player.locked = true;
    player.frozen = false;
    const start = player.position.clone();
    let steps = 0;
    let lastD = Infinity;
    let stuck = 0;
    let sidestep = 0;
    for (let t = 0; t < seconds; t += dt) {
      const dx = x - player.position.x;
      const dz = z - player.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.15) break;
      player.yaw = Math.atan2(-dx, -dz);
      // stuck against an obstacle: strafe for half a second, alternating sides
      if (d > lastD - 0.002) stuck += dt;
      else stuck = 0;
      lastD = d;
      const keys = ["KeyW", "ShiftLeft"];
      if (stuck > 0.4) {
        sidestep = sidestep || (Math.floor(t * 2) % 2 ? 1 : -1);
        keys.push(sidestep > 0 ? "KeyD" : "KeyA");
        if (stuck > 1.2) {
          sidestep = -sidestep;
          stuck = 0.5;
        }
      } else sidestep = 0;
      player.keys = new Set(keys);
      player.update(dt);
      interior.update(dt, t);
      steps++;
    }
    player.keys = new Set();
    const s = interior.currentSector;
    return { from: start.toArray(), to: player.position.toArray(), reached: Math.hypot(x - player.position.x, z - player.position.z) < 0.6, steps, sector: s ? s.id : null };
  },
  /** Step the simulation (player, interior, doors, lift, traffic) without rendering. */
  advance(seconds, dt = 1 / 30) {
    player.locked = true;
    for (let t = 0; t < seconds; t += dt) {
      player.update(dt);
      interior.update(dt, t);
      traffic.update(dt, t);
    }
    return debugAPI.current();
  },
  /** Open the door nearest the player instantly (for traversal tests). */
  openNearestDoor() {
    let best = null;
    let bd = Infinity;
    for (const s of interior.visibleSectors) for (const d of s.doors) {
      const dist = d.worldCenter.distanceTo(player.position);
      if (dist < bd) {
        bd = dist;
        best = d;
      }
    }
    if (best) {
      best.openness = 1;
      best.target = 1;
      best.update(0, player.position, true);
    }
    return best ? { door: best.group.name, dist: +bd.toFixed(2) } : null;
  },
  lift(deckId) {
    return interior.lift.go(deckId);
  },
  liftState() {
    return interior.lift.state;
  },
  sectors() {
    return DECKS.flatMap((d) => d.sectors.map((s) => ({ id: s.id, deck: d.id, kind: s.kind, builder: s.builder || s.kind, dedicated: s.builder ? hasDedicatedBuilder(s.builder) : true })));
  },
  current() {
    const s = interior.currentSector;
    return s ? { id: s.id, deck: s.deck.id, visible: interior.visibleSectors.map((x) => x.id), colliders: player.colliders.length } : null;
  },
  doors() {
    const out = [];
    for (const deck of interior.decks) for (const d of deck.doors) out.push({ name: d.group.name, state: d.state, openness: +d.openness.toFixed(2), style: d.def.style });
    return out;
  },
  trafficSnapshot() {
    return traffic.snapshot();
  },
  trafficCounts() {
    return traffic.counts();
  },
  requestLaunch(n) {
    return traffic.requestLaunch(n);
  },
  advanceTraffic(seconds, dt = 0.1) {
    for (let t = 0; t < seconds; t += dt) traffic.update(dt, t);
    return traffic.counts();
  },
  reserved() {
    return systems.summary();
  },
  audioLog() {
    return audio.log.slice(-40);
  },
  mode() {
    return director.mode;
  },
  async toExterior(station) {
    await director.toExterior(station || "exterior_medium", true);
    hud.fadeOut(0);
    framesRendered = 0;
    return director.mode;
  },
  async toInterior(sectorId) {
    await director.toInterior(sectorId || null, true);
    hud.fadeOut(0);
    framesRendered = 0;
    return director.mode;
  },
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
    return metrics.snapshot({
      mode: director ? director.mode : "loading",
      sector: interior && interior.currentSector ? interior.currentSector.id : null,
      colliders: player ? player.colliders.length : 0,
      lights: countLights(),
      poolLights: interior ? interior.lightUsage() : null,
      qualityLevel: quality.level,
      pixelRatio: renderer.getPixelRatio(),
      reverseDepth,
      hullPlates: exterior ? exterior.stats.plates : 0,
      hullGreebles: exterior ? exterior.stats.greebles : 0,
    });
  },
  setPixelRatio(r) {
    renderer.setPixelRatio(r);
    renderer.setSize(window.innerWidth, window.innerHeight);
    post.setSize(window.innerWidth, window.innerHeight);
  },
  get player() {
    return player;
  },
  get interior() {
    return interior;
  },
  get exterior() {
    return exterior;
  },
  get traffic() {
    return traffic;
  },
  get director() {
    return director;
  },
  scene,
  renderer,
};
window.debugAPI = debugAPI;

function countLights() {
  let n = 0;
  scene.traverse((o) => {
    if (o.isLight && o.visible && !o.isAmbientLight && !o.isHemisphereLight) {
      // count only lights whose ancestors are all visible
      let p = o.parent;
      let vis = true;
      while (p) {
        if (!p.visible) {
          vis = false;
          break;
        }
        p = p.parent;
      }
      if (vis) n++;
    }
  });
  return n;
}

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------
let showStats = false;
document.addEventListener("keydown", (e) => {
  if (e.code === "F3") {
    showStats = !showStats;
    hud.toggleStats(showStats);
  }
  if (e.code === "KeyM") audio.toggleMute();
});

const timer = new THREE.Timer();
let statsTick = 0;

function frame() {
  requestAnimationFrame(frame);
  if (!debugAPI.ready) return;
  metrics.begin();
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.1);
  const t = timer.getElapsed();
  renderer.info.reset();

  player.update(dt);
  director.update(dt);
  interior.update(dt, t);
  // exterior visible outside, or from rooms with windows; the hangar bay (a lit interior) is also
  // visible from outside through its ventral opening
  const showExterior = director.mode === "exterior" || interior.seesExterior();
  exterior.setVisible(showExterior);
  exterior.setViewMode(director.mode);
  if (showExterior) exterior.updateLOD(camera.position);
  exterior.update(dt, t);
  const hangar = interior.sectors.get("d5_hangar");
  if (director.mode === "exterior") {
    // stream the hangar bay in when the camera can see the ventral opening
    if (!hangar.built && camera.position.y < -30) interior.streamDeck("hangar");
    interior.setExteriorView(true);
  } else interior.setExteriorView(false);
  traffic.group.visible = showExterior || (hangar && hangar.visible);
  traffic.update(dt, t);
  systems.update(dt);
  space.update(dt);
  audio.setListener(camera.position);
  audio.update(dt);
  interactions.update();
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
  if (showStats && ++statsTick % 10 === 0) {
    const s = debugAPI.getStats();
    hud.setStats(`${s.fps} fps  ${s.frameMs} ms (p95 ${s.frameP95})\n${s.calls} calls  ${(s.triangles / 1000).toFixed(1)}k tris  ${s.visibleObjects} objs\n${s.lights} lights  ${s.textureMB} MB tex  ${s.jsHeapMB ?? "-"} MB heap\n${s.mode} · ${s.sector || ""}`);
  }
}

init().catch((e) => {
  console.error(e);
  hud.setLoading(0.99, "Failed to load: " + e.message);
});
frame();
