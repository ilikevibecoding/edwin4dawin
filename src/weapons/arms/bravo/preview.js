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
import { buildHandStop } from '../../attachments/foregrip.js';
import { plane } from '../../attachments/lib.js';
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

// The angled hand stop moves rig.sockets.gripLeft in-game (attachments/index.js); reproduce it so the socket the
// fit offsets are derived from matches, and so the index-finger / fin contact can be judged here.
{
  const simple = (color, roughness, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness, vertexColors: true });
  const stubMats = { polymer: simple(0x2b2b29, 0.82), steel: simple(0x8d9096, 0.42, 0.95), matte: simple(0x0c0c0d, 0.95) };
  const stubAtlas = { text: (w, h) => plane(w, h), material: new THREE.MeshStandardMaterial({ transparent: true, opacity: 0 }) };
  const handStop = buildHandStop({}, rig, stubMats, stubAtlas, { zCentre: -0.265 });
  rig.sockets.gripLeft.position.copy(handStop.palm);
  rig.sockets.gripLeft.rotation.copy(handStop.palmRotation);
  handStop.group.visible = params.get('handstop') !== '0';
}

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
// ?lframe=roll,yaw,pitch (degrees) — left grip orientation built from the underhand base frame (fingers → gun +X,
// dorsum → gun -Y, thumb side → gun -Z): roll tilts the palm normal to the right, yaw swings the fingers forward,
// pitch tilts the palm normal forward. Prints the resulting y/z vectors for FIT.
let lY = vec('ly');
let lZ = vec('lz');
if (params.has('lframe')) {
  const [roll, yaw, pitch] = vec('lframe');
  const DEG = Math.PI / 180;
  const q = new THREE.Quaternion()
    .setFromAxisAngle(new THREE.Vector3(0, 0, 1), -roll * DEG)
    .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -pitch * DEG))
    .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw * DEG));
  lY = new THREE.Vector3(1, 0, 0).applyQuaternion(q).toArray();
  lZ = new THREE.Vector3(0, -1, 0).applyQuaternion(q).toArray();
  console.log(`[preview] lframe y=[${lY.map((v) => v.toFixed(3))}] z=[${lZ.map((v) => v.toFixed(3))}]`);
}
applyFitOverride(arms.hands.left, rig.sockets.gripLeft, vec('lpos'), lY, lZ);
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

/**
 * ?fitFingers=1 — greedy wrap of the left hand's fingers around the handguard: for each joint (MCP → PIP → DIP) take
 * the largest flexion for which the phalanx capsule stays clear of the handguard cross-section (tube body + four
 * rails + the hand stop). Logs the resulting gripLeft pose. Uses the actual skeleton, so it accounts for the fit
 * orientation in effect (including ?lframe / ?lpos overrides).
 */
