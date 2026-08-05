/**
 * Graphics lab.
 *
 * Renders a fixed set of framings from the real chapter sets so the look can be
 * reviewed from stills. Deliberately deterministic: the clock is advanced by a
 * fixed step and every shot is warmed up for the same number of frames, so two
 * captures differ only by the changes made in between.
 */
import * as THREE from 'three';
import { Engine } from './core/Engine';
import type { TierName } from './core/Quality';
import { RooftopSet } from './sets/RooftopSet';
import { HouseholdSet } from './sets/HouseholdSet';
import { PlazaSet } from './sets/PlazaSet';
import { ActorFactory } from './actors/Cast';
import { DOF } from './render/LookConfig';
import type { SceneSet } from './sets/SceneSet';

interface ShotDef {
  name: string;
  set: 'rooftop' | 'household' | 'plaza';
  pos: [number, number, number];
  target: [number, number, number];
  fov?: number;
  bokeh?: number;
  roll?: number;
  /** Extra warm-up seconds before capture (for animation-dependent shots). */
  settle?: number;
}

const SHOTS: ShotDef[] = [
  { name: '01_wide', set: 'rooftop', pos: [-6.2, 2.35, 7.4], target: [1.2, 1.1, -3.6], fov: 34 },
  { name: '02_standoff_ots', set: 'rooftop', pos: [-1.35, 1.62, 1.85], target: [1.5, 1.35, -4.3], fov: 40, bokeh: DOF.bokehMedium },
  { name: '03_orion_cu', set: 'rooftop', pos: [-0.72, 1.63, 0.62], target: [-0.24, 1.62, 0.05], fov: 32, bokeh: DOF.bokehCloseUp },
  { name: '04_deviant_cu', set: 'rooftop', pos: [1.9, 1.66, -2.85], target: [1.2, 1.6, -4.1], fov: 34, bokeh: DOF.bokehCloseUp },
  { name: '05_hostage', set: 'rooftop', pos: [3.6, 1.5, -2.4], target: [1.9, 1.05, -4.85], fov: 38, bokeh: DOF.bokehMedium },
  { name: '06_low_wet', set: 'rooftop', pos: [3.1, 0.28, 2.1], target: [-1.6, 1.5, -3.2], fov: 42 },
  { name: '07_skyline', set: 'rooftop', pos: [1.2, 1.75, -3.0], target: [6.5, 0.2, -14.0], fov: 40 },
  { name: '08_troopers', set: 'rooftop', pos: [-2.2, 1.7, 4.6], target: [-4.8, 1.4, 2.8], fov: 36, bokeh: DOF.bokehMedium },
  { name: '09_house_wide', set: 'household', pos: [3.4, 1.65, 3.9], target: [-0.8, 1.2, -1.2], fov: 34 },
  { name: '10_house_cu', set: 'household', pos: [-0.15, 1.6, 0.95], target: [-0.75, 1.58, 0.1], fov: 34, bokeh: DOF.bokehCloseUp },
  { name: '11_plaza_wide', set: 'plaza', pos: [0.5, 2.4, 10.5], target: [0, 1.6, -3.5], fov: 36 },
  { name: '12_plaza_atlas', set: 'plaza', pos: [-1.1, 1.72, 2.2], target: [0.15, 1.68, -0.4], fov: 38, bokeh: DOF.bokehCloseUp },
];

const params = new URLSearchParams(location.search);
const tier = (params.get('tier') as TierName) || 'cinema';
const only = params.get('only');
const width = Number(params.get('w') || 1280);
const height = Number(params.get('h') || 720);

const container = document.getElementById('app') as HTMLElement;
const engine = new Engine(container, { tier, mode: 'fixed', width, height });
const factory = new ActorFactory(engine.assets);

const sets: Partial<Record<ShotDef['set'], SceneSet>> = {};

