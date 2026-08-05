/**
 * The director interprets a chapter's step list: drives the camera, the cast's
 * performances, the interface and the mix. It is a small cooperative state
 * machine — each step either completes instantly or sets a wait condition, so
 * the whole thing advances deterministically from `update(dt)`.
 */
import * as THREE from 'three';
import { Character, type LedState } from '../engine/character';
import type { ExpressionName, PoseName } from '../engine/character';
import { CameraRig } from './camera';
import { lineDuration, type Chapter, type ChoiceOption, type Step } from './script';
import type { GameSet } from '../sets/types';
import type { UI } from './ui';
import { audio } from '../engine/audio';
import { CAST } from './cast';
import { clamp } from '../engine/math';
import type { PostFX } from '../engine/postfx';
import { Player } from './player';

export type GameState = {
  flags: Set<string>;
  stats: Record<string, number>;
  nodes: Set<string>;
  instability: number;
};

export type DirectorEvents = {
  onChapterEnd: (outcome: string, state: GameState) => void;
  onNeedInput: (kind: 'choice' | 'qte' | 'scan' | 'continue' | 'explore' | null) => void;
};

export class Director {
  chars = new Map<string, Character>();
  rig: CameraRig;
  state: GameState = { flags: new Set(), stats: {}, nodes: new Set(), instability: 0.08 };
  /** When seeking, stop fast-forwarding as soon as a roam phase is reached. */
  haltOnExplore = false;
  seekHalted = false;
  /** Free-roam controller, created lazily for the chapter's protagonist. */
  player: Player | null = null;
  private explore: {
    require: Set<string>;
    goal: { pos: THREE.Vector3; radius: number } | null;
    timeout: number;
    demoPath: THREE.Vector3[];
    demoIndex: number;
  } | null = null;
  private pc = 0;
  private steps: Step[];
  private labels = new Map<string, number>();
  private wait = 0;
  private blocked: 'choice' | 'qte' | 'scan' | 'continue' | 'explore' | null = null;
  private chapter: Chapter;
  private set: GameSet;
  private ui: UI;
  private fx: PostFX;
  private timeScale = 1;
  private slowmoLeft = 0;
  private demoMode = false;
  private demoChoiceIndex = 0;
  private demoDelay = 0;
  private speaking: { who: string; left: number } | null = null;
  private preconLeft = 0;
  private preconTotal = 0;
  finished = false;
  onEvents: DirectorEvents;
  /** Set true while a chapter is being fast-forwarded to a timestamp. */
  fastForward = false;

  constructor(
    chapter: Chapter,
    set: GameSet,
    ui: UI,
    fx: PostFX,
    events: DirectorEvents,
    opts: { demo?: boolean; state?: GameState } = {},
  ) {
    this.chapter = chapter;
    this.set = set;
    this.ui = ui;
    this.fx = fx;
    this.onEvents = events;
    this.steps = chapter.steps;
    this.demoMode = opts.demo ?? false;
    if (opts.state) this.state = opts.state;

    for (let i = 0; i < this.steps.length; i++) {
      const s = this.steps[i];
      if (s.t === 'label') this.labels.set(s.name, i);
    }

    this.rig = new CameraRig(set.camera, (spec) => this.resolveTarget(spec));
    this.rig.attachPost(fx);
  }

  /** Instantiate the chapter's cast at their marks. */
  spawnCast(quality: number): void {
    for (const entry of this.chapter.cast) {
      const spec = CAST[entry.spec] ?? CAST.connor;
      const ch = new Character({ ...spec, id: entry.id }, quality);
      const mark = this.set.marks[entry.mark];
      if (mark) {
        ch.setPosition(mark.pos[0], mark.pos[1], mark.pos[2]);
        ch.setRotationY(mark.rotY);
      }
      if (entry.pose) ch.applyPoseImmediate(entry.pose);
      if (entry.expr) ch.setExpression(entry.expr, 1);
      if (entry.led) ch.setLed(entry.led);
      ch.group.visible = !entry.hidden;
      this.set.scene.add(ch.group);
      this.chars.set(entry.id, ch);
    }
  }

