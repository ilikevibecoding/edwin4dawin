import * as THREE from 'three';
import { LAYOUT } from './layout.js';

export const VIEWS = {
  controlRoom: { pos: [0.12, 1.38, 10.85], look: [-0.32, 1.12, 10.35], fov: 50 },
  corridor: { pos: [0.2, 1.46, 8.25], look: [-0.32, 1.2, 6.7], fov: 54 },
  crewQuarters: { pos: [0.26, 1.44, 4.7], look: [-0.5, 0.88, 3.7], fov: 54 },
  engineRoom: { pos: [0.22, 1.18, -4.55], look: [0.02, 0.78, -6.25], fov: 48 },
  machineryCloseup: { pos: [0.28, 1.02, -5.45], look: [0.04, 0.8, -6.3], fov: 38 },
  sonarConsole: { pos: [-0.06, 1.36, 10.72], look: [-0.38, 1.12, 10.28], fov: 40 },
  forwardViewport: { pos: [0.0, 1.28, 10.95], look: [0.0, 1.12, 14.2], fov: 50 },
  porthole: { pos: [0.1, 1.32, 7.65], look: [0.82, 1.3, 7.55], fov: 46 },
  aftWide: { pos: [-0.26, 1.48, -2.55], look: [0.15, 0.72, -6.2], fov: 56 },
  walking: { pos: [0.06, LAYOUT.eyeHeight, 7.0], look: [-0.08, 1.22, 4.7], fov: 60 },
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
      interact.update();
    },
    setHoldForward(v) {
      player.setHoldForward(!!v);
    },
    step(dt = 0.05) {
      player.update(dt);
      interact.update();
    },
    aimInteract(name) {
      const mesh = interact.targets.find((t) => t.userData.interact?.name === name);
      if (!mesh) return '';
      const wp = new THREE.Vector3();
      mesh.getWorldPosition(wp);
      const stand = wp.clone();
      stand.y = LAYOUT.eyeHeight;
      if (name === 'rest') {
        stand.set(0.22, LAYOUT.eyeHeight, 4.55);
        player.setEnabled(true);
        player.setPose(stand.x, stand.y, stand.z);
        player.lookAt(new THREE.Vector3(-0.4, 0.85, 4.55));
        interact.update();
        return hud.getPrompt();
      }
      else if (name === 'silentRunning') stand.set(0.02, LAYOUT.eyeHeight, -1.15);
      else stand.set(wp.x + 0.32, LAYOUT.eyeHeight, wp.z + 0.7);
      player.setEnabled(true);
      player.setPose(stand.x, stand.y, stand.z);
      player.lookAt(wp);
      interact.update();
      return hud.getPrompt();
    },
    clearStatus() {
      hud.setStatus('');
      hud.setPrompt('');
    },
    setBusy(v) {
      interact.setBusy(!!v);
    },
  };

  window.debugAPI = api;
  return api;
}
