import * as THREE from 'three';
import { PALETTE } from '../palette.js';
import { buildBody } from './body.js';
import { createGroundContact } from './contact.js';
import { buildDetails } from './details.js';
import { buildInterior } from './interior.js';
import { vehicleMaterials } from './materials.js';
import { createLiveMirrors, liveMirrorsWanted, pageQuality } from './mirrors.js';
import { SPEC as S } from './spec.js';
import { TYRE_SINK, buildAxles, buildWheel } from './wheels.js';

// ---------------------------------------------------------------------------
// Assembles the truck and drives its moving parts: wheel spin, steering,
// suspension travel, body pitch/roll and the lamps.
// ---------------------------------------------------------------------------

export function createVehicle({ env = null, terrain = null, quality = pageQuality() } = {}) {
  const materials = vehicleMaterials(env);

  const root = new THREE.Group();
  root.name = 'truck';

  // sprung mass: everything that leans under braking
  const sprung = new THREE.Group();
  sprung.name = 'sprung';
  root.add(sprung);

  // Live mirrors need a mesh per pane to hang a render target on, which is what
  // the sort-pieces path of the kit already produces; it costs three draw calls
  // and is only asked for on the tiers that render the mirrors.
  if (liveMirrorsWanted(quality)) materials.mirrorGlass.userData.sortPieces = true;
  const body = buildBody().build(materials);
  sprung.add(body);
  const mirrors = createLiveMirrors(body, materials, { quality });
  sprung.add(buildDetails().build(materials));
  const cabin = buildInterior().build(materials, { castShadow: false });
  sprung.add(cabin);
  const instruments = cabin.userData.instruments ?? null;

  const unsprung = new THREE.Group();
  unsprung.name = 'unsprung';
  root.add(unsprung);
  unsprung.add(buildAxles(materials));

  const wheels = S.wheelPositions.map((wp) => {
    const { group, spin, contact } = buildWheel(materials, { side: Math.sign(wp.x) });
    const pivot = new THREE.Group();
    pivot.position.set(wp.x, S.axleY, wp.z);
    pivot.add(group);
    unsprung.add(pivot);
    return { ...wp, pivot, spin, contact, restY: S.axleY };
  });

  // Contact shadows and tyre tracks. World-space geometry, so it lives beside
  // the truck in the scene rather than under it, and is parented lazily the
  // first frame the root has a parent to offer.
  const ground = createGroundContact();
  // Terrain height lookup for the decals. Handed in by whoever builds the
  // truck, or through setTerrain(); until either happens the decals fall back
  // to the four contact heights the driver already samples.
  let heightAt = terrain?.heightAt ?? null;
  function setTerrain(t) {
    heightAt = typeof t === 'function' ? t : (t?.heightAt ?? null);
  }

  // --- lamps ---------------------------------------------------------------
  const lamps = new THREE.Group();
  sprung.add(lamps);
  const headlightZ = S.hoodFrontZ + 0.14;
  const headY = (S.grilleTopY + S.grilleBottomY) * 0.5;
  const beams = [];
  // Decay of 0.4 rather than inverse-square. At 1.4 these delivered under one
  // unit of irradiance at 10 m against moonlight at 2.1, so the lamps could not
  // light the trail they were pointed at and night needed a second set of
  // spotlights standing in for them. A shallow decay with the distance cutoff
  // doing the far end is what a headlamp on a trail actually looks like.
  for (const sx of [-1, 1]) {
    const spot = new THREE.SpotLight(PALETTE.headlight, 0, 32, 0.5, 0.55, 0.4);
    spot.position.set(sx * 0.72, headY, headlightZ);
    spot.target.position.set(sx * 0.9, headY - 1.6, headlightZ + 22);
    lamps.add(spot, spot.target);
    beams.push(spot);
  }
  // Cool white against the halogen headlamps, so the bar reads as the LED unit
  // it is modelled as rather than as an absence of colour.
  const barLight = new THREE.SpotLight(0xf2f6ff, 0, 32, 0.42, 0.4, 0.4);
  barLight.position.set(0, S.roofY + 0.2, S.cabFrontZ + 0.1);
  barLight.target.position.set(0, S.roofY - 2.0, S.cabFrontZ + 30);
  lamps.add(barLight, barLight.target);

  const state = {
    speed: 0,
    steer: 0,
    wheelAngle: 0,
    lightsOn: false,
    suspension: [0, 0, 0, 0],
    load: [1, 1, 1, 1],
  };

  // Every lamp material carries the lit-lamp shaping from `applyLampGlow`
  // (hot core, bleached centre, glowing dish); `uLampOn` is the switch for it.
  const lampKeys = ['headlight', 'taillight', 'amber', 'reverseLamp', 'lensClear', 'lensRibbed', 'reflector'];
  function setLampGlow(on) {
    for (const key of lampKeys) {
      const u = materials[key]?.userData?.lamp;
      if (u) u.uLampOn.value = on ? 1 : 0;
    }
  }

  function setLights(on) {
    state.lightsOn = on;
    for (const b of beams) b.intensity = on ? 13 : 0;
    barLight.intensity = on ? 18 : 0;
    materials.headlight.emissiveIntensity = on ? 9.0 : 1.6;
    materials.amber.emissiveIntensity = on ? 3.2 : 1.1;
    materials.taillight.emissiveIntensity = on ? 4.0 : 1.6;
    // Cover lenses: lit from behind, so they carry a glow of their own at night.
    // Blended at their own alpha, so the number is high for what reaches the
    // frame. The bowls behind them (`reflector`) light through `uLampBowl`.
    for (const key of ['lensClear', 'lensRibbed']) {
      if (materials[key]) materials[key].emissiveIntensity = on ? 2.2 : 0;
    }
    setLampGlow(on);
  }
  setLights(false);

  /**
   * @param dt seconds
   * @param drive { speed, steer, throttle, brake, terrainY(x,z) }
   */
  const finite = (v, fallback = 0) => (Number.isFinite(v) ? v : fallback);

  function update(dt, drive = {}) {
    dt = THREE.MathUtils.clamp(finite(dt, 1 / 60), 1e-4, 1 / 20);
    const speed = finite(drive.speed);
    const steer = finite(drive.steer);
    state.speed = speed;
    state.steer = steer;

    // Brake lamps come up on the pedal, reverse lamps when actually rolling
    // backwards, both on top of whatever the running lights are doing.
    const braking = finite(drive.brake) > 0.05 && speed > -0.2;
    const tailBase = state.lightsOn ? 4.0 : 1.6;
    materials.taillight.emissiveIntensity = braking ? Math.max(tailBase, 11.0) : tailBase;
    // the lit-lamp shaping follows the lamp, not the switch: a brake lamp in
    // daylight still has a hot core, and a reversing lamp only when reversing
    const tailGlow = materials.taillight.userData.lamp;
    if (tailGlow) tailGlow.uLampOn.value = braking || state.lightsOn ? 1 : 0;
    const reversing = speed < -0.15;
    if (materials.reverseLamp) {
      // idle, the white cell is a pale lens in daylight; at night's exposure the
      // same 0.9 read as a lit lamp, so it drops with the headlamps on
      materials.reverseLamp.emissiveIntensity = reversing ? 7.0 : state.lightsOn ? 0 : 0.9;
      const g = materials.reverseLamp.userData.lamp;
      if (g) g.uLampOn.value = reversing ? 1 : 0;
    }

    state.wheelAngle += (speed / S.wheelRadius) * dt;
    for (const w of wheels) {
      w.spin.rotation.x = state.wheelAngle;
      if (w.steer) w.pivot.rotation.y = steer;
    }

    // Suspension. The driver has already sampled the four contact patches for
    // its plane fit and worked out how far each sits off the body's own plane,
    // so this only has to take up that difference — re-sampling here would
    // double the frame's terrain cost for the same four numbers.
    const contacts = drive.contacts;
    let avg = 0;
    let pitchSum = 0;
    let rollSum = 0;
    for (let i = 0; i < wheels.length; i++) {
      const w = wheels[i];
      const target = contacts?.[i] ? finite(contacts[i].deflect) : 0;
      // The wheel chases the ground far harder than the body chases the wheel.
      // That difference is the whole of what a suspension is, and at the old
      // matched rates the two moved together and the truck rode like a sledge.
      state.suspension[i] += (target - state.suspension[i]) * (1 - Math.exp(-dt * 17));
      const y = THREE.MathUtils.clamp(state.suspension[i], -S.suspensionTravel, S.suspensionTravel);
      w.pivot.position.y = S.axleY + y;
      avg += y * 0.25;
      pitchSum += (w.z > 0 ? 1 : -1) * y;
      rollSum += (w.x > 0 ? 1 : -1) * y;
    }
    unsprung.position.y = 0;

    // Weight transfer is character and stays; the terms fed from the contact
    // patches are down by about half, because the body's attitude now comes
    // from the fitted plane and these are only the residual.
    const targetPitch = THREE.MathUtils.clamp(-finite(drive.accel) * 0.015 - pitchSum * 0.18, -0.1, 0.1);
    const targetRoll = THREE.MathUtils.clamp(finite(drive.lateral) * 0.019 + rollSum * 0.16, -0.1, 0.1);
    sprung.rotation.x += (targetPitch - sprung.rotation.x) * (1 - Math.exp(-dt * 5));
    sprung.rotation.z += (targetRoll - sprung.rotation.z) * (1 - Math.exp(-dt * 5));
    sprung.position.y += (avg * 0.6 - sprung.position.y) * (1 - Math.exp(-dt * 7));

    // Tyre load, for the squash. The spring at each corner is as compressed as
    // the body's corner is low relative to its hub, so the side the body leans
    // toward and the axle it dives onto carry more — read straight off the
    // attitude above, so the squash always agrees with the lean. Normalised to
    // a mean of one: the truck weighs what it weighs however it is heaving.
    const bodyY = sprung.position.y;
    const sinPitch = Math.sin(sprung.rotation.x);
    const sinRoll = Math.sin(sprung.rotation.z);
    let loadSum = 0;
    for (let i = 0; i < wheels.length; i++) {
      const w = wheels[i];
      const cornerY = bodyY + sinRoll * w.x - sinPitch * w.z;
      const y = THREE.MathUtils.clamp(state.suspension[i], -S.suspensionTravel, S.suspensionTravel);
      // 4 per metre: a corner spring with 0.25 m of static deflection, which is
      // soft for the class but keeps a wheel on a rut wall from pinning the
      // squash to its clamp while the body is still level.
      state.load[i] = Math.max(0.2, 1 + (y - cornerY) * 4);
      loadSum += state.load[i];
    }
    const norm = loadSum > 1e-3 ? wheels.length / loadSum : 1;
    // slower than the springs: the squash is a read of the load, not a rattle
    const ease = 1 - Math.exp(-dt * 6);
    for (let i = 0; i < wheels.length; i++) {
      const load = THREE.MathUtils.clamp(state.load[i] * norm, 0.5, 1.6);
      state.load[i] = load;
      const c = wheels[i].contact;
      c.load += (load - c.load) * ease;
      // a loaded tyre presses deeper into the dirt rather than lifting the hub
      c.sink = TYRE_SINK + (c.load - 1) * 0.012;
    }

    // Stopgap until main.js hands the terrain over: the live scene exposes it
    // through the debug API, and the decals are noticeably better following the
    // real ruts and crown than the plane through the four patches.
    if (!heightAt) {
      const t = globalThis.debugAPI?.objects?.terrain;
      if (t?.heightAt) heightAt = t.heightAt;
    }
    if (!ground.mesh.parent && root.parent) root.parent.add(ground.mesh);
    ground.update(dt, {
      pos: root.position,
      quat: root.quaternion,
      wheels,
      suspension: state.suspension,
      steer,
      contacts,
      heightAt,
    });

    instruments?.update(dt, {
      speed,
      maxSpeed: finite(drive.maxSpeed, 21),
      rpm: finite(drive.rpm),
      throttle: finite(drive.throttle),
      brake: finite(drive.brake),
      steer,
      lightsOn: state.lightsOn,
    });
  }

  return {
    root,
    sprung,
    wheels,
    materials,
    state,
    ground,
    mirrors,
    setLights,
    setTerrain,
    update,
    spec: S,
  };
}
