// DOM overlay: crosshair, prompt, status line, mode hint, fade layer, start card, loading card, lift menu,
// room title toast, debug stats.
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
  const hint = $("mode-hint");
  const menu = $("menu");
  const menuTitle = $("menu-title");
  const menuList = $("menu-list");
  const toast = $("room-toast");
  const loading = $("loading");
  const loadingBar = $("loading-bar");
  const loadingText = $("loading-text");
  let menuHandler = null;
  let toastTimer = null;

  document.addEventListener("keydown", (e) => {
    if (!menuHandler) return;
    if (e.code === "Escape") {
      const h = menuHandler;
      menuHandler = null;
      h(null);
      return;
    }
    const m = /^Digit(\d)$/.exec(e.code) || /^Numpad(\d)$/.exec(e.code);
    if (m) {
      const h = menuHandler;
      menuHandler = null;
      h(parseInt(m[1], 10) - 1);
    }
  });

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
    showCrosshair(on) {
      crosshair.style.display = on ? "" : "none";
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
    setModeHint(text) {
      hint.textContent = text;
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
    setStartMode(mode) {
      start.dataset.mode = mode;
      $("start-hint").textContent = mode === "interior" ? "Click to resume" : "Click to take command";
      $("start-keys").textContent = mode === "interior" ? "WASD move · Shift sprint · mouse look · E interact · V exterior · Esc release" : "Drag to orbit · wheel to zoom · F free-fly · Enter to board";
    },
    setStats(text) {
      stats.textContent = text;
    },
    toggleStats(force) {
      stats.classList.toggle("hidden", force === undefined ? undefined : !force);
    },
    /** Numbered menu: items [{key, label}], onChoose(index|null) */
    showMenu(title, items, onChoose) {
      menuTitle.textContent = title;
      menuList.innerHTML = items.map((it) => `<li><b>${it.key}</b>${it.label}</li>`).join("");
      menu.classList.remove("hidden");
      menuHandler = (k) => {
        menu.classList.add("hidden");
        onChoose(k);
      };
    },
    hideMenu() {
      menu.classList.add("hidden");
      menuHandler = null;
    },
    menuOpen() {
      return !!menuHandler;
    },
    roomToast(title, sub = "") {
      toast.innerHTML = `<div class="t">${title}</div><div class="s">${sub}</div>`;
      toast.classList.add("show");
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
    },
    setLoading(progress, text) {
      loading.classList.remove("hidden");
      loadingBar.style.width = `${Math.round(progress * 100)}%`;
      if (text) loadingText.textContent = text;
    },
    hideLoading() {
      loading.classList.add("hidden");
    },
    startEl: start,
  };
}
