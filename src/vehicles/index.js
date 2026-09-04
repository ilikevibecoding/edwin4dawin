import * as THREE from 'three';
import { FleetBuckets, VehicleKit } from './kit.js';
import { fleetMaterials, setFleetLights } from './materials.js';
import { KINDS } from './kinds.js';
import { DETAIL } from './parts.js';
import { variant } from './wear.js';

// ---------------------------------------------------------------------------
// The campground fleet: expedition trucks, open safari jeeps, off-road SUVs,
// pickups, ranger vehicles, camp utility vehicles, supply trucks, overland
// campers, trailers, and a motorcycle or two. Distinct silhouettes, not clones —
// paint, age, accessories, tyres, roof gear, glass, damage, dust, mud, rust and
// purpose all vary — built from one shared material set and merged per material
// across the whole camp so draw calls stay bounded.
//
// Contract:
//   createFleet({ env, quality, placements, terrain }) -> {
//     group,
//     vehicles: [{ root, kind, name }],
//     update(dt, t),               // canvas flap, aerial sway, idle lights
//     setLights(on) / setTimeOfDay(name),
//     stats: { vehicles, calls, tris },
//   }
//
// `placements` come from the campground: [{ x, z, heading, kind }], already on
// terrain.heightAt(). A vehicle sits with its wheels on the ground the way the
// hero truck does — sample the contact patches and fit the body to them.
// ---------------------------------------------------------------------------

const TIER = {
  fast: { extras: 0, tentOpen: false, popUp: false, slideOut: false, canvas: true, awning: false },
  medium: { extras: 0, tentOpen: false, popUp: true, slideOut: true, canvas: true, awning: true },
  high: { extras: 0, tentOpen: true, popUp: true, slideOut: true, canvas: true, awning: true },
  ultra: { extras: 1, tentOpen: true, popUp: true, slideOut: true, canvas: true, awning: true },
};

/**
 * The camp's own frame, as the campground lays it out: a clearing on the right
 * of the mainline at t = 0.6, 34 m off the centreline, u along the road and v
 * into the camp. Used for the fallback row and for the extra vehicles ultra adds.
 */
function campFrame(terrain) {
  if (!terrain?.mainPoint) return null;
  const p = terrain.mainPoint(0.6);
  const tan = terrain.mainTangent(0.6);
  const lx = -tan.z;
  const lz = tan.x;
  const side = -1;
  const ax = p.x + lx * 34 * side;
  const az = p.z + lz * 34 * side;
  // "into the camp" (+v) is away from the road, i.e. the anchor's side of it
  const into = { x: lx * side, z: lz * side };
  return {
    toWorld: (u, v) => ({ x: ax + tan.x * u + into.x * v, z: az + tan.z * u + into.z * v }),
    heading: (du, dv) => Math.atan2(tan.x * du + into.x * dv, tan.z * du + into.z * dv),
  };
}

/** The campground's parking plan, for when its module has not produced it yet. */
const FALLBACK_ROW = [
  { u: -23.5, v: -12.6, heading: [1, 0.02], kind: 'supply-truck' },
  { u: -15.5, v: -10.6, heading: [0.05, 1], kind: 'expedition-truck' },
  { u: -10.8, v: -10.2, heading: [-0.08, 1], kind: 'safari-jeep' },
  { u: -6.8, v: -10.4, heading: [0.04, 1], kind: 'safari-jeep' },
  { u: -2.6, v: -10.2, heading: [0.1, 1], kind: 'suv' },
  { u: 1.6, v: -10.5, heading: [-0.05, 1], kind: 'pickup' },
  { u: 5.8, v: -10.3, heading: [0.06, 1], kind: 'safari-jeep' },
  { u: 10.0, v: -10.4, heading: [0.0, 1], kind: 'utility' },
  { u: 14.6, v: -9.4, heading: [0.04, -1], kind: 'ranger' },
  { u: 21.5, v: -12.4, heading: [1, -0.03], kind: 'camper' },
  { u: 26.5, v: -8.6, heading: [0.12, 1], kind: 'trailer' },
  { u: 15.2, v: -4.6, heading: [0.5, -1], kind: 'motorcycle' },
];

