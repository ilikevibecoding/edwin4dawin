/**
 * Entry point.
 *
 *   /                     interactive playback with sound
 *   /?render=1&fps=24     deterministic mode: the page exposes __seek(frame)
 *                         so tools/render-frames.mjs can walk the film exactly
 *   /?t=93                jump straight to a moment (useful for shot review)
 *   /?scene=trench        play a single scene on its own
 */
import { createRenderer } from './engine/renderer.js';
import { Director } from './director.js';
import { DURATION, timeline } from './story.js';

const q = new URLSearchParams(location.search);
const RENDER = q.get('render') === '1';
const FPS = parseFloat(q.get('fps') || '24');
const W = parseInt(q.get('w') || '0', 10) || innerWidth;
const H = parseInt(q.get('h') || '0', 10) || innerHeight;

const stage = createRenderer(document.getElementById('stage'), {
  width: W, height: H,
  pixelRatio: RENDER ? 1 : Math.min(devicePixelRatio, 1.5),
});

const director = new Director(stage, { mode: RENDER ? 'render' : 'live', only: q.get('only') || null });

const tc = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const $ = (id) => document.getElementById(id);

let startT = 0;
if (q.has('t')) startT = parseFloat(q.get('t'));
if (q.has('scene')) {
  const s = timeline().scenes.find((x) => x.id === q.get('scene'));
  if (s) startT = s.start + parseFloat(q.get('o') || '0.05');
}

async function boot() {
  const t0 = performance.now();
  await director.build();
  try { await director.loadVoices(); } catch (e) { console.warn('voice track unavailable', e); }
  console.log(`built in ${((performance.now() - t0) / 1000).toFixed(1)}s`);

  director.frame(startT);

  if (RENDER) {
    // deterministic: the harness owns the clock
    window.__fps = FPS;
    window.__duration = DURATION;
    window.__frames = Math.ceil(DURATION * FPS);
    window.__seek = (frame) => {
      director.frame(frame / FPS);
      return frame;
    };
    window.__renderSoundtrack = async (sr) => {
      const wav = await director.renderSoundtrack(sr || 48000);
      window.__wav = wav;
      return wav.length;
    };
    window.__renderChunk = async (from, dur, tail, sr) => {
      const wav = await director.renderSoundtrackChunk(from, dur, tail ?? 3.5, sr || 48000);
      window.__wav = wav;
      return wav.length;
    };
    window.__scenes = director.tl.scenes.map((s) => ({ id: s.id, start: s.start, dur: s.dur }));
    window.__wavChunk = (off, len) => {
      const s = window.__wav.subarray(off, off + len);
      let bin = '';
      for (let i = 0; i < s.length; i++) bin += String.fromCharCode(s[i]);
      return btoa(bin);
    };
    window.__director = director;
    $('start').style.display = 'none';
    $('ui').style.display = 'none';
    window.__ready = true;
    return;
  }

  // ---- interactive ----
  const scrub = $('scrub');
  const btn = $('btn-play');
  let raf = 0;

  const loop = () => {
    raf = requestAnimationFrame(loop);
    const T = director.playing ? director.liveTime() : director.T;
    if (T >= DURATION) {
      director.stopAudio();
      btn.textContent = 'Replay';
    }
    director.frame(T);
    if (document.activeElement !== scrub) scrub.value = String((director.T / DURATION) * 1000);
    $('tc').textContent = `${tc(director.T)} / ${tc(DURATION)}`;
  };

  $('btn-start').onclick = async () => {
    $('start').classList.add('gone');
    await director.play(startT);
    if (!raf) loop();
  };

  btn.onclick = async () => {
    if (director.playing) { director.stopAudio(); btn.textContent = 'Play'; }
    else { await director.play(director.T >= DURATION - 0.1 ? 0 : director.T); btn.textContent = 'Pause'; }
  };

  scrub.oninput = () => {
    const T = (parseFloat(scrub.value) / 1000) * DURATION;
    director.stopAudio();
    director.frame(T);
    btn.textContent = 'Play';
  };
  scrub.onchange = async () => {
    await director.play(director.T);
    btn.textContent = 'Pause';
  };

  addEventListener('keydown', (e) => {
    if (e.key === ' ') { e.preventDefault(); btn.click(); }
    if (e.key === 'ArrowRight') { director.stopAudio(); director.frame(director.T + 5); }
    if (e.key === 'ArrowLeft') { director.stopAudio(); director.frame(Math.max(0, director.T - 5)); }
  });

  window.__ready = true;
  loop();
}

addEventListener('resize', () => {
  if (!RENDER) stage.setSize(innerWidth, innerHeight);
});

boot().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML(
    'beforeend',
    `<pre style="position:fixed;left:12px;top:12px;color:#ff7f7f;font:12px monospace;z-index:99;white-space:pre-wrap;max-width:90vw">${e.stack || e}</pre>`
  );
  window.__ready = true;
  window.__bootError = String(e.message || e);
});
