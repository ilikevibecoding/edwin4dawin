import * as THREE from 'three';
import type { Engine } from '../core/Engine';
import type { SceneSet } from '../sets/SceneSet';
import type { Actor } from '../actors/Actor';
import { CameraRig, type MoveKind } from '../cine/CameraRig';
import {
  closeUp,
  establish,
  insert,
  lowAngle,
  medium,
  overShoulder,
  single,
  twoShot,
  type Shot,
} from '../cine/Framing';
import { Hud, type ChoiceOption, type QteKey } from '../ui/Hud';
import { AudioEngine } from '../audio/Audio';
import { StoryState, type ChapterFlow } from './State';
import { Deferred, clamp01, damp } from '../core/Time';
import type { GRADE } from '../render/LookConfig';

/**
 * The Director.
 *
 * Chapters are written as plain async functions against this object, so a scene
 * reads roughly like a screenplay: cut to a shot, play a line, offer a choice,
 * branch on the result. Everything it awaits is timed against the game clock,
 * which means the identical script produces an identical performance whether it
 * is played live or advanced one fixed step at a time for an offline render.
 */

export interface DialogueOptions {
  /** Seconds to hold the line; defaults to a reading-speed estimate. */
  hold?: number;
  /** Internal monologue: no speaker name, italic. */
  thought?: boolean;
  /** Animation to play as a gesture while speaking. */
  gesture?: string;
  /** Pose to blend in for the line. */
  pose?: string;
  /** Extra pause after the line. */
  beat?: number;
  /** Skip the automatic look-at between speaker and listener. */
  noLook?: boolean;
}

export interface ChoiceSpec extends ChoiceOption {
  /** Line the player character says if this is picked. */
  line?: string;
  /** Voice id for that line. */
  voice?: string;
  /** Applied when picked. */
  effect?: () => void;
}

export interface QteSpec {
  keys: QteKey[];
  /** Seconds allowed per key. */
  window?: number;
  /** World point to anchor the badges to. */
  anchor?: THREE.Vector3;
  label?: string;
}

/** Recorded for the offline renderer so audio can be mixed to the same timeline. */
export interface AudioCue {
  time: number;
  kind: 'voice' | 'sfx' | 'music';
  id: string;
}

export class Director {
  readonly rig: CameraRig;
  readonly state = new StoryState();
  readonly hud: Hud;
  readonly audio: AudioEngine;
  /** Timeline of audio events, used to build the soundtrack of a rendered video. */
  readonly cues: AudioCue[] = [];

  set: SceneSet;
  /** Set while a modal interaction owns the frame. */
  private choice: {
    options: ChoiceSpec[];
    deadline: number;
    started: number;
    deferred: Deferred<number>;
    index: number;
  } | null = null;
  private qte: {
    spec: QteSpec;
    index: number;
    deadline: number;
    started: number;
    deferred: Deferred<boolean>;
    failed: boolean;
  } | null = null;
  private scan: {
    total: number;
    found: Set<string>;
    deferred: Deferred<void>;
    required: number;
  } | null = null;

  /** Actor the portrait rig is following. */
  private subject: Actor | null = null;
  private subjectSide = 1;
  private speaking: Actor | null = null;
  private freeLook = { yaw: 0, pitch: 0, active: false };
  /** Muted during offline render: WebAudio cannot be captured from a screenshot. */
  silent = false;

  constructor(readonly engine: Engine, set: SceneSet, opts: { silent?: boolean } = {}) {
    this.set = set;
    this.rig = new CameraRig(set.camera);
    this.hud = new Hud(engine.renderer.domElement.parentElement ?? document.body);
    this.audio = new AudioEngine();
    this.silent = opts.silent ?? false;
  }

  // ------------------------------------------------------------------ plumbing

  get clock() {
    return this.engine.clock;
  }

  get input() {
    return this.engine.input;
  }

  useSet(set: SceneSet, grade: keyof typeof GRADE = 'noirRain'): void {
    this.set = set;
    this.engine.setStage(set, grade);
    (this.rig as unknown as { camera: THREE.PerspectiveCamera }).camera = set.camera;
  }

