// Battle of Coruscant — space view. Same engine as the ISD demo (renderer, post stack, HUD, perf monitor,
// orbit camera) with a battle scene: Coruscant below, instanced fleets, fighter swarms, turbolaser
// exchanges, impacts, fires and flak, and a cinematic camera cycle.
import * as THREE from "three";
import { createPost } from "../post.js";
import { createHUD } from "../hud.js";
import { OrbitCamera } from "../camera/orbit.js";
import { PerfMonitor } from "../perf.js";
import { isTouchDevice } from "../touch.js";
import { makeBattleSun } from "./battleShader.js";
import { buildCoruscant } from "./coruscant.js";
import { buildBattleSky } from "./battleSky.js";
import { Fleet } from "./fleet.js";
import { Bolts } from "./weapons.js";
import { Explosions } from "./explosions.js";
import { Fighters } from "./fighters.js";
import { shipMaterials } from "./ships/shipKit.js";
import { createBattle } from "./choreography.js";
import { Cinematic } from "./cinematic.js";

const canvas = document.getElementById("view");
const TOUCH = isTouchDevice();
const params = new URLSearchParams(location.search);
const SCALE = TOUCH ? 0.6 : +(params.get("scale") || 1);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: "high-performance",
  stencil: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, TOUCH ? 1.0 : 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = false;
renderer.info.autoReset = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
// near 4 m keeps depth precision for hull detail out to a few km while the planet sits 2,000 km away
const camera = new THREE.PerspectiveCamera(
  58,
  window.innerWidth / window.innerHeight,
  4,
  4.2e6,
);
scene.add(camera);

const hud = createHUD();
hud.setCrosshair(false);
const perf = new PerfMonitor(renderer, scene);

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------
const sun = makeBattleSun();
const sky = buildBattleSky(scene);
const planet = buildCoruscant(scene, sun);
const mats = shipMaterials(sun);
const fleet = new Fleet(scene);
const bolts = new Bolts(scene, 1600);
const explosions = new Explosions(scene, 1400);
const fighters = new Fighters(scene, sun, { scale: SCALE });
const battle = createBattle({
  fleet,
  bolts,
  explosions,
  fighters,
  mats,
  seed: 11,
  scale: SCALE,
});
const hemi = new THREE.HemisphereLight(0x2a3040, 0x3a2a1c, 0.12);
scene.add(hemi);

const post = createPost(renderer, scene, camera, {
  ao: false,
  bloom: { strength: 0.75, radius: 0.55, threshold: 0.85 },
});

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------
const orbit = new OrbitCamera(camera, canvas, {
  minDist: 60,
  maxDist: 60000,
  keepOutside: false,
});
orbit.setPose({ target: [0, 0, 1200], distance: 7000, yaw: 0.9, pitch: 0.28 });
orbit.enabled = true;
const cinematic = new Cinematic(camera, battle, fighters);

