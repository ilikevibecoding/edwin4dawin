// window.debugAPI — deterministic control surface for Playwright.
// Owner: camera/presentation agent.

import { applyView, VIEWS } from './views.js';
import { setWear } from './materials.js';

export function installDebugAPI(ctx) {
  const metrics = {
    dts: [],
    push(dt) { this.dts.push(dt); if (this.dts.length > 300) this.dts.shift(); },
  };
  ctx.metricsSink = metrics;

  const api = {
    setView(name) { return applyView(name, ctx); },
    listViews() { return Object.keys(VIEWS); },
    setSubmarineState(name) {
      if (name === 'clean') { setWear(0.25); return true; }
      if (name === 'used') { setWear(1.0); return true; }
      return ctx.env.setState(name, { duration: 0.25 });
    },
    setMotionEnabled(enabled) { ctx.time.setMotion(!!enabled); return true; },
    setSimTime(t) { ctx.time.setSim(Math.max(0, +t || 0)); return true; },
    setFixedDt(v) { ctx.setFixedDt(v); return true; },
    setPlayerEnabled(enabled) {
      ctx.player.setEnabled(!!enabled);
      if (enabled) ctx.hud.setVisible(true);
      return true;
    },
    setHUDVisible(visible) { ctx.hud.setVisible(!!visible); return true; },
    triggerInteraction(name) { return ctx.interact.trigger(name); },
    resetScene() {
      ctx.env.setState('cruising', { duration: 0.2 });
      setWear(1.0);
      ctx.time.setMotion(true);
      ctx.player.teleport(0, 2.4, 0, 0);
      ctx.player.setEnabled(true);
      ctx.hud.setVisible(true);
      ctx.hud.setHint(true);
      ctx.camera.fov = 62;
      ctx.camera.updateProjectionMatrix();
      return true;
    },
    // test helpers
    pumpFrame() { return ctx.pumpFrame(); },
    teleport(x, z, yaw = 0, pitch = 0) { ctx.player.teleport(x, z, yaw, pitch); return true; },
    getPose() { return ctx.player.getPose(); },
    getHoveredId() { return ctx.interact.getHoveredId(); },
    getStatusText() { return ctx.hud.getStatusText(); },
    getFadeOpacity() { return ctx.hud.getFadeOpacity(); },
    markFadePeak() { ctx.hud.markFadePeak(); return true; },
    getFadePeak() { return ctx.hud.getFadePeak(); },
    getLightingState() { return ctx.env.getState(); },
    getSimTime() { return ctx.time.simTime; },
    getMetrics() {
      const dts = metrics.dts.slice(-240);
      const avg = dts.length ? dts.reduce((a, b) => a + b, 0) / dts.length : 0;
      const sorted = [...dts].sort((a, b) => b - a);
      const onePct = sorted.length ? sorted[Math.max(0, Math.floor(sorted.length * 0.01))] : 0;
      const info = ctx.renderer.info;
      const gl = ctx.renderer.getContext();
      let rendererStr = 'unknown';
      try {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        rendererStr = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      } catch (e) { /* ignore */ }
      const renderCostMs = ctx.getRenderCostMs ? ctx.getRenderCostMs() : 0;
      return {
        fps: avg > 0 ? 1 / avg : 0,
        averageFrameTimeMs: avg * 1000,
        onePercentLowFps: onePct > 0 ? 1 / onePct : 0,
        renderCostMs,
        fpsIndicative: renderCostMs > 0 ? 1000 / renderCostMs : 0,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        points: info.render.points,
        lines: info.render.lines,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        programs: info.programs ? info.programs.length : 0,
        renderer: rendererStr,
        rendererInfo: {
          autoReset: info.autoReset,
          frame: info.render.frame,
        },
      };
    },
  };
  window.debugAPI = api;
  return api;
}