  wait(seconds: number, skippable = false): Promise<void> {
    return this.clock.wait(seconds, skippable);
  }

  /** Fires an SFX and records it on the render timeline. */
  sfx(kind: 'thunder' | 'bang' | 'blipSelect' | 'blipConfirm' | 'blipScan' | 'blipFound' | 'blipFail' | 'heartbeat', level = 1): void {
    this.cues.push({ time: this.clock.time, kind: 'sfx', id: `${kind}:${level.toFixed(2)}` });
    if (this.silent) return;
    switch (kind) {
      case 'thunder':
        this.audio.thunder(1 - level);
        break;
      case 'bang':
        this.audio.bang({ level });
        break;
      case 'heartbeat':
        this.audio.heartbeat(level);
        break;
      case 'blipSelect':
        this.audio.blip('select');
        break;
      case 'blipConfirm':
        this.audio.blip('confirm');
        break;
      case 'blipScan':
        this.audio.blip('scan');
        break;
      case 'blipFound':
        this.audio.blip('found');
        break;
      case 'blipFail':
        this.audio.blip('fail');
        break;
    }
  }

  // -------------------------------------------------------------------- camera

  /** Cuts to a shot. Named framings are resolved against live actor positions. */
  cut(shot: Shot, opts: { blend?: number; move?: MoveKind; moveAmount?: number; moveDuration?: number; handheld?: number } = {}): void {
    this.rig.cut(shot, opts);
    if (!opts.blend) this.rig.snap();
  }

  /** Re-derives the current shot every frame so the camera tracks a mover. */
  follow(build: () => Shot): () => void {
    const fn = (): void => this.rig.retarget(build());
    this.trackers.push(fn);
    return () => {
      this.trackers = this.trackers.filter((t) => t !== fn);
    };
  }

  private trackers: (() => void)[] = [];

  shots = { closeUp, medium, single, overShoulder, twoShot, establish, lowAngle, insert };

  /** Points the portrait rig at an actor for the coming beat. */
  light(actor: Actor, side = 1): void {
    this.subject = actor;
    this.subjectSide = side;
  }

  shake(strength = 0.6, decay = 2.4): void {
    this.rig.impulse(strength, decay);
  }

  flash(strength = 1, color: THREE.ColorRepresentation = 0xffffff): void {
    this.engine.postFX?.flash(strength, color);
  }

  slowMotion(scale: number, ramp = 0.35): void {
    this.clock.rampTimeScale(scale, ramp);
  }

  // ------------------------------------------------------------------ dialogue

  /**
   * Plays a line: subtitle, voice, gesture, lip sync, and a hold long enough to
   * read it. Returns when the line is done.
   */
  async say(actor: Actor | string, text: string, voiceId?: string, opts: DialogueOptions = {}): Promise<void> {
    const speaker = typeof actor === 'string' ? null : actor;
    const name = typeof actor === 'string' ? actor : actor.name;
    this.speaking = speaker;
    this.hud.say(name, text, { thought: opts.thought });

    let duration = opts.hold ?? readingTime(text);
    if (voiceId) {
      this.cues.push({ time: this.clock.time, kind: 'voice', id: voiceId });
      if (!this.silent && this.audio.hasLine(voiceId)) {
        const played = await this.audio.playLine(voiceId);
        duration = Math.max(duration, played + 0.35);
      } else {
        duration = Math.max(duration, this.audio.lineDuration(voiceId, duration) + 0.35);
      }
    }

    if (speaker) {
      if (opts.gesture && speaker.hasClip(opts.gesture)) speaker.play(opts.gesture, { fade: 0.3, loop: false });
      if (opts.pose) speaker.setPose(opts.pose, 0.85, { fadeIn: 0.35 });
    }

    await this.wait(duration, true);
    this.hud.clearSubtitle();
    if (speaker) {
      speaker.setMouth(0);
      if (opts.pose) speaker.clearPose(opts.pose, 0.5);
    }
    this.speaking = null;
    if (opts.beat) await this.wait(opts.beat);
  }

