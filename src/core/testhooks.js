// Deterministic browser-testing interface (spec-mandated):
//   window.render_game_to_text() -> concise JSON string of player-relevant state
//   window.advanceTime(ms)       -> advance the simulation deterministically
export function installTestHooks(game) {
  window.render_game_to_text = () => {
    const base = {
      coords: 'right-handed; +Y up; 1 unit = 1 m; yaw in degrees CCW from -Z (0 faces -Z / building north); pitch + looks up',
      mode: game.state,
      pointerLocked: game.input.pointerLocked,
      testMode: game.testMode,
      fps: game.engine.perf.fps,
      simTime: +game.engine.simTime.toFixed(2),
    };
    if (game.mission && game.mission.player && ['playing', 'paused', 'victory', 'defeat'].includes(game.state)) {
      Object.assign(base, game.mission.textState());
    } else {
      base.menu = {
        screen: game.state,
        chosenDifficulty: game.chosen.difficulty,
        chosenPrimary: game.chosen.loadout.primary,
      };
    }
    return JSON.stringify(base);
  };

  window.advanceTime = (ms) => {
    game.testMode = true;
    const clamped = Math.max(1, Math.min(ms, 120000));
    return game.engine.advance(clamped);
  };
}
