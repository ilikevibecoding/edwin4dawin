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
    toggleStats(force) {
      stats.classList.toggle("hidden", force === undefined ? undefined : !force);
    },
    startEl: start,
  };
}
