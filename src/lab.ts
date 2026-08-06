/**
 * Scene lab.
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
import type { SceneSet } from './sets/SceneSet';
import { closeUp, establish, lowAngle, medium, overShoulder, single, twoShot, type Shot } from './cine/Framing';
import { RAIN } from './render/LookConfig';

type SetKind = 'rooftop' | 'household' | 'plaza';

/** Sets expose named staging marks that shots are composed against. */
type MarkedSet = SceneSet & { marks: Record<string, THREE.Vector3 | THREE.Vector3[]> };

interface ShotDef {
  name: string;
  set: SetKind;
  build: (set: MarkedSet) => Shot;
  /** Actor the portrait rig should light for this shot. */
  subject?: string;
  keySide?: number;
  /** Extra warm-up seconds before capture. */
  settle?: number;
}

const params = new URLSearchParams(location.search);
const tier = (params.get('tier') as TierName) || 'cinema';
const only = params.get('only');
const width = Number(params.get('w') || 1280);
const height = Number(params.get('h') || 720);
/**
 * Isolation switches, e.g. `?dbg=nofog,nowet`. Judging which of a dozen
 * overlapping contributions is lifting a surface is guesswork from a single
 * frame, so each one can be removed and re-metered on its own.
 */
const dbg = new Set((params.get('dbg') || '').split(',').filter(Boolean));

const container = document.getElementById('app') as HTMLElement;
const engine = new Engine(container, { tier, mode: 'fixed', width, height });
const factory = new ActorFactory(engine.assets);
const sets: Partial<Record<SetKind, SceneSet>> = {};

async function buildRooftop(): Promise<SceneSet> {
  const set = new RooftopSet(engine.quality);
  await set.build(engine.renderer);

  const orion = await factory.spawn('orion');
  orion.root.position.copy((set.marks.standoff as THREE.Vector3));
  orion.faceToward((set.marks.deviant as THREE.Vector3), true);
  orion.setLed('process');
  set.addActor('orion', orion);

  const deviant = await factory.spawn('deviant');
  deviant.root.position.copy((set.marks.deviant as THREE.Vector3));
  deviant.faceToward((set.marks.standoff as THREE.Vector3), true);
  deviant.setLed('stress');
  deviant.agitation = 0.9;
  deviant.setPose('holdHostage', 1, { fadeIn: 0 });
  set.addActor('deviant', deviant);

  const child = await factory.spawn('child');
  child.root.position.copy(set.marks.hostage);
  child.faceToward((set.marks.standoff as THREE.Vector3), true);
  child.setPose('flinch', 0.5, { fadeIn: 0 });
  child.agitation = 1;
  set.addActor('child', child);

  for (let i = 0; i < set.marks.troopers.length; i++) {
    const t = await factory.spawn('trooper', { name: `TROOPER ${i + 1}` });
    t.root.position.copy(set.marks.troopers[i]);
    t.faceToward((set.marks.deviant as THREE.Vector3), true);
    t.setPose('aimPistol', 0.9, { fadeIn: 0 });
    set.addActor(`trooper${i}`, t);
  }

  orion.lookAt(deviant.getEyePosition(new THREE.Vector3()), 1);
  deviant.lookAt(orion.getEyePosition(new THREE.Vector3()), 1);
  child.lookAt(orion.getEyePosition(new THREE.Vector3()), 0.8);
  return set;
}

async function buildHousehold(): Promise<SceneSet> {
  const set = new HouseholdSet(engine.quality);
  await set.build(engine.renderer);
  const cass = await factory.spawn('cass');
  cass.root.position.copy(set.marks.cass);
  cass.faceToward((set.marks.owner as THREE.Vector3), true);
  cass.setLed('calm');
  set.addActor('cass', cass);

  const child = await factory.spawn('child');
  child.root.position.copy(set.marks.child);
  child.faceToward(set.marks.cass, true);
  set.addActor('child', child);

  const owner = await factory.spawn('owner');
  owner.root.position.copy(set.marks.owner);
  owner.faceToward(set.marks.cass, true);
  owner.setPose('pointForward', 0.8, { fadeIn: 0 });
  set.addActor('owner', owner);

  cass.lookAt(child.getEyePosition(new THREE.Vector3()), 1);
  child.lookAt(cass.getEyePosition(new THREE.Vector3()), 1);
  owner.lookAt(cass.getEyePosition(new THREE.Vector3()), 1);
  return set;
}

