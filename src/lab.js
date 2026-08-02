import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Post } from './engine/fx.js';
import { makeEnv, lightingRig } from './engine/lighting.js';
import { whenPrintsReady } from './lego/svg.js';
import { BrickBuilder, PLATE } from './lego/brick.js';
import { mat as matFor } from './lego/materials.js';
import { C } from './lego/palette.js';
import { models, make, listModels } from './registry.js';

// Pull in every asset module so their register() calls run.
import './ships/index.js';
import './chars/index.js';
import './sets/index.js';
import './props/index.js';

const q = new URLSearchParams(location.search);
const canvas = document.getElementById('c');
const hud = document.getElementById('hud');

const W = +(q.get('w') || 1100);
const H = +(q.get('h') || 700);
canvas.style.width = W + 'px';
canvas.style.height = H + 'px';

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 6000);

const bgKind = q.get('bg') || 'studio';
const bgColors = {
  studio: 0x1b2028, space: 0x03050a, desert: 0xd9a86a,
  interior: 0x1a222c, sunset: 0x4a2a26, dark: 0x070a10, hangar: 0x141922,
};
scene.background = new THREE.Color(bgColors[bgKind] ?? 0x1b2028);
makeEnv(renderer, bgKind === 'studio' ? 'studio' : bgKind, 0.55);
scene.add(lightingRig(bgKind, { shadowSize: +(q.get('shadow') || 40) }));

const post = new Post(renderer, scene, camera, { width: W, height: H, quality: q.get('quality') || 'high' });
post.grade.uniforms.uVignette.value = 0.26;
post.grade.uniforms.uGrain.value = 0.010;
post.grade.uniforms.uAberration.value = 0.0006;
if (post.bloom) { post.bloom.strength = 0.34; post.bloom.threshold = 0.85; post.bloom.radius = 0.5; }

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

let model = null;
let radius = 10;
const spin = q.get('spin') !== '0';

function baseplate(size = 48) {
  const bb = new BrickBuilder({ cullStuds: false, bevel: false, vertexColors: false });
  bb.plate(0, -PLATE, 0, size, size, { color: C.sandGreen, h: PLATE, studs: false });
  const g = bb.build();
  const plateMat = matFor(C.sandGreen);
  // studs as a cheap instanced grid
  const stud = new THREE.CylinderGeometry(0.3, 0.3, 0.22, 8);
  stud.translate(0, 0.11, 0);
  const inst = new THREE.InstancedMesh(stud, plateMat, size * size);
  const m = new THREE.Matrix4();
  let i = 0;
  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      m.makeTranslation(x - size / 2 + 0.5, 0, z - size / 2 + 0.5);
      inst.setMatrixAt(i++, m);
    }
  }
  inst.receiveShadow = true;
  const grp = new THREE.Group();
  grp.add(g, inst);
  return grp;
}

async function load(id) {
  if (model) { scene.remove(model); model = null; }
  const obj = await make(id, Object.fromEntries(q.entries()));
  model = obj.isObject3D ? obj : obj.object3D || obj.root;
  scene.add(model);
  await whenPrintsReady();

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  radius = sphere.radius || 5;
  const fitFov = camera.fov * Math.PI / 180;
  const fit = radius / Math.sin(Math.min(fitFov, 2 * Math.atan(Math.tan(fitFov / 2) * camera.aspect)) / 2);
  const dist = +(q.get('dist') || 0) || fit * 1.12;
  const az = (+(q.get('az') || 38)) * Math.PI / 180;
  const el = (+(q.get('el') || 20)) * Math.PI / 180;
  camera.position.set(
    center.x + Math.sin(az) * Math.cos(el) * dist,
    center.y + Math.sin(el) * dist,
    center.z + Math.cos(az) * Math.cos(el) * dist,
  );
  controls.target.copy(center);
  controls.update();
  if (q.get('grid') !== '0') {
    const plate = Math.min(96, Math.ceil(Math.max(size.x, size.z) * 1.5 / 2) * 2 + 8);
    scene.add(baseplate(plate));
  }

  hud.textContent = `${id}\nsize ${size.x.toFixed(1)} x ${size.y.toFixed(1)} x ${size.z.toFixed(1)} studs`
    + `\n(${(size.x * 8).toFixed(0)} x ${(size.y * 8).toFixed(0)} x ${(size.z * 8).toFixed(0)} mm)`;
  return model;
}

const id = q.get('m');
const t0 = performance.now();

const ready = (async () => {
  if (!id) {
    hud.textContent = 'models:\n  ' + listModels().join('\n  ');
    return;
  }
  await load(id);
  // let every SVG print decode before anyone screenshots us
  await whenPrintsReady();
  renderer.compile(scene, camera);
})();

let raf = 0;
const noPost = q.get('nopost') === '1';

function renderAt(t) {
  if (model) {
    if (spin) model.rotation.y = t * 0.55;
    model.traverse?.((o) => { if (o.userData.tick) o.userData.tick(t, 1 / 60); });
    if (model.userData.update) model.userData.update(t, 1 / 60);
  }
  if (noPost) renderer.render(scene, camera); else post.render(t);
  if (q.get('diag') === '1') {
    let casters = 0, receivers = 0, shadowLights = 0;
    scene.traverse((o) => {
      if (o.isMesh && o.castShadow) casters++;
      if (o.isMesh && o.receiveShadow) receivers++;
      if (o.isLight && o.castShadow) shadowLights++;
    });
    hud.textContent += `\nshadowMap=${renderer.shadowMap.enabled} type=${renderer.shadowMap.type}`
      + `\ncasters=${casters} receivers=${receivers} shadowLights=${shadowLights}`
      + `\ncalls=${renderer.info.render.calls} tris=${renderer.info.render.triangles}`;
  }
}

function loop() {
  raf = requestAnimationFrame(loop);
  const t = (performance.now() - t0) / 1000;
  controls.update();
  renderAt(+(q.get('t') || 0) || t);
}
ready.then(() => {
  if (q.get('still') === '1') renderAt(+(q.get('t') || 0));
  else loop();
});

window.__lab = {
  ready, renderAt, scene, camera, renderer,
  models: listModels(),
  get info() { return hud.textContent; },
};
