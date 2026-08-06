import * as THREE from 'three';
import { Game } from '../engine/Game';
import { AutoPlan, Input } from '../engine/Input';
import { clamp, damp, lerp, smoothstep } from '../engine/math';
import { Hud } from '../ui/Hud';
import { Character } from '../world/Character';
import { GameSet } from '../world/sets/types';
import { buildApartment } from '../world/sets/apartment';
import { buildGarden } from '../world/sets/garden';
import { buildInterrogation } from '../world/sets/interrogation';
import { buildRooftop } from '../world/sets/rooftop';
import { buildStreet } from '../world/sets/street';
import { CAST } from './cast';
import { Anchor, Beat, ChoiceOption, FlowNode, MeterChange, ScanPoint, SetId, ShotSpec } from './types';

const SET_BUILDERS = {
  street: buildStreet,
  apartment: buildApartment,
  interrogation: buildInterrogation,
  garden: buildGarden,
  rooftop: buildRooftop,
} as const;

type Mode =
  | { kind: 'beat' }
  | { kind: 'line'; time: number; duration: number }
  | { kind: 'wait'; time: number; duration: number }
  | { kind: 'choice'; time: number; duration: number; options: ChoiceOption[]; hoverIndex: number; committed: boolean; commitTime: number }
  | { kind: 'qte'; time: number; window: number; keys: string[]; index: number; failed: boolean; resolveTime: number; onFail?: string }
  | { kind: 'scan'; found: boolean[]; points: ScanPoint[]; time: number; cursor: THREE.Vector2; noteTime: number; note: string; noteFor: number }
  | { kind: 'walk'; target: THREE.Vector3; time: number; limit: number }
  | { kind: 'flowchart'; time: number }
  | { kind: 'ended' };

export interface RunnerOptions {
  auto?: boolean;
  plan?: AutoPlan;
  /** Called when a chapter boundary is reached. */
  onChapter?: (id: string) => void;
}

const WORD_TIME = 0.42;
const MIN_LINE = 2.5;

export function lineDuration(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  const punct = (text.match(/[,.;:!?—]/g) ?? []).length;
  return Math.max(MIN_LINE, words * WORD_TIME + punct * 0.2 + 0.7);
}

/**
 * Interprets the story script: camera, staging, dialogue, timed choices, QTEs,
 * analysis and walk segments. Everything advances from the simulation clock so
 * an offline render is frame-for-frame identical to live play.
 */
export class StoryRunner {
  private beats: Beat[] = [];
  private index = 0;
  private mode: Mode = { kind: 'beat' };
  private labels = new Map<string, number>();
  private sets = new Map<SetId, GameSet>();
  private currentSet: SetId | null = null;

  readonly flags = new Set<string>();
  readonly meters: Record<string, number> = { voss: 0.35, deviancy: 0.1, noah: 0.2, ezra: 0.25 };
  readonly takenNodes = new Set<string>();
  choicesMade = 0;
  qteCount = 0;
  qteHits = 0;
  private chapterTitle = '';
  private fadeTarget = 0;
  private fade = 1;
  private slowmo = 1;
  private stressValue = 0;
  private stressShown = false;
  private walkYaw = 0;
  private playerKey = 'kai';
  private scanCursorTarget = new THREE.Vector2(0.5, 0.5);
  private hiddenActors = new Set<string>();
  private lightSubject: string | null = null;
  private auto: boolean;
  private plan: AutoPlan;
  private flowNodes: FlowNode[] = [];
  private pendingFlowchart: { chapter: string; nodes: FlowNode[] } | null = null;
  finished = false;
  ending: string[] = [];

  constructor(
    private game: Game,
    private hud: Hud,
    private input: Input,
    private opts: RunnerOptions = {},
  ) {
    this.auto = opts.auto ?? false;
    this.plan = opts.plan ?? { choices: [] };
  }

  load(beats: Beat[]) {
    this.beats = beats;
    this.labels.clear();
    beats.forEach((b, i) => {
      if (b.kind === 'label') this.labels.set(b.name, i);
    });
    this.index = 0;
    this.mode = { kind: 'beat' };
    this.finished = false;
  }

