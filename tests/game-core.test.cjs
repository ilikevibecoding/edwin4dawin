const assert = require("node:assert/strict");
const test = require("node:test");
const Core = require("../game-core.js");

test("initial state contains a playable village", () => {
  const state = Core.createInitialState(1_000);
  assert.equal(state.version, Core.SAVE_VERSION);
  assert.ok(state.buildings.some((building) => building.type === "hall"));
  assert.ok(state.resources.gold > 0);
  assert.equal(Core.getAvailableBuilders(state, 1_000), 1);
});

test("resource buildings accrue production up to storage", () => {
  const state = Core.createInitialState(1_000);
  const mine = state.buildings.find((building) => building.type === "goldMine");
  mine.stored = 0;
  mine.level = 1;
  mine.lastTick = 1_000;

  Core.accrueProduction(state, 61_000);
  assert.equal(Math.round(mine.stored), Core.BUILDING_DEFS.goldMine.production);

  Core.accrueProduction(state, 86_400_000);
  assert.equal(mine.stored, Core.getStorageCapacity(mine));
});

test("collecting a producer transfers resources and quest progress", () => {
  const state = Core.createInitialState(10_000);
  const mine = state.buildings.find((building) => building.type === "goldMine");
  state.resources.gold = 100;
  mine.stored = 125.8;

  const collected = Core.collectBuilding(state, mine.id);
  assert.equal(collected, 125);
  assert.equal(state.resources.gold, 225);
  assert.equal(state.metrics.goldCollected, 125);
  assert.ok(mine.stored > 0 && mine.stored < 1);
});

test("building placement spends resources and occupies a tile", () => {
  const now = 20_000;
  const state = Core.createInitialState(now);
  const beforeWood = state.resources.wood;

  const building = Core.placeBuilding(state, "goldMine", 5, 5, now);
  assert.ok(building);
  assert.equal(state.resources.wood, beforeWood - Core.BUILDING_DEFS.goldMine.cost.wood);
  assert.equal(Core.isOccupied(state, 5, 5), true);
  assert.equal(state.metrics.built, 1);
  assert.equal(Core.getAvailableBuilders(state, now), 0);
});

test("placement rejects occupied tiles and unaffordable builds", () => {
  const now = 30_000;
  const state = Core.createInitialState(now);
  assert.equal(Core.placeBuilding(state, "goldMine", 6, 6, now), null);

  state.resources.wood = 0;
  assert.equal(Core.placeBuilding(state, "goldMine", 5, 5, now), null);
});

test("upgrades scale stats and spend the quoted cost", () => {
  const now = 40_000;
  const state = Core.createInitialState(now);
  const cannon = state.buildings.find((building) => building.type === "cannon");
  state.resources.gold = state.capacities.gold;
  state.resources.wood = state.capacities.wood;
  const oldDamage = Core.getDamage(cannon);
  const cost = Core.getUpgradeCost(cannon);
  const oldGold = state.resources.gold;

  const upgraded = Core.upgradeBuilding(state, cannon.id, now);
  assert.ok(upgraded);
  assert.equal(upgraded.level, 3);
  assert.equal(state.resources.gold, oldGold - cost.gold);
  assert.ok(Core.getDamage(upgraded) > oldDamage);
  assert.equal(state.metrics.upgrades, 1);
});

test("quest rewards can only be claimed once", () => {
  const state = Core.createInitialState();
  state.metrics.built = 1;
  const before = state.resources.gold;

  assert.equal(Core.claimQuest(state, "raise-building"), true);
  assert.equal(state.resources.gold, before + 220);
  assert.equal(Core.claimQuest(state, "raise-building"), false);
});

test("saved data is sanitized and invalid versions reset safely", () => {
  const state = Core.createInitialState(50_000);
  state.resources.gold = -90;
  state.buildings[0].x = 999;
  const restored = Core.sanitizeState(state, 50_000);

  assert.equal(restored.resources.gold, 0);
  assert.equal(restored.buildings[0].x, Core.GRID_SIZE - 1);
  assert.equal(Core.sanitizeState({ version: -1 }, 50_000).version, Core.SAVE_VERSION);
});