const VIEWS = {
  wide: { target: [0, -200, 1500], distance: 11000, yaw: 0.75, pitch: 0.22 },
  lines: { target: [0, 0, 1200], distance: 7000, yaw: 1.6, pitch: 0.12 },
  planet_low: {
    target: [0, -600, 2000],
    distance: 7000,
    yaw: 2.6,
    pitch: -0.08,
  },
  venator_close: {
    ship: { side: "republic", cls: "venator", i: 0 },
    distance: 900,
    yaw: 0.6,
    pitch: 0.3,
  },
  venator_medium: {
    ship: { side: "republic", cls: "venator", i: 1 },
    distance: 2200,
    yaw: 2.4,
    pitch: 0.25,
  },
  venator_far: {
    ship: { side: "republic", cls: "venator", i: 2 },
    distance: 10000,
    yaw: 0.9,
    pitch: 0.15,
  },
  venator_bow: {
    ship: { side: "republic", cls: "venator", i: 0 },
    distance: 700,
    yaw: 3.0,
    pitch: -0.05,
  },
  venator_towers: {
    ship: { side: "republic", cls: "venator", i: 0 },
    distance: 520,
    yaw: 0.35,
    pitch: 0.35,
    offset: [0, 120, 380],
  },
  venator_belly: {
    ship: { side: "republic", cls: "venator", i: 0 },
    distance: 1000,
    yaw: 2.2,
    pitch: -0.55,
  },
  providence_close: {
    ship: { side: "separatist", cls: "providence", i: 0 },
    distance: 900,
    yaw: 0.7,
    pitch: 0.25,
  },
  providence_medium: {
    ship: { side: "separatist", cls: "providence", i: 1 },
    distance: 2200,
    yaw: -0.8,
    pitch: 0.2,
  },
  munificent_close: {
    ship: { side: "separatist", cls: "munificent", i: 0 },
    distance: 750,
    yaw: 0.7,
    pitch: 0.25,
  },
  munificent_medium: {
    ship: { side: "separatist", cls: "munificent", i: 1 },
    distance: 1900,
    yaw: -2.2,
    pitch: 0.2,
  },
  recusant_close: {
    ship: { side: "separatist", cls: "recusant", i: 0 },
    distance: 900,
    yaw: 0.7,
    pitch: 0.25,
  },
  recusant_medium: {
    ship: { side: "separatist", cls: "recusant", i: 1 },
    distance: 2400,
    yaw: 2.3,
    pitch: 0.2,
  },
  hero: { cinematic: 0, t: 5 },
  broadside: { cinematic: 1, t: 6 },
  towers_cine: { cinematic: 2, t: 4 },
  chase: { cinematic: 3, t: 3 },
  low_city: { cinematic: 4, t: 5 },
};

function shipFor(spec) {
  const list = fleet.ships.filter(
    (s) => s.side === spec.side && s.model.id === spec.cls,
  );
  return list[spec.i % list.length] || fleet.ships[0];
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
let started = false;
function begin() {
  started = true;
  hud.hideStart();
}
hud.startEl.addEventListener("click", (e) => {
  if (e.target.closest(".scene-link")) return; // navigating to the other scene
  begin();
});
hud.showStart();
hud.setMode("exterior");
hud.setLocation("Coruscant orbit · Open Circle Fleet");
document.addEventListener("keydown", (e) => {
  if (e.code === "KeyC" && !e.repeat) {
    if (cinematic.enabled) {
      cinematic.stop();
      // hand the orbit camera the current pose so there is no jump
      const d = camera.position.distanceTo(orbit.target);
      orbit.setPose({
        target: orbit.target.toArray(),
        distance: Math.max(orbit.minDist, d),
        yaw: Math.atan2(
          camera.position.x - orbit.target.x,
          camera.position.z - orbit.target.z,
        ),
        pitch: Math.asin(
          THREE.MathUtils.clamp(
            (camera.position.y - orbit.target.y) / Math.max(1, d),
            -1,
            1,
          ),
        ),
      });
      orbit.enabled = true;
      hud.setStatus("Free camera.");
    } else {
      orbit.enabled = false;
      cinematic.start();
      hud.setStatus("Cinematic camera · " + cinematic.shotName);
    }
  }
  if (e.code === "F3") {
    showStats = !showStats;
    hud.toggleStats(showStats);
  }
});
canvas.addEventListener("mousedown", () => {
  if (cinematic.enabled) {
    cinematic.stop();
    orbit.enabled = true;
    // resume orbiting around what the cinematic camera was looking at
    const look = new THREE.Vector3();
    camera.getWorldDirection(look);
    const d = 1500;
    orbit.setPose({
      target: camera.position.clone().addScaledVector(look, d).toArray(),
      distance: d,
      yaw: Math.atan2(-look.x, -look.z),
      pitch: Math.asin(THREE.MathUtils.clamp(-look.y, -1, 1)),
    });
    hud.setStatus("Free camera.");
  }
});

// touch: one finger orbits, two fingers pinch-zoom; a button toggles the cinematic camera
if (TOUCH) {
  hud.setTouch(true);
  const pointers = new Map();
  let pinch = 0;
  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
    if (cinematic.enabled) {
      cinematic.stop();
      orbit.enabled = true;
    }
    begin();
  });
  canvas.addEventListener("pointermove", (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (pointers.size === 1) {
      orbit.goal.yaw -= dx * 0.006;
      orbit.goal.pitch = THREE.MathUtils.clamp(
        orbit.goal.pitch + dy * 0.006,
        -1.35,
        1.35,
      );
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch > 0)
        orbit.goal.distance = THREE.MathUtils.clamp(
          orbit.goal.distance * (pinch / d),
          orbit.minDist,
          orbit.maxDist,
        );
      pinch = d;
    }
  });
  const up = (e) => pointers.delete(e.pointerId);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  const layer = document.createElement("div");
  layer.id = "touch";
  layer.innerHTML = `<div id="touch-buttons"><button id="btn-cine" type="button">Cinematic</button></div>`;
  document.body.appendChild(layer);
  layer.querySelector("#btn-cine").addEventListener("click", () => {
    if (cinematic.enabled) {
      cinematic.stop();
      orbit.enabled = true;
    } else {
      orbit.enabled = false;
      cinematic.start();
    }
    begin();
  });
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  post.setSize(window.innerWidth, window.innerHeight);
});

