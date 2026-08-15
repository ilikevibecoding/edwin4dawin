import * as THREE from 'three';

export const VIEWS = {
  hero: {
    position: [5.4, 1.7, 6.8],
    target: [0.1, 0.95, 0.2],
    fov: 42,
  },
  front: {
    position: [0.15, 1.25, 5.6],
    target: [0, 1.0, 1.4],
    fov: 38,
  },
  rear: {
    position: [1.4, 1.35, -5.4],
    target: [0, 1.05, -1.6],
    fov: 40,
  },
  wheel: {
    position: [2.15, 0.55, 1.85],
    target: [0.82, 0.42, 1.23],
    fov: 36,
  },
  interior: {
    position: [0.32, 1.48, 0.28],
    target: [0.1, 1.22, 1.4],
    fov: 62,
  },
  forest: {
    position: [8.5, 2.4, 14.5],
    target: [0.2, 1.1, 0.0],
    fov: 44,
  },
  road: {
    position: [0.2, 1.6, 16.5],
    target: [0.1, 0.7, 2.0],
    fov: 40,
  },
  detail: {
    position: [1.15, 1.05, 3.15],
    target: [0.15, 0.98, 2.0],
    fov: 32,
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
