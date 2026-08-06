/**
 * The director performs a chapter: it dresses the set, casts the actors, then
 * walks the story graph performing beats — staging, camera, dialogue, choices,
 * quick-time events and analysis sequences.
 *
 * All waiting goes through the director's own clock, which is advanced from the
 * stage update, so a performance is identical under real-time play and under
 * fixed-step offline rendering.
 */
import * as THREE from 'three';
import { Character, QUALITY_BY_TIER, type Emotion } from '../characters/Character';
import { CAST } from '../characters/Cast';
import { updateSkinKeyLight } from '../characters/CharacterMaterials';
import type { AudioEngine } from '../engine/Audio';
import { RainSystem } from '../engine/Rain';
import type { Stage } from '../engine/Stage';
import type { UIRoot } from '../ui/UIRoot';
import { buildApartmentScene } from '../world/ApartmentScene';
import { buildInterrogationScene } from '../world/InterrogationScene';
import { buildStreetScene } from '../world/StreetScene';
import type { SceneBuild } from '../world/SceneTypes';
import { CameraDirector } from './CameraDirector';
import { CHAPTER_EXTRAS } from './Story';
import type { Beat, CamSpec, Chapter, GameState, SceneId, StoryNode } from './StoryTypes';

const SCENE_BUILDERS: Record<SceneId, (stage: Stage) => SceneBuild> = {
  street: buildStreetScene,
  apartment: buildApartmentScene,
  interrogation: buildInterrogationScene,
};

export interface DirectorOptions {
  stage: Stage;
  ui: UIRoot;
  audio: AudioEngine;
  state: GameState;
  /** Auto-play: choices resolve themselves and QTEs always succeed. */
  auto?: boolean;
  autoChoices?: Record<string, string>;
  /** Multiplies all dialogue holds. */
  pace?: number;
}

/** Characters are expensive to build, so they are made once per session. */
const characterPool = new Map<string, Character>();
/** Sets are cached too: rebuilding the street costs several seconds. */
const sceneCache = new Map<SceneId, SceneBuild>();

export class Director {
  private stage: Stage;
  private ui: UIRoot;
  private audio: AudioEngine;
  private state: GameState;
  private auto: boolean;
  private autoChoices: Record<string, string>;
  private pace: number;

  private camera: CameraDirector;
  private rain: RainSystem;
  private build: SceneBuild | null = null;
  private actors = new Map<string, Character>();
  private roleToCast = new Map<string, string>();

  private clock = 0;
  private pending: { at: number; resolve: () => void }[] = [];
  private disposers: (() => void)[] = [];

  private skipRequested = false;
  private aborted = false;
  private lastSpeaker: string | null = null;
  private coverageFlip = false;

  private keyLightDir = new THREE.Vector3(0.3, 0.6, 0.8);
  private keyLightColor = new THREE.Color(0xffffff);