async function buildPlaza(): Promise<SceneSet> {
  const set = new PlazaSet(engine.quality);
  await set.build(engine.renderer);
  const atlas = await factory.spawn('atlas');
  atlas.root.position.copy(set.marks.podium);
  atlas.faceToward(set.marks.crowdCentre, true);
  atlas.setLed('calm');
  atlas.setPose('raiseFist', 0.85, { fadeIn: 0 });
  set.addActor('atlas', atlas);

  const commander = await factory.spawn('commander');
  commander.root.position.copy(set.marks.commander);
  commander.faceToward(set.marks.podium, true);
  set.addActor('commander', commander);

  await set.populateCrowd(factory);
  return set;
}

async function ensureSet(kind: SetKind): Promise<SceneSet> {
  let set = sets[kind];
  if (!set) {
    set = kind === 'rooftop' ? await buildRooftop() : kind === 'household' ? await buildHousehold() : await buildPlaza();
    sets[kind] = set;
  }
  return set;
}

const SHOTS: ShotDef[] = [
  {
    name: '01_rooftop_wide',
    subject: 'orion',
    keySide: -1,
    set: 'rooftop',
    build: (set) =>
      establish(new THREE.Vector3(-4.6, 2.5, 6.6), new THREE.Vector3(1.4, 1.2, -4.2), {
        lens: 28,
        focusOn: set.actor('deviant').getChestPosition(new THREE.Vector3()),
      }),
  },
  {
    name: '02_standoff_ots',
    subject: 'deviant',
    keySide: 1,
    set: 'rooftop',
    build: (set) => overShoulder(set.actor('orion'), set.actor('deviant'), { lens: 40, side: 1 }),
  },
  { name: '03_orion_cu', subject: 'orion', keySide: -1, set: 'rooftop', build: (set) => closeUp(set.actor('orion'), { lookingAt: (set.marks.deviant as THREE.Vector3) }) },
  {
    name: '04_deviant_cu',
    subject: 'deviant',
    keySide: 1,
    set: 'rooftop',
    build: (set) => closeUp(set.actor('deviant'), { lookingAt: (set.marks.standoff as THREE.Vector3), lens: 75, distance: 1.15 }),
  },
  {
    name: '05_hostage',
    subject: 'child',
    keySide: -1,
    set: 'rooftop',
    build: (set) => single(set.actor('child'), { lookingAt: (set.marks.standoff as THREE.Vector3), lens: 85, distance: 2.6, angle: 1.15 }),
  },
  {
    name: '06_two_shot',
    subject: 'deviant',
    keySide: 1,
    set: 'rooftop',
    build: (set) => twoShot(set.actor('deviant'), set.actor('child'), { lens: 40, side: 1, distance: 3.4 }),
  },
  {
    name: '07_low_wet',
    subject: 'orion',
    keySide: -1,
    set: 'rooftop',
    build: (set) =>
      establish(new THREE.Vector3(2.6, 0.34, 1.6), new THREE.Vector3(-1.2, 1.4, -3.4), {
        lens: 24,
        focusOn: set.actor('orion').getChestPosition(new THREE.Vector3()),
        bokeh: 1.2,
      }),
  },
  {
    name: '08_skyline',
    set: 'rooftop',
    build: (set) =>
      establish(new THREE.Vector3(-1.6, 1.5, 2.2), new THREE.Vector3(3.4, 3.0, -18.0), {
        lens: 32,
        bokeh: 1.0,
        focusOn: set.actor('deviant').getChestPosition(new THREE.Vector3()),
      }),
  },
  { name: '09_trooper', subject: 'trooper0', keySide: 1, set: 'rooftop', build: (set) => medium(set.actor('trooper0'), { lookingAt: set.marks.deviant as THREE.Vector3, lens: 50, distance: 2.7 }) },
  {
    name: '17_owner_low',
    subject: 'owner',
    keySide: 1,
    set: 'household',
    build: (set) => lowAngle(set.actor('owner'), { lens: 40, distance: 2.3 }),
  },
  {
    name: '18_atlas_low',
    subject: 'atlas',
    keySide: -1,
    set: 'plaza',
    build: (set) => lowAngle(set.actor('atlas'), { lens: 38, distance: 3.0 }),
  },
  {
    name: '15_title_a',
    set: 'rooftop',
    build: () => establish(new THREE.Vector3(6.0, 3.2, 3.0), new THREE.Vector3(-14.0, 6.5, -22.0), { lens: 34, bokeh: 0.9 }),
  },
  {
    name: '16_title_b',
    set: 'rooftop',
    build: () => establish(new THREE.Vector3(2.6, 1.5, 5.0), new THREE.Vector3(0.4, 3.2, -16.0), { lens: 45, bokeh: 1.2 }),
  },
  {
    name: '10_house_wide',
    set: 'household',
    build: (set) =>
      establish(new THREE.Vector3(2.9, 1.7, 3.4), new THREE.Vector3(-1.0, 1.2, -1.4), {
        lens: 26,
        focusOn: set.actor('cass').getChestPosition(new THREE.Vector3()),
      }),
  },
  { name: '11_house_cu', subject: 'cass', keySide: -1, set: 'household', build: (set) => closeUp(set.actor('cass'), { lookingAt: (set.marks.owner as THREE.Vector3) }) },
  {
    name: '12_plaza_wide',
    set: 'plaza',
    build: (set) =>
      establish(new THREE.Vector3(3.6, 2.7, 9.5), new THREE.Vector3(0, 1.5, -6.5), {
        lens: 28,
        focusOn: set.actor('atlas').getChestPosition(new THREE.Vector3()),
      }),
  },
  { name: '13_plaza_atlas', subject: 'atlas', keySide: 1, set: 'plaza', build: (set) => closeUp(set.actor('atlas'), { lens: 75, distance: 1.3, angle: -0.42 }) },
  {
    name: '14_plaza_line',
    subject: 'commander',
    keySide: 1,
    set: 'plaza',
    build: (set) => overShoulder(set.actor('atlas'), set.actor('commander'), { lens: 46, side: -1, distance: 0.8 }),
  },
];

