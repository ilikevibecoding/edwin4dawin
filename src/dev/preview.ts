/**
 * Asset inspection harness (development only, excluded from the app bundle
 * entry). Load `/preview.html?asset=<name>&view=<name>` to frame a single
 * procedural asset for screenshot review.
 */
import * as THREE from 'three';
import { StarDestroyer } from '../assets/ships/StarDestroyer';
import { BlockadeRunner } from '../assets/ships/BlockadeRunner';
import { EscapePod } from '../assets/ships/EscapePod';
import { Tatooine } from '../assets/world/Tatooine';
import { Starfield } from '../assets/world/Starfield';

const params = new URLSearchParams(location.search);
const assetName = params.get('asset') ?? 'destroyer';
const view = params.get('view') ?? 'three-quarter';

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070c);
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 600000);

const key = new THREE.DirectionalLight(0xfff0dc, 4.2);
key.position.set(4, 3, 5);
scene.add(key);
const fill = new THREE.DirectionalLight(0x7f9ad0, 1.15);
fill.position.set(-5, -1, -3);
scene.add(fill);
scene.add(new THREE.AmbientLight(0x5d6f8c, 1.1));
const rim = new THREE.DirectionalLight(0xbcd6ff, 2.0);
rim.position.set(-2, 1.5, -6);
scene.add(rim);

let radius = 10;
let target = new THREE.Vector3();
let updater: ((dt: number, t: number) => void) | null = null;
let framedObject: THREE.Object3D = scene;

function frame(object: THREE.Object3D, pad = 1.25): void {
  framedObject = object;
  const bbox = new THREE.Box3().setFromObject(object);
  const sphere = bbox.getBoundingSphere(new THREE.Sphere());
  target = sphere.center.clone();
  radius = sphere.radius * pad;
  document.getElementById('label')!.textContent =
    `${assetName} | view=${view} | bounds r=${sphere.radius.toFixed(1)} center=(${target.x.toFixed(1)}, ${target.y.toFixed(1)}, ${target.z.toFixed(1)})`;
}

switch (assetName) {
  case 'destroyer': {
    const isd = new StarDestroyer({ detail: 1 });
    scene.add(isd.root);
    isd.trackTarget(new THREE.Vector3(600, 400, 900));
    frame(isd.root, 1.15);
    updater = (dt, t) => isd.update(dt, t);
    break;
  }
  case 'runner': {
    const cr = new BlockadeRunner({ detail: 1 });
    scene.add(cr.root);
    frame(cr.root, 1.2);
    updater = (dt, t) => cr.update(dt, t);
    break;
  }
  case 'pod': {
    const pod = new EscapePod();
    scene.add(pod.root);
    frame(pod.root, 1.3);
    updater = (dt, t) => pod.update(dt, t);
    break;
  }
  case 'scale': {
    const isd = new StarDestroyer({ detail: 0.6 });
    scene.add(isd.root);
    const cr = new BlockadeRunner({ detail: 0.8 });
    cr.root.position.set(0, -340, 900);
    scene.add(cr.root);
    const pod = new EscapePod();
    pod.root.position.set(80, -340, 900);
    scene.add(pod.root);
    frame(isd.root, 1.1);
    updater = (dt, t) => {
      isd.update(dt, t);
      cr.update(dt, t);
      pod.update(dt, t);
    };
    break;
  }
  case 'planet': {
    const planet = new Tatooine({ radius: 12000, segments: 128 });
    scene.add(planet.root);
    const stars = new Starfield(4000, 120000);
    scene.add(stars.root);
    key.position.set(0.55, 0.32, -0.77).multiplyScalar(1000);
    planet.setSunDirection(new THREE.Vector3(0.55, 0.32, -0.77));
    frame(planet.surface, 1.5);
    updater = (dt, t) => {
      planet.update(dt, t);
      stars.update(dt, t);
    };
    break;
  }
  case 'corridor': {
    const { Corridor } = await import('../assets/interior/Corridor');
    const corridor = new Corridor({ detail: 1 });
    scene.add(corridor.root);
    frame(corridor.root, 1.0);
    updater = (dt, t) => corridor.update(dt, t);
    break;
  }
  case 'cast': {
    const { createCharacter, CHARACTER_KINDS } = await import('../assets/characters');
    let x = -3.6;
    const cast: Array<{ update: (dt: number, t: number) => void }> = [];
    for (const kind of CHARACTER_KINDS) {
      const c = createCharacter(kind);
      c.root.position.set(x, 0, 0);
      c.root.rotation.y = 0.25;
      scene.add(c.root);
      cast.push(c);
      x += 1.2;
    }
    const group = new THREE.Group();
    scene.add(group);
    frame(scene, 1.05);
    updater = (dt, t) => cast.forEach((c) => c.update(dt, t));
    break;
  }
  default: {
    const { createCharacter } = await import('../assets/characters');
    const c = createCharacter(assetName as never);
    scene.add(c.root);
    frame(c.root, 1.35);
    updater = (dt, t) => c.update(dt, t);
  }
}

const views: Record<string, [number, number, number]> = {
  'three-quarter': [0.85, 0.42, 1.0],
  front: [0, 0.1, 1.4],
  side: [1.4, 0.05, 0],
  top: [0.05, 1.4, 0.05],
  bottom: [0.05, -1.35, 0.35],
  rear: [0.15, 0.2, -1.4],
  low: [0.9, -0.35, 1.0],
  hero: [1.1, 0.18, 0.55],
};
const dir = new THREE.Vector3(...(views[view] ?? views['three-quarter'])).normalize();
camera.near = Math.max(0.01, radius * 0.002);
camera.far = Math.max(1000, radius * 60);

/** Fit the object's bounding box (not its bounding sphere) into the frame. */
function fitToBox(object: THREE.Object3D): void {
  const bbox = new THREE.Box3().setFromObject(object);
  const corners: THREE.Vector3[] = [];
  for (let i = 0; i < 8; i++) {
    corners.push(
      new THREE.Vector3(
        i & 1 ? bbox.max.x : bbox.min.x,
        i & 2 ? bbox.max.y : bbox.min.y,
        i & 4 ? bbox.max.z : bbox.min.z,
      ),
    );
  }
  let dist = radius * 2.4;
  for (let iter = 0; iter < 8; iter++) {
    camera.position.copy(target).add(dir.clone().multiplyScalar(dist));
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    let worst = 0;
    for (const c of corners) {
      const p = c.clone().project(camera);
      worst = Math.max(worst, Math.abs(p.x), Math.abs(p.y));
    }
    if (worst < 0.001) break;
    dist *= worst / 0.88;
  }
}
fitToBox(framedObject);
camera.updateProjectionMatrix();

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

let last = performance.now();
let elapsed = 0;
function loop(): void {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  elapsed += dt;
  updater?.(dt, elapsed);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();

// Signal readiness for the screenshot harness.
window.setTimeout(() => {
  (window as unknown as { __PREVIEW_READY?: boolean }).__PREVIEW_READY = true;
}, 400);
