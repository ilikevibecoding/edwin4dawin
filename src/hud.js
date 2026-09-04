// DOM overlay: crosshair, prompt, room name, one-line status, mode help line, lift deck menu,
// help card, fade layer, start card with boarding choices, debug stats.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function createHUD() {
  const $ = (id) => document.getElementById(id);
  const prompt = $("prompt");
  const status = $("status-text");
  const crosshair = $("crosshair");
  const fade = $("fade");
  const fadeText = $("fade-text");
  const start = $("start");
  const stats = $("stats");
  const roomName = $("room-name");
  const roomDeck = $("room-deck");
  const roomTitle = $("room-title");
  const modeLine = $("mode-line");
  const liftMenu = $("lift-menu");
  const liftOptions = $("lift-options");
  const help = $("help");
  const startHint = $("start-hint");
  const boards = $("boards");
  let roomTimer = null;

  return {
    showPrompt(key, label) {
      prompt.innerHTML = `<b>${key}</b>${label}`;
      prompt.classList.remove("hidden");
    },
    hidePrompt() {
      prompt.classList.add("hidden");
    },
    setCrosshair(active) {
      crosshair.classList.toggle("active", active);
    },
    showCrosshair(v) {
      crosshair.classList.toggle("hidden", !v);
    },
    setStatus(text) {
      status.style.opacity = 0;
      setTimeout(() => {
        status.textContent = text;
        status.style.opacity = 1;
      }, 180);
    },
    statusText() {
      return status.textContent;
    },
    /** Room banner: shows for a few seconds on entering a room. */
    showRoom(deck, name, hold = 4000) {
      roomDeck.textContent = deck;
      roomTitle.textContent = name;
      roomName.classList.remove("hidden");
      if (roomTimer) clearTimeout(roomTimer);
      roomTimer = setTimeout(() => roomName.classList.add("hidden"), hold);
    },
    roomText() {
      return roomTitle.textContent;
    },
    setModeLine(text) {
      modeLine.textContent = text;
    },
    showLiftMenu(entries, hereDeck) {
      liftOptions.innerHTML = entries.map((e) => `<div><b>${e.key}</b>${e.name}</div>`).join("") + `<div class="here">— you are on ${hereDeck} —</div>`;
      liftMenu.classList.remove("hidden");
    },
    hideLiftMenu() {
      liftMenu.classList.add("hidden");
    },
    liftMenuVisible() {
      return !liftMenu.classList.contains("hidden");
    },
    toggleHelp(force) {
      help.classList.toggle("hidden", force === undefined ? undefined : !force);
    },
    async fadeIn(ms) {
      fade.style.transition = `opacity ${ms}ms ease`;
      fade.style.opacity = 1;
      await wait(ms);
    },
    async fadeOut(ms) {
      fade.style.transition = `opacity ${ms}ms ease`;
      fade.style.opacity = 0;
      await wait(ms);
    },
    async showFadeText(text, holdMs) {
      fadeText.textContent = text;
      fadeText.style.opacity = 1;
      await wait(holdMs);
      fadeText.style.opacity = 0;
      await wait(400);
    },
    fadeOpacity() {
      return parseFloat(fade.style.opacity || "0");
    },
    hideStart() {
      start.classList.add("hidden");
    },
    showStart() {
      start.classList.remove("hidden");
    },
    setStartHint(text) {
      startHint.textContent = text;
    },
    setBoardsEnabled(v) {
      for (const b of boards.querySelectorAll("button")) b.disabled = !v;
    },
    onBoard(fn) {
      boards.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (b && !b.disabled) fn(b.dataset.board);
      });
    },
    setStats(text) {
      stats.textContent = text;
    },
    toggleStats(force) {
      stats.classList.toggle("hidden", force === undefined ? undefined : !force);
    },
    startEl: start,
  };
}
