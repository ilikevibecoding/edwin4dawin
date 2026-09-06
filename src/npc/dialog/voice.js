// Audible speech and subtitles (spec §12/§16, rubric 14 section D). Web Speech (`speechSynthesis`) with deterministic
// per-person pitch/rate: species ranges, droids clipped and monotone. Every spoken line shows a subtitle (speaker name
// + text) in a DOM overlay. Settings - subtitles on/off, dialogue volume, voice on/off - live in localStorage under
// SETTINGS_KEY and the admin panel edits them through `settings`/`setSetting`. When no voice exists (headless Chrome,
// a browser without TTS) every line that should have been spoken goes to the unvoiced manifest and `report()` says
// `textOnly: true` - text-only is never labelled voiced. Works in Node with no DOM (tests): output is recorded only.
import { hash2 } from '../../rng.js';

export const SETTINGS_KEY = 'frontier-craft:dialogue';
export const DEFAULT_SETTINGS = { subtitles: true, volume: 0.8, voice: true };
export const MAX_UNVOICED = 400;
const SPECIES_PITCH = { human: [0.9, 1.1], twilek: [1.0, 1.2], duros: [0.75, 0.9], zabrak: [0.85, 1.0], mirialan: [0.95, 1.1], pantoran: [0.95, 1.15], nautolan: [0.8, 0.95], togruta: [0.95, 1.15], aqualish: [0.65, 0.8], rodian: [1.1, 1.3], sullustan: [1.15, 1.35], droid: [1.4, 1.7] };
const DROID_RATE = 1.15;

export class SpeechOutput {
  constructor(game = null) {
    this.game = game;
    this.settings = loadSettings();
    this.synth = typeof globalThis !== 'undefined' && globalThis.speechSynthesis ? globalThis.speechSynthesis : null;
    this.voices = [];
    this.unvoiced = [];            // { id, speaker, name, text, at, reason }
    this.spoken = 0; this.shown = 0;
    this.current = null;           // { name, text, until }
    this.overlay = null;
    if (this.synth) {
      this.refreshVoices();
      try { this.synth.addEventListener('voiceschanged', () => this.refreshVoices()); } catch (e) { /* older engines */ }
    }
    this.mountSubtitles();
  }
  refreshVoices() { try { this.voices = this.synth.getVoices ? this.synth.getVoices().filter((v) => /^en/i.test(v.lang || '')).concat(this.synth.getVoices().filter((v) => !/^en/i.test(v.lang || ''))) : []; } catch (e) { this.voices = []; } }
  get available() { return !!this.synth && this.voices.length > 0; }

  // ---------------------------------------------------------------------------------------------------- settings
  setSetting(key, value) {
    if (!(key in DEFAULT_SETTINGS)) return false;
    if (key === 'volume') value = Math.max(0, Math.min(1, +value || 0)); else value = !!value;
    this.settings[key] = value;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch (e) { /* storage unavailable */ }
    if (key === 'voice' && !value && this.synth) { try { this.synth.cancel(); } catch (e) { /* ignore */ } }
    if (key === 'subtitles' && !value) this.hideSubtitle();
    return true;
  }

  // ---------------------------------------------------------------------------------------------------- voices
  // Deterministic voice parameters of a person: pitch inside the species range, rate from the personality, droids
  // clipped (high pitch, quick, flat) - and a voice index into the engine's list so the same person keeps a voice.
  voiceParams(pp) {
    if (pp.voice && pp.voice.droid) return { pitch: clamp(pp.voice.pitch, 0.1, 2), rate: clamp(pp.voice.rate || DROID_RATE, 0.5, 2), droid: true, voiceIndex: this.voiceIndex(pp, 0) };
    const species = pp.droid ? 'droid' : (pp.species || 'human');
    const [lo, hi] = SPECIES_PITCH[species] || SPECIES_PITCH.human;
    const h = hash2(pp.seed & 0xffff, pp.seed >>> 16, 0x70ce);
    let pitch = pp.voice && pp.voice.pitch != null ? pp.voice.pitch : lo + (hi - lo) * h;
    if (pp.female && !pp.droid) pitch += 0.12;
    const rateBase = { brisk: 1.08, warm: 0.97, wry: 1.0, formal: 0.94, gruff: 0.95, anxious: 1.1, droid: DROID_RATE }[pp.personality] || 1;
    const rate = pp.voice && pp.voice.rate != null ? pp.voice.rate : rateBase + (hash2(pp.seed >>> 16, pp.seed & 0xffff, 0x7a7e) - 0.5) * 0.1;
    return { pitch: +clamp(pitch, 0.5, 2).toFixed(2), rate: +clamp(rate, 0.6, 1.6).toFixed(2), droid: !!pp.droid, voiceIndex: this.voiceIndex(pp, pp.female ? 1 : 2) };
  }
  voiceIndex(pp, salt) { if (!this.voices.length) return -1; return Math.floor(hash2(pp.seed & 0xffff, (pp.seed >>> 8) & 0xffff, 0x51 + salt) * this.voices.length) % this.voices.length; }
  pickVoice(pp, params) {
    if (!this.voices.length) return null;
    // prefer a voice whose name hints at the gender, else the deterministic index
    const want = pp.droid ? null : pp.female ? /female|woman|zira|samantha|karen|moira|tessa|fiona|victoria|susan|hazel|serena|allison|ava|kate|joanna|salli|emma|amy/i : /male|man|daniel|david|george|alex|fred|tom|james|mark|oliver|arthur|ryan|brian|matthew|joey|russell/i;
    if (want) { const list = this.voices.filter((v) => want.test(v.name)); if (list.length) return list[params.voiceIndex % list.length]; }
    return this.voices[Math.max(0, params.voiceIndex)] || this.voices[0];
  }

