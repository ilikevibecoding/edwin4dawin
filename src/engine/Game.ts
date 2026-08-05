import * as THREE from 'three';
import { ActorLightRig } from './ActorLights';
import { CameraRig } from './CameraRig';
import { PostStack, Quality } from './Post';
import { Character, CharacterOptions } from '../world/Character';
import { GameSet, SetContext } from '../world/sets/types';
import { clamp } from './math';

export interface GameOptions {
  canvas: HTMLCanvasElement;
  quality?: Quality;
  /** Fixed timestep for deterministic offline capture. */
  fixedStep?: number;
  width?: number;
  height?: number;
}

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly rig: CameraRig;
  readonly lights = new ActorLightRig();
  readonly post: PostStack;
  readonly characters = new Map<string, Character>();
  readonly setContext: SetContext;

  set: GameSet | null = null;
  time = 0;
  frameCount = 0;
  private fixedStep: number;
  private lastFrame = 0;
  private running = false;
  private updaters: ((dt: number, time: number) => void)[] = [];
  private width: number;
  private height: number;
  private fpsAccum = 0;
  private fpsFrames = 0;
  fps = 0;

  constructor(opts: GameOptions) {
    this.renderer = new THREE.WebGLRenderer({
      canvas: opts.canvas,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
      alpha: false,
    });
    this.renderer.setPixelRatio(1);
    this.width = opts.width ?? opts.canvas.clientWidth ?? 1280;
    this.height = opts.height ?? opts.canvas.clientHeight ?? 720;
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.localClippingEnabled = true;
    this.renderer.info.autoReset = true;

    this.fixedStep = opts.fixedStep ?? 0;
    this.rig = new CameraRig(this.width / this.height);
    this.post = new PostStack(this.renderer, opts.quality ?? 'high');
    this.post.setSize(this.width, this.height, true);
    this.setContext = { renderer: this.renderer, scene: this.scene };
    this.scene.add(this.lights.group);
  }

  get camera() {
    return this.rig.camera;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
    this.rig.setAspect(width / height);
    this.post.setSize(width, height, true);
  }

  onUpdate(fn: (dt: number, time: number) => void) {
    this.updaters.push(fn);
  }

  loadSet(set: GameSet) {
    if (this.set) {
      this.scene.remove(this.set.root);
      this.set.dispose();
    }
    this.set = set;
    this.scene.add(set.root);
    this.scene.environment = set.env;
    this.scene.environmentIntensity = set.envIntensity ?? 3.5;
    this.scene.fog = set.fog;
    this.scene.background = null;
    Object.assign(this.post.params, set.post);
    if (set.post.lift) this.post.params.lift = set.post.lift.clone();
    if (set.post.gain) this.post.params.gain = set.post.gain.clone();
  }

  addCharacter(opts: CharacterOptions): Character {
    const existing = this.characters.get(opts.key);
    if (existing) return existing;
    const c = new Character(opts);
    this.characters.set(opts.key, c);
    this.scene.add(c.group);
    return c;
  }

  removeCharacter(key: string) {
    const c = this.characters.get(key);
    if (!c) return;
    this.scene.remove(c.group);
    c.dispose();
    this.characters.delete(key);
  }

  character(key: string): Character {
    const c = this.characters.get(key);
    if (!c) throw new Error(`unknown character: ${key}`);
    return c;
  }

  step(dt: number) {
    const clamped = clamp(dt, 0, 0.34);
    this.time += clamped;
    this.frameCount++;
    for (const fn of this.updaters) fn(clamped, this.time);
    for (const c of this.characters.values()) c.update(clamped, this.time);
    this.rig.update(clamped);
    this.lights.update(clamped, this.camera);
    this.post.updateFocus(this.rig.focusDistance, clamped, this.frameCount < 3);
    this.post.params.aperture = this.rig.aperture;
    this.post.params.focalRange = this.rig.focalRange;
    this.scene.updateMatrixWorld(true);
    this.set?.update(clamped, this.time, this.camera);
  }

  render(dt = 1 / 60) {
    this.post.render(this.scene, this.camera, dt);
  }

  frame(dt: number) {
    this.step(dt);
    this.render(dt);
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = this.fixedStep > 0 ? this.fixedStep : Math.min(0.1, (now - this.lastFrame) / 1000 || 1 / 60);
      this.lastFrame = now;
      this.frame(dt);
      this.fpsAccum += dt;
      this.fpsFrames++;
      if (this.fpsAccum > 0.5) {
        this.fps = this.fpsFrames / this.fpsAccum;
        this.fpsAccum = 0;
        this.fpsFrames = 0;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
  }
}
