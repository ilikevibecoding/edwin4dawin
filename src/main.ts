import { Engine } from './core/Engine';
import { detectQualityTier, makeConfig, type QualityTier } from './core/Config';
import { ProcgenSystemImpl } from './procgen';
import { PhysicsSystemImpl } from './physics';
import { RenderSystemImpl } from './render';
import { WorldSystemImpl } from './world';
import { PlayerSystemImpl } from './player';
import { WeaponSystemImpl } from './weapons';
import { CombatSystemImpl } from './combat';
import { AISystemImpl } from './ai';
import { FXSystemImpl } from './fx';
import { AudioSystemImpl } from './audio';
import { UISystemImpl } from './ui';
import { KillstreakSystemImpl } from './killstreaks';

const bootEl = document.getElementById('boot') as HTMLDivElement;
const barEl = document.getElementById('boot-bar-fill') as HTMLDivElement;
const statusEl = document.getElementById('boot-status') as HTMLDivElement;
const errorEl = document.getElementById('boot-error') as HTMLPreElement;
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

const LABELS: Record<string, string> = {
  procgen: 'Generating materials',
  physics: 'Starting physics',
  render: 'Compiling shaders',
  world: 'Building map',
  player: 'Deploying operator',
  weapons: 'Loading weapons',
  combat: 'Arming systems',
  ai: 'Briefing hostiles',
  fx: 'Priming effects',
  audio: 'Mixing audio',
  ui: 'Calibrating HUD',
  killstreaks: 'Linking air support',
  ready: 'Ready',
};

function setProgress(fraction: number, label: string): void {
  barEl.style.width = `${Math.round(fraction * 100)}%`;
  statusEl.textContent = LABELS[label] ?? label;
}

function fatal(err: unknown): void {
  const message = err instanceof Error ? `${err.message}\n\n${err.stack ?? ''}` : String(err);
  console.error(err);
  errorEl.style.display = 'block';
  errorEl.textContent = message;
  statusEl.textContent = 'Failed to start';
  bootEl.classList.remove('hidden');
}

function parseQualityOverride(): QualityTier | null {
  const q = new URLSearchParams(location.search).get('quality');
  if (q === 'low' || q === 'medium' || q === 'high' || q === 'ultra') return q;
  return null;
}

async function boot(): Promise<void> {
  // Probe on a throwaway canvas — a canvas can only ever hand out one context,
  // so probing the real one would leave nothing for the renderer.
  const probeCanvas = document.createElement('canvas');
  probeCanvas.width = probeCanvas.height = 1;
  const probe = probeCanvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false });
  if (!probe) {
    throw new Error(
      'WebGL 2 is not available in this browser.\nEnable hardware acceleration or try a recent Chrome, Edge, Firefox or Safari.',
    );
  }
  const detected = detectQualityTier(probe);
  probe.getExtension('WEBGL_lose_context')?.loseContext();

  const stored = localStorage.getItem('ob.quality') as QualityTier | null;
  const tier = parseQualityOverride() ?? stored ?? detected;
  const config = makeConfig(tier);

  const engine = new Engine({ canvas, config });

  engine.add(new ProcgenSystemImpl());
  engine.add(new PhysicsSystemImpl());
  engine.add(new RenderSystemImpl());
  engine.add(new WorldSystemImpl());
  engine.add(new FXSystemImpl());
  engine.add(new AudioSystemImpl());
  engine.add(new CombatSystemImpl());
  engine.add(new PlayerSystemImpl());
  engine.add(new WeaponSystemImpl());
  engine.add(new AISystemImpl());
  engine.add(new KillstreakSystemImpl());
  engine.add(new UISystemImpl());

  await engine.init(setProgress);

  engine.start();

  // Keep the boot overlay up for one painted frame so the first frame is warm.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      bootEl.classList.add('hidden');
      window.setTimeout(() => {
        bootEl.style.display = 'none';
      }, 800);
    });
  });

  // Expose for debugging and for the automated screenshot harness.
  (window as unknown as { GAME: unknown }).GAME = engine;
  (window as unknown as { GAME_READY: boolean }).GAME_READY = true;
}

window.addEventListener('error', (e) => {
  if (!(window as unknown as { GAME_READY?: boolean }).GAME_READY) fatal(e.error ?? e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  if (!(window as unknown as { GAME_READY?: boolean }).GAME_READY) fatal(e.reason);
});

boot().catch(fatal);
