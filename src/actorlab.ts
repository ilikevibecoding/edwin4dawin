/**
 * Character lab.
 *
 * Isolates the cast from the environments so posing, retargeted animation,
 * costume restyling, faces and LEDs can be judged (and iterated on) in seconds
 * rather than minutes. Lighting here is a neutral three-point setup, not the
 * game's grade, so problems in the models cannot hide in the dark.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ActorFactory, type CharacterId } from './actors/Cast';
import { Assets } from './core/Assets';
import type { Actor } from './actors/Actor';

const params = new URLSearchParams(location.search);
const W = Number(params.get('w') || 1280);
const H = Number(params.get('h') || 720);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0e13);
const camera = new THREE.PerspectiveCamera(35, W / H, 0.05, 100);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.4;

// Levels are matched to the character rig the sets actually use. A brighter
// "so nothing can hide in the dark" setup was worse than useless: it drove skin
// and hair past the top of the curve, so a dark hair shell read as a bald scalp
// here and the lab disagreed with every frame the game produced.
const key = new THREE.SpotLight(0xd8e8ff, 26, 22, 0.75, 0.55, 2);
key.position.set(2.4, 3.4, 2.8);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.bias = -0.001;
key.shadow.normalBias = 0.02;
scene.add(key);
const rim = new THREE.SpotLight(0x53a8ff, 40, 22, 0.8, 0.6, 2);
rim.position.set(-2.8, 2.6, -2.6);
scene.add(rim);
const fill = new THREE.PointLight(0xff9b5e, 2.6, 14, 2);
fill.position.set(-2.0, 1.5, 2.2);
scene.add(fill);
scene.add(new THREE.HemisphereLight(0x2c3c52, 0x0a0a0c, 0.28));

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(8, 48),
  new THREE.MeshStandardMaterial({ color: 0x0d1116, roughness: 0.3, metalness: 0.45 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const label = document.createElement('div');
label.style.cssText =
  'position:fixed;left:12px;bottom:10px;color:#9fe8ff;font:13px ui-monospace,monospace;z-index:3;text-shadow:0 1px 3px #000';
document.body.appendChild(label);

const assets = new Assets();
const factory = new ActorFactory(assets);
const actors = new Map<CharacterId, Actor>();

async function get(id: CharacterId): Promise<Actor> {
  let a = actors.get(id);
  if (!a) {
    a = await factory.spawn(id);
    scene.add(a.root);
    actors.set(id, a);
  }
  for (const [otherId, other] of actors) other.root.visible = otherId === id;
  return a;
}

interface Framing {
  name: string;
  id: CharacterId;
  clip?: string;
  pose?: [string, number][];
  view: 'full' | 'face' | 'threeQuarter' | 'hands';
  /** Seconds of animation to run before capture. */
  settle?: number;
  led?: 'calm' | 'process' | 'stress' | 'off';
  lookAtCamera?: boolean;
}

const FRAMINGS: Framing[] = [
  { name: 'orion_full_idle', id: 'orion', clip: 'idle', view: 'full', led: 'calm' },
  { name: 'orion_face', id: 'orion', clip: 'idle', view: 'face', led: 'process', lookAtCamera: true },
  { name: 'orion_3q_talk', id: 'orion', clip: 'idle', pose: [['talkEmphatic', 1]], view: 'threeQuarter', led: 'process' },
  { name: 'orion_walk', id: 'orion', clip: 'walk', view: 'full', settle: 0.9 },
  { name: 'orion_aim', id: 'orion', clip: 'idle', pose: [['aimPistol', 1]], view: 'threeQuarter', led: 'stress' },
  { name: 'orion_hands', id: 'orion', clip: 'idle', view: 'hands' },
  { name: 'cass_full', id: 'cass', clip: 'idle', view: 'full', led: 'calm' },
  { name: 'cass_face', id: 'cass', clip: 'idle', view: 'face', led: 'stress', lookAtCamera: true },
  { name: 'atlas_full', id: 'atlas', clip: 'idle', view: 'full', led: 'calm' },
  { name: 'atlas_fist', id: 'atlas', clip: 'idle', pose: [['raiseFist', 1]], view: 'threeQuarter', led: 'calm' },
  { name: 'deviant_hostage', id: 'deviant', clip: 'idle', pose: [['holdHostage', 1]], view: 'full', led: 'stress' },
  { name: 'trooper_aim', id: 'trooper', clip: 'idle', pose: [['aimPistol', 1]], view: 'full' },
  { name: 'child_full', id: 'child', clip: 'idle', view: 'full' },
  { name: 'child_face', id: 'child', clip: 'idle', view: 'face', lookAtCamera: true },
  { name: 'crowd_full', id: 'crowdAndroid', clip: 'idle', pose: [['defiant', 0.8]], view: 'full', led: 'process' },
  // Story poses, checked in isolation before they are used in a chapter.
  { name: 'pose_shield', id: 'cass', clip: 'idle', pose: [['shieldChild', 1]], view: 'full', led: 'stress' },
  { name: 'pose_reach', id: 'child', clip: 'idle', pose: [['reachOut', 1]], view: 'full' },
  { name: 'pose_openpalms', id: 'orion', clip: 'idle', pose: [['openPalms', 0.9]], view: 'full' },
  { name: 'pose_fists', id: 'owner', clip: 'idle', pose: [['fists', 0.9]], view: 'full' },
  { name: 'pose_point', id: 'owner', clip: 'idle', pose: [['pointForward', 0.85]], view: 'full' },
  { name: 'pose_resigned', id: 'atlas', clip: 'idle', pose: [['resigned', 0.9]], view: 'full', led: 'calm' },
  { name: 'pose_flinch', id: 'child', clip: 'idle', pose: [['flinch', 0.9]], view: 'full' },
  { name: 'pose_defiant', id: 'deviant', clip: 'idle', pose: [['defiant', 0.9]], view: 'full', led: 'stress' },
  { name: 'pose_slump', id: 'deviant', clip: 'idle', pose: [['slump', 0.9]], view: 'full', led: 'process' },
  { name: 'pose_wound', id: 'atlas', clip: 'idle', pose: [['clutchWound', 0.9]], view: 'full', led: 'stress' },
  { name: 'pose_talk', id: 'cass', clip: 'idle', pose: [['talkOpen', 0.9]], view: 'threeQuarter' },
  { name: 'owner_face', id: 'owner', clip: 'idle', view: 'face', lookAtCamera: true },
];

