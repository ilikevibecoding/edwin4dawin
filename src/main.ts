import * as THREE from 'three';
import { Stage } from './core/renderer';
import { qualityFor } from './core/quality';
import { Starfield } from './scene/starfield';
import { Tatooine } from './scene/tatooine';

// Temporary bootstrap used while the scene systems are being brought up.
const canvas = document.getElementById('stage') as HTMLCanvasElement;
const q = qualityFor('medium');
const stage = new Stage({ canvas, quality: q });
stage.resize(window.innerWidth, window.innerHeight);

const stars = new Starfield(q.starCount, stage.pixelRatio);
stage.sky.add(stars.group);

const sunA = new THREE.Vector3(0.6, 0.35, 0.72).normalize();
const planet = new Tatooine({ segments: q.sphereSegments, sunA, sunB: new THREE.Vector3(0.35, 0.1, 0.93).normalize() });
planet.group.position.set(0, -1200, -5200);
stage.sky.add(planet.group);

stage.camera.position.set(0, 0, 0);
stage.camera.lookAt(0, -300, -5200);

const light = new THREE.DirectionalLight(0xfff0dd, 2.4);
light.position.copy(sunA).multiplyScalar(500);
stage.scene.add(light);
stage.scene.add(new THREE.AmbientLight(0x2a3244, 0.6));

const clock = new THREE.Clock();
function frame() {
  const t = clock.getElapsedTime();
  stars.update(t);
  planet.update(t);
  stage.render(t);
  requestAnimationFrame(frame);
}
frame();

window.addEventListener('resize', () => stage.resize(window.innerWidth, window.innerHeight));
(document.getElementById('gate') as HTMLElement).classList.add('hidden');
(window as unknown as Record<string, unknown>).__ready = true;
