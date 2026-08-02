/**
 * Placeholder scene factory.
 *
 * Used while a scene is still being built, so the film always runs end to end.
 * Renders a slowly turning brick pile with the scene name.
 */
import * as THREE from 'three';
import { Bricks } from '../engine/brick.js';
import { COLORS } from '../engine/palette.js';
import { Starfield } from '../engine/fx.js';
import { hash11 } from '../engine/rng.js';
import { makeTextTexture } from '../engine/overlay.js';

const PALETTE = [COLORS.red, COLORS.yellow, COLORS.blue, COLORS.white, COLORS.lightBluishGray, COLORS.green];

export function makeStub(meta) {
  return {
    meta,
    async build() {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x070b14);
      const camera = new THREE.PerspectiveCamera(46, 16 / 9, 0.1, 4000);

      scene.add(new THREE.HemisphereLight(0x8fb6ff, 0x141a26, 1.1));
      const key = new THREE.DirectionalLight(0xffffff, 2.4);
      key.position.set(14, 22, 12);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.left = -24;
      key.shadow.camera.right = 24;
      key.shadow.camera.top = 24;
      key.shadow.camera.bottom = -24;
      scene.add(key);

      const stars = new Starfield({ count: 900, radius: 700 });
      scene.add(stars.object);

      const b = new Bricks();
      for (let i = 0; i < 90; i++) {
        const x = Math.round((hash11(i, 1) - 0.5) * 16);
        const z = Math.round((hash11(i, 2) - 0.5) * 16);
        const y = Math.floor(hash11(i, 3) * 8) * 3;
        b.brick(x, y, z, 1 + Math.floor(hash11(i, 4) * 3), 1 + Math.floor(hash11(i, 5) * 2), PALETTE[Math.floor(hash11(i, 6) * PALETTE.length)]);
      }
      const pile = b.build();
      scene.add(pile);

      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(160, 160),
        new THREE.MeshStandardMaterial({ color: 0x1b2432, roughness: 0.9 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.4;
      ground.receiveShadow = true;
      scene.add(ground);

      const { texture } = makeTextTexture({
        text: `${meta.title.toUpperCase()}\nscene in progress`,
        width: 1024,
        height: 256,
        font: '700 76px Arimo, sans-serif',
        color: '#ffd84d',
      });
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(16, 4),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false })
      );
      label.position.set(0, 12, 0);
      scene.add(label);

      return {
        scene,
        camera,
        update(t) {
          const a = t * 0.16;
          camera.position.set(Math.cos(a) * 26, 12 + Math.sin(t * 0.3) * 2, Math.sin(a) * 26);
          camera.lookAt(0, 5, 0);
          label.lookAt(camera.position);
          stars.update(t);
        },
      };
    },
  };
}
