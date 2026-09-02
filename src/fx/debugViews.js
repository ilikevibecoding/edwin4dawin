import * as THREE from 'three';
import { GROUP, groups } from '../core/Physics.js';

/**
 * Review views + exec recipes for the VFX systems (registered on 'game:ready').
 *
 *   node tools/shot.mjs --out x.png --view fx_impacts   --exec "await debug.views.fx_impacts.run()"   --wait 0 --frames 1
 *   node tools/shot.mjs --out x.png --view fx_flash     --exec "await debug.views.fx_flash.run()"     --wait 0 --frames 1
 *   node tools/shot.mjs --out x.png --view fx_explosion --exec "await debug.views.fx_explosion.run()" --wait 0 --frames 1
 *   node tools/shot.mjs --out x.png --view fx_smoke     --exec "await debug.views.fx_smoke.run()"     --wait 0 --frames 1
 *
 * Each run() freezes the simulation (game.timeScale = 0) at the interesting moment so the capture is exact.
 */
export function registerFxDebugViews(game) {
  const d = game.debug;
  if (!d || typeof d.registerView !== 'function') return;
  const wait = (s) => d.waitTime(s);
  const frames = (n) => d.waitFrames(n);
  const freeze = () => {
    game.timeScale = 0;
  };
  const worldFilter = groups(GROUP.ALL, GROUP.WORLD);

  /** Teleport so the first wall ahead is `dist` meters away. */
  const faceWall = (dist = 8) => {
    const P = game.player;
    const dir = P.forward.clone().setY(0).normalize();
    const hit = game.physics.raycast(P.eyePosition, dir, 80, { filter: worldFilter });
    if (hit && hit.distance > dist + 0.5) {
      const p = hit.point.clone().addScaledVector(dir, -dist);
      P.setView(new THREE.Vector3(p.x, P.position.y, p.z), null, null);
    }
    return hit;
  };
  const burst = async (n, gapFrames = 1) => {
    for (let i = 0; i < n; i++) {
      game.weapons.fire();
      if ('_cooldown' in game.weapons) game.weapons._cooldown = 0;
      await frames(gapFrames);
    }
  };
  const groundAhead = (dist) => {
    const P = game.player;
    const dir = P.forward.clone().setY(0).normalize();
    const p = P.position.clone().addScaledVector(dir, dist);
    p.y = game.world.getGroundHeight ? game.world.getGroundHeight(p.x, p.z) : 0;
    return p;
  };

  d.registerView('fx_impacts', {
    pos: [0, 0, 22], yaw: 0, pitch: -6, hud: false, // aim below the windows: plain stone wall
    run: async () => {
      faceWall(8);
      await frames(1);
      await burst(12, 4); // ≈ 900 rpm
      await wait(0.3);
      freeze();
    },
  });
  d.registerView('fx_flash', {
    pos: [0, 0, 22], yaw: 0, pitch: -1, hud: false,
    run: async () => {
      await burst(2, 2);
      game.weapons.fire();
      await frames(1);
      freeze();
    },
  });
  d.registerView('fx_explosion', {
    pos: [0, 0, 22], yaw: 0, pitch: 0, hud: false,
    run: async () => {
      game.combat.explode({ position: groundAhead(12), radius: 9, damage: 0, kind: 'bomb', source: 'player' });
      await wait(0.35);
      freeze();
    },
  });
  d.registerView('fx_smoke', {
    pos: [0, 0, 22], yaw: 0, pitch: 6, hud: false,
    run: async () => {
      game.combat.explode({ position: groundAhead(12), radius: 9, damage: 0, kind: 'bomb', source: 'player' });
      await wait(3.0);
      freeze();
    },
  });
  d.registerView('fx_casings', {
    pos: [0, 0, 22], yaw: 0, pitch: -22, hud: false,
    run: async () => {
      // a stream of brass ejected 1.4 m in front of the camera (so it stays in frame) — the first ones have
      // landed and bounced, the last ones are still tumbling through the air
      const P = game.player;
      const fwd = P.forward.clone().setY(0).normalize();
      const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
      for (let i = 0; i < 12; i++) {
        const pos = P.eyePosition.clone().addScaledVector(fwd, 1.4).addScaledVector(right, -0.4 + Math.random() * 0.1);
        const v = right.clone().multiplyScalar(1.2 + Math.random() * 0.8).add(new THREE.Vector3(0, 1.0 + Math.random() * 0.6, 0)).addScaledVector(fwd, 0.4 + Math.random() * 0.4);
        game.events.emit('weapon:casing', { position: pos, velocity: { x: v.x, y: v.y, z: v.z }, angularVelocity: { x: 30, y: 10, z: 40 } });
        await frames(3);
      }
      await frames(4);
      freeze();
    },
  });
}
