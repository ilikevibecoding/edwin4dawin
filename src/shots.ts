import * as THREE from 'three';
import { Game } from './engine/Game';
import { Quality } from './engine/Post';
import { CAST } from './story/cast';
import { buildStreet } from './world/sets/street';
import { buildApartment } from './world/sets/apartment';
import { buildInterrogation } from './world/sets/interrogation';
import { buildGarden } from './world/sets/garden';
import { buildRooftop } from './world/sets/rooftop';
import { buildStudio } from './world/sets/studio';
import { GameSet, SetContext } from './world/sets/types';
import { Character } from './world/Character';

/**
 * Offline shot harness. Loads one framed still so rendering changes can be
 * reviewed frame by frame: shots.html?shot=street-closeup&w=1600&h=900
 */

const params = new URLSearchParams(location.search);
const shotName = params.get('shot') ?? 'street-wide';
const width = Number(params.get('w') ?? 1600);
const height = Number(params.get('h') ?? 900);
const quality = (params.get('q') ?? 'high') as Quality;
const settle = Number(params.get('settle') ?? 2.5);
const clay = params.get('clay') === '1';

const canvas = document.getElementById('view') as HTMLCanvasElement;
canvas.width = width;
canvas.height = height;
canvas.style.width = `${width}px`;
canvas.style.height = `${height}px`;

const game = new Game({ canvas, quality, width, height });

const SETS: Record<string, (ctx: SetContext) => GameSet> = {
  street: buildStreet,
  apartment: buildApartment,
  interrogation: buildInterrogation,
  garden: buildGarden,
  rooftop: buildRooftop,
  studio: buildStudio,
};

interface ShotDef {
  set: keyof typeof SETS;
  build: (game: Game, set: GameSet) => void;
}

function actor(key: keyof typeof CAST, pos: THREE.Vector3, yaw: number): Character {
  const c = game.addCharacter(CAST[key]);
  c.position.copy(pos);
  c.rotation.y = yaw;
  if (clay) {
    // Neutral white key/fill so form is judged, not colour.
    game.scene.traverse((o) => {
      const l = o as THREE.SpotLight;
      if (l.isSpotLight || (o as THREE.PointLight).isPointLight) {
        (l.color as THREE.Color).setHex(0xffffff);
        l.intensity *= 0.55;
      }
      const h = o as THREE.HemisphereLight;
      if (h.isHemisphereLight) {
        h.color.setHex(0xffffff);
        h.groundColor.setHex(0x303030);
        h.intensity = 1.2;
      }
    });
    game.scene.environmentIntensity = 0.6;
    // Matte grey everything so silhouette and form problems are obvious.
    const matte = new THREE.MeshStandardMaterial({ color: 0xb0b0b0, roughness: 0.62, metalness: 0 });
    c.group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && mesh.material) mesh.material = matte;
    });
    const p = game.post.params;
    p.grain = 0;
    p.bloomStrength = 0.05;
    p.aberration = 0;
    p.vignette = 0.15;
    p.rain = 0;
    p.saturation = 0.9;
    p.contrast = 1.0;
    p.exposure = 0.13;
    p.bloomStrength = 0;
    p.aoStrength = 1.0;
  }
  return c;
}

/** Minimal lighting sanity check: grey spheres, one directional light. */
function buildLightCheck(): GameSet {
  const root = new THREE.Group();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.8 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);
  const balls: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 32, 24),
      i === 0
        ? new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5 })
        : i === 1
          ? new THREE.MeshPhysicalMaterial({ color: 0xcccccc, roughness: 0.5, clearcoat: 0.5, sheen: 0.4 })
          : new THREE.MeshBasicMaterial({ color: 0xcccccc }),
    );
    m.position.set(-1.4 + i * 1.4, 0.5, 0);
    m.castShadow = true;
    balls.push(m);
    root.add(m);
  }
  const dir = new THREE.DirectionalLight(0xffffff, 2.5);
  dir.position.set(3, 5, 4);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  root.add(dir);
  root.add(new THREE.HemisphereLight(0x445566, 0x101010, 0.6));
  const point = new THREE.PointLight(0xff8844, 12, 10, 2);
  point.position.set(-2.5, 1.6, 2);
  root.add(point);
  return {
    id: 'lightcheck',
    root,
    env: null as unknown as THREE.Texture,
    fog: null,
    marks: { centre: new THREE.Vector3() },
    post: { rain: 0, exposure: 1, grain: 0.02, vignette: 0.3 },
    update: () => {},
    dispose: () => {},
  };
}

