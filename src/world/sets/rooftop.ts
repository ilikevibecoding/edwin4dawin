import * as THREE from 'three';
import { skyEnvTexture } from '../../engine/Textures';
import { PlanarReflection } from '../../engine/Reflection';
import { Rng } from '../../engine/math';
import {
  concreteMaterial,
  emissiveMaterial,
  glowMaterial,
  lightShaftMaterial,
  metalMaterial,
  paintedMetal,
  wetGroundMaterial,
} from '../Materials';
import { facade, hvacUnit, neonSign, railing, waterTank, holoBillboard, droneUnit } from '../props';
import { MistLayers, Rain } from '../Weather';
import { collectTimed, disposeTree, GameSet, mark, SetContext } from './types';

/**
 * Chapters 2 and 4: the tower rooftop. Hostage standoff, then the mirror beat.
 * Everything is built to keep the city burning away behind the actors.
 */
export function buildRooftop(ctx: SetContext): GameSet {
  const root = new THREE.Group();
  const rng = new Rng(0x70f);

  const env = skyEnvTexture(ctx.renderer, {
    top: 0x04070b,
    horizon: 0x1b3646,
    ground: 0x0a0f14,
    glow: 0x3f86ad,
  });

  // ------------------------------------------------------------------ deck
  const reflection = new PlanarReflection(0, 704, 396);
  const deckMat = wetGroundMaterial(reflection.renderTarget.texture);
  deckMat.uniforms.uRepeat.value = 9;
  deckMat.uniforms.uFogColor.value = new THREE.Color(0x0b141c);
  deckMat.uniforms.uAmbient.value = new THREE.Color(0x35566a);
  deckMat.uniforms.uReflectStrength.value = 0.95;
  (deckMat.uniforms.uTextureMatrix.value as THREE.Matrix4) = reflection.textureMatrix;
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(24, 22), deckMat);
  deck.rotation.x = -Math.PI / 2;
  root.add(deck);
  reflection.exclude(deck);

  // Parapet around the edge, with a gap at the ledge where the standoff happens.
  const parapetMat = concreteMaterial(5);
  parapetMat.color = new THREE.Color(0x565b60);
  const parapets: [number, number, number, number, number][] = [
    [24, 0.95, 0.45, 0, -11],
    [22, 0.95, 0.45, Math.PI / 2, 0],
    [22, 0.95, 0.45, -Math.PI / 2, 0],
  ];
  const wallBack = new THREE.Mesh(new THREE.BoxGeometry(parapets[0][0], parapets[0][1], parapets[0][2]), parapetMat);
  wallBack.position.set(0, 0.48, -11);
  wallBack.castShadow = true;
  wallBack.receiveShadow = true;
  root.add(wallBack);
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(22, 0.95, 0.45), parapetMat);
    wall.position.set(side * 12, 0.48, 0);
    wall.rotation.y = Math.PI / 2;
    wall.castShadow = true;
    wall.receiveShadow = true;
    root.add(wall);
  }
  // Front edge: two stubs leaving a gap centred at x = 0.6.
  for (const [x, w] of [
    [-7.2, 9.6],
    [7.6, 8.8],
  ] as const) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 0.95, 0.45), parapetMat);
    wall.position.set(x, 0.48, 11);
    wall.castShadow = true;
    wall.receiveShadow = true;
    root.add(wall);
  }
  const coping = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.12, 0.62), metalMaterial(0x6b7278, 0.5));
  coping.position.set(0.6, 0.32, 11);
  coping.receiveShadow = true;
  root.add(coping);

  // Roof clutter.
  const hvac1 = hvacUnit(2.0, 1.3, 1.8);
  hvac1.position.set(-6.2, 0, -5.2);
  hvac1.rotation.y = 0.2;
  root.add(hvac1);
  const hvac2 = hvacUnit(1.5, 1.0, 1.5);
  hvac2.position.set(6.4, 0, -6.4);
  hvac2.rotation.y = -0.4;
  root.add(hvac2);
  const tank = waterTank();
  tank.position.set(-7.8, 0, 3.6);
  root.add(tank);

  const doorHouse = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.7, 2.6), concreteMaterial(3));
  doorHouse.position.set(7.6, 1.35, 4.4);
  doorHouse.castShadow = true;
  doorHouse.receiveShadow = true;
  root.add(doorHouse);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 0.1), paintedMetal(0x262a2f, 0.45));
  door.position.set(6.9, 1.05, 4.4);
  door.rotation.y = Math.PI / 2;
  root.add(door);
  const doorSpill = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.4), glowMaterial(0xd8ecf8, 0.3, 2.0));
  doorSpill.position.set(6.2, 0.02, 4.4);
  doorSpill.rotation.x = -Math.PI / 2;
  root.add(doorSpill);
  const doorLight = new THREE.PointLight(0xd8ecf8, 36, 9, 2);
  doorLight.position.set(6.4, 1.6, 4.4);
  root.add(doorLight);

  const rail = railing(5.2, 1.05);
  rail.position.set(-3.4, 0, 8.6);
  root.add(rail);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 7.5, 8), metalMaterial(0x3c4247, 0.65));
  mast.position.set(-9.6, 3.75, -8.2);
  mast.castShadow = true;
  root.add(mast);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), emissiveMaterial(0xff3030, 4));
  beacon.position.set(-9.6, 7.6, -8.2);
  root.add(beacon);
  const beaconHalo = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), glowMaterial(0xff3030, 0.5, 2.4));
  beaconHalo.position.copy(beacon.position);
  root.add(beaconHalo);

  const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.1, 14), metalMaterial(0x4a5056, 0.7));
  vent.position.set(3.4, 0.55, -8.0);
  vent.castShadow = true;
  root.add(vent);
  const ventSteam = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 3.4), glowMaterial(0xa8c0d0, 0.1, 2.6));
  ventSteam.position.set(3.4, 2.0, -8.0);
  root.add(ventSteam);

  // ---------------------------------------------------------------- skyline
  for (let i = 0; i < 16; i++) {
    const h = rng.range(14, 62);
    const b = facade(rng.range(8, 18), h, 10, {
      color: 0x252b31,
      seed: 90 + i,
      windowRepeat: [2, Math.max(1, Math.round(h / 9))],
    });
    const ang = rng.range(-Math.PI * 0.95, Math.PI * 0.95);
    const dist = rng.range(26, 62);
    b.position.set(Math.sin(ang) * dist, -rng.range(6, 22), -Math.cos(ang) * dist + 6);
    root.add(b);
  }
  const bill = holoBillboard('BECOME FREE', 0x6fd0ff, 8, 11, 4, 0);
  bill.position.set(-22, 12, -26);
  bill.rotation.y = 0.5;
  root.add(bill);
  const sign = neonSign('DETROIT', 0xff5f8f, { width: 9, height: 2.1, light: 0 });
  sign.position.set(24, 9, -22);
  sign.rotation.y = -0.7;
  root.add(sign);

  const drone = droneUnit();
  drone.position.set(-4.5, 5.4, 6);
  drone.scale.setScalar(1.3);
  root.add(drone);

  // ---------------------------------------------------------------- lighting
  const moon = new THREE.DirectionalLight(0xa8c8e8, 4.6);
  moon.position.set(9, 16, 12);
  moon.castShadow = true;
  moon.shadow.mapSize.set(768, 768);
  moon.shadow.camera.near = 1;
  moon.shadow.camera.far = 50;
  moon.shadow.camera.left = -14;
  moon.shadow.camera.right = 14;
  moon.shadow.camera.top = 14;
  moon.shadow.camera.bottom = -14;
  moon.shadow.bias = -0.0008;
  moon.shadow.normalBias = 0.03;
  root.add(moon);

  const cityUp = new THREE.PointLight(0x4c9ac4, 95, 34, 2);
  cityUp.position.set(0.6, -3.5, 14);
  root.add(cityUp);

  const rimNeon = new THREE.SpotLight(0xff5f8f, 85, 32, 0.9, 0.8, 2);
  rimNeon.position.set(14, 6, -10);
  rimNeon.target.position.set(0, 1.4, 4);
  root.add(rimNeon, rimNeon.target);

  const ambient = new THREE.HemisphereLight(0x3a6480, 0x121a22, 5.5);
  root.add(ambient);

  const searchlight = new THREE.Mesh(new THREE.ConeGeometry(2.4, 26, 20, 1, true), lightShaftMaterial(0xbfe0f4, 0.09));
  searchlight.position.set(-14, 12, -18);
  searchlight.rotation.set(0.5, 0, 0.4);
  searchlight.renderOrder = 3;
  root.add(searchlight);

  const rain = new Rain(2800, 34, { color: 0xaad0ec, length: 0.72, wind: 0.2 });
  root.add(rain.mesh);
  const mist = new MistLayers(7, 28, 0x33566c, 0.08);
  mist.group.position.y = 0.3;
  root.add(mist.group);

  const timed = collectTimed(root);

  return {
    id: 'rooftop',
    root,
    env,
    envIntensity: 4.2,
    fog: new THREE.FogExp2(0x102431, 0.018),
    rain,
    mist,
    reflection,
    marks: {
      ledge: mark(0.6, 0, 10.1),
      ledgeTop: mark(0.6, 0.55, 11.0),
      approach: mark(0.2, 0, 6.4),
      approachClose: mark(0.4, 0, 8.0),
      door: mark(6.2, 0, 4.4),
      partner: mark(3.4, 0, 5.6),
      centre: mark(0, 0, 2.0),
      wide: mark(-4.0, 0, 4.0),
      mirror: mark(-7.6, 0, 6.6),
    },
    actorLights: { key: 0xcfe0f4, keyIntensity: 7.5, rim: 0xff5f8f, rimIntensity: 22, fill: 0x7fa0bc, fillIntensity: 1.0, keySide: 1 },
    post: {
      exposure: 1.02,
      bloomStrength: 0.6,
      bloomThreshold: 0.95,
      anamorphic: 0.45,
      rain: 0.6,
      grain: 0.038,
      saturation: 1.05,
      contrast: 1.06,
      aoStrength: 0.6,
      aoRadius: 0.32,
      vignette: 0.58,
      lift: new THREE.Color(0.012, 0.022, 0.04),
      gain: new THREE.Color(1.0, 1.0, 1.05),
    },
    update(dt, time, camera) {
      for (const m of timed) m.uniforms.uTime.value = time;
      rain.update(time, camera.position);
      mist.update(time);
      const blink = Math.sin(time * 1.7) > 0.6 ? 4 : 0.4;
      (beacon.material as THREE.MeshBasicMaterial).color.setRGB(blink, blink * 0.12, blink * 0.12);
      drone.position.x = -4.5 + Math.sin(time * 0.28) * 3.4;
      drone.position.y = 5.4 + Math.sin(time * 0.44) * 0.4;
      searchlight.rotation.z = 0.4 + Math.sin(time * 0.12) * 0.25;
      reflection.update(ctx.renderer, ctx.scene, camera);
      void dt;
    },
    dispose() {
      disposeTree(root);
      reflection.dispose();
      env.dispose();
    },
  };
}
