/**
 * Review views + exec recipes for the air strike (registered on 'game:ready').
 *
 *   node tools/shot.mjs --out x.png --view airstrike_jets      --exec "await debug.views.airstrike_jets.run()"      --wait 0 --frames 1
 *   node tools/shot.mjs --out x.png --view airstrike_impact    --exec "await debug.views.airstrike_impact.run()"    --wait 0 --frames 1
 *   node tools/shot.mjs --out x.png --view airstrike_targeting --exec "await debug.views.airstrike_targeting.run()" --wait 0 --frames 1
 *
 * airstrike_jets: strike 24 m ahead, jets running in diagonally toward the camera (aircraft + falling bombs in frame).
 * airstrike_impact: strike 24 m ahead, run-in perpendicular to the view so the six impacts walk across the plaza.
 * Each run() freezes the simulation (game.timeScale = 0) at the interesting moment.
 */
export function registerKillstreakDebugViews(game) {
  const d = game.debug;
  if (!d || typeof d.registerView !== 'function') return;
  const wait = (s) => d.waitTime(s);
  const frames = (n) => d.waitFrames(n);
  const freeze = () => {
    game.timeScale = 0;
  };

  /** Target `dist` m ahead; run-in direction = toward the player rotated by `deg`. */
  const callAhead = (dist = 24, deg = 40) => {
    const P = game.player;
    const f = P.forward;
    const l = Math.hypot(f.x, f.z) || 1;
    const fx = f.x / l, fz = f.z / l;
    const tx = P.position.x + fx * dist, tz = P.position.z + fz * dist;
    const a = (deg * Math.PI) / 180;
    // toward the player = (-fx, -fz), rotated about Y by `a`
    const dx = -fx * Math.cos(a) - -fz * Math.sin(a);
    const dz = -fx * Math.sin(a) + -fz * Math.cos(a);
    game.killstreaks.airstrike.callAt(tx, tz, dx, dz);
  };

  d.registerView('airstrike_jets', {
    pos: [0, 0, 22], yaw: 0, pitch: 16, hud: false,
    run: async () => {
      callAhead(24, 40);
      await wait(2.5); // jets ≈ 60 m short of the target at 52 m, bombs already falling behind them
      freeze();
    },
  });
  d.registerView('airstrike_impact', {
    pos: [0, 0, 22], yaw: 0, pitch: 8, hud: false,
    run: async () => {
      callAhead(24, 90); // run-in across the plaza (right → left) so the whole stick lands on open ground
      const strike = game.killstreaks.strike;
      // advance until the first bomb hits, then 0.25 s
      for (let i = 0; i < 60 * 8 && strike.impacts === 0; i++) await frames(1);
      await wait(0.25);
      freeze();
    },
  });
  d.registerView('airstrike_targeting', {
    pos: [0, 0, 22], yaw: 0, pitch: 0, hud: true,
    run: async () => {
      game.killstreaks.airstrike.beginTargeting();
      await frames(2);
      freeze();
    },
  });
}
