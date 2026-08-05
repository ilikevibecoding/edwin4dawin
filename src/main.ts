import * as THREE from 'three';
import { Game } from './engine/Game';
import { Input } from './engine/Input';
import { Quality } from './engine/Post';
import { clamp } from './engine/math';
import { Hud } from './ui/Hud';
import { StoryRunner } from './story/StoryRunner';
import { CHAPTER_LABELS, ENDING_NODES, SCRIPT } from './story/script';
import { DEMO_PLAN } from './story/demo';

const params = new URLSearchParams(location.search);
const captureMode = params.get('capture') === '1';
const autoMode = captureMode || params.get('auto') === '1';
const quality = (params.get('q') ?? (captureMode ? 'balanced' : 'high')) as Quality;
const startLabel = params.get('from');
const showPerf = params.get('perf') === '1';

const canvas = document.getElementById('view') as HTMLCanvasElement;
const width = Number(params.get('w') ?? window.innerWidth);
const height = Number(params.get('h') ?? window.innerHeight);
if (captureMode) {
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
}

const game = new Game({ canvas, quality, width, height });
const hud = new Hud(captureMode);
const input = new Input(window);

const loader = document.getElementById('loader')!;
const loaderText = document.getElementById('loader-text')!;
const menu = document.getElementById('menu')!;
const menuItems = document.getElementById('menu-items')!;

let runner: StoryRunner | null = null;
let state: 'menu' | 'playing' | 'ending' = 'menu';
let endingShown = false;

function makeRunner(): StoryRunner {
  const r = new StoryRunner(game, hud, input, {
    auto: autoMode,
    plan: DEMO_PLAN,
  });
  r.load(SCRIPT);
  return r;
}

function beginStory(label?: string) {
  menu.classList.add('hidden');
  hud.hudVisible(true);
  hud.removeMeters();
  // Clear anything left over from the menu or a previous run.
  hud.hideTitle();
  hud.hideChoices();
  hud.hideQte();
  hud.hideLine();
  hud.hideFlowchart();
  hud.setScanMode(false);
  hud.setMarkers([]);
  hud.showStress(0, false);
  hud.letterbox(true);
  hud.setObjective('—');
  const p = game.post.params;
  p.deviancy = 0;
  p.glitch = 0;
  p.whiteFlash = 0;
  p.fadeToBlack = 0;
  p.scanPulse = 0;
  runner = makeRunner();
  if (label) runner.seekToLabel(label);
  state = 'playing';
  endingShown = false;
}

// ------------------------------------------------------------------- menu
interface MenuEntry {
  label: string;
  note?: string;
  action: () => void;
}

let menuIndex = 0;
let entries: MenuEntry[] = [];

function buildMenu() {
  entries = [
    { label: 'New Game', note: '5 chapters · ~11 min', action: () => beginStory() },
    { label: 'Auto-play Demo', note: 'hands-off playthrough', action: () => {
        location.search = '?auto=1';
      } },
    ...CHAPTER_LABELS.filter((c) => c.label).map((c) => ({
      label: c.title,
      note: 'chapter select',
      action: () => beginStory(c.label),
    })),
    {
      label: `Quality: ${quality}`,
      note: 'cinema / high / balanced / fast',
      action: () => {
        const order: Quality[] = ['fast', 'balanced', 'high', 'cinema'];
        const next = order[(order.indexOf(quality) + 1) % order.length];
        location.search = `?q=${next}`;
      },
    },
  ];
  menuItems.innerHTML = '';
  entries.forEach((e, i) => {
    const el = document.createElement('div');
    el.className = `menu-item${i === menuIndex ? ' sel' : ''}`;
    el.innerHTML = `<span>${e.label}</span>${e.note ? `<span class="mi-note">${e.note}</span>` : ''}`;
    el.addEventListener('mouseenter', () => {
      menuIndex = i;
      refreshMenu();
    });
    el.addEventListener('click', () => e.action());
    menuItems.appendChild(el);
  });
}

