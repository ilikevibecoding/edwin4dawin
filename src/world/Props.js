import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { polygon, prism, ringPrism, sphere, extrudeProfile, cylinder, box, cone } from './geo.js';
import { regularPolygon } from './util.js';
import { STREET_LAMPS, STREETS } from './layout.js';

/**
 * Expected real-world heights (m) for the Poly Haven props; used to sanity-check scale after load.
 * If a model's measured height is off by more than 35% it is rescaled to the expected value.
 * Flat objects (medical box, manhole cover) are omitted: they arrive at real size and a height check
 * would be meaningless for them.
 */
const EXPECTED_HEIGHT = {
  street_lamp_01: 4.0,
  outdoor_table_chair_set_01: 0.85,
  painted_wooden_bench: 0.85,
  potted_plant_02: 0.9,
  planter_pot_clay: 0.45,
  wooden_crate_02: 0.5,
  wooden_barrels_01: 0.9,
  metal_trash_can: 0.85,
  utility_box_01: 1.2,
  shrub_02: 0.8,
  shrub_04: 0.9,
  old_military_crate: 0.45,
  wooden_military_crate: 0.5,
  ammo_box: 0.2,
  metal_jerrycan_green: 0.47,
  cement_bag: 0.2,
  old_tyre: 0.65,
  cardboard_box_01: 0.45,
  plastic_crate_02: 0.35,
  standing_chalkboard_01: 1.1,
  security_light: 0.5,
};

/**
 * Some Poly Haven "models" are whole sets (two trash cans, two barrels plus broken staves). A variant
 * keeps only the meshes whose names match, so we can place single items.
 */
const VARIANTS = {
  barrel_a: { model: 'wooden_barrels_01', nodes: /barrel01$/ },
  barrel_b: { model: 'wooden_barrels_01', nodes: /barrel02$/ },
  trash_can: { model: 'metal_trash_can', nodes: /^metal_trash_can(_lid|_handle_left|_handle_right)?$/ },
  trash_can_rust: { model: 'metal_trash_can', nodes: /^metal_trash_can_rust/ },
};

const triCount = (meshes) => meshes.reduce((n, m) => n + (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3, 0);

/**
 * Shadow proxies. Photoscans are 5–30k triangles each and would be re-rasterised into every shadow
 * cascade; instead the scan stops casting and an invisible low-poly stand-in (same instance matrices,
 * colour/depth writes off) casts a near-identical shadow. Shape is chosen per prop; 'real' keeps the
 * scan as caster where the silhouette is too open for a solid stand-in (café chairs, bench slats).
 */
const SHADOW_PROXY = {
  street_lamp_01: 'lamp',
  outdoor_table_chair_set_01: 'real',
  painted_wooden_bench: 'real',
  standing_chalkboard_01: 'real',
  shrub_02: 'blob',
  shrub_04: 'blob',
  potted_plant_02: 'blob',
  barrel_a: 'cylinder',
  barrel_b: 'cylinder',
  trash_can: 'cylinder',
  trash_can_rust: 'cylinder',
  planter_pot_clay: 'cylinder',
  old_tyre: 'cylinder',
  water_manhole_cover: 'none',
  medical_box: 'none',
  cement_bag: 'none',
  security_light: 'none',
};

let shadowOnlyMat = null;
function shadowOnlyMaterial() {
  // Same recipe as the renderer's view-model proxies: nothing reaches the colour buffer (NeverDepth
  // rejects every fragment) but the depth pre-pass for the cascades still rasterises the geometry.
  if (!shadowOnlyMat) {
    shadowOnlyMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthFunc: THREE.NeverDepth });
    shadowOnlyMat.name = 'PropShadowOnly';
  }
  return shadowOnlyMat;
}

