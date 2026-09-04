// DEV ONLY (Agent D). Bootstraps the shim registry with the shared renderer/post/HUD/player so Deck 4
// modules can be walked and screenshotted before src/core lands. Mirrors src/main.js's debugAPI so
// the shots harness protocol (ready / setView / frames / getStats / capturePixels) is unchanged.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildMaterials, PALETTE } from "../../materials.js";
import { Player, EYE_HEIGHT } from "../../player.js";
import { createPost } from "../../post.js";
import { createHUD } from "../../hud.js";
import { extendMaterials, extendPalette } from "./shim-materials.js";
import { createWorld } from "./shim-registry.js";

const params = new URLSearchParams(location.search);

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
const DEFAULT_FOG = 0.0035;
scene.fog = new THREE.FogExp2(0x06080c, DEFAULT_FOG);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 6000);
scene.add(camera);

const hud = createHUD();

// far starfield so the hangar aperture and exterior views read as space
{
  const n = 6000;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  let s = 12345;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1;
    const th = r() * Math.PI * 2;
    const rr = Math.sqrt(1 - u * u);
    const R = 5000;
    pos[i * 3] = rr * Math.cos(th) * R;
    pos[i * 3 + 1] = u * R;
    pos[i * 3 + 2] = rr * Math.sin(th) * R;
    const b = 0.4 + r() * 0.6;
    const tint = r();
    col[i * 3] = b * (tint < 0.2 ? 1.0 : 0.85);
    col[i * 3 + 1] = b * 0.9;
    col[i * 3 + 2] = b * (tint > 0.8 ? 1.0 : 0.9);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(g, new THREE.PointsMaterial({ size: 6, sizeAttenuation: true, vertexColors: true, fog: false }));
  stars.name = "dev_stars";
  scene.add(stars);
}

// ---------------------------------------------------------------------------
// Materials + palette (+ shim fill-ins for §10 names until the scaffold adds them)
// ---------------------------------------------------------------------------
const materials = extendMaterials(buildMaterials());
extendPalette(PALETTE);

const hemi = new THREE.HemisphereLight(0x5a6f86, 0x2a2c30, 0.12);
scene.add(hemi);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.25;

// ---------------------------------------------------------------------------
// Player with a real y (feet) and the §8 extras the contract promises (shake)
// ---------------------------------------------------------------------------
class DevPlayer extends Player {
  constructor(camera, dom) {
    super(camera, dom, []);
    this.shakeAmp = 0;
    this.shakeT = 0;
    this.shakeDur = 0;
  }
  setPose(x, z, yawDeg, pitchDeg, y = this.position.y) {
    this.position.set(x, y, z);
    this.yaw = THREE.MathUtils.degToRad(yawDeg);
    this.pitch = THREE.MathUtils.degToRad(pitchDeg);
    this.velocity.set(0, 0, 0);
    this.bobPhase = 0;
    this.bobAmount = 0;
    this.updateCamera(0);
    this.camera.updateMatrixWorld(true);
  }
  shake(amp = 0.02, seconds = 1) {
    this.shakeAmp = amp;
    this.shakeDur = seconds;
    this.shakeT = seconds;
  }
  update(dt) {
    super.update(dt);
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const k = (this.shakeT / this.shakeDur) * this.shakeAmp;
      this.camera.position.x += (Math.random() - 0.5) * k;
      this.camera.position.y += (Math.random() - 0.5) * k;
    }
  }
}
const player = new DevPlayer(camera, canvas);
player.onLockChange = (locked) => {
  if (locked) hud.hideStart();
  else if (!debugMode) hud.showStart();
};
hud.startEl.addEventListener("click", () => player.requestLock());

// ---------------------------------------------------------------------------
// World (shim registry)
// ---------------------------------------------------------------------------
const world = await createWorld({ THREE, scene, materials, PALETTE, hud, player });
console.log(`[registry] ${world.manifests.length} modules, ${world.warnings.length} warnings`);

let cameraMode = "interior";
function teleport(arg) {
  let pos;
  let yaw = 0;
  if (typeof arg === "string") {
    const e = world.rooms.get(arg);
    if (!e) throw new Error("teleport: unknown room " + arg);
    pos = e.manifest.spawn.pos;
    yaw = e.manifest.spawn.yaw || 0;
  } else {
    pos = arg.pos;
    yaw = arg.yaw ?? THREE.MathUtils.radToDeg(player.yaw);
  }
  cameraMode = "interior";
  player.setPose(pos[0], pos[2], yaw, arg.pitch ?? 0, pos[1]);
  world.refresh(player.position, "interior");
}
world.setTeleport(teleport);

