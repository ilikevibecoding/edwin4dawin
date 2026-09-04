import * as THREE from 'three';
import { WORLD, anchorPoint } from '../world.js';
import { createFrame, rng } from './frame.js';
import { campMaterials } from './materials.js';
import { buildPlan } from './layout.js';
import { Kit } from './kit.js';
import { kitchenShelter, messTent, ridgeTent, safariTent } from './tents.js';
import {
  bomaLine,
  cabin,
  fenceLine,
  firePit,
  flagPole,
  fuelStore,
  gate,
  latrineBlock,
  laundryLine,
  lookout,
  noticeBoard,
  radioMast,
  signPost,
  solarArray,
  storeHut,
  waterTank,
} from './structures.js';
import * as P from './props.js';
import { bareAt, buildGroundWear, clearingMask } from './ground.js';
import { createFire } from './fire.js';
import { createCampLights } from './lights.js';

// ---------------------------------------------------------------------------
// The safari campground: a graded clearing beside the mainline with tents,
// shelters, a ranger cabin, cooking and fire, water and fuel, power, radio,
// signage, fencing, a lookout, and the ground wear of people living there.
//
// Contract:
//   createCampground({ terrain, env, quality }) -> {
//     group,                       // add to the scene
//     update(dt, t, ctx),          // flames, lantern flicker, smoke, flags
//     anchor,                      // world position of the clearing centre
//     parking,                     // [{ x, z, heading, kind }] handed to the fleet
//     lights,                      // any point/spot lights, so tiers can cap them
//     clearing,                    // { bare(x, z), edge(x, z), radii, blend } for the vegetation
//     stats: { objects, tris },
//   }
//
// `clearing.bare(x, z)` is 1 on the compound's dirt and 0 in the savanna, with
// a 3–6 m noise-displaced ramp along the graded pad's edge — the same line the
// ground overlay paints its dirt-to-grass band on, so grass planted against it
// meets the dirt where the dirt actually stops.
//
// Everything is placed relative to `anchor`, which comes from WORLD.camp, and
// sits on terrain.heightAt(). Objects have a practical reason to be where they
// are — a kitchen is near the water, fuel is away from fire, vehicles park where
// a truck can actually get in and out. See layout.js for the plan.
//
// `parking[].heading` uses the driver's convention: the nose points along
// (sin heading, cos heading) in world space.
// ---------------------------------------------------------------------------