  jumpTo(label: string) {
    const idx = this.labels.get(label);
    if (idx === undefined) {
      console.warn(`unknown label ${label}`);
      this.finished = true;
      return;
    }
    this.index = idx + 1;
    this.mode = { kind: 'beat' };
  }

  /** Fast-forward through the script to a label, applying staging beats only. */
  seekToLabel(label: string) {
    const target = this.labels.get(label);
    if (target === undefined) return;
    for (let i = 0; i < target; i++) {
      const b = this.beats[i];
      if (b.kind === 'set' || b.kind === 'place' || b.kind === 'shot' || b.kind === 'meter' || b.kind === 'objective') {
        this.index = i;
        this.enterBeat(b);
      }
    }
    this.index = target + 1;
    this.mode = { kind: 'beat' };
    this.fade = 0;
    this.fadeTarget = 0;
  }

  // ------------------------------------------------------------------ helpers
  private actor(key: string): Character | null {
    return this.game.characters.get(key) ?? null;
  }

  private ensureActor(key: string): Character {
    const opts = CAST[key];
    if (!opts) throw new Error(`unknown cast member: ${key}`);
    return this.game.addCharacter(opts);
  }

  private resolveAnchor(anchor: Anchor, out = new THREE.Vector3()): THREE.Vector3 {
    if (Array.isArray(anchor)) return out.set(anchor[0], anchor[1], anchor[2]);
    if (anchor.startsWith('actor:')) {
      const who = anchor.slice(6);
      const c = this.actor(who);
      return c ? c.worldHeadPosition(out) : out.set(0, 1.5, 0);
    }
    if (anchor.startsWith('feet:')) {
      const c = this.actor(anchor.slice(5));
      return c ? out.copy(c.position) : out.set(0, 0, 0);
    }
    const set = this.game.set;
    const mark = set?.marks[anchor];
    return mark ? out.copy(mark) : out.set(0, 0, 0);
  }

