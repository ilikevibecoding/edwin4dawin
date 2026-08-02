/**
 * Placeholder scene used while a shot is still being built, so the film always
 * plays end to end and the render pipeline can be exercised at any time.
 */
import * as THREE from 'three';
import { brick, C, BRICK, rng } from '../lego/bricks.js';
import { textTexture } from '../lego/svgtex.js';

export function stubScene(id, dur, label) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070c);
  scene.add(new THREE.HemisphereLight(0x99bbff, 0x101018, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(12, 20, 14);
  scene.add(key);

  const r = rng(id.length * 977 + 13);
  const pts = new Float32Array(3000 * 3);
  for (let i = 0; i < 3000; i++) {
    const v = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(400 + r() * 300);
    pts.set([v.x, v.y, v.z], i * 3);
  }
  const stars = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pts, 3)),
    new THREE.PointsMaterial({ color: 0xffffff, size: 1.4, sizeAttenuation: true })
  );
  scene.add(stars);

  const tower = new THREE.Group();
  const cols = [C.red, C.yellow, C.blue, C.green, C.orange, C.white];
  for (let i = 0; i < 7; i++) {
    const b = brick(4 - (i % 2), 2, BRICK, { color: cols[i % cols.length] });
    b.position.y = i * BRICK;
    b.rotation.y = i * 0.16;
    tower.add(b);
  }
  scene.add(tower);

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 5.5),
    new THREE.MeshBasicMaterial({ map: textTexture([label || id, 'shot not built yet'], { w: 1024, h: 256, size: 78, color: '#ffe81f' }), transparent: true })
  );
  sign.position.set(0, 12, -6);
  scene.add(sign);

  return {
    scene,
    cues: [],
    update(t, ctx) {
      const cam = ctx.camera;
      const a = t * 0.28;
      cam.position.set(Math.sin(a) * 16, 7 + Math.sin(t * 0.4) * 2.4, Math.cos(a) * 16);
      cam.lookAt(0, 5, 0);
      tower.rotation.y = t * 0.5;
    },
  };
}
