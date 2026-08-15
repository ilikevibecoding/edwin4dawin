import * as THREE from "three";
import { VIEWS, PLAYER } from "./layout.js";
import { applyLightingState } from "./environment.js";
import { setWearAmount } from "./materials.js";

export function installDebugAPI(app) {
  const api = {
    ready: false,
    setView(name) {
      const v = VIEWS[name];
      if (!v) return false;
      app.player.setEnabled(false);
      app.viewName = name;
      app.camera.fov = v.fov;
      app.camera.updateProjectionMatrix();
      app.camera.position.set(...v.position);
      app.camera.lookAt(new THREE.Vector3(...v.target));
      app.camera.rotation.order = "YXZ";
      if (name === "walking") {
        app.player.position.set(v.position[0], 0, v.position[2]);
        app.player.yaw = 0;
        app.player.pitch = -0.08;
      }
      app.fixedTime = 12.0;
      app.clock.elapsedTime = 12.0;
      return true;
    },
    setSubmarineState(name) {
      applyLightingState(app.ctx, name);
      if (name === "silentRunning") app.ctx.spinScale = 0.28;
      else app.ctx.spinScale = 1;
      if (name === "clean") setWearAmount(0.15);
      if (name === "used") setWearAmount(0.85);
      app.ctx.requestedState = name;
      return true;
    },
    setMotionEnabled(enabled) {
      app.motionEnabled = !!enabled;
      return true;
    },
    setPlayerEnabled(enabled) {
      app.player.setEnabled(!!enabled);
      return true;
    },
    setHUDVisible(visible) {
      app.interact.setHUDVisible(!!visible);
      return true;
    },
    triggerInteraction(name) {
      return app.interact.activate(name);
    },
    resetScene() {
      app.player.setPose(0, 2.4, Math.PI, -0.08);
      applyLightingState(app.ctx, "cruising");
      setWearAmount(0.85);
      app.ctx.spinScale = 1;
      app.ctx.sonarSweep = 0;
      app.ctx.events.length = 0;
      app.motionEnabled = true;
      app.player.setEnabled(true);
      app.interact.setHUDVisible(true);
      return true;
    },
    getMetrics() {
      const info = app.renderer.info;
      const frames = app.frameTimes;
      const avg = frames.length ? frames.reduce((a, b) => a + b, 0) / frames.length : 16.6;
      const sorted = frames.slice().sort((a, b) => b - a);
      const p1 = sorted[Math.max(0, Math.floor(sorted.length * 0.01))] || avg;
      const gl = app.renderer.getContext();
      const dbg = gl.getExtension?.("WEBGL_debug_renderer_info");
      const rendererName = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "unknown";
      return {
        fps: +(1000 / avg).toFixed(2),
        averageFrameTimeMs: +avg.toFixed(2),
        onePercentLowFps: +(1000 / p1).toFixed(2),
        drawCalls: app.lastInfo?.calls ?? info.render.calls,
        triangles: app.lastInfo?.triangles ?? info.render.triangles,
        points: app.lastInfo?.points ?? info.render.points,
        lines: app.lastInfo?.lines ?? info.render.lines,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        programs: info.programs?.length || 0,
        renderer: rendererName,
        rendererInfo: {
          vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : "",
          webgl: gl.getParameter(gl.VERSION),
        },
      };
    },
    getState() {
      return {
        view: app.viewName,
        submarineState: app.ctx.submarineState,
        hoverId: app.ctx.hoverId,
        lastStatus: app.ctx.lastStatus,
        events: app.ctx.events.slice(),
        sonarSweep: app.ctx.sonarSweep,
        player: {
          x: app.player.position.x,
          z: app.player.position.z,
          yaw: app.player.yaw,
          locked: app.player.locked,
        },
        fadeOn: document.getElementById("fade")?.classList.contains("on") || false,
        frameId: app.frameId || 0,
      };
    },
    placePlayer(x, z, yaw, pitch = 0) {
      app.player.setEnabled(true);
      app.player.setPose(x, z, yaw, pitch);
      return true;
    },
    setKey(code, down) {
      app.player.setKey(code, !!down);
      return true;
    },
    lookAtWorld(x, y, z) {
      const p = app.camera.position;
      const dx = x - p.x;
      const dy = y - p.y;
      const dz = z - p.z;
      app.player.yaw = Math.atan2(-dx, -dz);
      app.player.pitch = Math.atan2(dy, Math.hypot(dx, dz));
      app.player.syncCamera(0);
      return true;
    },
  };
  window.debugAPI = api;
  app.debugAPI = api;
  return api;
}
