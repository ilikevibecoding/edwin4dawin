import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildImperialMaterials, IMP_TIME, IMP } from "./materials/imperial.js";
import { buildSpace } from "./space.js";
import { buildExterior } from "./exterior/hull.js";
import { buildGreebles } from "./exterior/greebles.js";
import { createTraffic } from "./hangar/traffic.js";
import { Player } from "./player.js";
import { Interactions } from "./interact.js";
import { createPost } from "./post.js";
import { createHUD } from "./hud.js";
import { ZoneManager } from "./core/zone.js";
import { LightPool } from "./core/lightpool.js";
import { Perf } from "./core/perf.js";
import { AudioBus } from "./core/audio.js";
import { SyncRegistry } from "./core/sync.js";
import { LiftSystem } from "./interior/lifts.js";
import { builderFor, buildableRoomIds, isDedicated } from "./interior/rooms/index.js";
import { ExteriorCamera, EXTERIOR_PRESETS, PRESET_KEYS } from "./camera/exterior.js";
import { CameraModes } from "./camera/modes.js";
import { createFlightSystems } from "./systems/flight.js";
import { ROOMS, CLUSTERS, SPAWNS, roomFloorY, roomCenter, HULL } from "./config/layout.js";

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
scene.fog = null;

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 2, 260000);
scene.add(camera);

const hud = createHUD();
const perf = new Perf(renderer);
const audio = new AudioBus();
const sync = new SyncRegistry();

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------
const tBuild0 = performance.now();
const mats = buildImperialMaterials();
const tMats = performance.now() - tBuild0;
const space = buildSpace(scene);

// Sun: one directional light following the far-field sun, shadow frustum fitted per camera mode
const sun = new THREE.DirectionalLight(0xfff1dc, 3.8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.6;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 4000;
scene.add(sun);
scene.add(sun.target);
const hemi = new THREE.HemisphereLight(0x7f8ea8, 0x1a1c22, 0.2);
scene.add(hemi);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.28;

const tExt0 = performance.now();
const exterior = buildExterior(mats);
scene.add(exterior.group);
const greebles = buildGreebles(mats);
exterior.group.add(greebles.group);
const tExt = performance.now() - tExt0;

// Interior: rooms, lifts, doors
const zone = new ZoneManager(scene, mats);
const player = new Player(camera, canvas, [], []);
const lifts = new LiftSystem({ zone, mats, player, hud, audio, onArrive: (cluster) => audio.setZone(cluster) });
const tInt0 = performance.now();
const roomBuild = {};
for (const id of buildableRoomIds()) {
  const room = zone.addRoom(id, builderFor(id, { lifts }));
  roomBuild[id] = { ms: +room.buildMs.toFixed(1), dedicated: isDedicated(id) || ROOMS[id].corridor || ROOMS[id].lobby };
}
zone.finalize();
const tInt = performance.now() - tInt0;

// Fighter traffic
const traffic = createTraffic({ mats, audio, zone });
scene.add(traffic.group);
const flightSystems = createFlightSystems(traffic);

const lightPool = new LightPool(scene, { points: 12, spots: 2 });
const interactions = new Interactions({ camera, player, hud });

// Locked doors get an "Authorize" keypad interaction (both sides)
for (const d of zone.doors) {
  if (!d.spec.locked) continue;
  const rooms = d.rooms.map((id) => zone.rooms.get(id)).filter(Boolean);
  d.keypads.forEach((p, i) => {
    const mat = new THREE.MeshStandardMaterial({ color: 0x1a1d22, emissive: IMP.red, emissiveIntensity: 0.5, roughness: 0.4 });
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.06), mat);
    pad.position.copy(p);
    if (d.spec.axis === "x") pad.rotation.y = Math.PI / 2;
    d.group.add(pad);
    const item = {
      object: pad,
      material: mat,
      id: "keypad:" + d.id + ":" + i,
      key: "E",
      label: () => (d.locked ? `Authorize — ${d.lockLabel}` : "Authorized"),
      onActivate: () => {
        if (!d.locked) return false;
        d.unlock();
        mat.emissive.copy(IMP.green);
        audio.play("unlock");
        hud.setStatus(`${d.lockLabel} clearance accepted.`);
        return true;
      },
    };
    for (const r of rooms) r.interactables.push(item);
  });
}
// door sounds
for (const d of zone.doors) {
  d.onChange((door, s) => {
    if (s === "opening") audio.play(door.style === "blast" ? "blast_door" : "door_open");
    else if (s === "closing") audio.play(door.style === "blast" ? "blast_door" : "door_close");
  });
}

