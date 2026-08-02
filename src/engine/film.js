/**
 * The director: owns the timeline, builds scenes, and renders a frame for any
 * absolute time t.
 *
 * The whole film is a pure function of t. `renderFrame(t)` may be called with
 * times in any order and always produces the same image, which is what lets
 * `tools/render.mjs` split the movie across parallel headless browsers.
 *
 * SCENE MODULE CONTRACT
 * ---------------------
 *   export const meta = {
 *     id: 'chase',            // unique
 *     title: 'The Chase',     // for the scene picker
 *     duration: 30,           // seconds (overridden by the audio manifest)
 *     letterbox: 0.11,        // optional, ortho units per bar
 *     hardCutIn: false,       // skip the fade-in at the start
 *   };
 *   export async function build(ctx) {
 *     ...
 *     return { scene, camera, update(t) {} };
 *   }
 * `ctx` provides { THREE, sfx(t,name,opts), quality, aspect, manifest, lines }.
 */
import * as THREE from 'three';
import { Overlay } from './overlay.js';

export const FADE = 0.55;

export class Film {
  constructor({ modules, manifest = null, quality = 'high', aspect = 16 / 9 }) {
    this.modules = modules;
    this.manifest = manifest;
    this.quality = quality;
    this.aspect = aspect;
    this.overlay = new Overlay(aspect);
    this.sfxCues = [];
    this.built = new Map();
    this.currentIndex = -1;

    // Scene durations come from the audio manifest when it has an entry, so
    // narration is never clipped by a scene that is too short.
    this.entries = [];
    let t = 0;
    for (const m of modules) {
      const override = manifest?.scenes?.[m.meta.id]?.duration;
      const duration = override ?? m.meta.duration;
      this.entries.push({ module: m, meta: m.meta, start: t, duration, end: t + duration });
      t += duration;
    }
    this.duration = t;
    this.lines = manifest?.lines ?? [];
  }

  entryAt(t) {
    const c = Math.max(0, Math.min(this.duration - 1e-4, t));
    for (let i = 0; i < this.entries.length; i++) {
      if (c >= this.entries[i].start && c < this.entries[i].end) return i;
    }
    return this.entries.length - 1;
  }

  ctxFor(entry) {
    return {
      THREE,
      quality: this.quality,
      aspect: this.aspect,
      manifest: this.manifest,
      duration: entry.duration,
      /** Register a sound effect at a scene-local time. */
      sfx: (localT, name, opts = {}) => {
        this.sfxCues.push({ t: entry.start + localT, name, gain: opts.gain ?? 1, rate: opts.rate ?? 1 });
      },
      /** Narration lines that fall inside this scene, with scene-local times. */
      lines: this.lines
        .filter((l) => l.t >= entry.start - 1e-6 && l.t < entry.end)
        .map((l) => ({ ...l, local: l.t - entry.start })),
    };
  }

  async buildIndex(i) {
    if (this.built.has(i)) return this.built.get(i);
    const entry = this.entries[i];
    const inst = await entry.module.build(this.ctxFor(entry));
    if (!inst.scene || !inst.camera) throw new Error(`Scene ${entry.meta.id} must return {scene, camera, update}`);
    inst.camera.aspect = this.aspect;
    inst.camera.updateProjectionMatrix();
    this.built.set(i, inst);
    return inst;
  }

  /** Build every scene (used for interactive playback). */
  async buildAll(onProgress) {
    for (let i = 0; i < this.entries.length; i++) {
      await this.buildIndex(i);
      onProgress?.((i + 1) / this.entries.length, this.entries[i].meta.title);
    }
    this.sfxCues.sort((a, b) => a.t - b.t);
  }

  /** Build only the scenes touched by [t0, t1] (used by render workers). */
  async buildRange(t0, t1, onProgress) {
    const a = this.entryAt(t0);
    const b = this.entryAt(Math.max(t0, t1 - 1e-5));
    for (let i = a; i <= b; i++) {
      await this.buildIndex(i);
      onProgress?.((i - a + 1) / (b - a + 1), this.entries[i].meta.title);
    }
  }

  activeLine(t) {
    for (const l of this.lines) {
      if (l.subtitle === false) continue;
      if (t >= l.t - 0.05 && t <= l.t + l.dur + 0.35) return l;
    }
    return null;
  }

  /** Position everything for absolute time t (no drawing). */
  update(t) {
    const i = this.entryAt(t);
    const entry = this.entries[i];
    const inst = this.built.get(i);
    if (!inst) return null;
    const local = t - entry.start;
    inst.update(local);

    // Letterbox and fades
    const lb = entry.meta.letterbox ?? 0.105;
    this.overlay.setLetterbox(lb);

    let fade = 0;
    const fin = entry.meta.hardCutIn ? 0 : FADE;
    const fout = entry.meta.hardCutOut === true ? 0 : FADE;
    if (local < fin) fade = 1 - local / fin;
    if (entry.duration - local < fout) fade = Math.max(fade, 1 - (entry.duration - local) / fout);
    if (t < 1.2) fade = Math.max(fade, 1 - t / 1.2);
    if (this.duration - t < 2.0) fade = Math.max(fade, 1 - (this.duration - t) / 2.0);
    this.overlay.setFade(fade);

    // Subtitles
    const line = this.activeLine(t);
    if (line) {
      const isCharacter = line.speaker && line.speaker !== 'narrator';
      const label = isCharacter && line.speakerName ? `${line.speakerName.toUpperCase()}:  ${line.text}` : line.text;
      this.overlay.setSubtitle(label, {
        color: isCharacter ? '#ffe08a' : '#eef2f8',
        size: 44,
      });
      const dt = t - line.t;
      const fadeIn = Math.min(1, dt / 0.22);
      const fadeOut = Math.min(1, (line.t + line.dur + 0.35 - t) / 0.3);
      this.overlay.setSubtitleOpacity(Math.max(0, Math.min(fadeIn, fadeOut)));
    } else {
      this.overlay.setSubtitle(null);
    }

    this.overlay.update();
    this.currentIndex = i;
    return inst;
  }

  /** Update + draw. */
  renderFrame(renderer, t) {
    const inst = this.update(t);
    if (!inst) return false;
    renderer.setClearColor(inst.clearColor ?? 0x000000, 1);
    renderer.clear();
    renderer.render(inst.scene, inst.camera);
    this.overlay.render(renderer);
    return true;
  }

  sceneList() {
    return this.entries.map((e, i) => ({ i, id: e.meta.id, title: e.meta.title, start: e.start, duration: e.duration }));
  }
}