// ---------------------------------------------------------------------------
// Interactions: generic version of Kestrel's (hover tint + prompt, E -> item.action())
// ---------------------------------------------------------------------------
const REACH = 2.8;
const HIGHLIGHT = new THREE.Color("#4fd8cc");
const interactions = {
  items: [],
  targets: [],
  hovered: null,
  busy: false,
  ray: new THREE.Raycaster(),
  setItems(items) {
    if (items.length === this.items.length && items.every((it, i) => it === this.items[i])) return;
    this.setHovered(null);
    this.items = items;
    this.targets = [];
    for (const it of items) {
      if (!it.object) continue;
      if (it.baseEmissive === undefined) {
        it.baseEmissive = it.material && it.material.emissive ? it.material.emissive.clone() : null;
        it.baseEmissiveIntensity = it.material ? it.material.emissiveIntensity : 1;
      }
      it.object.traverse((o) => {
        if (o.isMesh) {
          o.userData.interactable = it;
          this.targets.push(o);
        }
      });
    }
  },
  update() {
    if (this.busy) return this.setHovered(null);
    this.ray.far = REACH;
    this.ray.setFromCamera({ x: 0, y: 0 }, camera);
    const hits = this.ray.intersectObjects(this.targets, false);
    const hit = hits.length ? hits[0].object.userData.interactable : null;
    this.setHovered(hit);
    if (this.hovered && this.hovered.material && this.hovered.material.emissive) {
      const k = 0.1 + 0.05 * (0.5 + 0.5 * Math.sin(performance.now() * 0.004));
      this.hovered.material.emissive.copy(HIGHLIGHT).multiplyScalar(k);
    }
  },
  setHovered(item) {
    if (item === this.hovered) return;
    const h = this.hovered;
    if (h && h.material && h.material.emissive && h.baseEmissive) {
      h.material.emissive.copy(h.baseEmissive);
      h.material.emissiveIntensity = h.baseEmissiveIntensity;
    }
    this.hovered = item;
    if (item) {
      if (item.material && item.material.emissive) {
        item.material.emissive.copy(HIGHLIGHT).multiplyScalar(0.12);
        item.material.emissiveIntensity = 1;
      }
      hud.showPrompt(item.key || "E", typeof item.label === "function" ? item.label() : item.label);
    } else hud.hidePrompt();
    hud.setCrosshair(!!item);
  },
  async activate(id = null) {
    const item = id ? this.items.find((i) => i.id === id) : this.hovered;
    if (!item || this.busy) return false;
    if (!id && !player.locked) return false;
    const fn = item.action || item.onActivate;
    if (!fn) return false;
    this.busy = true;
    try {
      await fn(item);
    } finally {
      this.busy = false;
    }
    return true;
  },
};
document.addEventListener("keydown", (e) => {
  if (e.code === "KeyE" && !e.repeat) interactions.activate();
});

// ---------------------------------------------------------------------------
// Post
// ---------------------------------------------------------------------------
const post = createPost(renderer, scene, camera);
post.ao.configuration.aoRadius = 1.6;
post.ao.configuration.distanceFalloff = 2.0;
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  post.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Start position
// ---------------------------------------------------------------------------
const spawnRoom = params.get("spawn") || (world.rooms.has("d4-lobby") ? "d4-lobby" : world.rooms.keys().next().value);
if (spawnRoom && world.rooms.has(spawnRoom)) teleport(spawnRoom);
else if (spawnRoom) console.warn("[harness] spawn room not found: " + spawnRoom);

// ---------------------------------------------------------------------------
// Debug API (deterministic camera placement for screenshots)
// ---------------------------------------------------------------------------
let debugMode = false;
let framesRendered = 0;
let frameMs = 16;
let pendingCapture = null;
const clock = { t: 0, frozen: false };
const _look = new THREE.Vector3();

function applyExteriorView(v) {
  cameraMode = "exterior";
  player.frozen = true;
  camera.position.set(v.camPos[0], v.camPos[1], v.camPos[2]);
  _look.set(v.lookAt[0], v.lookAt[1], v.lookAt[2]);
  camera.up.set(0, 1, 0);
  camera.lookAt(_look);
  camera.updateMatrixWorld(true);
  world.refresh(camera.position, "exterior");
}

