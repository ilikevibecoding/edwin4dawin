import { Engine } from './app/engine';
import type { QualityName } from './engine/quality';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('view') as HTMLCanvasElement;
const qualityParam = params.get('q') as QualityName | null;

const engine = new Engine(canvas, qualityParam ?? undefined);
if (params.get('nopost')) engine.bypassPost = true;

// Per-pass overrides for debugging, e.g. ?qover=dof:0,ao:0,bloom:1
const qover = params.get('qover');
if (qover) {
  const q = engine.quality as unknown as Record<string, unknown>;
  for (const pair of qover.split(',')) {
    const [k, v] = pair.split(':');
    if (!k || v === undefined) continue;
    const num = Number(v);
    q[k] = Number.isNaN(num) ? v : v === '0' || v === '1' ? v === '1' : num;
  }
}
(window as unknown as { __engine: Engine }).__engine = engine;

function markReady(): void {
  // Tools wait on this before capturing.
  const w = window as unknown as { __engineReady?: boolean };
  const need = Number(params.get('rf') ?? 4);
  const tick = () => {
    if (engine.clock.frame > need) w.__engineReady = true;
    else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

async function boot(): Promise<void> {
  const loader = document.getElementById('loader')!;
  const dev = params.get('dev');

  if (dev === 'heads') {
    document.getElementById('menu')?.classList.add('hidden');
    const { runHeads } = await import('./dev/heads');
    const set = runHeads(engine, params);
    engine.setSet(set);
    if (params.get('stage')) engine.fx.debugStage = Number(params.get('stage'));
    engine.warm(Number(params.get('warm') ?? 3));
    engine.start();
    loader.classList.add('gone');
    markReady();
    return;
  }

  if (dev === 'portrait') {
    document.getElementById('menu')?.classList.add('hidden');
    const { runPortrait } = await import('./dev/portrait');
    const set = runPortrait(engine, params);
    engine.setSet(set);
    engine.warm(Number(params.get('warm') ?? 3.5));
    engine.start();
    loader.classList.add('gone');
    markReady();
    return;
  }

  const { Game } = await import('./game/game');
  const game = new Game(engine, params);
  (window as unknown as { __game: unknown }).__game = game;
  await game.boot();
  markReady();
}

boot().catch((e) => {
  console.error(e);
  const t = document.getElementById('loader-txt');
  if (t) t.textContent = `FAILED: ${String(e).slice(0, 120)}`;
});