  private resolveTarget(spec: string): THREE.Vector3 | null {
    const [id, part] = spec.split(':');
    const ch = this.chars.get(id);
    if (ch) return ch.worldPoint(part || 'headCenter', new THREE.Vector3());
    const mark = this.set.marks[id];
    if (mark) return new THREE.Vector3(mark.pos[0], mark.pos[1] + 1.5, mark.pos[2]);
    return null;
  }

  private jump(label: string): void {
    const i = this.labels.get(label);
    if (i === undefined) {
      console.warn(`[director] unknown label: ${label}`);
      this.pc = this.steps.length;
      return;
    }
    this.pc = i;
  }

  /* ------------------------------------------------------------ execution */

  update(dtRaw: number): void {
    if (this.finished) return;
    if (this.slowmoLeft > 0) {
      this.slowmoLeft -= dtRaw;
      if (this.slowmoLeft <= 0) this.timeScale = 1;
    }
    const dt = dtRaw * this.timeScale;

    // Free roam drives the camera itself; the cinematic rig stands down.
    if (this.blocked === 'explore' && this.player) {
      this.updateExplore(dt);
      for (const ch of this.chars.values()) ch.update(dt, performance.now() / 1000);
      return;
    }

    for (const ch of this.chars.values()) ch.update(dt, performance.now() / 1000);
    this.rig.update(dt);

    if (this.speaking) {
      this.speaking.left -= dt;
      if (this.speaking.left <= 0) {
        this.chars.get(this.speaking.who)?.stopTalking();
        this.speaking = null;
      }
    }

    if (this.preconLeft > 0) {
      this.preconLeft -= dt;
      this.ui.updatePrecon(1 - this.preconLeft / this.preconTotal);
      if (this.preconLeft <= 0) this.ui.hidePrecon();
    }

    if (this.blocked === 'choice') {
      this.ui.updateChoiceTimer(dt);
      if (this.demoMode) {
        this.demoDelay -= dt;
        if (this.demoDelay <= 0 && this.ui.choosing) {
          const idx = this.chapter.demoChoices?.[this.demoChoiceIndex] ?? 0;
          this.ui.highlight(idx);
          this.ui.pick(idx);
        }
      }
      return;
    }
    if (this.blocked === 'qte') {
      this.ui.updateQte(dt);
      return;
    }
    if (this.blocked === 'scan') return;
    if (this.blocked === 'continue') return;

    if (this.wait > 0) {
      this.wait -= dt;
      if (this.wait > 0) return;
    }

    // Run steps until something blocks or waits.
    let guard = 0;
    while (this.wait <= 0 && !this.blocked && this.pc < this.steps.length && guard++ < 400) {
      const step = this.steps[this.pc++];
      this.exec(step);
    }
    if (this.pc >= this.steps.length && !this.blocked && this.wait <= 0 && !this.finished) {
      this.finish('complete');
    }
  }

  private finish(outcome: string): void {
    this.finished = true;
    this.ui.clearSay();
    this.onEvents.onChapterEnd(outcome, this.state);
  }

  private char(id: string): Character | undefined {
    const c = this.chars.get(id);
    if (!c) console.warn(`[director] no character "${id}"`);
    return c;
  }

  private applyLook(ch: Character, look: string | null | undefined): void {
    if (look === undefined) return;
    if (look === null || look === '') {
      ch.lookAt(null);
      return;
    }
    if (look === 'camera') {
      ch.lookAt(this.set.camera.position.clone(), 1);
      return;
    }
    const other = this.chars.get(look.split(':')[0]);
    if (other) ch.lookAt(other, 1);
    else {
      const p = this.resolveTarget(look);
      if (p) ch.lookAt(p, 1);
    }
  }