sync.register("doors", { getState: () => zone.doors.map((d) => d.getState()), applyState: (s) => s.forEach((st) => zone.doorById(st.id)?.applyState(st)) });
sync.register("lifts", lifts);
sync.register("traffic", traffic);
sync.register("player", { getState: () => ({ x: +player.position.x.toFixed(2), y: +player.position.y.toFixed(2), z: +player.position.z.toFixed(2), yaw: +player.yaw.toFixed(3) }) });

// ---------------------------------------------------------------------------
// Cameras
// ---------------------------------------------------------------------------
const exteriorCam = new ExteriorCamera(camera, canvas);
exteriorCam.autoOrbit = 0.03;
const modes = new CameraModes({ camera, player, exterior: exteriorCam, hud, zone, audio });
modes.onChange((mode) => {
  audio.setZone(mode === "exterior" ? "exterior" : zone.currentCluster || "tower");
  post.ao.configuration.aoRadius = mode === "exterior" ? 6 : 0.9;
  post.ao.configuration.intensity = mode === "exterior" ? 1.6 : 2.6;
  perf.extra.mode = mode;
});
zone.onRoomChange = (room) => {
  if (room) hud.setLocation(room.spec.name);
  perf.extra.room = room ? room.id : null;
};
zone.onClusterChange = (cl) => {
  if (cl && modes.mode === "interior") audio.setZone(cl === "tower" && zone.current && zone.current.id === "bridge" ? "bridge" : cl);
};

player.onLockChange = (locked) => {
  if (!locked && modes.mode === "interior" && !debugMode && !modes.busy) hud.showHint("Pointer released — click to resume", 3000);
};
canvas.addEventListener("click", () => {
  if (modes.mode === "interior" && !player.locked && !debugMode) player.requestLock();
});
hud.startEl.addEventListener("click", () => {
  audio.start();
  hud.hideStart();
  hud.setStatus("Exterior view. Drag to orbit, wheel to zoom, 1–8 presets, F to board.");
});
document.addEventListener("keydown", () => audio.start(), { once: true });

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

// Adaptive quality: step render resolution / AO quality, never content
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

// Shadow frustum follows the point of interest
const shadowTmp = new THREE.Vector3();
function fitSunShadow() {
  const dir = space.sunWorld;
  const cam = sun.shadow.camera;
  let focus;
  let half;
  if (modes.mode === "interior") {
    focus = player.position;
    half = 70;
  } else {
    focus = exteriorCam.sTarget;
    half = THREE.MathUtils.clamp(exteriorCam.distance * 0.9, 160, 1250);
  }
  sun.target.position.copy(focus);
  shadowTmp.copy(dir).multiplyScalar(half * 2.2).add(focus);
  sun.position.copy(shadowTmp);
  cam.left = -half;
  cam.right = half;
  cam.top = half;
  cam.bottom = -half;
  cam.near = 1;
  cam.far = half * 4.6;
  cam.updateProjectionMatrix();
  sun.shadow.normalBias = half > 200 ? 2.5 : 0.12;
}