const wanted = (only ?? '').split(',').filter(Boolean);
const shots = wanted.length ? SHOTS.filter((s) => wanted.some((w) => s.name.startsWith(w))) : SHOTS;

function applyDebug(set: SceneSet): void {
  if (!dbg.size) return;
  if (dbg.has('nofog')) set.scene.fog = null;
  if (dbg.has('nobg')) set.scene.background = null;
  if (dbg.has('noenv')) set.scene.environment = null;
  if (dbg.has('nowet')) set.wetFloor?.setReflectionStrength(0);
  if (dbg.has('norain')) set.rain?.setIntensity(0, true);
  if (dbg.has('nolights')) {
    set.scene.traverse((o) => {
      const light = o as THREE.Light;
      if (light.isLight) light.intensity = 0;
    });
  }
  if (dbg.has('noemis')) {
    set.scene.traverse((o) => {
      const mats = (o as THREE.Mesh).material;
      for (const m of Array.isArray(mats) ? mats : [mats]) {
        const std = m as THREE.MeshStandardMaterial;
        if (std && std.isMeshStandardMaterial) std.emissiveIntensity = 0;
        const basic = m as THREE.MeshBasicMaterial;
        if (basic && basic.isMeshBasicMaterial) basic.color.multiplyScalar(0.001);
      }
    });
  }
  if (dbg.has('nopost') && engine.postFX) engine.postFX.bypass = true;
  if (dbg.has('hairred')) {
    set.scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && o.name.endsWith('_hair')) {
        (o as THREE.Mesh).material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      }
    });
  }
  if (dbg.has('nohair')) {
    set.scene.traverse((o) => {
      if (o.name.endsWith('_hair')) o.visible = false;
    });
  }
}