  private applyShot(spec: ShotSpec) {
    const blend = spec.blend ?? 0;
    // Point the travelling rig at whoever this shot is about.
    if (spec.type === 'cu') this.lightSubject = spec.who;
    else if (spec.type === 'ots') this.lightSubject = spec.at;
    else if (spec.type === 'two') this.lightSubject = spec.a;
    else if (spec.type === 'free' && typeof spec.to === 'string' && spec.to.startsWith('actor:'))
      this.lightSubject = spec.to.slice(6);
    // Wide, non-actor shots read better on set light alone.
    const wide = spec.type === 'free' && !(typeof spec.to === 'string' && spec.to.startsWith('actor:'));
    this.game.lights.setStrength(wide ? 0.55 : 1);
    const common = {
      fov: spec.fov,
      aperture: spec.aperture,
      focalRange: spec.focalRange,
      handheld: spec.handheld,
      roll: spec.roll,
      dolly: spec.dolly,
      push: spec.push,
    };
    const dir = (yaw: number, side: number) =>
      new THREE.Vector3(Math.sin(yaw + side), 0, Math.cos(yaw + side));

    let from: () => THREE.Vector3;
    let to: () => THREE.Vector3;

    if (spec.type === 'cu') {
      const who = spec.who;
      const side = spec.side ?? 0.45;
      // Longer lens, further back: portrait compression instead of wide-angle
      // distortion, while keeping the authored framing.
      const lens = 0.72;
      const dist = (spec.dist ?? 0.78) / lens;
      const height = spec.height ?? 0.02;
      from = () => {
        const c = this.actor(who);
        if (!c) return new THREE.Vector3(0, 1.6, 2);
        const head = c.worldHeadPosition();
        return head.clone().add(dir(c.rotation.y, side).multiplyScalar(dist)).add(new THREE.Vector3(0, height, 0));
      };
      // Bias the look target so the head sits off centre with look room.
      to = () => {
        const c = this.actor(who);
        if (!c) return new THREE.Vector3(0, 1.6, 0);
        const head = c.worldHeadPosition();
        const off = dir(c.rotation.y, side + Math.PI / 2).multiplyScalar(0.055 * Math.sign(side || 1));
        return head.clone().add(off).add(new THREE.Vector3(0, -0.02, 0));
      };
      if (common.fov) common.fov = common.fov * lens;
    } else if (spec.type === 'ots') {
      const who = spec.who;
      const at = spec.at;
      const side = spec.side ?? 0.75;
      const dist = spec.dist ?? 1.35;
      const height = spec.height ?? 0.14;
      from = () => {
        const a = this.actor(who);
        if (!a) return new THREE.Vector3(0, 1.6, 2);
        const head = a.worldHeadPosition();
        return head
          .clone()
          .add(dir(a.rotation.y, Math.PI + side).multiplyScalar(dist))
          .add(new THREE.Vector3(0, height, 0));
      };
      to = () => {
        const b = this.actor(at);
        return b ? b.worldHeadPosition() : this.resolveAnchor(at);
      };
    } else if (spec.type === 'two') {
      const a = spec.a;
      const b = spec.b;
      const side = spec.side ?? 0.9;
      const dist = spec.dist ?? 2.4;
      const height = spec.height ?? 0.12;
      const mid = () => {
        const ca = this.actor(a);
        const cb = this.actor(b);
        if (!ca || !cb) return new THREE.Vector3(0, 1.55, 0);
        return ca.worldHeadPosition().add(cb.worldHeadPosition()).multiplyScalar(0.5);
      };
      from = () => {
        const ca = this.actor(a);
        const cb = this.actor(b);
        const m = mid();
        if (!ca || !cb) return m.clone().add(new THREE.Vector3(0, 0.2, dist));
        // Stand off on the perpendicular bisector, far enough back to hold both
        // actors in frame, and never closer than the pair's own separation.
        const delta = cb.position.clone().sub(ca.position).setY(0);
        const separation = Math.max(0.6, delta.length());
        const axis = delta.lengthSq() > 1e-6 ? delta.clone().normalize() : new THREE.Vector3(1, 0, 0);
        const perp = new THREE.Vector3(-axis.z, 0, axis.x).multiplyScalar(Math.sign(side) || 1);
        const back = Math.max(dist, separation * 1.15);
        return m
          .clone()
          .add(perp.multiplyScalar(back))
          .add(axis.clone().multiplyScalar(side * 0.35))
          .add(new THREE.Vector3(0, height, 0));
      };
      to = mid;
    } else if (spec.type === 'follow') {
      const player = this.actor(this.playerKey);
      if (player) this.game.rig.follow(player.position.clone(), this.walkYaw);
      return;
    } else {
      const f = spec.from;
      const t = spec.to;
      const hf = spec.heightFrom ?? 1.62;
      const ht = spec.heightTo ?? 1.55;
      // Free shots are authored on the ground plane plus an explicit height;
      // actor anchors already resolve to the eye line.
      const isActor = (a: Anchor) => typeof a === 'string' && a.startsWith('actor:');
      from = () => {
        const v = this.resolveAnchor(f);
        if (!isActor(f)) v.y += hf;
        return v;
      };
      to = () => {
        const v = this.resolveAnchor(t);
        if (!isActor(t)) v.y += ht;
        return v;
      };
    }

    const shot = { from, to, ...common };
    if (blend > 0) {
      this.game.rig.blend(shot, blend, 'inOut');
    } else {
      this.game.rig.cut(shot);
      // A cut is a new setup: re-expose immediately instead of visibly adapting.
      this.game.post.snapExposure();
    }
  }

  private applyMeters(changes: MeterChange[]) {
    for (const c of changes) {
      this.meters[c.meter] = clamp((this.meters[c.meter] ?? 0) + c.delta, 0, 1);
    }
    this.syncMeters();
  }

  private syncMeters() {
    this.hud.setMeter('voss', 'LT. VOSS', this.meters.voss);
    this.hud.setMeter('deviancy', 'DEVIANCY', this.meters.deviancy, true);
  }