/** Proxy geometry in the glTF's own space (bbox `bb`, extents `size`, centre `c`) so it shares the instance matrices. */
function proxyGeometry(kind, bb, size, c) {
  const parts = [];
  const add = (g, x, y, z) => {
    g.translate(x, y, z);
    parts.push(g);
  };
  const r = Math.max(size.x, size.z) / 2;
  switch (kind) {
    case 'cylinder':
      add(new THREE.CylinderGeometry(r * 0.95, r * 0.95, size.y, 10, 1), c.x, c.y, c.z);
      break;
    case 'blob':
      add(new THREE.SphereGeometry(1, 8, 6).scale(size.x * 0.46, size.y * 0.5, size.z * 0.46), c.x, bb.min.y + size.y * 0.5, c.z);
      break;
    case 'lamp':
      add(new THREE.CylinderGeometry(0.05, 0.09, size.y * 0.86, 6, 1), c.x, bb.min.y + size.y * 0.43, c.z);
      add(new THREE.CylinderGeometry(0.2, 0.2, 0.25, 8, 1), c.x, bb.min.y + 0.125, c.z);
      add(new THREE.BoxGeometry(size.x * 0.75, size.y * 0.16, size.z * 0.75), c.x, bb.max.y - size.y * 0.09, c.z);
      break;
    default:
      add(new THREE.BoxGeometry(size.x, size.y, size.z), c.x, c.y, c.z);
  }
  for (const g of parts) {
    for (const name of Object.keys(g.attributes)) if (name !== 'position') g.deleteAttribute(name);
  }
  return parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
}

/**
 * Collects placements per model, loads each glTF once and emits one InstancedMesh per mesh primitive
 * (all street lamps = 3 draw calls, all shrubs = 1, ...). Every placement still gets its own collider.
 * Placement: { x, y, z, rotY, scale, collider: 'box'|'cylinder'|'none', surface, radius }.
 */
export class ModelPlacer {
  constructor(ctx) {
    this.ctx = ctx;
    this.jobs = new Map();
  }

  add(key, opts) {
    if (!this.jobs.has(key)) this.jobs.set(key, []);
    this.jobs.get(key).push({ y: 0, rotY: 0, scale: null, collider: 'box', surface: 'wood', ...opts });
  }

  async flush() {
    const { game, root } = this.ctx;
    const tasks = [...this.jobs.entries()].map(async ([key, places]) => {
      const variant = VARIANTS[key];
      const id = variant ? variant.model : key;
      let gltf;
      try {
        gltf = await game.assets.loadModel(id);
      } catch (err) {
        console.warn(`[world] prop ${id} failed to load: ${err.message}`);
        return;
      }
      const template = gltf.scene;
      template.updateMatrixWorld(true);
      const meshes = [];
      template.traverse((o) => {
        if (o.isMesh && (!variant || variant.nodes.test(o.name))) meshes.push(o);
      });
      if (!meshes.length) return;
      const bb = new THREE.Box3();
      for (const m of meshes) bb.expandByObject(m);
      const size = bb.getSize(new THREE.Vector3());
      const center = bb.getCenter(new THREE.Vector3());
      const expected = EXPECTED_HEIGHT[id];
      const autoScale = expected && (size.y < expected * 0.65 || size.y > expected * 1.35) ? expected / size.y : 1;
      console.info(
        `[world] prop ${key}: ${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)} m, ${(triCount(meshes) / 1000).toFixed(1)}k tris × ${places.length}` +
          (autoScale !== 1 ? ` → scaled ×${autoScale.toFixed(2)}` : ''),
      );

      const roots = places.map((p) => {
        const s = p.scale || autoScale;
        // Model → world: recenter the footprint on (x, z), base on y, then yaw + scale.
        const m = new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y, p.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.rotY), new THREE.Vector3(s, s, s));
        m.multiply(new THREE.Matrix4().makeTranslation(-center.x, -bb.min.y, -center.z));
        return { m, s, p };
      });

      const proxyKind = SHADOW_PROXY[key] || 'box';
      for (const src of meshes) {
        const inst = new THREE.InstancedMesh(src.geometry, src.material, roots.length);
        inst.name = `Prop:${key}`;
        const mm = new THREE.Matrix4();
        roots.forEach((r, i) => inst.setMatrixAt(i, mm.multiplyMatrices(r.m, src.matrixWorld)));
        inst.instanceMatrix.needsUpdate = true;
        inst.castShadow = proxyKind === 'real';
        inst.receiveShadow = true;
        inst.computeBoundingSphere();
        root.add(inst);
        game.render.setupObject(inst);
      }
      if (proxyKind !== 'real' && proxyKind !== 'none') {
        const proxy = new THREE.InstancedMesh(proxyGeometry(proxyKind, bb, size, center), shadowOnlyMaterial(), roots.length);
        proxy.name = `PropShadow:${key}`;
        roots.forEach((r, i) => proxy.setMatrixAt(i, r.m));
        proxy.instanceMatrix.needsUpdate = true;
        proxy.castShadow = true;
        proxy.receiveShadow = false;
        proxy.userData.noMinimap = true;
        proxy.raycast = () => {};
        proxy.computeBoundingSphere();
        root.add(proxy);
      }

      for (const { s, p } of roots) {
        const cy = p.y + s * (center.y - bb.min.y);
        if (p.collider === 'box') {
          const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.rotY);
          game.physics.addStaticBox(new THREE.Vector3(p.x, cy, p.z), new THREE.Vector3((size.x * s) / 2, (size.y * s) / 2, (size.z * s) / 2), q, { surface: p.surface });
        } else if (p.collider === 'cylinder') {
          const r = p.radius || (Math.max(size.x, size.z) * s) / 2;
          game.physics.addStaticCylinder(new THREE.Vector3(p.x, cy, p.z), r, (size.y * s) / 2, { surface: p.surface });
        }
      }
    });
    await Promise.all(tasks);
    this.jobs.clear();
  }
}