  constructor(opts: DirectorOptions) {
    this.stage = opts.stage;
    this.ui = opts.ui;
    this.audio = opts.audio;
    this.state = opts.state;
    this.auto = opts.auto ?? false;
    this.autoChoices = opts.autoChoices ?? {};
    this.pace = opts.pace ?? 1;

    this.camera = new CameraDirector(this.stage.camera);
    this.rain = new RainSystem({
      dropCount: this.stage.tier === 'low' ? 1200 : this.stage.tier === 'ultra' ? 5000 : 3000,
      splashCount: this.stage.tier === 'low' ? 200 : 600,
      groundY: 0,
    });
    this.stage.scene.add(this.rain.group);

    this.disposers.push(this.stage.onUpdate((dt) => this.tick(dt)));
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') this.skipRequested = true;
    };
    window.addEventListener('keydown', onKey);
    this.disposers.push(() => window.removeEventListener('keydown', onKey));
  }

  private tick(dt: number) {
    this.clock += dt;
    for (let i = this.pending.length - 1; i >= 0; i--) {
      if (this.pending[i].at <= this.clock) this.pending.splice(i, 1)[0].resolve();
    }
    for (const actor of this.actors.values()) actor.update(dt);
    this.camera.update(dt);
    this.rain.update(dt, this.stage.camera);
    this.build?.update?.(dt, this.clock);
    // Skin subsurface needs the dominant light direction in view space
    updateSkinKeyLight(this.keyLightDir, this.keyLightColor, this.stage.camera);
    this.stage.fx.dof.target = this.camera.focusPoint;
    this.audio.update(dt);
  }

  private sleep(seconds: number): Promise<void> {
    if (seconds <= 0) return Promise.resolve();
    return new Promise<void>((resolve) => this.pending.push({ at: this.clock + seconds, resolve }));
  }

  private async until(test: () => boolean, timeout = 20): Promise<boolean> {
    const deadline = this.clock + timeout;
    while (!test() && this.clock < deadline && !this.aborted) await this.sleep(1 / 30);
    return test();
  }

  abort() {
    this.aborted = true;
    for (const p of this.pending.splice(0)) p.resolve();
  }

  // -------------------------------------------------------------------------
  // Scene setup
  // -------------------------------------------------------------------------

  async loadChapter(chapter: Chapter) {
    if (this.build) this.build.root.removeFromParent();
    for (const actor of this.actors.values()) actor.group.removeFromParent();
    this.actors.clear();
    this.roleToCast.clear();

    let build = sceneCache.get(chapter.scene);
    if (!build) {
      build = SCENE_BUILDERS[chapter.scene](this.stage);
      sceneCache.set(chapter.scene, build);
    }
    this.build = build;
    this.stage.scene.add(build.root);
    this.camera.setCollider(build.root, build.cameraBounds ?? null);

    const extras = CHAPTER_EXTRAS[chapter.id] ?? {};
    this.stage.setSky(extras.skyOverride ?? build.sky, { showBackground: build.showSkyBackground !== false });
    this.stage.fx.atmosphere.apply(build.atmosphere);
    this.stage.fx.grade.apply(build.grade);
    const rain = extras.rainOverride ?? build.rain;
    this.stage.fx.lensRain.intensity = rain * 0.34;
    this.rain.setIntensity(rain);

    const shafts = build.shafts ?? [];
    for (let i = 0; i < 2; i++) {
      const s = shafts[i];
      if (s) this.stage.fx.atmosphere.setShaft(i as 0 | 1, s.position, s.color, s.intensity);
      else this.stage.fx.atmosphere.setShaft(i as 0 | 1, new THREE.Vector3(), new THREE.Color(), 0);
    }

    // Use the brightest shadow caster as the subsurface key light
    let best: THREE.Light | null = null;
    build.root.traverse((o) => {
      const l = o as THREE.Light;
      if (l.isLight && l.castShadow && (!best || l.intensity > best.intensity)) best = l;
    });
    if (best) {
      const light = best as THREE.SpotLight;
      const p = light.getWorldPosition(new THREE.Vector3());
      const t = light.target?.getWorldPosition(new THREE.Vector3()) ?? new THREE.Vector3();
      this.keyLightDir.copy(p).sub(t).normalize();
      this.keyLightColor.copy(light.color);
    }

    for (const spec of chapter.actors) {
      let character = characterPool.get(spec.cast);
      if (!character) {
        const def = CAST[spec.cast];
        if (!def) continue;
        character = new Character(def, QUALITY_BY_TIER[this.stage.tier]);
        characterPool.set(spec.cast, character);
      }
      this.actors.set(spec.role, character);
      this.roleToCast.set(spec.role, spec.cast);
      this.stage.scene.add(character.group);
      character.group.visible = spec.visible !== false;
      const mark = spec.mark ? build.marks[spec.mark] : undefined;
      if (mark) character.placeAt(mark.position, mark.yaw);
      character.playClip(spec.clip ?? 'idle', { fade: 0 });
      character.setExpression('neutral', 1);
      character.instability = 0;
    }

    const establish = build.marks['cam.establish'];
    const hero = this.actors.values().next().value as Character | undefined;
    if (establish && hero) this.camera.cut(establish.position.clone(), hero.getEyeWorldPosition(), 38);
  }

  private actor(role: string): Character | null {
    return this.actors.get(role) ?? null;
  }

  private mark(name: string) {
    return this.build?.marks[name];
  }

  // -------------------------------------------------------------------------
  // Beats
  // -------------------------------------------------------------------------

  private applyCam(spec: CamSpec) {
    switch (spec.kind) {
      case 'single': {
        const a = this.actor(spec.who ?? '');
        if (a) this.camera.single(a, spec.size ?? 'close', spec.opts ?? {});
        break;
      }
      case 'ots': {
        const near = this.actor(spec.who ?? '');
        const far = this.actor(spec.other ?? '');
        if (near && far) this.camera.overShoulder(near, far, spec.opts ?? {});
        break;
      }
      case 'two': {
        const a = this.actor(spec.who ?? '');
        const b = this.actor(spec.other ?? '');
        if (a && b) this.camera.twoShot(a, b, spec.opts ?? {});
        break;
      }
      case 'mark': {
        const m = spec.mark ? this.mark(spec.mark) : undefined;
        if (!m) break;
        const lookAt = new THREE.Vector3();
        if (spec.lookAt) {
          const target = this.actor(spec.lookAt);
          if (target) lookAt.copy(target.getEyeWorldPosition());
          else {
            const lm = this.mark(spec.lookAt);
            if (lm) lookAt.copy(lm.position).setY(1.6);
          }
        } else {
          lookAt.copy(m.position).add(new THREE.Vector3(Math.sin(m.yaw), -0.1, Math.cos(m.yaw)).multiplyScalar(3));
        }
        this.camera.toMark(m, lookAt, spec.opts ?? {});
        break;
      }
      case 'lock':
        this.camera.lock();
        break;
    }
  }

  /** Automatic conversational coverage when a line does not specify a camera. */
  private autoCoverage(speaker: string) {
    const speakerActor = this.actor(speaker);
    if (!speakerActor) return;
    const others = [...this.actors.entries()].filter(([role, a]) => role !== speaker && a.group.visible);
    if (others.length === 0) {
      this.camera.single(speakerActor, 'close', { angle: 22, handheld: 0.5, duration: 0.9 });
      return;
    }
    this.coverageFlip = !this.coverageFlip;
    if (this.coverageFlip) {
      this.camera.overShoulder(others[0][1], speakerActor, { side: 1, duration: 0.9, handheld: 0.55, fov: 40 });
    } else {
      this.camera.single(speakerActor, 'close', { angle: 24, duration: 0.9, handheld: 0.5 });
    }
  }

  private estimateDuration(text: string): number {
    // ~2.9 words per second, with a floor for very short lines
    return THREE.MathUtils.clamp(text.trim().split(/\s+/).length / 2.9 + 0.55, 1.5, 9);
  }

  private async performLine(beat: Extract<Beat, { kind: 'line' }>) {
    const who = this.actor(beat.who);
    const castId = this.roleToCast.get(beat.who) ?? beat.who;
    const def = CAST[castId];
    const seconds = (beat.seconds ?? this.estimateDuration(beat.text)) * this.pace;

    if (beat.cam && beat.cam !== 'auto') this.applyCam(beat.cam);
    else if (beat.cam === 'auto' || this.lastSpeaker !== beat.who) this.autoCoverage(beat.who);
    this.lastSpeaker = beat.who;

    if (who) {
      if (beat.emotion) who.setExpression(beat.emotion, beat.emotionWeight ?? 1);
      if (beat.clip) who.playClip(beat.clip, { fade: 0.35 });
      if (beat.lookAt !== undefined) {
        const target = beat.lookAt ? this.actor(beat.lookAt) : null;
        who.lookAt(target ? target.getEyeWorldPosition() : null, 1);
      } else {
        const others = [...this.actors.entries()].filter(([r, a]) => r !== beat.who && a.group.visible);
        if (others.length) who.lookAt(others[0][1].getEyeWorldPosition(), 0.9);
      }
      if (!beat.inner) who.speak(beat.text, seconds);
      for (const [role, other] of this.actors) {
        if (role === beat.who || !other.group.visible) continue;
        other.lookAt(who.getEyeWorldPosition(), 0.85);
      }
    }

    if (beat.shake) this.camera.shake(beat.shake);
    this.audio.duck(0.45, 0.2);

    const speech = beat.inner
      ? Promise.resolve()
      : this.audio.speak(beat.text, def?.voice ?? { pitch: 1, rate: 1, timbre: 'neutral' }, seconds);
    const uiDone = this.ui.dialogue.show({
      speaker: beat.inner ? `${def?.name ?? beat.who} — ANALYSIS` : def?.name ?? beat.who.toUpperCase(),
      text: beat.text,
      color: def?.uiColor,
      android: def?.android,
      duration: seconds,
      typewriter: true,
    });

    this.skipRequested = false;
    await Promise.race([this.sleep(seconds), this.until(() => this.skipRequested, seconds)]);
    if (this.skipRequested) {
      this.ui.dialogue.skip();
      who?.stopSpeaking();
      this.audio.stopSpeaking();
      this.skipRequested = false;
    }
    await uiDone.catch(() => undefined);
    await speech.catch(() => undefined);
    this.audio.duck(1, 0.4);
    if (beat.hold) await this.sleep(beat.hold * this.pace);
  }

  private async performChoice(beat: Extract<Beat, { kind: 'choice' }>) {
    this.ui.hud.setPrompt(null);
    const options = beat.options
      .filter((o) => !o.requires || !!this.state.flags[o.requires])
      .map((o) => ({ id: o.id, label: o.label, hint: o.hint, danger: o.danger }));

    this.audio.play('choiceAppear');
    let picked: string | null;
    if (this.auto) {
      const preferred = this.autoChoices[beat.id];
      picked = preferred && options.some((o) => o.id === preferred) ? preferred : options[0]?.id ?? null;
      // Let the wheel be readable before it resolves itself
      const presentation = this.ui.choices.present(options, beat.seconds);
      await this.sleep(Math.min(beat.seconds * 0.55, 3.4));
      this.ui.choices.cancel();
      await presentation.catch(() => null);
    } else {
      picked = (await this.ui.choices.present(options, beat.seconds)) ?? options[options.length - 1]?.id ?? null;
    }

    if (!picked) return;
    this.state.choices[beat.id] = picked;
    const spec = beat.options.find((o) => o.id === picked);
    if (spec?.effects) {
      if (spec.effects.flags) Object.assign(this.state.flags, spec.effects.flags);
      if (spec.effects.instability !== undefined) {
        this.state.instability = THREE.MathUtils.clamp(this.state.instability + spec.effects.instability, 0, 1);
      }
      for (const [k, v] of Object.entries(spec.effects.relationships ?? {})) {
        this.state.relationships[k] = THREE.MathUtils.clamp((this.state.relationships[k] ?? 0.5) + v, 0, 1);
      }
    }
    this.syncInstability();
    this.audio.play('uiSelect');

    if (beat.showStats) {
      await this.ui.stats.show(
        beat.prompt,
        beat.options.map((o) => ({
          label: o.label,
          percent: o.percent ?? Math.round(100 / beat.options.length),
          chosen: o.id === picked,
        })),
        this.auto ? 3.6 : 5
      );
    }
  }

  private async performQte(beat: Extract<Beat, { kind: 'qte' }>) {
    this.audio.play('qtePrompt');
    let success: boolean;
    if (this.auto) {
      const run = this.ui.qte.run({ kind: beat.qteKind, key: beat.key, label: beat.label, seconds: beat.seconds });
      await this.sleep(Math.min(beat.seconds * 0.5, 1.2));
      this.ui.qte.cancel();
      await run.catch(() => false);
      success = true;
    } else {
      success = await this.ui.qte.run({ kind: beat.qteKind, key: beat.key, label: beat.label, seconds: beat.seconds });
    }
    if (beat.flag) this.state.flags[beat.flag] = success;
    this.audio.play(success ? 'qteSuccess' : 'qteFail');
    if (beat.shake) this.camera.shake(beat.shake);
    if (!success) this.ui.hud.flashNotice('MISSED', 'warn');
  }

  /** Android analysis mode: highlight and inspect points of interest. */
  private async performScan(beat: Extract<Beat, { kind: 'scan' }>) {
    const clues = this.build?.clues ?? [];
    if (clues.length === 0) return;
    if (beat.objective) this.ui.hud.setObjective(beat.objective);

    this.ui.hud.setScanMode(true);
    this.audio.play('scanOn');
    const rampIn = 0.6;
    const start = this.clock;
    while (this.clock - start < rampIn) {
      this.stage.fx.scan.amount = THREE.MathUtils.clamp((this.clock - start) / rampIn, 0, 1);
      await this.sleep(1 / 30);
    }
    this.stage.fx.scan.amount = 1;

    const required = Math.min(beat.required, clues.length);
    for (let i = 0; i < required; i++) {
      const clue = clues[i];
      const camPos = clue.position.clone().add(new THREE.Vector3(0.75, 0.55, 0.75).multiplyScalar(0.9 + i * 0.12));
      this.camera.toMark({ position: camPos, yaw: 0 }, clue.position, { duration: 1.1, handheld: 0.5 });
      this.ui.hud.setPrompt(clue.label, 'E', { x: 0.5, y: 0.52 });
      await this.sleep(this.auto ? 0.9 : 0.7);
      if (!this.auto) {
        this.skipRequested = false;
        await this.until(() => this.skipRequested, 6);
        this.skipRequested = false;
      }
      this.audio.play('scanPing');
      await this.sleep(0.35);
      this.ui.hud.setPrompt(null);
      this.ui.hud.showClue(clue.label, clue.detail);
      this.audio.play('clueFound');
      await this.sleep(this.auto ? 2.4 : 2);
    }

    const rampStart = this.clock;
    while (this.clock - rampStart < 0.5) {
      this.stage.fx.scan.amount = 1 - THREE.MathUtils.clamp((this.clock - rampStart) / 0.5, 0, 1);
      await this.sleep(1 / 30);
    }
    this.stage.fx.scan.amount = 0;
    this.ui.hud.setScanMode(false);
    this.audio.play('scanOff');
  }

  private syncInstability() {
    this.ui.hud.setInstability(this.state.instability);
    for (const [role, actor] of this.actors) {
      const castId = this.roleToCast.get(role);
      if (castId && CAST[castId]?.android) actor.instability = this.state.instability;
    }
  }

  private async performFx(beat: Extract<Beat, { kind: 'fx' }>) {
    if (beat.letterbox !== undefined) {
      this.stage.fx.letterbox.amount = beat.letterbox ? 1 : 0;
      this.ui.setLetterbox(beat.letterbox);
    }
    if (beat.rain !== undefined) {
      this.rain.setIntensity(beat.rain);
      this.stage.fx.lensRain.intensity = beat.rain * 0.34;
    }
    if (beat.shake) this.camera.shake(beat.shake);
    if (beat.glitch !== undefined) {
      this.stage.fx.glitch.amount = beat.glitch;
      if (beat.glitch > 0) {
        this.audio.play('glitch');
        const start = this.clock;
        while (this.clock - start < 0.55) {
          this.stage.fx.glitch.amount = beat.glitch * (1 - (this.clock - start) / 0.55);
          await this.sleep(1 / 30);
        }
        this.stage.fx.glitch.amount = 0;
      }
    }
    if (beat.fadeTo !== undefined) {
      const secs = (beat.fadeSeconds ?? 0.8) * this.pace;
      if (beat.fadeColor !== undefined) this.stage.fx.grade.setFadeColor(new THREE.Color(beat.fadeColor));
      const from = this.stage.fx.grade.fade;
      const start = this.clock;
      while (this.clock - start < secs) {
        this.stage.fx.grade.fade = THREE.MathUtils.lerp(from, beat.fadeTo, (this.clock - start) / secs);
        await this.sleep(1 / 30);
      }
      this.stage.fx.grade.fade = beat.fadeTo;
    }
  }

  private async performBeat(beat: Beat) {
    if (this.aborted) return;
    switch (beat.kind) {
      case 'slate':
        this.ui.dialogue.setSlate(beat.text);
        break;
      case 'line':
        await this.performLine(beat);
        break;
      case 'choice':
        await this.performChoice(beat);
        break;
      case 'qte':
        await this.performQte(beat);
        break;
      case 'scan':
        await this.performScan(beat);
        break;
      case 'cam':
        this.applyCam(beat.spec);
        break;
      case 'place': {
        const a = this.actor(beat.who);
        const m = this.mark(beat.mark);
        if (a && m) {
          a.placeAt(m.position, m.yaw);
          a.group.visible = true;
        }
        break;
      }
      case 'move': {
        const a = this.actor(beat.who);
        if (!a) break;
        a.walkTo(
          beat.marks.map((n) => this.mark(n)?.position).filter((p): p is THREE.Vector3 => !!p),
          beat.speed ?? 1.1
        );
        if (beat.wait !== false) await this.until(() => !a.isWalking, 20);
        break;
      }
      case 'clip':
        this.actor(beat.who)?.playClip(beat.clip, { fade: 0.4 });
        break;
      case 'expr':
        this.actor(beat.who)?.setExpression(beat.emotion as Emotion, beat.weight ?? 1);
        break;
      case 'look': {
        const a = this.actor(beat.who);
        if (!a) break;
        if (beat.at === null) a.lookAt(null, 0);
        else {
          const target = this.actor(beat.at);
          if (target) a.lookAt(target.getEyeWorldPosition(), 1);
          else {
            const m = this.mark(beat.at);
            if (m) a.lookAt(m.position.clone().setY(1.6), 1);
          }
        }
        break;
      }
      case 'led':
        this.actor(beat.who)?.setLed(beat.state);
        break;
      case 'wait':
        await this.sleep(beat.seconds * this.pace);
        break;
      case 'fx':
        await this.performFx(beat);
        break;
      case 'music':
        this.audio.setMusic(beat.mood, beat.fade ?? 2);
        if (beat.intensity !== undefined) this.audio.setMusicIntensity(beat.intensity);
        break;
      case 'ambience':
        this.audio.setAmbience(beat.ambience, 1.5);
        if (beat.intensity !== undefined) this.audio.setAmbienceIntensity(beat.intensity);
        break;
      case 'sfx':
        this.audio.play(beat.name, { volume: beat.volume });
        break;
      case 'stinger':
        this.audio.musicStinger(beat.stinger);
        break;
      case 'objective':
        this.ui.hud.setObjective(beat.text);
        break;
      case 'notice':
        this.ui.hud.flashNotice(beat.text, beat.variant);
        this.audio.play('notification');
        break;
      case 'instability':
        this.state.instability = THREE.MathUtils.clamp(this.state.instability + beat.delta, 0, 1);
        this.syncInstability();
        if (beat.delta > 0) {
          this.ui.hud.flashNotice('SOFTWARE INSTABILITY ^', 'warn');
          this.audio.play('stress');
        }
        break;
      case 'relationship':
        this.state.relationships[beat.who] = THREE.MathUtils.clamp(
          (this.state.relationships[beat.who] ?? 0.5) + beat.delta,
          0,
          1
        );
        break;
      case 'meters':
        this.ui.hud.setMeters(
          beat.show
            ? Object.entries(this.state.relationships).map(([k, v]) => ({
                id: k,
                name: CAST[k]?.name ?? k.toUpperCase(),
                value: v,
              }))
            : []
        );
        break;
      case 'title':
        await this.ui.hud.showChapterCard(beat.chapter, beat.title, beat.subtitle);
        break;
      case 'ending':
        this.state.ending = beat.id;
        break;
    }
  }

  async playChapter(chapter: Chapter) {
    await this.loadChapter(chapter);
    this.syncInstability();

    const nodeById = new Map(chapter.nodes.map((n) => [n.id, n]));
    let nodeId: string | null = chapter.entry;
    let guard = 0;

    while (nodeId && !this.aborted && guard++ < 400) {
      const node: StoryNode | undefined = nodeById.get(nodeId);
      if (!node) break;
      this.state.visited.push(node.id);
      // Surfaced to the capture harness so a stalled performance is visible
      (window as unknown as { __PROGRESS__?: unknown }).__PROGRESS__ = {
        chapter: chapter.id,
        node: node.id,
        clock: Number(this.clock.toFixed(1)),
      };
      for (const beat of node.beats) {
        if (this.aborted) break;
        await this.performBeat(beat);
      }
      nodeId = typeof node.next === 'function' ? node.next(this.state) : node.next ?? null;
    }

    this.ui.dialogue.hide();
    this.ui.hud.setPrompt(null);
    if (chapter.unlocks && !this.state.unlocked.includes(chapter.unlocks)) {
      this.state.unlocked.push(chapter.unlocks);
    }
  }

  /** Flowchart data for the chapter, from the nodes the player visited. */
  flowchartFor(chapter: Chapter) {
    const visited = new Set(this.state.visited);
    const nodes = chapter.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      column: n.column,
      row: n.row,
      taken: visited.has(n.id),
      ending: n.ending,
      missed: !visited.has(n.id),
    }));
    const edges: { from: string; to: string; taken: boolean }[] = [];
    for (const n of chapter.nodes) {
      for (const t of n.edges ?? (typeof n.next === 'string' ? [n.next] : [])) {
        edges.push({ from: n.id, to: t, taken: visited.has(n.id) && visited.has(t) });
      }
    }
    return { nodes, edges };
  }

  dispose() {
    this.abort();
    for (const d of this.disposers) d();
    this.disposers.length = 0;
    this.rain.dispose();
    this.build?.root.removeFromParent();
    for (const actor of this.actors.values()) actor.group.removeFromParent();
    this.actors.clear();
  }
}