function refreshMenu() {
  [...menuItems.children].forEach((el, i) => el.classList.toggle('sel', i === menuIndex));
}

function menuInput() {
  if (input.wasPressed('ArrowDown')) {
    menuIndex = (menuIndex + 1) % entries.length;
    refreshMenu();
  }
  if (input.wasPressed('ArrowUp')) {
    menuIndex = (menuIndex - 1 + entries.length) % entries.length;
    refreshMenu();
  }
  if (input.wasPressed('Enter') || input.wasPressed(' ')) entries[menuIndex].action();
}

// --------------------------------------------------------------- title idle
function menuScene() {
  // The menu sits inside the rainy street, slowly drifting.
  const rig = game.rig;
  rig.cut({
    from: () => {
      const t = game.time * 0.06;
      return new THREE.Vector3(2.2 + Math.sin(t) * 1.6, 2.4 + Math.sin(t * 0.7) * 0.25, 13.5 + Math.cos(t) * 1.2);
    },
    to: new THREE.Vector3(-9.0, 2.4, 3.0),
    fov: 34,
    aperture: 9,
    focalRange: 10,
    handheld: 0.35,
  });
}

// ------------------------------------------------------------------- ending
function showEnding(r: StoryRunner) {
  endingShown = true;
  const [title, body] = r.ending;
  hud.hudVisible(false);
  hud.letterbox(true);
  hud.showFlowchart(title ?? 'ENDING', ENDING_NODES, r.takenNodes, [
    ...r.statsForEnding,
    ['OUTCOME', body ?? ''],
  ]);
  state = 'ending';
}

// --------------------------------------------------------------------- loop
let firstFrame = true;

function frame(dt: number) {
  input.update();
  if (state === 'menu') {
    if (!captureMode) menuInput();
  } else if (state === 'playing' && runner) {
    runner.update(dt);
    if (runner.finished && !endingShown) showEnding(runner);
  }
  hud.update(dt);
  game.frame(dt);
  if (showPerf) {
    const info = game.renderer.info.render;
    hud.setPerf(`${game.fps.toFixed(0)} fps · ${info.triangles.toLocaleString()} tris · ${info.calls} calls`);
  }
  input.endFrame();
  if (firstFrame) {
    firstFrame = false;
    loader.classList.add('gone');
  }
}

async function boot() {
  loaderText.textContent = 'BUILDING DETROIT';
  await new Promise((r) => setTimeout(r, 30));

  // Warm the opening set and the hero cast so the first frame is not a stall.
  const bootRunner = makeRunner();
  bootRunner.seekToLabel('ch1.merge');
  loaderText.textContent = 'CALIBRATING OPTICAL UNITS';
  await new Promise((r) => setTimeout(r, 30));
  game.step(1 / 30);
  game.render(1 / 30);

  buildMenu();
  menuScene();
  hud.hudVisible(false);
  hud.letterbox(false);

  if (captureMode || autoMode || startLabel) {
    beginStory(startLabel ?? undefined);
  } else {
    state = 'menu';
    menu.classList.remove('hidden');
  }

  if (!captureMode) {
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000 || 1 / 60);
      last = now;
      frame(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  } else {
    // Offline render: Node drives the clock one fixed step at a time.
    (window as unknown as { __capture: unknown }).__capture = {
      frame(dt: number) {
        frame(dt);
        return game.time;
      },
      /** Jump the review sampler to a script label. */
      jump(label: string) {
        beginStory(label);
        frame(1 / 30);
        return true;
      },
      get finished() {
        return state === 'ending';
      },
      get time() {
        return game.time;
      },
      probe() {
        return game.post.probe();
      },
    };
    frame(1 / 30);
  }

  (window as unknown as { __ready: boolean }).__ready = true;
}

window.addEventListener('resize', () => {
  if (captureMode) return;
  game.resize(window.innerWidth, window.innerHeight);
});

(window as unknown as { __game: Game }).__game = game;
void clamp;
boot();