/** Everything placed by hand: furniture, planters, barricades, clutter. */
export async function buildProps(ctx) {
  const { addBoxCollider, rng } = ctx;
  const placer = new ModelPlacer(ctx);
  const P = (id, opts) => placer.add(id, opts);
  const shrubCards = [];

  // Street lamps: three photoscans where the spawn view lands, cheap cast-iron posts elsewhere.
  STREET_LAMPS.forEach((l, i) => {
    if (i < 3) P('street_lamp_01', { x: l.x, z: l.z, rotY: rng.range(0, Math.PI * 2), collider: 'cylinder', radius: 0.22, surface: 'metal' });
    else lampPost(ctx, l.x, l.z, rng.range(0, Math.PI * 2));
  });

  // Café terrace in front of W2 (awning above the shop windows)
  for (let i = 0; i < 4; i++) P('outdoor_table_chair_set_01', { x: -22.3, z: -0.5 + i * 2.6, rotY: rng.range(-0.4, 0.4), surface: 'metal' });
  P('standing_chalkboard_01', { x: -23.0, y: 0.15, z: -2.6, rotY: 0.35 + Math.PI / 2, surface: 'wood' });
  // (potted_plant_02 is a 70k-triangle scan; clay pots + card shrubs read the same from 3 m away.)
  for (const [z, rot] of [[5.6, 0.4], [2.1, 2.0], [9.6, 1.0]]) {
    P('planter_pot_clay', { x: -23.2, y: 0.15, z, rotY: rot, collider: 'cylinder', surface: 'stone' });
    shrubCards.push(...shrub(-23.2, 0.5, z, 0.32, 0.5, rng));
  }

  // Benches near the trees and along the south edge
  P('painted_wooden_bench', { x: -17.6, z: 12.5, rotY: Math.PI / 2, surface: 'wood' });
  P('painted_wooden_bench', { x: -17.8, z: -15.2, rotY: Math.PI / 2, surface: 'wood' });
  P('painted_wooden_bench', { x: -7.5, z: 19.3, rotY: 0, surface: 'wood' });
  P('painted_wooden_bench', { x: 9.5, z: 19.3, rotY: 0, surface: 'wood' });
  P('painted_wooden_bench', { x: 22.2, z: 3.0, rotY: -Math.PI / 2, surface: 'wood' });
  P('painted_wooden_bench', { x: 29.5, z: -12, rotY: Math.PI / 2, surface: 'wood' });

  // Trash cans, utility boxes
  P('trash_can', { x: -22.9, z: 14.2, y: 0.15, collider: 'cylinder', surface: 'metal' });
  P('trash_can_rust', { x: 12.2, z: -14.9, y: 0.15, rotY: 1.2, collider: 'cylinder', surface: 'metal' });
  P('trash_can', { x: -9.6, z: 20.9, y: 0.15, rotY: 0.4, collider: 'cylinder', surface: 'metal' });
  P('trash_can_rust', { x: 24.8, z: -15.2, rotY: 2.6, collider: 'cylinder', surface: 'metal' });
  P('utility_box_01', { x: -23.0, z: -11.4, y: 0.15, rotY: Math.PI / 2, surface: 'metal' });
  P('utility_box_01', { x: 11.6, z: -15.7, y: 0.15, rotY: 0, surface: 'metal' });
  P('utility_box_01', { x: 32.9, z: -5.2, y: 0.15, rotY: -Math.PI / 2, surface: 'metal' });

  // Shopkeeper clutter in the NW alley and behind the café
  P('barrel_a', { x: -11.8, z: -23.0, rotY: 0.7, collider: 'cylinder', surface: 'wood' });
  P('barrel_b', { x: -12.5, z: -22.4, rotY: 1.9, collider: 'cylinder', surface: 'wood' });
  P('barrel_a', { x: -22.6, z: 18.4, rotY: 1.9, collider: 'cylinder', surface: 'wood' });
  P('barrel_b', { x: -23.0, z: 19.2, rotY: 0.3, collider: 'cylinder', surface: 'wood' });
  P('wooden_crate_02', { x: -23.1, z: 16.6, y: 0.15, rotY: 0.2, surface: 'wood' });
  P('plastic_crate_02', { x: -22.9, z: 10.8, y: 0.15, rotY: 0.9, surface: 'metal' });
  P('cardboard_box_01', { x: -11.2, z: -21.2, rotY: 0.3, surface: 'wood' });
  P('plastic_crate_02', { x: -12.6, z: -20.6, rotY: 1.4, surface: 'metal' });
  P('old_tyre', { x: -12.5, z: -25.8, rotY: 0.2, surface: 'metal' });
  P('old_tyre', { x: -11.3, z: -27.2, rotY: 1.1, surface: 'metal' });
  P('cement_bag', { x: -24.3, z: -10.6, y: 0.15, rotY: 0.5, surface: 'dirt' });
  P('cement_bag', { x: -24.1, z: -10.1, y: 0.15, rotY: 1.1, surface: 'dirt' });

  // Military clutter: NE street mouth emplacement, gate post, fountain-side crates, street-end barricades
  // (behind the sandbags, on the raised north sidewalk → y = 0.15)
  P('old_military_crate', { x: 13.0, z: -17.2, y: 0.15, rotY: 0.3, surface: 'wood' });
  P('wooden_military_crate', { x: 15.6, z: -16.9, y: 0.15, rotY: -0.2, surface: 'wood' });
  P('ammo_box', { x: 14.3, z: -18.4, rotY: 0.9, surface: 'metal' });
  P('ammo_box', { x: 14.0, z: -17.4, y: 0.15, rotY: 0.2, surface: 'metal' });
  P('medical_box', { x: 20.9, z: -5.6, rotY: 0.4, surface: 'metal' });
  P('metal_jerrycan_green', { x: 21.3, z: -3.1, rotY: 1.3, surface: 'metal' });
  P('metal_jerrycan_green', { x: 21.7, z: -3.4, rotY: 0.6, surface: 'metal' });
  P('old_military_crate', { x: -8.2, z: -13.4, rotY: 1.2, surface: 'wood' });
  P('wooden_military_crate', { x: -7.3, z: -12.2, rotY: 0.4, surface: 'wood' });
  P('ammo_box', { x: -6.6, z: -13.2, rotY: 2.2, surface: 'metal' });
  P('wooden_crate_02', { x: 14.9, z: -38.5, rotY: 0.4, surface: 'wood' });
  P('wooden_crate_02', { x: 1.2, z: 43.6, rotY: 0.1, surface: 'wood' });

  // Manhole covers
  for (const [x, z] of [[3, 16.5], [10, -8]]) P('water_manhole_cover', { x, z, rotY: rng.range(0, 3), collider: 'none' });

  // Wall-mounted security lights (E1 facade faces -X at x = 34; N4 faces +Z at z = -18).
  P('security_light', { x: 33.85, y: 4.3, z: -15, rotY: -Math.PI / 2, collider: 'none' });
  P('security_light', { x: 22.5, y: 4.3, z: -17.85, rotY: 0, collider: 'none' });

  // Shrubs: rectangular planters along the plaza edges; photoscans in the ones the spawn view sees,
  // procedural leaf-card shrubs elsewhere (a scanned shrub is 27k triangles).
  const planterSpots = [
    [-8.5, -14.6, 0, true], [3.5, -14.6, 0, true], [-12.5, 20.6, 0, false], [7.0, 20.6, 0, false],
    [15.6, 14.0, Math.PI / 2, false], [15.6, 2.0, Math.PI / 2, true], [-23.3, -13.0, Math.PI / 2, false], [-23.3, 21.0, Math.PI / 2, false],
  ];
  for (const [x, z, rot, scanned] of planterSpots) {
    rectPlanter(ctx, x, z, rot, 2.6, 0.85, 0.6);
    const a = [x + (rot ? 0 : -0.6), z + (rot ? -0.6 : 0)];
    const b = [x + (rot ? 0 : 0.6), z + (rot ? 0.6 : 0)];
    if (scanned) {
      P(rng.chance(0.5) ? 'shrub_02' : 'shrub_04', { x: a[0], z: a[1], y: 0.5, rotY: rng.range(0, 6), collider: 'none' });
      shrubCards.push(...shrub(b[0], 0.5, b[1], 0.5, 0.75, rng));
    } else {
      shrubCards.push(...shrub(a[0], 0.5, a[1], 0.5, 0.8, rng), ...shrub(b[0], 0.5, b[1], 0.45, 0.7, rng));
    }
  }
  for (const [x, z, scanned] of [[21, 12, true], [23.5, 19, false], [30, 18.5, false], [21.5, -11, false], [31, -15, false], [26, -16, false]]) {
    if (scanned) P(rng.chance(0.5) ? 'shrub_02' : 'shrub_04', { x, z, y: 0.02, rotY: rng.range(0, 6), collider: 'none' });
    else shrubCards.push(...shrub(x, 0.02, z, rng.range(0.6, 0.85), rng.range(0.9, 1.3), rng));
  }
  buildShrubCards(ctx, shrubCards);

  // Sandbag emplacements (instanced) and jersey barriers (generated)
  const sandbags = [];
  sandbagWall(sandbags, 12.3, -15.2, 15.6, -15.2, 3, rng);
  sandbagWall(sandbags, 12.3, -15.2, 12.3, -18.4, 3, rng);
  sandbagWall(sandbags, 20.2, -5.2, 20.2, -2.2, 3, rng);
  sandbagWall(sandbags, 13.6, -40.0, 16.4, -40.0, 2, rng);
  buildSandbags(ctx, sandbags);
  addBoxCollider(13.95, 0.45, -15.2, 1.8, 0.45, 0.3, 'dirt');
  addBoxCollider(12.3, 0.45, -16.8, 0.3, 0.45, 1.7, 'dirt');
  addBoxCollider(20.2, 0.45, -3.7, 0.3, 0.45, 1.6, 'dirt');
  addBoxCollider(15.0, 0.3, -40.0, 1.5, 0.3, 0.3, 'dirt');

  for (const s of STREETS) {
    // Two barriers across the street end (leaving a visual gap), a third one askew.
    if (s.axis === 'z') {
      const zEnd = s.z0 < 0 ? s.z0 + 1.6 : s.z1 - 1.6;
      const xc = (s.x0 + s.x1) / 2;
      jerseyBarrier(ctx, xc - 1.2, zEnd, Math.PI / 2 + 0.05);
      jerseyBarrier(ctx, xc + 1.2, zEnd, Math.PI / 2 - 0.08);
    } else {
      const xEnd = s.x0 < 0 ? s.x0 + 1.6 : s.x1 - 1.6;
      const zc = (s.z0 + s.z1) / 2;
      jerseyBarrier(ctx, xEnd, zc - 1.2, 0.05);
      jerseyBarrier(ctx, xEnd, zc + 1.2, -0.07);
    }
  }
  jerseyBarrier(ctx, -24.3, -3.2, 0.25);
  jerseyBarrier(ctx, 8.6, 20.2, 1.35);

  await placer.flush();
}