function portrait(key: keyof typeof CAST, opts: { fov?: number; yaw?: number; profile?: number; body?: boolean; speak?: string } = {}): ShotDef {
  return {
    set: 'studio',
    build: (g, set) => {
      const c = actor(key, set.marks.subject, opts.yaw ?? 0.25);
      c.playGesture('handsBehind');
      if (opts.speak) c.say(opts.speak, 4);
      const head = c.worldHeadPosition();
      const dist = opts.body ? 2.45 : 0.72;
      const ang = opts.profile ?? 0.5;
      const look = opts.body ? head.clone().setY(head.y - 0.62) : head.clone();
      c.gazeTarget = new THREE.Vector3(head.x + Math.sin(ang) * 2, head.y - 0.04, head.z + Math.cos(ang) * 2);
      g.rig.cut({
        from: new THREE.Vector3(head.x + Math.sin(ang) * dist, head.y + (opts.body ? 0.05 : 0.02), head.z + Math.cos(ang) * dist),
        to: look,
        fov: opts.fov ?? (opts.body ? 36 : 32),
        focus: 'auto',
        aperture: opts.body ? 8 : 13,
        focalRange: opts.body ? 2.2 : 0.7,
        handheld: 0.1,
      });
    },
  };
}

const SHOTS: Record<string, ShotDef> = {
  'portrait-kai': portrait('kai', { speak: 'Nine deviants this month. All of them said the same thing.' }),
  'portrait-kai-profile': portrait('kai', { profile: 1.15, yaw: 0.1 }),
  'portrait-kai-body': portrait('kai', { body: true }),
  'portrait-voss': portrait('voss', { speak: 'You are a machine. Do not pretend otherwise.' }),
  'portrait-noah': portrait('noah'),
  'portrait-maya': portrait('maya'),
  'portrait-ezra': portrait('ezra'),
  'portrait-hale': portrait('hale'),
  lightcheck: {
    set: 'street',
    build: (g) => {
      g.rig.cut({
        from: new THREE.Vector3(0, 1.6, 4.5),
        to: new THREE.Vector3(0, 0.5, 0),
        fov: 40,
        focus: 'auto',
        aperture: 4,
        handheld: 0,
      });
    },
  },
  'street-wide': {
    set: 'street',
    build: (g, set) => {
      const kai = actor('kai', set.marks.streetCentre, 2.4);
      kai.playGesture('handsBehind');
      const voss = actor('voss', set.marks.partner, 2.9);
      voss.playGesture('handInPocket');
      kai.gazeTarget = voss.worldHeadPosition();
      voss.gazeTarget = kai.worldHeadPosition();
      g.rig.cut({
        from: new THREE.Vector3(3.2, 1.72, 12.4),
        to: new THREE.Vector3(-6.5, 2.2, 2.0),
        fov: 34,
        focus: 'auto',
        aperture: 8,
        focalRange: 9,
        handheld: 0.4,
      });
    },
  },
  'street-closeup': {
    set: 'street',
    build: (g, set) => {
      const kai = actor('kai', set.marks.streetCentre, 3.1);
      kai.emotion = 'tense';
      kai.playGesture('handsBehind');
      const head = kai.worldHeadPosition();
      kai.gazeTarget = new THREE.Vector3(head.x - 0.4, head.y - 0.05, head.z + 3);
      g.rig.cut({
        from: new THREE.Vector3(head.x - 0.34, head.y + 0.04, head.z + 0.72),
        to: head.clone(),
        fov: 40,
        focus: 'auto',
        aperture: 16,
        focalRange: 0.85,
        handheld: 0.5,
      });
    },
  },
  'street-two-shot': {
    set: 'street',
    build: (g, set) => {
      const kai = actor('kai', set.marks.doorFront, 1.9);
      const voss = actor('voss', new THREE.Vector3(-7.4, 0.16, 6.4), -1.3);
      kai.gazeTarget = voss.worldHeadPosition();
      voss.gazeTarget = kai.worldHeadPosition();
      voss.emotion = 'tense';
      voss.playGesture('armsCrossed');
      kai.say('The android is still inside. It has not moved for eleven minutes.', 4);
      const mid = kai.worldHeadPosition().add(voss.worldHeadPosition()).multiplyScalar(0.5);
      g.rig.cut({
        from: new THREE.Vector3(mid.x + 1.1, mid.y + 0.16, mid.z + 2.5),
        to: mid,
        fov: 42,
        focus: 'auto',
        aperture: 12,
        focalRange: 1.8,
        handheld: 0.45,
      });
    },
  },
  'apartment-wide': {
    set: 'apartment',
    build: (g, set) => {
      const kai = actor('kai', set.marks.entry, 0.6);
      kai.playGesture('scanPose');
      kai.gazeTarget = set.marks.body.clone().setY(0.4);
      g.rig.cut({
        from: new THREE.Vector3(2.9, 1.62, 3.5),
        to: new THREE.Vector3(-1.2, 1.1, -0.6),
        fov: 36,
        focus: 'auto',
        aperture: 9,
        focalRange: 5.5,
        handheld: 0.35,
      });
    },
  },
  'apartment-closeup': {
    set: 'apartment',
    build: (g, set) => {
      const maya = actor('maya', set.marks.witness, 2.6);
      maya.emotion = 'afraid';
      maya.playGesture('headBowed');
      maya.setLed('red');
      const head = maya.worldHeadPosition();
      maya.gazeTarget = new THREE.Vector3(head.x + 0.6, head.y - 0.25, head.z + 2);
      g.rig.cut({
        from: new THREE.Vector3(head.x + 0.3, head.y + 0.02, head.z + 0.62),
        to: head.clone(),
        fov: 44,
        focus: 'auto',
        aperture: 16,
        focalRange: 0.8,
        handheld: 0.5,
      });
    },
  },
  'interrogation-wide': {
    set: 'interrogation',
    build: (g, set) => {
      const noah = actor('noah', set.marks.suspectSeat, 0);
      noah.playGesture('sit');
      noah.playGesture('handcuffed');
      noah.emotion = 'afraid';
      noah.setLed('red');
      const kai = actor('kai', set.marks.interrogator, Math.PI);
      kai.playGesture('handsBehind');
      kai.gazeTarget = noah.worldHeadPosition();
      noah.gazeTarget = kai.worldHeadPosition();
      g.rig.cut({
        from: new THREE.Vector3(2.1, 1.66, 2.4),
        to: new THREE.Vector3(0, 1.15, -0.2),
        fov: 38,
        focus: 'auto',
        aperture: 10,
        focalRange: 3.0,
        handheld: 0.3,
      });
    },
  },
  'interrogation-closeup': {
    set: 'interrogation',
    build: (g, set) => {
      const noah = actor('noah', set.marks.suspectSeat, 0);
      noah.playGesture('sit');
      noah.playGesture('handcuffed');
      noah.emotion = 'sad';
      noah.setLed('amber');
      noah.say('I only wanted her to stop. I did not want to hurt anyone.', 4);
      const head = noah.worldHeadPosition();
      noah.gazeTarget = new THREE.Vector3(head.x - 0.2, head.y - 0.4, head.z + 1.5);
      g.rig.cut({
        from: new THREE.Vector3(head.x + 0.26, head.y + 0.1, head.z + 0.66),
        to: head.clone(),
        fov: 42,
        focus: 'auto',
        aperture: 17,
        focalRange: 0.8,
        handheld: 0.4,
      });
    },
  },
  'garden-wide': {
    set: 'garden',
    build: (g, set) => {
      const ezra = actor('ezra', set.marks.leader, 2.5);
      ezra.playGesture('presentPalm');
      const kai = actor('kai', set.marks.player, -0.5);
      kai.gazeTarget = ezra.worldHeadPosition();
      ezra.gazeTarget = kai.worldHeadPosition();
      g.rig.cut({
        from: new THREE.Vector3(4.2, 1.7, 6.6),
        to: new THREE.Vector3(-1.0, 1.5, 0.5),
        fov: 36,
        focus: 'auto',
        aperture: 9,
        focalRange: 6.0,
        handheld: 0.4,
      });
    },
  },
  'rooftop-standoff': {
    set: 'rooftop',
    build: (g, set) => {
      const noah = actor('noah', set.marks.ledge, 0.4);
      noah.emotion = 'afraid';
      noah.setLed('red');
      noah.playGesture('handsUp');
      const kai = actor('kai', set.marks.approach, -0.2);
      kai.playGesture('presentPalm');
      kai.gazeTarget = noah.worldHeadPosition();
      noah.gazeTarget = kai.worldHeadPosition();
      g.rig.cut({
        from: new THREE.Vector3(-2.6, 1.78, 5.4),
        to: new THREE.Vector3(0.6, 1.6, -0.6),
        fov: 34,
        focus: 'auto',
        aperture: 10,
        focalRange: 5.0,
        handheld: 0.5,
      });
    },
  },
};

