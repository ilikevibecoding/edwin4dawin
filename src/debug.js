import * as THREE from 'three';
import { LAYOUT } from './layout.js';

export const VIEWS = {
  controlRoom: { pos: [0.08, 1.62, 9.55], look: [0.0, 1.2, 12.2], fov: 62 },
  corridor: { pos: [0.02, 1.62, 8.85], look: [0.05, 1.25, 5.7], fov: 60 },
  crewQuarters: { pos: [0.18, 1.58, 5.05], look: [-0.25, 1.05, 3.2], fov: 60 },
  engineRoom: { pos: [0.05, 1.62, -1.85], look: [0.05, 0.95, -6.4], fov: 62 },
  machineryCloseup: { pos: [0.42, 1.28, -4.55], look: [0.05, 0.85, -6.2], fov: 50 },
  sonarConsole: { pos: [-0.05, 1.48, 10.95], look: [-0.38, 1.1, 10.3], fov: 48 },
  forwardViewport: { pos: [0.0, 1.45, 11.35], look: [0.0, 1.25, 14.5], fov: 58 },
  porthole: { pos: [0.12, 1.42, 7.55], look: [0.9, 1.32, 7.55], fov: 50 },
  aftWide: { pos: [-0.12, 1.68, -1.7], look: [0.1, 0.9, -7.2], fov: 68 },
  walking: { pos: [0.0, LAYOUT.eyeHeight, 7.4], look: [0.0, 1.45, 4.8], fov: 65 },
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
