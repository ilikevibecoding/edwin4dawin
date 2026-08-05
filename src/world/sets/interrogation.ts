import * as THREE from 'three';
import { skyEnvTexture, T } from '../../engine/Textures';
import { concreteMaterial, glowMaterial, lightShaftMaterial, metalMaterial, paintedMetal } from '../Materials';
import { ceilingLamp, chair, screen } from '../props';
import { MistLayers } from '../Weather';
import { roundedBox } from '../geom';
import { collectTimed, disposeTree, GameSet, mark, SetContext } from './types';

/**
 * Chapter 2: the precinct interrogation room. One hard overhead source, a
 * one-way mirror, and a lot of darkness - built for tight coverage on faces.
 */
export function buildInterrogation(ctx: SetContext): GameSet {
  const root = new THREE.Group();

  const env = skyEnvTexture(ctx.renderer, {
    top: 0x090b0e,
    horizon: 0x1a2026,
    ground: 0x0a0c0e,
    glow: 0x36536b,
  });

  const W = 5.0;
  const D = 5.6;
  const H = 3.1;

  const floorMat = new THREE.MeshPhysicalMaterial({
    color: 0x2a2e33,
    map: T.tile(),
    roughnessMap: T.tileRough(),
    normalMap: T.concreteNormal(),
    normalScale: new THREE.Vector2(0.25, 0.25),
    roughness: 0.4,
    clearcoat: 0.55,
    clearcoatRoughness: 0.25,
    envMapIntensity: 0.8,
  });
  [floorMat.map, floorMat.roughnessMap, floorMat.normalMap].forEach((t) => t && t.repeat.set(2.5, 2.5));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);

  const wallMat = concreteMaterial(2);
  wallMat.color = new THREE.Color(0x3c4045);
  const walls: [number, number, [number, number, number], number][] = [
    [W, H, [0, H / 2, -D / 2], 0],
    [D, H, [-W / 2, H / 2, 0], Math.PI / 2],
    [D, H, [W / 2, H / 2, 0], Math.PI / 2],
    [W, H, [0, H / 2, D / 2], 0],
  ];
  for (const [w, h, pos, rot] of walls) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.16), wallMat);
    wall.position.set(...pos);
    wall.rotation.y = rot;
    wall.receiveShadow = true;
    root.add(wall);
  }
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, D), concreteMaterial(2));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = H;
  ceiling.receiveShadow = true;
  root.add(ceiling);

  // Wall panelling for scale and specular interest.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const panel = new THREE.Mesh(roundedBox(1.2, 1.0, 0.03, 0.01, 1), paintedMetal(0x2c3237, 0.42));
      panel.position.set(side * (W / 2 - 0.09), 0.85 + Math.floor(i / 2) * 1.05, -1.4 + (i % 2) * 2.6);
      panel.rotation.y = Math.PI / 2;
      panel.receiveShadow = true;
      root.add(panel);
    }
  }

  // One-way mirror: dark glossy metal reading as a reflective observation pane.
  const mirror = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 1.5),
    new THREE.MeshPhysicalMaterial({
      color: 0x18242c,
      roughness: 0.07,
      metalness: 1,
      envMapIntensity: 2.6,
      normalMap: T.scratchedGlass(),
      normalScale: new THREE.Vector2(0.06, 0.06),
    }),
  );
  mirror.position.set(0, 1.6, -D / 2 + 0.1);
  root.add(mirror);
  const mirrorFrame = new THREE.Mesh(roundedBox(3.4, 1.7, 0.08, 0.02, 1), paintedMetal(0x1a1e22, 0.45));
  mirrorFrame.position.set(0, 1.6, -D / 2 + 0.05);
  root.add(mirrorFrame);

  // Bolted metal table and two chairs.
  const tableTop = new THREE.Mesh(roundedBox(1.5, 0.06, 0.85, 0.02, 2), metalMaterial(0x8d949b, 0.28));
  tableTop.position.set(0, 0.76, 0);
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  root.add(tableTop);
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 0.74, 12), metalMaterial(0x555b61, 0.4));
  pedestal.position.set(0, 0.37, 0);
  pedestal.castShadow = true;
  root.add(pedestal);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 16), metalMaterial(0x4a5056, 0.5));
  plate.position.set(0, 0.01, 0);
  root.add(plate);

  const suspectChair = chair(true);
  suspectChair.position.set(0, 0, -0.85);
  root.add(suspectChair);
  const officerChair = chair(true);
  officerChair.position.set(0, 0, 0.95);
  officerChair.rotation.y = Math.PI;
  root.add(officerChair);

  // Restraint ring on the table.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 8, 16), metalMaterial(0xa8b0b8, 0.25));
  ring.position.set(0, 0.8, -0.2);
  ring.rotation.x = Math.PI / 2;
  root.add(ring);

  // Terminal and case screens.
  const terminal = screen('CASE 4172-K', 0x4fd2ff, 0.9, 0.55);
  terminal.position.set(W / 2 - 0.14, 1.55, 1.5);
  terminal.rotation.y = -Math.PI / 2;
  root.add(terminal);

  const readout = screen('STRESS 42%', 0xffa63c, 0.7, 0.4);
  readout.position.set(-W / 2 + 0.14, 1.5, -1.2);
  readout.rotation.y = Math.PI / 2;
  root.add(readout);

  // Door with a light seam.
  const door = new THREE.Mesh(roundedBox(1.15, 2.2, 0.1, 0.02, 2), paintedMetal(0x24282d, 0.4));
  door.position.set(1.4, 1.1, D / 2 - 0.1);
  root.add(door);
  const seam = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.02), glowMaterial(0xcfe4f0, 0.8, 1.4));
  seam.position.set(1.4, 0.03, D / 2 - 0.17);
  seam.rotation.x = -Math.PI / 2;
  root.add(seam);

  // Corner camera watching the room.
  const camBody = new THREE.Mesh(roundedBox(0.14, 0.12, 0.26, 0.03, 2), paintedMetal(0x1e2226, 0.35));
  camBody.position.set(W / 2 - 0.35, H - 0.3, -D / 2 + 0.4);
  camBody.rotation.set(-0.4, -0.7, 0);
  root.add(camBody);
  const camLed = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2020, toneMapped: false }));
  camLed.position.set(W / 2 - 0.45, H - 0.34, -D / 2 + 0.52);
  root.add(camLed);

  // ---------------------------------------------------------------- lighting
  const lamp = ceilingLamp(0xfff4e2, 165, true);
  lamp.position.set(0, H - 0.5, -0.1);
  root.add(lamp);
  const spot = (lamp as THREE.Group & { spot?: THREE.SpotLight }).spot!;
  spot.castShadow = true;
  spot.shadow.mapSize.set(768, 768);
  spot.shadow.bias = -0.0005;
  spot.shadow.normalBias = 0.02;
  spot.shadow.camera.near = 0.3;
  spot.shadow.camera.far = 12;
  spot.angle = 0.78;
  spot.penumbra = 0.62;

  // Cold kicker from behind the suspect for separation.
  const kicker = new THREE.SpotLight(0x6aa8d8, 80, 12, 0.7, 0.8, 2);
  kicker.position.set(-1.9, 2.5, -2.2);
  kicker.target.position.set(0, 1.0, -0.4);
  root.add(kicker, kicker.target);

  const rim = new THREE.PointLight(0x4fd2ff, 16, 7, 2);
  rim.position.set(1.9, 1.7, 1.6);
  root.add(rim);

  const ambient = new THREE.HemisphereLight(0x2e4453, 0x141a1f, 3.4);
  root.add(ambient);

  const haze = new THREE.Mesh(new THREE.ConeGeometry(1.75, 3.0, 22, 1, true), lightShaftMaterial(0xfff0d8, 0.13));
  haze.position.set(0, 1.1, -0.1);
  haze.rotation.x = Math.PI;
  haze.renderOrder = 3;
  root.add(haze);

  const mist = new MistLayers(3, 6, 0x38424c, 0.045);
  mist.group.position.y = 0.6;
  root.add(mist.group);

  const timed = collectTimed(root);

  return {
    id: 'interrogation',
    root,
    env,
    envIntensity: 2.0,
    fog: new THREE.FogExp2(0x0d1216, 0.035),
    mist,
    marks: {
      suspectSeat: mark(0, 0, -0.85),
      interrogator: mark(0, 0, 1.4),
      standLeft: mark(-1.3, 0, 0.9),
      standRight: mark(1.35, 0, 0.9),
      doorway: mark(1.4, 0, 2.4),
      observe: mark(0, 0, -2.2),
      centre: mark(0, 0, 0),
    },
    actorLights: { key: 0xfff2de, keyIntensity: 9.0, rim: 0x6aa8d8, rimIntensity: 16, fill: 0x8090a0, fillIntensity: 0.6, keySide: 1, keyHeight: 2.0, keySpread: 0.7 },
    post: {
      exposure: 0.92,
      bloomStrength: 0.4,
      bloomThreshold: 0.95,
      anamorphic: 0.14,
      rain: 0,
      grain: 0.038,
      saturation: 0.9,
      contrast: 1.14,
      aoStrength: 0.6,
      aoRadius: 0.32,
      vignette: 0.72,
      lift: new THREE.Color(0.014, 0.018, 0.026),
      gain: new THREE.Color(1.02, 1.0, 0.99),
    },
    update(dt, time) {
      for (const m of timed) m.uniforms.uTime.value = time;
      mist.update(time);
      // Faint mains flicker on the overhead lamp.
      spot.intensity = 165 + Math.sin(time * 21.3) * 4 + Math.sin(time * 7.1) * 2.2;
      void dt;
    },
    dispose() {
      disposeTree(root);
      env.dispose();
    },
  };
}