declare global {
  interface Window {
    __ready?: boolean;
    __shot?: (i: number) => Promise<void>;
    __shotNames?: () => string[];
    __shotDone?: boolean;
    __stats?: () => Record<string, number | string>;
    __exposure?: () => Record<string, number>;
  }
}

window.__shotNames = () => shots.map((s) => s.name);

window.__shot = async (i: number): Promise<void> => {
  const def = shots[i];
  const set = (await ensureSet(def.set)) as MarkedSet;
  const grade = def.set === 'household' ? 'domestic' : def.set === 'plaza' ? 'uprising' : 'noirRain';
  engine.setStage(set, grade);
  applyDebug(set);

  const cam = set.camera;
  const applyShot = (): void => {
    const shot = def.build(set);
    cam.position.copy(shot.position);
    cam.fov = shot.fov;
    cam.up.set(0, 1, 0);
    cam.updateProjectionMatrix();
    cam.lookAt(shot.target);
    if (shot.roll) cam.rotateZ(shot.roll);
    engine.postFX?.focusOn(shot.focus, cam, true);
    if (engine.postFX) engine.postFX.bokeh = shot.bokeh;
  };

  engine.postFX?.setLensRain(def.set === 'household' ? 0.05 : RAIN.lensDrops, true);
  applyShot();
  if (def.subject && set.hasActor(def.subject)) {
    set.lightSubject(set.actor(def.subject).getChestPosition(new THREE.Vector3()), { keySide: def.keySide ?? 1 });
  }
  // Warm-up: pose easing, rain wrap and the mirror pass all need a few frames.
  const settle = Number(params.get('settle') ?? def.settle ?? 1.2);
  const steps = Math.max(2, Math.round(settle / (1 / 30)));
  for (let s = 0; s < steps; s++) {
    applyShot();
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

/**
 * Exposure readout for the current frame.
 *
 * Judging night-time lighting by eye across many iterations is unreliable, so
 * each capture also reports luminance percentiles. The target for these scenes:
 * median around 0.10-0.20, p95 around 0.55-0.80, under 2% of pixels clipped, and
 * a p05 above zero so the shadows are dark but not crushed.
 */
window.__exposure = () => {
  const gl = engine.renderer.getContext();
  const w = engine.renderer.domElement.width;
  const h = engine.renderer.domElement.height;
  const step = Math.max(1, Math.floor(Math.min(w, h) / 240));
  const buf = new Uint8Array(w * h * 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  const lum: number[] = [];
  let clipped = 0;
  let black = 0;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      const r = buf[i] / 255;
      const g = buf[i + 1] / 255;
      const b = buf[i + 2] / 255;
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      lum.push(l);
      if (r > 0.996 && g > 0.996 && b > 0.996) clipped++;
      if (l < 0.004) black++;
    }
  }
  lum.sort((a, b) => a - b);
  const at = (q: number): number => lum[Math.min(lum.length - 1, Math.floor(q * lum.length))] ?? 0;
  const mean = lum.reduce((a, b) => a + b, 0) / Math.max(1, lum.length);
  return {
    mean: +mean.toFixed(4),
    p05: +at(0.05).toFixed(4),
    p50: +at(0.5).toFixed(4),
    p90: +at(0.9).toFixed(4),
    p99: +at(0.99).toFixed(4),
    clipped: +(clipped / Math.max(1, lum.length)).toFixed(4),
    crushed: +(black / Math.max(1, lum.length)).toFixed(4),
  };
};

void (async () => {
  await factory.preload();
  await ensureSet(shots[0]?.set ?? 'rooftop');
  window.__ready = true;
})();