  private loadSet(id: SetId) {
    if (this.currentSet === id) return;
    let set = this.sets.get(id);
    if (!set) {
      set = SET_BUILDERS[id](this.game.setContext);
      this.sets.set(id, set);
    }
    this.game.loadSet(set);
    if (set.actorLights) this.game.lights.setPalette(set.actorLights);
    this.currentSet = id;
    // Actors from other locations should not linger.
    for (const key of [...this.game.characters.keys()]) {
      const c = this.game.characters.get(key)!;
      c.group.visible = !this.hiddenActors.has(key);
    }
  }

  // -------------------------------------------------------------------- beats
  private enterBeat(beat: Beat) {
    switch (beat.kind) {
      case 'label':
        break;
      case 'goto':
        this.jumpTo(beat.label);
        return;
      case 'set':
        this.loadSet(beat.set);
        if (beat.fadeIn !== undefined) {
          this.fade = 1;
          this.fadeTarget = 0;
        }
        break;
      case 'title':
        this.hud.showTitle(beat.chapter, beat.title, beat.sub);
        this.chapterTitle = `${beat.chapter} — ${beat.title}`;
        this.mode = { kind: 'wait', time: 0, duration: beat.hold ?? 3.2 };
        return;
      case 'place':
        for (const p of beat.actors) {
          const c = this.ensureActor(p.who);
          if (p.at) {
            const pos = this.resolveAnchor(p.at);
            c.position.copy(pos);
          }
          if (p.yaw !== undefined) c.rotation.y = p.yaw;
          if (p.clearGestures) c.clearGestures();
          for (const g of p.gestures ?? []) c.playGesture(g);
          if (p.emotion) c.emotion = p.emotion;
          if (p.led) c.setLed(p.led);
          if (p.hidden !== undefined) {
            c.group.visible = !p.hidden;
            if (p.hidden) this.hiddenActors.add(p.who);
            else this.hiddenActors.delete(p.who);
          }
          if (p.look !== undefined) this.setGaze(c, p.look);
        }
        break;
      case 'shot':
        this.applyShot(beat.shot);
        break;
      case 'line': {
        // A leading '#' marks a voice-only speaker (comms, no model needed).
        const voiceOnly = beat.who.startsWith('#');
        const c = voiceOnly ? null : this.actor(beat.who) ?? (CAST[beat.who] ? this.ensureActor(beat.who) : null);
        const duration = beat.time ?? lineDuration(beat.text);
        const speaker = voiceOnly ? beat.who.slice(1) : c?.name ?? beat.who.toUpperCase();
        if (c && !beat.thought) this.lightSubject = beat.who;
        this.hud.showLine(speaker, beat.text, duration, beat.thought);
        if (c) {
          if (beat.emotion) c.emotion = beat.emotion;
          if (beat.gesture) c.playGesture(beat.gesture);
          if (beat.stopGesture) c.stopGesture(beat.stopGesture);
          if (beat.led) c.setLed(beat.led);
          if (beat.look !== undefined) this.setGaze(c, beat.look);
          if (!beat.thought) c.say(beat.text, duration * 0.82);
        }
        if (beat.shot) this.applyShot(beat.shot);
        this.mode = { kind: 'line', time: 0, duration };
        return;
      }
      case 'wait':
        this.mode = { kind: 'wait', time: 0, duration: beat.time };
        return;
      case 'objective':
        this.hud.setObjective(beat.text, beat.done);
        break;
      case 'choice': {
        const options = beat.options.filter((o) => !o.requires || o.requires.every((f) => this.flags.has(f)));
        this.hud.hideLine();
        this.hud.showChoices(options, beat.time);
        this.hud.setSelected(0);
        this.mode = {
          kind: 'choice',
          time: 0,
          duration: beat.time,
          options,
          hoverIndex: 0,
          committed: false,
          commitTime: 0,
        };
        return;
      }
      case 'qte':
        this.hud.hideLine();
        this.hud.showQte(beat.keys, beat.window, beat.label);
        this.slowmo = beat.slowmo ?? 1;
        this.mode = {
          kind: 'qte',
          time: 0,
          window: beat.window,
          keys: beat.keys,
          index: 0,
          failed: false,
          resolveTime: -1,
          onFail: beat.onFail,
        };
        return;
      case 'scan':
        this.hud.setObjective(beat.objective);
        this.hud.setScanMode(true, 0, beat.points.length);
        this.game.post.params.scanPulse = 1;
        this.mode = {
          kind: 'scan',
          found: beat.points.map(() => false),
          points: beat.points,
          time: 0,
          cursor: new THREE.Vector2(0.5, 0.5),
          noteTime: 0,
          note: '',
          noteFor: -1,
        };
        return;
      case 'walk': {
        this.hud.setObjective(beat.objective);
        const target = this.resolveAnchor(beat.to);
        const player = this.actor(beat.who ?? this.playerKey);
        if (player) {
          this.walkYaw = Math.atan2(target.x - player.position.x, target.z - player.position.z);
          this.game.rig.follow(player.position.clone(), this.walkYaw);
        }
        this.mode = { kind: 'walk', target, time: 0, limit: beat.time ?? 26 };
        return;
      }
      case 'meter':
        this.applyMeters(beat.changes);
        break;
      case 'stress':
        this.stressValue = beat.value;
        if (beat.show !== undefined) this.stressShown = beat.show;
        this.hud.showStress(beat.value, this.stressShown);
        break;
      case 'fx': {
        const p = this.game.post.params;
        if (beat.fade !== undefined) this.fadeTarget = beat.fade;
        if (beat.flash !== undefined) p.whiteFlash = beat.flash;
        if (beat.deviancy !== undefined) p.deviancy = beat.deviancy;
        if (beat.glitch !== undefined) p.glitch = beat.glitch;
        if (beat.shake !== undefined) this.game.rig.addShake(beat.shake);
        if (beat.letterbox !== undefined) this.hud.letterbox(beat.letterbox);
        if (beat.hud !== undefined) this.hud.hudVisible(beat.hud);
        if (beat.slowmo !== undefined) this.slowmo = beat.slowmo;
        if (beat.time) {
          this.mode = { kind: 'wait', time: 0, duration: beat.time };
          return;
        }
        break;
      }
      case 'flowchart':
        this.pendingFlowchart = { chapter: beat.chapter, nodes: beat.nodes };
        this.flowNodes = beat.nodes;
        this.hud.hideLine();
        this.hud.hideChoices();
        this.fadeTarget = 1;
        this.mode = { kind: 'wait', time: 0, duration: 1.0 };
        return;
      case 'chapterEnd':
        this.opts.onChapter?.(this.chapterTitle);
        break;
      case 'end':
        this.ending = beat.epilogue;
        this.finished = true;
        this.hud.hideLine();
        this.hud.hideChoices();
        this.mode = { kind: 'ended' };
        return;
    }
    this.index++;
  }