  private exec(step: Step): void {
    switch (step.t) {
      case 'shot': {
        const { t: _t, ...shot } = step;
        void _t;
        this.rig.play(shot);
        break;
      }
      case 'say': {
        const ch = this.char(step.who);
        const dur = step.dur ?? lineDuration(step.text);
        const name = ch ? ch.spec.name : step.who.toUpperCase();
        this.ui.say(name, step.text, step.think);
        if (ch) {
          if (step.pose) ch.setPose(step.pose);
          if (step.expr) ch.setExpression(step.expr, step.exprW ?? 1);
          if (step.led) ch.setLed(step.led);
          this.applyLook(ch, step.look);
          if (!step.think) {
            ch.say(dur, 1, step.gesture !== 0);
            if (step.gesture !== undefined && step.gesture >= 0) ch.playGesture(step.gesture, dur * 0.7, 1);
            if (!step.silent) audio.voice(ch.spec.female ? 1.05 : 0.95, dur, ch.spec.female);
          }
          this.speaking = { who: step.who, left: dur };
        }
        this.wait = dur + 0.28;
        break;
      }
      case 'do': {
        const ch = this.char(step.who);
        if (!ch) break;
        if (step.pose) ch.setPose(step.pose, step.blend ?? 0.55);
        if (step.expr) ch.setExpression(step.expr, step.exprW ?? 1);
        if (step.led) ch.setLed(step.led);
        if (step.shiver !== undefined) ch.setShiver(step.shiver);
        if (step.gesture !== undefined) ch.playGesture(step.gesture, 1.2, 1);
        if (step.talk) ch.say(step.talk, 0.8, false);
        this.applyLook(ch, step.look);
        if (step.mark) {
          const m = this.set.marks[step.mark];
          if (m) {
            ch.setPosition(m.pos[0], m.pos[1], m.pos[2]);
            ch.setRotationY(m.rotY);
          }
        }
        if (step.walkTo) {
          const m = this.set.marks[step.walkTo];
          if (m) ch.walkTo(m.pos[0], m.pos[2], 1.1, true);
        }
        break;
      }
      case 'choice': {
        this.blocked = 'choice';
        this.demoDelay = this.fastForward ? 0.05 : 1.5 + Math.random() * 0.8;
        this.onEvents.onNeedInput('choice');
        const opts = step.options.filter((o) => !o.requires || this.state.flags.has(o.requires));
        audio.uiOpen();
        this.ui.askChoice(opts, step.time ?? 8, (i) => {
          this.blocked = null;
          this.onEvents.onNeedInput(null);
          this.demoChoiceIndex++;
          const o = opts[i] as ChoiceOption | undefined;
          audio.uiSelect();
          if (!o) return;
          if (o.flag) this.state.flags.add(o.flag);
          if (o.node) this.state.nodes.add(o.node);
          if (o.stat) this.state.stats[o.stat[0]] = (this.state.stats[o.stat[0]] ?? 0) + o.stat[1];
          if (o.instability) this.bumpInstability(o.instability);
          if (o.goto) this.jump(o.goto);
        });
        break;
      }
      case 'qte': {
        this.blocked = 'qte';
        this.onEvents.onNeedInput('qte');
        if (step.slowmo) {
          this.timeScale = step.slowmo;
          this.slowmoLeft = (step.window ?? 1.6) + 0.6;
        }
        audio.stress();
        if (this.fastForward && this.haltOnExplore) {
          // Seek mode asked to stop here: play the roam phase for real.
          this.seekHalted = true;
        } else if (this.fastForward) {
          window.setTimeout(() => {
            for (let i = 0; i < 10; i++) this.ui.qteKey(step.key);
          }, 0);
        }
        this.ui.askQte(step.key, step.kind ?? 'press', step.window ?? 1.6, step.caption ?? '', (ok) => {
          this.blocked = null;
          this.onEvents.onNeedInput(null);
          this.timeScale = 1;
          this.slowmoLeft = 0;
          if (ok) {
            audio.qteHit();
            this.rig.addShake((step.shake ?? 0.4) * 0.5);
          } else {
            audio.qteMiss();
            this.rig.addShake(step.shake ?? 0.6);
            this.bumpInstability(0.06);
            if (step.onFail) this.jump(step.onFail);
          }
        });
        break;
      }
      case 'explore': {
        const ch = this.char(step.who);
        if (!ch) break;
        if (this.fastForward && this.haltOnExplore) {
          // Seek mode asked to stop here: play the roam phase for real.
          this.seekHalted = true;
        } else if (this.fastForward) {
          // Seeking past a roam phase: award its clues and drop the character
          // at the objective so the following cinematics still line up.
          for (const id of step.require ?? []) {
            const it = this.set.interactables?.find((x) => x.id === id);
            if (it?.flag) this.state.flags.add(it.flag);
          }
          const gm = step.goal ? this.set.marks[step.goal.mark] : undefined;
          if (gm) {
            ch.setPosition(gm.pos[0], gm.pos[1], gm.pos[2]);
            ch.setRotationY(gm.rotY);
          }
          break;
        }
        if (!this.player) {
          this.player = new Player(ch, this.set.camera);
          this.player.attachPost(this.fx);
        }
        this.player.configure({
          colliders: this.set.colliders,
          interactables: this.set.interactables,
          bounds: this.set.bounds,
          scene: this.set.scene,
          // Interiors are already lit; exteriors at night need the full rig.
          keyScale: this.set.name === 'apartment' || this.set.name === 'interrogation' ? 0.45 : 1,
        });
        this.player.activate();
        const goalMark = step.goal ? this.set.marks[step.goal.mark] : undefined;
        this.explore = {
          require: new Set(step.require ?? []),
          goal: goalMark
            ? { pos: new THREE.Vector3(...goalMark.pos), radius: step.goal?.radius ?? 1.4 }
            : null,
          timeout: step.timeout ?? 180,
          demoPath: (step.demoPath ?? []).map((m) => {
            const mk = this.set.marks[m];
            const it = this.set.interactables?.find((x) => x.id === m);
            if (mk) return new THREE.Vector3(...mk.pos);
            if (it) return new THREE.Vector3(it.at[0], 0, it.at[2]);
            return new THREE.Vector3();
          }),
          demoIndex: 0,
        };
        if (step.objective) this.ui.setObjective(step.objective);
        this.ui.showControls(true);
        this.ui.showScanHint(true);
        this.blocked = 'explore';
        this.onEvents.onNeedInput('explore');
        break;
      }
      case 'scan': {
        const targets = this.set.scanTargets ?? [];
        if (!targets.length) break;
        this.blocked = 'scan';
        this.onEvents.onNeedInput('scan');
        audio.scanOn();
        if (this.fastForward && this.haltOnExplore) {
          // Seek mode asked to stop here: play the roam phase for real.
          this.seekHalted = true;
        } else if (this.fastForward) {
          this.blocked = null;
          this.onEvents.onNeedInput(null);
          for (const t of targets.slice(0, step.need ?? targets.length)) {
            if (t.flag) this.state.flags.add(t.flag);
          }
          this.state.stats.clues = (this.state.stats.clues ?? 0) + (step.need ?? targets.length);
          break;
        }
        this.ui.beginScan(targets, step.need ?? targets.length, (found) => {
          this.blocked = null;
          this.onEvents.onNeedInput(null);
          for (const id of found) {
            const t = targets.find((x) => x.id === id);
            if (t?.flag) this.state.flags.add(t.flag);
          }
          this.state.stats.clues = (this.state.stats.clues ?? 0) + found.length;
        });
        break;
      }
      case 'precon': {
        this.preconTotal = step.dur ?? 2.4;
        this.preconLeft = this.preconTotal;
        this.ui.showPrecon(step.label ?? 'SIMULATING…');
        this.fx.glitch = 0.4;
        window.setTimeout(() => {
          this.fx.glitch = 0;
        }, (step.dur ?? 2.4) * 1000);
        this.wait = this.preconTotal;
        break;
      }
      case 'wait':
        this.wait = step.dur;
        break;
      case 'goto':
        this.jump(step.label);
        break;
      case 'label':
        break;
      case 'if': {
        const has = this.state.flags.has(step.flag);
        if (step.not ? !has : has) this.jump(step.goto);
        break;
      }
      case 'ifStat': {
        const v = this.state.stats[step.name] ?? 0;
        const okMin = step.min === undefined || v >= step.min;
        const okMax = step.max === undefined || v <= step.max;
        if (okMin && okMax) this.jump(step.goto);
        break;
      }
      case 'set':
        if (step.value === false) this.state.flags.delete(step.flag);
        else this.state.flags.add(step.flag);
        break;
      case 'stat':
        this.state.stats[step.name] = (this.state.stats[step.name] ?? 0) + step.delta;
        break;
      case 'instability':
        this.bumpInstability(step.delta);
        break;
      case 'title':
        this.ui.showCard(step.kicker ?? '', step.title, step.sub ?? '');
        this.wait = step.dur ?? 3.4;
        window.setTimeout(() => this.ui.hideCard(), (step.dur ?? 3.4) * 1000 - 400);
        break;
      case 'fade':
        if (step.to === 'in') this.ui.setFade(false, false, step.dur ?? 0.8);
        else this.ui.setFade(true, step.to === 'white', step.dur ?? 0.8);
        this.wait = step.dur ?? 0.8;
        break;
      case 'flash':
        this.fx.flash = step.power ?? 0.7;
        window.setTimeout(() => {
          this.fx.flash = 0;
        }, 120);
        break;
      case 'sfx': {
        const fn = (audio as unknown as Record<string, () => void>)[step.name];
        if (typeof fn === 'function') fn.call(audio);
        break;
      }
      case 'music':
        if (step.stop) audio.stopMusic();
        else audio.playCue(step.mood ?? 0, step.level ?? 0.45);
        break;
      case 'ambience':
        if (step.stop) audio.stopAmbience();
        else {
          if (step.rain !== undefined) audio.rain(step.rain);
          if (step.drone !== undefined) audio.drone(52, step.drone);
        }
        break;
      case 'objective':
        this.ui.setObjective(step.text, step.done);
        break;
      case 'hud':
        this.ui.showHud(step.show, step.actor, step.model);
        break;
      case 'action': {
        const fn = this.set.actions?.[step.name];
        if (fn) fn(step.on ?? true);
        break;
      }
      case 'letterbox':
        this.ui.setLetterbox(step.on);
        break;
      case 'node':
        this.state.nodes.add(step.id);
        break;
      case 'lightning':
        this.set.lightning?.strike(step.delay ?? 0);
        audio.thunder();
        break;
      case 'shake':
        this.rig.addShake(step.power);
        break;
      case 'slowmo':
        this.timeScale = step.scale;
        this.slowmoLeft = step.dur ?? 1.2;
        break;
      case 'toast':
        this.ui.toast(step.text, step.warn);
        break;
      case 'chapterEnd':
        this.finish(step.outcome);
        break;
      default:
        break;
    }
  }

