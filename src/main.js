import * as THREE from 'three';
import { createSky, createLights, SUN_DIRECTION, HORIZON_COLOR } from './sky.js';
import { createOcean } from './ocean.js';
import { createMaterials } from './materials.js';
import { createShip } from './ship/index.js';
import { createEffects } from './effects.js';
import { createInput } from './input.js';
import { createCameraRig } from './camera.js';
import { createQuality, detectRenderer } from './quality.js';
import { exportShip } from './exportGlb.js';

const canvas = document.getElementById('scene');
const hud = {
  speed: document.getElementById('readout-speed'),
  heading: document.getElementById('readout-heading'),
  sails: document.getElementById('readout-sails'),
  sailsBar: document.getElementById('sails-bar'),
  camera: document.getElementById('readout-camera'),
  quality: document.getElementById('readout-quality'),
  guns: document.getElementById('readout-guns'),
  compass: document.getElementById('compass-needle'),
  help: document.getElementById('help'),
  loader: document.getElementById('loader'),
  toast: document.getElementById('toast'),
};

// Multisampling is ruinous on software WebGL, so ask the driver first.
const gpu = detectRenderer();
if (gpu.name === 'none') {
  hud.loader.innerHTML =
    '<div style="max-width:26rem;text-align:center;line-height:1.7">' +
    '<p style="color:#e8c06a;letter-spacing:.2em">NO WIND IN THESE SAILS</p>' +
    '<p style="font-size:13px;color:#c3b394">This browser could not start WebGL, so the ship cannot be drawn. ' +
    'Try another browser, or enable hardware acceleration and reload.</p></div>';
  throw new Error('WebGL is unavailable');
}
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: !gpu.software,
  powerPreference: 'high-performance',
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(HORIZON_COLOR, 0.0016);

const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.4, 8000);

const sky = createSky();
scene.add(sky);

const lights = createLights();
scene.add(lights);
const sun = lights.userData.sun;

const ocean = createOcean();
scene.add(ocean);

const materials = createMaterials();
const effects = createEffects(scene);
const ship = createShip(materials, { onCannonFire: effects.onCannonFire });
scene.add(ship.root);

const cameraRig = createCameraRig(camera, renderer.domElement, ship);

let toastTimer = 0;
function toast(message) {
  if (!hud.toast) return;
  hud.toast.textContent = message;
  hud.toast.classList.add('visible');
  toastTimer = 2.2;
}

let announceQuality = false;
const quality = createQuality({
  renderer,
  scene,
  sky,
  ocean,
  initial: gpu.software ? 'low' : 'high',
  onChange(level, tier) {
    ship.setQuality(tier);
    if (hud.quality) hud.quality.textContent = level;
    if (announceQuality) toast(`Graphics set to ${level} to keep her sailing smoothly`);
  },
});
announceQuality = true;

const input = createInput({
  fire(side) {
    if (ship.fire(side)) toast(side === 'both' ? 'Full broadside!' : `Fire ${side}!`);
    else toast('Reloading...');
  },
  cycleCamera() {
    const mode = cameraRig.cycle();
    if (hud.camera) hud.camera.textContent = mode;
    toast(`Camera: ${mode}`);
  },
  reset() {
    ship.root.position.set(0, 0, 0);
    ship.state.heading = 0;
    ship.state.speed = 0;
    ship.state.sailSet = 0.55;
    cameraRig.setMode(cameraRig.mode);
    toast('Back on station');
  },
  toggleHelp() {
    hud.help?.classList.toggle('collapsed');
  },
  async exportModel() {
    toast('Packing the ship into a .glb ...');
    try {
      const bytes = await exportShip(ship);
      toast(`Downloaded pirate-ship.glb (${(bytes / 1048576).toFixed(1)} MB)`);
    } catch (error) {
      console.error(error);
      toast('Export failed - see console');
    }
  },
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  quality.resize();
});

// ---- Keep the shadow frustum on the ship ---------------------------------
const sunOffset = SUN_DIRECTION.clone().multiplyScalar(120);
function updateSun() {
  sun.position.copy(ship.root.position).add(sunOffset);
  sun.target.position.copy(ship.root.position);
  sun.target.updateMatrixWorld();
}

// ---- Frame loop -----------------------------------------------------------
const clock = new THREE.Clock();
let elapsed = 0;
let hudTimer = 0;

function updateHud() {
  const knots = Math.abs(ship.state.speed) * 1.94384;
  if (hud.speed) hud.speed.textContent = `${knots.toFixed(1)} kn`;

  const degrees = ((THREE.MathUtils.radToDeg(ship.state.heading) % 360) + 360) % 360;
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const point = points[Math.round(degrees / 45) % 8];
  if (hud.heading) hud.heading.textContent = `${degrees.toFixed(0)}° ${point}`;
  if (hud.compass) hud.compass.style.transform = `rotate(${-degrees}deg)`;

  const percent = Math.round(ship.state.sailSet * 100);
  if (hud.sails) hud.sails.textContent = `${percent}%`;
  if (hud.sailsBar) hud.sailsBar.style.width = `${percent}%`;
  if (hud.guns) {
    const ready = ship.state.reload <= 0;
    hud.guns.textContent = ready ? 'ready' : `${ship.state.reload.toFixed(1)}s`;
    hud.guns.classList.toggle('warn', !ready);
  }
}

function animate() {
  const frameTime = clock.getDelta();
  // Clamp the simulation step so a stalled tab cannot teleport the ship.
  const dt = Math.min(frameTime, 0.05);
  elapsed += dt;

  const controls = input.read();
  ship.update(dt, elapsed, controls);
  effects.update(dt, elapsed, ship);
  ocean.userData.update(elapsed, ship.root.position, ship.forward);
  sky.userData.update(elapsed);
  sky.position.copy(camera.position);
  updateSun();
  cameraRig.update(dt);

  hudTimer -= dt;
  if (hudTimer <= 0) {
    updateHud();
    hudTimer = 0.1;
  }
  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) hud.toast?.classList.remove('visible');
  }
  quality.sample(frameTime);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

/**
 * Small scripting handle, handy for embedding: move the camera, steer the ship
 * or fire the guns from the console or from a host page.
 */
window.pirateShip = {
  scene,
  camera,
  renderer,
  ship,
  ocean,
  effects,
  cameraRig,
  quality,
  get elapsed() {
    return elapsed;
  },
};

// Warm the shaders up before the first frame so we never show a black screen.
renderer.compile(scene, camera);
ship.update(0.016, 0, { steer: 0, throttle: 0, brake: false });
renderer.render(scene, camera);
hud.loader?.classList.add('hidden');
setTimeout(() => hud.loader?.remove(), 900);

animate();
