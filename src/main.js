import * as THREE from 'three';
import { Engine } from './core/engine.js';
import { Input } from './core/input.js';
import { Assets } from './core/assets.js';
import { EventBus } from './core/events.js';
import { Harness } from './core/harness.js';

import { World } from './world/index.js';
import { PlayerController } from './player/controller.js';
import { Weapons } from './weapons/index.js';
import { AISystem } from './ai/index.js';
import { VFX } from './vfx/index.js';
import { AudioSystem } from './audio/index.js';
import { HUD } from './ui/hud.js';
import { Menus } from './ui/menus.js';
import { GameState } from './systems/gamestate.js';
import { Airstrike } from './systems/airstrike.js';

const container = document.getElementById('app');

async function boot() {
  const harness = new Harness();
  const engine = new Engine(container);
  const events = new EventBus();
  const input = new Input(engine.renderer.domElement);
  const assets = new Assets(engine.renderer);

  /** Shared game context — the contract between all systems. */
  const game = {
    THREE,
    engine,
    renderer: engine.renderer,
    scene: engine.scene,
    camera: engine.camera,
    composer: engine.composer,
    events,
    input,
    assets,
    harness,
    poses: {},          // named camera poses for screenshots (world registers)
    time: 0,
    dt: 0,
    paused: true,
    started: false,
  };
  window.__GAME__ = game;

  const menus = new Menus(game);
  game.menus = menus;
  menus.showLoading();

  // --- Construct systems (order matters: world first, HUD last) ----------
  game.world = new World(game);
  game.player = new PlayerController(game);
  game.vfx = new VFX(game);
  game.audio = new AudioSystem(game);
  game.weapons = new Weapons(game);
  game.ai = new AISystem(game);
  game.state = new GameState(game);
  game.airstrike = new Airstrike(game);
  game.hud = new HUD(game);

  await game.world.load();
  await Promise.all([
    game.vfx.load?.(),
    game.weapons.load?.(),
    game.ai.load?.(),
    game.audio.load?.(),
  ]);

  menus.hideLoading();

  // --- Simulation step (fixed or variable dt) -----------------------------
  const step = (dt) => {
    game.dt = dt;
    if (dt > 0) game.time += dt;
    game.player.update(dt);
    game.weapons.update(dt);
    game.ai.update(dt);
    game.airstrike.update(dt);
    game.state.update(dt);
    game.vfx.update(dt);
    game.world.update(dt);
    game.audio.update(dt);
    game.hud.update(dt);
    input.endFrame();
  };
  const render = (dt) => engine.render(dt);

  // --- Harness mode (deterministic screenshots) ---------------------------
  if (harness.enabled) {
    game.paused = false;
    game.started = true;
    menus.hideAll();
    if (!harness.showHud) game.hud.hide();
    if (harness.noBots) game.ai.enabled = false;
    game.audio.muted = true;
    events.emit('game:start', {});
    await harness.run(game, step, render);
    // keep rendering so the page stays alive for repeated captures
    const idle = () => { render(1 / 60); requestAnimationFrame(idle); };
    idle();
    return;
  }

  // --- Normal play ---------------------------------------------------------
  menus.showMain(() => {
    game.paused = false;
    game.started = true;
    input.requestPointerLock();
    events.emit('game:start', {});
  });

  document.addEventListener('pointerlockchange', () => {
    if (!game.started) return;
    if (document.pointerLockElement !== engine.renderer.domElement) {
      game.paused = true;
      menus.showPause(() => {
        game.paused = false;
        input.requestPointerLock();
      });
    } else {
      game.paused = false;
      menus.hideAll();
    }
  });

  const clock = new THREE.Clock();
  let acc = 0;
  const loop = () => {
    requestAnimationFrame(loop);
    const rawDt = Math.min(clock.getDelta(), 0.1);
    if (!game.paused) {
      step(rawDt);
    } else {
      input.endFrame();
    }
    render(rawDt);
  };
  loop();
}

boot().catch((e) => {
  console.error(e);
  const el = document.createElement('pre');
  el.style.cssText = 'color:#f55;background:#000;padding:20px;position:fixed;inset:0;z-index:9999;overflow:auto';
  el.textContent = 'BOOT FAILURE\n\n' + (e.stack || e.message || String(e));
  document.body.appendChild(el);
});
