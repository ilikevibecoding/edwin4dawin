import * as THREE from 'three';
import { skyEnvTexture } from '../../engine/Textures';
import { PlanarReflection } from '../../engine/Reflection';
import { Rng } from '../../engine/math';
import { concreteMaterial, emissiveMaterial, glowMaterial, wetGroundMaterial, paintedMetal } from '../Materials';
import {
  car,
  dumpster,
  facade,
  fireEscape,
  holoBillboard,
  neonSign,
  policeTape,
  streetLamp,
  trashBags,
  droneUnit,
  graffiti,
  windowUnit,
} from '../props';
import { MistLayers, Rain } from '../Weather';
import { collectTimed, disposeTree, GameSet, mark, SetContext } from './types';

/**
 * Chapter 1 exterior: a rain-hammered Detroit street outside the Ferndale tower.
 * Wet asphalt with planar reflections is the hero of the shot.
 */
export function buildStreet(ctx: SetContext): GameSet {
  const root = new THREE.Group();
  const rng = new Rng(0xa11e5);

  const env = skyEnvTexture(ctx.renderer, {
    top: 0x05080d,
    horizon: 0x16303f,
    ground: 0x0a1016,
    glow: 0x2f6d8c,
  });

  // ------------------------------------------------------------------ ground
  const reflection = new PlanarReflection(0, 768, 432);
  const groundMat = wetGroundMaterial(reflection.renderTarget.texture);
  groundMat.uniforms.uRepeat.value = 14;
  groundMat.uniforms.uFogColor.value = new THREE.Color(0x0b1720);
  groundMat.uniforms.uAmbient.value = new THREE.Color(0x4a7794);
  (groundMat.uniforms.uTextureMatrix.value as THREE.Matrix4) = reflection.textureMatrix;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 90, 1, 1), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = false;
  root.add(ground);
  reflection.exclude(ground);

  // Sidewalks on both sides of the roadway.
  const sidewalkMat = concreteMaterial(8);
  sidewalkMat.color = new THREE.Color(0x5c6167);
  for (const side of [-1, 1]) {
    const walk = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.16, 60), sidewalkMat);
    walk.position.set(side * 8.4, 0.08, -6);
    walk.receiveShadow = true;
    root.add(walk);
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 60), concreteMaterial(6));
    curb.position.set(side * 5.2, 0.1, -6);
    curb.receiveShadow = true;
    root.add(curb);
  }

  // ---------------------------------------------------------------- facades
  const leftTower = facade(11, 26, 9, { color: 0x4a4f55, clutter: true, seed: 3, windowRepeat: [3, 6] });
  leftTower.position.set(-16.5, 0, -12);
  root.add(leftTower);

  const rightBlock = facade(9, 15, 8, { color: 0x53565b, clutter: true, seed: 8, windowRepeat: [2, 4] });
  rightBlock.position.set(15.5, 0, -14);
  rightBlock.rotation.y = Math.PI;
  root.add(rightBlock);

  const rightBlock2 = facade(10, 21, 8, { color: 0x44484d, clutter: true, seed: 12, windowRepeat: [3, 5] });
  rightBlock2.position.set(15.8, 0, 4);
  rightBlock2.rotation.y = Math.PI;
  root.add(rightBlock2);

  // Hero building: the entrance the scene is built around.
  const entrance = new THREE.Group();
  entrance.position.set(-11.2, 0, 2.5);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(9, 22, 8), concreteMaterial(6));
  wall.position.set(0, 11, -4.2);
  wall.castShadow = true;
  wall.receiveShadow = true;
  entrance.add(wall);
  // Recessed doorway with a lit lobby behind glass.
  const lobby = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.9), emissiveMaterial(0x9fd2e8, 0.55));
  lobby.position.set(0, 1.55, -0.16);
  entrance.add(lobby);
  const doorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(3.9, 3.3, 0.3),
    paintedMetal(0x1c2026, 0.4),
  );
  doorFrame.position.set(0, 1.65, -0.02);
  entrance.add(doorFrame);
  const doorGlass = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 2.8), new THREE.MeshPhysicalMaterial({
    color: 0x18333f,
    roughness: 0.1,
    metalness: 0,
    transparent: true,
    opacity: 0.35,
    clearcoat: 1,
  }));
  doorGlass.position.set(0, 1.6, 0.14);
  entrance.add(doorGlass);
  const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 4.6), glowMaterial(0x8ecfea, 0.3, 2.2));
  doorGlow.position.set(0, 1.9, 0.2);
  entrance.add(doorGlow);
  const doorLight = new THREE.PointLight(0xbfe4f4, 48, 12, 2);
  doorLight.position.set(0, 2.6, 1.4);
  entrance.add(doorLight);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.18, 1.9), paintedMetal(0x191d22, 0.45));
  canopy.position.set(0, 3.5, 0.85);
  canopy.castShadow = true;
  entrance.add(canopy);
  const address = neonSign('FERNDALE', 0x66e0ff, { width: 3.0, height: 0.5, light: 0 });
  address.position.set(0, 4.15, 0.7);
  entrance.add(address);
  for (let f = 0; f < 4; f++) {
    const w = windowUnit(1.5, 1.7, f % 2 === 0 ? 0x3a6a86 : 0x6a5a3a, 0);
    w.position.set(-2.4 + (f % 2) * 4.8, 6.4 + Math.floor(f / 2) * 4.2, 0.06);
    entrance.add(w);
  }
  root.add(entrance);

  // Distant skyline.
  for (let i = 0; i < 9; i++) {
    const h = rng.range(16, 46);
    const b = facade(rng.range(7, 14), h, 8, {
      color: 0x2c3238,
      seed: 40 + i,
      windowRepeat: [2, Math.max(1, Math.round(h / 9))],
    });
    b.position.set(rng.range(-46, 46), 0, -44 - rng.range(0, 26));
    root.add(b);
  }

  // ------------------------------------------------------------------- neon
  const signs: [string, number, number, number, number, boolean][] = [
    ['NOODLE', 0xff3b6b, 15.0, 4.6, -8.5, true],
    ['24H', 0x46f0c0, 15.0, 8.2, 1.5, false],
    ['LIQUOR', 0xffb02e, -11.6, 7.2, 9.5, false],
    ['CYBERLIFE', 0x59c8ff, 15.0, 12.4, -18.0, false],
  ];
  for (const [text, color, x, y, z, vertical] of signs) {
    const sign = neonSign(text, color, { vertical, width: vertical ? 0.8 : 2.6, height: vertical ? 3.0 : 0.66, light: 0 });
    sign.position.set(x, y, z);
    sign.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;
    root.add(sign);
  }

  const holo = holoBillboard('BECOME PERFECT', 0x7fd8ff, 4.2, 6.4, 2, 0);
  holo.position.set(14.6, 9.5, -6);
  holo.rotation.y = -Math.PI / 2;
  root.add(holo);

  const holo2 = holoBillboard('KAMSKI', 0xff5f9e, 3.0, 4.4, 7, 0);
  holo2.position.set(-11.2, 13.5, 10.6);
  holo2.rotation.y = Math.PI / 2 - 0.2;
  root.add(holo2);

  // -------------------------------------------------------------- set dress
  const lamp1 = streetLamp(5.6, 0xffd2a0);
  lamp1.position.set(6.6, 0.16, -2);
  lamp1.rotation.y = Math.PI;
  root.add(lamp1);
  const lamp2 = streetLamp(5.6, 0xffd2a0);
  lamp2.position.set(-6.6, 0.16, -16);
  root.add(lamp2);

  const cruiser = car(0x0f1319, true);
  cruiser.position.set(2.6, 0, 5.4);
  cruiser.rotation.y = -0.24;
  root.add(cruiser);

  const parked = car(0x232a33, false);
  parked.position.set(-2.4, 0, -13.5);
  parked.rotation.y = Math.PI + 0.06;
  root.add(parked);

  const bin = dumpster();
  bin.position.set(-8.9, 0.16, -8.5);
  bin.rotation.y = 0.3;
  root.add(bin);
  const bags = trashBags(6, 9);
  bags.position.set(-8.2, 0.16, -6.6);
  root.add(bags);

  const escape = fireEscape(3, 2.6);
  escape.position.set(15.2, 0, -6);
  escape.rotation.y = -Math.PI / 2;
  root.add(escape);

  const tape = policeTape(6.4);
  tape.position.set(-9.4, 1.1, 4.2);
  tape.rotation.y = 0.12;
  root.add(tape);
  const tape2 = policeTape(6.4);
  tape2.position.set(-9.4, 0.72, 4.3);
  tape2.rotation.y = -0.06;
  root.add(tape2);

  const tag = graffiti('rA9', 0xe8e2d0, 1.6, 0.9);
  tag.position.set(-6.68, 1.9, -9.2);
  tag.rotation.y = Math.PI / 2;
  root.add(tag);

  const drone = droneUnit();
  drone.position.set(3.5, 7.2, -6);
  root.add(drone);

  // Steam vent for atmosphere.
  const vent = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.6), glowMaterial(0x9fb8c8, 0.12, 2.4));
  vent.position.set(4.6, 1.7, -9.5);
  root.add(vent);

  // ---------------------------------------------------------------- lighting
  const moon = new THREE.DirectionalLight(0x9fc4e8, 7.5);
  moon.position.set(9, 19, 17);
  moon.castShadow = true;
  moon.shadow.mapSize.set(768, 768);
  moon.shadow.camera.near = 1;
  moon.shadow.camera.far = 60;
  moon.shadow.camera.left = -16;
  moon.shadow.camera.right = 16;
  moon.shadow.camera.top = 16;
  moon.shadow.camera.bottom = -16;
  moon.shadow.bias = -0.0009;
  moon.shadow.normalBias = 0.03;
  root.add(moon);

  const bounce = new THREE.HemisphereLight(0x3a6280, 0x101a22, 11.0);
  root.add(bounce);

  // Warm practical from the lobby doorway, cool neon rim from across the street.
  const rim = new THREE.SpotLight(0x59c8ff, 160, 30, 0.95, 0.6, 2);
  rim.position.set(11.5, 7.5, -8);
  rim.target.position.set(-5, 1.5, 3);
  root.add(rim, rim.target);

  const rain = new Rain(1500, 36, { color: 0xa8cfe8, length: 0.62, wind: 0.14 });
  root.add(rain.mesh);
  const mist = new MistLayers(3, 30, 0x2b4a5e, 0.075);
  mist.group.position.y = 0.2;
  root.add(mist.group);

  const timed = collectTimed(root);
  const flashers: THREE.PointLight[] = [];
  cruiser.traverse((o) => {
    if ((o as THREE.PointLight).isPointLight) flashers.push(o as THREE.PointLight);
  });

  return {
    id: 'street',
    root,
    env,
    envIntensity: 7.0,
    fog: new THREE.FogExp2(0x0f2130, 0.02),
    rain,
    mist,
    reflection,
    marks: {
      door: mark(-11.2, 0, 3.2),
      doorFront: mark(-9.6, 0, 5.2),
      sidewalk: mark(-8.6, 0.16, 6.6),
      cruiser: mark(2.2, 0, 6.0),
      streetCentre: mark(-3.5, 0, 4.0),
      partner: mark(-7.2, 0.16, 7.4),
      wide: mark(0, 0, 14),
    },
    actorLights: { key: 0xdbe8f8, keyIntensity: 8.0, rim: 0x59c8ff, rimIntensity: 24, fill: 0x7fa8c8, fillIntensity: 1.0, keySide: -1 },
    post: {
      exposure: 1.0,
      bloomStrength: 0.55,
      bloomThreshold: 0.95,
      anamorphic: 0.42,
      rain: 0.5,
      grain: 0.038,
      saturation: 1.08,
      contrast: 1.07,
      aoStrength: 0.6,
      lift: new THREE.Color(0.014, 0.024, 0.042),
      gain: new THREE.Color(1.0, 1.0, 1.04),
    },
    update(_dt, time, camera) {
      for (const m of timed) m.uniforms.uTime.value = time;
      rain.update(time, camera.position);
      mist.update(time);
      // Cruiser strobes.
      const t = time * 2.2;
      flashers.forEach((l, i) => {
        const phase = (t + i * 0.5) % 2;
        l.intensity = phase < 0.14 || (phase > 0.24 && phase < 0.38) ? 26 : 1.5;
      });
      drone.position.x = 3.5 + Math.sin(time * 0.32) * 3.2;
      drone.position.y = 7.2 + Math.sin(time * 0.51) * 0.35;
      drone.rotation.y = Math.sin(time * 0.32) * 0.4;
      reflection.update(ctx.renderer, ctx.scene, camera);
    },
    dispose() {
      disposeTree(root);
      reflection.dispose();
      env.dispose();
    },
  };
}