/** Rectangular dressed-stone planter with soil. */
function rectPlanter(ctx, x, z, rot, len, wid, h) {
  const { mats, batch } = ctx;
  const cs = Math.cos(rot);
  const sn = Math.sin(rot);
  const pts = [[-len / 2, -wid / 2], [len / 2, -wid / 2], [len / 2, wid / 2], [-len / 2, wid / 2]].map(([px, pz]) => [x + px * cs - pz * sn, z + px * sn + pz * cs]);
  const inner = [[-len / 2 + 0.12, -wid / 2 + 0.12], [len / 2 - 0.12, -wid / 2 + 0.12], [len / 2 - 0.12, wid / 2 - 0.12], [-len / 2 + 0.12, wid / 2 - 0.12]].map(([px, pz]) => [x + px * cs - pz * sn, z + px * sn + pz * cs]);
  batch.add(mats.trimStone, ringPrism(pts, inner, 0, h), [0.98, 0.96, 0.92]);
  batch.add(mats.dirt, polygon(inner, [], h - 0.12), [0.8, 0.75, 0.68]);
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot);
  ctx.game.physics.addStaticBox(new THREE.Vector3(x, h / 2, z), new THREE.Vector3(len / 2, h / 2, wid / 2), q, { surface: 'stone' });
}

