// DOM overlay: crosshair, prompt, one-line status, location line (deck / room), control hint, lift
// panel, fade layer, start card, loading bar, debug stats.
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
  const hint = $("hint");
  const lift = $("lift");
  const loading = $("loading");
  const loadingBar = $("loading-bar");
  const loadingText = $("loading-text");
  const modeTag = $("mode-tag");

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
    setLocation(deck, room) {
      location.textContent = room ? `${deck} — ${room}` : deck || "";
    },
    setHint(text) {
      hint.textContent = text || "";
    },
    setLiftPrompt(text) {
      if (text) {
        lift.textContent = text;
        lift.classList.remove("hidden");
      } else lift.classList.add("hidden");
      document.body.classList.toggle("lift", !!text);
    },
    setMode(mode) {
      modeTag.textContent = mode === "exterior" ? "EXTERIOR" : "INTERIOR";
      document.body.classList.toggle("exterior", mode === "exterior");
      crosshair.classList.toggle("hidden", mode === "exterior");
    },
    setLoading(fraction, text) {
      if (fraction >= 1) {
        loading.classList.add("hidden");
        return;
      }
      loading.classList.remove("hidden");
      loadingBar.style.width = `${Math.round(fraction * 100)}%`;
      if (text) loadingText.textContent = text;
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
