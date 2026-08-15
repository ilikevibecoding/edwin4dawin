import * as THREE from 'three';
import { LAYOUT } from './layout.js';

export const VIEWS = {
  controlRoom: { pos: [0.32, 1.42, 10.05], look: [-0.15, 1.08, 11.55], fov: 55 },
  corridor: { pos: [0.22, 1.48, 8.35], look: [-0.35, 1.15, 6.55], fov: 55 },
  crewQuarters: { pos: [0.28, 1.46, 4.75], look: [-0.48, 0.85, 3.55], fov: 55 },
  engineRoom: { pos: [0.32, 1.38, -3.05], look: [-0.12, 0.72, -6.05], fov: 52 },
  machineryCloseup: { pos: [0.42, 1.12, -5.15], look: [0.0, 0.78, -6.35], fov: 42 },
  sonarConsole: { pos: [-0.02, 1.38, 10.78], look: [-0.38, 1.1, 10.3], fov: 42 },
  forwardViewport: { pos: [0.12, 1.34, 11.15], look: [0.0, 1.26, 12.55], fov: 50 },
  porthole: { pos: [0.12, 1.34, 7.7], look: [0.85, 1.3, 7.55], fov: 46 },
  aftWide: { pos: [-0.28, 1.52, -2.35], look: [0.2, 0.7, -6.4], fov: 58 },
  walking: { pos: [0.08, LAYOUT.eyeHeight, 7.05], look: [-0.1, 1.25, 4.6], fov: 60 },
};

export function createDebugAPI(ctx) {
  const {
    camera,
    player,
    env,
    hud,
    water,
    interact,
    getMetrics,
    resetScene,
    trigger,
  } = ctx;

  const api = {
    ready: false,
    frameCount: 0,
    setView(name) {
      const v = VIEWS[name];
      if (!v) return false;
      player.setEnabled(false);
      camera.fov = v.fov;
      camera.updateProjectionMatrix();
      camera.position.set(...v.pos);
      camera.lookAt(new THREE.Vector3(...v.look));
      const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
      player.state.yaw = e.y;
      player.state.pitch = e.x;
      hud.setVisible(name === 'walking');
      return true;
    },
    setSubmarineState(name) {
      return env.setSubmarineState(name);
    },
    setMotionEnabled(enabled) {
      water.setPaused(!enabled);
      ctx.motionEnabled = !!enabled;
    },
    setPlayerEnabled(enabled) {
      player.setEnabled(!!enabled);
    },
    setHUDVisible(visible) {
      hud.setVisible(!!visible);
    },
    triggerInteraction(name) {
      return trigger(name);
    },
    resetScene() {
      resetScene();
    },
    getMetrics,
    getPrompt: () => hud.getPrompt(),
    getStatus: () => hud.getStatus(),
    getFade: () => hud.getFade(),
    getPlayer: () => ({
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      locked: player.isLocked(),
    }),
    setPlayerPose(x, y, z, yaw, pitch) {
      player.setEnabled(true);
      player.setPose(x, y ?? LAYOUT.eyeHeight, z, yaw ?? 0, pitch ?? 0);
    },
    lookAt(x, y, z) {
      player.lookAt(new THREE.Vector3(x, y, z));
    },
  };

  window.debugAPI = api;
  return api;
}
