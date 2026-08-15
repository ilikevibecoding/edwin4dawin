export function createHud() {
  const promptEl = document.getElementById('prompt');
  const statusEl = document.getElementById('status');
  const fadeEl = document.getElementById('fade');

  return {
    prompt(text) {
      if (!promptEl) return;
      promptEl.textContent = text || '';
      promptEl.classList.toggle('show', Boolean(text));
    },
    status(text) {
      if (statusEl) statusEl.textContent = text;
    },
    fade(on) {
      if (fadeEl) fadeEl.classList.toggle('on', on);
    },
  };
}
