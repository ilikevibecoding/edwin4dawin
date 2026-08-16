import { Vector3 } from 'three';

const VIEWS = {
  controlRoom: { pos: [0.04, 1.52, 3.25], look: [0.08, 1.12, 1.35], fov: 60 },
  corridor: { pos: [0.0, 1.52, 4.95], look: [0.05, 1.22, 7.35], fov: 58 },
  crewQuarters: { pos: [0.2, 1.48, 10.05], look: [-0.42, 0.95, 9.2], fov: 58 },
  engineRoom: { pos: [-0.22, 1.5, 17.35], look: [0.22, 0.88, 19.7], fov: 58 },
  machineryCloseup: { pos: [-0.05, 1.22, 18.7], look: [0.3, 0.82, 19.95], fov: 48 },
  sonarConsole: { pos: [-0.12, 1.42, 2.65], look: [-0.46, 1.18, 1.88], fov: 46 },
  forwardViewport: { pos: [0.0, 1.36, 2.55], look: [0.0, 1.24, 0.22], fov: 48 },
  porthole: { pos: [0.02, 1.32, 6.55], look: [0.78, 1.32, 6.55], fov: 46 },
  aftWide: { pos: [-0.18, 1.55, 16.7], look: [0.2, 0.95, 20.3], fov: 64 },
  walking: { pos: [0.0, 1.65, 5.05], look: [0.0, 1.28, 7.6], fov: 64 },
};

export function createDebugAPI(app) {
  const api = {
    ready: false,
    views: Object.keys(VIEWS),
    setView(name) {
      const v = VIEWS[name];
      if (!v) return false;
      app.player.state.enabled = false;
      app.debugCamera.fov = v.fov;
      app.debugCamera.position.set(...v.pos);
      app.debugCamera.lookAt(...v.look);
      app.debugCamera.updateProjectionMatrix();
      app.activeCamera = app.debugCamera;
      app.post.setCamera(app.debugCamera);
      app.currentView = name;
      if (app.water) {
        const { setWaterFrozen } = app.waterApi;
        setWaterFrozen(app.water, name.length);
      }
      return true;
    },
    setSubmarineState(name) {
      app.applyState(name);
      return true;
    },
    setMotionEnabled(enabled) {
      app.motionEnabled = Boolean(enabled);
      return true;
    },
    setPlayerEnabled(enabled) {
      app.player.state.enabled = Boolean(enabled);
      if (enabled) {
        app.activeCamera = app.player.camera;
        app.post.setCamera(app.player.camera);
      }
      return true;
    },
    setHUDVisible(visible) {
      app.interact.setHUDVisible(Boolean(visible));
      return true;
    },
    triggerInteraction(name) {
      return app.interact.trigger(name);
    },
    resetScene() {
      app.player.setPose(0.05, 0, 2.15, 0, -0.08);
      app.applyState('cruising');
      app.wear = 'used';
      app.motionEnabled = true;
      app.interact.setHUDVisible(true);
      app.activeCamera = app.player.camera;
      app.post.setCamera(app.player.camera);
      return true;
    },
    setPlayerPose(x, y, z, yaw, pitch) {
      app.player.setPose(x, y, z, yaw, pitch);
      return true;
    },
    simulateSeconds(seconds) {
      const steps = Math.max(1, Math.ceil(Number(seconds) / 0.05));
      for (let i = 0; i < steps; i++) app.simulate(0.05);
      return true;
    },
    lookAtInteractable(name) {
      const obj = app.sub.interactables.find((o) => o.userData.interact === name);
      if (!obj) return false;
      const p = new Vector3();
      obj.getWorldPosition(p);
      p.y += 0.45;
      const eye = app.player.state.position.clone();
      eye.y = app.player.eye;
      const dx = p.x - eye.x;
      const dy = p.y - eye.y;
      const dz = p.z - eye.z;
      app.player.state.yaw = Math.atan2(-dx, -dz);
      app.player.state.pitch = Math.atan2(dy, Math.hypot(dx, dz));
      app.player.syncCamera(0);
      return true;
    },
    getPlayerState() {
      const p = app.player.state.position;
      return {
        x: p.x,
        y: p.y,
        z: p.z,
        yaw: app.player.state.yaw,
        pitch: app.player.state.pitch,
        locked: app.player.state.locked,
      };
    },
    getInteractionState() {
      return {
        prompt: app.interact.prompt || '',
        status: app.interact.status || '',
        hovered: app.interact.hovered || null,
        fade: app.interact.fade || 0,
        lighting: app.lightingState,
        silent: app.lightingState === 'silentRunning',
      };
    },
    getMetrics() {
      const info = app.renderer.info;
      const sceneStats = app.sceneStats || info.render;
      const frames = app.frameTimes;
      const avg = frames.length ? frames.reduce((a, b) => a + b, 0) / frames.length : 16.6;
      const sorted = frames.slice().sort((a, b) => b - a);
      const onePct = sorted[Math.max(0, Math.floor(sorted.length * 0.01))] || avg;
      const gl = app.renderer.getContext();
      const dbg = gl.getExtension && gl.getExtension('WEBGL_debug_renderer_info');
      const rendererName = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown';
      return {
        fps: 1000 / avg,
        averageFrameTimeMs: avg,
        onePercentLowFps: 1000 / onePct,
        drawCalls: sceneStats.calls ?? info.render.calls,
        triangles: sceneStats.triangles ?? info.render.triangles,
        points: sceneStats.points ?? info.render.points,
        lines: sceneStats.lines ?? info.render.lines,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        programs: info.programs ? info.programs.length : 0,
        renderer: rendererName,
        rendererInfo: {
          vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : '',
          webgl: gl.getParameter(gl.VERSION),
        },
      };
    },
  };

  window.debugAPI = api;
  return api;
}

export { VIEWS };