// ---------------------------------------------------------------------------
// Debug API (deterministic camera placement for the screenshot harness)
// ---------------------------------------------------------------------------
let debugMode = false;
let framesRendered = 0;
let pendingCapture = null;
let debugWalk = null;
const debugAPI = {
  ready: false,
  get views() {
    return Object.keys(zone.allViews());
  },
  get exteriorViews() {
    return PRESET_KEYS;
  },
  // interior room view (name from any room's ctx.view)
  setView(name) {
    const v = zone.allViews()[name];
    if (!v) throw new Error("unknown view " + name);
    debugMode = true;
    quality.enabled = false;
    hud.hideStart();
    if (modes.mode !== "interior") modes.setInteriorImmediate("tower");
    player.headBob = false;
    player.frozen = true;
    const floor = ROOMS[v.room] ? roomFloorY(v.room) : v.y - 1.7;
    player.teleport(v.x, floor, v.z, THREE.MathUtils.degToRad(v.yaw));
    player.pitch = THREE.MathUtils.degToRad(v.pitch);
    player.updateCamera(0);
    zone.update(0, player.position, camera.position, "interior");
    post.finalPass.uniforms.seed.value = 0.37;
    debugAPI.freezeGrain = true;
    framesRendered = 0;
    return true;
  },
  setExteriorView(name) {
    if (!EXTERIOR_PRESETS[name]) throw new Error("unknown exterior view " + name);
    debugMode = true;
    quality.enabled = false;
    hud.hideStart();
    if (modes.mode !== "exterior") modes.setExteriorImmediate(name);
    exteriorCam.autoOrbit = 0;
    exteriorCam.setPreset(name, true);
    debugAPI.freezeGrain = true;
    framesRendered = 0;
    return true;
  },
  // free exterior pose
  setExteriorPose(pos, look) {
    debugMode = true;
    quality.enabled = false;
    hud.hideStart();
    if (modes.mode !== "exterior") modes.setExteriorImmediate("reveal");
    exteriorCam.autoOrbit = 0;
    exteriorCam.setPose(pos, look);
    framesRendered = 0;
    return true;
  },
  // place the player at an arbitrary interior pose (feet x,z, floor from room, yaw/pitch deg)
  setPose(x, z, yawDeg, pitchDeg, y = null) {
    debugMode = true;
    quality.enabled = false;
    hud.hideStart();
    if (modes.mode !== "interior") modes.setInteriorImmediate("tower");
    player.headBob = false;
    player.frozen = true;
    let floor = y;
    if (floor === null) {
      // rooms of different decks overlap in plan: prefer the current deck, else the nearest floor
      const here = zone.roomAt(new THREE.Vector3(x, player.position.y, z));
      if (here) floor = here.floorY;
      else {
        let best = null;
        for (const r of zone.rooms.values()) {
          const [x0, z0, x1, z1] = r.spec.box;
          if (x < x0 || x > x1 || z < z0 || z > z1) continue;
          if (!best || Math.abs(r.floorY - player.position.y) < Math.abs(best.floorY - player.position.y)) best = r;
        }
        floor = best ? best.floorY : player.position.y;
      }
    }
    player.teleport(x, floor, z, THREE.MathUtils.degToRad(yawDeg));
    player.pitch = THREE.MathUtils.degToRad(pitchDeg);
    player.updateCamera(0);
    framesRendered = 0;
    return true;
  },
  // walk the player (debug): unfreezes and holds keys for `seconds` of SIMULATED time (dt-summed), so
  // the result does not depend on the frame rate of the machine running the harness
  walk(keyCodes, seconds) {
    player.frozen = false;
    player.locked = true;
    for (const k of keyCodes) player.keys.add(k);
    return new Promise((resolve) => {
      debugWalk = {
        remaining: seconds,
        done: () => {
          for (const k of keyCodes) player.keys.delete(k);
          debugWalk = null;
          resolve({ x: player.position.x, y: player.position.y, z: player.position.z });
        },
      };
    });
  },
  unfreeze() {
    player.frozen = false;
    player.locked = true;
  },
  board: (cluster) => modes.board(cluster),
  leave: () => modes.leave(),
  ride: (lobbyId, cluster) => lifts.rideFrom(lobbyId, cluster),
  openDoor(id) {
    const d = zone.doorById(id);
    if (!d) return false;
    d.locked = false;
    d.setState("opening");
    return true;
  },
  unlockAll() {
    for (const d of zone.doors) d.unlock();
  },
  currentRoom: () => (zone.current ? zone.current.id : null),
  rooms: () => [...zone.rooms.keys()],
  roomInfo: () => roomBuild,
  doors: () => zone.doors.map((d) => d.getState()),
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
  lookAt: null,
  hovered: () => (interactions.hovered ? interactions.hovered.id : null),
  interact: (id) => interactions.activate(id),
  pressE: () => document.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" })),
  pressKey: (code, key) => document.dispatchEvent(new KeyboardEvent("keydown", { code, key })),
  status: () => hud.statusText(),
  fadeOpacity: () => hud.fadeOpacity(),
  frames: () => framesRendered,
  getStats() {
    return perf.stats({
      visibleRooms: zone.stats.visibleRooms,
      colliders: zone.stats.colliders,
      lightDescs: zone.stats.lightDescs,
      lights: lightPool.count + 2,
      mode: modes.mode,
      room: zone.current ? zone.current.id : null,
      qualityLevel: quality.level,
      pixelRatio: renderer.getPixelRatio(),
      buildMs: { materials: Math.round(tMats), exterior: Math.round(tExt), interior: Math.round(tInt) },
      exteriorTris: exterior.stats.triangles,
      greebles: greebles.stats,
      traffic: traffic.stats,
      syncBytes: sync.size(),
    });
  },
  snapshot: () => sync.snapshot(),
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
  zone,
  lifts,
  modes,
  exteriorCam,
  traffic,
  flightSystems,
  layout: { ROOMS, CLUSTERS, SPAWNS, HULL },
};
window.debugAPI = debugAPI;

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------
let showStats = false;
document.addEventListener("keydown", (e) => {
  if (e.code === "F3") {
    e.preventDefault();
    showStats = !showStats;
    hud.toggleStats(showStats);
  }
});

