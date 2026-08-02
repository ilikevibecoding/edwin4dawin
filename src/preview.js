/**
 * Model turntable.
 *
 *   http://localhost:5173/preview.html?model=xwing
 *
 * Every kit module exports a `PREVIEW` map of `name -> async () => Object3D`.
 * This page renders one of them on a studded baseplate with three-point
 * lighting, which is how the ships and characters get reviewed before they go
 * anywhere near a scene.
 */
import * as THREE from 'three';
import { groundPlate } from './engine/brick.js';
import { Starfield } from './engine/fx.js';

const modules = import.meta.glob('./kit/*.js');

const params = new URLSearchParams(location.search);
const W = parseInt(params.get('w') || '1100', 10);
const H = parseInt(params.get('h') || '760', 10);
const wantGrid = params.get('grid') === '1';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.getElementById('stage').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x141922);
const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 4000);

scene.add(new THREE.HemisphereLight(0x9dc0ff, 0x2a3040, 0.85));
const key = new THREE.DirectionalLight(0xfff4e2, 1.85);
key.position.set(18, 26, 16);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
const d = 60;
Object.assign(key.shadow.camera, { left: -d, right: d, top: d, bottom: -d, near: 1, far: 200 });
scene.add(key);
const rim = new THREE.DirectionalLight(0x88bbff, 0.85);
rim.position.set(-16, 10, -18);
scene.add(rim);
const fill = new THREE.DirectionalLight(0xffffff, 0.45);
fill.position.set(-6, 6, 18);
scene.add(fill);

const stars = new Starfield({ count: 500, radius: 800 });
scene.add(stars.object);

const turntable = new THREE.Group();
scene.add(turntable);

async function collect() {
  const out = {};
  for (const [path, load] of Object.entries(modules)) {
    try {
      const mod = await load();
      if (mod.PREVIEW) for (const [k, v] of Object.entries(mod.PREVIEW)) out[k] = { fn: v, path };
    } catch (e) {
      console.warn('preview: could not load', path, e.message);
    }
  }
  return out;
}

const registry = await collect();
const names = Object.keys(registry).sort();
document.getElementById('list').innerHTML = names
  .map((n) => `<a href="?model=${n}">${n}</a>`)
  .join('');

const name = params.get('model') || names[0];
document.getElementById('label').textContent = name ? `${name}  —  ${registry[name]?.path ?? ''}` : 'no models registered';

let radius = 30;
let center = new THREE.Vector3();

if (name && registry[name]) {
  const obj = await registry[name].fn();
  turntable.add(obj);
  obj.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  radius = maxDim * 1.75;
  const floorY = box.min.y;

  if (wantGrid !== false) {
    const plate = groundPlate(
      Math.ceil(Math.max(size.x, size.z) * 1.9),
      Math.ceil(Math.max(size.x, size.z) * 1.9),
      0x3a4250,
      { step: 8 }
    );
    plate.position.y = floorY - 0.02;
    scene.add(plate);
  }
  Object.assign(key.shadow.camera, {
    left: -maxDim,
    right: maxDim,
    top: maxDim,
    bottom: -maxDim,
    near: 0.5,
    far: maxDim * 8,
  });
  key.shadow.camera.updateProjectionMatrix();
  key.position.set(maxDim * 0.9, maxDim * 1.4, maxDim * 0.8);

  let tris = 0;
  obj.traverse((n) => {
    if (n.isMesh && n.geometry?.attributes?.position) {
      tris += n.geometry.attributes.position.count / 3;
    }
  });
  document.getElementById('stats').textContent =
    `${Math.round(tris).toLocaleString()} triangles · bbox ${size.x.toFixed(1)} × ${size.y.toFixed(1)} × ${size.z.toFixed(1)} studs`;
}

function place(azimuthDeg, elevationDeg = 22, dist = radius) {
  const a = (azimuthDeg * Math.PI) / 180;
  const e = (elevationDeg * Math.PI) / 180;
  camera.position.set(
    center.x + Math.cos(a) * Math.cos(e) * dist,
    center.y + Math.sin(e) * dist,
    center.z + Math.sin(a) * Math.cos(e) * dist
  );
  camera.lookAt(center);
}

function draw(az, el, dist, t = 0) {
  place(az, el, dist);
  stars.update(t);
  renderer.render(scene, camera);
}

window.PREVIEW = {
  names,
  radius: () => radius,
  draw(az = 35, el = 22, distMul = 1) {
    draw(az, el, radius * distMul);
    return renderer.domElement.toDataURL('image/jpeg', 0.95);
  },
  poseTime(t) {
    // Kit models may expose an update hook for posed previews.
    turntable.traverse((n) => n.userData?.previewUpdate?.(t));
  },
};
window.PREVIEW_READY = true;

let t0 = performance.now();
function loop() {
  requestAnimationFrame(loop);
  const t = (performance.now() - t0) / 1000;
  window.PREVIEW.poseTime(t);
  draw(t * 14 + 25, 20 + Math.sin(t * 0.4) * 6, radius, t);
}
if (!params.has('static')) loop();
else draw(35, 22, radius);