async function buildRooftop(): Promise<SceneSet> {
  const set = new RooftopSet(engine.quality);
  await set.build(engine.renderer);
  const orion = await factory.spawn('orion');
  orion.root.position.copy(set.marks.standoff);
  orion.faceToward(set.marks.deviant, true);
  orion.setLed('process');
  set.addActor('orion', orion);

  const deviant = await factory.spawn('deviant');
  deviant.root.position.copy(set.marks.deviant);
  deviant.faceToward(set.marks.standoff, true);
  deviant.setLed('stress');
  deviant.agitation = 0.9;
  deviant.setPose('holdHostage', 1, { fadeIn: 0 });
  set.addActor('deviant', deviant);

  const child = await factory.spawn('child');
  child.root.position.copy(set.marks.hostage);
  child.faceToward(set.marks.standoff, true);
  child.setPose('flinch', 0.55, { fadeIn: 0 });
  child.agitation = 1;
  set.addActor('child', child);

  for (let i = 0; i < set.marks.troopers.length; i++) {
    const t = await factory.spawn('trooper', { name: `TROOPER ${i + 1}` });
    t.root.position.copy(set.marks.troopers[i]);
    t.faceToward(set.marks.deviant, true);
    t.setPose('aimPistol', 0.9, { fadeIn: 0 });
    set.addActor(`trooper${i}`, t);
  }
  return set;
}

async function buildHousehold(): Promise<SceneSet> {
  const set = new HouseholdSet(engine.quality);
  await set.build(engine.renderer);
  const cass = await factory.spawn('cass');
  cass.root.position.copy(set.marks.cass);
  cass.faceToward(set.marks.owner, true);
  cass.setLed('calm');
  set.addActor('cass', cass);

  const child = await factory.spawn('child');
  child.root.position.copy(set.marks.child);
  child.faceToward(set.marks.cass, true);
  set.addActor('child', child);
  return set;
}

async function buildPlaza(): Promise<SceneSet> {
  const set = new PlazaSet(engine.quality);
  await set.build(engine.renderer);
  const atlas = await factory.spawn('atlas');
  atlas.root.position.copy(set.marks.podium);
  atlas.faceToward(set.marks.crowdCentre, true);
  atlas.setLed('calm');
  atlas.setPose('raiseFist', 0.8, { fadeIn: 0 });
  set.addActor('atlas', atlas);
  await set.populateCrowd(factory);
  return set;
}

async function ensureSet(kind: ShotDef['set']): Promise<SceneSet> {
  let set = sets[kind];
  if (!set) {
    set = kind === 'rooftop' ? await buildRooftop() : kind === 'household' ? await buildHousehold() : await buildPlaza();
    sets[kind] = set;
  }
  return set;
}

const shots = only ? SHOTS.filter((s) => s.name.includes(only)) : SHOTS;

declare global {
  interface Window {
    __ready?: boolean;
    __shot?: (i: number) => Promise<void>;
    __shotNames?: () => string[];
    __shotDone?: boolean;
    __stats?: () => Record<string, number | string>;
  }
}

window.__shotNames = () => shots.map((s) => s.name);

window.__shot = async (i: number): Promise<void> => {
  const shot = shots[i];
  const set = await ensureSet(shot.set);
  const grade = shot.set === 'household' ? 'domestic' : shot.set === 'plaza' ? 'uprising' : 'noirRain';
  engine.setStage(set, grade);

  const cam = set.camera;
  cam.position.set(...shot.pos);
  cam.fov = shot.fov ?? 35;
  cam.up.set(0, 1, 0);
  cam.lookAt(new THREE.Vector3(...shot.target));
  if (shot.roll) cam.rotateZ(shot.roll);
  cam.updateProjectionMatrix();

  const focus = new THREE.Vector3(...shot.target);
  engine.postFX?.focusOn(focus, cam, true);
  if (engine.postFX) engine.postFX.bokeh = shot.bokeh ?? DOF.bokehWide;
  engine.postFX?.setLensRain(shot.set === 'household' ? 0.12 : 0.5, true);

  // Warm up: animation blending, rain wrap, reflections and pose easing all need
  // a few frames before the frame is representative.
  const steps = Math.round((shot.settle ?? 1.6) / (1 / 30));
  for (let s = 0; s < steps; s++) {
    cam.lookAt(new THREE.Vector3(...shot.target));
    if (shot.roll) cam.rotateZ(shot.roll);
    engine.step(1 / 30);
  }
  window.__shotDone = true;
};

window.__stats = () => ({
  tier: engine.quality.name,
  triangles: engine.triangleCount,
  frameMs: Math.round(engine.lastFrameMs),
  size: `${engine.renderer.domElement.width}x${engine.renderer.domElement.height}`,
});

// Warm the shared asset set before signalling readiness.
void (async () => {
  await factory.preload();
  await ensureSet(shots[0]?.set ?? 'rooftop');
  window.__ready = true;
})();
