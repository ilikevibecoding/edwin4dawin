/**
 * Entry point.
 *
 * Two modes:
 *   interactive  — normal page, plays with sound, scrubber and scene picker.
 *   render       — `?render=1`, no DOM chrome, no clock; `tools/render.mjs`
 *                  drives it frame by frame through window.FILM.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Film } from './engine/film.js';
import { FilmAudio } from './engine/audio.js';
import { modules } from './scenes/index.js';

const params = new URLSearchParams(location.search);
const RENDER_MODE = params.get('render') === '1';
const W = parseInt(params.get('w') || '1280', 10);
const H = parseInt(params.get('h') || '720', 10);
const QUALITY = params.get('q') || (RENDER_MODE ? 'high' : 'high');
const BLOOM = params.get('bloom') !== '0';
const ONLY_SCENE = params.get('scene');

if (RENDER_MODE) document.body.classList.add('render');

const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
  stencil: false,
});
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
renderer.autoClear = true;
stage.appendChild(renderer.domElement);

// ---------------------------------------------------------------------------

async function boot() {
  const manifest = await fetch('audio/manifest.json').then((r) => r.json());

  let mods = modules;
  if (ONLY_SCENE) {
    const ids = ONLY_SCENE.split(',');
    mods = modules.filter((m) => ids.includes(m.meta.id));
    if (!mods.length) mods = modules;
  }

  const film = new Film({ modules: mods, manifest, quality: QUALITY, aspect: W / H });

  // Bloom makes the lasers, engines and explosions read as light rather than
  // as coloured plastic. It costs about 25% of frame time, so it is optional.
  let composer = null;
  let renderPass = null;
  if (BLOOM) {
    composer = new EffectComposer(renderer);
    composer.setSize(W, H);
    renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
    composer.addPass(renderPass);
    const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.62, 0.62, 0.72);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    film.bloom = bloom;
  }

  let lastStats = { triangles: 0, calls: 0 };
  function drawFrame(t) {
    const inst = film.update(t);
    if (!inst) return false;
    renderer.info.reset();
    if (composer) {
      renderPass.scene = inst.scene;
      renderPass.camera = inst.camera;
      if (film.bloom && inst.bloom) {
        film.bloom.strength = inst.bloom.strength ?? 0.62;
        film.bloom.radius = inst.bloom.radius ?? 0.62;
        film.bloom.threshold = inst.bloom.threshold ?? 0.72;
      }
      composer.render();
    } else {
      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(inst.scene, inst.camera);
    }
    lastStats = { triangles: renderer.info.render.triangles, calls: renderer.info.render.calls };
    film.overlay.render(renderer);
    return true;
  }

  // ------------------------------------------------------------------ render
  if (RENDER_MODE) {
    const t0 = parseFloat(params.get('t0') || '0');
    const t1 = parseFloat(params.get('t1') || String(film.duration));
    // `all=1` builds every scene so the caller can read the complete sound-cue
    // list; render workers only build the slice of the timeline they own.
    if (params.get('all') === '1') await film.buildAll();
    else await film.buildRange(t0, t1);
    window.FILM = {
      duration: film.duration,
      scenes: film.sceneList(),
      cues: () => film.sfxCues,
      draw(t) {
        return drawFrame(t);
      },
      grab(quality = 0.94) {
        return renderer.domElement.toDataURL('image/jpeg', quality);
      },
      drawAndGrab(t, quality = 0.94) {
        drawFrame(t);
        return renderer.domElement.toDataURL('image/jpeg', quality);
      },
      info: () => lastStats,
    };
    drawFrame(t0);
    window.FILM_READY = true;
    return;
  }

  // ------------------------------------------------------- interactive setup
  const bar = document.querySelector('#bar i');
  const loadMsg = document.getElementById('loadMsg');
  const loader = document.getElementById('loader');
  const startBtn = document.getElementById('startBtn');

  await film.buildAll((p, title) => {
    bar.style.width = `${p * 78}%`;
    loadMsg.textContent = `building ${title.toLowerCase()}…`;
  });

  const audio = new FilmAudio();
  const cues = await buildCueList(film, manifest);
  loadMsg.textContent = 'loading sound…';
  await audio.load(cues, (p) => {
    bar.style.width = `${78 + p * 22}%`;
  });

  loadMsg.textContent = `${fmt(film.duration)} · ${film.entries.length} scenes`;
  bar.style.width = '100%';
  startBtn.disabled = false;

  const hud = document.getElementById('hud');
  const hint = document.getElementById('hint');
  const playBtn = document.getElementById('playBtn');
  const muteBtn = document.getElementById('muteBtn');
  const scrub = document.getElementById('scrub');
  const timeEl = document.getElementById('time');
  const chapEl = document.getElementById('chapter');

  let time = 0;
  let playing = false;
  let last = performance.now();

  function setPlaying(v) {
    playing = v;
    playBtn.textContent = v ? 'Pause' : 'Play';
    if (v) audio.play(time);
    else audio.pause();
  }

  function seek(t) {
    time = Math.max(0, Math.min(film.duration - 0.02, t));
    if (playing) audio.play(time);
    drawFrame(time);
  }

  startBtn.addEventListener('click', async () => {
    await audio.init();
    loader.style.opacity = '0';
    setTimeout(() => (loader.style.display = 'none'), 600);
    hud.classList.add('show');
    hint.classList.add('show');
    setTimeout(() => hint.classList.remove('show'), 6000);
    setPlaying(true);
  });

  playBtn.addEventListener('click', () => setPlaying(!playing));
  muteBtn.addEventListener('click', () => {
    audio.setMuted(!audio.muted);
    muteBtn.textContent = audio.muted ? 'Sound off' : 'Sound on';
  });
  document.getElementById('prevBtn').addEventListener('click', () => jumpScene(-1));
  document.getElementById('nextBtn').addEventListener('click', () => jumpScene(1));
  scrub.addEventListener('input', () => seek((scrub.value / 1000) * film.duration));

  function jumpScene(dir) {
    const i = film.entryAt(time);
    const cur = film.entries[i];
    let target;
    if (dir < 0) target = time - cur.start > 2.2 ? cur.start : film.entries[Math.max(0, i - 1)].start;
    else target = film.entries[Math.min(film.entries.length - 1, i + 1)].start;
    seek(target);
  }

  addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      setPlaying(!playing);
    } else if (e.code === 'ArrowRight') jumpScene(1);
    else if (e.code === 'ArrowLeft') jumpScene(-1);
    else if (e.code === 'KeyM') muteBtn.click();
    else if (/^Digit[1-9]$/.test(e.code)) {
      const n = parseInt(e.code.slice(5), 10) - 1;
      if (film.entries[n]) seek(film.entries[n].start);
    }
  });

  let hudTimer = null;
  addEventListener('mousemove', () => {
    hud.classList.add('show');
    clearTimeout(hudTimer);
    hudTimer = setTimeout(() => hud.classList.remove('show'), 2600);
  });

  function loop() {
    requestAnimationFrame(loop);
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (playing) {
      // Lock the picture to the audio clock so narration never drifts.
      const at = audio.currentTime();
      time = at !== null ? at : time + dt;
      if (time >= film.duration) {
        time = film.duration - 0.02;
        setPlaying(false);
      }
      scrub.value = String((time / film.duration) * 1000);
    }
    drawFrame(time);
    timeEl.textContent = `${fmt(time)} / ${fmt(film.duration)}`;
    const e = film.entries[film.entryAt(time)];
    chapEl.textContent = e ? e.meta.title : '';
  }
  loop();

  addEventListener('resize', fitCanvas);
  fitCanvas();
  window.FILM = { film, seek, drawFrame };
}

function fmt(s) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}

function fitCanvas() {
  const el = renderer.domElement;
  const scale = Math.min(innerWidth / W, innerHeight / H);
  el.style.width = `${Math.floor(W * scale)}px`;
  el.style.height = `${Math.floor(H * scale)}px`;
}

/** Narration + sfx + music, merged into one scheduled cue list. */
async function buildCueList(film, manifest) {
  const cues = [];
  for (const l of manifest.lines) {
    cues.push({ t: l.t, url: l.url, gain: 1.0, kind: 'voice' });
  }
  const sfxIndex = await fetch('audio/sfx/index.json')
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}));
  for (const cue of film.sfxCues) {
    const entry = sfxIndex[cue.name];
    if (!entry) continue;
    cues.push({ t: cue.t, url: entry.file, gain: cue.gain ?? 1, rate: cue.rate ?? 1, kind: 'sfx' });
  }
  const musicIndex = await fetch('audio/music/index.json')
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}));
  for (const e of film.entries) {
    const m = musicIndex[e.meta.id];
    if (m) cues.push({ t: e.start, url: m.file, gain: 0.5, kind: 'music' });
  }
  return cues;
}

boot().catch((e) => {
  console.error(e);
  const el = document.getElementById('loadMsg');
  if (el) el.textContent = 'error: ' + e.message;
  window.FILM_ERROR = String(e && e.stack ? e.stack : e);
});