  setDemo(on: boolean): void {
    this.demoMode = on;
    if (!on) this.player?.order(null);
  }

  /** Seek stopped on a roam step; the phase is already live, so just clear the flag. */
  resumeExploreAfterSeek(): void {
    this.seekHalted = false;
    // The seek ran a slice of this phase in demo mode; drop its orders so the
    // player is not fighting the autopilot.
    this.player?.order(null);
    this.player?.activate();
    if (this.explore) {
      this.explore.timeout = 240;
      this.explore.demoIndex = 0;
    }
  }

  /* ----------------------------------------------------------- free roam */

  private updateExplore(dt: number): void {
    const p = this.player!;
    const ex = this.explore!;
    ex.timeout -= dt;

    // Autoplay walks the authored path, pausing to examine what it passes.
    if (this.demoMode) {
      if (p.botDone) {
        if (ex.demoIndex < ex.demoPath.length) {
          p.order({ to: ex.demoPath[ex.demoIndex], radius: 1.1 });
          ex.demoIndex++;
        } else if (ex.goal) {
          p.order({ to: ex.goal.pos, radius: ex.goal.radius });
        } else {
          p.order(null);
        }
      }
      // Examine whatever is in reach as it walks past.
      if (p.nearest) this.useInteractable();
    }

    if (this.thinkLeft > 0) {
      this.thinkLeft -= dt;
      if (this.thinkLeft <= 0) {
        this.ui.clearSay();
        p.character.setLed('blue');
      }
    }

    p.update(dt);
    this.ui.setPrompt(p.nearest ? p.nearest.label : null);
    this.ui.updateWorldMarkers(this.set.camera, p.interactableList, p.used, ex.goal?.pos ?? null);

    const requireDone = [...ex.require].every((id) => p.used.has(id));
    let goalDone = true;
    if (ex.goal) {
      const pos = p.character.group.position;
      goalDone = Math.hypot(ex.goal.pos.x - pos.x, ex.goal.pos.z - pos.z) <= ex.goal.radius;
    }
    if ((requireDone && goalDone) || ex.timeout <= 0) this.endExplore();
  }

