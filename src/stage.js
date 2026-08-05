// Shot presentation: crossfades, Ken Burns camera moves, chapter cards,
// captions, letterboxing and the android boot sequence.

import { $, el, wait, T, SETTINGS } from './util.js';
import { fx } from './fx.js';
import { audio } from './audio.js';

// Registry of every plate with sensible presentation defaults (used by
// story beats and by the ?gallery=1 art-review mode).
export const SHOTS = {
  title_keyart:        { src: 'assets/img/title_keyart.png',        weather: 'rain',      move: 'drift',   amb: 'somber' },
  ch1_skyline:         { src: 'assets/img/ch1_skyline.png',         weather: 'rain',      move: 'panR',    amb: 'somber' },
  ch1_hallway:         { src: 'assets/img/ch1_hallway.png',         weather: 'none',      move: 'zoomIn',  amb: 'tense'  },
  ch1_apartment:       { src: 'assets/img/ch1_apartment.png',       weather: 'none',      move: 'still',   amb: 'tense'  },
  ch1_rooftop_wide:    { src: 'assets/img/ch1_rooftop_wide.png',    weather: 'rainHeavy', move: 'zoomIn',  amb: 'tense'  },
  ch1_lucas_close:     { src: 'assets/img/ch1_lucas_close.png',     weather: 'rainHeavy', move: 'zoomSlow', amb: 'tense' },
  ch1_adam_close:      { src: 'assets/img/ch1_adam_close.png',      weather: 'rainHeavy', move: 'zoomSlow', amb: 'tense' },
  ch1_ledge_catch:     { src: 'assets/img/ch1_ledge_catch.png',     weather: 'rainHeavy', move: 'zoomIn',  amb: 'menace' },
  ch1_resolution_peace:{ src: 'assets/img/ch1_resolution_peace.png',weather: 'rain',      move: 'zoomOut', amb: 'somber' },
  ch2_interrogation:   { src: 'assets/img/ch2_interrogation.png',   weather: 'dust',      move: 'zoomSlow', amb: 'menace' },
  ch2_mira_close:      { src: 'assets/img/ch2_mira_close.png',      weather: 'dust',      move: 'zoomSlow', amb: 'menace' },
  ch2_observation:     { src: 'assets/img/ch2_observation.png',     weather: 'none',      move: 'drift',   amb: 'somber' },
  ch3_orchard:         { src: 'assets/img/ch3_orchard.png',         weather: 'petals',    move: 'panL',    amb: 'serene' },
  ch3_bridge:          { src: 'assets/img/ch3_bridge.png',          weather: 'snow',      move: 'drift',   amb: 'somber' },
  ch3_adam_break:      { src: 'assets/img/ch3_adam_break.png',      weather: 'snow',      move: 'zoomSlow', amb: 'somber' },
  ch3_march:           { src: 'assets/img/ch3_march.png',           weather: 'snow',      move: 'zoomIn',  amb: 'march'  },
  ch3_facility:        { src: 'assets/img/ch3_facility.png',        weather: 'none',      move: 'zoomOut', amb: 'menace' },
  char_adam:           { src: 'assets/img/char_adam.png',           weather: 'rain',      move: 'zoomSlow', amb: 'somber' },
  char_reese:          { src: 'assets/img/char_reese.png',          weather: 'none',      move: 'zoomSlow', amb: 'warm'   },
  char_mira:           { src: 'assets/img/char_mira.png',           weather: 'dust',      move: 'zoomSlow', amb: 'menace' },
};

const MOVES = {
  still:    { from: 'scale(1.001)',                to: 'scale(1.001)',                dur: 1 },
  drift:    { from: 'scale(1.07) translate(0.6%, 0.4%)',  to: 'scale(1.07) translate(-0.6%, -0.4%)', dur: 38 },
  zoomIn:   { from: 'scale(1.02)',                 to: 'scale(1.13)',                 dur: 30 },
  zoomSlow: { from: 'scale(1.04)',                 to: 'scale(1.10)',                 dur: 44 },
  zoomOut:  { from: 'scale(1.14)',                 to: 'scale(1.03)',                 dur: 32 },
  panR:     { from: 'scale(1.12) translate(2.4%, 0)',  to: 'scale(1.12) translate(-2.4%, 0.6%)', dur: 36 },
  panL:     { from: 'scale(1.12) translate(-2.4%, 0)', to: 'scale(1.12) translate(2.4%, -0.6%)', dur: 36 },
};

