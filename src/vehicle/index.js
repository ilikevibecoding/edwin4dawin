import * as THREE from 'three';
import { PALETTE } from '../palette.js';
import { buildBody } from './body.js';
import { buildDetails } from './details.js';
import { buildInterior } from './interior.js';
import { vehicleMaterials } from './materials.js';
import { SPEC as S } from './spec.js';
import { buildAxles, buildWheel } from './wheels.js';

// ---------------------------------------------------------------------------
// Assembles the truck and drives its moving parts: wheel spin, steering,
// suspension travel, body pitch/roll and the lamps.
// ---------------------------------------------------------------------------

export function createVehicle({ env = null } = {}) {
  const materials = vehicleMaterials(env);

  const root = new THREE.Group();
  root.name = 'truck';

  // sprung mass: everything that leans under braking
  const sprung = new THREE.Group();
  sprung.name = 'sprung';
  root.add(sprung);

  sprung.add(buildBody().build(materials));
  sprung.add(buildDetails().build(materials));
  sprung.add(buildInterior().build(materials, { castShadow: false }));

  const unsprung = new THREE.Group();
  unsprung.name = 'unsprung';
  root.add(unsprung);
  unsprung.add(buildAxles(materials));

  const wheels = S.wheelPositions.map((wp) => {
    const { group, spin } = buildWheel(materials, { side: Math.sign(wp.x) });
    const pivot = new THREE.Group();
    pivot.position.set(wp.x, S.axleY, wp.z);
    pivot.add(group);
    unsprung.add(pivot);
    return { ...wp, pivot, spin, restY: S.axleY };
  });

  // --- lamps ---------------------------------------------------------------
  const lamps = new THREE.Group();
  sprung.add(lamps);
  const headlightZ = S.hoodFrontZ + 0.14;
  const headY = (S.grilleTopY + S.grilleBottomY) * 0.5;
  const beams = [];
  for (const sx of [-1, 1]) {
    const spot = new THREE.SpotLight(PALETTE.headlight, 0, 46, 0.5, 0.55, 1.4);
    spot.position.set(sx * 0.72, headY, headlightZ);
    spot.target.position.set(sx * 0.9, headY - 1.6, headlightZ + 22);
    lamps.add(spot, spot.target);
    beams.push(spot);
  }
  const barLight = new THREE.SpotLight(0xffffff, 0, 70, 0.42, 0.4, 1.2);
  barLight.position.set(0, S.roofY + 0.2, S.cabFrontZ + 0.1);
  barLight.target.position.set(0, S.roofY - 2.0, S.cabFrontZ + 30);
  lamps.add(barLight, barLight.target);

  const state = {
    speed: 0,
    steer: 0,
    wheelAngle: 0,
    lightsOn: false,
    suspension: [0, 0, 0, 0],
  };

  function setLights(on) {
    state.lightsOn = on;
    for (const b of beams) b.intensity = on ? 22 : 0;
    barLight.intensity = on ? 30 : 0;
    materials.headlight.emissiveIntensity = on ? 6.5 : 1.6;
    materials.amber.emissiveIntensity = on ? 3.2 : 1.1;
    materials.taillight.emissiveIntensity = on ? 4.0 : 1.6;
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

    state.wheelAngle += (speed / S.wheelRadius) * dt;
    for (const w of wheels) {
      w.spin.rotation.x = state.wheelAngle;
      if (w.steer) w.pivot.rotation.y = steer;
    }

    // suspension: sample the ground under each contact patch
    const sampler = drive.terrainY;
    let avg = 0;
    let pitchSum = 0;
    let rollSum = 0;
    for (let i = 0; i < wheels.length; i++) {
      const w = wheels[i];
      let target = 0;
      if (sampler) {
        const world = new THREE.Vector3(w.x, 0, w.z).applyMatrix4(root.matrixWorld);
        target = sampler(world.x, world.z) - root.position.y;
      }
      const k = 1 - Math.exp(-dt * 9);
      state.suspension[i] += (target - state.suspension[i]) * k;
      const y = THREE.MathUtils.clamp(state.suspension[i], -S.suspensionTravel, S.suspensionTravel);
      w.pivot.position.y = S.axleY + y;
      avg += y * 0.25;
      pitchSum += (w.z > 0 ? 1 : -1) * y;
      rollSum += (w.x > 0 ? 1 : -1) * y;
    }
    unsprung.position.y = 0;

    const targetPitch = THREE.MathUtils.clamp(-finite(drive.accel) * 0.012 - pitchSum * 0.32, -0.12, 0.12);
    const targetRoll = THREE.MathUtils.clamp(finite(drive.lateral) * 0.016 + rollSum * 0.3, -0.12, 0.12);
    sprung.rotation.x += (targetPitch - sprung.rotation.x) * (1 - Math.exp(-dt * 6));
    sprung.rotation.z += (targetRoll - sprung.rotation.z) * (1 - Math.exp(-dt * 6));
    sprung.position.y += (avg * 0.6 - sprung.position.y) * (1 - Math.exp(-dt * 8));
  }

  return {
    root,
    sprung,
    wheels,
    materials,
    state,
    setLights,
    update,
    spec: S,
  };
}
