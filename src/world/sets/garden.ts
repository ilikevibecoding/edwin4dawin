import * as THREE from 'three';
import { skyEnvTexture, T } from '../../engine/Textures';
import { PlanarReflection } from '../../engine/Reflection';
import { Rng } from '../../engine/math';
import {
  concreteMaterial,
  emissiveMaterial,
  glowMaterial,
  lightShaftMaterial,
  metalMaterial,
  wetGroundMaterial,
} from '../Materials';
import {
  barrelFire,
  chainlinkFence,
  crate,
  graffiti,
  neonSign,
  pipes,
  shippingContainer,
  stringLights,
} from '../props';
import { MistLayers, Rain } from '../Weather';
import { collectTimed, disposeTree, GameSet, mark, SetContext } from './types';

/**
 * Chapter 3: "The Garden" - a derelict freight hall where deviants shelter.
 * Broken roof lets rain and moonlight fall in shafts; firelight does the rest.
 */
export function buildGarden(ctx: SetContext): GameSet {
  const root = new THREE.Group();
  const rng = new Rng(0x9a2d);

  const env = skyEnvTexture(ctx.renderer, {
    top: 0x06090d,
    horizon: 0x1b2a33,
    ground: 0x0d0f11,
    glow: 0x8a5a2c,
  });

  // ------------------------------------------------------------------ ground
  const reflection = new PlanarReflection(0, 640, 360);
  const groundMat = wetGroundMaterial(reflection.renderTarget.texture);
  groundMat.uniforms.uRepeat.value = 10;
  groundMat.uniforms.uFogColor.value = new THREE.Color(0x0d1216);
  groundMat.uniforms.uAmbient.value = new THREE.Color(0x445764);
  groundMat.uniforms.uReflectStrength.value = 0.85;
  (groundMat.uniforms.uTextureMatrix.value as THREE.Matrix4) = reflection.textureMatrix;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(46, 46), groundMat);
  ground.rotation.x = -Math.PI / 2;
  root.add(ground);
  reflection.exclude(ground);

  // ------------------------------------------------------------------- shell
  const wallMat = concreteMaterial(6);
  wallMat.color = new THREE.Color(0x4a4741);
  const hallW = 20;
  const hallD = 26;
  const hallH = 9.5;
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(hallD, hallH, 0.4), wallMat);
    wall.position.set((side * hallW) / 2, hallH / 2, -2);
    wall.rotation.y = Math.PI / 2;
    wall.receiveShadow = true;
    root.add(wall);
  }
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(hallW, hallH, 0.4), wallMat);
  backWall.position.set(0, hallH / 2, -15);
  backWall.receiveShadow = true;
  root.add(backWall);

  // Roof with gaps; each gap gets a rain and light shaft.
  const roofMat = metalMaterial(0x30353a, 0.75);
  const gaps = [-5.5, 2.5];
  for (let i = 0; i < 5; i++) {
    const z = -14 + i * 6;
    if (gaps.some((g) => Math.abs(g - z) < 3)) continue;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(hallW, 0.3, 5.6), roofMat);
    panel.position.set(0, hallH, z);
    panel.receiveShadow = true;
    panel.castShadow = true;
    root.add(panel);
  }
  for (const gz of gaps) {
    const beamShaft = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 4.4, hallH + 1, 20, 1, true), lightShaftMaterial(0x8fb8d8, 0.1));
    beamShaft.position.set(rng.range(-3, 3), hallH / 2, gz);
    beamShaft.renderOrder = 3;
    root.add(beamShaft);
    if (gz > 0) {
      const moon = new THREE.SpotLight(0x9cc4e4, 90, 28, 0.55, 0.85, 2);
      moon.position.set(beamShaft.position.x, hallH + 2, gz);
      moon.target.position.set(beamShaft.position.x, 0, gz);
      root.add(moon, moon.target);
    }
  }
  // Trusses.
  for (let i = 0; i < 6; i++) {
    const truss = new THREE.Mesh(new THREE.BoxGeometry(hallW, 0.18, 0.18), metalMaterial(0x3c4247, 0.7));
    truss.position.set(0, hallH - 0.6, -14 + i * 5.2);
    truss.castShadow = true;
    root.add(truss);
  }

  // --------------------------------------------------------------- dressing
  const containers: [number, number, number, number][] = [
    [-6.4, -8.5, 0.1, 0x7a3b2e],
    [6.6, -9.5, -0.06, 0x2e5a6a],
    [7.4, -1.5, 0.04, 0x6a5f2e],
  ];
  for (const [x, z, rot, color] of containers) {
    const c = shippingContainer(color);
    c.position.set(x, 0, z);
    c.rotation.y = rot;
    root.add(c);
  }
  const stacked = shippingContainer(0x3f4a52, 2.4, 2.5, 6);
  stacked.position.set(-6.5, 2.5, -8.2);
  stacked.rotation.y = 0.06;
  root.add(stacked);

  const fire = barrelFire();
  fire.position.set(-2.6, 0, 1.4);
  root.add(fire);
  const flicker = (fire as THREE.Group & { flicker?: THREE.PointLight }).flicker!;

  const fire2 = barrelFire();
  fire2.position.set(5.2, 0, -6.4);
  root.add(fire2);
  const flicker2 = (fire2 as THREE.Group & { flicker?: THREE.PointLight }).flicker!;

  const lights = stringLights(9, 1.1, 14, 0xffb476);
  lights.position.set(0, 4.4, -3.2);
  root.add(lights);
  const lights2 = stringLights(7, 0.9, 11, 0xffc48a);
  lights2.position.set(1.5, 3.9, 3.4);
  lights2.rotation.y = 0.5;
  root.add(lights2);

  for (let i = 0; i < 9; i++) {
    const c = crate(rng.range(0.6, 1.0), 0x3a342c);
    c.position.set(rng.range(-8, 8), rng.range(0.3, 0.45), rng.range(-12, 6));
    c.rotation.y = rng.range(0, 3);
    root.add(c);
  }
  // A makeshift camp: pallets, blankets, a battered couch shape.
  const pallet = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1.2), new THREE.MeshStandardMaterial({ color: 0x3a2e22, roughness: 0.9, map: T.concreteAlbedo() }));
  pallet.position.set(-4.4, 0.06, 2.6);
  pallet.receiveShadow = true;
  root.add(pallet);
  const blanket = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 10), new THREE.MeshStandardMaterial({ color: 0x4a3a34, roughness: 0.95 }));
  blanket.scale.set(1.6, 0.4, 1.0);
  blanket.position.set(-4.4, 0.2, 2.5);
  blanket.castShadow = true;
  root.add(blanket);

  const fence = chainlinkFence(7, 2.8);
  fence.position.set(9.2, 0, 4.6);
  fence.rotation.y = -Math.PI / 2;
  root.add(fence);

  const pipeRun = pipes(3, 18, 0.09);
  pipeRun.position.set(0, 0, -14.4);
  root.add(pipeRun);

  const tags: [string, number, number, number, number][] = [
    ['rA9', 0xe8e2d0, -9.6, 2.4, -4],
    ['WE ARE ALIVE', 0x62e0b0, -9.6, 3.6, -9],
    ['FREE', 0xff6a8a, 9.6, 2.8, -6],
  ];
  for (const [text, color, x, y, z] of tags) {
    const tag = graffiti(text, color, text.length > 4 ? 4.4 : 2.0, 1.1);
    tag.position.set(x + (x < 0 ? 0.22 : -0.22), y, z);
    tag.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
    root.add(tag);
  }

  const sign = neonSign('GATE 7', 0x46e0c0, { width: 2.0, height: 0.5, light: 8 });
  sign.position.set(0, 4.2, -14.6);
  root.add(sign);

  // Entrance opening with city glow beyond.
  const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 5.6), emissiveMaterial(0x2c5a78, 0.35));
  doorGlow.position.set(0, 2.8, 11.0);
  doorGlow.rotation.y = Math.PI;
  root.add(doorGlow);
  const doorHalo = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), glowMaterial(0x3f7ea0, 0.18, 2.2));
  doorHalo.position.set(0, 3.0, 10.7);
  root.add(doorHalo);
  const doorLight = new THREE.PointLight(0x6aa8cc, 55, 18, 2);
  doorLight.position.set(0, 3.0, 9.0);
  root.add(doorLight);

  // ---------------------------------------------------------------- lighting
  const key = new THREE.DirectionalLight(0x9dc0dc, 3.4);
  key.position.set(-6, 16, 14);
  key.castShadow = true;
  key.shadow.mapSize.set(768, 768);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 44;
  key.shadow.camera.left = -14;
  key.shadow.camera.right = 14;
  key.shadow.camera.top = 14;
  key.shadow.camera.bottom = -14;
  key.shadow.bias = -0.0008;
  key.shadow.normalBias = 0.03;
  root.add(key);

  const warmFill = new THREE.PointLight(0xff9a4a, 34, 13, 2);
  warmFill.position.set(-2.6, 1.4, 1.4);
  root.add(warmFill);

  const ambient = new THREE.HemisphereLight(0x2e4450, 0x100f0e, 6.5);
  root.add(ambient);

  const rain = new Rain(900, 26, { color: 0x9cc0dc, length: 0.5, wind: 0.08 });
  rain.opacity = 0.75;
  root.add(rain.mesh);
  const mist = new MistLayers(3, 22, 0x3a4a54, 0.06);
  mist.group.position.y = 0.4;
  root.add(mist.group);

  const timed = collectTimed(root);

  return {
    id: 'garden',
    root,
    env,
    envIntensity: 5.0,
    fog: new THREE.FogExp2(0x111a20, 0.024),
    rain,
    mist,
    reflection,
    marks: {
      leader: mark(-1.2, 0, -1.0),
      player: mark(1.4, 0, 2.6),
      entrance: mark(0, 0, 8.4),
      fire: mark(-2.6, 0, 1.4),
      crowdA: mark(-5.4, 0, -3.4),
      crowdB: mark(4.4, 0, -2.2),
      centre: mark(0, 0, 0),
      exit: mark(0, 0, 10.2),
    },
    actorLights: { key: 0xffb072, keyIntensity: 7.5, rim: 0x9cc4e4, rimIntensity: 19, fill: 0x8a6a52, fillIntensity: 0.8, keySide: -1 },
    post: {
      exposure: 1.0,
      bloomStrength: 0.52,
      bloomThreshold: 0.95,
      anamorphic: 0.3,
      rain: 0.32,
      grain: 0.038,
      saturation: 1.06,
      contrast: 1.08,
      aoStrength: 0.6,
      aoRadius: 0.32,
      vignette: 0.6,
      lift: new THREE.Color(0.018, 0.02, 0.028),
      gain: new THREE.Color(1.04, 1.0, 0.97),
    },
    update(dt, time, camera) {
      for (const m of timed) m.uniforms.uTime.value = time;
      rain.update(time, camera.position);
      mist.update(time);
      const f = 24 + Math.sin(time * 9.1) * 4.2 + Math.sin(time * 21.7) * 2.4;
      flicker.intensity = f;
      flicker2.intensity = f * 0.85;
      warmFill.intensity = 34 + Math.sin(time * 7.3) * 4.2;
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