export function createCampground({ terrain, env = null, quality = 'high' } = {}) {
  const anchor = anchorPoint(terrain, WORLD.camp);
  const frame = createFrame(terrain, anchor);
  const group = frame.group;
  group.name = 'campground';
  const mats = campMaterials(env);
  const plan = buildPlan();
  const R = rng(0xc4a9);
  const rnd = R.next;
  const kit = new Kit('camp');
  const lamps = [];
  const lightAnchors = [];
  const footprints = [];
  let objects = 0;

  /** Place a builder result (Obj, or { obj, lamps }) and carry its lamps into camp space. */
  const put = (res, placement) => {
    const obj = res.obj || res;
    const p = obj.place(kit, frame, placement);
    objects++;
    // anything that stands on the dirt darkens it where it touches
    if (placement.conform !== undefined && placement.half !== undefined && (placement.dy || 0) < 0.3) footprints.push({ u: p.u, v: p.v, r: placement.half });
    for (const l of res.lamps || []) {
      const c = Math.cos(p.yaw);
      const s = Math.sin(p.yaw);
      lamps.push({ x: p.u + l.x * c + l.z * s, y: p.y + l.y, z: -p.v + (-l.x * s + l.z * c), kind: l.kind });
    }
    return p;
  };
  const lightAt = (u, v, y, opts) => {
    lightAnchors.push({ x: u, y: frame.ground(u, v) + y, z: -v, ...opts });
  };

  // --- structures --------------------------------------------------------------
  const cab = cabin(rnd);
  put(cab, { u: plan.cabin.u, v: plan.cabin.v, facing: plan.cabin.facing });
  footprints.push({ u: plan.cabin.u, v: plan.cabin.v - 0.6, r: 3.0 });
  lightAt(plan.cabin.u + 0.2, plan.cabin.v - 2.9, 2.45, { name: 'cabinPorch', intensity: 16, distance: 11, priority: 8, color: 0xffb35c });
  put(storeHut(rnd), { u: plan.store.u, v: plan.store.v, facing: plan.store.facing });
  footprints.push({ u: plan.store.u, v: plan.store.v, r: 2.2 });
  put(radioMast(rnd, plan.mast.height), { u: plan.mast.u, v: plan.mast.v, facing: [0, -1] });
  put(solarArray(rnd), { u: plan.solar.u, v: plan.solar.v, facing: plan.solar.facing });
  put(waterTank(rnd), { u: plan.tank.u, v: plan.tank.v, facing: [1, -0.3] });
  put(fuelStore(rnd), { u: plan.fuel.u, v: plan.fuel.v, facing: plan.fuel.facing });
  put(lookout(rnd, plan.lookout.height), { u: plan.lookout.u, v: plan.lookout.v, facing: [0.6, -1] });
  lightAt(plan.lookout.u, plan.lookout.v, plan.lookout.height + 1.2, { name: 'lookoutLamp', intensity: 9, distance: 12, priority: 3, color: 0xffb35c });
  put(latrineBlock(rnd), { u: plan.latrine.u, v: plan.latrine.v, facing: plan.latrine.facing });
  lightAt(plan.latrine.u - 1.2, plan.latrine.v, 2.2, { name: 'latrineLamp', intensity: 8, distance: 7, priority: 2 });
  put(noticeBoard(), { u: plan.mapBoard.u, v: plan.mapBoard.v, facing: plan.mapBoard.facing });
  put(flagPole(6), { u: plan.flag.u, v: plan.flag.v });
  put(gate(rnd, plan.gate.width), { u: plan.gate.u, v: plan.gate.v, facing: [0, 1] });
  lightAt(plan.gate.u + plan.gate.width * 0.5, plan.gate.v + 0.3, 1.7, { name: 'gateLamp', intensity: 10, distance: 9, priority: 5, color: 0xffb35c });
  put(signPost('signSpeed', 0.9, 0.5, 1.5), { u: plan.gate.u - 6, v: plan.gate.v - 2.5, facing: [-0.6, -1] });
  for (const line of plan.fence) {
    put(fenceLine(rnd, line.map(([u, v]) => [u, -v]), (x, z) => frame.ground(x, -z)), { u: 0, v: 0, y: 0, facing: [0, -1] });
  }
  // thorn boma piled just inside the road fence, broken at the gate and where the game trail crosses
  const bomaV = -22.2;
  put(
    bomaLine(rnd, [[-38, -bomaV], [38, -bomaV]], (x, z) => frame.ground(x, -z), {
      gaps: [[plan.gate.u, -bomaV, plan.gate.width * 0.5 + 1.4]],
      height: quality === 'fast' ? 0.9 : 1.1,
    }),
    { u: 0, v: 0, y: 0, facing: [0, -1] },
  );

  // --- canvas ---------------------------------------------------------------------
  put(messTent(rnd, plan.mess), { u: plan.mess.u, v: plan.mess.v, facing: plan.mess.facing, conform: 0.3, half: 4 });
  lightAt(plan.mess.u, plan.mess.v, 2.6, { name: 'messLamp', intensity: 26, distance: 14, priority: 9, color: 0xffb860 });
  put(kitchenShelter(rnd, plan.kitchen, P), { u: plan.kitchen.u, v: plan.kitchen.v, facing: plan.kitchen.facing, conform: 0.3, half: 2.5 });
  lightAt(plan.kitchen.u + 1.5, plan.kitchen.v, 2.0, { name: 'kitchenLamp', intensity: 12, distance: 9, priority: 6 });
  plan.tents.forEach((t, i) => {
    put(safariTent(rnd, t.kind), { u: t.u, v: t.v, facing: t.facing, conform: 0.6, half: 2.5 });
    if (i === 2 || i === 0 || i === 4) {
      lightAt(t.u - t.facing[0] * 3.3, t.v - 3.3, 1.7, { name: 'tentLamp' + i, intensity: 7, distance: 7, priority: i === 2 ? 4 : 1 });
    }
  });
  for (const t of plan.staffTents) put(ridgeTent(rnd), { u: t.u, v: t.v, facing: t.facing, conform: 1, half: 1.2 });
  put(laundryLine(rnd, Math.hypot(plan.laundry.b[0] - plan.laundry.a[0], plan.laundry.b[1] - plan.laundry.a[1])), {
    u: (plan.laundry.a[0] + plan.laundry.b[0]) * 0.5,
    v: (plan.laundry.a[1] + plan.laundry.b[1]) * 0.5,
    facing: [-(plan.laundry.b[1] - plan.laundry.a[1]), plan.laundry.b[0] - plan.laundry.a[0]],
  });

  // --- the fire and what sits round it -------------------------------------------
  put(firePit(rnd, plan.fire.radius), { u: plan.fire.u, v: plan.fire.v, conform: 1 });
  const ring = 2.7;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.3 + R.jitter(0.12);
    if (i === 4) continue; // a gap on the mess side where people walk in
    const r = ring + R.jitter(0.35);
    const u = plan.fire.u + Math.cos(a) * r;
    const v = plan.fire.v + Math.sin(a) * r;
    if (i % 4 === 1) put(P.logBench(rnd), { u, v, facing: [-Math.sin(a), Math.cos(a)], conform: 1, half: 0.8 });
    else put(P.chair(rnd), { u, v, facing: [-Math.cos(a), -Math.sin(a)].map((c, k) => c + R.jitter(0.25)), conform: 1, half: 0.4 });
  }
  put(P.table(rnd, 0.7, 0.7, 0.5), { u: plan.fire.u + 3.3, v: plan.fire.v - 1.6, facing: [0.3, -1], conform: 1, half: 0.4 });
  put(P.cooler(rnd, 'polyBlue'), { u: plan.fire.u + 3.9, v: plan.fire.v - 2.2, facing: [0.5, -1], conform: 1, half: 0.3 });
  put(P.woodpile(rnd, 2.4, 1.0), { u: plan.wood.u, v: plan.wood.v, facing: [0.15, -1], conform: 0.5, half: 1.2 });
  put(P.woodpile(rnd, 1.4, 0.6), { u: plan.wood.u + 2.2, v: plan.wood.v + 1.2, facing: [1, 0.2], conform: 0.5, half: 0.7 });
  // the chopping block with the axe in it, split wood where it fell, and an
  // armful of logs dropped beside the fire ring for tonight
  put(P.choppingBlock(rnd), { u: plan.wood.u + 1.2, v: plan.wood.v - 1.6, facing: [0.4, -1], conform: 1, half: 0.4 });
  put(P.splitWood(rnd, 7), { u: plan.wood.u + 1.0, v: plan.wood.v - 1.0, conform: 1, half: 0.9 });
  put(P.splitWood(rnd, 5), { u: plan.fire.u - 2.4, v: plan.fire.v - 0.6, conform: 1, half: 0.6 });
  for (let i = 0; i < 3; i++) put(P.jerry(rnd, i === 1 ? 'polyBlue' : 'poly'), { u: plan.fire.u - 3.2 + i * 0.4, v: plan.fire.v + 2.6, facing: [R.jitter(1), -1], conform: 1, half: 0.3 });
  // the staff fire behind the store
  put(firePit(rnd, plan.fire2.radius, { small: true }), { u: plan.fire2.u, v: plan.fire2.v, conform: 1 });
  for (let i = 0; i < 3; i++) {
    const a = 1.2 + i * 1.6 + R.jitter(0.3);
    put(P.logBench(rnd), { u: plan.fire2.u + Math.cos(a) * 1.7, v: plan.fire2.v + Math.sin(a) * 1.7, facing: [-Math.sin(a), Math.cos(a)], conform: 1, half: 0.8 });
  }

  // --- the workshop end ----------------------------------------------------------------
  const ws = plan.workshop;
  put(P.toolCart(rnd), { u: ws.u - 1.5, v: ws.v + 0.5, facing: [-0.3, -1], conform: 1, half: 0.5 });
  put(P.wheelbarrow(rnd), { u: ws.u + 1.5, v: ws.v - 0.5, facing: [0.8, 0.6], conform: 1, half: 0.5 });
  put(P.tarpPile(rnd, 2.2, 1.0, 1.6), { u: ws.u + 0.5, v: ws.v + 2.6, facing: [0.2, -1], conform: 1, half: 1.0 });
  put(P.tyre(rnd, 0.45), { u: ws.u + 2.4, v: ws.v + 1.6, conform: 1, half: 0.4 });
  put(P.tyre(rnd, 0.45), { u: ws.u + 2.5, v: ws.v + 1.7, dy: 0.24, facing: [0.4, -1], conform: 1, half: 0.4 });
  put(P.drum(rnd, 'steelBlue'), { u: ws.u + 3.2, v: ws.v + 0.4, conform: 1, half: 0.3 });
  put(P.crate(rnd, 0.9, 0.5, 0.6), { u: ws.u - 0.4, v: ws.v + 1.4, facing: [0.3, -1], conform: 1, half: 0.4 });
  put(P.crate(rnd, 0.6, 0.45, 0.45, true), { u: ws.u - 1.1, v: ws.v + 1.6, facing: [-0.5, -1], conform: 1, half: 0.4 });
  put(P.jerry(rnd, 'steelYellow'), { u: ws.u + 0.6, v: ws.v - 1.2, facing: [1, -0.4], conform: 1, half: 0.3 });
  // and by the cabin steps and the map board
  put(P.crate(rnd, 0.7, 0.45, 0.5), { u: plan.cabin.u + 3.2, v: plan.cabin.v - 2.6, facing: [0.4, -1], conform: 1, half: 0.4 });
  put(P.cooler(rnd, 'poly'), { u: plan.cabin.u + 3.4, v: plan.cabin.v - 3.4, facing: [-0.4, -1], conform: 1, half: 0.3 });
  put(P.chair(rnd), { u: plan.mapBoard.u - 1.8, v: plan.mapBoard.v + 0.6, facing: [0.4, -1], conform: 1, half: 0.4 });
  put(P.bin(rnd), { u: plan.mapBoard.u + 1.6, v: plan.mapBoard.v + 0.4, conform: 1, half: 0.3 });
  // picnic tables between the mess and the tents
  put(P.picnicTable(rnd), { u: plan.mess.u + 7.5, v: plan.mess.v + 4.5, facing: [0.9, -0.5], conform: 1, half: 1.0 });
  put(P.picnicTable(rnd), { u: plan.mess.u - 1, v: plan.mess.v + 6.5, facing: [1, 0.15], conform: 1, half: 1.0 });
  const tableLamp = P.lantern(rnd);
  put({ obj: tableLamp.obj, lamps: [{ ...tableLamp.lamp, kind: 'lantern' }] }, { u: plan.mess.u + 7.5, v: plan.mess.v + 4.5, dy: 0.78, conform: 0 });
  // supplies stacked by the store and the kitchen
  for (let i = 0; i < 4; i++) put(P.crate(rnd, 0.6 + R.jitter(0.1), 0.42, 0.45, i === 3), { u: plan.store.u + 2.8 + (i % 2) * 0.7, v: plan.store.v + 2.4 + Math.floor(i / 2) * 0.6, facing: [1, R.jitter(0.4)], conform: 1, half: 0.4 });
  put(P.tarpPile(rnd, 1.6, 0.8, 1.2), { u: plan.store.u + 1.5, v: plan.store.v - 2.6, facing: [1, 0.2], conform: 1, half: 0.8 });
  put(P.duffel(rnd, 'canvasSand'), { u: plan.tents[1].u + 2.8, v: plan.tents[1].v - 3.4, conform: 1, half: 0.3 });
  put(P.duffel(rnd), { u: plan.tents[3].u - 2.6, v: plan.tents[3].v - 3.6, conform: 1, half: 0.3 });

  // --- the margins: rocks, deadfall, a termite mound ----------------------------------
  const inCore = (u, v) => Math.abs(u) < 30 && v > -21 && v < 26;
  const onWear = (u, v) => v > -21 && v < -5 && Math.abs(u) < 29;
  const scatter = (count, make, rMin, rMax, { half = 0.5 } = {}) => {
    let placed = 0;
    let guard = 0;
    while (placed < count && guard++ < count * 30) {
      const a = rnd() * Math.PI * 2;
      const r = rMin + Math.sqrt(rnd()) * (rMax - rMin);
      const u = Math.cos(a) * r;
      const v = 4 + Math.sin(a) * r * 0.85;
      if (v < -25) continue;
      if (onWear(u, v)) continue;
      if (inCore(u, v) && rnd() < 0.85) continue;
      if (Math.hypot(u - plan.lookout.u, v - plan.lookout.v) < 4) continue;
      put(make(u, v), { u, v, facing: [Math.cos(a * 3), Math.sin(a * 3)], conform: 1, half });
      placed++;
    }
  };
  const tier = quality === 'fast' ? 0.6 : quality === 'ultra' ? 1.5 : 1;
  scatter(Math.round(26 * tier), () => P.rock(rnd, 0.25 + rnd() * 0.5), 18, 44, { half: 0.4 });
  scatter(Math.round(6 * tier), () => P.rock(rnd, 0.9 + rnd() * 0.7), 30, 46, { half: 1.0 });
  scatter(Math.round(9 * tier), () => P.branch(rnd, 2.2 + rnd() * 2.2), 22, 46, { half: 1.2 });
  put(P.termiteMound(rnd), { u: 36, v: 26, conform: 1, half: 0.8 });
  put(P.termiteMound(rnd), { u: -40, v: 14, conform: 1, half: 0.8 });
  // a rock kopje at the far corner the lookout looks over
  for (let i = 0; i < 5; i++) put(P.rock(rnd, 1.1 + rnd() * 0.9), { u: -33 + R.jitter(2.5), v: 27 + R.jitter(2.5), conform: 1, half: 1.2 });

  // --- build ------------------------------------------------------------------------------
  const built = kit.build(mats, { castShadow: true, receiveShadow: true });
  built.name = 'campStatic';
  // the glass and lamp glass are transparent and should draw after the dirt
  for (const c of built.children) {
    if (c.material === mats.glass || c.material === mats.lampGlass) {
      c.renderOrder = 1;
      // a pane or a lantern chimney throws no shadow worth an opaque one
      c.castShadow = false;
    }
  }
  group.add(built);

  const wear = buildGroundWear(frame, plan, { quality, footprints });
  group.add(wear.mesh);
  const clearing = clearingMask(anchor);

  // --- grass tufts at the margins -------------------------------------------------------
  const grass = buildGrass(mats, frame, rnd, { count: Math.round(560 * tier), inCore, onWear });
  group.add(grass.mesh);

  // --- fire -----------------------------------------------------------------------------
  const fires = [];
  const fireAt = (f, opts) => {
    // a 1.15 m pit burns about a metre high; the first cut at 1.5 radii stood
    // taller than the chair backs twice over
    const fire = createFire({ radius: f.radius * 0.55, height: f.radius * 1.0, quality, ...opts });
    fire.group.position.set(f.u, frame.ground(f.u, f.v) + 0.12, -f.v);
    group.add(fire.group);
    fires.push(fire);
    return fire;
  };
  fireAt(plan.fire, { wind: [0.6, -0.5] });
  if (quality !== 'fast') fireAt(plan.fire2, { wind: [0.6, -0.5], light: quality === 'ultra' });

  // --- lamps and lights --------------------------------------------------------------------
  const camp = createCampLights(mats, lamps, lightAnchors.filter((a) => a.intensity > 0), { quality });
  group.add(camp.group);
  const lights = [...camp.lights, ...fires.map((f) => f.light).filter(Boolean)];

  // --- the flag ---------------------------------------------------------------------------------
  const flag = buildFlag(mats);
  flag.mesh.position.set(plan.flag.u, frame.ground(plan.flag.u, plan.flag.v) + 5.3, -plan.flag.v);
  group.add(flag.mesh);

  // --- parking, in world space ------------------------------------------------------------------
  const parking = plan.parking.map((p) => {
    const w = frame.toWorld(p.u, p.v);
    return { x: w.x, z: w.z, heading: frame.worldHeading(p.heading[0], p.heading[1]), kind: p.kind };
  });

  // --- stats -----------------------------------------------------------------------------------------
  let tris = wear.tris + grass.tris;
  let calls = 1 + 1;
  built.traverse((o) => {
    if (o.isMesh) {
      tris += o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3;
      calls++;
    }
  });
  calls += fires.reduce((n, f) => n + f.calls, 0) + (camp.bulbCount ? 1 : 0) + 1;
  const stats = {
    objects,
    tris: Math.round(tris),
    calls,
    materials: built.children.length,
    lamps: lamps.length,
    bulbs: camp.bulbCount,
    lanterns: camp.lanternCount,
    lights: lights.length,
    particles: fires.reduce((n, f) => n + f.count, 0),
    grass: grass.count,
  };

  let time = 0;
  return {
    group,
    anchor,
    parking,
    lights,
    clearing,
    plan,
    frame,
    materials: mats,
    stats,
    update(dt, t, ctx = {}) {
      const step = THREE.MathUtils.clamp(dt || 0, 1e-4, 0.1);
      time += step;
      camp.update(step, time, ctx);
      const night = camp.level;
      for (const f of fires) {
        f.update(step, time, { night });
        f.setNight(night);
      }
      // the coals and the charred logs glow with the main fire's flicker: barely
      // there in sunlight, the second brightest thing after the flames at night
      const fl = fires.length ? fires[0].flicker : 1;
      mats.ash.emissiveIntensity = (0.35 + 1.4 * night) * fl;
      mats.charLog.emissiveIntensity = (0.3 + 1.1 * night) * fl;
      flag.update(step, time);
    },
  };
}

