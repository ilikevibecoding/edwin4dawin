(function startHearthAndHavoc() {
  "use strict";

  const Core = window.GameCore;
  const {
    BUILDING_DEFS,
    QUEST_DEFS,
    GRID_SIZE,
    clamp,
    formatNumber,
    formatDuration,
  } = Core;

  const SAVE_KEY = "hearth-and-havoc-save-v1";
  const ONBOARDED_KEY = "hearth-and-havoc-onboarded";
  const canvas = document.querySelector("#world-canvas");
  const ctx = canvas.getContext("2d");
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

  let state = loadState();
  let selectedBuildingId = null;
  let placementType = null;
  let placementTile = null;
  let hoverTile = null;
  let frameTime = performance.now();
  let lastSave = 0;
  let audioContext = null;
  let raid = null;
  let raidTimerHandle = null;
  let ambientHandle = null;
  let pointer = {
    active: false,
    id: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    dragged: false,
  };

  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
  };

  const camera = {
    x: 0,
    y: 0,
    zoom: getDefaultZoom(),
  };

  const decorations = [
    { x: 1, y: 2, type: "pine", scale: 0.9 },
    { x: 2, y: 1, type: "bush", scale: 0.8 },
    { x: 10, y: 2, type: "pine", scale: 1.05 },
    { x: 11, y: 4, type: "rocks", scale: 0.8 },
    { x: 1, y: 9, type: "rocks", scale: 0.72 },
    { x: 2, y: 11, type: "pine", scale: 0.95 },
    { x: 9, y: 11, type: "bush", scale: 1 },
    { x: 11, y: 9, type: "pine", scale: 0.82 },
    { x: 5, y: 1, type: "flowers", scale: 0.9 },
    { x: 1, y: 6, type: "flowers", scale: 0.75 },
    { x: 6, y: 11, type: "rocks", scale: 0.68 },
  ];

  const refs = {
    gold: $("#gold-value"),
    wood: $("#wood-value"),
    gems: $("#gems-value"),
    goldFill: $("#gold-fill"),
    woodFill: $("#wood-fill"),
    builder: $("#builder-value"),
    xpFill: $("#xp-fill"),
    level: $("#level-label"),
    selection: $("#selection-panel"),
    selectionName: $("#selection-name"),
    selectionLevel: $("#selection-level"),
    selectionKicker: $("#selection-kicker"),
    selectionIcon: $("#selection-icon"),
    selectionStats: $("#selection-stats"),
    storedRow: $("#stored-row"),
    storedValue: $("#stored-value"),
    collect: $("#collect-button"),
    upgrade: $("#upgrade-button"),
    upgradeCost: $("#upgrade-cost"),
    shop: $("#shop-drawer"),
    shopItems: $("#shop-items"),
    quests: $("#quest-panel"),
    questList: $("#quest-list"),
    questBadge: $("#quest-badge"),
    placement: $("#placement-banner"),
    placementName: $("#placement-name"),
    placementConfirm: $("#placement-confirm"),
    toastStack: $("#toast-stack"),
    particleLayer: $("#particle-layer"),
    welcome: $("#welcome-modal"),
    settings: $("#settings-modal"),
    soundToggle: $("#sound-toggle"),
    particlesToggle: $("#particles-toggle"),
    raidModal: $("#raid-modal"),
    resultModal: $("#result-modal"),
  };

  initialize();

  function initialize() {
    resizeCanvas();
    bindEvents();
    renderShop();
    renderQuests();
    updateHUD();
    updateSelectionPanel();
    refs.soundToggle.checked = state.settings.sound;
    refs.particlesToggle.checked = state.settings.particles;

    if (localStorage.getItem(ONBOARDED_KEY) === "1") {
      refs.welcome.hidden = true;
    }

    ambientHandle = window.setInterval(spawnAmbientLeaf, 1500);
    window.setInterval(gameTick, 1000);
    requestAnimationFrame(renderWorld);
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      const restored = Core.sanitizeState(saved);
      Core.accrueProduction(restored);
      return restored;
    } catch (error) {
      console.warn("Could not restore village save:", error);
      return Core.createInitialState();
    }
  }

  function saveState(force = false) {
    const now = Date.now();
    if (!force && now - lastSave < 1800) return;
    state.updatedAt = now;
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    lastSave = now;
  }

  function gameTick() {
    const now = Date.now();
    Core.accrueProduction(state, now);

    let completed = false;
    for (const building of state.buildings) {
      if (building.readyAt && building.readyAt <= now) {
        building.readyAt = 0;
        building.lastTick = now;
        completed = true;
        toast(`${BUILDING_DEFS[building.type].name} is ready!`, "success");
        playSound("complete");
      }
    }

    updateHUD();
    updateSelectionPanel();
    if (completed) renderShop();
    renderQuests();
    saveState();
  }

  function bindEvents() {
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("beforeunload", () => saveState(true));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) saveState(true);
      else {
        Core.accrueProduction(state);
        updateHUD();
      }
    });

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerCancel);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("dblclick", onDoubleClick);

    $("#play-button").addEventListener("click", enterVillage);
    $("#build-button").addEventListener("click", openShop);
    $("#shop-close").addEventListener("click", closeShop);
    $("#selection-close").addEventListener("click", clearSelection);
    $("#quest-button").addEventListener("click", toggleQuests);
    $("#quest-close").addEventListener("click", closeQuests);
    $("#focus-button").addEventListener("click", resetCamera);
    $("#shield-button").addEventListener("click", () => {
      toast("Your village guard is alert and mostly awake.", "success");
      playSound("click");
    });

    $("#placement-cancel").addEventListener("click", cancelPlacement);
    refs.placementConfirm.addEventListener("click", confirmPlacement);
    refs.collect.addEventListener("click", collectSelected);
    refs.upgrade.addEventListener("click", upgradeSelected);

    $$(".category-tabs button").forEach((button) => {
      button.addEventListener("click", () => {
        $$(".category-tabs button").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        renderShop(button.dataset.category);
        playSound("soft");
      });
    });

    $("#settings-button").addEventListener("click", openSettings);
    $("#settings-close").addEventListener("click", closeSettings);
    refs.soundToggle.addEventListener("change", () => {
      state.settings.sound = refs.soundToggle.checked;
      saveState(true);
      if (state.settings.sound) playSound("complete");
    });
    refs.particlesToggle.addEventListener("change", () => {
      state.settings.particles = refs.particlesToggle.checked;
      saveState(true);
    });
    $("#reset-button").addEventListener("click", handleReset);

    $("#raid-button").addEventListener("click", openRaid);
    $("#raid-close").addEventListener("click", retreatRaid);
    $("#retreat-button").addEventListener("click", retreatRaid);
    $$(".troop-card").forEach((button) => {
      button.addEventListener("click", () => selectTroop(button.dataset.troop));
    });
    $$(".enemy-target").forEach((target) => {
      target.addEventListener("click", () => deployTroop(target.dataset.target));
    });
    $("#result-button").addEventListener("click", closeResult);
  }

  function enterVillage() {
    localStorage.setItem(ONBOARDED_KEY, "1");
    refs.welcome.classList.add("closing");
    playSound("complete");
    window.setTimeout(() => {
      refs.welcome.hidden = true;
      refs.welcome.classList.remove("closing");
      toast("Welcome home, Captain Oakshield!", "success");
    }, 350);
  }

  function resizeCanvas() {
    viewport.width = window.innerWidth;
    viewport.height = window.innerHeight;
    viewport.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewport.width * viewport.dpr);
    canvas.height = Math.floor(viewport.height * viewport.dpr);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    camera.zoom = clamp(camera.zoom || getDefaultZoom(), 0.52, 1.25);
  }

  function getDefaultZoom() {
    const widthFit = (window.innerWidth - 90) / (GRID_SIZE * 96);
    const heightFit = (window.innerHeight - 180) / (GRID_SIZE * 48);
    return clamp(Math.min(widthFit, heightFit, 0.98), window.innerWidth < 720 ? 0.56 : 0.66, 0.98);
  }

  function getMetrics() {
    const tileWidth = 96 * camera.zoom;
    const tileHeight = 48 * camera.zoom;
    return {
      tileWidth,
      tileHeight,
      originX: viewport.width / 2 + camera.x,
      originY: Math.max(95, viewport.height * 0.145) + camera.y,
    };
  }

  function gridToScreen(x, y) {
    const metrics = getMetrics();
    return {
      x: metrics.originX + (x - y) * metrics.tileWidth * 0.5,
      y: metrics.originY + (x + y) * metrics.tileHeight * 0.5,
    };
  }

  function screenToGrid(screenX, screenY) {
    const metrics = getMetrics();
    const diagonalX = (screenX - metrics.originX) / (metrics.tileWidth * 0.5);
    const diagonalY = (screenY - metrics.originY) / (metrics.tileHeight * 0.5);
    return {
      x: Math.round((diagonalY + diagonalX) * 0.5),
      y: Math.round((diagonalY - diagonalX) * 0.5),
    };
  }

  function onPointerDown(event) {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    pointer = {
      active: true,
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      dragged: false,
    };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add("dragging");
    $("#view-hint").classList.add("dismissed");
  }

  function onPointerMove(event) {
    hoverTile = screenToGrid(event.clientX, event.clientY);
    if (!pointer.active || event.pointerId !== pointer.id) return;

    const totalDistance = Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY);
    if (totalDistance > 5) pointer.dragged = true;
    if (pointer.dragged && !placementType) {
      camera.x += event.clientX - pointer.lastX;
      camera.y += event.clientY - pointer.lastY;
      camera.x = clamp(camera.x, -viewport.width * 0.45, viewport.width * 0.45);
      camera.y = clamp(camera.y, -viewport.height * 0.38, viewport.height * 0.32);
    }
    pointer.lastX = event.clientX;
    pointer.lastY = event.clientY;
  }

  function onPointerUp(event) {
    if (!pointer.active || event.pointerId !== pointer.id) return;
    canvas.classList.remove("dragging");
    if (!pointer.dragged) handleWorldClick(event.clientX, event.clientY);
    pointer.active = false;
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch (_) {
      // The browser may already have released capture.
    }
  }

  function onPointerCancel() {
    pointer.active = false;
    canvas.classList.remove("dragging");
  }

  function onWheel(event) {
    event.preventDefault();
    const before = screenToGrid(event.clientX, event.clientY);
    const previousZoom = camera.zoom;
    camera.zoom = clamp(camera.zoom * (event.deltaY > 0 ? 0.9 : 1.1), 0.52, 1.25);
    if (camera.zoom === previousZoom) return;
    const afterPoint = gridToScreen(before.x, before.y);
    camera.x += event.clientX - afterPoint.x;
    camera.y += event.clientY - afterPoint.y;
    $("#view-hint").classList.add("dismissed");
  }

  function onDoubleClick(event) {
    if (placementType) return;
    const tile = screenToGrid(event.clientX, event.clientY);
    const building = state.buildings.find((item) => item.x === tile.x && item.y === tile.y);
    if (building && BUILDING_DEFS[building.type].resource) {
      selectedBuildingId = building.id;
      collectSelected();
    }
  }

  function handleWorldClick(screenX, screenY) {
    const tile = screenToGrid(screenX, screenY);
    if (tile.x < 0 || tile.y < 0 || tile.x >= GRID_SIZE || tile.y >= GRID_SIZE) {
      if (!placementType) clearSelection();
      return;
    }

    if (placementType) {
      placementTile = tile;
      const valid = Core.isBuildableTile(state, tile.x, tile.y);
      refs.placementConfirm.disabled = !valid;
      if (!valid) {
        toast("That patch is already spoken for.", "warning");
        playSound("error");
      } else {
        playSound("soft");
      }
      return;
    }

    const building = state.buildings.find((item) => item.x === tile.x && item.y === tile.y);
    if (building) {
      selectBuilding(building.id);
    } else {
      clearSelection();
    }
  }

  function resetCamera() {
    camera.x = 0;
    camera.y = 0;
    camera.zoom = getDefaultZoom();
    playSound("soft");
  }

  function renderWorld(now) {
    frameTime = now;
    const { width, height, dpr } = viewport;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    drawWater(now);
    drawIslandBase();
    drawTiles(now);
    drawVillage(now);

    requestAnimationFrame(renderWorld);
  }

  function drawWater(now) {
    const t = now * 0.00025;
    ctx.save();
    ctx.globalAlpha = 0.17;
    ctx.strokeStyle = "#e8ffff";
    ctx.lineWidth = 2;
    for (let row = 0; row < 6; row += 1) {
      const y = viewport.height * (0.44 + row * 0.11);
      ctx.beginPath();
      for (let x = -60; x <= viewport.width + 60; x += 30) {
        const waveY = y + Math.sin(x * 0.024 + t * 9 + row) * 5;
        if (x === -60) ctx.moveTo(x, waveY);
        else ctx.lineTo(x, waveY);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawIslandBase() {
    const top = gridToScreen(0, 0);
    const right = gridToScreen(GRID_SIZE - 1, 0);
    const bottom = gridToScreen(GRID_SIZE - 1, GRID_SIZE - 1);
    const left = gridToScreen(0, GRID_SIZE - 1);
    const { tileWidth, tileHeight } = getMetrics();

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#214f5b";
    ctx.beginPath();
    ctx.ellipse(
      (left.x + right.x) / 2,
      bottom.y + tileHeight * 0.85,
      (right.x - left.x) * 0.49,
      tileHeight * 1.55,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();

    const outer = [
      [top.x, top.y - tileHeight * 0.5],
      [right.x + tileWidth * 0.5, right.y],
      [bottom.x, bottom.y + tileHeight * 0.5],
      [left.x - tileWidth * 0.5, left.y],
    ];

    ctx.fillStyle = "#3b715b";
    ctx.beginPath();
    ctx.moveTo(outer[0][0], outer[0][1] + tileHeight * 0.9);
    for (let index = 1; index < outer.length; index += 1) {
      ctx.lineTo(outer[index][0], outer[index][1] + tileHeight * 0.9);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#568d55";
    ctx.beginPath();
    ctx.moveTo(...outer[0]);
    outer.slice(1).forEach((point) => ctx.lineTo(...point));
    ctx.closePath();
    ctx.fill();
  }

  function drawTiles(now) {
    const { tileWidth, tileHeight } = getMetrics();
    for (let sum = 0; sum <= (GRID_SIZE - 1) * 2; sum += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        const y = sum - x;
        if (y < 0 || y >= GRID_SIZE) continue;
        const point = gridToScreen(x, y);
        const variation = ((x * 7 + y * 11) % 5) * 1.7;
        const isHovered = hoverTile && hoverTile.x === x && hoverTile.y === y;
        const isCandidate = placementTile && placementTile.x === x && placementTile.y === y;
        let fill = `hsl(${99 + variation}, 39%, ${54 + ((x + y) % 2) * 2}%)`;

        if (placementType && isHovered) {
          fill = Core.isBuildableTile(state, x, y) ? "#7ed65d" : "#e47259";
        }
        if (placementType && isCandidate) {
          fill = Core.isBuildableTile(state, x, y) ? "#9be368" : "#e47259";
        }

        drawDiamond(point.x, point.y, tileWidth, tileHeight, fill);

        if ((x * 3 + y * 5) % 17 === 0) {
          ctx.save();
          ctx.globalAlpha = 0.22;
          ctx.fillStyle = "#e8f1a8";
          const sway = Math.sin(now * 0.002 + x + y) * 1.5;
          ctx.beginPath();
          ctx.ellipse(point.x - 10 * camera.zoom + sway, point.y - 2, 2 * camera.zoom, 5 * camera.zoom, -0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }
  }

  function drawDiamond(x, y, width, height, fill) {
    ctx.beginPath();
    ctx.moveTo(x, y - height * 0.5);
    ctx.lineTo(x + width * 0.5, y);
    ctx.lineTo(x, y + height * 0.5);
    ctx.lineTo(x - width * 0.5, y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = "rgba(61, 113, 72, .12)";
    ctx.lineWidth = Math.max(0.6, camera.zoom);
    ctx.stroke();
  }

  function drawVillage(now) {
    const drawables = [
      ...decorations.map((item) => ({ ...item, kind: "decoration" })),
      ...state.buildings.map((item) => ({ ...item, kind: "building" })),
    ].sort((a, b) => a.x + a.y - (b.x + b.y) || a.x - b.x);

    for (const item of drawables) {
      if (item.kind === "decoration") drawDecoration(item, now);
      else drawBuilding(item, now);
    }

    if (placementType && hoverTile && Core.isBuildableTile(state, hoverTile.x, hoverTile.y)) {
      drawBuilding(
        {
          id: "placement-ghost",
          type: placementType,
          x: hoverTile.x,
          y: hoverTile.y,
          level: 1,
          stored: 0,
          readyAt: 0,
        },
        now,
        true,
      );
    }
  }

  function drawDecoration(item, now) {
    const point = gridToScreen(item.x, item.y);
    const scale = camera.zoom * item.scale;
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.scale(scale, scale);

    if (item.type === "pine") {
      ctx.fillStyle = "rgba(41, 72, 51, .22)";
      ctx.beginPath();
      ctx.ellipse(7, 4, 30, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#765840";
      ctx.fillRect(-4, -35, 8, 39);
      const sway = Math.sin(now * 0.0013 + item.x) * 1.2;
      ctx.translate(sway, 0);
      polygon([[-1, -89], [27, -39], [12, -42], [35, -14], [-35, -14], [-12, -42], [-28, -39]], "#3b8154");
      polygon([[-1, -76], [20, -39], [-20, -39]], "#5aa15b");
    } else if (item.type === "bush") {
      ctx.fillStyle = "rgba(41, 72, 51, .18)";
      ctx.beginPath();
      ctx.ellipse(0, 5, 28, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      circle(-15, -11, 17, "#4a9655");
      circle(7, -16, 22, "#58a95a");
      circle(22, -8, 14, "#3f874e");
      circle(1, -23, 11, "#70b763");
    } else if (item.type === "rocks") {
      polygon([[-28, 2], [-20, -18], [-7, -25], [5, -8], [4, 4]], "#708279");
      polygon([[-2, 4], [3, -18], [19, -28], [28, -5], [21, 5]], "#84928a");
      polygon([[4, -17], [19, -28], [13, -12]], "#a5aea4");
    } else {
      for (let index = 0; index < 5; index += 1) {
        const angle = index * 1.7;
        circle(Math.cos(angle) * 18, -3 + Math.sin(angle) * 9, 3.4, index % 2 ? "#ffe48a" : "#f28c78");
      }
    }
    ctx.restore();
  }

  function drawBuilding(building, now, ghost = false) {
    const point = gridToScreen(building.x, building.y);
    const selected = building.id === selectedBuildingId;
    const scale = camera.zoom;
    const definition = BUILDING_DEFS[building.type];

    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.scale(scale, scale);
    if (ghost) ctx.globalAlpha = 0.58;

    if (selected || ghost) {
      const pulse = selected ? 1 + Math.sin(now * 0.004) * 0.05 : 1;
      ctx.save();
      ctx.scale(pulse, pulse);
      ctx.strokeStyle = ghost ? "#eafda4" : "#fff3a1";
      ctx.lineWidth = 4;
      ctx.shadowColor = ghost ? "#80e16b" : "#ffd75e";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(0, -32);
      ctx.lineTo(61, 0);
      ctx.lineTo(0, 32);
      ctx.lineTo(-61, 0);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = "rgba(38, 62, 48, .24)";
    ctx.beginPath();
    ctx.ellipse(5, 6, 50, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    const underConstruction = building.readyAt > Date.now();
    if (underConstruction) ctx.globalAlpha *= 0.72;

    if (building.type === "hall") drawHall(building, now);
    else if (building.type === "goldMine") drawGoldMine(building, now);
    else if (building.type === "lumberMill") drawLumberMill(building, now);
    else if (building.type === "barracks") drawBarracks(building, now);
    else if (building.type === "cannon") drawCannon(building, now);
    else if (building.type === "beacon") drawBeacon(building, now);

    if (!ghost) {
      drawLevelBadge(building);
      if (underConstruction) drawConstruction(building, now);
      else if (definition.resource && building.stored >= 20) drawCollectBubble(building, now);
    }
    ctx.restore();
  }

  function drawHall(building, now) {
    polygon([[-48, -10], [5, -35], [48, -12], [0, 18]], "#d5b784");
    polygon([[-48, -10], [0, 18], [0, 48], [-48, 17]], "#c5a172");
    polygon([[0, 18], [48, -12], [48, 18], [0, 48]], "#aa815e");
    polygon([[-56, -19], [3, -54], [55, -20], [0, 12]], "#d95840");
    polygon([[-56, -19], [0, 12], [-7, 23], [-64, -11]], "#b94238");
    polygon([[0, 12], [55, -20], [63, -12], [7, 23]], "#c44d3b");
    polygon([[-18, -43], [4, -57], [24, -45], [2, -32]], "#ef7850");
    polygon([[-10, 3], [2, -4], [13, 2], [1, 9]], "#5b7480");
    polygon([[-10, 3], [1, 9], [1, 37], [-10, 30]], "#485e69");
    polygon([[1, 9], [13, 2], [13, 29], [1, 37]], "#3b505b");
    circle(-27, 7, 5, "#f8d56d");
    circle(29, 5, 5, "#f8d56d");

    ctx.fillStyle = "#6f5244";
    ctx.fillRect(1, -82, 3, 31);
    const wave = Math.sin(now * 0.004) * 3;
    polygon([[4, -80], [31 + wave, -73], [23 + wave, -60], [4, -65]], "#4c87a3");
  }

  function drawGoldMine(building, now) {
    polygon([[-49, -2], [-10, -27], [40, -14], [47, 10], [1, 31], [-44, 16]], "#70665e");
    polygon([[-44, 0], [-12, -25], [1, -15], [-19, 10], [-42, 17]], "#8b7a67");
    ctx.fillStyle = "#293642";
    ctx.beginPath();
    ctx.ellipse(0, -1, 24, 27, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#bd8a35";
    ctx.lineWidth = 7;
    ctx.strokeStyle = "#c89b49";
    ctx.beginPath();
    ctx.arc(0, -1, 28, 0, Math.PI * 2);
    ctx.stroke();
    circle(-4, -3, 10, "#e9b636");
    polygon([[-10, -7], [-3, -16], [8, -8], [6, 4], [-5, 8]], "#ffd85f");
    ctx.strokeStyle = "#57473a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-32, -20);
    ctx.lineTo(-32, -57);
    ctx.lineTo(22, -39);
    ctx.lineTo(22, -15);
    ctx.stroke();
    ctx.fillStyle = "#775f44";
    ctx.fillRect(-38, -60, 68, 7);
    const sparkle = 0.5 + Math.sin(now * 0.006 + building.x) * 0.5;
    ctx.globalAlpha *= 0.5 + sparkle * 0.5;
    circle(28, -37, 3 + sparkle * 2, "#fff2a8");
  }

  function drawLumberMill(building, now) {
    polygon([[-47, -5], [0, -31], [45, -7], [0, 20]], "#e0c190");
    polygon([[-47, -5], [0, 20], [0, 43], [-47, 17]], "#be9067");
    polygon([[0, 20], [45, -7], [45, 16], [0, 43]], "#9d7258");
    polygon([[-53, -15], [0, -48], [52, -17], [0, 13]], "#c85c43");
    polygon([[-53, -15], [0, 13], [-7, 21], [-60, -9]], "#a94739");
    ctx.save();
    ctx.translate(42, 4);
    ctx.rotate(now * 0.0012);
    ctx.strokeStyle = "#65716d";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.stroke();
    for (let index = 0; index < 8; index += 1) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -23);
      ctx.stroke();
    }
    circle(0, 0, 6, "#d5be87");
    ctx.restore();
    for (let index = 0; index < 3; index += 1) {
      ctx.fillStyle = index % 2 ? "#98663f" : "#ad7544";
      ctx.fillRect(-43 + index * 12, 23 - index * 2, 35, 8);
      circle(-43 + index * 12, 27 - index * 2, 5, "#724e38");
    }
  }

  function drawBarracks(building, now) {
    polygon([[-55, 5], [0, -29], [54, 4], [0, 34]], "#d7ba83");
    polygon([[-53, -3], [0, -54], [53, -3], [0, 17]], "#567fa2");
    polygon([[-53, -3], [0, 17], [-7, 28], [-62, 5]], "#416986");
    polygon([[0, 17], [53, -3], [61, 6], [7, 28]], "#365b79");
    polygon([[-9, 6], [0, 0], [10, 6], [1, 31], [-9, 25]], "#344c5b");
    ctx.strokeStyle = "#e7d29b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -53);
    ctx.lineTo(0, 10);
    ctx.moveTo(-52, -2);
    ctx.lineTo(0, 17);
    ctx.lineTo(53, -2);
    ctx.stroke();
    ctx.fillStyle = "#735142";
    ctx.fillRect(-44, -46, 3, 40);
    const wave = Math.sin(now * 0.004 + 1) * 2;
    polygon([[-41, -44], [-16 + wave, -37], [-21 + wave, -25], [-41, -30]], "#e0a73d");
  }

  function drawCannon(building, now) {
    polygon([[-42, 3], [0, -20], [42, 3], [0, 26]], "#7b807b");
    polygon([[-42, 3], [0, 26], [0, 38], [-42, 15]], "#5d6667");
    polygon([[0, 26], [42, 3], [42, 15], [0, 38]], "#4d585d");
    circle(0, -3, 25, "#3f4f5b");
    circle(0, -3, 17, "#647383");
    ctx.save();
    ctx.translate(0, -9);
    ctx.rotate(-0.32 + Math.sin(now * 0.001 + building.x) * 0.04);
    ctx.fillStyle = "#2e3d49";
    ctx.fillRect(-7, -8, 55, 16);
    ctx.fillStyle = "#536270";
    ctx.fillRect(36, -11, 17, 22);
    ctx.restore();
    circle(-22, 15, 11, "#34434d");
    circle(22, 15, 11, "#34434d");
    circle(-22, 15, 5, "#8b7358");
    circle(22, 15, 5, "#8b7358");
  }

  function drawBeacon(building, now) {
    polygon([[-45, 3], [0, -22], [45, 3], [0, 29]], "#58677a");
    polygon([[-45, 3], [0, 29], [0, 42], [-45, 16]], "#445264");
    polygon([[0, 29], [45, 3], [45, 16], [0, 42]], "#354354");
    const pulse = 1 + Math.sin(now * 0.003) * 0.07;
    ctx.save();
    ctx.scale(pulse, pulse);
    ctx.shadowColor = "#9cf7ee";
    ctx.shadowBlur = 24;
    polygon([[0, -76], [23, -27], [9, 8], [0, 18], [-11, 5], [-22, -29]], "#5ddbd2");
    polygon([[0, -76], [23, -27], [0, -12]], "#a9fff3");
    polygon([[0, -76], [0, -12], [-22, -29]], "#72a9e1");
    ctx.restore();
    ctx.strokeStyle = "rgba(200, 255, 249, .6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -30, 34 + Math.sin(now * 0.004) * 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawLevelBadge(building) {
    ctx.save();
    ctx.translate(-42, -47);
    ctx.fillStyle = "#31495c";
    ctx.strokeStyle = "rgba(255,255,255,.86)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "900 9px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(building.level, 0, 0.5);
    ctx.restore();
  }

  function drawConstruction(building, now) {
    ctx.save();
    ctx.strokeStyle = "#8a6946";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-52, 17);
    ctx.lineTo(-48, -45);
    ctx.moveTo(52, 17);
    ctx.lineTo(48, -45);
    ctx.moveTo(-55, -18);
    ctx.lineTo(55, -18);
    ctx.stroke();
    ctx.strokeStyle = "#d6b66c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-48, -40);
    ctx.lineTo(50, 10);
    ctx.moveTo(48, -40);
    ctx.lineTo(-50, 10);
    ctx.stroke();

    const definition = BUILDING_DEFS[building.type];
    const total = Math.max(1, definition.buildSeconds || 10) * 1000;
    const progress = clamp(1 - (building.readyAt - Date.now()) / total, 0.03, 1);
    ctx.fillStyle = "rgba(30, 49, 61, .86)";
    roundedRect(-43, -70, 86, 12, 6);
    ctx.fill();
    ctx.fillStyle = "#9ad954";
    roundedRect(-40, -67, 80 * progress, 6, 3);
    ctx.fill();
    ctx.restore();
  }

  function drawCollectBubble(building, now) {
    const definition = BUILDING_DEFS[building.type];
    const bob = Math.sin(now * 0.004 + building.x) * 3;
    ctx.save();
    ctx.translate(31, -78 + bob);
    ctx.fillStyle = "#fff8e5";
    ctx.strokeStyle = "rgba(49, 69, 78, .16)";
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(26, 44, 53, .2)";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    polygon([[-5, 17], [5, 17], [0, 27]], "#fff8e5");
    ctx.shadowBlur = 0;
    ctx.fillStyle = definition.resource === "gold" ? "#efb32f" : "#cf703b";
    if (definition.resource === "gold") {
      circle(0, 0, 11, ctx.fillStyle);
      ctx.strokeStyle = "#fff1a4";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.save();
      ctx.rotate(-0.45);
      roundedRect(-7, -12, 14, 24, 4);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function polygon(points, fill, stroke = null) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let index = 1; index < points.length; index += 1) ctx.lineTo(points[index][0], points[index][1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }

  function circle(x, y, radius, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function roundedRect(x, y, width, height, radius) {
    const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function updateHUD() {
    refs.gold.textContent = formatNumber(state.resources.gold);
    refs.wood.textContent = formatNumber(state.resources.wood);
    refs.gems.textContent = formatNumber(state.resources.gems);
    refs.goldFill.style.width = `${(state.resources.gold / state.capacities.gold) * 100}%`;
    refs.woodFill.style.width = `${(state.resources.wood / state.capacities.wood) * 100}%`;
    refs.builder.textContent = `${Core.getAvailableBuilders(state)}/${state.builders.total}`;
    refs.xpFill.style.width = `${(state.player.xp / state.player.nextXp) * 100}%`;
    refs.level.textContent = state.player.level;
  }

  function selectBuilding(buildingId) {
    selectedBuildingId = buildingId;
    closeShop();
    closeQuests();
    updateSelectionPanel();
    refs.selection.classList.add("open");
    playSound("soft");
  }

  function clearSelection() {
    selectedBuildingId = null;
    refs.selection.classList.remove("open");
  }

  function updateSelectionPanel() {
    if (!selectedBuildingId) return;
    const building = state.buildings.find((item) => item.id === selectedBuildingId);
    if (!building) {
      clearSelection();
      return;
    }
    const definition = BUILDING_DEFS[building.type];
    const now = Date.now();
    const underConstruction = building.readyAt > now;
    refs.selectionName.textContent = definition.name;
    refs.selectionLevel.textContent = underConstruction
      ? `Ready in ${formatDuration(building.readyAt - now)}`
      : `Level ${building.level}`;
    refs.selectionKicker.textContent = underConstruction ? "TINKERS AT WORK" : definition.category.toUpperCase();
    refs.selectionIcon.style.setProperty("--medallion", definition.color);

    const stats = [
      ["Durability", Core.getHitPoints(building).toLocaleString("en-US")],
    ];
    if (definition.production) {
      stats.push(["Per minute", `${Core.getProductionPerMinute(building)}`]);
      stats.push(["Storage", Core.getStorageCapacity(building).toLocaleString("en-US")]);
    }
    if (definition.damage) stats.push(["Power", `${Core.getDamage(building)}`]);
    if (!definition.production && !definition.damage) stats.push(["Crew spirit", `${82 + building.level * 3}%`]);
    refs.selectionStats.innerHTML = stats
      .map(([label, value]) => `<div class="stat-tile"><span>${label}</span><b>${value}</b></div>`)
      .join("");

    if (definition.resource) {
      refs.storedRow.hidden = false;
      refs.storedValue.textContent = `${formatNumber(building.stored)} ${definition.resource}`;
      refs.collect.hidden = false;
      refs.collect.disabled = underConstruction || Math.floor(building.stored) < 1;
    } else {
      refs.storedRow.hidden = true;
      refs.collect.hidden = true;
    }

    const upgradeCost = Core.getUpgradeCost(building);
    if (!upgradeCost) {
      refs.upgrade.disabled = true;
      refs.upgrade.querySelector("span").textContent = "Max level";
      refs.upgradeCost.textContent = "";
    } else {
      refs.upgrade.querySelector("span").textContent = "Upgrade";
      refs.upgradeCost.textContent = costToText(upgradeCost);
      refs.upgrade.disabled =
        underConstruction ||
        Core.getAvailableBuilders(state) < 1 ||
        !Core.canAfford(state.resources, upgradeCost);
    }
  }

  function collectSelected() {
    if (!selectedBuildingId) return;
    Core.accrueProduction(state);
    const building = state.buildings.find((item) => item.id === selectedBuildingId);
    const resource = BUILDING_DEFS[building?.type]?.resource;
    const amount = Core.collectBuilding(state, selectedBuildingId);
    if (amount <= 0) {
      toast("Nothing ready to collect just yet.", "warning");
      playSound("error");
      return;
    }
    updateHUD();
    updateSelectionPanel();
    renderQuests();
    saveState(true);
    burstFromElement(refs.collect, resource === "gold" ? "#f4b72d" : "#d5773d");
    toast(`Collected ${formatNumber(amount)} ${resource}!`, "success");
    playSound("coin");
  }

  function upgradeSelected() {
    if (!selectedBuildingId) return;
    const building = state.buildings.find((item) => item.id === selectedBuildingId);
    const cost = Core.getUpgradeCost(building);
    if (!cost) return;
    if (Core.getAvailableBuilders(state) < 1) {
      toast("Your tinker is already busy.", "warning");
      playSound("error");
      return;
    }
    if (!Core.canAfford(state.resources, cost)) {
      toast(`You need ${missingResourceText(cost)}.`, "warning");
      playSound("error");
      return;
    }
    const upgraded = Core.upgradeBuilding(state, selectedBuildingId);
    if (!upgraded) return;
    updateHUD();
    updateSelectionPanel();
    renderQuests();
    renderShop();
    saveState(true);
    toast(`${BUILDING_DEFS[upgraded.type].name} is being improved.`, "success");
    playSound("build");
  }

  function openShop() {
    clearSelection();
    closeQuests();
    refs.shop.classList.add("open");
    renderShop($(".category-tabs button.active")?.dataset.category || "all");
    playSound("click");
  }

  function closeShop() {
    refs.shop.classList.remove("open");
  }

  function renderShop(category = "all") {
    const entries = Object.entries(BUILDING_DEFS).filter(
      ([type, definition]) =>
        type !== "hall" && (category === "all" || definition.category === category),
    );
    refs.shopItems.innerHTML = entries
      .map(([type, definition]) => {
        const unlocked = state.player.level >= definition.unlockLevel;
        const atLimit = Core.countBuildingType(state, type) >= definition.maxCount;
        const costResource = Object.keys(definition.cost)[0] || "gold";
        const cost = costToText(definition.cost);
        return `
          <button class="shop-card ${!unlocked || atLimit ? "locked" : ""}" data-building="${type}">
            <div class="shop-preview ${type === "goldMine" ? "mine" : type === "lumberMill" ? "mill" : type}"></div>
            <h3>${definition.name}</h3>
            <p>${definition.description}</p>
            <span class="shop-cost ${costResource === "wood" ? "wood" : ""}">
              <svg><use href="#icon-${costResource === "wood" ? "wood" : "coin"}"></use></svg>${cost}
            </span>
            ${!unlocked ? `<span class="shop-lock">Level ${definition.unlockLevel}</span>` : ""}
            ${unlocked && atLimit ? `<span class="shop-lock">Limit reached</span>` : ""}
          </button>`;
      })
      .join("");

    $$(".shop-card", refs.shopItems).forEach((card) => {
      card.addEventListener("click", () => beginPlacement(card.dataset.building));
    });
  }

  function beginPlacement(type) {
    const definition = BUILDING_DEFS[type];
    if (!Core.canBuildType(state, type)) {
      const locked = state.player.level < definition.unlockLevel;
      toast(locked ? `Unlocks at level ${definition.unlockLevel}.` : "You have reached this building's limit.", "warning");
      playSound("error");
      return;
    }
    if (Core.getAvailableBuilders(state) < 1) {
      toast("Your tinker is already busy.", "warning");
      playSound("error");
      return;
    }
    if (!Core.canAfford(state.resources, definition.cost)) {
      toast(`You need ${missingResourceText(definition.cost)}.`, "warning");
      playSound("error");
      return;
    }

    placementType = type;
    placementTile = findOpenTileNearHall();
    hoverTile = placementTile;
    refs.placementName.textContent = definition.name;
    refs.placementConfirm.disabled = !placementTile;
    refs.placement.classList.add("open");
    refs.shop.classList.remove("open");
    $(".bottom-nav").style.opacity = "0";
    $(".bottom-nav").style.pointerEvents = "none";
    canvas.classList.add("placing");
    toast("Choose an open patch of grass.", "success");
    playSound("click");
  }

  function findOpenTileNearHall() {
    const hall = state.buildings.find((building) => building.type === "hall");
    for (let radius = 1; radius < GRID_SIZE; radius += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        for (const dy of [-radius, radius]) {
          const x = hall.x + dx;
          const y = hall.y + dy;
          if (Core.isBuildableTile(state, x, y)) return { x, y };
        }
      }
      for (let dy = -radius + 1; dy < radius; dy += 1) {
        for (const dx of [-radius, radius]) {
          const x = hall.x + dx;
          const y = hall.y + dy;
          if (Core.isBuildableTile(state, x, y)) return { x, y };
        }
      }
    }
    return null;
  }

  function cancelPlacement() {
    placementType = null;
    placementTile = null;
    refs.placement.classList.remove("open");
    $(".bottom-nav").style.opacity = "";
    $(".bottom-nav").style.pointerEvents = "";
    canvas.classList.remove("placing");
    playSound("soft");
  }

  function confirmPlacement() {
    if (!placementType || !placementTile) return;
    const definition = BUILDING_DEFS[placementType];
    if (!Core.isBuildableTile(state, placementTile.x, placementTile.y)) {
      refs.placementConfirm.disabled = true;
      return;
    }
    const building = Core.placeBuilding(
      state,
      placementType,
      placementTile.x,
      placementTile.y,
    );
    if (!building) {
      toast("The tinker could not start that build.", "warning");
      playSound("error");
      return;
    }
    const name = definition.name;
    cancelPlacement();
    selectedBuildingId = building.id;
    refs.selection.classList.add("open");
    updateHUD();
    updateSelectionPanel();
    renderQuests();
    renderShop();
    saveState(true);
    toast(`${name} construction started!`, "success");
    burstAt(viewport.width / 2, viewport.height / 2, "#f2cf64", 14);
    playSound("build");
  }

  function toggleQuests() {
    if (refs.quests.classList.contains("open")) closeQuests();
    else {
      clearSelection();
      closeShop();
      refs.quests.classList.add("open");
      renderQuests();
      playSound("click");
    }
  }

  function closeQuests() {
    refs.quests.classList.remove("open");
  }

  function renderQuests() {
    const unclaimed = QUEST_DEFS.filter((quest) => !state.questsClaimed.includes(quest.id)).length;
    refs.questBadge.textContent = unclaimed;
    refs.questBadge.hidden = unclaimed === 0;
    refs.questList.innerHTML = QUEST_DEFS.map((quest) => {
      const progress = Core.getQuestProgress(state, quest);
      const complete = progress >= quest.target;
      const claimed = state.questsClaimed.includes(quest.id);
      return `
        <article class="quest-item ${complete && !claimed ? "claimable" : ""} ${claimed ? "claimed" : ""}" data-quest="${quest.id}">
          <span class="quest-art">${claimed ? "✓" : quest.icon}</span>
          <h3>${quest.title}</h3>
          <p>${claimed ? "Reward claimed" : quest.description}</p>
          <span class="quest-reward">${rewardToText(quest.reward)}</span>
          <div class="quest-progress"><i style="width:${(progress / quest.target) * 100}%"></i></div>
        </article>`;
    }).join("");

    $$(".quest-item.claimable", refs.questList).forEach((item) => {
      item.addEventListener("click", () => {
        const quest = QUEST_DEFS.find((entry) => entry.id === item.dataset.quest);
        if (!Core.claimQuest(state, item.dataset.quest)) return;
        updateHUD();
        renderQuests();
        renderShop();
        saveState(true);
        burstFromElement(item, "#a7dc55");
        toast(`Quest complete: ${rewardToText(quest.reward)}!`, "success");
        playSound("complete");
      });
    });
  }

  function costToText(cost) {
    return Object.entries(cost)
      .map(([resource, amount]) => `${formatNumber(amount)} ${resource === "gold" ? "gold" : "timber"}`)
      .join(" · ");
  }

  function rewardToText(reward) {
    return Object.entries(reward)
      .map(([resource, amount]) => `+${amount} ${resource === "wood" ? "timber" : resource}`)
      .join(" · ");
  }

  function missingResourceText(cost) {
    return Object.entries(cost)
      .filter(([resource, amount]) => state.resources[resource] < amount)
      .map(([resource, amount]) => `${formatNumber(amount - state.resources[resource])} more ${resource === "wood" ? "timber" : resource}`)
      .join(" and ");
  }

  function openSettings() {
    refs.settings.hidden = false;
    playSound("click");
  }

  function closeSettings() {
    refs.settings.classList.add("closing");
    window.setTimeout(() => {
      refs.settings.hidden = true;
      refs.settings.classList.remove("closing");
    }, 260);
  }

  function handleReset(event) {
    const button = event.currentTarget;
    if (button.dataset.confirm !== "true") {
      button.dataset.confirm = "true";
      button.textContent = "Press again to confirm reset";
      toast("This will erase the village saved in this browser.", "warning");
      window.setTimeout(() => {
        button.dataset.confirm = "false";
        button.textContent = "Reset village progress";
      }, 3500);
      return;
    }
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(ONBOARDED_KEY);
    window.location.reload();
  }

  function openRaid() {
    if (state.raidCooldownUntil > Date.now()) {
      toast(`The airship returns in ${formatDuration(state.raidCooldownUntil - Date.now())}.`, "warning");
      playSound("error");
      return;
    }
    closeShop();
    closeQuests();
    clearSelection();
    raid = {
      active: false,
      ended: false,
      selectedTroop: "rammer",
      time: 45,
      troops: { rammer: 5, sparks: 8 },
      targets: {
        watchtower: { hp: 90, maxHp: 90 },
        hall: { hp: 135, maxHp: 135 },
        ballista: { hp: 80, maxHp: 80 },
      },
    };
    resetRaidDOM();
    refs.raidModal.hidden = false;
    playSound("voyage");
  }

  function resetRaidDOM() {
    $("#raid-timer").textContent = "45";
    $(".raid-timer").classList.remove("danger");
    $("#battle-callout").classList.remove("started");
    $("#rammer-count").textContent = "×5";
    $("#sparks-count").textContent = "×8";
    $$(".troop-card").forEach((card) => {
      card.classList.toggle("active", card.dataset.troop === "rammer");
      card.classList.remove("empty");
    });
    $$(".enemy-target").forEach((target) => {
      target.classList.remove("destroyed");
      $(".health-bar i", target).style.width = "100%";
    });
    $$(".battle-unit, .hit-burst", $("#raid-stage")).forEach((node) => node.remove());
  }

  function selectTroop(type) {
    if (!raid || raid.ended || raid.troops[type] <= 0) return;
    raid.selectedTroop = type;
    $$(".troop-card").forEach((card) => card.classList.toggle("active", card.dataset.troop === type));
    playSound("soft");
  }

  function deployTroop(targetName) {
    if (!raid || raid.ended) return;
    const troop = raid.selectedTroop;
    const target = raid.targets[targetName];
    if (!target || target.hp <= 0 || raid.troops[troop] <= 0) return;

    if (!raid.active) startRaidTimer();
    raid.troops[troop] -= 1;
    $(`#${troop}-count`).textContent = `×${raid.troops[troop]}`;
    const card = $(`.troop-card[data-troop="${troop}"]`);
    card.classList.toggle("empty", raid.troops[troop] <= 0);
    if (raid.troops[troop] <= 0) {
      const replacement = Object.keys(raid.troops).find((name) => raid.troops[name] > 0);
      if (replacement) selectTroop(replacement);
    }

    $("#battle-callout").classList.add("started");
    spawnBattleUnit(troop, targetName);
    playSound(troop === "rammer" ? "build" : "spark");
  }

  function startRaidTimer() {
    raid.active = true;
    raidTimerHandle = window.setInterval(() => {
      if (!raid || raid.ended) return;
      raid.time -= 1;
      $("#raid-timer").textContent = raid.time;
      $(".raid-timer").classList.toggle("danger", raid.time <= 10);
      if (raid.time <= 0) finishRaid(false);
    }, 1000);
  }

  function spawnBattleUnit(troop, targetName) {
    const stage = $("#raid-stage");
    const targetElement = $(`.enemy-target[data-target="${targetName}"]`);
    const stageRect = stage.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    const unit = document.createElement("span");
    unit.className = `battle-unit ${troop}`;
    unit.style.left = `${stageRect.width * (0.45 + Math.random() * 0.1)}px`;
    unit.style.top = `${stageRect.height * 0.91}px`;
    stage.appendChild(unit);

    requestAnimationFrame(() => {
      unit.style.left = `${targetRect.left - stageRect.left + targetRect.width * 0.5 - 14 + (Math.random() - 0.5) * 25}px`;
      unit.style.top = `${targetRect.top - stageRect.top + targetRect.height * 0.62}px`;
    });

    window.setTimeout(() => {
      if (!raid || raid.ended) {
        unit.remove();
        return;
      }
      applyRaidDamage(targetName, troop === "rammer" ? 46 : 27, targetElement);
      unit.remove();
    }, 470);
  }

  function applyRaidDamage(targetName, damage, targetElement) {
    const target = raid.targets[targetName];
    target.hp = Math.max(0, target.hp - damage);
    $(".health-bar i", targetElement).style.width = `${(target.hp / target.maxHp) * 100}%`;
    spawnHitBurst(targetElement);
    playSound("hit");
    if (target.hp <= 0) {
      targetElement.classList.add("destroyed");
      playSound("complete");
    }
    if (Object.values(raid.targets).every((entry) => entry.hp <= 0)) {
      window.setTimeout(() => finishRaid(true), 450);
    } else if (Object.values(raid.troops).every((count) => count <= 0)) {
      window.setTimeout(() => finishRaid(false), 650);
    }
  }

  function spawnHitBurst(targetElement) {
    const stage = $("#raid-stage");
    const stageRect = stage.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    const burst = document.createElement("span");
    burst.className = "hit-burst";
    burst.style.left = `${targetRect.left - stageRect.left + targetRect.width / 2}px`;
    burst.style.top = `${targetRect.top - stageRect.top + targetRect.height / 2}px`;
    stage.appendChild(burst);
    window.setTimeout(() => burst.remove(), 500);
  }

  function retreatRaid() {
    if (!raid || raid.ended) {
      hideRaidModal();
      return;
    }
    raid.ended = true;
    clearInterval(raidTimerHandle);
    hideRaidModal();
    raid = null;
    toast("The crew made a very dignified retreat.", "warning");
    playSound("error");
  }

  function finishRaid(victory) {
    if (!raid || raid.ended) return;
    raid.ended = true;
    clearInterval(raidTimerHandle);
    const destroyed = Object.values(raid.targets).filter((target) => target.hp <= 0).length;
    const stars = victory ? 3 : destroyed;
    const reward = victory
      ? { gold: 850, wood: 620 }
      : { gold: destroyed * 130, wood: destroyed * 90 };

    if (victory) {
      state.metrics.raidsWon += 1;
      state.raidCooldownUntil = Date.now() + 45 * 1000;
      Core.addExperience(state, 260);
    }
    Core.addResources(state, reward);
    updateHUD();
    renderQuests();
    saveState(true);

    hideRaidModal();
    showRaidResult(victory, stars, reward);
  }

  function hideRaidModal() {
    refs.raidModal.classList.add("closing");
    window.setTimeout(() => {
      refs.raidModal.hidden = true;
      refs.raidModal.classList.remove("closing");
    }, 280);
  }

  function showRaidResult(victory, stars, reward) {
    const starElements = $$("#result-stars i");
    starElements.forEach((star, index) => star.classList.toggle("empty", index >= stars));
    $("#result-kicker").textContent = victory ? "VOYAGE WON" : "CREW RETURNED";
    $("#result-title").textContent = victory ? "Roost routed!" : stars ? "A scrappy haul" : "Not this flight";
    $("#result-copy").textContent = victory
      ? "The crew returns with pockets full and a story that gets better every time."
      : stars
        ? "The rival held on, but your crew did not come home empty-handed."
        : "A good captain knows when to turn the airship around and pack more snacks.";
    $("#result-loot").innerHTML = `
      <span class="loot-pill"><svg><use href="#icon-coin"></use></svg>${formatNumber(reward.gold)}</span>
      <span class="loot-pill wood"><svg><use href="#icon-wood"></use></svg>${formatNumber(reward.wood)}</span>`;
    refs.resultModal.hidden = false;
    if (victory) {
      burstAt(viewport.width / 2, viewport.height * 0.35, "#f3b63c", 24);
      playSound("victory");
    } else {
      playSound("soft");
    }
  }

  function closeResult() {
    refs.resultModal.classList.add("closing");
    window.setTimeout(() => {
      refs.resultModal.hidden = true;
      refs.resultModal.classList.remove("closing");
      raid = null;
    }, 280);
  }

  function toast(message, type = "") {
    const element = document.createElement("div");
    element.className = `toast ${type}`;
    element.textContent = message;
    refs.toastStack.appendChild(element);
    window.setTimeout(() => element.remove(), 3050);
  }

  function burstFromElement(element, color) {
    const rect = element.getBoundingClientRect();
    burstAt(rect.left + rect.width / 2, rect.top + rect.height / 2, color, 12);
  }

  function burstAt(x, y, color, count = 10) {
    if (!state.settings.particles) return;
    for (let index = 0; index < count; index += 1) {
      const particle = document.createElement("i");
      const angle = (Math.PI * 2 * index) / count + Math.random() * 0.5;
      const distance = 38 + Math.random() * 54;
      particle.className = "ui-particle";
      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;
      particle.style.setProperty("--particle", color);
      particle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
      particle.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
      refs.particleLayer.appendChild(particle);
      window.setTimeout(() => particle.remove(), 900);
    }
  }

  function spawnAmbientLeaf() {
    if (!state.settings.particles || document.hidden || !refs.welcome.hidden) return;
    if (Math.random() > 0.65) return;
    const leaf = document.createElement("i");
    leaf.className = "ambient-leaf";
    leaf.style.left = `${Math.random() * 100}%`;
    leaf.style.animationDuration = `${7 + Math.random() * 6}s`;
    leaf.style.setProperty("--drift", `${-100 + Math.random() * 200}px`);
    refs.particleLayer.appendChild(leaf);
    window.setTimeout(() => leaf.remove(), 13500);
  }

  function playSound(kind) {
    if (!state.settings.sound) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      const patterns = {
        click: [[330, 0.04, "sine", 0]],
        soft: [[260, 0.035, "sine", 0]],
        coin: [[620, 0.08, "triangle", 0], [880, 0.1, "triangle", 0.07]],
        build: [[170, 0.08, "square", 0], [240, 0.08, "triangle", 0.07]],
        complete: [[440, 0.1, "triangle", 0], [660, 0.13, "triangle", 0.09]],
        error: [[160, 0.11, "sawtooth", 0]],
        spark: [[720, 0.055, "square", 0]],
        hit: [[105, 0.09, "square", 0]],
        voyage: [[260, 0.12, "triangle", 0], [390, 0.14, "triangle", 0.1]],
        victory: [[392, 0.13, "triangle", 0], [523, 0.14, "triangle", 0.12], [659, 0.22, "triangle", 0.24]],
      };
      const notes = patterns[kind] || patterns.soft;
      for (const [frequency, duration, type, delay] of notes) {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, audioContext.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.055, audioContext.currentTime + delay + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + delay + duration);
        oscillator.connect(gain).connect(audioContext.destination);
        oscillator.start(audioContext.currentTime + delay);
        oscillator.stop(audioContext.currentTime + delay + duration + 0.02);
      }
    } catch (_) {
      state.settings.sound = false;
      refs.soundToggle.checked = false;
    }
  }
})();
