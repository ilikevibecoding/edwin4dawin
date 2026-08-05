import * as THREE from 'three';
import { Engine } from './core/Engine';
import type { TierName } from './core/Quality';
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

const container = document.getElementById('app') as HTMLElement;
const engine = new Engine(container, {
  tier,
  mode: renderMode ? 'fixed' : 'realtime',
  fixedStep: 1 / fps,
  width,
  height,
});
const factory = new ActorFactory(engine.assets);

declare global {
  interface Window {
    __ready?: boolean;
    __finished?: boolean;
    __step?: (frames?: number) => void;
    __cues?: () => unknown;
    __progress?: () => { time: number; frame: number; finished: boolean };
  }
}

async function boot(): Promise<void> {
  const rooftop = new RooftopSet(engine.quality);
  const director = new Director(engine, rooftop, { silent: renderMode });

  director.hud.setLoading(0.05, 'LOADING MODELS');
  await factory.preload();
  director.hud.setLoading(0.35, 'BUILDING SET');
  await rooftop.build(engine.renderer);
  director.useSet(rooftop, 'noirRain');
  director.hud.setLoading(0.6, 'LOADING VOICES');
  if (!renderMode) await director.audio.loadVoiceBank();
  director.hud.setLoading(1, 'READY');

  engine.onFrame(() => {
    // The Director drives the camera, HUD and story timers.
    director.update(engine.clock.dt, engine.clock.time);
  });

  const plan: AutoplayPlan | null = autoplay ? AUTOPLAY : null;
  if (plan) plan.attach(director);

  const run = async (): Promise<void> => {
    if (!renderMode) await director.audio.resume();
    // The screen stays black until the first chapter card fades itself up, so
    // the opening frames never show an unposed camera.
    director.hud.hideLoading();

    if (startChapter <= 1) await playChapter1(director, rooftop, factory);

    if (startChapter <= 2) {
      const house = new HouseholdSet(engine.quality);
      await house.build(engine.renderer);
      director.useSet(house, 'domestic');
      await playChapter2(director, house, factory);
    }

    if (startChapter <= 3) {
      const plaza = new PlazaSet(engine.quality);
      await plaza.build(engine.renderer);
      director.useSet(plaza, 'uprising');
      await playChapter3(director, plaza, factory);
    }

    // Epilogue card built from the flags the run set.
    director.hud.showCard('END OF DEMO', 'Neo Detroit', epilogueLines(director).join('   ·   '));
    director.hud.fade(0, 0.6);
    await director.wait(8);
    window.__finished = true;
  };

  if (renderMode) {
    window.__ready = true;
    let frame = 0;
    window.__step = (frames = 1) => {
      for (let i = 0; i < frames; i++) {
        engine.step(engine.fixedStep);
        frame++;
      }
    };
    window.__progress = () => ({ time: engine.clock.time, frame, finished: Boolean(window.__finished) });
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