/** Dry grass tufts as crossed cutout cards, instanced. Dense at the cleared edge, sparse inside. */
function buildGrass(mats, frame, rnd, { count, inCore, onWear }) {
  const card = new THREE.PlaneGeometry(0.8, 0.7, 1, 2);
  card.translate(0, 0.35, 0);
  // bend the top back a little so the card is not a flat billboard from above
  const p = card.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0.5) p.setZ(i, p.getZ(i) + 0.08);
  const a = card.clone();
  const b = card.clone().rotateY(Math.PI / 2);
  const c = card.clone().rotateY(Math.PI / 4);
  const merged = mergeGeos([a, b, c]);
  const mesh = new THREE.InstancedMesh(merged, mats.grass, count);
  mesh.name = 'campGrass';
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const pos = new THREE.Vector3();
  let n = 0;
  let guard = 0;
  while (n < count && guard++ < count * 30) {
    const ang = rnd() * Math.PI * 2;
    const r = 12 + Math.sqrt(rnd()) * 36;
    const u = Math.cos(ang) * r;
    const v = 4 + Math.sin(ang) * r * 0.85;
    if (v < -24) continue;
    if (onWear(u, v)) continue;
    // density follows the clearing mask: a few survivors inside the compound,
    // thick where the dirt gives way to grass, thinning again outside where
    // the forest's own grass carries on
    const bare = bareAt(u, v);
    const keep = inCore(u, v) ? 0.12 : bare > 0.98 ? 0.3 : bare > 0.02 ? 1.0 : 0.55;
    if (rnd() > keep) continue;
    const sc = (0.55 + rnd() * 0.8) * (0.8 + 0.3 * (1 - bare));
    pos.set(u, frame.ground(u, v) - 0.03, -v);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * Math.PI * 2);
    s.set(sc * (0.8 + rnd() * 0.5), sc, sc * (0.8 + rnd() * 0.5));
    m.compose(pos, q, s);
    mesh.setMatrixAt(n, m);
    n++;
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return { mesh, count: n, tris: (merged.index ? merged.index.count / 3 : merged.attributes.position.count / 3) * n };
}

