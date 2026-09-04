// DOM overlay: crosshair, prompt, one-line status, fade layer, start card, debug stats.
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
  const modehint = $("modehint");
  const HINTS = {
    interior: "WASD move · Shift run · E interact · V exterior view",
    exterior: "drag orbit · right-drag pan · wheel zoom · WASD/QE fly · B board",
    transition: "",
  };
  const TOUCH_HINTS = {
    interior: "left: move · right: look",
    exterior: "drag: orbit · pinch: zoom · two fingers: pan",
    transition: "",
  };
  let touch = false;

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
    setStats(text) {
      stats.textContent = text;
    },
    setFade(alpha) {
      fade.style.transition = "none";
      fade.style.opacity = String(alpha);
    },
    setLocation(text) {
      location.textContent = text || "";
    },
    setMode(mode) {
      modehint.textContent = (touch ? TOUCH_HINTS : HINTS)[mode] || "";
      if (mode !== "interior") start.classList.add("hidden");
      crosshair.style.display = mode === "interior" ? "" : "none";
    },
    setTouch(on) {
      touch = on;
      document.body.classList.toggle("touch", on);
      const keys = start.querySelector(".keys");
      const hint = start.querySelector(".hint");
      if (on && keys) keys.textContent = "left half: move · right half: look · buttons: interact / exterior view";
      if (on && hint) hint.textContent = "Tap to take the deck";
    },
    toggleStats(force) {
      stats.classList.toggle("hidden", force === undefined ? undefined : !force);
    },
    startEl: start,
  };
}