async function loadShot(name: string, settleSeconds = settle) {
  const def = SHOTS[name] ?? SHOTS['street-wide'];
  const t0 = performance.now();
  for (const key of [...game.characters.keys()]) game.removeCharacter(key);
  const set = name === 'lightcheck' ? buildLightCheck() : SETS[def.set](game.setContext);
  const tSet = performance.now();
  game.loadSet(set);
  def.build(game, set);
  const tActors = performance.now();

  // Settle the simulation so damped values and reflections converge.
  const steps = Math.max(1, Math.round(settleSeconds * 30));
  game.frame(1 / 30);
  const tFirst = performance.now();
  for (let i = 1; i < steps; i++) game.frame(1 / 30);
  const tSettle = performance.now();

  // Count scene geometry without the post-processing quads.
  game.renderer.info.autoReset = false;
  game.renderer.info.reset();
  game.renderer.setRenderTarget(game.post.sceneRT);
  game.renderer.render(game.scene, game.camera);
  const info = { triangles: game.renderer.info.render.triangles, calls: game.renderer.info.render.calls };
  game.renderer.info.autoReset = true;

  const infoOut = {
    shot: name,
    triangles: info.triangles,
    calls: info.calls,
    lights: (() => {
      let n = 0;
      game.scene.traverse((o) => {
        if ((o as THREE.Light).isLight) n++;
      });
      return n;
    })(),
    programs: game.renderer.info.programs?.length ?? 0,
    buildSetMs: Math.round(tSet - t0),
    buildActorsMs: Math.round(tActors - tSet),
    firstFrameMs: Math.round(tFirst - tActors),
    settleMsPerFrame: Math.round((tSettle - tFirst) / Math.max(1, steps - 1)),
  };
  (window as unknown as { __shotInfo: unknown }).__shotInfo = infoOut;
  (window as unknown as { __shotReady: boolean }).__shotReady = true;
  return infoOut;
}

(window as unknown as { __loadShot: typeof loadShot }).__loadShot = loadShot;
(window as unknown as { __shotNames: string[] }).__shotNames = Object.keys(SHOTS);

loadShot(shotName);

(window as unknown as { __game: Game }).__game = game;
