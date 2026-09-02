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
// ?stopZ=-0.315 slides the station along the handguard (the fit is socket-relative and should ride along).
{
  const simple = (color, roughness, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness, vertexColors: true });
  const stubMats = { polymer: simple(0x2b2b29, 0.82), steel: simple(0x8d9096, 0.42, 0.95), matte: simple(0x0c0c0d, 0.95) };
  const stubAtlas = { text: (w, h) => plane(w, h), material: new THREE.MeshStandardMaterial({ transparent: true, opacity: 0 }) };
  const handStop = buildHandStop({}, rig, stubMats, stubAtlas, { zCentre: num('stopZ', -0.265) });
  rig.sockets.gripLeft.position.copy(handStop.palm);
  rig.sockets.gripLeft.rotation.copy(handStop.palmRotation);
  handStop.group.visible = params.get('handstop') !== '0';
}

// View-model camera FOV (Settings.weaponFov = 52; ADS narrows it by 35 % of the 1.32 zoom → ≈ 46.8°)
const view = params.get('view') || 'hip';
camera.fov = view === 'ads' ? 52 / (1 + 0.32 * 0.35) : 52;
camera.updateProjectionMatrix();
if (view === 'ads') {
  // WeaponSystem: reticle centre on the camera axis at ADS_EYE_RELIEF = 0.2 m
  const aim = rig.sockets.sightAim?.position || new THREE.Vector3(0, 0.09, -0.05);
  rig.swayPivot.position.set(-aim.x, -aim.y, -0.2 - aim.z);
} else if (view === 'sprint') {
  rig.swayPivot.position.set(0.055, -0.13, -0.22);
  rig.swayPivot.rotation.set(0.2, 0.6, -0.25);
} else if (view === 'reload') {
  rig.swayPivot.position.set(0.15, -0.15, -0.32);
  rig.swayPivot.rotation.set(-0.12, 0.12, -0.42);
} else {
  // WeaponSystem HIP_POSE (gun held close, yawed ~14° left like the MW2019 reference framing)
  rig.swayPivot.position.set(0.07, -0.082, -0.16);
  rig.swayPivot.rotation.set(0.055, 0.25, -0.09);
}
if (params.has('pivot')) rig.swayPivot.position.fromArray(vec('pivot'));
if (params.has('pivotRot')) rig.swayPivot.rotation.fromArray(vec('pivotRot'));
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
// ?lgrip=phi,theta,pitch (degrees) — overhand-from-the-left grip: phi = where the palm sits round the handguard
// (0 = on the left face, palm facing right; 90 = on top, palm facing down), theta = wrist swing so the knuckle
// row points forward, pitch = tilt of the back of the hand toward the camera (about the hand's own x axis).
if (params.has('lgrip')) {
  const [phi, theta, pitch] = vec('lgrip');
  const DEG = Math.PI / 180;
  const n = new THREE.Vector3(Math.cos(phi * DEG), -Math.sin(phi * DEG), 0); // palm normal → handguard axis
  const t = new THREE.Vector3(Math.sin(phi * DEG), Math.cos(phi * DEG), 0); // wrap direction along the surface
  const y = t.multiplyScalar(Math.cos(theta * DEG)).add(new THREE.Vector3(0, 0, -Math.sin(theta * DEG)));
  const z = n.clone().negate();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  const qp = new THREE.Quaternion().setFromAxisAngle(x, pitch * DEG);
  y.applyQuaternion(qp);
  z.applyQuaternion(qp);
  lY = y.toArray();
  lZ = z.toArray();
  console.log(`[preview] lgrip y=[${lY.map((v) => v.toFixed(3))}] z=[${lZ.map((v) => v.toFixed(3))}] x=[${x.toArray().map((v) => v.toFixed(3))}]`);
}
applyFitOverride(arms.hands.left, rig.sockets.gripLeft, vec('lpos'), lY, lZ);
applyFitOverride(arms.hands.right, rig.sockets.gripRight, vec('rpos'), vec('ry'), vec('rz'));
if (params.has('lpole')) arms.hands.left.fits.grip.pole.fromArray(vec('lpole')).normalize();
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
    const stopZ = num('stopZ', -0.265); // hand stop clamp + fin (follows ?stopZ like the socket does)
    if (z < stopZ + 0.027 && z > stopZ - 0.027) d = Math.min(d, sdBox(x, y, 0, -0.0248, 0.011, 0.0142));
    return d;
  };
  // ?checkFit=1 — no search: report the clearances of the pose in poses.js (and of the fit in index.js) as is
  const checkOnly = params.get('checkFit') === '1';
  const names = ['index', 'middle', 'ring', 'pinky'];
  const raw = {
    index: [0, 0, 0, 0],
    middle: [0, 0, 0, 0],
    ring: [0, 0, 0, 0],
    pinky: [0, 0, 0, 0],
    thumb: Array.from(POSES.gripLeft.slice(16)),
  };
  if (checkOnly) {
    const src = hand.poseOverride || POSES.gripLeft; // ?poseJson override or the pose from poses.js
    names.forEach((n, i) => (raw[n] = Array.from(src.slice(i * 4, i * 4 + 4))));
    raw.thumb = Array.from(src.slice(16));
  }
  const spread = params.has('spread') ? vec('spread') : [0, 0, 0, 0];
  if (!checkOnly) names.forEach((n, i) => (raw[n][3] = spread[i]));
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
  // ?fitPalm=1 — before the fingers, slide the palm centre (grid ±2 cm) so the MCP knuckle row and the palm's
  // palmar face sit against the handguard without penetrating (knuckles hug, the rest only avoids).
  if (params.get('fitPalm') === '1') {
    const fit = hand.fits.grip;
    const base = fit.pos.clone();
    const socketQ = rig.sockets.gripLeft.quaternion;
    const samples = [
      ...[0, 1, 2, 3].map((f) => ({ p: def.fingers[f].mcp.map((v, i) => (i === 0 ? -v : v)), r: def.fingers[f].r[0] * 1.16, w: 1 })),
      { p: [-0.002, 0.05, -0.017], r: 0, w: num('palmHug', 0.3) },
      { p: [-0.002, 0.018, -0.017], r: 0, w: 0 },
      { p: [0.02, 0.04, -0.02], r: 0, w: 0 },
      { p: [-0.028, 0.035, -0.017], r: 0, w: 0 },
      { p: [0.0, 0.085, -0.012], r: 0, w: 0 },
    ];
    const wp = new THREE.Vector3();
    const cost = () => {
      let c = 0;
      for (const s of samples) {
        hand.group.localToWorld(wp.fromArray(s.p)).applyMatrix4(inv);
        const g = sdf(wp.x, wp.y, wp.z) - s.r;
        c += g < CLEAR ? 1e5 + (CLEAR - g) * 1e7 : s.w * g * g * 1e6;
      }
      return c;
    };
    const step = num('palmStep', 0.004);
    const range = num('palmRange', 0.02);
    let best = { cost: Infinity, off: [0, 0, 0] };
    const off = new THREE.Vector3();
    for (let dx = -range; dx <= range + 1e-9; dx += step) {
      for (let dy = -range; dy <= range + 1e-9; dy += step) {
        for (let dz = -range; dz <= range + 1e-9; dz += step) {
          off.set(dx, dy, dz).applyQuaternion(socketQ.clone().invert());
          fit.pos.copy(base).add(off);
          apply();
          const c = cost();
          if (c < best.cost) best = { cost: c, off: [dx, dy, dz] };
        }
      }
    }
    off.fromArray(best.off).applyQuaternion(socketQ.clone().invert());
    fit.pos.copy(base).add(off);
    apply();
    const centre = hand.group.localToWorld(new THREE.Vector3().fromArray(hand.palm.toArray())).applyMatrix4(inv);
    const fromSocket = centre.clone().sub(rig.sockets.gripLeft.position);
    report.palm = { offset: best.off.map((v) => +v.toFixed(4)), cost: +best.cost.toFixed(0), centreGun: centre.toArray().map((v) => +v.toFixed(4)), fitOffset: fromSocket.toArray().map((v) => +v.toFixed(4)) };
  }
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
  for (let f = 0; f < 4 && !checkOnly; f++) {
    const name = names[f];
    const ids = BONES[name];
    let best = { cost: Infinity, angles: [0, 0, 0] };
    for (let mcp = 0; mcp <= 90; mcp += 5) {
      for (let pip = 0; pip <= 100; pip += 5) {
        for (let dip = 0; dip <= Math.min(70, pip + 10); dip += 10) {
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
  // ?tdir=x,y,z (gun space) instead fits the two distal segments to a direction (e.g. across the top-left rail).
  if ((params.has('tline') || params.has('tdir')) && !checkOnly) {
    const [lx, ly] = vec('tline') || [0, 0];
    const tdir = params.has('tdir') ? new THREE.Vector3().fromArray(vec('tdir')).normalize() : null;
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
    const dirCost = (a, b) => {
      const d = b.clone().sub(a).normalize();
      return (1 - d.dot(tdir)) * 2e4;
    };
    // ?ttip=x,y,z — pull the thumb tip toward a gun-space point (mm² distance, weight ttipw)
    const ttip = params.has('ttip') ? new THREE.Vector3().fromArray(vec('ttip')) : null;
    const ttipw = num('ttipw', 1);
    let best = { cost: Infinity, angles: [0, 0, 0, 0, 0] };
    const twist = num('ttwist', 0);
    // self-collision: the thumb must stay on the palmar side of the hand's own slab (a real thumb cannot swing over
    // the back of the hand) — thumb joint centres over the palm area with hand-space z above the mid-plane are
    // penalised like a penetration
    const gunToHand = new THREE.Matrix4();
    const lp = new THREE.Vector3();
    const selfCost = (pGun) => {
      lp.copy(pGun).applyMatrix4(gunToHand);
      if (lp.y < -0.01 || lp.y > 0.12 || Math.abs(lp.x) > 0.055) return 0;
      const over = lp.z + 0.004;
      return over > 0 ? 1e5 + over * 1e7 : 0;
    };
    const tstep = num('tstep', 10); // CMC grid step (deg); ?tstep=5 for a fine pass
    for (let flex = -90; flex <= 60; flex += tstep) {
      for (let abd = -90; abd <= 90; abd += tstep) {
        for (let mcp = -30; mcp <= 60; mcp += 10) {
          for (let ip = -30; ip <= 60; ip += 15) {
            raw.thumb = [flex, abd, twist, mcp, ip];
            apply();
            gunToHand.copy(hand.group.matrixWorld).invert().multiply(rig.gunRoot.matrixWorld);
            let cost = 0;
            for (let joint = 0; joint < 3; joint++) {
              const a = jointPos(hand.bones[t[joint]]);
              const b = boneEnd(hand.bones[t[joint]], def.thumb.len[joint]);
              cost += gapCost(a, b, def.thumb.r[joint], def.thumb.r[joint + 1], joint > 0) * (joint > 0 ? num('thug', 0.3) : 1); // hug the rail with the distal segments
              cost += selfCost(b) * num('tselfw', 1);
              if (joint > 0) cost += tdir ? dirCost(a, b) * num('tlinew', 1) : lineCost(a, b) * num('tlinew', 1);
              if (joint === 2 && !tdir) cost += (b.z - a.z) * 1e5; // reward pointing forward
              if (joint === 2 && ttip) cost += b.distanceToSquared(ttip) * 1e6 * ttipw;
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
  // clearance (mm) of the MCP knuckles and of the palm's palmar face / heel against the handguard (negative = inside)
  {
    const mm = (v) => +(v * 1000).toFixed(1);
    const knuckles = {};
    for (let f = 0; f < 4; f++) {
      const jp = jointPos(hand.bones[BONES[names[f]][0]]);
      knuckles[names[f]] = mm(sdf(jp.x, jp.y, jp.z) - def.fingers[f].r[0] * 1.16);
    }
    const palmPts = { centre: [-0.002, 0.05, -0.017], heel: [-0.002, 0.018, -0.017], thenar: [0.02, 0.04, -0.02], hypothenar: [-0.028, 0.035, -0.017], mcpRow: [-0.002, 0.085, -0.012] };
    const palm = {};
    for (const [k, v] of Object.entries(palmPts)) {
      const w = hand.group.localToWorld(new THREE.Vector3().fromArray(v)).applyMatrix4(inv);
      palm[k] = mm(sdf(w.x, w.y, w.z));
    }
    // finger phalanges: smallest clearance along each capsule (negative = inside the handguard / hand stop)
    const fingers = {};
    for (let f = 0; f < 4; f++) {
      const segs = [];
      for (let joint = 0; joint < 3; joint++) {
        const a = jointPos(hand.bones[BONES[names[f]][joint]]);
        const b = boneEnd(hand.bones[BONES[names[f]][joint]], def.fingers[f].len[joint]);
        let g = Infinity;
        for (let s = 0; s <= 1.0001; s += 0.25) g = Math.min(g, sdf(a.x + (b.x - a.x) * s, a.y + (b.y - a.y) * s, a.z + (b.z - a.z) * s) - (def.fingers[f].r[joint] + (def.fingers[f].r[joint + 1] - def.fingers[f].r[joint]) * s));
        segs.push(mm(g));
      }
      fingers[names[f]] = segs;
    }
    // thumb segments: smallest clearance along each capsule (negative = inside the handguard / hand stop)
    const thumb = {};
    ['meta', 'prox', 'dist'].forEach((k, joint) => {
      const a = jointPos(hand.bones[BONES.thumb[joint]]);
      const b = boneEnd(hand.bones[BONES.thumb[joint]], def.thumb.len[joint]);
      let g = Infinity;
      for (let s = 0; s <= 1.0001; s += 0.25) g = Math.min(g, sdf(a.x + (b.x - a.x) * s, a.y + (b.y - a.y) * s, a.z + (b.z - a.z) * s) - (def.thumb.r[joint] + (def.thumb.r[joint + 1] - def.thumb.r[joint]) * s));
      thumb[k] = mm(g);
    });
    report.clearance = { knuckles, palm, fingers, thumb };
  }
  console.log(`[fit] gripLeft ${JSON.stringify(raw)}`);
  console.log(`[fit] joints ${JSON.stringify(report)}`);
  window.__fit = { raw, report };
}

const MAG_GRAB_OFFSET = new THREE.Vector3(-0.005, -0.075, 0);
const driveTargets = () => {
  const s = rig.sockets;
  s.rightHandTarget.position.copy(s.gripRight.position);
  s.rightHandTarget.quaternion.copy(s.gripRight.quaternion);
  s.rightHandTarget.userData.pose = 'grip';
  s.leftHandTarget.position.copy(s.gripLeft.position);
  s.leftHandTarget.quaternion.copy(s.gripLeft.quaternion);
  s.leftHandTarget.userData.pose = params.get('lpose') || 'grip';
  if (params.has('ltarget')) s.leftHandTarget.position.fromArray(vec('ltarget'));
  else if (s.leftHandTarget.userData.pose === 'magGrab' && rig.parts.magazine?.parent?.userData?.rest) {
    // WeaponSystem: palm target = (moved) magazine pivot + (-5, -75, 0) mm
    s.leftHandTarget.position.copy(rig.parts.magazine.parent.position).add(MAG_GRAB_OFFSET);
  }
};

let viewCam = camera;
if (params.has('cam')) {
  viewCam = new THREE.PerspectiveCamera(num('fov', 35), W / H, 0.005, 20);
  viewCam.position.fromArray(vec('cam'));
  viewCam.lookAt(new THREE.Vector3().fromArray(vec('look') || [0, -0.1, -0.4]));
  viewCam.updateMatrixWorld(true);
}

if (params.get('fitFingers') === '1' || params.get('checkFit') === '1') await fitLeftFingers();

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
