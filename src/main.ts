import * as THREE from 'three';

// Temporary smoke test — verifies headless WebGL2 + PBR + shadows before the
// real engine lands.
const app = document.getElementById('app')!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x223344);
const cam = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
cam.position.set(3, 2.5, 4);
cam.lookAt(0, 0.5, 0);

const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.position.set(5, 8, 3);
sun.castShadow = true;
scene.add(sun, new THREE.HemisphereLight(0x88aaff, 0x332211, 0.6));

const box = new THREE.Mesh(
  new THREE.TorusKnotGeometry(0.7, 0.25, 160, 24),
  new THREE.MeshStandardMaterial({ color: 0xcc5533, metalness: 0.9, roughness: 0.25 })
);
box.position.y = 1;
box.castShadow = true;
scene.add(box);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.8 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

renderer.render(scene, cam);

const gl = renderer.getContext();
(window as any).__CAPTURE_STATS__ = {
  webgl2: renderer.capabilities.isWebGL2,
  renderer: gl.getParameter(gl.RENDERER),
  vendor: gl.getParameter(gl.VENDOR),
  maxTex: gl.getParameter(gl.MAX_TEXTURE_SIZE),
};
(window as any).__CAPTURE_READY__ = true;
