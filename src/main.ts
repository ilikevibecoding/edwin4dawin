import { Game } from './game/game';
import { clock } from './core/clock';
import { setGrayboxMode } from './assets/materials';
import { settings } from './core/settings';
import { installTestHooks } from './dev/testhooks';
import type { Quality } from './core/settings';

/**
 * NORTHSTAR RESCUE — entry point (Opus 1).
 * Query params:
 *   ?test=1        deterministic test mode (advanceTime drives the sim)
 *   ?seed=N        gameplay RNG seed
 *   ?graybox=1     graybox materials + room labels
 *   ?qa=1          QA badge + labels available
 *   ?quality=low|medium|high|ultra   override quality setting
 *   ?mode=playing&difficulty=operator&loadout=vc7   fast boot into gameplay
 */
async function boot(): Promise<void> {
  const params = new URLSearchParams(location.search);
  const testMode = params.get('test') === '1';
  const qaMode = params.get('qa') === '1' || testMode;
  const seed = parseInt(params.get('seed') ?? '1337', 10) || 1337;
  const graybox = params.get('graybox') === '1';
  setGrayboxMode(graybox);
  const qualityOverride = params.get('quality');
  if (qualityOverride && ['low', 'medium', 'high', 'ultra'].includes(qualityOverride)) {
    settings.set('quality', qualityOverride as Quality);
  }

  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const game = new Game(canvas, { seed, testMode, qaMode });
  installTestHooks(game);

  // boot loading overlay
  const overlay = document.createElement('div');
  overlay.className = 'screen';
  overlay.id = 'boot-overlay';
  overlay.innerHTML = `
    <div class="title-treatment">
      <div class="title-main" style="font-size:28px">NORTHSTAR RESCUE</div>
      <div class="title-sub" id="boot-label">INITIALIZING</div>
    </div>
    <div class="loading-bar"><div class="loading-fill" id="boot-fill"></div></div>`;
  document.getElementById('ui-root')!.appendChild(overlay);
  const fill = overlay.querySelector('#boot-fill') as HTMLDivElement;
  const label = overlay.querySelector('#boot-label') as HTMLDivElement;

  await game.init((p, text) => {
    fill.style.width = `${Math.round(p * 100)}%`;
    label.textContent = text.toUpperCase();
  });
  overlay.remove();

  if (graybox) game.world.labels.visible = true;

  // fast boot for tests: ?mode=playing
  if (params.get('mode') === 'playing') {
    const primary = (params.get('loadout') ?? 'vc7') as never;
    const diff = (params.get('difficulty') ?? 'operator') as never;
    (window as unknown as { __qa: { startMission(p: string, d: string): void } }).__qa.startMission(primary, diff);
  } else {
    game.setMode('title');
  }

  if (qaMode && !testMode) {
    const badge = document.createElement('div');
    badge.id = 'qa-badge';
    badge.textContent = 'QA BUILD';
    document.getElementById('ui-root')!.appendChild(badge);
  }

  if (testMode) {
    // Deterministic test mode: no continuous RAF. The simulation advances and
    // renders exclusively through window.advanceTime(ms) (see dev/testhooks),
    // which keeps screenshots stable and headless capture reliable.
    game.frame(1 / 60);
    return;
  }

  // RAF loop
  let last = performance.now();
  const loop = (): void => {
    const now = performance.now();
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    clock.frame(dt);
    game.frame(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

void boot();
