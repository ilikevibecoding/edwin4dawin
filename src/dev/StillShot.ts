/**
 * Still-frame harness for reviewing scene composition and lighting.
 *
 * Loads a chapter's set and cast, stages the actors, applies a named camera
 * setup and holds, so a deterministic frame can be captured.
 *
 * URL params: &chapter=ch1..ch5 &shot=<name> &fxscan=0..1 &letterbox=1 &pose=<clip>
 */
import * as THREE from 'three';
import { Character, QUALITY_BY_TIER } from '../characters/Character';
import { CAST } from '../characters/Cast';
import { updateSkinKeyLight } from '../characters/CharacterMaterials';
import { RainSystem } from '../engine/Rain';
import type { Stage } from '../engine/Stage';
import { CameraDirector } from '../game/CameraDirector';
import { chapterById, CHAPTER_EXTRAS } from '../game/Story';
import { buildApartmentScene } from '../world/ApartmentScene';
import { buildInterrogationScene } from '../world/InterrogationScene';
import { buildStreetScene } from '../world/StreetScene';
import type { SceneBuild } from '../world/SceneTypes';

const BUILDERS: Record<string, (stage: Stage) => SceneBuild> = {
  street: buildStreetScene,
  apartment: buildApartmentScene,
  interrogation: buildInterrogationScene,
};

export function buildStill(stage: Stage, params: URLSearchParams) {
  const chapterId = params.get('chapter') ?? 'ch1';
  const chapter = chapterById(chapterId);
  if (!chapter) throw new Error(`unknown chapter ${chapterId}`);

  const build = BUILDERS[chapter.scene](stage);
  stage.scene.add(build.root);
  const extras = CHAPTER_EXTRAS[chapter.id] ?? {};
  stage.setSky(extras.skyOverride ?? build.sky, { showBackground: build.showSkyBackground !== false });
  stage.fx.atmosphere.apply(build.atmosphere);
  stage.fx.grade.apply(build.grade);
  const rain = extras.rainOverride ?? build.rain;
  stage.fx.lensRain.intensity = rain * 0.34;

  for (let i = 0; i < 2; i++) {
    const s = (build.shafts ?? [])[i];
    if (s) stage.fx.atmosphere.setShaft(i as 0 | 1, s.position, s.color, s.intensity);
  }

  const rainSystem = new RainSystem({
    dropCount: stage.tier === 'low' ? 1200 : 3600,
    splashCount: 600,
    groundY: 0,
  });
  rainSystem.setIntensity(rain);
  stage.scene.add(rainSystem.group);

  const actors = new Map<string, Character>();
  for (const spec of chapter.actors) {
    const def = CAST[spec.cast];
    if (!def) continue;
    const character = new Character(def, QUALITY_BY_TIER[stage.tier]);
    actors.set(spec.role, character);
    stage.scene.add(character.group);
    const mark = spec.mark ? build.marks[spec.mark] : undefined;
    if (mark) character.placeAt(mark.position, mark.yaw);
    character.playClip(params.get('pose') ?? spec.clip ?? 'idle', { fade: 0 });
  }

  // Actors regard each other, which reads far better than a blank stare
  const roles = [...actors.keys()];
  for (const [role, actor] of actors) {
    const other = roles.find((r) => r !== role);
    if (other) actor.lookAt(actors.get(other)!.getEyeWorldPosition(), 0.9);
  }

  const director = new CameraDirector(stage.camera);
  director.setCollider(build.root, build.cameraBounds ?? null);
  const shot = params.get('shot') ?? 'establish';
  const primary = actors.get(chapter.actors[0].role)!;
  const secondary = actors.get(chapter.actors[1]?.role ?? '') ?? primary;

  const applyShot = () => {
    switch (shot) {
      case 'close':
        director.single(primary, 'close', { angle: 24, duration: 0 });
        break;
      case 'closeOther':
        director.single(secondary, 'close', { angle: 20, duration: 0 });
        break;
      case 'ots':
        director.overShoulder(secondary, primary, { duration: 0, side: 1 });
        break;
      case 'two':
        director.twoShot(primary, secondary, { angle: 18, duration: 0 });
        break;
      case 'wide':
        director.single(primary, 'wide', { angle: 34, duration: 0 });
        break;
      default: {
        const m = build.marks[`cam.${shot}`] ?? build.marks['cam.establish'];
        if (m) director.toMark(m, primary.getEyeWorldPosition(), { duration: 0 });
        break;
      }
    }
  };
  applyShot();

  const keyDir = new THREE.Vector3(0.3, 0.7, 0.6);
  const keyColor = new THREE.Color(0xffffff);
  let best: THREE.Light | null = null;
  build.root.traverse((o) => {
    const l = o as THREE.Light;
    if (l.isLight && l.castShadow && (!best || l.intensity > best.intensity)) best = l;
  });
  if (best) {
    const light = best as THREE.SpotLight;
    const p = light.getWorldPosition(new THREE.Vector3());
    const t = light.target?.getWorldPosition(new THREE.Vector3()) ?? new THREE.Vector3();
    keyDir.copy(p).sub(t).normalize();
    keyColor.copy(light.color);
  }

  stage.fx.scan.amount = Number(params.get('fxscan') ?? 0);
  stage.fx.letterbox.amount = params.get('letterbox') === '1' ? 1 : 0;

  stage.onUpdate((dt) => {
    for (const a of actors.values()) a.update(dt);
    // Keep re-solving so framing holds as the idle animation breathes
    applyShot();
    director.update(dt);
    rainSystem.update(dt, stage.camera);
    build.update?.(dt, stage.elapsed);
    updateSkinKeyLight(keyDir, keyColor, stage.camera);
    stage.fx.dof.target = director.focusPoint;
  });

  return { build, actors, director };
}