function mergeGeos(list) {
  const nonIndexed = list.map((g) => (g.index ? g.toNonIndexed() : g));
  let count = 0;
  for (const g of nonIndexed) count += g.attributes.position.count;
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  let o = 0;
  for (const g of nonIndexed) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    uv.set(g.attributes.uv.array, o * 2);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return out;
}

/** The conservancy flag: a cloth grid whose vertices ripple in update. */
function buildFlag(mats) {
  const w = 1.5;
  const h = 0.95;
  const geo = new THREE.PlaneGeometry(w, h, 12, 6);
  geo.translate(w * 0.5 + 0.06, 0, 0);
  const base = geo.attributes.position.array.slice();
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#4a5a3a';
  ctx.fillRect(0, 0, 256, 160);
  ctx.fillStyle = '#e2d7bb';
  ctx.fillRect(0, 60, 256, 40);
  ctx.fillStyle = '#c9302c';
  ctx.beginPath();
  ctx.arc(128, 80, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a2622';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('OLARE', 128, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.9, metalness: 0, envMapIntensity: 0.3, name: 'campFlag' });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'campFlag';
  mesh.castShadow = true;
  // flies along local +x; the camp frame's wind comes from the road side
  mesh.rotation.y = -0.9;
  return {
    mesh,
    update(dt, t) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = base[i * 3];
        const y = base[i * 3 + 1];
        const k = (x - 0.06) / w;
        p.setZ(i, Math.sin(x * 6.0 - t * 7.0) * 0.12 * k + Math.sin(y * 5.0 - t * 4.3 + x * 3.0) * 0.05 * k);
        p.setY(i, y + Math.sin(x * 4.0 - t * 5.0) * 0.03 * k);
      }
      p.needsUpdate = true;
      geo.computeVertexNormals();
    },
  };
}