async function fitLeftFingers() {
  const { compilePose, POSES } = await import('./poses.js');
  const { BONES } = await import('./hand.js');
  const hand = arms.hands.left;
  const inv = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const AXIS_Y = 0.0203;
  const CLEAR = num('clear', 0.0008);
  // signed distance (m) from (x, y, z) in gunRoot space to the handguard + hand stop
  const sdBox = (px, py, cx, cy, hx, hy) => {
    const qx = Math.abs(px - cx) - hx;
    const qy = Math.abs(py - cy) - hy;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0);
  };
  const sdf = (x, y, z) => {
    const dy = y - AXIS_Y;
    let d = Math.hypot(x, dy) - 0.0215;
    // rails: boxes 15.4 mm wide reaching 31.8 mm from the axis (right, top, left, bottom)
    d = Math.min(d, sdBox(x, dy, 0.0159, 0, 0.0159, 0.0077)); // right
    d = Math.min(d, sdBox(x, dy, -0.0159, 0, 0.0159, 0.0077)); // left
    d = Math.min(d, sdBox(x, dy, 0, 0.0159, 0.0077, 0.0159)); // top
    d = Math.min(d, sdBox(x, dy, 0, -0.0159, 0.0077, 0.0159)); // bottom
    if (z < -0.238 && z > -0.292) d = Math.min(d, sdBox(x, y, 0, -0.0248, 0.011, 0.0142)); // hand stop clamp + fin
    return d;
  };
  const raw = {
    index: [0, 0, 0, 0],
    middle: [0, 0, 0, 0],
    ring: [0, 0, 0, 0],
    pinky: [0, 0, 0, 0],
    thumb: Array.from(POSES.gripLeft.slice(16)),
  };
  const spread = params.has('spread') ? vec('spread') : [0, 0, 0, 0];
  const names = ['index', 'middle', 'ring', 'pinky'];
  names.forEach((n, i) => (raw[n][3] = spread[i]));
  scene.updateMatrixWorld(true);
  inv.copy(rig.gunRoot.matrixWorld).invert();
  const apply = () => {
    hand.poseOverride = compilePose(raw);
    driveTargets();
    arms.update(0, rig.state); // dt = 0 → poses/offsets applied without blending
    hand.group.updateMatrixWorld(true);
  };
  const jointPos = (bone) => bone.getWorldPosition(p).applyMatrix4(inv).clone();
  const boneEnd = (bone, len) => bone.localToWorld(new THREE.Vector3(0, len, 0)).applyMatrix4(inv);
  const clear = (a, b, ra, rb) => {
    let worst = Infinity;
    for (let s = 0; s <= 1.0001; s += 0.125) {
      const x = a.x + (b.x - a.x) * s;
      const y = a.y + (b.y - a.y) * s;
      const z = a.z + (b.z - a.z) * s;
      worst = Math.min(worst, sdf(x, y, z) - (ra + (rb - ra) * s));
    }
    return worst;
  };
  const def = arms.hands.left.def;
  const report = {};
  // hugging cost of the whole finger: squared gaps to the surface (samples along each phalanx), penetration penalised
  const gapCost = (a, b, ra, rb, hug = true) => {
    let cost = 0;
    for (let s = 0; s <= 1.0001; s += 0.25) {
      const g = sdf(a.x + (b.x - a.x) * s, a.y + (b.y - a.y) * s, a.z + (b.z - a.z) * s) - (ra + (rb - ra) * s);
      cost += g < CLEAR ? 1e5 + (CLEAR - g) * 1e7 : hug ? g * g * 1e6 : 0; // mm² gaps; penetration dominates
    }
    return cost;
  };
  const fingerCost = (f, ids) => {
    let cost = 0;
    for (let joint = 0; joint < 3; joint++) {
      const a = jointPos(hand.bones[ids[joint]]);
      const b = boneEnd(hand.bones[ids[joint]], def.fingers[f].len[joint]);
      cost += gapCost(a, b, def.fingers[f].r[joint], def.fingers[f].r[joint + 1]) * (joint === 0 ? 1.5 : 1);
    }
    return cost;
  };
  for (let f = 0; f < 4; f++) {
    const name = names[f];
    const ids = BONES[name];
    let best = { cost: Infinity, angles: [0, 0, 0] };
    for (let mcp = 0; mcp <= 90; mcp += 5) {
      for (let pip = 0; pip <= 100; pip += 5) {
        for (let dip = 0; dip <= 70; dip += 10) {
          raw[name][0] = mcp;
          raw[name][1] = pip;
          raw[name][2] = dip;
          apply();
          // mild preference for natural curls (PIP a little more than MCP, DIP less than PIP)
          const natural = num('natural', 0.03) * ((pip - mcp * 1.1) ** 2 + (dip - pip * 0.5) ** 2);
          const cost = fingerCost(f, ids) + natural;
          if (cost < best.cost) best = { cost, angles: [mcp, pip, dip] };
        }
      }
    }
    raw[name][0] = best.angles[0];
    raw[name][1] = best.angles[1];
    raw[name][2] = best.angles[2];
    apply();
    const tip = boneEnd(hand.bones[ids[2]], def.fingers[f].len[2]);
    report[name] = { pose: raw[name].slice(), mcp: jointPos(hand.bones[ids[0]]).toArray().map((v) => +v.toFixed(4)), tip: tip.toArray().map((v) => +v.toFixed(4)) };
  }
  // Thumb: grid search over CMC flexion/abduction + MCP/IP flexion so the two distal segments lie along the line
  // x = tline[0], y = tline[1] (gun space, parallel to the barrel — i.e. along the left side rail) pointing forward,
  // without penetrating the handguard.
  if (params.has('tline')) {
    const [lx, ly] = vec('tline');
    const t = BONES.thumb;
    const lineCost = (a, b) => {
      let c = 0;
      for (let s = 0; s <= 1.0001; s += 0.25) {
        const x = a.x + (b.x - a.x) * s;
        const y = a.y + (b.y - a.y) * s;
        c += ((x - lx) * 1000) ** 2 + ((y - ly) * 1000) ** 2;
      }
      return c;
    };
    let best = { cost: Infinity, angles: [0, 0, 0, 0, 0] };
    const twist = num('ttwist', 0);
    for (let flex = -90; flex <= 60; flex += 10) {
      for (let abd = -90; abd <= 90; abd += 10) {
        for (let mcp = -30; mcp <= 60; mcp += 10) {
          for (let ip = -30; ip <= 60; ip += 15) {
            raw.thumb = [flex, abd, twist, mcp, ip];
            apply();
            let cost = 0;
            for (let joint = 0; joint < 3; joint++) {
              const a = jointPos(hand.bones[t[joint]]);
              const b = boneEnd(hand.bones[t[joint]], def.thumb.len[joint]);
              cost += gapCost(a, b, def.thumb.r[joint], def.thumb.r[joint + 1], joint > 0) * (joint > 0 ? num('thug', 0.3) : 1); // hug the rail with the distal segments
              if (joint > 0) cost += lineCost(a, b) * num('tlinew', 1);
              if (joint === 2) cost += (b.z - a.z) * 1e5; // reward pointing forward
            }
            if (cost < best.cost) best = { cost, angles: [flex, abd, twist, mcp, ip] };
          }
        }
      }
    }
    raw.thumb = best.angles.slice();
    apply();
    report.thumb = { pose: raw.thumb.slice(), cmc: jointPos(hand.bones[t[0]]).toArray().map((v) => +v.toFixed(4)), mcp: jointPos(hand.bones[t[1]]).toArray().map((v) => +v.toFixed(4)), tip: boneEnd(hand.bones[t[2]], def.thumb.len[2]).toArray().map((v) => +v.toFixed(4)) };
  }
  apply();
  console.log(`[fit] gripLeft ${JSON.stringify(raw)}`);
  console.log(`[fit] joints ${JSON.stringify(report)}`);
  window.__fit = { raw, report };
}

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

if (params.get('fitFingers') === '1') await fitLeftFingers();

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