const timer = new THREE.Timer();
let last = performance.now();
modes.setExteriorImmediate("reveal");
hud.setStartInfo(`build ${__BUILD_TIME__}`);

function frame() {
  requestAnimationFrame(frame);
  const now = performance.now();
  perf.frame(now - last);
  last = now;
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.1);
  const t = timer.getElapsed();
  renderer.info.reset();
  IMP_TIME.value = t;

  if (debugWalk) {
    debugWalk.remaining -= dt;
    if (debugWalk.remaining <= 0) debugWalk.done();
  }
  space.update(dt);
  sun.position.copy(space.sunWorld).multiplyScalar(1000);
  exteriorCam.update(dt);
  if (modes.mode === "interior") player.update(dt);
  const vis = zone.update(dt, modes.mode === "interior" ? player.position : null, camera.position, modes.mode);
  if (modes.mode === "interior") {
    const sets = zone.collisionSets();
    player.colliders = sets.colliders;
    player.walkables = sets.walkables;
    interactions.setItems(zone.interactables());
    interactions.enabled = !modes.busy;
    interactions.update();
  } else {
    interactions.setItems([]);
  }
  lightPool.assign(zone.lightDescs(), modes.mode === "interior" ? player.position : camera.position);
  lightPool.update(dt);
  zone.runAnimators(dt, t);
  lifts.update(dt, t);
  traffic.update(dt, t, camera.position);
  greebles.update(camera.position);
  exterior.update(dt, camera.position);
  fitSunShadow();
  if (framesRendered > 60) updateQuality(dt);

  if (debugAPI.directRender) renderer.render(scene, camera);
  else post.render(debugAPI.freezeGrain ? 0.37 : t);
  framesRendered++;
  if (framesRendered === 3) perf.markLoaded();
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
  if (showStats) hud.setStats(perf.overlayText(debugAPI.getStats()));
}

debugAPI.ready = true;
frame();
