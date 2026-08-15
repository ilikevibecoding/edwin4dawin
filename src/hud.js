export function createHud() {
  const promptEl = document.getElementById('prompt');
  const statusEl = document.getElementById('status');
  const fadeEl = document.getElementById('fade');
  let place = 'Trailhead · on foot';
  let flashGen = 0;

  function writeStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  writeStatus(place);

  return {
    prompt(text) {
      if (!promptEl) return;
      promptEl.textContent = text || '';
      promptEl.classList.toggle('show', Boolean(text));
    },
    status(text) {
      if (!statusEl) return;
      if (!text) {
        writeStatus(place);
        return;
      }
      writeStatus(text);
      if (text.startsWith('Trailhead ·')) {
        place = text;
        return;
      }
      const gen = ++flashGen;
      setTimeout(() => {
        if (gen === flashGen) writeStatus(place);
      }, 2400);
    },
    fade(on) {
      if (fadeEl) fadeEl.classList.toggle('on', on);
    },
  };
}
