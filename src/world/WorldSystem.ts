import * as THREE from 'three';
import type { GameContext, System } from '../core/GameContext';
import { registerVantages } from '../core/Vantage';

/**
 * Baseline greybox so the capture harness has something to frame. The real
 * level generator replaces this wholesale.
 */
export default class WorldSystem implements System {
  readonly key = 'world';
  readonly order = 30;

  init(ctx: GameContext): void {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ color: 0x6b6255, roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ctx.scene.add(ground);

    const geo = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < 40; i++) {
      const h = 2 + Math.random() * 10;
      const m = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.09, 0.18, 0.35 + Math.random() * 0.2),
          roughness: 0.8,
        }),
      );
      m.scale.set(3 + Math.random() * 6, h, 3 + Math.random() * 6);
      m.position.set((Math.random() - 0.5) * 120, h / 2, (Math.random() - 0.5) * 120);
      m.castShadow = true;
      m.receiveShadow = true;
      ctx.scene.add(m);
    }

    registerVantages([
      {
        name: 'hero',
        position: new THREE.Vector3(18, 6, 26),
        lookAt: new THREE.Vector3(0, 3, 0),
        note: 'Wide establishing shot',
      },
      {
        name: 'eye',
        position: new THREE.Vector3(0, 1.7, 20),
        lookAt: new THREE.Vector3(0, 2, 0),
        note: 'Player eye level',
      },
    ]);
  }
}