// adaptive quality: drop the pixel ratio when frames run long, climb back when they are fast
const QUALITY = [
  0.5,
  0.66,
  0.8,
  1.0,
  Math.min(window.devicePixelRatio, TOUCH ? 1.0 : 1.5),
];
const quality = {
  level: TOUCH ? 1 : QUALITY.length - 1,
  slow: 0,
  fast: 0,
  enabled: true,
};
function applyQuality() {
  renderer.setPixelRatio(QUALITY[quality.level]);
  renderer.setSize(window.innerWidth, window.innerHeight);
  post.setSize(window.innerWidth, window.innerHeight);
}
if (TOUCH) applyQuality();
function updateQuality(dt) {
  if (!quality.enabled) return;
  if (dt > 1 / 45) {
    quality.slow++;
    quality.fast = 0;
  } else if (dt < 1 / 70) {
    quality.fast++;
    quality.slow = 0;
  } else quality.slow = quality.fast = 0;
  if (quality.slow > 40 && quality.level > 0) {
    quality.level--;
    quality.slow = 0;
    applyQuality();
  } else if (quality.fast > 240 && quality.level < QUALITY.length - 1) {
    quality.level++;
    quality.fast = 0;
    applyQuality();
  }
}

// ---------------------------------------------------------------------------
// Debug API (same shape as the ISD demo so the tooling works unchanged)
// ---------------------------------------------------------------------------
let framesRendered = 0;
let paused = false;
let debugMode = false;
let showStats = false;
let pendingCapture = null;
const FIXED_DT = 1 / 60;

function applyView(name) {
  const v = VIEWS[name];
  if (!v) throw new Error("unknown view " + name);
  debugMode = true;
  quality.enabled = false;
  hud.hideStart();
  if (v.cinematic !== undefined) {
    orbit.enabled = false;
    cinematic.start(v.cinematic);
    cinematic.time = v.t || 0;
    cinematic.update(0);
    cinematic.smooth = 0;
  } else {
    cinematic.stop();
    orbit.enabled = true;
    let target = v.target;
    if (v.ship) {
      const s = shipFor(v.ship);
      const off = new THREE.Vector3(...(v.offset || [0, 0, 0])).applyQuaternion(
        s.quaternion,
      );
      target = s.position.clone().add(off).toArray();
    }
    orbit.setPose(
      { target, distance: v.distance, yaw: v.yaw, pitch: v.pitch },
      true,
    );
    orbit.update(0);
  }
  camera.updateMatrixWorld(true);
  post.finalPass.uniforms.seed.value = 0.37;
  debugAPI.freezeGrain = true;
  framesRendered = 0;
}

