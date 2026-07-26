import * as THREE from 'three';
import { Engine } from './core/Engine';
import { QUALITY, SHOT_MODE } from './core/Config';
import { LightingSystem } from './render/Lighting';
import { LevelSystem } from './world/Level';
import { PhysicsSystem } from './physics/Physics';
import { PlayerSystem } from './player/Player';
import { WeaponSystem } from './weapons/WeaponSystem';
import { ViewModelSystem } from './weapons/ViewModel';
import { BallisticsSystem } from './weapons/Ballistics';
import { VFXSystem } from './vfx/VFX';
import { DecalSystem } from './vfx/Decals';
import { AISystem } from './ai/AISystem';
import { KillstreakSystem } from './killstreaks/Killstreaks';
import { AirstrikeSystem } from './killstreaks/Airstrike';
import { AudioSystem } from './audio/AudioSystem';
import { HUDSystem } from './ui/HUD';
import { MenuSystem } from './ui/Menu';
import { GameFlowSystem } from './game/GameFlow';
import { installShotHarness } from './game/ShotHarness';

async function boot(): Promise<void> {
  const canvas = document.getElementById('viewport') as HTMLCanvasElement;
  if (!canvas) throw new Error('viewport canvas missing');

  const engine = new Engine(canvas);

  engine
    .add(new PhysicsSystem())
    .add(new LightingSystem())
    .add(new LevelSystem())
    .add(new DecalSystem())
    .add(new VFXSystem())
    .add(new BallisticsSystem())
    .add(new PlayerSystem())
    .add(new WeaponSystem())
    .add(new ViewModelSystem())
    .add(new AISystem())
    .add(new AirstrikeSystem())
    .add(new KillstreakSystem())
    .add(new AudioSystem())
    .add(new HUDSystem())
    .add(new MenuSystem())
    .add(new GameFlowSystem());

  const menu = engine.get<MenuSystem>('menu');

  const bootStart = performance.now();
  let lastMark = bootStart;
  await engine.initSystems((label, frac) => {
    const now = performance.now();
    console.info(`[boot] ${label} (+${(now - lastMark).toFixed(0)}ms)`);
    lastMark = now;
    menu?.setLoadProgress?.(label, frac);
    (window as unknown as Record<string, unknown>).__LOAD__ = frac;
  });
  console.info(`[boot] systems ready in ${(performance.now() - bootStart).toFixed(0)}ms`);

  engine.start();

  // Expose for the automated capture harness and for debugging in devtools.
  const w = window as unknown as Record<string, unknown>;
  w.__ENGINE__ = engine;
  w.THREE = THREE;

  if (SHOT_MODE) installShotHarness(engine);

  console.info(
    `[boot] quality=${QUALITY.tier} dpr=${engine.renderer.getPixelRatio().toFixed(2)} ` +
      `renderer=${engine.renderer.getContext().getParameter(engine.renderer.getContext().VERSION)}`,
  );
}

boot().catch((err) => {
  console.error('[boot] fatal', err);
  const root = document.getElementById('ui-root');
  if (root) {
    root.innerHTML = `
      <div style="position:fixed;inset:0;display:grid;place-items:center;
                  background:#05070a;color:#e05a4a;font:16px/1.6 monospace;padding:40px;
                  pointer-events:auto;white-space:pre-wrap;text-align:left">
        <div>
          <div style="font-size:22px;color:#c8a04a;margin-bottom:12px">FAILED TO INITIALISE</div>
          ${String(err && (err as Error).stack ? (err as Error).stack : err)}
        </div>
      </div>`;
  }
  (window as unknown as Record<string, unknown>).__BOOT_ERROR__ = String(err);
});
