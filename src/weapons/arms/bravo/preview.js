/**
 * Stand-alone dev preview for the bravo arms (fast iteration without the full game):
 *   /src/weapons/arms/bravo/preview.html?view=hip|ads&cam=x,y,z&look=x,y,z&fov=30&pose=magGrab
 * The rig hangs off a camera at the origin exactly like in-game (weapon FOV 46°, hip / ADS sway-pivot poses);
 * `cam`/`look` render from a free inspection camera instead. Sets window.__ready when the first frame is drawn.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createRig } from '../../rig.js';
import { buildArms } from './index.js';

const params = new URLSearchParams(location.search);
const num = (k, d) => (params.has(k) ? parseFloat(params.get(k)) : d);
const vec = (k) => (params.has(k) ? params.get(k).split(',').map(Number) : null);
const W = num('w', 1280);
const H = num('h', 720);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(W, H);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7d8a96);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.5;

const camera = new THREE.PerspectiveCamera(46, W / H, 0.01, 12);
scene.add(camera);

const sun = new THREE.DirectionalLight(0xfff3e2, 3.2);
sun.position.set(0.55, 0.8, 0.3).multiplyScalar(3);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 6;
sun.shadow.camera.left = sun.shadow.camera.bottom = -0.8;
sun.shadow.camera.right = sun.shadow.camera.top = 0.8;
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.002;
sun.target.position.set(0, -0.1, -0.4);
scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight(0x9db6d6, 0x6b5f52, 0.7));

// floor far below for shadow context
const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshStandardMaterial({ color: 0x6f6a62, roughness: 1 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.6;
floor.receiveShadow = true;
scene.add(floor);

const gltf = await new GLTFLoader().loadAsync('/assets/models/weapons/M4A1.glb');
gltf.scene.traverse((o) => {
  if (o.isMesh) {
    o.castShadow = true;
    o.receiveShadow = true;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      m.color.setRGB(3.3, 3.3, 3.4);
      m.roughness = 0.85;
      m.metalness = 0.5;
    }
  }
});
const rig = createRig(camera, gltf.scene);
if (rig.parts.carryHandle) rig.parts.carryHandle.visible = false;

const view = params.get('view') || 'hip';
if (view === 'ads') rig.swayPivot.position.set(0, -0.092, -0.155);
else if (view === 'sprint') {
  rig.swayPivot.position.set(0.07, -0.15, -0.3);
  rig.swayPivot.rotation.set(0.2, 0.6, -0.25);
} else if (view === 'reload') {
  rig.swayPivot.position.set(0.15, -0.15, -0.32);
  rig.swayPivot.rotation.set(-0.12, 0.12, -0.42);
} else {
  rig.swayPivot.position.set(0.13, -0.115, -0.34);
  rig.swayPivot.rotation.set(0.0, 0.05, -0.015);
}
if (params.has('gun') && params.get('gun') === '0') rig.gunRoot.visible = false;
// ?magOut=e — reproduce the WeaponSystem's magazine pivot, slid out of the well by fraction e (0..1)
if (params.has('magOut')) {
  const e = num('magOut', 0);
  const node = rig.parts.magazine;
  const pivot = new THREE.Group();
  pivot.name = 'MagazinePivot';
  rig.gunRoot.updateWorldMatrix(true, true);
  node.getWorldPosition(pivot.position);
  rig.gunRoot.worldToLocal(pivot.position);
  rig.gunRoot.add(pivot);
  pivot.updateWorldMatrix(true, false);
  pivot.attach(node);
  pivot.userData.rest = { position: pivot.position.clone(), quaternion: pivot.quaternion.clone() };
  pivot.position.y -= 0.17 * e;
  pivot.position.z += 0.03 * e;
  pivot.rotation.x = -0.35 * e;
}

const game = { settings: { params }, assets: { anisotropy: 8 }, render: { setupObject() {}, setViewModel() {} } };
const arms = await buildArms(game, rig);
window.__arms = arms;
window.__rig = rig;
window.__THREE = THREE;

// Optional fit overrides for tuning: ?lpos=x,y,z&ly=..&lz=..&rpos=..&ry=..&rz=..
function applyFitOverride(hand, socket, pos, y, z) {
  if (!pos && !y && !z) return;
  const cur = hand.fits.grip;
  const invSocket = socket.quaternion.clone().invert();
  if (pos) cur.pos.copy(new THREE.Vector3().fromArray(pos).sub(socket.position).applyQuaternion(invSocket));
  if (y || z) {
    const yg = new THREE.Vector3().fromArray(y || [0, 1, 0]);
    const zg = new THREE.Vector3().fromArray(z || [0, 0, 1]);
    const yy = yg.clone().normalize();
    const xx = new THREE.Vector3().crossVectors(yy, zg).normalize();
    const zz = new THREE.Vector3().crossVectors(xx, yy).normalize();
    const m = new THREE.Matrix4().makeBasis(xx, yy, zz);
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    cur.quat.copy(invSocket).multiply(q);
  }
}
applyFitOverride(arms.hands.left, rig.sockets.gripLeft, vec('lpos'), vec('ly'), vec('lz'));
applyFitOverride(arms.hands.right, rig.sockets.gripRight, vec('rpos'), vec('ry'), vec('rz'));
if (params.has('pose')) arms.setPose(params.get('pose'));
if (params.has('poseJson')) {
  // ?poseJson={"left":{"index":[..],...}} — raw override compiled on the fly
  const { compilePose } = await import('./poses.js');
  const pj = JSON.parse(params.get('poseJson'));
  if (pj.left) arms.hands.left.poseOverride = compilePose(pj.left);
  if (pj.right) arms.hands.right.poseOverride = compilePose(pj.right);
}
if (params.get('hideArms') === '1') arms.root.visible = false;

const driveTargets = () => {
  const s = rig.sockets;
  s.rightHandTarget.position.copy(s.gripRight.position);
  s.rightHandTarget.quaternion.copy(s.gripRight.quaternion);
  s.rightHandTarget.userData.pose = 'grip';
  s.leftHandTarget.position.copy(s.gripLeft.position);
  s.leftHandTarget.quaternion.copy(s.gripLeft.quaternion);
  s.leftHandTarget.userData.pose = params.get('lpose') || 'grip';
  if (params.has('ltarget')) s.leftHandTarget.position.fromArray(vec('ltarget'));
};

let viewCam = camera;
if (params.has('cam')) {
  viewCam = new THREE.PerspectiveCamera(num('fov', 35), W / H, 0.005, 20);
  viewCam.position.fromArray(vec('cam'));
  viewCam.lookAt(new THREE.Vector3().fromArray(vec('look') || [0, -0.1, -0.4]));
  viewCam.updateMatrixWorld(true);
}

// settle springs & blends, then render
for (let i = 0; i < 90; i++) {
  driveTargets();
  arms.update(1 / 60, rig.state);
  scene.updateMatrixWorld(true);
}
renderer.render(scene, viewCam);
if (params.get('dump') === '1') {
  const inv = rig.gunRoot.matrixWorld.clone().invert();
  const p = new THREE.Vector3();
  for (const [name, hand] of Object.entries(arms.hands)) {
    const lines = [];
    for (const b of hand.bones) {
      b.getWorldPosition(p).applyMatrix4(inv);
      lines.push(`${b.name}:(${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)})`);
    }
    console.log(`[dump] ${name} ${lines.join(' ')}`);
  }
}
const info = renderer.info.render;
console.log(`[preview] tris ${info.triangles} calls ${info.calls} armsTris ${arms.triangles}`);
window.__stats = { triangles: info.triangles, calls: info.calls, armsTris: arms.triangles };
window.__ready = true;
