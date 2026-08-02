// Temporary contract check: every ship's orientation, origin, nodes and rigs.
// Deleted before hand-off.
import * as THREE from 'three';
import './index.js';
import { models, make } from '../registry.js';

const EXPECT = {
  corvette: { nodes: ['cockpit', 'dorsalGun', ...Array.from({ length: 11 }, (_, i) => `engine${i}`)] },
  stardestroyer: { nodes: ['engineL', 'engineC', 'engineR', 'bridge', 'hangarMouth'] },
  xwing: {
    nodes: ['r2socket', 'cockpit', ...Array.from({ length: 4 }, (_, i) => `gun${i}`),
      ...Array.from({ length: 4 }, (_, i) => `engine${i}`)],
    api: ['setSFoils'],
  },
  tiefighter: { nodes: ['gunL', 'gunR'] },
  escapepod: { nodes: ['thruster'] },
  sandcrawler: { nodes: ['ramp'], api: ['setRamp'], ground: true },
  landspeeder: { nodes: ['seatL', 'seatR'] },
  // The turret's origin is its yaw axis, not its bounding-box centre: a scene
  // bolts it to a hull at that point and aim() has to swing about it.
  turret: { nodes: ['muzzle'], api: ['aim'], ground: true, pivotOrigin: true },
};

let fails = 0;
const bad = (id, msg) => { console.log(`  FAIL ${id}: ${msg}`); fails++; };

for (const id of models.keys()) {
  const o = await make(id);
  const spec = EXPECT[id] || {};
  const box = new THREE.Box3().setFromObject(o);
  const c = box.getCenter(new THREE.Vector3());
  const s = box.getSize(new THREE.Vector3());
  const nodes = o.userData.nodes || {};

  console.log(`${id}`);
  if (Math.abs(c.x) > 0.15) bad(id, `not centred on X (cx=${c.x.toFixed(2)})`);
  if (!spec.pivotOrigin && Math.abs(c.z) > 0.4) bad(id, `not centred on Z (cz=${c.z.toFixed(2)})`);
  if (spec.ground) {
    if (Math.abs(box.min.y) > 0.15) bad(id, `ground vehicle not resting on y=0 (min=${box.min.y.toFixed(2)})`);
  } else if (Math.abs(c.y) > 0.2) {
    bad(id, `flyer not centred on Y (cy=${c.y.toFixed(2)})`);
  }
  for (const n of spec.nodes || []) {
    if (!nodes[n]) bad(id, `missing node "${n}"`);
    else if (!nodes[n].isObject3D) bad(id, `node "${n}" is not an Object3D`);
  }
  for (const fn of spec.api || []) {
    if (typeof o.userData[fn] !== 'function') bad(id, `missing userData.${fn}()`);
  }
  // every engine/thruster/muzzle node should sit inside the hull's bounds
  for (const [n, node] of Object.entries(nodes)) {
    if (!node.isObject3D) continue;
    const p = node.getWorldPosition(new THREE.Vector3());
    if (!Number.isFinite(p.x + p.y + p.z)) bad(id, `node "${n}" has a non-finite position`);
  }
  // glow materials must be private clones, or one ship dims the whole film
  const glowMats = new Set();
  o.traverse((m) => { if (m.isMesh && /_glow$/.test(m.material?.name || '')) glowMats.add(m.material); });

  console.log(`  size ${s.x.toFixed(1)} x ${s.y.toFixed(1)} x ${s.z.toFixed(1)}`
    + `  centre (${c.x.toFixed(2)}, ${c.y.toFixed(2)}, ${c.z.toFixed(2)})`
    + `  glowMats=${glowMats.size}  update=${typeof o.userData.update === 'function'}`);
}

// exercise the moving parts
const xw = await make('xwing');
for (const v of [0, 0.5, 1]) xw.userData.setSFoils(v);
const closed = new THREE.Box3().setFromObject(xw).getSize(new THREE.Vector3());
xw.userData.setSFoils(0);
const shut = new THREE.Box3().setFromObject(xw).getSize(new THREE.Vector3());
xw.userData.setSFoils(1);
const open = new THREE.Box3().setFromObject(xw).getSize(new THREE.Vector3());
console.log(`xwing sfoil travel: closed y=${shut.y.toFixed(2)} open y=${open.y.toFixed(2)}`);
if (open.y <= shut.y + 0.5) bad('xwing', 'setSFoils(1) does not open the wings further than 0');
void closed;

const sc = await make('sandcrawler');
sc.userData.setRamp(0);
const stowed = new THREE.Box3().setFromObject(sc);
sc.userData.setRamp(1);
const down = new THREE.Box3().setFromObject(sc);
console.log(`sandcrawler ramp: stowed reach z=${stowed.max.z.toFixed(1)} down z=${down.max.z.toFixed(1)}`
  + ` tip y=${down.min.y.toFixed(2)}`);
if (down.max.z <= stowed.max.z + 4) bad('sandcrawler', 'setRamp(1) does not extend the ramp forward');
if (down.min.y < -0.5) bad('sandcrawler', `lowered ramp digs below the sand (y=${down.min.y.toFixed(2)})`);

const tu = await make('turret');
tu.userData.aim(0.7, 0.35);
const m = tu.userData.nodes.muzzle.getWorldPosition(new THREE.Vector3());
tu.userData.aim(0, 0);
const m0 = tu.userData.nodes.muzzle.getWorldPosition(new THREE.Vector3());
console.log(`turret aim: muzzle (0,0)=${m0.toArray().map((v) => v.toFixed(2))} `
  + `(0.7,0.35)=${m.toArray().map((v) => v.toFixed(2))}`);
if (m.distanceTo(m0) < 0.3) bad('turret', 'aim() does not move the muzzle');

console.log(fails ? `\n${fails} FAILURE(S)` : '\nall contracts OK');
process.exit(fails ? 1 : 0);