const debugAPI = {
  ready: false,
  views: Object.keys(world.views),
  warnings: () => world.warnings.slice(),
  setView(name) {
    const v = world.views[name];
    if (!v) throw new Error("unknown view " + name);
    debugMode = true;
    hud.hideStart();
    player.headBob = false;
    clock.t = v.time ?? 40;
    clock.frozen = true;
    // no aiming reticle in exterior shots (a blind critic reads the centre dot as a debug marker)
    document.getElementById("crosshair").style.display = v.mode === "exterior" ? "none" : "";
    if (v.mode === "exterior") applyExteriorView(v);
    else {
      cameraMode = "interior";
      player.frozen = true;
      player.setPose(v.pos[0], v.pos[2], v.yaw || 0, v.pitch || 0, v.pos[1]);
      world.refresh(player.position, "interior");
    }
    post.finalPass.uniforms.seed.value = 0.37;
    debugAPI.freezeGrain = true;
    // a view may carry `advance: seconds` (doors/lift leaves need ~2 s to open once the player stands there)
    if (v.advance) debugAPI.advance(v.advance);
    framesRendered = 0;
    return true;
  },
  // Move the frozen clock forward by `seconds`, running module updates in fixed steps (door / lift /
  // traffic animation states become deterministic).
  advance(seconds, step = 1 / 30) {
    const n = Math.min(3000, Math.max(1, Math.round(seconds / step)));
    for (let i = 0; i < n; i++) {
      clock.t += step;
      tick(step);
    }
    framesRendered = 0;
    return clock.t;
  },
  setPose({ pos, yaw = 0, pitch = 0 }) {
    debugMode = true;
    hud.hideStart();
    cameraMode = "interior";
    player.headBob = false;
    player.frozen = false;
    player.locked = true;
    player.setPose(pos[0], pos[2], yaw, pitch, pos[1]);
    world.refresh(player.position, "interior");
    interactions.update();
    framesRendered = 0;
    return interactions.hovered ? interactions.hovered.id : null;
  },
  teleport,
  hovered: () => (interactions.hovered ? interactions.hovered.id : null),
  interact: (id) => interactions.activate(id),
  pressE: () => document.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" })),
  pressKey: (code) => document.dispatchEvent(new KeyboardEvent("keydown", { code })),
  status: () => hud.statusText(),
  fadeOpacity: () => hud.fadeOpacity(),
  api: (id) => world.api(id),
  audioEvents: () => world.audio.events.slice(),
  capturePixels(x, y, w, h) {
    return new Promise((resolve) => {
      pendingCapture = { x, y, w, h, resolve };
    });
  },
  freezeGrain: false,
  frames: () => framesRendered,
  modules: () => world.stats().modules,
  getStats() {
    const info = renderer.info;
    const ws = world.stats();
    return {
      frameMs: +frameMs.toFixed(2),
      fps: +(1000 / frameMs).toFixed(1),
      calls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs ? info.programs.length : 0,
      colliders: player.colliders.length,
      lights: ws.poolLights,
      activeRooms: ws.activeRooms,
      room: ws.current,
      warnings: world.warnings.length,
      pixelRatio: renderer.getPixelRatio(),
      time: +clock.t.toFixed(2),
    };
  },
  setPixelRatio(r) {
    renderer.setPixelRatio(r);
    renderer.setSize(window.innerWidth, window.innerHeight);
    post.setSize(window.innerWidth, window.innerHeight);
  },
  player,
  world,
  post,
  scene,
  renderer,
  camera,
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

function tick(dt) {
  if (cameraMode === "interior") player.update(dt);
  const feet = cameraMode === "interior" ? player.position : camera.position;
  const { colliders, interactables } = world.update(dt, clock.t, feet, camera.position, cameraMode);
  player.colliders = colliders;
  interactions.setItems(interactables);
  if (cameraMode === "interior") interactions.update();
  const cur = world.state.current && world.rooms.get(world.state.current);
  const fog = cur && cur.manifest.fog !== undefined ? cur.manifest.fog : DEFAULT_FOG;
  if (scene.fog.density !== fog) scene.fog.density = fog;
}

const timer = new THREE.Timer();
let last = performance.now();
function frame() {
  requestAnimationFrame(frame);
  const now = performance.now();
  frameMs += (now - last - frameMs) * 0.1;
  last = now;
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.1);
  renderer.info.reset();
  if (!clock.frozen) {
    clock.t += dt;
    tick(dt);
  } else tick(0);
  if (debugAPI.directRender) renderer.render(scene, camera);
  else post.render(debugAPI.freezeGrain ? 0.37 : clock.t);
  framesRendered++;
  if (pendingCapture) {
    const { x, y, w, h, resolve } = pendingCapture;
    pendingCapture = null;
    const c2 = document.createElement("canvas");
    c2.width = w;
    c2.height = h;
    const ctx2 = c2.getContext("2d");
    const pr = renderer.getPixelRatio();
    ctx2.drawImage(canvas, x * pr, y * pr, w * pr, h * pr, 0, 0, w, h);
    resolve(Array.from(ctx2.getImageData(0, 0, w, h).data));
  }
  if (showStats) {
    const s = debugAPI.getStats();
    hud.setStats(`${s.fps} fps  ${s.frameMs} ms\n${s.calls} calls  ${(s.triangles / 1000).toFixed(1)}k tris\n${s.lights} pool lights  room ${s.room}\nactive ${s.activeRooms.join(",")}`);
  }
}

debugAPI.ready = true;
frame();
