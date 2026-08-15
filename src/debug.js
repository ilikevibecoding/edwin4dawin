import * as THREE from 'three';
import { LAYOUT } from './layout.js';

export const VIEWS = {
  controlRoom: { pos: [0.46, 1.46, 10.08], look: [-0.12, 1.18, 11.55], fov: 52 },
  corridor: { pos: [0.22, 1.48, 8.42], look: [-0.18, 1.18, 6.55], fov: 50 },
  crewQuarters: { pos: [0.34, 1.46, 5.08], look: [-0.38, 0.92, 3.55], fov: 50 },
  engineRoom: { pos: [0.4, 1.38, -3.05], look: [-0.08, 0.88, -5.85], fov: 50 },
  machineryCloseup: { pos: [0.46, 1.08, -5.05], look: [0.02, 0.86, -6.2], fov: 38 },
  sonarConsole: { pos: [-0.06, 1.36, 10.72], look: [-0.38, 1.12, 10.28], fov: 40 },
  forwardViewport: { pos: [0.0, 1.2, 11.92], look: [0.12, 0.72, 17.4], fov: 56 },
  porthole: { pos: [0.12, 1.32, 7.62], look: [0.82, 1.3, 7.55], fov: 46 },
  aftWide: { pos: [-0.22, 1.52, -2.15], look: [0.12, 0.78, -6.05], fov: 54 },
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
      ctx.tickSystems?.(dt);
      player.update(dt);
      interact.update();
    },
    completeRest() {
      ctx.completeRest?.();
    },
    getState() {
      return env.getState?.()?.mode ?? '';
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
        interact.setBusy(false);
        interact.clearHover?.();
        player.setEnabled(true);
        player.setPose(stand.x, stand.y, stand.z);
        camera.position.set(stand.x, stand.y, stand.z);
        player.lookAt(new THREE.Vector3(-0.4, 0.85, 4.55));
        interact.update();
        return hud.getPrompt();
      }
      else if (name === 'silentRunning') {
        interact.setBusy(false);
        interact.clearHover?.();
        player.setEnabled(true);
        player.setPose(0.02, LAYOUT.eyeHeight, -1.15);
        camera.position.set(0.02, LAYOUT.eyeHeight, -1.15);
        player.lookAt(new THREE.Vector3(0.32, 1.15, -1.75));
        interact.update();
        return hud.getPrompt();
      }
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
