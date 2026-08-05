/**
 * Development harness: a lit studio for judging character and material quality
 * in isolation. Reachable via `?dev=portrait&who=connor&shot=closeup`.
 */
import * as THREE from 'three';
import { Engine, type SceneSet } from '../app/engine';
import { Character } from '../engine/character';
import { CAST } from '../game/cast';
import { Sky, envPanel } from '../engine/sky';
import { spotLight, threePoint } from '../engine/lighting';
import { WetGround } from '../engine/wetground';
import { Rain } from '../engine/weather';
import { DustMotes, VolumeCone } from '../engine/volumetric';
import type { PoseName } from '../engine/character';

export function runPortrait(engine: Engine, params: URLSearchParams): SceneSet {
  const who = params.get('who') ?? 'connor';
  const shot = params.get('shot') ?? 'closeup';
  const pose = (params.get('pose') ?? 'idle') as PoseName;
  const q = engine.quality;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.08, 400);

  const sky = new Sky({
    top: 0x04070c,
    horizon: 0x0e1a26,
    ground: 0x05080b,
    clouds: 0.7,
    cloudColor: 0x1c2a3a,
    cityGlow: 0.55,
    cityGlowColor: 0x2b4560,
    sun: new THREE.Vector3(-0.5, 0.3, -1),
  });
  scene.add(sky.mesh);
  scene.fog = new THREE.FogExp2(0x0a1420, 0.022);

  const env = sky.buildEnvironment(engine.renderer, [
    envPanel(0x2f79ff, 3.5, 8, 5, new THREE.Vector3(-7, 3, -3)),
    envPanel(0xff5a3c, 1.6, 6, 4, new THREE.Vector3(8, 2.4, 2)),
  ]);
  scene.environment = env;
  scene.environmentIntensity = 0.55;

  const ground = new WetGround({
    size: 80,
    resolution: q.reflectionScale,
    wetness: 0.92,
    reflectStrength: 1.05,
    texRepeat: 20,
  });
  scene.add(ground.mesh);

  const char = new Character(CAST[who] ?? CAST.connor, q.characterSegments);
  char.setPosition(0, 0, 0);
  char.applyPoseImmediate(pose);
  scene.add(char.group);

  const head = char.eyeLine(new THREE.Vector3());
  const rig = threePoint(q, head, {
    keyColor: 0xdcecff,
    keyIntensity: 34,
    keyDir: new THREE.Vector3(-0.9, 0.7, 0.75),
    rimColor: 0x67b6ff,
    rimIntensity: 60,
    rimDir: new THREE.Vector3(0.85, 0.5, -1),
    fillColor: 0x2a4a6a,
    fillIntensity: 6,
    distance: 2.4,
  });
  scene.add(rig.group);

  // A warm practical from behind for hair separation.
  const back = spotLight(q, {
    color: 0xffb27a,
    intensity: 30,
    position: head.clone().add(new THREE.Vector3(1.2, 1.4, -2.4)),
    target: head.clone(),
    angle: 0.5,
    penumbra: 0.9,
    shadow: false,
  });
  scene.add(back, back.target);

  const cone = new VolumeCone({ height: 5, radius: 1.8, color: 0x9fd0ff, opacity: 0.09 });
  cone.mesh.position.set(-1.8, 4.6, 1.2);
  scene.add(cone.mesh);

  const rain = new Rain({ count: Math.round(q.rainCount * 0.6), splashes: q.splashCount, radius: 14, mist: true });
  scene.add(rain.group);

  const motes = new DustMotes(q.volumetrics ? 400 : 120, new THREE.Vector3(6, 3, 6));
  motes.points.position.y = 0.6;
  scene.add(motes.points);

  const shots: Record<string, { pos: THREE.Vector3; look: THREE.Vector3; fov: number }> = {
    closeup: { pos: new THREE.Vector3(0.42, head.y + 0.03, 0.86), look: head.clone(), fov: 38 },
    eyes: { pos: new THREE.Vector3(0.12, head.y + 0.02, 0.44), look: head.clone(), fov: 34 },
    profile: { pos: new THREE.Vector3(1.0, head.y, 0.14), look: head.clone(), fov: 42 },
    medium: { pos: new THREE.Vector3(0.9, head.y - 0.12, 1.7), look: head.clone().add(new THREE.Vector3(0, -0.12, 0)), fov: 44 },
    full: { pos: new THREE.Vector3(1.5, 1.35, 3.2), look: new THREE.Vector3(0, 0.95, 0), fov: 40 },
    hands: { pos: new THREE.Vector3(0.5, 1.0, 0.9), look: new THREE.Vector3(0.2, 0.86, 0.1), fov: 36 },
  };
  const s = shots[shot] ?? shots.closeup;
  camera.position.copy(s.pos);
  camera.lookAt(s.look);
  camera.fov = s.fov;
  camera.updateProjectionMatrix();

  char.lookAt(camera.position.clone().add(new THREE.Vector3(0, 0, 0.2)), 0.9);
  char.setExpression((params.get('expr') as never) ?? 'neutral', Number(params.get('exprw') ?? 1));
  if (params.get('talk')) char.say(60, 1);

  const focusDist = camera.position.distanceTo(s.look);

  return {
    name: 'portrait',
    scene,
    camera,
    update(dt, time) {
      char.update(dt, time);
      ground.update(time);
      rain.update(dt, time, camera);
      motes.update(time);
      cone.update(time);
      sky.update(time);
      engine.fx.focusTarget = focusDist;
      engine.fx.aperture = Number(params.get('ap') ?? 1.1);
    },
    prerender(renderer, cam) {
      ground.renderReflection(renderer, scene, cam);
    },
    applyLook(fx) {
      fx.wetLens = 0.35;
      fx.setBloom(0.55, 0.7, 0.9);
      fx.setStreak(0.3);
      fx.applyLook({ uExposure: 1.15, uSplit: 0.2, uVignette: 0.5, uGrain: 0.035 });
    },
    dispose() {
      char.dispose();
      ground.dispose();
      rain.dispose();
    },
  };
}