  /** Examine the nearest object: sets its flag and shows the thought line. */
  useInteractable(): void {
    const p = this.player;
    if (!p || this.blocked !== 'explore') return;
    const it = p.interact();
    if (!it) return;
    if (it.flag) this.state.flags.add(it.flag);
    this.state.stats.clues = (this.state.stats.clues ?? 0) + 1;
    audio.scanFound();
    if (it.think) {
      const who = p.character.spec.name;
      this.ui.say(who, it.think, true);
      p.character.setLed('yellow');
      this.thinkLeft = 3.4;
    }
  }
  private thinkLeft = 0;

  private endExplore(): void {
    this.player?.deactivate();
    this.explore = null;
    this.blocked = null;
    this.ui.setPrompt(null);
    this.ui.showControls(false);
    this.ui.showScanHint(false);
    this.ui.clearWorldMarkers();
    this.ui.clearSay();
    this.rig.syncFromCamera();
    this.onEvents.onNeedInput(null);
  }

  get exploring(): boolean {
    return this.blocked === 'explore';
  }

  bumpInstability(delta: number): void {
    this.state.instability = clamp(this.state.instability + delta);
    this.ui.setInstability(this.state.instability);
    if (delta > 0.04) audio.stress();
  }

  /* ---------------------------------------------------------------- input */

