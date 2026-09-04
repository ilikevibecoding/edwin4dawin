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
  const n = pts.length;
  // centred on the contacts' own centroid: a trailer's patches are all behind
  // its origin, and a fit about the origin under-reads the slope there
  const mx = pts.reduce((s, p) => s + p.wx, 0) / n;
  const mz = pts.reduce((s, p) => s + p.wz, 0) / n;
  const mean = pts.reduce((s, p) => s + p.y, 0) / n;
  let sxx = 0;
  let szz = 0;
  let sxz = 0;
  let sxh = 0;
  let szh = 0;
  for (const p of pts) {
    const dx = p.wx - mx;
    const dz = p.wz - mz;
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
  } else if (sxx + szz > 1e-6) {
    // contacts in a line (a motorcycle): slope along that line only
    const ang = 0.5 * Math.atan2(2 * sxz, sxx - szz);
    const ux = Math.cos(ang);
    const uz = Math.sin(ang);
    let suu = 0;
    let suh = 0;
    for (const p of pts) {
      const d = (p.wx - mx) * ux + (p.wz - mz) * uz;
      suu += d * d;
      suh += d * (p.y - mean);
    }
    const g = suu > 1e-6 ? suh / suu : 0;
    gx = g * ux;
    gz = g * uz;
  }
  let residual = 0;
  for (const p of pts) residual = Math.max(residual, Math.abs(p.y - (mean + gx * (p.wx - mx) + gz * (p.wz - mz))));
  return { y: mean + gx * (x - mx) + gz * (z - mz), gx, gz, residual };
}

/** Unit vector along the parking row: the principal axis of the slot positions. */
function principalAxis(slots) {
  if (slots.length < 2) return { x: 1, z: 0 };
  const cx = slots.reduce((s, p) => s + p.x, 0) / slots.length;
  const cz = slots.reduce((s, p) => s + p.z, 0) / slots.length;
  let sxx = 0;
  let szz = 0;
  let sxz = 0;
  for (const p of slots) {
    const dx = p.x - cx;
    const dz = p.z - cz;
    sxx += dx * dx;
    szz += dz * dz;
    sxz += dx * dz;
  }
  const ang = 0.5 * Math.atan2(2 * sxz, sxx - szz);
  return { x: Math.cos(ang), z: Math.sin(ang) };
}

/** Plan footprint of a built vehicle in its own space: half-width and the z extent. */
function footprint(built) {
  return { hw: (built.track || 0.8) + 0.5, z0: built.length[0], z1: built.length[1] };
}

