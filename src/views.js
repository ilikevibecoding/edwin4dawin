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
  controlRoom: v([-0.8, 1.64, 5.2], [0.35, 0.98, 0.9], { fov: 66 }),
  corridor: v([0.0, 1.6, 13.05], [0.1, 1.05, 6.4], { fov: 64 }),
  crewQuarters: v([0.52, 1.54, 12.95], [-1.0, 0.85, 8.3], { fov: 66 }),
  engineRoom: v([0.42, 1.28, 17.45], [-0.3, 0.5, 21.8], { fov: 68 }),
  machineryCloseup: v([-0.62, 0.85, 19.35], [0.45, 0.42, 21.2], { fov: 58 }),
  sonarConsole: v([-0.15, 1.52, 3.95], [-1.05, 1.18, 2.6], { fov: 60 }),
  forwardViewport: v([0.0, 1.42, 3.0], [0, 1.26, -0.6], { fov: 62 }),
  porthole: v([0.28, 1.45, 7.42], [1.44, 1.4, 6.92], { fov: 56 }),
  aftWide: v([0.0, 1.62, 16.6], [0, 0.55, 21.5], { fov: 74 }),
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
