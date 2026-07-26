import * as THREE from 'three';

/**
 * Photo mode: stages deterministic scenarios for headless screenshot capture.
 * The page is loaded with ?photo=<name>; the director poses the world, runs
 * fixed 60 Hz steps, and sets window.__PHOTO_READY on the capture frame.
 */

const SCENARIOS = {
  /* Hero vista down the main street from spawn. */
  vista: (g) => {
    g.deployForPhoto();
    g.player.spawnAt(new THREE.Vector3(-51, 0, 1.2), -Math.PI / 2);
    g.player.pitch = 0.015;
    g.enemies.frozen = true;
    g.enemies.spawnOne(new THREE.Vector3(26, 0, -2.5), 0);
    g.enemies.spawnOne(new THREE.Vector3(38, 0, 3), 1);
    return { capture: 150 };
  },

  /* Mid-firefight: muzzle flash, tracers, enemies at cover (sun behind us). */
  combat: (g) => {
    g.deployForPhoto();
    g.player.spawnAt(new THREE.Vector3(26, 0, -0.5), Math.PI / 2);
    g.player.pitch = 0.012;
    g.enemies.frozen = true;
    const e1 = g.enemies.spawnOne(new THREE.Vector3(15, 0, -2.6), 0);
    const e2 = g.enemies.spawnOne(new THREE.Vector3(0, 0, 3.2), 1);
    const e3 = g.enemies.spawnOne(new THREE.Vector3(-13, 0, -3.8), 2);
    for (const e of [e1, e2, e3]) e.enterCombat();
    e2.crouchTarget = 1;
    return {
      capture: 128,
      onFrame: (f) => {
        if (f === 96) g.weapons.onTriggerDown();
        if (f === 127) g.weapons.onTriggerUp();
        if (f === 122) e2._fireAt(g.player.eyePos, 26);
        if (f === 126) e1._fireAt(g.player.eyePos, 11);
        if (f === 124) e3._fireAt(g.player.eyePos, 39);
      },
    };
  },

  /* Aiming down the red dot at a hostile. */
  ads: (g) => {
    g.deployForPhoto();
    g.player.spawnAt(new THREE.Vector3(-9, 0, 1.2), -Math.PI / 2);
    g.player.pitch = 0.008;
    g.enemies.frozen = true;
    const e = g.enemies.spawnOne(new THREE.Vector3(11, 0, 0.6), 1);
    e.enterCombat();
    return {
      capture: 148,
      onFrame: (f) => {
        if (f === 40) g.weapons.wantAds = true;
        if (f === 146) { g.weapons.onTriggerDown(); }
        if (f === 147) { g.weapons.onTriggerUp(); }
      },
    };
  },

  /* The air strike money shot: stick of detonations down the street. */
  airstrike: (g) => {
    g.deployForPhoto();
    g.player.spawnAt(new THREE.Vector3(-36, 0, 2.4), -Math.PI / 2);
    g.player.pitch = 0.052;
    g.enemies.frozen = true;
    for (const [x, z, v] of [[10, -2, 0], [16, 2.5, 1], [24, -4, 2], [30, 3, 0]]) {
      g.enemies.spawnOne(new THREE.Vector3(x, 0, z), v).enterCombat();
    }
    return {
      capture: 364,
      onFrame: (f) => {
        if (f === 30) g.airstrike.confirmTarget(new THREE.Vector3(16, 0, 0));
      },
    };
  },

  /* Air strike sweeping across the street, viewed from the market sidewalk. */
  airstrike2: (g) => {
    g.deployForPhoto();
    g.player.spawnAt(new THREE.Vector3(-22, 0, 6.4), -Math.PI / 2 + 0.22);
    g.player.pitch = 0.12;
    g.enemies.frozen = true;
    return {
      capture: 360,
      onFrame: (f) => {
        if (f === 30) g.airstrike.confirmTarget(new THREE.Vector3(4, 0, -1));
      },
    };
  },

  /* Soldier close-up for character review (sun on their faces). */
  enemies: (g) => {
    g.deployForPhoto();
    g.player.spawnAt(new THREE.Vector3(30.5, 0, 2.5), Math.PI / 2 - 0.05);
    g.player.pitch = 0.005;
    g.enemies.frozen = true;
    const a = g.enemies.spawnOne(new THREE.Vector3(24, 0, 1.2), 0);
    const b = g.enemies.spawnOne(new THREE.Vector3(20.5, 0, 5), 1);
    const c = g.enemies.spawnOne(new THREE.Vector3(25.5, 0, -2.8), 2);
    a.enterCombat(); b.enterCombat(); c.enterCombat();
    b.crouchTarget = 1;
    return {
      capture: 140,
      onFrame: (f) => {
        if (f === 137) a._fireAt(g.player.eyePos, 7);
      },
    };
  },

  /* Targeting tablet UI. */
  tablet: (g) => {
    g.deployForPhoto();
    g.player.spawnAt(new THREE.Vector3(-30, 0, 2), -Math.PI / 2);
    g.enemies.frozen = true;
    g.enemies.spawnOne(new THREE.Vector3(20, 0, -3), 0);
    g.enemies.spawnOne(new THREE.Vector3(32, 0, 4), 1);
    return {
      capture: 90,
      onFrame: (f) => {
        if (f === 30) g.airstrike.openTargeting();
      },
    };
  },

  /* Main menu. */
  menu: (g) => {
    g.showMenu();
    return { capture: 120 };
  },
};

export class PhotoDirector {
  constructor(game, name) {
    this.game = game;
    this.frameNo = 0;
    this.done = false;
    const setup = SCENARIOS[name] ?? SCENARIOS.vista;
    this.script = setup(game);
    window.__PHOTO_READY = false;
  }

  frame() {
    if (this.done) return;
    this.frameNo++;
    if (this.script.onFrame) this.script.onFrame(this.frameNo);
    if (this.frameNo >= this.script.capture) this.done = true;
  }
}