/** Ultra's second row: small stuff between the lane and the fence, two more at the row ends. */
const EXTRA_ROW = [
  { u: 7.4, v: -20.2, heading: [0.05, -1], kind: 'quad' },
  { u: 11.6, v: -20.4, heading: [0.4, -1], kind: 'motorcycle' },
  { u: 31.8, v: -12.6, heading: [1, 0.05], kind: 'suv' },
  { u: -31.0, v: -12.2, heading: [1, 0.02], kind: 'pickup' },
];

function resolve(list, frame) {
  const out = [];
  for (const p of list) {
    if (!frame) break;
    const w = frame.toWorld(p.u, p.v);
    out.push({ x: w.x, z: w.z, heading: frame.heading(p.heading[0], p.heading[1]), kind: p.kind });
  }
  return out;
}

const _up = new THREE.Vector3(0, 1, 0);
const _n = new THREE.Vector3();
const _q = new THREE.Quaternion();

/**
 * Sit a vehicle on the ground: sample the terrain under each contact patch in
 * world space, fit a least-squares plane, and build the world matrix the same
 * way drive.js does for the hero (tilt to the plane, then yaw).
 */
function groundFit(terrain, { x, z, heading }, contacts) {
  const sh = Math.sin(heading);
  const ch = Math.cos(heading);
  const pts = contacts.map((c) => {
    const wx = x + c.x * ch + c.z * sh;
    const wz = z - c.x * sh + c.z * ch;
    return { wx, wz, y: terrain ? terrain.heightAt(wx, wz) : 0 };
  });
  const mean = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  let sxx = 0;
  let szz = 0;
  let sxz = 0;
  let sxh = 0;
  let szh = 0;
  for (const p of pts) {
    const dx = p.wx - x;
    const dz = p.wz - z;
    const dh = p.y - mean;
    sxx += dx * dx;
    szz += dz * dz;
    sxz += dx * dz;
    sxh += dx * dh;
    szh += dz * dh;
  }
  const det = sxx * szz - sxz * sxz;
  let gx = 0;
  let gz = 0;
  if (Math.abs(det) > 1e-6) {
    gx = (sxh * szz - szh * sxz) / det;
    gz = (szh * sxx - sxh * sxz) / det;
  }
  return { y: mean, gx, gz };
}

