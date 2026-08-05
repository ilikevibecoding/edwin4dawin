import * as THREE from 'three';
import { skyEnvTexture } from '../../engine/Textures';
import { concreteMaterial } from '../Materials';
import { GameSet, mark, SetContext } from './types';

/**
 * Neutral three-point studio used only for authoring: it makes face, hair and
 * skin problems obvious without scene lighting hiding them.
 */
export function buildStudio(ctx: SetContext): GameSet {
  const root = new THREE.Group();

  const env = skyEnvTexture(ctx.renderer, {
    top: 0x20262c,
    horizon: 0x3a4249,
    ground: 0x14171a,
    glow: 0x55606a,
  });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), concreteMaterial(4));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 8),
    new THREE.MeshStandardMaterial({ color: 0x2a3138, roughness: 0.95 }),
  );
  backdrop.position.set(0, 4, -3.4);
  backdrop.receiveShadow = true;
  root.add(backdrop);

  const key = new THREE.SpotLight(0xfff2e2, 95, 14, 0.62, 0.55, 2);
  key.position.set(2.0, 2.75, 2.4);
  key.target.position.set(0, 1.55, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 12;
  root.add(key, key.target);

  const fill = new THREE.SpotLight(0x9fc0e0, 26, 14, 0.9, 0.8, 2);
  fill.position.set(-2.4, 2.0, 2.2);
  fill.target.position.set(0, 1.5, 0);
  root.add(fill, fill.target);

  const rim = new THREE.SpotLight(0xbfe0ff, 70, 14, 0.75, 0.7, 2);
  rim.position.set(-1.6, 2.9, -2.2);
  rim.target.position.set(0, 1.55, 0);
  root.add(rim, rim.target);

  const ambient = new THREE.HemisphereLight(0x50606c, 0x1a1d20, 2.4);
  root.add(ambient);

  return {
    id: 'studio',
    root,
    env,
    envIntensity: 2.6,
    fog: null,
    marks: {
      subject: mark(0, 0, 0),
      subjectB: mark(0.7, 0, 0.3),
      centre: mark(0, 0, 0),
    },
    post: {
      exposure: 1.0,
      bloomStrength: 0.32,
      bloomThreshold: 0.95,
      anamorphic: 0.1,
      rain: 0,
      grain: 0.02,
      aberration: 0.25,
      vignette: 0.35,
      contrast: 1.02,
      saturation: 1.0,
      aoStrength: 0.6,
      aoRadius: 0.32,
      lift: new THREE.Color(0.004, 0.005, 0.007),
      gain: new THREE.Color(1, 1, 1),
    },
    update: () => {},
    dispose: () => {
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      env.dispose();
    },
  };
}