const only = (params.get('only') ?? '').split(',').filter(Boolean);
const framings = only.length ? FRAMINGS.filter((f) => only.some((o) => f.name.startsWith(o))) : FRAMINGS;

declare global {
  interface Window {
    __ready?: boolean;
    __shot?: (i: number) => Promise<void>;
    __shotNames?: () => string[];
    __shotDone?: boolean;
    /** Handle for inspecting generated geometry and materials from a harness. */
    __scene?: THREE.Scene;
  }
}

window.__scene = scene;

window.__shotNames = () => framings.map((f) => f.name);

window.__shot = async (i: number): Promise<void> => {
  const f = framings[i];
  const actor = await get(f.id);
  const noLayers = params.has('nolayers');
  const noClip = params.has('noclip');
  actor.clearAllPoses([]);
  if (noClip) actor.stopAllClips();
  else if (f.clip && actor.hasClip(f.clip)) actor.play(f.clip, { fade: 0 });
  if (!noLayers) {
    actor.setPose('restHands', 1, { fadeIn: 0 });
    actor.setPose('armsRelaxed', 0.85, { fadeIn: 0 });
    for (const [name, w] of f.pose ?? []) actor.setPose(name, w, { fadeIn: 0 });
  }
  actor.breathAmount = noLayers ? 0 : 1;
  actor.swayAmount = noLayers ? 0 : 1;
  actor.setLed(f.led ?? 'calm', true);
  actor.root.position.set(0, 0, 0);
  actor.setFacing(0.35);

  const h = actor.height;
  const eye = actor.getEyePosition(new THREE.Vector3());
  const views: Record<Framing['view'], { pos: THREE.Vector3; tgt: THREE.Vector3; fov: number }> = {
    full: { pos: new THREE.Vector3(1.5, h * 0.62, 3.1), tgt: new THREE.Vector3(0, h * 0.52, 0), fov: 34 },
    threeQuarter: { pos: new THREE.Vector3(1.15, h * 0.82, 1.95), tgt: new THREE.Vector3(0, h * 0.66, 0), fov: 36 },
    face: { pos: new THREE.Vector3(0.42, eye.y + 0.02, 0.78), tgt: new THREE.Vector3(0, eye.y, 0.04), fov: 32 },
    hands: { pos: new THREE.Vector3(0.85, h * 0.52, 1.1), tgt: new THREE.Vector3(0, h * 0.48, 0), fov: 34 },
  };
  const v = views[f.view];
  camera.position.copy(v.pos);
  camera.fov = v.fov;
  camera.updateProjectionMatrix();
  camera.lookAt(v.tgt);

  if (f.lookAtCamera) actor.lookAt(camera.position, 1);
  else actor.lookAt(null);

  const settle = f.settle ?? 0.7;
  const step = 1 / 30;
  for (let t = 0; t < settle; t += step) actor.update(step, t);
  label.textContent = `${f.name}   clip=${actor.clip ?? 'none'}   h=${actor.height.toFixed(2)}m`;
  renderer.render(scene, camera);
  window.__shotDone = true;
};

void (async () => {
  await factory.preload();
  await get(framings[0]?.id ?? 'orion');
  window.__ready = true;
})();