  // ---------------------------------------------------------------------------------------------------- output
  // Speak (or record) one line. opts: { voice (allowed by the local budget), lineId, subtitle, duration, important }
  say(pp, text, opts = {}) {
    const dur = opts.duration || Math.min(9, Math.max(2.4, text.length / 14));
    if (this.settings.subtitles && opts.subtitle !== false) this.showSubtitle(pp.name, text, dur, pp);
    const wantVoice = this.settings.voice && opts.voice !== false && this.settings.volume > 0;
    if (!wantVoice) return { voiced: false, duration: dur, reason: opts.voice === false ? 'budget' : 'disabled' };
    if (!this.available) { this.recordUnvoiced(pp, text, opts.lineId, this.synth ? 'no-voices' : 'no-speech-api'); return { voiced: false, duration: dur, reason: 'unvoiced' }; }
    try {
      const params = this.voiceParams(pp);
      const u = new globalThis.SpeechSynthesisUtterance(text);
      const v = this.pickVoice(pp, params);
      if (v) u.voice = v;
      u.pitch = params.pitch; u.rate = params.rate; u.volume = this.settings.volume;
      if (opts.important) this.synth.cancel();
      this.synth.speak(u);
      this.spoken++;
      return { voiced: true, duration: dur, params };
    } catch (e) {
      this.recordUnvoiced(pp, text, opts.lineId, 'speak-failed');
      return { voiced: false, duration: dur, reason: 'unvoiced' };
    }
  }
  recordUnvoiced(pp, text, lineId, reason) {
    this.unvoiced.push({ id: lineId || null, speaker: pp.id, name: pp.name, text, at: Date.now(), reason });
    if (this.unvoiced.length > MAX_UNVOICED) this.unvoiced.splice(0, this.unvoiced.length - MAX_UNVOICED);
  }
  report() {
    return {
      speechApi: !!this.synth, voicesAvailable: this.voices.length, voiceNames: this.voices.slice(0, 6).map((v) => v.name), textOnly: !this.available || !this.settings.voice,
      spoken: this.spoken, subtitlesShown: this.shown, unvoiced: this.unvoiced.length, settings: { ...this.settings },
      status: !this.settings.voice ? 'voice off (text only)' : this.available ? `voiced (${this.voices.length} voices)` : 'text only - no speech voices in this browser',
    };
  }

  // ---------------------------------------------------------------------------------------------------- subtitles
  mountSubtitles() {
    if (typeof document === 'undefined') return;
    let el = document.getElementById('npc-subtitles');
    if (!el) {
      el = document.createElement('div');
      el.id = 'npc-subtitles';
      el.setAttribute('aria-live', 'polite');
      el.style.cssText = 'position:fixed;left:50%;bottom:17%;transform:translateX(-50%);max-width:min(72vw,760px);padding:8px 14px;border-radius:6px;background:rgba(8,10,16,0.72);color:#f2f2ec;font:15px/1.35 "Segoe UI",system-ui,sans-serif;text-align:center;pointer-events:none;z-index:40;display:none;text-shadow:0 1px 2px #000;box-shadow:0 2px 12px rgba(0,0,0,0.35)';
      el.innerHTML = '<b id="npc-subtitles-name" style="color:#ffd866;margin-right:6px"></b><span id="npc-subtitles-text"></span><span id="npc-subtitles-mode" style="display:block;font-size:11px;opacity:0.55;margin-top:2px"></span>';
      (document.body || document.documentElement).appendChild(el);
    }
    this.overlay = el;
  }
  showSubtitle(name, text, dur, pp = null) {
    this.shown++;
    this.current = { name, text, until: nowS() + dur };
    if (!this.overlay) return;
    this.placeSubtitle();
    this.overlay.querySelector('#npc-subtitles-name').textContent = name + ':';
    this.overlay.querySelector('#npc-subtitles-text').textContent = text;
    const mode = this.overlay.querySelector('#npc-subtitles-mode');
    mode.textContent = !this.settings.voice ? 'text only' : this.available ? '' : 'text only - no speech voices in this browser';
    this.overlay.style.display = 'block';
  }
  // above the talk box while a conversation is open (the box sits at bottom 18%), else at the usual subtitle height
  placeSubtitle() {
    if (!this.overlay) return;
    const box = document.getElementById('npc-talk');
    this.overlay.style.bottom = box && !box.hidden ? `calc(18% + ${Math.round(box.getBoundingClientRect().height) + 10}px)` : '17%';
  }
  hideSubtitle() { this.current = null; if (this.overlay) this.overlay.style.display = 'none'; }
  update() { if (this.current && nowS() > this.current.until) this.hideSubtitle(); }
  get subtitle() { return this.current ? { name: this.current.name, text: this.current.text } : null; }
}

function loadSettings() {
  const s = { ...DEFAULT_SETTINGS };
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) { const j = JSON.parse(raw); if (typeof j.subtitles === 'boolean') s.subtitles = j.subtitles; if (typeof j.voice === 'boolean') s.voice = j.voice; if (typeof j.volume === 'number') s.volume = Math.max(0, Math.min(1, j.volume)); }
    }
  } catch (e) { /* corrupt or unavailable storage: defaults */ }
  return s;
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const nowS = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