/** Do two placed footprints overlap in plan, with `margin` between them? Separating-axis test on the two boxes' axes. */
function overlaps(a, b, margin = 0.3) {
  const corners = (p) => {
    const sh = Math.sin(p.heading);
    const ch = Math.cos(p.heading);
    const out = [];
    for (const [lx, lz] of [[-p.fp.hw, p.fp.z0], [p.fp.hw, p.fp.z0], [p.fp.hw, p.fp.z1], [-p.fp.hw, p.fp.z1]]) {
      out.push([p.x + lx * ch + lz * sh, p.z - lx * sh + lz * ch]);
    }
    return out;
  };
  const ca = corners(a);
  const cb = corners(b);
  const axes = [];
  for (const p of [a, b]) {
    axes.push([Math.cos(p.heading), -Math.sin(p.heading)]);
    axes.push([Math.sin(p.heading), Math.cos(p.heading)]);
  }
  for (const [ax, az] of axes) {
    const proj = (cs) => {
      let lo = Infinity;
      let hi = -Infinity;
      for (const [x, z] of cs) {
        const d = x * ax + z * az;
        lo = Math.min(lo, d);
        hi = Math.max(hi, d);
      }
      return [lo, hi];
    };
    const [a0, a1] = proj(ca);
    const [b0, b1] = proj(cb);
    if (a1 + margin < b0 || b1 + margin < a0) return false;
  }
  return true;
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
  // Lamps at night, for a camp where everyone has gone to bed: one vehicle
  // still arriving with its headlamps on, one left with its parking lamps on,
  // and a light in the camper somebody is living in. Everything else dark.
  const firstOf = (...kinds) => {
    for (const kind of kinds) {
      const i = variants.findIndex((v) => v.kind === kind);
      if (i >= 0) return i;
    }
    return -1;
  };
  const arriving = firstOf('pickup', 'suv', 'safari-jeep');
  const markers = firstOf('supply-truck', 'utility', 'expedition-truck');
  const cabin = firstOf('camper', 'expedition-truck');
  const lit = new Set([arriving, markers, cabin].filter((i) => i >= 0));
  // exactly one pane in the camp is cracked, on something old
  const oldest = variants.filter((v) => v.kind !== 'trailer' && v.kind !== 'quad').sort((a, b) => b.age - a.age)[0];
  if (oldest) oldest.brokenPane = true;

  // --- build, in vehicle space ------------------------------------------------
  const kits = slots.map((s, i) => {
    const v = variants[i];
    v.lightsOn = i === arriving;
    const name = `${s.kind}_${v.ordinal}`;
    const k = new VehicleKit(name, { wheels: [], track: 0.8, dust: v.dust, mud: v.mud });
    const o = {
      quality,
      lightsOn: i === arriving,
      markers: i === markers,
      cabin: i === cabin,
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
    return { k, v, s, name, built };
  });

  // --- composition: nobody parks square ------------------------------------------
  // Each vehicle takes its own yaw and a pull-in / sideways offset from its
  // variant, and a few of the nose-in ones are backed in. Anything that would
  // clip a neighbour is trimmed back toward the slot as given. The row's axis
  // is the principal axis of the slots, so "nose-in" is relative to the row.
  const rowAxis = principalAxis(slots);
  const places = kits.map(({ s, v, built }, i) => {
    const noseIn = Math.abs(Math.sin(s.heading) * rowAxis.x + Math.cos(s.heading) * rowAxis.z) < 0.5;
    const flip = noseIn && i !== arriving && s.kind !== 'trailer' && s.kind !== 'motorcycle' && v.rnd() < 0.3;
    return { x: s.x, z: s.z, heading: s.heading + (flip ? Math.PI : 0), yaw: v.heading, along: v.slotAlong, across: v.slotAcross, fp: footprint(built), flip };
  });
  for (let i = 0; i < places.length; i++) {
    const p = places[i];
    const s = kits[i].s;
    for (const f of [1, 0.66, 0.33, 0]) {
      const h = p.heading + p.yaw * f;
      const dx = Math.sin(p.heading) * p.along * f + Math.cos(p.heading) * p.across * f;
      const dz = Math.cos(p.heading) * p.along * f - Math.sin(p.heading) * p.across * f;
      const cand = { ...p, x: s.x + dx, z: s.z + dz, heading: h };
      if (f === 0 || !places.some((q, j) => j !== i && overlaps(cand, q, 0.35))) {
        Object.assign(p, { x: cand.x, z: cand.z, heading: h });
        break;
      }
    }
  }

  // --- settle: a vehicle is parked where it is level -------------------------------
  // The fit through the contact patches tells how far off level a slot is. Past
  // a hand's width of residual or a few degrees of tilt the vehicle looks for
  // flatter ground within a few metres of its slot, nearest first, never onto a
  // neighbour. (The east end of the pad drops 1.7 m over four metres: the
  // trailer's slot is on that bank.)
  for (let i = 0; i < places.length; i++) {
    const p = places[i];
    const { built } = kits[i];
    const score = (x, z) => {
      const fit = groundFit(terrain, { x, z, heading: p.heading }, built.wheels);
      return { fit, bad: Math.hypot(fit.gx, fit.gz) * 3 + fit.residual * 6 };
    };
    let best = { x: p.x, z: p.z, ...score(p.x, p.z) };
    if (best.fit.residual > 0.12 || Math.hypot(best.fit.gx, best.fit.gz) > 0.1) {
      for (const ring of [1, 2, 3, 4, 5]) {
        for (let d = 0; d < 12; d++) {
          const a = (d / 12) * Math.PI * 2;
          const x = p.x + Math.cos(a) * ring;
          const z = p.z + Math.sin(a) * ring;
          const cand = { ...p, x, z };
          if (places.some((q, j) => j !== i && overlaps(cand, q, 0.35))) continue;
          const sc = score(x, z);
          if (sc.bad < best.bad) best = { x, z, ...sc };
        }
        if (best.fit.residual < 0.06 && Math.hypot(best.fit.gx, best.fit.gz) < 0.06) break;
      }
      p.x = best.x;
      p.z = best.z;
      p.moved = Math.hypot(best.x - kits[i].s.x, best.z - kits[i].s.z);
    }
  }

  // --- fit, then hand off ---------------------------------------------------
  const buckets = new FleetBuckets();
  const vehicles = [];
  for (const [i, { k, v, s, name, built }] of kits.entries()) {
    const p = places[i];
    const heading = p.heading;
    const fit = groundFit(terrain, { x: p.x, z: p.z, heading }, built.wheels);
    // a trailer on its jockey stand sits within a few degrees of level
    // whatever the ground does under the stand; the stand takes the difference
    if (built.maxPitch !== undefined) {
      const sh = Math.sin(heading);
      const ch = Math.cos(heading);
      const along = fit.gx * sh + fit.gz * ch;
      const across = fit.gx * ch - fit.gz * sh;
      const clamped = Math.max(-built.maxPitch, Math.min(built.maxPitch, along));
      fit.gx = clamped * sh + across * ch;
      fit.gz = clamped * ch - across * sh;
    }
    // each contact meets the terrain under it: the residual against the fitted
    // plane becomes suspension travel (or the jockey post winding down)
    k.drops = k.contacts.map((c) => {
      const sh = Math.sin(heading);
      const ch = Math.cos(heading);
      const wx = p.x + c.x * ch + c.z * sh;
      const wz = p.z - c.x * sh + c.z * ch;
      const plane = fit.y + fit.gx * (wx - p.x) + fit.gz * (wz - p.z);
      const ground = terrain ? terrain.heightAt(wx, wz) : 0;
      return Math.max(-c.travel, Math.min(c.travel, ground - plane));
    });
    const root = new THREE.Group();
    root.name = name;
    root.position.set(p.x, fit.y, p.z);
    _n.set(-fit.gx, 1, -fit.gz).normalize();
    _q.setFromUnitVectors(_up, _n);
    root.quaternion.copy(_q);
    root.rotateY(heading);
    if (built.roll) root.rotateZ(built.roll);
    root.updateMatrixWorld(true);

    k.finish(root.matrixWorld, buckets, materials, { root });
    group.add(root);
    vehicles.push({
      root,
      kind: s.kind,
      name,
      variant: v,
      lit: lit.has(i),
      lamps: { head: i === arriving, markers: i === markers, cabin: i === cabin },
      length: built.length,
      height: built.height,
      heading,
      wheels: built.wheels,
      footprint: p.fp,
      slot: { x: s.x, z: s.z, heading: s.heading, moved: p.moved || 0, flipped: p.flip },
      drops: k.drops.slice(),
    });
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
