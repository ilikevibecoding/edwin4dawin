import * as THREE from 'three';
import { box, cylinder, cone, sphere } from './geo.js';
import { FENCE_X, GATE, PLAZA, SIDEWALK_W, LIGHT_POLES } from './layout.js';

/**
 * Low rustic-stone wall with dressed coping, wrought-iron railing with spear finials, square stone
 * pillars topped with ball finials, and a double gate (both leaves swung open into the garden) at
 * GATE. Runs along x = FENCE_X between the north and south sidewalks.
 */
export function buildFences(ctx) {
  const { mats, batch, addBoxCollider } = ctx;
  const x = FENCE_X;
  const zStart = PLAZA.z1 - SIDEWALK_W; // south end (curb line)
  const zEnd = PLAZA.z0 + SIDEWALK_W; // north end
  // Pillars every ~4.5 m from each end to the gate posts.
  const spaced = (a, b) => {
    const n = Math.max(1, Math.round(Math.abs(a - b) / 4.5));
    return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
  };
  const pillars = [...spaced(zStart, GATE.z1), ...spaced(GATE.z0, zEnd)];

  const wallH = 0.95;
  const wallT = 0.42;
  const railBottom = wallH + 0.1;
  const railTop = wallH + 1.05;
  const iron = [1, 1, 1];

  const pillar = (z, tall = false) => {
    const s = tall ? 0.72 : 0.6;
    const h = tall ? 2.7 : 2.15;
    batch.add(mats.rusticStone, box(s, h, s, { x, y: h / 2, z }), [1, 1, 1]);
    batch.add(mats.trimStone, box(s + 0.18, 0.12, s + 0.18, { x, y: h + 0.06, z }), [1.02, 1.0, 0.96]);
    batch.add(mats.trimStone, box(s - 0.1, 0.06, s - 0.1, { x, y: h + 0.15, z }), [1.02, 1.0, 0.96]);
    if (tall) {
      // Lantern finial on the gate pillars.
      batch.add(mats.iron, box(0.3, 0.5, 0.3, { x, y: h + 0.45, z }), iron);
      batch.add(mats.lampGlass, box(0.22, 0.34, 0.22, { x, y: h + 0.43, z }), null);
      batch.add(mats.iron, cone(0.26, 0.2, 4, { x, y: h + 0.8, z, rotY: Math.PI / 4 }), iron);
    } else {
      batch.add(mats.trimStone, cylinder(0.15, 0.17, 0.08, 10, { x, y: h + 0.22, z }), [1.02, 1.0, 0.96]);
      batch.add(mats.trimStone, sphere(0.23, { x, y: h + 0.48, z, seg: 14 }), [1.02, 1.0, 0.96]);
    }
    addBoxCollider(x, (h + 0.6) / 2, z, s / 2 + 0.02, (h + 0.6) / 2, s / 2 + 0.02, 'stone');
  };

  for (let i = 0; i < pillars.length; i++) {
    const z = pillars[i];
    const isGate = z === GATE.z0 || z === GATE.z1;
    pillar(z, isGate);
    if (i === pillars.length - 1) break;
    const z2 = pillars[i + 1];
    if (z === GATE.z1 && z2 === GATE.z0) {
      buildGate(ctx, x, GATE.z0, GATE.z1, railTop - 0.1);
      continue;
    }
    const len = Math.abs(z - z2) - 0.6;
    const zc = (z + z2) / 2;
    // Wall + coping
    batch.add(mats.rusticStone, box(wallT, wallH, len, { x, y: wallH / 2, z: zc }), [1, 1, 1]);
    batch.add(mats.trimStone, box(wallT + 0.12, 0.09, len, { x, y: wallH + 0.045, z: zc }), [1.02, 1.0, 0.96]);
    addBoxCollider(x, wallH / 2 + 0.05, zc, wallT / 2, wallH / 2 + 0.05, len / 2, 'stone');
    // Iron railing: two rails, bars every 15 cm with spear tips
    batch.add(mats.iron, box(0.05, 0.05, len, { x, y: railBottom, z: zc }), iron);
    batch.add(mats.iron, box(0.05, 0.05, len, { x, y: railTop, z: zc }), iron);
    const n = Math.floor(len / 0.15);
    for (let k = 0; k <= n; k++) {
      const zb = zc - len / 2 + 0.075 + (k * (len - 0.15)) / Math.max(1, n);
      batch.add(mats.iron, cylinder(0.014, 0.014, railTop - wallH + 0.12, 4, { x, y: wallH + (railTop - wallH + 0.12) / 2, z: zb, open: true }), iron);
      batch.add(mats.iron, cone(0.035, 0.12, 4, { x, y: railTop + 0.14, z: zb }), iron);
    }
    addBoxCollider(x, (wallH + railTop + 0.15) / 2, zc, 0.03, (railTop + 0.15 - wallH) / 2, len / 2, 'metal');
  }

  // Cable poles for the string lights (steel masts bolted behind the pillars, garden side).
  for (const p of LIGHT_POLES) {
    batch.add(mats.zinc, cylinder(0.05, 0.07, p.h, 8, { x: p.x + 0.5, y: p.h / 2, z: p.z }), [0.55, 0.55, 0.55]);
    batch.add(mats.zinc, box(0.6, 0.06, 0.06, { x: p.x + 0.25, y: p.h - 0.15, z: p.z }), [0.55, 0.55, 0.55]);
    batch.add(mats.iron, box(0.16, 0.5, 0.16, { x: p.x + 0.5, y: 0.25, z: p.z }), iron);
    addBoxCollider(p.x + 0.5, p.h / 2, p.z, 0.08, p.h / 2, 0.08, 'metal');
  }
}