const debugAPI = {
  ready: false,
  views: Object.keys(VIEWS),
  setView(name) {
    applyView(name);
    return true;
  },
  frames() {
    return framesRendered;
  },
  setPaused(v) {
    paused = !!v;
  },
  renderFrame(dt = FIXED_DT) {
    step(dt);
    return framesRendered;
  },
  advanceSim(seconds) {
    // run the battle forward in fixed steps without rendering
    const n = Math.round(seconds / FIXED_DT);
    for (let i = 0; i < n; i++) battle.update(FIXED_DT, camera.position);
    return battle.time;
  },
  battleState() {
    return battle.serialize();
  },
  battleStats() {
    return {
      ...battle.stats,
      boltsAlive: bolts.alive,
      boltsFired: bolts.fired,
      particles: explosions.alive,
      fighters: fighters.count,
      ships: fleet.ships.length,
      drawnByLod: fleet.stats.drawn,
      time: +battle.time.toFixed(2),
    };
  },
  setCinematic(on, index = null) {
    if (on) {
      orbit.enabled = false;
      cinematic.start(index);
    } else {
      cinematic.stop();
      orbit.enabled = true;
    }
  },
  cinematicShot() {
    return cinematic.shotName;
  },
  capturePixels(x, y, w, h) {
    return new Promise((resolve) => {
      pendingCapture = { x, y, w, h, resolve };
    });
  },
  getStats() {
    return {
      ...perf.stats(),
      mode: cinematic.enabled ? "cinematic" : "orbit",
      zone: "battle",
      space: cinematic.shotName || "free",
      lights: 1,
      fixtures: 0,
      ships: fleet.ships.length,
      drawnByLod: fleet.stats.drawn,
      bolts: bolts.alive,
      particles: explosions.alive,
      fighters: fighters.count,
      qualityLevel: quality.level,
      pixelRatio: renderer.getPixelRatio(),
    };
  },
  setPixelRatio(r) {
    renderer.setPixelRatio(r);
    renderer.setSize(window.innerWidth, window.innerHeight);
    post.setSize(window.innerWidth, window.innerHeight);
  },
  freezeGrain: false,
  directRender: false,
  scene,
  camera,
  renderer,
  post,
  fleet,
  bolts,
  explosions,
  fighters,
  battle,
  cinematic,
  orbit,
  sun,
  planet,
};
window.debugAPI = debugAPI;

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------
const timer = new THREE.Timer();
function frame() {
  if (!paused) step();
  requestAnimationFrame(frame);
}
function step(fixedDt = null) {
  const now = performance.now();
  perf.beginFrame(now);
  timer.update();
  const dt = fixedDt ?? Math.min(timer.getDelta(), 0.1);
  const t = timer.getElapsed();
  renderer.info.reset();

  // give the first frames a still battle so shader compilation and layout settle
  if (framesRendered > 1 || fixedDt) battle.update(dt, camera.position);
  else fleet.update(0, camera.position);
  if (cinematic.enabled) {
    cinematic.update(dt);
    if (framesRendered % 30 === 0)
      hud.setStatus("Cinematic camera · " + cinematic.shotName);
  } else orbit.update(dt);
  planet.update(sun.dir.value, dt);
  if (framesRendered > 60 && !debugMode) updateQuality(dt);

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
    hud.setStats(
      `${s.fps} fps  ${s.frameMs} ms (p95 ${s.p95Ms})  js ${s.jsMs} ms\n${s.calls} calls  ${(s.triangles / 1000).toFixed(1)}k tris\nships ${s.ships} (lod ${s.drawnByLod.join("/")})  fighters ${s.fighters}  bolts ${s.bolts}  fx ${s.particles}\n${s.mode} · ${s.space}`,
    );
  }
  perf.endFrame(performance.now());
}

// start with the cinematic camera on touch devices (nothing to click through), free camera on desktop
if (TOUCH) {
  orbit.enabled = false;
  cinematic.start();
}
perf.markReady();
debugAPI.ready = true;
frame();
