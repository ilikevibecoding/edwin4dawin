import * as THREE from 'three';
import { buildHullGroup } from './hull.js';
import { billowSail, buildRig, waveFlag } from './rig.js';
import { buildDetails } from './details.js';
import { mergeStatic } from './merge.js';
import { waveHeight } from '../waves.js';

/**
 * Assembles the ship and gives it a light-weight sailing model: sail area sets
 * the speed, the rudder turns the hull, and four probe points on the waterline
 * make it rise, pitch and roll with the sea underneath it.
 */

const MAX_SPEED = 9.5; // m/s with everything set
const PROBE_FORE = 13.5;
const PROBE_AFT = -13.5;
const PROBE_SIDE = 4.2;
const RELOAD_TIME = 2.2;

export function createShip(materials, { onCannonFire } = {}) {
  const root = new THREE.Group();
  root.name = 'ship';
  root.rotation.order = 'YXZ';

  const hull = buildHullGroup(materials);
  const rig = buildRig(materials);
  const details = buildDetails(materials);
  root.add(hull, rig.group, details.group);

  root.traverse((object) => {
    if (object.isMesh) object.castShadow = true;
  });
  mergeStatic(root);

  const state = {
    speed: 0,
    heading: 0,
    rudder: 0,
    sailSet: 0.55,
    heel: 0,
    reload: 0,
  };

  // Canvas simulation is the one costly per-frame job; slow machines run it at
  // a fixed rate instead of every frame.
  let sailInterval = 0;
  let sailTimer = 0;

  function setQuality(tier) {
    sailInterval = tier.sailHz > 0 ? 1 / tier.sailHz : 0;
    details.lanterns.forEach((lantern, index) => {
      lantern.userData.light.visible = index < tier.lanterns;
    });
  }

  const forward = new THREE.Vector3(0, 0, 1);
  const muzzleWorld = new THREE.Vector3();
  const gunWorld = new THREE.Vector3();
  const probe = new THREE.Vector3();

  function sampleHeight(localX, localZ, elapsed) {
    const sin = Math.sin(state.heading);
    const cos = Math.cos(state.heading);
    probe.set(
      root.position.x + localX * cos + localZ * sin,
      0,
      root.position.z - localX * sin + localZ * cos,
    );
    return waveHeight(probe.x, probe.z, elapsed);
  }

  function fire(side) {
    if (state.reload > 0) return false;
    state.reload = RELOAD_TIME;
    let fired = 0;
    for (const gun of details.cannons) {
      const matches = side === 'both' || (side === 'port' ? gun.userData.side < 0 : gun.userData.side > 0);
      if (!matches) continue;
      gun.userData.recoil = 1;
      fired++;
      if (onCannonFire) {
        gun.userData.muzzle.getWorldPosition(muzzleWorld);
        gun.getWorldPosition(gunWorld);
        onCannonFire(muzzleWorld.clone(), muzzleWorld.clone().sub(gunWorld).normalize());
      }
    }
    return fired > 0;
  }

  function update(dt, elapsed, input) {
    // ---- Sail trim and steering ------------------------------------------
    state.sailSet = THREE.MathUtils.clamp(state.sailSet + input.throttle * dt * 0.55, 0, 1);
    const targetSpeed = state.sailSet * MAX_SPEED;
    state.speed += (targetSpeed - state.speed) * Math.min(dt * 0.42, 1);
    if (input.brake) state.speed *= Math.max(0, 1 - dt * 1.6);

    state.rudder += (input.steer - state.rudder) * Math.min(dt * 3.2, 1);
    const steerAuthority = THREE.MathUtils.clamp(Math.abs(state.speed) / 3.2, 0.12, 1);
    state.heading += state.rudder * steerAuthority * 0.42 * dt * Math.sign(state.speed || 1);

    const sin = Math.sin(state.heading);
    const cos = Math.cos(state.heading);
    forward.set(sin, 0, cos);
    root.position.x += forward.x * state.speed * dt;
    root.position.z += forward.z * state.speed * dt;
    root.rotation.y = state.heading;

    // ---- Sit on the water --------------------------------------------------
    const bow = sampleHeight(0, PROBE_FORE, elapsed);
    const stern = sampleHeight(0, PROBE_AFT, elapsed);
    const port = sampleHeight(-PROBE_SIDE, 0, elapsed);
    const starboard = sampleHeight(PROBE_SIDE, 0, elapsed);

    // Sit her a little into the water rather than perched on top of it.
    root.position.y = (bow + stern + port + starboard) * 0.25 - 0.34;
    const pitch = -Math.atan2(bow - stern, PROBE_FORE - PROBE_AFT);
    const waveRoll = Math.atan2(starboard - port, PROBE_SIDE * 2);

    // Heel from the wind in the sails, plus a lean into each turn.
    const targetHeel = state.sailSet * 0.055 + state.rudder * steerAuthority * 0.09;
    state.heel += (targetHeel - state.heel) * Math.min(dt * 1.6, 1);

    root.rotation.x = pitch;
    root.rotation.z = waveRoll + state.heel;

    // ---- Animated fittings ------------------------------------------------
    const wind = 0.25 + state.sailSet * 0.75;
    sailTimer -= dt;
    const reshapeCanvas = sailInterval === 0 || sailTimer <= 0;
    if (reshapeCanvas) sailTimer = sailInterval;

    for (const sail of rig.sails) {
      sail.scale.y = THREE.MathUtils.lerp(0.07, 1, THREE.MathUtils.smoothstep(state.sailSet, 0, 0.25));
      sail.visible = state.sailSet > 0.02;
      if (sail.visible && reshapeCanvas) billowSail(sail, wind, elapsed);
    }
    if (reshapeCanvas) {
      for (const flag of rig.flags) waveFlag(flag, wind, elapsed);
    }

    details.wheel.rotation.z = -state.rudder * 2.6;
    details.rudder.rotation.y = -state.rudder * 0.45;

    state.reload = Math.max(0, state.reload - dt);
    for (const gun of details.cannons) {
      const recoil = gun.userData.recoil || 0;
      if (recoil > 0) {
        gun.userData.recoil = Math.max(0, recoil - dt * 1.7);
        const offset = Math.sin(gun.userData.recoil * Math.PI) * 0.55;
        gun.position.copy(gun.userData.home);
        gun.translateX(-offset);
      }
    }

    const flicker = 0.82 + Math.sin(elapsed * 7.3) * 0.12 + Math.sin(elapsed * 19.1) * 0.06;
    for (const lantern of details.lanterns) {
      lantern.userData.light.intensity = lantern.userData.baseIntensity * flicker;
    }
  }

  return {
    root,
    state,
    update,
    setQuality,
    fire,
    forward,
    cannons: details.cannons,
    sails: rig.sails,
    maxSpeed: MAX_SPEED,
  };
}
