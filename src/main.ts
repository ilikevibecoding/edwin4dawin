import * as THREE from 'three';
import { Engine } from './core/Engine';
import type { QualitySettings, TierName } from './core/Quality';
import { RooftopSet } from './sets/RooftopSet';
import { HouseholdSet } from './sets/HouseholdSet';
import { PlazaSet } from './sets/PlazaSet';
import { ActorFactory } from './actors/Cast';
import { Director } from './story/Director';
import { playChapter1 } from './story/chapter1';
import { playChapter2 } from './story/chapter2';
import { playChapter3, epilogueLines } from './story/chapter3';
import { AUTOPLAY, type AutoplayPlan } from './story/Autoplay';

/**
 * Game entry point.
 *
 * Runs in one of two modes. Live, it drives a real-time loop against player
 * input. With `?render=1` it switches the clock to a fixed timestep and feeds
 * scripted input, so an external capture harness can advance the game exactly
 * one frame at a time and end up with a deterministic recording of the same
 * performance.
 */

const params = new URLSearchParams(location.search);
const renderMode = params.get('render') === '1';
const autoplay = renderMode || params.get('auto') === '1';
const tier = (params.get('tier') as TierName) || undefined;
const startChapter = Number(params.get('chapter') || 1);
const width = Number(params.get('w') || 0) || undefined;
const height = Number(params.get('h') || 0) || undefined;
const fps = Number(params.get('fps') || 24);
// Fast-forward for flow testing: every wait, camera move and timer scales
// together, so the script can be walked end to end in a fraction of the frames.
const speed = Number(params.get('speed') || 1);

/**
 * Reproducible capture.
 *
 * The rain, the haze, the crowd layout, the handheld camera noise and every
 * actor's breathing phase are all seeded from the global source of randomness,
 * so two captures of the same script produced visibly different films — and a
 * capture that crashed and resumed produced a film that jumped. Rather than
 * thread a seeded generator through several dozen call sites, the capture path
 * replaces the global source. Live play keeps the real thing, because there the
 * variety is the point.
 */
