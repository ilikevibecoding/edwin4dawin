// Weather system — owner: Fable 4 (Wave B). Exterior snowfall, window-driven
// snow wisps, storm atmosphere. Contract with game.js:
//   const weather = createWeather(scene, world);
//   weather.update(dt, playerPos);  // each sim step
//   weather.dispose();
// Stub until the weather pass lands.

export function createWeather(scene, world) {
  return {
    update(dt, playerPos) { /* implemented by weather pass */ },
    dispose() {},
  };
}