  /** Non-blocking line: used when two characters talk over each other. */
  bark(actor: Actor | string, text: string, voiceId?: string, hold = 1.6): void {
    void this.say(actor, text, voiceId, { hold });
  }

  // -------------------------------------------------------------------- choices

  /**
   * Offers a timed choice. Returns the id of whatever the player picked, or of
   * the last option if the clock runs out — silence is a decision, which is the
   * whole point of putting a timer on it.
   */
  async choose(options: ChoiceSpec[], opts: { seconds?: number; defaultId?: string } = {}): Promise<string> {
    const seconds = opts.seconds ?? 8;
    this.hud.showChoices(options);
    this.hud.setChoiceTimer(1);
    const deferred = new Deferred<number>();
    this.choice = {
      options,
      started: this.clock.time,
      deadline: this.clock.time + seconds,
      deferred,
      index: Math.floor(options.length / 2),
    };
    this.hud.highlightChoice(this.choice.index);

    const index = await deferred.promise;
    const picked = options[index] ?? options[options.length - 1];
    this.hud.markChoicePicked(index);
    this.sfx('blipConfirm');
    await this.wait(0.35);
    this.hud.hideChoices();
    this.choice = null;
    picked.effect?.();
    this.state.visit(picked.id);
    if (picked.line) {
      const speaker = this.playerActor;
      if (speaker) await this.say(speaker, picked.line, picked.voice);
    }
    return picked.id;
  }

  /** The actor the player is controlling; choices are spoken by them. */
  playerActor: Actor | null = null;

  // ------------------------------------------------------------------------ QTE

  /**
   * Quick-time sequence. Each key must be pressed inside its window; a miss ends
   * the sequence immediately and returns false, which lets a scene branch on a
   * fumbled action rather than just replaying it.
   */
  async qteSequence(spec: QteSpec): Promise<boolean> {
    const window = spec.window ?? 1.1;
    const anchors = spec.anchor
      ? spec.keys.map((_, i) => {
          const base = Hud.projectToAnchor(spec.anchor as THREE.Vector3, this.set.camera);
          return [
            clamp01(base[0] + (i - (spec.keys.length - 1) / 2) * 0.1),
            clamp01(base[1] - 0.06),
          ] as [number, number];
        })
      : undefined;
    this.hud.showQte(spec.keys, anchors);
    if (spec.label) this.hud.prompt(spec.label);
    const deferred = new Deferred<boolean>();
    this.qte = {
      spec,
      index: 0,
      started: this.clock.time,
      deadline: this.clock.time + window,
      deferred,
      failed: false,
    };
    const ok = await deferred.promise;
    await this.wait(0.4);
    this.hud.hideQte();
    this.hud.prompt(null);
    this.qte = null;
    return ok;
  }

  // ------------------------------------------------------------------ scanning

  /**
   * Investigation beat: the player pans the camera and marks clues. Resolves once
   * `required` of them are logged.
   */
  async scanScene(
    clues: { id: string; label: string; world: THREE.Vector3; note?: string }[],
    readout: [string, string][],
    opts: { required?: number; freeLook?: boolean } = {}
  ): Promise<string[]> {
    this.hud.beginScan(clues, readout);
    this.hud.prompt('MOVE <b>A</b> <b>D</b> &nbsp;·&nbsp; ANALYSE <b>E</b>');
    if (opts.freeLook !== false) this.freeLook.active = true;
    const deferred = new Deferred<void>();
    this.scan = {
      total: clues.length,
      found: new Set(),
      deferred,
      required: opts.required ?? clues.length,
    };
    this.clueNotes = new Map(clues.map((c) => [c.id, c.note ?? '']));
    await deferred.promise;
    this.freeLook.active = false;
    this.hud.prompt(null);
    await this.wait(0.5);
    const found = [...this.scan.found];
    this.hud.endScan();
    this.scan = null;
    for (const id of found) this.state.visit(id);
    return found;
  }

  private clueNotes = new Map<string, string>();

  // -------------------------------------------------------------- presentation

  async chapterCard(kicker: string, title: string, sub: string, hold = 3.2): Promise<void> {
    this.hud.showCard(kicker, title, sub);
    this.hud.fade(0, 0.8);
    await this.wait(hold);
    this.hud.hideCard();
    await this.wait(0.9);
  }

