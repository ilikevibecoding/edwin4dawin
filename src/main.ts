import { Engine } from './core/Engine';
import { Settings } from './core/Settings';
import { LightingSystem } from './render/Lighting';
import { RenderSystem } from './render/RenderSystem';
import { MaterialLibrary } from './render/textures/MaterialLibrary';
import { LevelSystem } from './world/LevelSystem';
import { PhysicsSystem } from './physics/PhysicsSystem';
import { PlayerSystem } from './player/PlayerSystem';
import { WeaponSystem } from './weapons/WeaponSystem';
import { VfxSystem } from './vfx/VfxSystem';
import { AiSystem } from './ai/AiSystem';
import { KillstreakSystem } from './killstreaks/KillstreakSystem';
import { HudSystem } from './ui/HudSystem';
import { AudioEngine } from './audio/AudioEngine';
import { SKY_PRESETS } from './render/Sky';
import { isCaptureMode, requestedShot, markReady, settle, poseCamera } from './dev/Capture';
import { SHOTS } from './dev/shots';
import type { IHud, IKillstreaks, IPlayer, IWeapons } from './core/Contracts';

async function boot() {
  const container = document.getElementById('app')!;
  const capture = isCaptureMode();
  const shot = capture ? (SHOTS[requestedShot()] ?? SHOTS.overview) : null;

  const settings = new Settings({
    quality: capture ? 'cinematic' : Settings.autoDetect(),
  });

  const engine = new Engine({ container, settings, capture });
  const materials = new MaterialLibrary(engine.renderer, { size: capture ? 1024 : 512 });
  engine.provide('materials', materials);

  engine
    .add(new LevelSystem())
    .add(new PhysicsSystem())
    .add(new LightingSystem())
    .add(new PlayerSystem())
    .add(new AiSystem())
    .add(new WeaponSystem())
    .add(new KillstreakSystem())
    .add(new VfxSystem())
    .add(new HudSystem())
    .add(new AudioEngine())
    .add(new RenderSystem());

  await engine.init();

  const lighting = engine.get<LightingSystem>('lighting');
  const render = engine.get<RenderSystem>('render');

  (window as unknown as { __GAME__: unknown }).__GAME__ = engine;

  if (capture && shot) {
    if (shot.sky && SKY_PRESETS[shot.sky]) {
      lighting.applyPreset(SKY_PRESETS[shot.sky]);
    }
    render.syncToSky();

    const player = engine.get<IPlayer>('player');
    const hud = engine.get<IHud>('hud');
    const weapons = engine.get<IWeapons>('weapons');

    hud.setVisible(shot.hud === true);
    weapons.setEnabled(shot.viewmodel === true);
    player.setInputEnabled(false);

    // Free-camera shots detach the player controller so the framing is exact.
    if (shot.freeCamera) {
      player.teleport(
        new (await import('three')).Vector3(shot.position[0], shot.position[1], shot.position[2])
      );
    }

    await shot.stage?.(engine);
    await settle(engine, shot.warmup ?? 1.0);

    // Pose last: subsystems move the camera during update, so the final frame
    // has to be composed after simulation has settled.
    poseCamera(engine.camera, shot);
    engine.camera.updateMatrixWorld(true);
    lighting.update(0, engine.ctx);
    engine.step(1 / 60);
    poseCamera(engine.camera, shot);
    engine.camera.updateMatrixWorld(true);
    render.render(1 / 60);

    markReady({
      shot: shot.name,
      drawCalls: engine.renderer.info.render.calls,
      triangles: engine.renderer.info.render.triangles,
      programs: engine.renderer.info.programs?.length ?? 0,
      textureMB: Math.round(materials.stats.bytes / 1048576),
    });
  } else {
    render.syncToSky();
    engine.start();
    wireStartOverlay(engine);
  }
}

/** Pointer lock needs a user gesture; show a click-to-play prompt. */
function wireStartOverlay(engine: Engine) {
  const overlay = document.createElement('div');
  overlay.id = 'start-overlay';
  overlay.innerHTML = `
    <div class="panel">
      <h1>OPERATION BLACKOUT</h1>
      <p class="sub">CLICK TO DEPLOY</p>
      <ul class="controls">
        <li><b>WASD</b> Move</li><li><b>SHIFT</b> Sprint</li><li><b>CTRL</b> Crouch</li>
        <li><b>SPACE</b> Jump</li><li><b>LMB</b> Fire</li><li><b>RMB</b> Aim</li>
        <li><b>R</b> Reload</li><li><b>G</b> Grenade</li><li><b>1/2</b> Weapon</li>
        <li><b>Z</b> Killstreak</li><li><b>ESC</b> Pause</li>
      </ul>
    </div>`;
  document.body.appendChild(overlay);

  const style = document.createElement('style');
  style.textContent = `
    #start-overlay{position:fixed;inset:0;display:grid;place-items:center;
      background:radial-gradient(ellipse at center,rgba(6,9,14,.72),rgba(3,5,8,.96));
      backdrop-filter:blur(6px);z-index:50;cursor:pointer;transition:opacity .35s}
    #start-overlay.hidden{opacity:0;pointer-events:none}
    #start-overlay .panel{text-align:center;letter-spacing:.14em}
    #start-overlay h1{font-size:clamp(28px,5vw,64px);font-weight:700;
      background:linear-gradient(180deg,#fff,#8ea3b8);-webkit-background-clip:text;
      -webkit-text-fill-color:transparent;text-shadow:0 0 40px rgba(120,170,255,.25)}
    #start-overlay .sub{margin-top:14px;color:#7f96ad;font-size:15px;animation:pulse 2s infinite}
    @keyframes pulse{0%,100%{opacity:.45}50%{opacity:1}}
    #start-overlay .controls{margin-top:34px;display:grid;grid-template-columns:repeat(3,auto);
      gap:9px 30px;list-style:none;color:#6d8298;font-size:12px}
    #start-overlay .controls b{color:#cfe0f0;margin-right:8px}`;
  document.head.appendChild(style);

  const start = () => {
    overlay.classList.add('hidden');
    engine.input.requestLock();
    engine.setPaused(false);
    const audio = engine.ctx.has('audio')
      ? (engine.get('audio') as { resume?: () => Promise<void> })
      : null;
    audio?.resume?.().catch(() => {});
  };
  overlay.addEventListener('click', start);

  engine.input.onLockChange = (locked) => {
    if (!locked) {
      overlay.classList.remove('hidden');
      engine.setPaused(true);
    } else {
      overlay.classList.add('hidden');
      engine.setPaused(false);
    }
  };
  engine.setPaused(true);

  const ks = engine.get<IKillstreaks>('killstreaks');
  void ks;
}

boot().catch((err) => {
  console.error('[boot] fatal:', err);
  document.body.innerHTML = `<pre style="color:#f66;padding:24px;font:13px/1.5 monospace;white-space:pre-wrap">${
    err?.stack ?? err
  }</pre>`;
  (window as unknown as { __CAPTURE_READY__: boolean }).__CAPTURE_READY__ = true;
});
