// DOM overlay: crosshair, prompt, status line, location / deck readout, mode label, selection menu,
// fade layer, start card, debug stats.
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
  const location = $("location");
  const deck = $("deck");
  const mode = $("mode");
  const menu = $("menu");
  const menuTitle = $("menu-title");
  const menuList = $("menu-list");
  const menuHint = $("menu-hint");
  const hint = $("hint");
  let hintTimer = null;

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
    setCrosshairVisible(v) {
      crosshair.style.display = v ? "" : "none";
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
    setLocation(text) {
      location.textContent = text || "";
    },
    setDeckIndicator(text) {
      deck.textContent = text || "";
      deck.classList.toggle("hidden", !text);
    },
    setMode(text) {
      mode.textContent = text || "";
      mode.classList.toggle("hidden", !text);
    },
    showHint(text, ms = 4000) {
      hint.textContent = text;
      hint.classList.remove("hidden");
      if (hintTimer) clearTimeout(hintTimer);
      hintTimer = setTimeout(() => hint.classList.add("hidden"), ms);
    },
    showMenu(title, items, hintText) {
      menuTitle.textContent = title;
      menuList.innerHTML = items.map((it) => `<li><b>${it.key}</b><span>${it.label}</span></li>`).join("");
      menuHint.textContent = hintText || "";
      menu.classList.remove("hidden");
    },
    hideMenu() {
      menu.classList.add("hidden");
    },
    menuVisible() {
      return !menu.classList.contains("hidden");
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
    setStartInfo(html) {
      const el = $("start-info");
      if (el) el.innerHTML = html;
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