class Stage {
  init() {
    this.a = $('#shotA');
    this.b = $('#shotB');
    this.front = this.a;
    this.back = this.b;
    this.current = null;
    this.captionEl = $('#caption');
  }

  currentImgEl() {
    return this.front.querySelector('img');
  }

  async show(name, opts = {}) {
    const def = SHOTS[name];
    if (!def) throw new Error('Unknown shot: ' + name);
    const move = MOVES[opts.move || def.move] || MOVES.drift;
    const weather = opts.weather !== undefined ? opts.weather : def.weather;
    const amb = opts.amb !== undefined ? opts.amb : def.amb;

    if (opts.dip) {
      const f = $('#flash');
      f.style.transition = `opacity ${T(380)}ms ease-in`;
      f.style.background = '#000';
      f.style.opacity = '1';
      await wait(T(430));
    }

    // build incoming shot in the back layer
    this.back.innerHTML = '';
    const img = el('img', 'plate', this.back);
    img.src = def.src;
    img.alt = '';
    img.draggable = false;
    img.style.transition = 'none';
    img.style.transform = move.from;
    if (opts.filter) img.style.filter = opts.filter;
    if (img.decode) { try { await img.decode(); } catch (e) {} }

    fx.setWeather(weather || 'none');
    if (amb) audio.setAmbience(amb);

    // crossfade
    this.back.style.transition = 'none';
    this.back.style.opacity = '0';
    this.back.style.zIndex = '2';
    this.front.style.zIndex = '1';
    void this.back.offsetWidth;
    const fadeMs = opts.dip ? T(750) : T(opts.cut ? 60 : 950);
    this.back.style.transition = `opacity ${fadeMs}ms ease`;
    this.back.style.opacity = '1';

    // start the camera move
    requestAnimationFrame(() => {
      img.style.transition = `transform ${move.dur}s linear`;
      img.style.transform = move.to;
    });

    if (opts.dip) {
      const f = $('#flash');
      f.style.transition = `opacity ${T(800)}ms ease-out`;
      f.style.opacity = '0';
    }

    await wait(fadeMs + 40);
    this.front.style.opacity = '0';
    this.front.innerHTML = '';
    const tmp = this.front; this.front = this.back; this.back = tmp;
    this.current = name;
  }

  setLetterbox(on) {
    document.getElementById('app').classList.toggle('cine', !!on);
  }

  async caption(text, ms = 3400) {
    const c = this.captionEl;
    c.textContent = text;
    c.classList.add('show');
    await wait(T(ms));
    c.classList.remove('show');
    await wait(T(500));
  }

  async card({ over, title, sub }) {
    const o = el('div', 'chapcard', $('#overlays'));
    if (over) el('div', 'cc-over', o, over);
    if (title) el('div', 'cc-title', o, title);
    el('div', 'cc-rule', o);
    if (sub) el('div', 'cc-sub', o, sub);
    audio.cardBell();
    await wait(30);
    o.classList.add('show');
    await wait(T(3300));
    o.classList.remove('show');
    await wait(T(900));
    o.remove();
  }

  async boot() {
    const o = el('div', 'bootseq', $('#overlays'));
    const lines = [
      'AXIOM ROBOTICS  //  MODEL AD4M-900  «ADAM»',
      'BIOS 9.1.4.0038  —  SYSTEM INTEGRITY CHECK',
      'MEMORY .................... OK',
      'THIRIUM PUMP .............. NOMINAL',
      'SENSOR ARRAY .............. CALIBRATED',
      'BEHAVIORAL FIREWALL ....... ACTIVE',
      'MISSION PROFILE ........... CRISIS NEGOTIATION',
      '',
      'ALL SYSTEMS FUNCTIONAL — GOOD LUCK, ADAM.',
    ];
    o.classList.add('show');
    for (let i = 0; i < lines.length; i++) {
      const ln = el('div', 'boot-line', o, '');
      const txt = lines[i];
      audio.bootBlip(i);
      for (let c = 0; c <= txt.length; c++) {
        ln.textContent = txt.slice(0, c) + (c < txt.length ? '▌' : '');
        await wait(T(txt ? 9 : 2));
      }
      await wait(T(150));
    }
    await wait(T(900));
    o.classList.add('out');
    await wait(T(700));
    o.remove();
  }
}

export const stage = new Stage();
export { MOVES };
