export function createHud() {
  const promptEl = document.getElementById('prompt');
  const statusEl = document.getElementById('status');
  const fadeEl = document.getElementById('fade');
  const speedEl = document.getElementById('speedo');
  const speedNum = document.getElementById('speedo-num');
  const hintEl = document.getElementById('hint');
  const crossEl = document.getElementById('crosshair');
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
    speed(mph, visible) {
      if (!speedEl) return;
      speedEl.classList.toggle('show', Boolean(visible));
      if (speedNum) speedNum.textContent = String(Math.round(mph || 0));
    },
    hint(text) {
      if (hintEl) hintEl.textContent = text || '';
    },
    crosshair(on) {
      if (crossEl) crossEl.style.opacity = on ? '1' : '0';
    },
  };
}
