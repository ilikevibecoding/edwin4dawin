import * as THREE from 'three';
import { ShotList } from '../engine/camera.js';
import { starfield } from '../engine/stars.js';

/**
 * Placeholder chapter. Real scenes replace these; this exists so the film can
 * be built, timed and captured end-to-end while scenes are still being made.
 */
export function makeStub(id, label, color = 0x223344) {
  return {
    id,
    dur: 20,
    build(ctx) {
      const root = new THREE.Group();
      ctx.scene.background = new THREE.Color(color);
      root.add(starfield({ count: 900, radius: 900, seed: id.length * 17 }));

      const c = document.createElement('canvas');
      c.width = 1024; c.height = 256;
      const g = c.getContext('2d');
      g.fillStyle = '#ffd24a';
      g.font = '400 96px TitleGothic, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(label.toUpperCase(), 512, 128);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(40, 10),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }),
      );
      root.add(plate);

      const shots = new ShotList();
      shots.add({ t: 0, dur: 999, pos: [0, 0, 42], look: [0, 0, 0], fov: 40 });
      return { root, shots, update() {} };
    },
  };
}