function seedRandomness(seed: number): void {
  let s = seed >>> 0 || 1;
  Math.random = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
if (renderMode || params.has('seed')) seedRandomness(Number(params.get('seed') ?? 20380811));

/**
 * Per-setting quality overrides, as `q.<setting>=<value>` in the query string.
 * Used to measure what a given cost is actually worth on the target machine —
 * `?q.planarReflections=0` answers "how much are the wet-floor reflections
 * costing us per frame" in one capture rather than by guessing.
 */
function qualityOverrides(): Partial<QualitySettings> {
  const out: Record<string, number | boolean | string> = {};
  for (const [key, raw] of params) {
    if (!key.startsWith('q.')) continue;
    const name = key.slice(2);
    if (raw === 'true' || raw === 'false') out[name] = raw === 'true';
    else if (raw !== '' && !Number.isNaN(Number(raw))) out[name] = Number(raw);
    else out[name] = raw;
  }
  return out as Partial<QualitySettings>;
}

const container = document.getElementById('app') as HTMLElement;
const engine = new Engine(container, {
  tier,
  qualityOverrides: qualityOverrides(),
  mode: renderMode ? 'fixed' : 'realtime',
  preserveDrawingBuffer: params.has('nopreserve') ? false : undefined,
  fixedStep: 1 / fps,
  width,
  height,
});
const factory = new ActorFactory(engine.assets);

declare global {
  interface Window {
    __ready?: boolean;
    __finished?: boolean;
    __step?: (frames?: number) => Promise<void>;
    __skip?: (frames?: number) => Promise<void>;
    __flush?: () => void;
    __where?: () => {
      time: number;
      frame: number;
      path: string[];
      scanActive: boolean;
      cluesFound: number;
      subtitle: string;
      camera: number[];
    };
    __cues?: () => unknown;
    __progress?: () => { time: number; frame: number; finished: boolean };
  }
}

async function boot(): Promise<void> {
  const rooftop = new RooftopSet(engine.quality);
  const director = new Director(engine, rooftop, { silent: renderMode });

  director.hud.setLoading(0.05, 'LOADING MODELS');
  await factory.preload();
  director.hud.setLoading(0.3, 'BUILDING ROOFTOP');
  await rooftop.build(engine.renderer);
  director.useSet(rooftop, 'noirRain');
  // Later chapters are built now rather than when they start. Building mid-story
  // stalls the script for as long as the build takes, which in a fixed-step
  // capture is a run of identical frames in the middle of the film.
  director.hud.setLoading(0.5, 'BUILDING INTERIOR');
  const house = new HouseholdSet(engine.quality);
  await house.build(engine.renderer);
  director.hud.setLoading(0.7, 'BUILDING SQUARE');
  const plaza = new PlazaSet(engine.quality);
  await plaza.build(engine.renderer);
  director.hud.setLoading(0.85, 'LOADING VOICES');
  // The manifest is loaded even for a silent capture: it carries the real line
  // durations and viseme tracks, so the subtitles hold for as long as the mixed
  // soundtrack actually speaks and the mouths match it.
  await director.audio.loadVoiceBank();
  director.hud.setLoading(1, 'READY');

  // Autoplay runs first so injected keys are visible to the Director in the same
  // frame; input is cleared at the end of every step.
  const plan: AutoplayPlan | null = autoplay ? AUTOPLAY : null;
  if (plan) plan.attach(director);

  if (speed !== 1) engine.clock.setTimeScale(speed);

  engine.onFrame(() => {
    // The Director drives the camera, HUD and story timers.
    director.update(engine.clock.dt, engine.clock.time);
  });

  const run = async (): Promise<void> => {
    if (!renderMode) await director.audio.resume();
    // The screen stays black until the first chapter card fades itself up, so
    // the opening frames never show an unposed camera.
    director.hud.hideLoading();

    if (startChapter <= 1) await playChapter1(director, rooftop, factory);

    if (startChapter <= 2) {
      director.useSet(house, 'domestic');
      await playChapter2(director, house, factory);
    }

    if (startChapter <= 3) {
      director.useSet(plaza, 'uprising');
      await playChapter3(director, plaza, factory);
    }

    // Epilogue: one card per chapter outcome, then the closing title. The text
    // is assembled from the flags this particular run set, so two playthroughs
    // do not end the same way.
    for (const result of director.state.results) {
      director.hud.showCard(result.outcome, result.chapter, result.detail);
      await director.wait(5.5);
      director.hud.hideCard();
      await director.wait(1.1);
    }
    const closing = epilogueLines(director);
    director.hud.showCard('END OF DEMO', 'Neo Detroit', closing[closing.length - 1] ?? '');
    await director.wait(7);
    director.hud.hideCard();
    await director.wait(2);
    window.__finished = true;
  };

  if (renderMode) {
    window.__ready = true;
    let frame = 0;
    /**
     * Advancing the clock is not enough to advance the story: the chapters are
     * async functions, and their continuations are microtasks that cannot run
     * while a synchronous loop holds the stack. Every step therefore drains the
     * microtask queue, or a batch of steps would move time forward while the
     * script stayed on the same line.
     */
    const drain = async (): Promise<void> => {
      for (let k = 0; k < 6; k++) await Promise.resolve();
    };
    window.__step = async (frames = 1) => {
      for (let i = 0; i < frames; i++) {
        engine.step(engine.fixedStep);
        frame++;
        await drain();
      }
    };
    // Simulate without drawing, to catch back up after an interrupted capture.
    window.__skip = async (frames = 1) => {
      for (let i = 0; i < frames; i++) {
        engine.step(engine.fixedStep, { draw: false });
        frame++;
        await drain();
      }
    };
    /**
     * Blocks until the frame is actually rasterised.
     *
     * WebGL draw calls only queue work, and on a software rasteriser the queue is
     * where nearly all of the cost sits. Without this, a step appears to take
     * 200ms and whatever forces the pipeline to drain — the screenshot — appears
     * to take 1.5s, which sends you optimising the wrong half of the pipeline.
     */
    window.__flush = () => {
      engine.renderer.getContext().finish();
    };
    window.__progress = () => ({ time: engine.clock.time, frame, finished: Boolean(window.__finished) });
    // Where the script has actually got to, for checking that two captures of the
    // same story agree rather than only that two frames look similar.
    window.__where = () => ({
      time: engine.clock.time,
      frame,
      path: [...director.state.path],
      scanActive: director.scanActive,
      cluesFound: director.hud.clueList.filter((c) => c.found).length,
      subtitle: document.querySelector('#subtitle .line')?.textContent ?? '',
      camera: director.set.camera.position.toArray().map((n) => Number(n.toFixed(2))),
    });
    window.__cues = () => director.cues;
    void run();
  } else {
    engine.start();
    director.hud.hideLoading();
    director.hud.showMenu(() => {
      void run();
    });
    window.__ready = true;
  }
}

void boot().catch((err) => {
  console.error(err);
  const el = document.querySelector('#loading .msg');
  if (el) el.textContent = `FAILED: ${String(err).slice(0, 120)}`;
});

// Keep the canvas filling the window in live play.
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyF' && !renderMode) {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void container.requestFullscreen();
  }
});

export {};
void THREE;