function buildGate(ctx, x, z0, z1, h) {
  const { mats, batch } = ctx;
  const iron = [1, 1, 1];
  const opening = z1 - z0 - 0.72;
  const leafW = opening / 2;
  // Each leaf swung ~75° into the garden (+X). Build a leaf in local frame (along ±Z from the hinge) then rotate.
  const leaf = (hingeZ, dir) => {
    const parts = [];
    parts.push([mats.iron, box(0.05, 0.05, leafW, { y: 0.35, z: (dir * leafW) / 2 })]);
    parts.push([mats.iron, box(0.05, 0.05, leafW, { y: h - 0.35, z: (dir * leafW) / 2 })]);
    parts.push([mats.iron, box(0.06, h, 0.06, { y: h / 2, z: dir * (leafW - 0.03) })]);
    parts.push([mats.iron, box(0.06, h, 0.06, { y: h / 2, z: dir * 0.03 })]);
    for (let k = 1; k < leafW / 0.15; k++) {
      parts.push([mats.iron, cylinder(0.014, 0.014, h + 0.1, 4, { y: h / 2 + 0.05, z: dir * k * 0.15, open: true })]);
      parts.push([mats.iron, cone(0.035, 0.12, 4, { y: h + 0.16, z: dir * k * 0.15 })]);
    }
    const swing = dir * 1.3; // radians; rotateY maps local (0,0,z) → (z·sin φ, 0, z·cos φ): +X = garden side
    const m = new THREE.Matrix4().makeRotationY(swing).premultiply(new THREE.Matrix4().makeTranslation(x, 0.12, hingeZ));
    for (const [mat, geo] of parts) {
      geo.applyMatrix4(m);
      batch.add(mat, geo, iron);
    }
    // Collider approximating the swung leaf.
    const mid = new THREE.Vector3(0, 0, (dir * leafW) / 2).applyMatrix4(m);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), swing);
    ctx.game.physics.addStaticBox(new THREE.Vector3(mid.x, h / 2 + 0.12, mid.z), new THREE.Vector3(0.04, h / 2, leafW / 2), q, { surface: 'metal' });
  };
  leaf(z1 - 0.36, -1);
  leaf(z0 + 0.36, 1);
}