export function createFleet({ env = null, quality: sceneQuality = 'high', placements = [], terrain = null } = {}) {
  const group = new THREE.Group();
  group.name = 'fleet';
  // `?fleet=high` lets the capture harness judge the full fleet inside a fast scene
  const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
  const quality = params && TIER[params.get('fleet')] ? params.get('fleet') : sceneQuality;
  const tier = TIER[quality] ?? TIER.high;
  DETAIL.lite = quality === 'fast';
  const materials = fleetMaterials(env);
  const frame = campFrame(terrain);

  // --- where everything goes -------------------------------------------------
  let slots = (placements || [])
    .filter((p) => p && typeof p.heading === 'number' && KINDS[p.kind])
    .map((p) => ({ x: p.x, z: p.z, heading: p.heading, kind: p.kind }));
  if (!slots.length) slots = resolve(FALLBACK_ROW, frame);
  if (tier.extras) slots = slots.concat(resolve(EXTRA_ROW, frame));

  // site grading: low ground collects mud, the row ends see the most traffic
  const heights = slots.map((s) => (terrain ? terrain.heightAt(s.x, s.z) : 0));
  const hMin = Math.min(...heights);
  const hMax = Math.max(...heights);
  const cx = slots.reduce((s, p) => s + p.x, 0) / slots.length;
  const cz = slots.reduce((s, p) => s + p.z, 0) / slots.length;
  const spread = Math.max(1, ...slots.map((p) => Math.hypot(p.x - cx, p.z - cz)));

  // --- variants, then the fleet-wide calls -------------------------------------
  const ordinals = {};
  const variants = slots.map((s, i) => {
    const ordinal = ordinals[s.kind] ?? 0;
    ordinals[s.kind] = ordinal + 1;
    const low = hMax > hMin + 1e-3 ? 1 - (heights[i] - hMin) / (hMax - hMin) : 0.5;
    const edge = Math.hypot(s.x - cx, s.z - cz) / spread;
    return variant(s.kind, { slot: i, ordinal, site: { low, edge }, seed: 3 });
  });
  // About a third are left with their lights on at night, never the trailer;
  // exactly one pane in the camp is cracked, on something old.
  const lit = new Set();
  for (const [i, v] of variants.entries()) if (v.kind !== 'trailer' && v.kind !== 'quad' && v.rnd() < 0.38) lit.add(i);
  if (!lit.size && variants.length) lit.add(0);
  const oldest = variants.filter((v) => v.kind !== 'trailer' && v.kind !== 'quad').sort((a, b) => b.age - a.age)[0];
  if (oldest) oldest.brokenPane = true;

  // --- build ----------------------------------------------------------------
  const buckets = new FleetBuckets();
  const vehicles = [];
  for (const [i, s] of slots.entries()) {
    const v = variants[i];
    v.lightsOn = lit.has(i);
    const name = `${s.kind}_${v.ordinal}`;
    const k = new VehicleKit(name, { wheels: [], track: 0.8, dust: v.dust, mud: v.mud });
    const o = {
      quality,
      lightsOn: v.lightsOn,
      tentOpen: tier.tentOpen && v.chance(0.7),
      popUp: tier.popUp,
      slideOut: tier.slideOut,
      awningOpen: tier.awning,
      canvas: tier.canvas ? v.chance(0.85) : false,
      hitched: false,
    };
    const built = KINDS[s.kind](k, v, o);
    k.spec.wheels = built.wheels;
    k.spec.track = built.track;

    const heading = s.heading + v.heading;
    const fit = groundFit(terrain, { x: s.x, z: s.z, heading }, built.wheels);
    const root = new THREE.Group();
    root.name = name;
    root.position.set(s.x, fit.y, s.z);
    _n.set(-fit.gx, 1, -fit.gz).normalize();
    _q.setFromUnitVectors(_up, _n);
    root.quaternion.copy(_q);
    root.rotateY(heading);
    if (built.roll) root.rotateZ(built.roll);
    root.updateMatrixWorld(true);

    k.finish(root.matrixWorld, buckets, materials, { root });
    group.add(root);
    vehicles.push({ root, kind: s.kind, name, variant: v, lit: v.lightsOn, length: built.length, height: built.height, heading, wheels: built.wheels });
  }
  const calls = buckets.build(materials, group);
  let panes = 0;
  group.traverse((o) => {
    if (o.isMesh && o.material?.userData?.sortPieces) panes++;
  });

  // --- lights --------------------------------------------------------------
  let lightsOn = false;
  const setLights = (on) => {
    lightsOn = !!on;
    setFleetLights(materials, lightsOn);
  };
  setLights(params && params.get('time') && params.get('time') !== 'day');

  const sway = Object.values(materials).filter((m) => m?.userData?.sway).map((m) => m.userData.sway.uFleetTime);

  return {
    group,
    vehicles,
    env,
    quality,
    placements: slots,
    terrain,
    update(dt, t) {
      for (const u of sway) u.value = t;
      // Follow the hero's day/night switch until main.js routes it to us directly.
      const api = typeof window !== 'undefined' ? window.debugAPI : null;
      if (api && typeof api.timeOfDay === 'string') {
        const on = api.timeOfDay !== 'day';
        if (on !== lightsOn) setLights(on);
      }
    },
    setLights,
    setTimeOfDay(name) {
      setLights(name !== 'day');
    },
    stats: { vehicles: vehicles.length, calls: calls + panes, merged: calls, panes, tris: Math.round(buckets.tris), lit: lit.size },
  };
}
