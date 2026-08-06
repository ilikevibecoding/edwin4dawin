/** Material and lighting test bed, used to judge shading quality in isolation. */
import * as THREE from 'three';
import type { Stage } from '../engine/Stage';
import {
  asphalt, brick, brushedMetal, buildSurface, concrete, fabric, neonSignTexture,
  panelMetal, plaster, rustedMetal, surfaceMaterial, tiles, woodFloor,
} from '../engine/Textures';

export function buildLookdev(stage: Stage) {
  const scene = stage.scene;
  stage.setSky('nightRain');

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    surfaceMaterial(buildSurface('asphalt', asphalt, { size: 512, repeat: 6, normalStrength: 2.2 }))
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const specs = [
    buildSurface('concrete', concrete, { size: 512, normalStrength: 2 }),
    buildSurface('panel', panelMetal(3, 2), { size: 512, normalStrength: 3 }),
    buildSurface('brushed', brushedMetal, { size: 512, normalStrength: 1.2 }),
    buildSurface('rust', rustedMetal, { size: 512, normalStrength: 2.4 }),
    buildSurface('plaster', plaster(), { size: 512, normalStrength: 1.4 }),
    buildSurface('wood', woodFloor, { size: 512, normalStrength: 1.8 }),
    buildSurface('fabric', fabric(), { size: 512, normalStrength: 1.2 }),
    buildSurface('tiles', tiles(4), { size: 512, normalStrength: 2.4 }),
    buildSurface('brick', brick, { size: 512, normalStrength: 2.6 }),
  ];

  const geo = new THREE.SphereGeometry(0.42, 64, 48);
  specs.forEach((maps, i) => {
    const mesh = new THREE.Mesh(geo, surfaceMaterial(maps));
    mesh.position.set(((i % 5) - 2) * 1.1, 0.42 + Math.floor(i / 5) * 1.1, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  });

  const key = new THREE.SpotLight(0xbfd4ff, 110, 22, THREE.MathUtils.degToRad(42), 0.45, 2);
  key.position.set(-4.2, 6.2, 4.4);
  key.target.position.set(0, 1, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 24;
  key.shadow.bias = -0.0008;
  key.shadow.normalBias = 0.022;
  scene.add(key, key.target);

  const rim = new THREE.SpotLight(0xff3d7a, 70, 18, THREE.MathUtils.degToRad(50), 0.6, 2);
  rim.position.set(5, 3, -3.2);
  rim.target.position.set(0, 1, 0);
  scene.add(rim, rim.target);

  const fill = new THREE.PointLight(0x2a6cff, 16, 16, 2);
  fill.position.set(2, 1.2, 4);
  scene.add(fill);

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 1.05),
    new THREE.MeshBasicMaterial({
      map: neonSignTexture('CYBERLIFE', '#31d6ff', { w: 1024, h: 256, sub: 'ANDROIDS' }),
      transparent: true,
    })
  );
  sign.position.set(-1, 2.9, -4);
  scene.add(sign);
  const signLight = new THREE.PointLight(0x31d6ff, 30, 14, 2);
  signLight.position.set(-1, 2.7, -3.5);
  scene.add(signLight);

  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 12),
    surfaceMaterial(buildSurface('concreteWall', concrete, { size: 512, repeat: 4, normalStrength: 2 }))
  );
  back.position.set(0, 6, -6);
  back.receiveShadow = true;
  scene.add(back);

  stage.camera.position.set(0.4, 1.75, 5.6);
  stage.camera.lookAt(0, 1.1, 0);

  stage.fx.atmosphere.apply({
    fogColor: new THREE.Color(0x0b0f18),
    fogColorFar: new THREE.Color(0x1a1524),
    density: 0.05,
    heightFalloff: 0.08,
    noise: 0.5,
  });
  stage.fx.atmosphere.setShaft(0, new THREE.Vector3(-4.2, 6.2, 4.4), new THREE.Color(0x6f8dff), 0.25);
  stage.fx.lensRain.intensity = 0.5;
  stage.fx.dof.target = new THREE.Vector3(0, 0.9, 0);

  stage.onUpdate((_dt, t) => {
    signLight.intensity = 30 + Math.sin(t * 7.3) * 2 + (Math.random() < 0.02 ? -14 : 0);
  });
}
