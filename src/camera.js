import * as THREE from 'three';

export const VIEWS = {
  hero: {
    position: [4.6, 1.55, 5.6],
    target: [0.05, 0.92, 0.15],
    fov: 40,
  },
  front: {
    position: [0.2, 1.2, 5.2],
    target: [0, 0.98, 1.5],
    fov: 36,
  },
  rear: {
    position: [1.55, 1.3, -5.0],
    target: [0, 1.02, -1.5],
    fov: 38,
  },
  wheel: {
    position: [2.7, 0.82, 2.45],
    target: [0.82, 0.5, 1.23],
    fov: 32,
  },
  interior: {
    position: [0.3, 1.4, -0.08],
    target: [0.12, 1.14, 0.62],
    fov: 55,
  },
  forest: {
    position: [4.9, 1.85, 8.4],
    target: [0.1, 1.0, 0.1],
    fov: 42,
  },
  road: {
    position: [0.15, 1.55, 14.2],
    target: [0.05, 0.75, 1.6],
    fov: 38,
  },
  detail: {
    position: [1.35, 1.08, 3.35],
    target: [0.12, 0.98, 2.02],
    fov: 30,
  },
};

export const VIEW_NAMES = Object.keys(VIEWS);

export function applyView(camera, name) {
  const v = VIEWS[name];
  if (!v) return false;
  camera.fov = v.fov;
  camera.position.set(...v.position);
  camera.lookAt(new THREE.Vector3(...v.target));
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return true;
}
