import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { applyLightState } from './lighting.js';
import { setWearState } from './materials.js';

export function createReflectionEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  room.traverse((o) => {
    if (o.isMesh && o.material) {
      const c = o.material.color;
      if (c) {
        c.offsetHSL(0.02, -0.15, -0.08);
      }
    }
  });
  const extra = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 1.2),
    new THREE.MeshBasicMaterial({ color: 0x163844 }),
  );
  extra.position.set(0, 0.4, -3);
  room.add(extra);
  const warm = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 0.3),
    new THREE.MeshBasicMaterial({ color: 0xffd2a0 }),
  );
  warm.position.set(0, 2.2, 1);
  room.add(warm);
  const tex = pmrem.fromScene(room, 0.04).texture;
  room.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
  });
  return { texture: tex, pmrem };
}

export function createEnvironmentController({ lights, materials, water, machinery }) {
  let visual = 'used';
  let mode = 'cruising';

  const apply = () => {
    const lightName = mode === 'cruising' ? (visual === 'clean' ? 'cruising' : 'cruising') : mode;
    if (mode === 'maintenanceLights') applyLightState(lights, 'maintenanceLights');
    else if (mode === 'restCycle') applyLightState(lights, 'restCycle');
    else if (mode === 'silentRunning') applyLightState(lights, 'silentRunning');
    else applyLightState(lights, 'cruising');
    setWearState(materials, visual !== 'clean');
    if (machinery?.setSilent) machinery.setSilent(mode === 'silentRunning');
    if (water?.setPaused) water.setPaused(false);
  };

  return {
    setSubmarineState(name) {
      if (name === 'clean' || name === 'used') visual = name;
      else mode = name;
      if (name === 'cruising') mode = 'cruising';
      apply();
      return { mode, visual };
    },
    getState() {
      return { mode, visual };
    },
    apply,
  };
}
