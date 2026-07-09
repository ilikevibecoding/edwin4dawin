(function attachGameCore(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GameCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createGameCore() {
  "use strict";

  const SAVE_VERSION = 1;
  const GRID_SIZE = 13;

  const BUILDING_DEFS = Object.freeze({
    hall: {
      name: "Hearth Hall",
      short: "Hall",
      category: "core",
      description: "The warm heart of your hilltop haven.",
      resource: null,
      maxLevel: 10,
      buildSeconds: 0,
      hp: 900,
      xp: 0,
      cost: {},
      color: "#d85c43",
    },
    goldMine: {
      name: "Gold Burrow",
      short: "Burrow",
      category: "economy",
      description: "Coaxes bright coins from stubborn stone.",
      resource: "gold",
      maxLevel: 10,
      maxCount: 3,
      unlockLevel: 1,
      buildSeconds: 8,
      production: 36,
      storage: 420,
      hp: 420,
      xp: 80,
      cost: { wood: 280 },
      color: "#d6a13b",
    },
    lumberMill: {
      name: "Whistlewood Mill",
      short: "Mill",
      category: "economy",
      description: "Turns fallen branches into fine timber.",
      resource: "wood",
      maxLevel: 10,
      maxCount: 3,
      unlockLevel: 1,
      buildSeconds: 8,
      production: 30,
      storage: 380,
      hp: 440,
      xp: 80,
      cost: { gold: 320 },
      color: "#c96543",
    },
    barracks: {
      name: "Rowdy Roost",
      short: "Roost",
      category: "army",
      description: "Where daring crews hatch questionable plans.",
      resource: null,
      maxLevel: 8,
      maxCount: 2,
      unlockLevel: 2,
      buildSeconds: 12,
      hp: 570,
      xp: 120,
      cost: { wood: 520, gold: 180 },
      color: "#527fa4",
    },
    cannon: {
      name: "Acorn Lobber",
      short: "Lobber",
      category: "defense",
      description: "A sturdy answer to uninvited airships.",
      resource: null,
      maxLevel: 10,
      maxCount: 4,
      unlockLevel: 3,
      buildSeconds: 14,
      damage: 42,
      hp: 640,
      xp: 135,
      cost: { gold: 680 },
      color: "#526274",
    },
    beacon: {
      name: "Moon Beacon",
      short: "Beacon",
      category: "defense",
      description: "A crystal ward that dazzles distant raiders.",
      resource: null,
      maxLevel: 6,
      maxCount: 2,
      unlockLevel: 8,
      buildSeconds: 18,
      damage: 66,
      hp: 510,
      xp: 180,
      cost: { gold: 900, wood: 640 },
      color: "#6d66bd",
    },
  });

  const QUEST_DEFS = Object.freeze([
    {
      id: "gather-gold",
      title: "A glint in the hill",
      description: "Collect 300 gold from your burrows.",
      metric: "goldCollected",
      target: 300,
      reward: { wood: 180 },
      icon: "◆",
    },
    {
      id: "raise-building",
      title: "Room to grow",
      description: "Place one new building in the village.",
      metric: "built",
      target: 1,
      reward: { gold: 220 },
      icon: "⌂",
    },
    {
      id: "upgrade-building",
      title: "Tinker, tailor",
      description: "Upgrade any building.",
      metric: "upgrades",
      target: 1,
      reward: { gems: 4 },
      icon: "⚒",
    },
    {
      id: "win-raid",
      title: "A tale worth telling",
      description: "Win a sky voyage against a rival.",
      metric: "raidsWon",
      target: 1,
      reward: { gems: 7 },
      icon: "★",
    },
  ]);

  const INITIAL_BUILDINGS = Object.freeze([
    { id: "hall-1", type: "hall", x: 6, y: 6, level: 3 },
    { id: "mine-1", type: "goldMine", x: 3, y: 5, level: 2, stored: 170 },
    { id: "mill-1", type: "lumberMill", x: 8, y: 3, level: 2, stored: 130 },
    { id: "roost-1", type: "barracks", x: 8, y: 8, level: 1 },
    { id: "cannon-1", type: "cannon", x: 4, y: 8, level: 2 },
  ]);

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createInitialState(now = Date.now()) {
    return {
      version: SAVE_VERSION,
      createdAt: now,
      updatedAt: now,
      player: {
        name: "Oakshield",
        level: 7,
        xp: 360,
        nextXp: 1000,
      },
      resources: {
        gold: 1450,
        wood: 940,
        gems: 24,
      },
      capacities: {
        gold: 3500,
        wood: 3500,
        gems: 9999,
      },
      builders: {
        total: 1,
      },
      metrics: {
        goldCollected: 0,
        woodCollected: 0,
        built: 0,
        upgrades: 0,
        raidsWon: 0,
      },
      questsClaimed: [],
      raidCooldownUntil: 0,
      settings: {
        sound: true,
        particles: true,
      },
      buildings: INITIAL_BUILDINGS.map((building) => ({
        ...deepClone(building),
        stored: building.stored || 0,
        lastTick: now,
        readyAt: 0,
      })),
    };
  }

  function sanitizeState(candidate, now = Date.now()) {
    const fallback = createInitialState(now);
    if (!candidate || typeof candidate !== "object") return fallback;
    if (candidate.version !== SAVE_VERSION || !Array.isArray(candidate.buildings)) return fallback;

    const state = {
      ...fallback,
      ...candidate,
      player: { ...fallback.player, ...(candidate.player || {}) },
      resources: { ...fallback.resources, ...(candidate.resources || {}) },
      capacities: { ...fallback.capacities, ...(candidate.capacities || {}) },
      builders: { ...fallback.builders, ...(candidate.builders || {}) },
      metrics: { ...fallback.metrics, ...(candidate.metrics || {}) },
      settings: { ...fallback.settings, ...(candidate.settings || {}) },
      questsClaimed: Array.isArray(candidate.questsClaimed) ? candidate.questsClaimed : [],
      buildings: candidate.buildings
        .filter((building) => building && BUILDING_DEFS[building.type])
        .map((building, index) => ({
          id: String(building.id || `restored-${index}`),
          type: building.type,
          x: clamp(Math.round(Number(building.x) || 0), 0, GRID_SIZE - 1),
          y: clamp(Math.round(Number(building.y) || 0), 0, GRID_SIZE - 1),
          level: clamp(Math.round(Number(building.level) || 1), 1, BUILDING_DEFS[building.type].maxLevel),
          stored: Math.max(0, Number(building.stored) || 0),
          lastTick: Number(building.lastTick) || now,
          readyAt: Math.max(0, Number(building.readyAt) || 0),
        })),
    };

    for (const resource of ["gold", "wood", "gems"]) {
      state.resources[resource] = clamp(
        Number(state.resources[resource]) || 0,
        0,
        Number(state.capacities[resource]) || fallback.capacities[resource],
      );
    }

    if (!state.buildings.some((building) => building.type === "hall")) {
      state.buildings.unshift({ ...deepClone(fallback.buildings[0]), lastTick: now });
    }

    return state;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function levelMultiplier(level) {
    return 1 + (Math.max(1, level) - 1) * 0.34;
  }

  function getProductionPerMinute(building) {
    const definition = BUILDING_DEFS[building.type];
    if (!definition || !definition.production || building.readyAt > Date.now()) return 0;
    return Math.round(definition.production * levelMultiplier(building.level));
  }

  function getStorageCapacity(building) {
    const definition = BUILDING_DEFS[building.type];
    if (!definition || !definition.storage) return 0;
    return Math.round(definition.storage * (1 + (building.level - 1) * 0.3));
  }

  function getHitPoints(building) {
    const definition = BUILDING_DEFS[building.type];
    return Math.round((definition?.hp || 100) * (1 + (building.level - 1) * 0.23));
  }

  function getDamage(building) {
    const definition = BUILDING_DEFS[building.type];
    if (!definition?.damage) return 0;
    return Math.round(definition.damage * (1 + (building.level - 1) * 0.28));
  }

  function accrueProduction(state, now = Date.now()) {
    for (const building of state.buildings) {
      const definition = BUILDING_DEFS[building.type];
      const previousTick = Math.min(Number(building.lastTick) || now, now);
      const elapsedSeconds = Math.max(0, now - previousTick) / 1000;
      building.lastTick = now;
      if (!definition?.production || building.readyAt > now) continue;

      const rate = getProductionPerMinute(building) / 60;
      const cap = getStorageCapacity(building);
      building.stored = clamp((Number(building.stored) || 0) + rate * elapsedSeconds, 0, cap);
    }
    state.updatedAt = now;
    return state;
  }

  function getUpgradeCost(building) {
    const definition = BUILDING_DEFS[building.type];
    if (!definition || building.level >= definition.maxLevel) return null;
    const base = Object.keys(definition.cost).length ? definition.cost : { gold: 540, wood: 420 };
    const multiplier = 1.35 + building.level * 0.82;
    const cost = {};
    for (const [resource, amount] of Object.entries(base)) {
      cost[resource] = roundToTen(amount * multiplier);
    }
    if (building.type === "hall") {
      cost.gold = roundToTen(620 * multiplier);
      cost.wood = roundToTen(520 * multiplier);
    }
    return cost;
  }

  function getBuildCost(type) {
    return { ...(BUILDING_DEFS[type]?.cost || {}) };
  }

  function roundToTen(value) {
    return Math.max(10, Math.round(value / 10) * 10);
  }

  function canAfford(resources, cost) {
    return Object.entries(cost || {}).every(([resource, amount]) => (resources[resource] || 0) >= amount);
  }

  function spend(resources, cost) {
    if (!canAfford(resources, cost)) return false;
    for (const [resource, amount] of Object.entries(cost || {})) {
      resources[resource] = Math.max(0, (resources[resource] || 0) - amount);
    }
    return true;
  }

  function addResources(state, reward) {
    for (const [resource, amount] of Object.entries(reward || {})) {
      const cap = state.capacities[resource] ?? Number.MAX_SAFE_INTEGER;
      state.resources[resource] = clamp((state.resources[resource] || 0) + amount, 0, cap);
    }
    return state;
  }

  function collectBuilding(state, buildingId) {
    const building = state.buildings.find((item) => item.id === buildingId);
    const definition = BUILDING_DEFS[building?.type];
    if (!building || !definition?.resource || building.readyAt > Date.now()) return 0;

    const resource = definition.resource;
    const room = Math.max(0, state.capacities[resource] - state.resources[resource]);
    const collected = Math.min(room, Math.floor(building.stored || 0));
    if (collected <= 0) return 0;

    building.stored -= collected;
    state.resources[resource] += collected;
    const metric = resource === "gold" ? "goldCollected" : "woodCollected";
    state.metrics[metric] = (state.metrics[metric] || 0) + collected;
    return collected;
  }

  function getBusyBuilderCount(state, now = Date.now()) {
    return state.buildings.filter((building) => building.readyAt > now).length;
  }

  function getAvailableBuilders(state, now = Date.now()) {
    return Math.max(0, state.builders.total - getBusyBuilderCount(state, now));
  }

  function isOccupied(state, x, y, ignoreId = null) {
    return state.buildings.some(
      (building) => building.id !== ignoreId && building.x === x && building.y === y,
    );
  }

  function isBuildableTile(state, x, y) {
    if (x < 1 || y < 1 || x >= GRID_SIZE - 1 || y >= GRID_SIZE - 1) return false;
    return !isOccupied(state, x, y);
  }

  function countBuildingType(state, type) {
    return state.buildings.filter((building) => building.type === type).length;
  }

  function canBuildType(state, type) {
    const definition = BUILDING_DEFS[type];
    if (!definition || type === "hall") return false;
    if (state.player.level < (definition.unlockLevel || 1)) return false;
    return countBuildingType(state, type) < (definition.maxCount || 1);
  }

  function addExperience(state, amount) {
    state.player.xp += Math.max(0, amount || 0);
    let leveled = false;
    while (state.player.xp >= state.player.nextXp) {
      state.player.xp -= state.player.nextXp;
      state.player.level += 1;
      state.player.nextXp = Math.round(state.player.nextXp * 1.22);
      leveled = true;
    }
    return leveled;
  }

  function placeBuilding(state, type, x, y, now = Date.now()) {
    const definition = BUILDING_DEFS[type];
    if (!definition || !isBuildableTile(state, x, y)) return null;
    if (!canBuildType(state, type) || getAvailableBuilders(state, now) < 1) return null;
    if (!spend(state.resources, definition.cost)) return null;

    const building = {
      id: `${type}-${now}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      x,
      y,
      level: 1,
      stored: 0,
      lastTick: now,
      readyAt: now + definition.buildSeconds * 1000,
    };
    state.buildings.push(building);
    state.metrics.built += 1;
    addExperience(state, definition.xp);
    return building;
  }

  function upgradeBuilding(state, buildingId, now = Date.now()) {
    const building = state.buildings.find((item) => item.id === buildingId);
    if (!building || getAvailableBuilders(state, now) < 1) return null;
    const cost = getUpgradeCost(building);
    if (!cost || !spend(state.resources, cost)) return null;

    building.level += 1;
    building.readyAt = now + Math.min(24, 6 + building.level * 2) * 1000;
    building.lastTick = now;
    state.metrics.upgrades += 1;
    const definition = BUILDING_DEFS[building.type];
    addExperience(state, Math.round((definition?.xp || 100) * 0.75 * building.level));
    return building;
  }

  function formatNumber(value) {
    const number = Math.floor(Number(value) || 0);
    if (number >= 1000000) return `${(number / 1000000).toFixed(number >= 10000000 ? 0 : 1)}m`;
    if (number >= 10000) return `${(number / 1000).toFixed(number >= 100000 ? 0 : 1)}k`;
    return number.toLocaleString("en-US");
  }

  function formatDuration(milliseconds) {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  }

  function getQuestProgress(state, quest) {
    return clamp(Number(state.metrics[quest.metric]) || 0, 0, quest.target);
  }

  function claimQuest(state, questId) {
    const quest = QUEST_DEFS.find((item) => item.id === questId);
    if (!quest || state.questsClaimed.includes(questId)) return false;
    if (getQuestProgress(state, quest) < quest.target) return false;
    state.questsClaimed.push(questId);
    addResources(state, quest.reward);
    return true;
  }

  return Object.freeze({
    SAVE_VERSION,
    GRID_SIZE,
    BUILDING_DEFS,
    QUEST_DEFS,
    createInitialState,
    sanitizeState,
    clamp,
    levelMultiplier,
    getProductionPerMinute,
    getStorageCapacity,
    getHitPoints,
    getDamage,
    accrueProduction,
    getUpgradeCost,
    getBuildCost,
    canAfford,
    spend,
    addResources,
    collectBuilding,
    getBusyBuilderCount,
    getAvailableBuilders,
    isOccupied,
    isBuildableTile,
    countBuildingType,
    canBuildType,
    addExperience,
    placeBuilding,
    upgradeBuilding,
    formatNumber,
    formatDuration,
    getQuestProgress,
    claimQuest,
  });
});