/** Octagonal stone planter (used around plaza trees). */
export function octPlanter(ctx, x, z, r, h) {
  const { mats, batch } = ctx;
  const outer = regularPolygon(x, z, r, 8, Math.PI / 8);
  const inner = regularPolygon(x, z, r - 0.3, 8, Math.PI / 8);
  batch.add(mats.sandstone, ringPrism(outer, inner, 0, h - 0.08, { top: false }), [1, 1, 1]);
  batch.add(mats.trimStone, ringPrism(regularPolygon(x, z, r + 0.06, 8, Math.PI / 8), regularPolygon(x, z, r - 0.34, 8, Math.PI / 8), h - 0.08, h), [1.02, 1.0, 0.96]);
  batch.add(mats.dirt, polygon(inner, [], h - 0.14), [0.8, 0.75, 0.68]);
  ctx.game.physics.addStaticMesh(new THREE.Mesh(prism(outer, 0, h, { top: true })), { surface: 'stone' });
}

/**
 * Cast-iron lamp post (~4.5 m): octagonal plinth, tapered fluted column with collars, four-sided
 * lantern with emissive glass and a pyramid cap. ~350 triangles vs 30k for the photoscan.
 */
function lampPost(ctx, x, z, rot) {
  const { mats, batch, game } = ctx;
  const iron = [0.9, 0.9, 0.92];
  const at = (g) => {
    g.rotateY(rot);
    g.translate(x, 0, z);
    return g;
  };
  batch.add(mats.iron, at(cylinder(0.2, 0.25, 0.45, 8, { y: 0.225 })), iron);
  batch.add(mats.iron, at(cylinder(0.12, 0.2, 0.28, 8, { y: 0.59 })), iron);
  batch.add(mats.iron, at(cylinder(0.055, 0.09, 2.95, 10, { y: 2.2, open: true })), iron);
  batch.add(mats.iron, at(cylinder(0.1, 0.1, 0.07, 10, { y: 1.25 })), iron);
  batch.add(mats.iron, at(cylinder(0.1, 0.075, 0.1, 10, { y: 3.65 })), iron);
  batch.add(mats.iron, at(box(0.44, 0.05, 0.44, { y: 3.72 })), iron);
  for (const [dx, dz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) batch.add(mats.iron, at(box(0.035, 0.55, 0.035, { x: dx, y: 4.0, z: dz })), iron);
  batch.add(mats.lampGlass, at(box(0.36, 0.5, 0.36, { y: 4.0 })), null);
  batch.add(mats.iron, at(cone(0.34, 0.26, 4, { y: 4.4, rotY: Math.PI / 4 })), iron);
  batch.add(mats.iron, at(sphere(0.05, { y: 4.56, seg: 8 })), iron);
  game.physics.addStaticCylinder(new THREE.Vector3(x, 2.3, z), 0.25, 2.3, { surface: 'metal' });
}

/** Leaf-card shrub: an ellipsoid shell of alpha-tested cards. Returns card descriptors. */
function shrub(x, y, z, r, h, rng) {
  const cards = [];
  const n = Math.round(14 + r * 18);
  for (let i = 0; i < n; i++) {
    const u = rng.range(0, Math.PI * 2);
    const v = rng.range(-0.55, 1);
    const sv = Math.sqrt(1 - v * v);
    const k = rng.range(0.55, 1.0);
    cards.push({
      x: x + Math.cos(u) * sv * r * k,
      y: y + (h / 2) * (1 + v * k) * 0.95,
      z: z + Math.sin(u) * sv * r * k,
      size: rng.range(0.7, 1.1) * Math.max(0.45, r * 1.3),
      rot: [rng.range(-0.5, 0.5), rng.range(0, Math.PI * 2), rng.range(-0.4, 0.4)],
    });
  }
  return cards;
}

function buildShrubCards(ctx, cards) {
  const { mats, root } = ctx;
  if (!cards.length) return;
  const geo = new THREE.PlaneGeometry(1, 1);
  const mesh = new THREE.InstancedMesh(geo, mats.ivy, cards.length);
  mesh.name = 'Shrubs';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  cards.forEach((c, i) => {
    e.set(c.rot[0], c.rot[1], c.rot[2]);
    q.setFromEuler(e);
    p.set(c.x, c.y, c.z);
    s.set(c.size, c.size, 1);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: mats.ivy.map, alphaTest: 0.5, side: THREE.DoubleSide });
  root.add(mesh);
}

/** Lay sandbags between two points in `rows` staggered courses. */
function sandbagWall(out, x0, z0, x1, z1, rows, rng) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const dx = (x1 - x0) / len;
  const dz = (z1 - z0) / len;
  const bagL = 0.62;
  const yaw = Math.atan2(dx, dz);
  for (let r = 0; r < rows; r++) {
    const n = Math.floor(len / bagL);
    const offset = (r % 2) * bagL * 0.5 + 0.3;
    for (let i = 0; i < n; i++) {
      const t = offset + i * bagL;
      if (t > len - 0.2) break;
      out.push({
        x: x0 + dx * t + rng.range(-0.02, 0.02),
        y: 0.11 + r * 0.2,
        z: z0 + dz * t + rng.range(-0.02, 0.02),
        yaw: yaw + rng.range(-0.12, 0.12) + Math.PI / 2,
        scale: rng.range(0.94, 1.06),
      });
    }
  }
}

function buildSandbags(ctx, bags) {
  const { mats, root } = ctx;
  if (!bags.length) return;
  const geo = sphere(0.5, { sx: 0.64, sy: 0.24, sz: 0.4, seg: 10 });
  const mesh = new THREE.InstancedMesh(geo, mats.burlap, bags.length);
  mesh.name = 'Sandbags';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  bags.forEach((b, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.yaw);
    s.set(b.scale, b.scale, b.scale);
    p.set(b.x, b.y, b.z);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  root.add(mesh);
}

/** Concrete jersey barrier (2 m). */
function jerseyBarrier(ctx, x, z, rot) {
  const { mats, batch } = ctx;
  const profile = [[-0.4, 0], [0.4, 0], [0.4, 0.08], [0.16, 0.34], [0.12, 0.82], [-0.12, 0.82], [-0.16, 0.34], [-0.4, 0.08]];
  const g = extrudeProfile(profile, 2.0, { x, y: 0.0, z, rotY: rot });
  batch.add(mats.concrete, g, [0.9, 0.88, 0.85]);
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot);
  ctx.game.physics.addStaticBox(new THREE.Vector3(x, 0.41, z), new THREE.Vector3(0.4, 0.41, 1.0), q, { surface: 'stone' });
}
