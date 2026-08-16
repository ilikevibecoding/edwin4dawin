import * as THREE from 'three';
import { createWheelDust } from '../dust.js';
import { group } from '../geo.js';
import { buildBody } from './body.js';
import { buildDetails } from './details.js';
import { buildInterior } from './interior.js';
import { createVehicleMaterials } from './materials.js';
import { SPEC as S } from './spec.js';
import { buildAxles, buildWheel } from './wheels.js';

export function createVehicle(env) {
  const materials = createVehicleMaterials(env);
  const root = group('jeep');

  const sprung = group('sprung');
  root.add(sprung);
  sprung.add(buildBody(materials));
  sprung.add(buildDetails(materials));
  const cabin = buildInterior(materials);
  sprung.add(cabin);

  const unsprung = group('unsprung');
  root.add(unsprung);
  unsprung.add(buildAxles(materials));

  const wheels = S.wheelPositions.map((wp) => {
    const { group: wg, spin } = buildWheel(materials, Math.sign(wp.x));
    const pivot = new THREE.Group();
    pivot.position.set(wp.x, S.axleY, wp.z);
    pivot.add(wg);
    unsprung.add(pivot);
    return { ...wp, pivot, spin };
  });

  const cabinFill = new THREE.PointLight(0xffe2c0, 3.6, 3.4, 1.2);
  cabinFill.position.set(0.05, 1.52, 0.12);
  cabinFill.castShadow = false;
  sprung.add(cabinFill);

  const wellFill = new THREE.PointLight(0xffc888, 1.6, 4.5, 1.2);
  wellFill.position.set(0.9, 0.55, 1.15);
  wellFill.castShadow = false;
  sprung.add(wellFill);

  const contact = new THREE.Mesh(
    new THREE.CircleGeometry(1.35, 24),
    new THREE.MeshBasicMaterial({
      color: 0x1a120c,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.03;
  contact.scale.set(1.15, 1.7, 1);
  contact.renderOrder = 1;
  root.add(contact);

  const lamps = new THREE.Group();
  sprung.add(lamps);
  const beams = [];
  for (const sx of [-1, 1]) {
    const spot = new THREE.SpotLight(0xfff2d0, 0, 28, 0.48, 0.55, 0.45);
    spot.position.set(sx * 0.62, 0.96, S.hoodFrontZ + 0.22);
    spot.target.position.set(sx * 0.8, 0.4, S.hoodFrontZ + 18);
    lamps.add(spot, spot.target);
    beams.push(spot);
  }
  const bar = new THREE.SpotLight(0xf4f7ff, 0, 30, 0.4, 0.4, 0.4);
  bar.position.set(0, S.roofY + 0.12, 0.7);
  bar.target.position.set(0, 0.6, 22);
  lamps.add(bar, bar.target);

  const localBox = new THREE.Box3(new THREE.Vector3(-1.05, 0, -2.2), new THREE.Vector3(1.05, 1.95, 2.25));
  const worldBox = localBox.clone();
  worldBox.userData = { vehicle: true };
  const colliders = [worldBox];
  const dust = createWheelDust();
  root.add(dust.mesh);

  const state = { lightsOn: false, wheelAngle: 0 };

  function setLights(on) {
    state.lightsOn = on;
    for (const b of beams) b.intensity = on ? 10 : 0;
    bar.intensity = on ? 14 : 0;
    materials.headlight.emissiveIntensity = on ? 6.2 : 1.8;
    materials.led.emissiveIntensity = on ? 4.5 : 1.2;
    materials.tail.emissiveIntensity = on ? 3.8 : 1.5;
    materials.amber.emissiveIntensity = on ? 3.0 : 1.4;
  }
  setLights(false);

  function syncCollider() {
    root.updateMatrixWorld(true);
    worldBox.copy(localBox).applyMatrix4(root.matrixWorld);
    worldBox.userData = { vehicle: true };
  }

  function update(dt, drive = {}) {
    const speed = drive.speed ?? 0;
    const steer = drive.steer ?? 0;
    if (drive.x != null) {
      root.position.set(drive.x, drive.y ?? 0, drive.z ?? 0);
      root.rotation.order = 'YXZ';
      root.rotation.y = drive.heading ?? 0;
      root.rotation.x = drive.pitch ?? 0;
      root.rotation.z = drive.roll ?? 0;
    }
    sprung.position.y = Math.sin(performance.now() * 0.012) * Math.min(0.018, Math.abs(speed) * 0.0014);
    state.wheelAngle -= (speed * dt) / S.wheelRadius;
    for (const w of wheels) {
      w.spin.rotation.x = state.wheelAngle;
      if (w.steer) w.pivot.rotation.y = steer;
    }
    if (cabin.userData.steering) {
      cabin.userData.steering.rotation.x = -0.38;
      cabin.userData.steering.rotation.z = -steer * 2.6;
    }
    dust.update(dt, speed);
    syncCollider();
  }

  return {
    root,
    materials,
    wheels,
    cabin,
    colliders,
    state,
    setLights,
    update,
    driverEye: cabin.userData.driverEye,
  };
}
