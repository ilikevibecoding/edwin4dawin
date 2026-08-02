/**
 * Model preview harness.
 *
 * Loads a single exported model factory into a neutral studio so it can be
 * inspected (and screenshotted headlessly) in isolation.
 *
 *   /preview.html?m=/src/models/ships.js&f=xwing&r=0.35&t=0
 *
 * Query params
 *   m     module path to import (default /src/models/index.js)
 *   f     exported factory name
 *   args  JSON array of arguments for the factory
 *   r     turntable rotation, 0..1 of a full turn (default 0.12)
 *   e     camera elevation, 0..1 (default 0.25)
 *   z     zoom multiplier (default 1)
 *   t     time in seconds passed to an exported update(obj, t) if present
 *   bg    background hex, e.g. 101418
 *   grid  1 to show a stud baseplate, 0 to hide (default 1)
 *   scene 1 if the factory returns {root, update} instead of an Object3D
 */
import * as THREE from 'three';
import { texturesReady } from './lego/svgtex.js';

const q = new URLSearchParams(location.search);
const num = (k, d) => (q.has(k) ? parseFloat(q.get(k)) : d);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(parseInt(q.get('bg') || '20242b', 16));

const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 6000);

scene.add(new THREE.HemisphereLight(0xbcd6ff, 0x33302c, 1.1));
const key = new THREE.DirectionalLight(0xfff3e0, 2.4);
key.position.set(30, 46, 26);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
scene.add(key);
const fill = new THREE.DirectionalLight(0x8fb6ff, 0.9);
fill.position.set(-34, 16, -22);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xffffff, 1.1);
rim.position.set(-8, 12, -40);
scene.add(rim);

const hud = document.getElementById('hud');

async function main() {
  const modPath = q.get('m') || '/src/models/index.js';
  const fname = q.get('f') || 'default';
  let obj = null;
  let update = null;
  try {
    const mod = await import(/* @vite-ignore */ modPath);
    const factory = mod[fname] ?? mod.default;
    if (typeof factory !== 'function') throw new Error(`export "${fname}" is not a function in ${modPath}`);
    const args = q.get('args') ? JSON.parse(q.get('args')) : [];
    const built = factory(...args);
    if (built && built.root) { obj = built.root; update = built.update; }
    else obj = built;
    if (typeof mod.update === 'function') update = (t) => mod.update(obj, t);
  } catch (err) {
    hud.textContent = 'ERROR: ' + err.message + '\n' + (err.stack || '');
    console.error(err);
    renderer.render(scene, camera);
    window.__previewError = String(err && err.message);
    window.__ready = true;
    return;
  }
  scene.add(obj);

  const t = num('t', 0);
  if (update) update(t);
  await texturesReady();

  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const radius = Math.max(size.length() / 2, 0.5);

  if (q.get('grid') !== '0') {
    const g = new THREE.GridHelper(radius * 6, Math.min(60, Math.round(radius * 6)), 0x39404a, 0x2a2f37);
    g.position.y = box.min.y - 0.001;
    scene.add(g);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(radius * 8, radius * 8),
      new THREE.ShadowMaterial({ opacity: 0.35 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = box.min.y - 0.002;
    floor.receiveShadow = true;
    scene.add(floor);
  }

  const ang = num('r', 0.12) * Math.PI * 2;
  const elev = num('e', 0.25) * Math.PI * 0.5;
  const dist = (radius / Math.tan((camera.fov * Math.PI) / 360)) * 1.35 * num('z', 1);
  camera.position.set(
    center.x + Math.sin(ang) * Math.cos(elev) * dist,
    center.y + Math.sin(elev) * dist,
    center.z + Math.cos(ang) * Math.cos(elev) * dist
  );
  camera.lookAt(center);
  key.target.position.copy(center);
  scene.add(key.target);
  key.shadow.camera.left = -radius * 1.6;
  key.shadow.camera.right = radius * 1.6;
  key.shadow.camera.top = radius * 1.6;
  key.shadow.camera.bottom = -radius * 1.6;
  key.shadow.camera.far = dist * 4;
  key.shadow.camera.updateProjectionMatrix();

  let meshes = 0, tris = 0;
  obj.traverse((o) => {
    if (o.isMesh) { meshes++; tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }
  });
  hud.textContent =
    `${modPath} :: ${fname}\n` +
    `size  ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}\n` +
    `min.y ${box.min.y.toFixed(2)}  center ${center.x.toFixed(2)},${center.y.toFixed(2)},${center.z.toFixed(2)}\n` +
    `mesh  ${meshes}  tris ${Math.round(tris)}`;

  renderer.render(scene, camera);
  requestAnimationFrame(() => {
    renderer.render(scene, camera);
    window.__ready = true;
  });
}

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

main();
