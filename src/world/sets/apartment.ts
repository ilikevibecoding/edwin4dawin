import * as THREE from 'three';
import { skyEnvTexture, T } from '../../engine/Textures';
import { Rng } from '../../engine/math';
import {
  clothMaterial,
  concreteMaterial,
  emissiveMaterial,
  glowMaterial,
  glassMaterial,
  lightShaftMaterial,
  paintedMetal,
} from '../Materials';
import {
  bloodPool,
  ceilingLamp,
  chair,
  evidenceMarker,
  floorLamp,
  neonSign,
  rug,
  screen,
  sofa,
  table,
} from '../props';
import { MistLayers, Rain } from '../Weather';
import { roundedBox } from '../geom';
import { collectTimed, disposeTree, GameSet, mark, SetContext } from './types';

/**
 * Chapter 1 interior: the apartment where the deviant lost control.
 * Lit almost entirely by the window's city glow and one surviving lamp.
 */
export function buildApartment(ctx: SetContext): GameSet {
  const root = new THREE.Group();
  const rng = new Rng(0x4b1d);

  const env = skyEnvTexture(ctx.renderer, {
    top: 0x080c12,
    horizon: 0x1d3446,
    ground: 0x0d1114,
    glow: 0x3d6f8f,
  });

  const W = 8.4;
  const D = 7.6;
  const H = 2.9;

  // ------------------------------------------------------------------- shell
  const floorMat = new THREE.MeshPhysicalMaterial({
    color: 0x30251c,
    map: T.tile(),
    roughnessMap: T.tileRough(),
    normalMap: T.concreteNormal(),
    normalScale: new THREE.Vector2(0.3, 0.3),
    roughness: 0.55,
    clearcoat: 0.35,
    clearcoatRoughness: 0.4,
  });
  [floorMat.map, floorMat.roughnessMap, floorMat.normalMap].forEach((t) => t && t.repeat.set(3, 3));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);

  const wallMat = concreteMaterial(3);
  wallMat.color = new THREE.Color(0x4c4a46);
  const ceilMat = concreteMaterial(3);
  ceilMat.color = new THREE.Color(0x3a3a38);

  const mkWall = (w: number, h: number, pos: [number, number, number], rot: number) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.14), wallMat);
    wall.position.set(...pos);
    wall.rotation.y = rot;
    wall.receiveShadow = true;
    wall.castShadow = true;
    root.add(wall);
    return wall;
  };
  mkWall(W, H, [0, H / 2, -D / 2], 0); // back wall (with window cut in below)
  mkWall(D, H, [-W / 2, H / 2, 0], Math.PI / 2);
  mkWall(D, H, [W / 2, H / 2, 0], Math.PI / 2);
  mkWall(W, H, [0, H / 2, D / 2], 0);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, D), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = H;
  ceiling.receiveShadow = true;
  root.add(ceiling);

  // ----------------------------------------------------------------- window
  // Punch a glowing city window into the back wall by overlaying panes.
  const windowGroup = new THREE.Group();
  windowGroup.position.set(-1.1, 1.5, -D / 2 + 0.09);
  const cityGlow = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.3), emissiveMaterial(0x2c5f80, 0.75));
  windowGroup.add(cityGlow);
  // A hint of skyline inside the window.
  const skyline = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 2.3),
    new THREE.MeshBasicMaterial({
      map: T.windows(),
      transparent: true,
      opacity: 0.9,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  skyline.position.z = 0.01;
  skyline.scale.set(1, 1, 1);
  windowGroup.add(skyline);
  const paneMat = paintedMetal(0x1a1d21, 0.45);
  for (const x of [-2.1, -0.7, 0.7, 2.1]) {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.4, 0.1), paneMat);
    mullion.position.set(x, 0, 0.04);
    windowGroup.add(mullion);
  }
  for (const y of [-1.15, 1.15]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.09, 0.12), paneMat);
    rail.position.set(0, y, 0.04);
    windowGroup.add(rail);
  }
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.3), glassMaterial(0x0c1c26, 0.16));
  glass.position.z = 0.05;
  windowGroup.add(glass);
  root.add(windowGroup);

  // Rain running down the glass, seen from inside.
  const rain = new Rain(900, 12, { color: 0x8ab4d0, length: 0.4, wind: 0.05 });
  rain.mesh.position.set(-1.1, 1.4, -D / 2 - 0.9);
  rain.opacity = 0.55;
  root.add(rain.mesh);

  const curtainMat = clothMaterial(0x2b2a2c, 0.95, 0.12);
  for (const [x, w] of [
    [-3.4, 1.0],
    [1.35, 1.1],
  ] as const) {
    const curtain = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.32, w * 0.4, 2.5, 10, 1, true, 0, Math.PI), curtainMat);
    curtain.position.set(x, 1.45, -D / 2 + 0.28);
    curtain.rotation.y = x < 0 ? -0.3 : 0.3;
    curtain.castShadow = true;
    root.add(curtain);
  }

  // --------------------------------------------------------------- dressing
  const carpet = rug(3.2, 2.2, 0x2e2620);
  carpet.position.set(-0.6, 0.008, 0.4);
  root.add(carpet);

  const couch = sofa(2.3, 0x3b4046);
  couch.position.set(-2.0, 0, 1.5);
  couch.rotation.y = 0.42;
  root.add(couch);

  const coffee = table(1.25, 0.4, 0.66, 0x241b14);
  coffee.position.set(-0.5, 0, 0.35);
  coffee.rotation.y = 0.2;
  root.add(coffee);
  // Shattered glass on the table.
  for (let i = 0; i < 14; i++) {
    const shard = new THREE.Mesh(
      new THREE.CircleGeometry(rng.range(0.012, 0.04), 3),
      new THREE.MeshPhysicalMaterial({ color: 0xdff0ff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
    );
    shard.position.set(-0.5 + rng.range(-0.6, 0.6), 0.43, 0.35 + rng.range(-0.3, 0.3));
    shard.rotation.set(-Math.PI / 2 + rng.range(-0.3, 0.3), rng.range(0, 3), 0);
    root.add(shard);
  }

  const lamp = floorLamp(0xffc48a);
  lamp.position.set(-3.4, 0, 1.9);
  root.add(lamp);

  const tv = screen('NEWS 24', 0x6fc8ff, 1.5, 0.86);
  tv.position.set(3.9, 1.35, 0.4);
  tv.rotation.y = -Math.PI / 2;
  root.add(tv);
  const tvStand = table(1.7, 0.5, 0.45, 0x1e1a17);
  tvStand.position.set(3.85, 0, 0.4);
  tvStand.rotation.y = Math.PI / 2;
  root.add(tvStand);

  // Kitchen counter behind the living area.
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(3.0, 0.9, 0.66),
    new THREE.MeshPhysicalMaterial({ color: 0x22262b, roughness: 0.35, clearcoat: 0.4 }),
  );
  counter.position.set(2.2, 0.45, -2.9);
  counter.castShadow = true;
  counter.receiveShadow = true;
  root.add(counter);
  const counterTop = new THREE.Mesh(
    new THREE.BoxGeometry(3.1, 0.06, 0.72),
    new THREE.MeshPhysicalMaterial({ color: 0x9aa0a6, roughness: 0.22, metalness: 0.2, clearcoat: 0.6 }),
  );
  counterTop.position.set(2.2, 0.93, -2.9);
  root.add(counterTop);
  const underCabinet = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.5), glowMaterial(0xffd8a0, 0.18, 2.2));
  underCabinet.position.set(2.2, 1.5, -2.6);
  underCabinet.rotation.x = Math.PI / 2;
  root.add(underCabinet);
  const cabinetLight = new THREE.PointLight(0xffcf9a, 16, 6, 2);
  cabinetLight.position.set(2.2, 1.62, -2.6);
  root.add(cabinetLight);

  const diner = table(1.1, 0.74, 0.8, 0x241c15);
  diner.position.set(2.6, 0, -0.9);
  root.add(diner);
  const seat1 = chair(false);
  seat1.position.set(2.6, 0, -0.1);
  seat1.rotation.y = Math.PI;
  root.add(seat1);
  const seat2 = chair(false);
  seat2.position.set(2.55, 0, -1.75);
  root.add(seat2);
  // Overturned chair - sign of the struggle.
  const seat3 = chair(false);
  seat3.position.set(1.35, 0.22, 0.2);
  seat3.rotation.set(-1.35, 0.6, 0.2);
  root.add(seat3);

  // Evidence.
  const pool = bloodPool(0.62, 4);
  pool.position.set(0.35, 0.012, 1.35);
  root.add(pool);
  const smear = bloodPool(0.3, 9);
  smear.position.set(0.9, 0.012, 0.7);
  smear.scale.set(1.6, 1, 0.6);
  root.add(smear);
  [
    [0.35, 1.35],
    [1.1, 0.55],
    [-0.5, 0.42],
  ].forEach(([x, z], i) => {
    const m = evidenceMarker(i + 1);
    m.position.set(x + 0.28, 0.02, z + 0.25);
    root.add(m);
  });

  // Wall clutter and a knocked-out picture frame.
  const frame = new THREE.Mesh(roundedBox(0.5, 0.66, 0.04, 0.01, 2), paintedMetal(0x2a2119, 0.4));
  frame.position.set(-4.1, 1.85, 0.6);
  frame.rotation.set(0, Math.PI / 2, 0.22);
  root.add(frame);

  const ceilingFixture = ceilingLamp(0xffe0b0, 0, false);
  ceilingFixture.position.set(-0.6, H - 0.35, 0.4);
  root.add(ceilingFixture);

  // Doorway into the hall, with corridor light spilling in.
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.25, 0.16), paintedMetal(0x1c1f23, 0.5));
  doorFrame.position.set(3.6, 1.12, D / 2 - 0.02);
  root.add(doorFrame);
  const hall = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.1), emissiveMaterial(0xb8d8e8, 0.5));
  hall.position.set(3.6, 1.05, D / 2 - 0.1);
  hall.rotation.y = Math.PI;
  root.add(hall);
  const hallLight = new THREE.PointLight(0xcfe6f2, 26, 7, 2);
  hallLight.position.set(3.6, 1.7, D / 2 - 0.7);
  root.add(hallLight);
  const hallShaft = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 3.2), glowMaterial(0xcfe6f2, 0.14, 2.4));
  hallShaft.position.set(3.6, 0.03, D / 2 - 1.7);
  hallShaft.rotation.x = -Math.PI / 2;
  root.add(hallShaft);

  // ---------------------------------------------------------------- lighting
  // Key: city light through the window.
  const key = new THREE.SpotLight(0x8cc4ea, 150, 18, 1.0, 0.7, 2);
  key.position.set(-1.4, 2.5, -D / 2 - 1.2);
  key.target.position.set(0.2, 0.5, 1.6);
  key.castShadow = true;
  key.shadow.mapSize.set(768, 768);
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.025;
  key.shadow.camera.near = 0.4;
  key.shadow.camera.far = 22;
  root.add(key, key.target);

  // Warm bounce from the lamp side.
  const fill = new THREE.PointLight(0xffb877, 26, 9, 2);
  fill.position.set(-3.2, 1.5, 1.6);
  root.add(fill);

  const ambient = new THREE.HemisphereLight(0x2f5468, 0x121618, 4.2);
  root.add(ambient);

  // Volumetric shaft from the window.
  const shaft = new THREE.Mesh(new THREE.ConeGeometry(2.6, 6.4, 20, 1, true), lightShaftMaterial(0x8cc4ea, 0.075));
  shaft.position.set(-0.7, 1.6, -0.6);
  shaft.rotation.set(-Math.PI / 2 + 0.5, 0, 0);
  shaft.renderOrder = 3;
  root.add(shaft);

  const mist = new MistLayers(4, 9, 0x2c4a5c, 0.05);
  mist.group.position.set(0, 0.3, 0);
  root.add(mist.group);

  const sign = neonSign('VACANCY', 0xff4a6a, { width: 1.6, height: 0.4, light: 2 });
  sign.position.set(-1.1, 2.35, -D / 2 - 1.9);
  root.add(sign);

  const timed = collectTimed(root);

  return {
    id: 'apartment',
    root,
    env,
    envIntensity: 3.0,
    fog: new THREE.FogExp2(0x101a20, 0.024),
    rain,
    mist,
    marks: {
      entry: mark(3.1, 0, 2.4),
      body: mark(0.35, 0, 1.35),
      witness: mark(2.5, 0, -1.9),
      window: mark(-1.1, 0, -2.4),
      couch: mark(-2.0, 0, 1.5),
      centre: mark(0, 0, 0.4),
      doorway: mark(3.6, 0, 2.9),
    },
    actorLights: { key: 0xa8cdec, keyIntensity: 7.0, rim: 0xffb877, rimIntensity: 15, fill: 0x6f96b4, fillIntensity: 0.8, keySide: -1 },
    post: {
      exposure: 0.95,
      bloomStrength: 0.45,
      bloomThreshold: 0.95,
      anamorphic: 0.22,
      rain: 0.12,
      grain: 0.038,
      saturation: 0.98,
      contrast: 1.1,
      aoStrength: 0.6,
      aoRadius: 0.32,
      vignette: 0.62,
      lift: new THREE.Color(0.016, 0.022, 0.032),
      gain: new THREE.Color(1.01, 1.0, 1.02),
    },
    update(dt, time, camera) {
      for (const m of timed) m.uniforms.uTime.value = time;
      rain.update(time, rain.mesh.position);
      mist.update(time);
      // TV flicker.
      cabinetLight.intensity = 16 + Math.sin(time * 3.1) * 0.6;
      void dt;
      void camera;
    },
    dispose() {
      disposeTree(root);
      env.dispose();
    },
  };
}