  private setGaze(c: Character, look: string | null) {
    if (!look) {
      c.gazeTarget = null;
      return;
    }
    if (look.startsWith('actor:')) {
      const target = this.actor(look.slice(6));
      c.gazeTarget = target ? target.worldHeadPosition() : null;
      return;
    }
    c.gazeTarget = this.resolveAnchor(look).clone().setY(1.5);
  }

  private commitChoice(option: ChoiceOption, index: number) {
    this.hud.markChoiceTaken(index);
    this.choicesMade++;
    if (option.effects) this.applyMeters(option.effects);
    for (const f of option.flags ?? []) this.flags.add(f);
    if (option.node) this.takenNodes.add(option.node);
  }

  // ------------------------------------------------------------------- update
  /** Returns the effective dt after slow motion. */
  update(dtRaw: number): number {
    const dt = dtRaw * this.slowmo;
    this.fade = damp(this.fade, this.fadeTarget, 3.2, dtRaw);
    this.game.post.params.fadeToBlack = this.fade;
    this.hud.setFade(0);
    const p = this.game.post.params;
    p.whiteFlash = damp(p.whiteFlash, 0, 6, dtRaw);
    p.glitch = damp(p.glitch, 0, 2.5, dtRaw);
    if (this.mode.kind !== 'scan') p.scanPulse = damp(p.scanPulse, 0, 4, dtRaw);

    // Keep the travelling light rig on the current subject.
    const subject = this.lightSubject ? this.actor(this.lightSubject) : null;
    if (subject) this.game.lights.lookAt(subject.worldHeadPosition());

    // Keep gaze targets tracking moving actors.
    for (const c of this.game.characters.values()) {
      if (c.gazeTarget) {
        // Refresh the vector in place if it points at another actor's head.
        for (const other of this.game.characters.values()) {
          if (other === c) continue;
          const head = other.worldHeadPosition();
          if (head.distanceToSquared(c.gazeTarget) < 0.35) {
            c.gazeTarget.copy(head);
            break;
          }
        }
      }
    }

    let guard = 0;
    while (this.mode.kind === 'beat' && !this.finished && guard++ < 64) {
      if (this.index >= this.beats.length) {
        this.finished = true;
        break;
      }
      this.enterBeat(this.beats[this.index]);
    }

    switch (this.mode.kind) {
      case 'line': {
        this.mode.time += dt;
        const skip = !this.auto && (this.input.wasPressed('Enter') || this.input.wasPressed(' '));
        if (this.mode.time >= this.mode.duration || skip) {
          this.hud.hideLine();
          this.index++;
          // Hold a short silence so dialogue does not run together.
          this.mode = { kind: 'wait', time: 0, duration: skip ? 0 : 0.75 };
        }
        break;
      }
      case 'wait': {
        this.mode.time += dt;
        if (this.mode.time >= this.mode.duration) {
          if (this.pendingFlowchart) {
            const { chapter, nodes } = this.pendingFlowchart;
            this.pendingFlowchart = null;
            this.hud.hudVisible(false);
            this.hud.showFlowchart(chapter, nodes, this.takenNodes, this.chapterStats());
            this.mode = { kind: 'flowchart', time: 0 };
            break;
          }
          this.hud.hideTitle();
          this.index++;
          this.mode = { kind: 'beat' };
        }
        break;
      }
      case 'choice': {
        const m = this.mode;
        m.time += dt;
        if (m.committed) {
          m.commitTime += dt;
          if (m.commitTime > 0.42) {
            this.hud.hideChoices();
            const option = m.options[m.hoverIndex];
            this.index++;
            this.mode = { kind: 'beat' };
            if (option?.goto) this.jumpTo(option.goto);
          }
          break;
        }
        if (this.auto) {
          const planIndex = this.choicesMade;
          const wanted = clamp(this.plan.choices[planIndex] ?? 0, 0, Math.max(0, m.options.length - 1));
          const delay = this.plan.choiceDelay ?? Math.min(1.6, m.duration * 0.45);
          // Drift the highlight across the options first, like a player reading them.
          const scanT = clamp(m.time / Math.max(0.2, delay));
          const hover = Math.min(m.options.length - 1, Math.floor(scanT * (wanted + 1)));
          if (hover !== m.hoverIndex) {
            m.hoverIndex = hover;
            this.hud.setSelected(hover);
          }
          const timeout = this.plan.timeouts?.includes(planIndex);
          if (!timeout && m.time >= delay && m.hoverIndex === wanted) {
            m.hoverIndex = wanted;
            m.committed = true;
            this.commitChoice(m.options[wanted], wanted);
          }
        } else {
          for (let i = 0; i < m.options.length; i++) {
            if (this.input.wasPressed(String(i + 1))) {
              m.hoverIndex = i;
              this.hud.setSelected(i);
              m.committed = true;
              this.commitChoice(m.options[i], i);
            }
          }
          if (this.input.wasPressed('ArrowLeft')) this.hud.setSelected(this.hud.selectedIndex - 1);
          if (this.input.wasPressed('ArrowRight')) this.hud.setSelected(this.hud.selectedIndex + 1);
          if (this.input.wasPressed('Enter')) {
            m.hoverIndex = this.hud.selectedIndex;
            m.committed = true;
            this.commitChoice(m.options[m.hoverIndex], m.hoverIndex);
          }
        }
        if (!m.committed && m.time >= m.duration) {
          // Timing out picks the last option: hesitation has consequences.
          const fallback = m.options.length - 1;
          m.hoverIndex = fallback;
          this.hud.setSelected(fallback);
          m.committed = true;
          this.flags.add('hesitated');
          this.commitChoice(m.options[fallback], fallback);
        }
        break;
      }
      case 'qte': {
        const m = this.mode;
        m.time += dt;
        if (m.resolveTime >= 0) {
          m.resolveTime += dtRaw;
          if (m.resolveTime > 0.45) {
            this.hud.hideQte();
            this.slowmo = 1;
            if (m.failed && m.onFail) {
              this.index++;
              this.jumpTo(m.onFail);
            } else {
              this.index++;
              this.mode = { kind: 'beat' };
            }
          }
          break;
        }
        const progress = m.time / m.window;
        let hit = false;
        if (this.auto) {
          const shouldFail = this.plan.qteFails?.includes(this.qteCount) ?? false;
          if (!shouldFail && progress > 0.52) hit = true;
          if (shouldFail && progress >= 1) {
            m.failed = true;
            m.resolveTime = 0;
            this.qteCount++;
            this.hud.flashQte('miss');
            this.hud.banner('MISSED', true);
            break;
          }
        } else if (this.input.wasPressed(m.keys[m.index])) {
          hit = true;
        } else if (this.input.anyPressed && progress > 0.05) {
          m.failed = true;
        }
        if (hit) {
          this.qteHits++;
          this.qteCount++;
          this.hud.flashQte('hit');
          this.game.rig.addShake(0.35);
          const done = this.hud.advanceQte();
          m.index++;
          m.time = 0;
          if (done || m.index >= m.keys.length) {
            m.resolveTime = 0;
            this.hud.banner('SUCCESS');
          }
        } else if (progress >= 1) {
          m.failed = true;
          m.resolveTime = 0;
          this.qteCount++;
          this.hud.flashQte('miss');
          this.hud.banner('MISSED', true);
        }
        break;
      }
      case 'scan': {
        const m = this.mode;
        m.time += dt;
        const cam = this.game.camera;
        const project = (v: THREE.Vector3) => {
          const p2 = v.clone().project(cam);
          return new THREE.Vector2((p2.x + 1) / 2, (-p2.y + 1) / 2);
        };
        const screen = m.points.map((pt) => project(this.resolveAnchor(pt.at)));

        if (this.auto) {
          // Sweep the reticle from point to point.
          const per = 2.0;
          const idx = Math.min(m.points.length - 1, Math.floor(m.time / per));
          this.scanCursorTarget.copy(screen[idx]);
          m.cursor.lerp(this.scanCursorTarget, clamp(dt * 4));
          if (m.time > idx * per + per * 0.55 && !m.found[idx]) {
            m.found[idx] = true;
            m.note = m.points[idx].note;
            m.noteFor = idx;
            m.noteTime = 0;
            this.hud.showLine('KAI', m.points[idx].note, 3.4, true);
          }
        } else {
          m.cursor.copy(this.input.pointer);
          if (this.input.clicked) {
            let best = -1;
            let bestDist = 0.06;
            screen.forEach((s, i) => {
              const d = s.distanceTo(m.cursor);
              if (d < bestDist && !m.found[i]) {
                bestDist = d;
                best = i;
              }
            });
            if (best >= 0) {
              m.found[best] = true;
              m.note = m.points[best].note;
              m.noteFor = best;
              m.noteTime = 0;
              this.hud.showLine('KAI', m.points[best].note, 3.4, true);
            }
          }
        }
        if (m.noteFor >= 0) {
          m.noteTime += dt;
          if (m.noteTime > 3.4) {
            this.hud.hideLine();
            m.noteFor = -1;
          }
        }
        const found = m.found.filter(Boolean).length;
        this.hud.setScanMode(true, found, m.points.length);
        this.hud.setMarkers(
          m.points.map((pt, i) => ({
            x: screen[i].x,
            y: screen[i].y,
            label: pt.label,
            done: m.found[i],
            kind: 'scan' as const,
            visible: screen[i].x > 0.02 && screen[i].x < 0.98 && screen[i].y > 0.05 && screen[i].y < 0.95,
          })),
        );
        // Slow orbit while analysing.
        if (found >= m.points.length && m.noteFor < 0) {
          this.hud.setScanMode(false);
          this.hud.setMarkers([]);
          this.game.post.params.scanPulse = 0;
          this.hud.setObjective('EVIDENCE COLLECTED', true);
          this.index++;
          this.mode = { kind: 'beat' };
        }
        break;
      }
      case 'walk': {
        const m = this.mode;
        m.time += dt;
        const player = this.actor(this.playerKey);
        if (!player) {
          this.index++;
          this.mode = { kind: 'beat' };
          break;
        }
        const toTarget = m.target.clone().setY(0).sub(player.position.clone().setY(0));
        const dist = toTarget.length();
        let speed = 0;
        if (this.auto) {
          const desiredYaw = Math.atan2(toTarget.x, toTarget.z);
          this.walkYaw = this.approachAngle(this.walkYaw, desiredYaw, dt * 2.2);
          speed = dist > 0.5 ? 1.25 : 0;
        } else {
          this.walkYaw -= this.input.look.x * 0.0035;
          const move = this.input.move;
          if (move.lengthSq() > 0.01) {
            const forward = new THREE.Vector3(Math.sin(this.walkYaw), 0, Math.cos(this.walkYaw));
            const right = new THREE.Vector3(forward.z, 0, -forward.x);
            const dirV = forward.multiplyScalar(move.y).add(right.multiplyScalar(move.x)).normalize();
            player.rotation.y = Math.atan2(dirV.x, dirV.z);
            speed = 1.25;
            player.position.add(dirV.multiplyScalar(speed * dt));
          }
        }
        if (this.auto && speed > 0) {
          player.rotation.y = this.walkYaw;
          const forward = new THREE.Vector3(Math.sin(this.walkYaw), 0, Math.cos(this.walkYaw));
          player.position.add(forward.multiplyScalar(speed * dt));
        }
        player.setWalkSpeed(speed);
        player.gazeTarget = null;
        this.game.rig.follow(player.position.clone(), this.walkYaw);
        const arrived = dist < 0.55;
        this.hud.setMarkers([
          (() => {
            const p2 = m.target.clone().setY(m.target.y + 1.1).project(this.game.camera);
            return {
              x: (p2.x + 1) / 2,
              y: (-p2.y + 1) / 2,
              label: 'MOVE HERE',
              kind: 'interact' as const,
              visible: !arrived && p2.z < 1,
            };
          })(),
        ]);
        if (arrived || m.time > m.limit) {
          player.setWalkSpeed(0);
          this.hud.setMarkers([]);
          this.hud.setObjective('', true);
          this.index++;
          this.mode = { kind: 'beat' };
        }
        break;
      }
      case 'flowchart': {
        this.mode.time += dt;
        const advance = this.auto ? this.mode.time > 13 : this.input.wasPressed('Enter') || this.mode.time > 40;
        if (advance) {
          this.hud.hideFlowchart();
          this.hud.hudVisible(true);
          this.fadeTarget = 0;
          this.index++;
          this.mode = { kind: 'beat' };
        }
        break;
      }
      case 'ended':
      case 'beat':
        break;
    }

    if (this.stressShown) this.hud.showStress(this.stressValue, true);
    return dt;
  }

  private approachAngle(current: number, target: number, maxStep: number) {
    let delta = target - current;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return current + clamp(delta, -maxStep, maxStep);
  }

  private chapterStats(): [string, string][] {
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    return [
      ['CHOICES MADE', String(this.choicesMade)],
      ['ACTIONS', `${this.qteHits}/${this.qteCount} SUCCEEDED`],
      ['LT. VOSS TRUST', pct(this.meters.voss)],
      ['DEVIANCY', pct(this.meters.deviancy)],
      ['SOFTWARE INSTABILITY', this.meters.deviancy > 0.55 ? 'CRITICAL' : this.meters.deviancy > 0.3 ? 'ELEVATED' : 'NOMINAL'],
    ];
  }

  get statsForEnding() {
    return this.chapterStats();
  }

  get currentFlowNodes() {
    return this.flowNodes;
  }

  /** Blend factor used by the caller to know when the runner is idle. */
  get isBusy() {
    return this.mode.kind !== 'ended';
  }
}

export { smoothstep, lerp };
