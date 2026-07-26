// First-person viewmodel: arms + weapon models attached to the camera.
// Owner: Fable 4 (characters/weapons/animation). Contract with game.js:
//   const vm = createViewmodel(camera);
//   vm.update(dt, weaponsSystem, player);   // every sim step while playing
//   vm.dispose();
// Stub until the Wave A character pass lands.

export function createViewmodel(camera) {
  return {
    group: null,
    update(dt, weapons, player) { /* implemented by character pass */ },
    dispose() {},
  };
}
