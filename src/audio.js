// ---------------------------------------------------------------------------
// Sound. All synthesised — there are no audio files, the same way there are no
// textures — through the Web Audio API: an engine that follows throttle and
// revs, tyre noise that follows speed and the surface under the wheels, wind,
// and a savanna ambience bed with birds and distant animals. Browsers refuse to
// start audio before a user gesture, so `createAudio` builds nothing until the
// first click or key.
//
// Contract:
//   createAudio() -> {
//     update(dt, { speed, throttle, rpm, surface, timeOfDay, camera }),
//     setEnabled(bool), enabled,
//     cue(name, opts),             // one-shots: door, indicator, lion
//   }
// ---------------------------------------------------------------------------

export function createAudio() {
  let enabled = false;
  return {
    get enabled() {
      return enabled;
    },
    setEnabled(on) {
      enabled = !!on;
    },
    update() {},
    cue() {},
  };
}