  keyDown(key: string): boolean {
    if (this.blocked === 'explore') {
      const k = key.toLowerCase();
      if (k === 'e' || key === 'Enter') {
        this.useInteractable();
        return true;
      }
      if (key === 'Tab') {
        // Analysis mode is available on demand during free roam.
        const targets = this.set.scanTargets ?? [];
        if (targets.length) {
          audio.scanOn();
          this.ui.beginScan(targets, targets.length, (found) => {
            for (const id of found) {
              const t = targets.find((x) => x.id === id);
              if (t?.flag) this.state.flags.add(t.flag);
            }
            this.state.stats.clues = (this.state.stats.clues ?? 0) + found.length;
          });
        }
        return true;
      }
      return false;
    }
    if (this.blocked === 'choice') {
      const n = Number(key);
      if (n >= 1 && n <= 4) {
        this.ui.pick(n - 1);
        return true;
      }
      if (key === 'ArrowLeft' || key === 'a') {
        this.ui.moveHighlight(-1);
        audio.uiMove();
        return true;
      }
      if (key === 'ArrowRight' || key === 'd') {
        this.ui.moveHighlight(1);
        audio.uiMove();
        return true;
      }
      if (key === 'Enter' || key === ' ') {
        this.ui.pick(this.ui.highlighted);
        return true;
      }
      return true;
    }
    if (this.blocked === 'qte') {
      this.ui.qteKey(key === ' ' ? ' ' : key);
      return true;
    }
    if (this.ui.scanning) {
      if (key === 'Enter' || key === ' ' || key === 'e') {
        const t = this.ui.confirmScan();
        if (t) audio.scanFound();
        return true;
      }
      if (key === 'Tab' || key === 'Escape') {
        this.ui.endScan();
        return true;
      }
    }
    return false;
  }

  click(): boolean {
    if (this.ui.scanning) {
      const t = this.ui.confirmScan();
      if (t) audio.scanFound();
      return true;
    }
    return false;
  }

  get needsScanPointer(): boolean {
    return this.blocked === 'scan';
  }

  dispose(): void {
    for (const ch of this.chars.values()) {
      this.set.scene.remove(ch.group);
      ch.dispose();
    }
    this.chars.clear();
  }
}

export type { Chapter, PoseName, ExpressionName, LedState };
