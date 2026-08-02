/*
 * DOM overlay: captions, chapter cards, transport and the dev readout.
 * Everything here is driven from the film's global time so it stays in step
 * with the audio, which is itself the clock master.
 */

export class Overlay {
  constructor() {
    this.capEl = document.getElementById('captions');
    this.capWho = this.capEl.querySelector('.who');
    this.capTxt = this.capEl.querySelector('.txt');
    this.chapEl = document.getElementById('chapter');
    this.chapT = this.chapEl.querySelector('.t');
    this.chapS = this.chapEl.querySelector('.s');
    this.devEl = document.getElementById('dev');
    this.trackFill = document.querySelector('#tTrack i');
    this.timeEl = document.getElementById('tTime');
    this.transport = document.getElementById('transport');
    this.captions = [];
    this.chapters = [];
    this._cap = null;
    this._chap = null;
    this.enabled = true;
  }

  setCaptions(list) { this.captions = list; }
  setChapters(list) { this.chapters = list; }

  hideAll() {
    this.capEl.classList.remove('on');
    this.chapEl.style.opacity = '0';
    this._cap = null;
    this._chap = null;
  }

  update(t, duration) {
    if (!this.enabled) return;

    let cap = null;
    for (const c of this.captions) {
      if (t >= c.t0 && t <= c.t1) { cap = c; break; }
    }
    if (cap !== this._cap) {
      this._cap = cap;
      if (cap) {
        this.capWho.textContent = cap.speaker || '';
        this.capWho.style.display = cap.speaker ? 'block' : 'none';
        this.capTxt.textContent = cap.text;
        this.capEl.classList.add('on');
      } else {
        this.capEl.classList.remove('on');
      }
    }

    let chap = null;
    for (const c of this.chapters) {
      if (t >= c.t0 && t <= c.t1) { chap = c; break; }
    }
    if (chap !== this._chap) {
      this._chap = chap;
      if (chap) {
        this.chapT.textContent = chap.title;
        this.chapS.textContent = chap.subtitle || '';
      }
    }
    if (chap) {
      const fade = 0.7;
      const a = Math.min(
        (t - chap.t0) / fade,
        (chap.t1 - t) / fade,
        1,
      );
      this.chapEl.style.opacity = String(Math.max(0, a));
    } else {
      this.chapEl.style.opacity = '0';
    }

    if (this.trackFill) this.trackFill.style.width = `${(t / duration) * 100}%`;
    if (this.timeEl) this.timeEl.textContent = `${fmt(t)} / ${fmt(duration)}`;
  }

  dev(text) {
    if (this.devEl.classList.contains('on')) this.devEl.textContent = text;
  }

  showDev(on) { this.devEl.classList.toggle('on', on); }
}

function fmt(s) {
  s = Math.max(0, s | 0);
  return `${(s / 60) | 0}:${String(s % 60).padStart(2, '0')}`;
}

export function fatal(err) {
  const el = document.getElementById('fatal');
  const msg = document.getElementById('fatalMsg');
  if (!el) return;
  msg.textContent = String(err && err.stack ? err.stack : err);
  el.classList.add('on');
  console.error(err);
}
