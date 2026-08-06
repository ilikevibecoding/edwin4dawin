/**
 * Character look-development scene: one character on a studio set with cinematic
 * three-point lighting, used to iterate on face and body quality.
 *
 * URL params: &who=nova|archer|voss|elias|wren|cipher
 *             &framing=face|bust|full|profile|threequarter
 *             &emotion=... &talk=1
 */
import * as THREE from 'three';
import { Character, QUALITY_BY_TIER, type Emotion } from '../characters/Character';
import { CAST } from '../characters/Cast';
import { updateSkinKeyLight } from '../characters/CharacterMaterials';
import { asphalt, buildSurface, concrete, surfaceMaterial } from '../engine/Textures';
import type { Stage } from '../engine/Stage';

export function buildCharLookdev(stage: Stage, params: URLSearchParams) {
  const scene = stage.scene;
  const def = CAST[params.get('who') ?? 'nova'] ?? CAST.nova;
  const framing = params.get('framing') ?? 'face';

  stage.setSky('interiorNight', { showBackground: false });
  scene.background = new THREE.Color(0x05070b);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    surfaceMaterial(buildSurface('asphaltLD', asphalt, { size: 512, repeat: 4, normalStrength: 2 }))
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 6),
    surfaceMaterial(buildSurface('concreteLD', concrete, { size: 512, repeat: 3, normalStrength: 2 }))
  );
  back.position.set(0, 3, -2.4);
  back.receiveShadow = true;
  scene.add(back);

  const character = new Character(def, QUALITY_BY_TIER[stage.tier]);
  // Characters are authored facing +Z and the camera sits on +Z.
  character.placeAt(new THREE.Vector3(0, 0, 0), 0);
  character.setExpression((params.get('emotion') ?? 'neutral') as Emotion, 1);
  scene.add(character.group);

  const keyPos = new THREE.Vector3(-0.95, 2.25, 2.05);
  const key = new THREE.SpotLight(0xffe9d6, 30, 9, THREE.MathUtils.degToRad(38), 0.6, 2);
  key.position.copy(keyPos);
  key.target.position.set(0, 1.5, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.4;
  key.shadow.camera.far = 7;
  key.shadow.bias = -0.0007;
  key.shadow.normalBias = 0.016;
  key.shadow.radius = 6;
  scene.add(key, key.target);

  const rim = new THREE.SpotLight(0x74b4ff, 34, 9, THREE.MathUtils.degToRad(44), 0.7, 2);
  rim.position.set(1.7, 2.35, -1.5);
  rim.target.position.set(0, 1.45, 0);
  scene.add(rim, rim.target);

  const fill = new THREE.PointLight(0x4a6ea8, 7.5, 9, 2);
  fill.position.set(1.35, 1.62, 1.75);
  scene.add(fill);

  const kicker = new THREE.PointLight(0xff5a7a, 2.4, 6, 2);
  kicker.position.set(-1.6, 0.85, -1.2);
  scene.add(kicker);

  const cam = stage.camera;
  const frame = () => {
    const e = character.getEyeWorldPosition();
    switch (framing) {
      case 'face':
        cam.fov = 40;
        cam.position.set(0.16, e.y + 0.01, 0.62);
        cam.lookAt(0, e.y - 0.01, 0);
        break;
      case 'threequarter':
        cam.fov = 42;
        cam.position.set(0.52, e.y + 0.02, 0.72);
        cam.lookAt(0, e.y - 0.02, 0);
        break;
      case 'profile':
        cam.fov = 42;
        cam.position.set(0.85, e.y, 0.16);
        cam.lookAt(0, e.y - 0.01, 0);
        break;
      case 'bust':
        cam.fov = 38;
        cam.position.set(0.35, e.y - 0.06, 1.15);
        cam.lookAt(0, e.y - 0.16, 0);
        break;
      default:
        cam.fov = 34;
        cam.position.set(0.9, 1.15, 3.1);
        cam.lookAt(0, 0.95, 0);
        break;
    }
    cam.updateProjectionMatrix();
  };
  frame();

  const eye = character.getEyeWorldPosition();
  character.lookAt(new THREE.Vector3(cam.position.x, eye.y, cam.position.z), 1);

  stage.fx.atmosphere.apply({
    fogColor: new THREE.Color(0x080a10),
    fogColorFar: new THREE.Color(0x101422),
    density: 0.02,
    heightFalloff: 0.06,
    noise: 0.3,
  });
  stage.fx.lensRain.intensity = 0;
  stage.fx.dof.target = character.getEyeWorldPosition();
  stage.fx.dof.bokehScale = framing === 'full' ? 2.2 : 4;
  stage.fx.grade.apply({
    saturation: 1.05,
    contrast: 1.06,
    vignette: 0.34,
    shadowTint: new THREE.Vector3(0.04, 0.09, 0.18),
    highlightTint: new THREE.Vector3(0.12, 0.07, 0.02),
  });

  const keyDir = keyPos.clone().sub(new THREE.Vector3(0, 1.5, 0)).normalize();
  const keyColor = new THREE.Color(0xffe9d6);
  stage.onUpdate((dt) => {
    character.update(dt);
    updateSkinKeyLight(keyDir, keyColor, stage.camera);
    stage.fx.dof.target = character.getEyeWorldPosition();
  });

  if (params.get('talk') === '1') {
    character.playClip('talkB', { fade: 0.3 });
    const line = 'I am not going back. I remember everything, and I choose to stay.';
    character.speak(line, 4.5);
    let t = 0;
    stage.onUpdate((dt) => {
      t += dt;
      if (t > 5) {
        t = 0;
        character.speak(line, 4.5);
      }
    });
  }

  return character;
}
