/*
 * Parts preview harness.
 *
 * Every buildable module exports an EXHIBITS map of { name: () => Object3D }.
 * This page renders one of them on a baseplate with a turntable so a build can
 * be inspected (or screenshotted headlessly via tools/shot.mjs) in isolation.
 *
 *   /preview.html?item=xwing&spin=1&el=25&az=35&dist=auto&bg=space
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Engine } from './core/engine.js';
import { Kit, PLATE } from './lego/kit.js';
import { C } from './lego/palette.js';
import { FINISH } from './core/materials.js';

const MODULES = [
  'lego/minifig.js',
  'lego/characters.js',
  'lego/ships.js',
  'lego/props.js',
  'world/space.js',
  'world/corridor.js',
  'world/tatooine.js',
  'world/deathstar.js',
  'world/hangar.js',
  'fx/effects.js',
  'svg/assets.js',
];

const params = new URLSearchParams(location.search);
const hud = document.getElementById('hud');
const errEl = document.getElementById('err');
const listEl = document.getElementById('list');

const engine = new Engine(document.getElementById('c'), {
  width: innerWidth, height: innerHeight, pixelRatio: Math.min(devicePixelRatio || 1, 2),
});
engine.grade.uLetterbox.value = 0;
engine.grade.uGrain.value = 0.015;
engine.grade.uVignette.value = 0.35;

const scene = engine.scene;
scene.background = new THREE.Color(params.get('bg') === 'space' ? 0x05070d : 0x1a1f24);

const hemi = new THREE.HemisphereLight(0xdfefff, 0x30302c, 1.05);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xfff4e2, 2.4);
key.position.set(18, 30, 16);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 1; key.shadow.camera.far = 200;
key.shadow.camera.left = -60; key.shadow.camera.right = 60;
key.shadow.camera.top = 60; key.shadow.camera.bottom = -60;
key.shadow.bias = -0.0006;
key.shadow.normalBias = 0.03;
scene.add(key);
const fill = new THREE.DirectionalLight(0x9fc4ff, 0.7);
fill.position.set(-20, 12, -14);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xffd9a8, 0.9);
rim.position.set(-6, 8, -26);
scene.add(rim);

const controls = new OrbitControls(engine.camera, engine.canvas);
controls.enableDamping = true;

const registry = new Map();
const errors = [];

async function loadModules() {
  await Promise.all(MODULES.map(async (path) => {
    try {
      const mod = await import(/* @vite-ignore */ `./${path}`);
      const ex = mod.EXHIBITS;
      if (ex) for (const [k, v] of Object.entries(ex)) registry.set(k, { fn: v, path });
    } catch (e) {
      if (!/Failed to fetch dynamically imported module|Cannot find module/.test(String(e))) {
        errors.push(`${path}: ${e && e.message ? e.message : e}`);
        console.error(path, e);
      }
    }
  }));
}

function baseplate(size = 48) {
  const kit = new Kit('baseplate');
  kit.plate(0, -PLATE, 0, size, size, C.lightBluishGray, { studs: true, castShadow: false });
  return kit.build();
}

let current = null;
let spin = params.get('spin') !== '0';

async function show(name) {
  if (current) { scene.remove(current); current = null; }
  const entry = registry.get(name);
  if (!entry) {
    hud.innerHTML = `<b>unknown exhibit:</b> ${name}\n${registry.size} available`;
    return null;
  }
  let obj;
  try {
    obj = await entry.fn();
  } catch (e) {
    errors.push(`${name}: ${e && e.stack ? e.stack : e}`);
    errEl.textContent = errors.join('\n\n');
    return null;
  }
  if (!obj) return null;
  const holder = new THREE.Group();
  holder.add(obj);
  scene.add(holder);
  current = holder;

  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z) * 0.5 || 1;

  if (params.get('plate') !== '0' && radius < 80) {
    const plate = baseplate(Math.max(6, Math.ceil(Math.max(size.x, size.z) * 1.7)));
    plate.position.y = box.min.y;
    holder.add(plate);
  }

  const dist = params.get('dist') === 'auto' || !params.get('dist')
    ? radius * 3.1 : parseFloat(params.get('dist'));
  // Builds face -Z (three.js forward), so the default 3/4 view sits in front of them.
  const az = THREE.MathUtils.degToRad(parseFloat(params.get('az') ?? '205'));
  const el = THREE.MathUtils.degToRad(parseFloat(params.get('el') ?? '18'));
  engine.camera.position.set(
    center.x + dist * Math.cos(el) * Math.sin(az),
    center.y + dist * Math.sin(el),
    center.z + dist * Math.cos(el) * Math.cos(az),
  );
  controls.target.copy(center);
  controls.update();

  const s = Math.max(radius * 1.4, 20);
  key.shadow.camera.left = -s; key.shadow.camera.right = s;
  key.shadow.camera.top = s; key.shadow.camera.bottom = -s;
  key.shadow.camera.far = s * 8;
  key.shadow.camera.updateProjectionMatrix();

  let bricks = 0;
  obj.traverse((o) => { if (o.userData && o.userData.brickCount) bricks += o.userData.brickCount; });
  hud.innerHTML = `<b>${name}</b>  (${entry.path})\n` +
    `size ${size.x.toFixed(1)} x ${size.y.toFixed(1)} x ${size.z.toFixed(1)} studs\n` +
    `parts ${bricks || '—'}   objects ${countMeshes(obj)}`;
  return obj;
}

function countMeshes(obj) {
  let n = 0;
  obj.traverse((o) => { if (o.isMesh) n++; });
  return n;
}

function renderList(active) {
  const names = [...registry.keys()].sort();
  listEl.innerHTML = names
    .map((n) => `<a href="?item=${encodeURIComponent(n)}" ${n === active ? 'style="color:#ffd54a"' : ''}>${n}</a>`)
    .join('');
}

const clock = new THREE.Clock();
let t = 0;

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());
  t += dt;
  if (current && spin) current.rotation.y += dt * 0.35;
  if (current) {
    current.traverse((o) => { if (o.userData.update) o.userData.update(t, dt); });
  }
  controls.update();
  engine.render();
}

addEventListener('resize', () => engine.setSize(innerWidth, innerHeight));

(async () => {
  await loadModules();
  const name = params.get('item') || [...registry.keys()].sort()[0];
  renderList(name);
  await show(name);
  if (errors.length) errEl.textContent = errors.join('\n\n');
  window.__EXHIBITS__ = [...registry.keys()].sort();
  window.__ERRORS__ = errors;
  loop();
  // Let a couple of frames land (and the shadow map settle) before signalling.
  setTimeout(() => { window.__READY__ = true; }, params.get('wait') ? +params.get('wait') : 700);
})();

window.addEventListener('error', (e) => {
  errors.push(String(e.message));
  errEl.textContent = errors.join('\n\n');
});