  async fadeOut(seconds = 1): Promise<void> {
    this.hud.fade(1, seconds);
    await this.wait(seconds + 0.15);
  }

  async fadeIn(seconds = 1.2): Promise<void> {
    this.hud.fade(0, seconds);
    await this.wait(seconds * 0.7);
  }

  async showFlow(flow: ChapterFlow, hold = 7): Promise<void> {
    this.hud.showFlow(flow, this.state);
    await this.wait(hold);
    this.hud.hideFlow();
  }

  // ------------------------------------------------------------------- walking

  /**
   * Walks an actor along a path with the walk cycle and facing handled. Actors
   * are moved by the script rather than by physics: the geography is small and
   * fixed, and a scripted walk always lands on its mark.
   */
  async walk(actor: Actor, points: THREE.Vector3[], opts: { speed?: number; run?: boolean; face?: THREE.Vector3 } = {}): Promise<void> {
    const speed = opts.speed ?? (opts.run ? 3.1 : 1.25);
    const clip = opts.run ? 'run' : 'walk';
    if (actor.hasClip(clip)) actor.play(clip, { fade: 0.28 });
    for (const target of points) {
      const from = actor.root.position.clone();
      const distance = from.distanceTo(target);
      if (distance < 0.02) continue;
      actor.faceToward(target);
      const duration = distance / speed;
      let elapsed = 0;
      while (elapsed < duration) {
        await this.frame();
        elapsed += Math.max(1e-4, this.clock.dt);
        const t = Math.min(1, elapsed / duration);
        actor.root.position.lerpVectors(from, target, t);
      }
      actor.root.position.copy(target);
    }
    if (actor.hasClip('idle')) actor.play('idle', { fade: 0.35 });
    if (opts.face) actor.faceToward(opts.face);
  }

  /** Resolves on the next rendered frame. */
  frame(): Promise<void> {
    return new Promise<void>((resolve) => this.frameWaiters.push(resolve));
  }

  private frameWaiters: (() => void)[] = [];

  // ----------------------------------------------------------------- per frame

  update(dt: number, time: number): void {
    for (const t of this.trackers) t();
    this.rig.update(dt, time, this.engine.postFX);

    if (this.subject) {
      this.set.lightSubject(this.subject.getEyePosition(new THREE.Vector3()).addScaledVector(new THREE.Vector3(0, 1, 0), -0.18), {
        keySide: this.subjectSide,
      });
    }

    // Lip sync from the live voice envelope.
    if (this.speaking) {
      const open = this.silent ? syntheticMouth(time) : this.audio.mouthOpen();
      this.speaking.setMouth(open);
    }

    this.tickChoice(dt);
    this.tickQte(dt);
    this.tickScan(dt);
    this.tickFreeLook(dt);

    if (!this.silent) this.audio.update(dt);
    this.hud.update(dt, this.set.camera, this.engine.width, this.engine.height);

    const waiters = this.frameWaiters;
    if (waiters.length) {
      this.frameWaiters = [];
      for (const w of waiters) w();
    }
  }

  private tickChoice(_dt: number): void {
    const c = this.choice;
    if (!c) return;
    const remaining = c.deadline - this.clock.time;
    this.hud.setChoiceTimer(remaining / Math.max(0.001, c.deadline - c.started));

    // Pointer picks by proximity; keys step through the arc.
    const hovered = this.hud.choiceAtCursor(this.input.mouseX, this.input.mouseY);
    if (hovered >= 0 && hovered !== c.index) {
      c.index = hovered;
      this.hud.highlightChoice(hovered);
      this.sfx('blipSelect');
    }
    if (this.input.actionPressed('left') && c.index > 0) {
      c.index--;
      this.hud.highlightChoice(c.index);
      this.sfx('blipSelect');
    }
    if (this.input.actionPressed('right') && c.index < c.options.length - 1) {
      c.index++;
      this.hud.highlightChoice(c.index);
      this.sfx('blipSelect');
    }
    const confirmed =
      this.input.actionPressed('confirm') || this.input.actionPressed('interact') || this.input.clicked;
    if (confirmed) {
      c.deferred.resolve(c.index);
      return;
    }
    if (remaining <= 0) {
      // Timed out: the "stay silent" option is always the last one.
      c.deferred.resolve(c.options.length - 1);
    }
  }

