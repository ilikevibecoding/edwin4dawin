// Deterministic debug camera poses. Owner: camera/presentation agent.
// Every view: fixed pose, fixed sim time, fixed state, HUD hidden unless testing UI.

function lookYaw(from, to) {
  return Math.atan2(-(to[0] - from[0]), -(to[2] - from[2]));
}
function lookPitch(from, to) {
  const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2];
  return Math.atan2(dy, Math.hypot(dx, dz));
}

function v(pos, target, opts = {}) {
  return {
    pos,
    yaw: lookYaw(pos, target),
    pitch: lookPitch(pos, target),
    fov: opts.fov || 62,
    time: opts.time !== undefined ? opts.time : 40,
    hud: !!opts.hud,
    state: opts.state || null,
  };
}

export const VIEWS = {
  controlRoom: v([-0.45, 1.62, 5.45], [0.3, 1.0, 1.0], { fov: 66 }),
  corridor: v([0.0, 1.6, 13.05], [0.0, 1.15, 6.4], { fov: 64 }),
  crewQuarters: v([0.3, 1.48, 12.55], [-0.9, 0.82, 8.6], { fov: 64 }),
  engineRoom: v([0.42, 1.18, 17.45], [-0.2, 0.5, 21.8], { fov: 68 }),
  machineryCloseup: v([-0.62, 0.85, 19.35], [0.45, 0.42, 21.2], { fov: 62 }),
  sonarConsole: v([-0.15, 1.52, 3.95], [-1.05, 1.18, 2.6], { fov: 60 }),
  forwardViewport: v([0.0, 1.45, 1.7], [0, 1.28, -0.62], { fov: 58 }),
  porthole: v([0.12, 1.3, 7.46], [1.51, 1.42, 6.94], { fov: 52 }),
  aftWide: v([0.0, 1.5, 16.6], [0, 0.55, 21.5], { fov: 74 }),
  walking: v([0.0, 1.7, 9.2], [0, 1.28, 14.5], { fov: 62, hud: true }),
};

export function applyView(name, ctx) {
  const view = VIEWS[name];
  if (!view) return false;
  ctx.player.setEnabled(false);
  ctx.player.teleport(0, 10, 0, 0); // park somewhere neutral first (feet math)
  const rig = ctx.player.object;
  rig.position.set(view.pos[0], view.pos[1], view.pos[2]);
  rig.rotation.y = view.yaw;
  ctx.player.pitchObject.rotation.x = view.pitch;
  ctx.camera.position.set(0, 0, 0);
  ctx.camera.rotation.set(0, 0, 0);
  ctx.camera.fov = view.fov;
  ctx.camera.updateProjectionMatrix();
  ctx.time.setMotion(false);
  ctx.time.setSim(view.time);
  ctx.hud.setVisible(view.hud);
  ctx.hud.setHint(false);
  return true;
}