  private tickQte(_dt: number): void {
    const q = this.qte;
    if (!q) return;
    const key = q.spec.keys[q.index];
    const remaining = q.deadline - this.clock.time;
    const window = q.spec.window ?? 1.1;
    this.hud.setQteRing(q.index, remaining / window);

    if (this.input.wasPressed(Hud.codeFor(key))) {
      this.hud.markQte(q.index, true);
      this.sfx('blipFound');
      q.index++;
      if (q.index >= q.spec.keys.length) {
        q.deferred.resolve(true);
        return;
      }
      q.deadline = this.clock.time + window;
      return;
    }
    // Any other action key in the set counts as a wrong press.
    const wrong = (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyQ', 'Space'] as const).some(
      (code) => code !== Hud.codeFor(key) && this.input.wasPressed(code)
    );
    if (wrong || remaining <= 0) {
      this.hud.markQte(q.index, false);
      this.sfx('blipFail');
      q.deferred.resolve(false);
    }
  }

  private tickScan(_dt: number): void {
    const s = this.scan;
    if (!s) return;
    const clue = this.hud.clueUnderReticle(this.set.camera, this.engine.width, this.engine.height);
    if (clue) this.hud.prompt(`ANALYSE <b>E</b> &nbsp;·&nbsp; ${clue.label}`);
    else this.hud.prompt('MOVE <b>A</b> <b>D</b> &nbsp;·&nbsp; FIND EVIDENCE');
    if (clue && this.input.actionPressed('interact')) {
      s.found.add(clue.id);
      this.hud.markClueFound(clue.id);
      this.hud.setScanProgress(s.found.size, s.total);
      this.sfx('blipFound');
      const note = this.clueNotes.get(clue.id);
      if (note) this.hud.toast(note, 3.2);
      if (s.found.size >= s.required) s.deferred.resolve();
    }
  }

  /** Slow horizontal look, used during investigation beats. */
  private tickFreeLook(dt: number): void {
    if (!this.freeLook.active) return;
    const rate = 0.55;
    let dx = 0;
    if (this.input.actionDown('left')) dx -= rate;
    if (this.input.actionDown('right')) dx += rate;
    this.freeLook.yaw = damp(this.freeLook.yaw, this.freeLook.yaw + dx * dt * 2.2, 8, dt);
    this.lookYaw = this.freeLook.yaw;
  }

  /** Yaw offset applied by the chapter's investigation camera. */
  lookYaw = 0;

  resetLook(): void {
    this.freeLook.yaw = 0;
    this.lookYaw = 0;
  }

  // ------------------------------------------------- introspection for autoplay

  get pendingChoice(): { options: ChoiceSpec[]; index: number; remaining: number } | null {
    const c = this.choice;
    return c ? { options: c.options, index: c.index, remaining: c.deadline - this.clock.time } : null;
  }

  get pendingQte(): { key: QteKey; index: number; remaining: number } | null {
    const q = this.qte;
    return q
      ? { key: q.spec.keys[q.index], index: q.index, remaining: q.deadline - this.clock.time }
      : null;
  }

  get scanActive(): boolean {
    return this.scan !== null;
  }

  /** Screen-space centre of a HUD choice button, for pointing a virtual cursor. */
  choiceCentre(index: number): [number, number] | null {
    return this.hud.choiceCentre(index);
  }
}

/** Rough reading time for a subtitle: enough to read it and take a breath. */
export function readingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1.5, 0.42 + words * 0.34);
}

/** Mouth movement used when no voice pack is present. */
function syntheticMouth(time: number): number {
  const v = Math.sin(time * 15.3) * 0.5 + Math.sin(time * 24.7 + 1.1) * 0.3 + Math.sin(time * 9.1) * 0.2;
  return clamp01(Math.abs(v) * 0.9);
}
