/**
 * The HUD.
 *
 * Owns every widget, resolves the shared per-frame numbers once, and hands each
 * widget the frame snapshot. Nothing here reaches into a gameplay system: the
 * snapshot is sampled upstream, so the whole HUD is one pass over cached values.
 *
 * The layout is a fixed set of corner regions on a single unit scale, `--u`,
 * which the stylesheet derives from the viewport. The canvas widgets need that
 * number too, so it is read back from computed style once per resize and passed
 * down — the only layout read in the module outside of resize handling.
 */
import * as THREE from 'three';
import { div, setClass, setStyle } from '../Dom';
import type { FrameState, ScopeKind } from '../HudState';
import type { Contact } from '../HudState';
import type { KillstreakExtras } from '../HudState';
import type { CrosshairStyle, SettingsData } from '../Settings';
import { Ammo } from './Ammo';
import { Announce } from './Announce';
import { Compass, type CompassMark } from './Compass';
import { DebugReadout } from './DebugReadout';
import type { HitKind } from './Hitmarker';
import { Killfeed } from './Killfeed';
import { Minimap, type MapMark } from './Minimap';
import { placeholderMap, rasteriseNavGrid, type RasterisedMap } from './MapRaster';
import { ReticleLayer } from './Reticle';
import { Scope } from './Scope';
import { Streak } from './Streak';
import { Vitals, ScreenFx } from './Vitals';
import { WorldMarkers } from './WorldMarkers';
import type { NavGrid } from '../../core/Contracts';

/** How often the compass/minimap marker lists are rebuilt. */
const MARK_HZ = 12;
/** How often the nearest-landmark search runs. */
const PLACE_HZ = 3;
/** Landmarks shown on the compass, nearest first. */
const MAX_LANDMARKS = 3;
/** Metres beyond which a landmark stops being worth a compass tick. */
const LANDMARK_RANGE = 46;

export class Hud {
  readonly root: HTMLDivElement;

  readonly fx: ScreenFx;
  readonly scope: Scope;
  readonly reticle: ReticleLayer;
  readonly markers: WorldMarkers;
  readonly minimap: Minimap;
  readonly compass: Compass;
  readonly killfeed: Killfeed;
  readonly ammo: Ammo;
  readonly vitals: Vitals;
  readonly streak: Streak;
  readonly announce: Announce;
  readonly debug: DebugReadout;

  private readonly landmarks: Array<{ name: string; position: THREE.Vector3 }> = [];
  private readonly compassMarks: CompassMark[] = [];
  private readonly mapMarks: MapMark[] = [];
  private readonly nearest: Array<{ name: string; position: THREE.Vector3; d2: number }> = [];

  private unit = 10.8;
  // Zero rather than a plausible default: the first `resize` has to fall through
  // and measure, and a guessed size that happened to match would skip it.
  private viewWidth = 0;
  private viewHeight = 0;
  private measuredDpr = 0;
  private crosshair: CrosshairStyle = 'dynamic';
  private nextMarks = 0;
  private nextPlace = 0;
  private hidden = false;
  private standDown = false;
  private place = '';

  constructor(parent: HTMLElement, streaks: () => KillstreakExtras | undefined) {
    this.root = div('ob-hud', parent);

    // Order is paint order. Screen effects and the scope surround sit under the
    // chrome so the readouts stay legible on top of both.
    this.fx = new ScreenFx(this.root);
    this.scope = new Scope(this.root);
    this.reticle = new ReticleLayer(this.root);
    this.markers = new WorldMarkers(this.root);

    this.minimap = new Minimap(this.root);
    this.compass = new Compass(this.root);
    this.killfeed = new Killfeed(this.root);
    this.ammo = new Ammo(this.root);

    // One bottom-left column, growing upward: toasts, then score and streak,
    // then vitals hard against the corner. A free-floating toast stack had
    // nothing to align to and read as a stray tooltip.
    const bottomLeft = div('ob-bl region-bl', this.root);
    this.announce = new Announce(this.root, bottomLeft);
    this.streak = new Streak(bottomLeft, this.root, streaks);
    this.vitals = new Vitals(bottomLeft);

    this.debug = new DebugReadout(this.root);
  }

  // -------------------------------------------------------------------------
  // Setup
  // -------------------------------------------------------------------------

  /** Rasterises the level once and hands the image to the minimap. */
  buildMap(nav: NavGrid | null, halfExtent: number): RasterisedMap | null {
    const map = nav ? rasteriseNavGrid(nav) : null;
    const result = map ?? placeholderMap(halfExtent);
    this.minimap.setMap(result);
    return map;
  }

  setLandmarks(source: ReadonlyMap<string, THREE.Vector3> | undefined): void {
    this.landmarks.length = 0;
    if (!source) return;
    for (const [key, position] of source) {
      // The world keys them as identifiers; the HUD shows them to a player.
      this.landmarks.push({ name: key.replace(/_/g, ' ').toUpperCase(), position: position.clone() });
    }
    this.nextPlace = 0;
  }

  applySettings(data: SettingsData, streakKeys: readonly string[]): void {
    this.crosshair = data.crosshair;
    this.minimap.setRotate(data.minimapRotate);
    this.debug.setVisible(data.showUiStats);
    this.streak.setHotkeys(streakKeys);
    setStyle(this.root, '--chrome', data.hudOpacity.toFixed(2));
  }

  setHidden(hidden: boolean): void {
    if (this.hidden === hidden) return;
    this.hidden = hidden;
    setClass(this.root, 'hidden', hidden);
  }

  /**
   * Partial stand-down for another module's full-screen instrument. Unlike
   * `setHidden` this keeps the announcement channel and the screen effects, so
   * the instrument can still talk to the player and a hit still registers.
   */
  setStandDown(on: boolean): void {
    if (this.standDown === on) return;
    this.standDown = on;
    setClass(this.root, 'standdown', on);
    // The instruments that stand the HUD down are the same ones that composite a
    // graded frame below it, which is what the scope needs to know before it
    // decides whether to grade one itself.
    this.scope.setFramePreGraded(on);
  }

  /**
   * Re-measures the layout. Called from the engine's resize hook, which also
   * fires whenever adaptive resolution nudges the render scale, so it exits
   * early unless the CSS box or the device pixel ratio actually moved.
   */
  resize(): void {
    const rect = this.root.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const dpr = window.devicePixelRatio || 1;
    if (width === this.viewWidth && height === this.viewHeight && dpr === this.measuredDpr) return;
    this.viewWidth = width;
    this.viewHeight = height;
    this.measuredDpr = dpr;

    const raw = getComputedStyle(this.root).getPropertyValue('--u');
    const parsed = Number.parseFloat(raw);
    if (Number.isFinite(parsed) && parsed > 0) this.unit = parsed;

    this.reticle.resize();
    this.compass.resize(this.unit);
    this.minimap.resize(this.unit);
    this.scope.resize(height);
  }

  /** Nearest named landmark, shared with the pause menu's mission strip. */
  get placeName(): string {
    return this.place;
  }

  // -------------------------------------------------------------------------
  // Frame
  // -------------------------------------------------------------------------

  update(state: FrameState, dt: number, fov: number, contacts: readonly Contact[]): void {
    // Scope first: it publishes the blended overlay amount that the crosshair
    // and the chrome fade both read.
    this.scope.update(state);

    this.reticle.update(state, dt, this.crosshair, fov, this.viewHeight);
    this.ammo.update(state);
    this.vitals.update(state);
    this.fx.update(state);
    this.streak.update(state);
    this.killfeed.update(state.time);
    this.announce.update(state.time);

    if (state.time >= this.nextMarks) {
      this.nextMarks = state.time + 1 / MARK_HZ;
      this.rebuildMarks(state);
    }
    if (state.time >= this.nextPlace) {
      this.nextPlace = state.time + 1 / PLACE_HZ;
      this.updatePlace(state);
    }

    this.minimap.setContacts(contacts);
    this.minimap.update(state);
    this.compass.update(state.yaw);
  }

  /** Runs after the camera is final, so the projection is this frame's. */
  lateUpdate(camera: THREE.PerspectiveCamera, state: FrameState): void {
    this.markers.update(
      camera,
      state.eye,
      this.viewWidth,
      this.viewHeight,
      !this.hidden && !this.standDown && state.alive && state.scopeAmount < 0.7,
    );
  }

  hitmarker(kind: HitKind): void {
    this.reticle.hitmarkerAt(kind);
  }

  setScope(kind: ScopeKind, amount: number): void {
    this.scope.set(kind, amount);
  }

  // -------------------------------------------------------------------------
  // Markers
  // -------------------------------------------------------------------------

  private rebuildMarks(state: FrameState): void {
    this.compassMarks.length = 0;
    this.mapMarks.length = 0;
    this.markers.compassList(state.eye, this.compassMarks);
    this.markers.mapList(this.mapMarks);
    for (let i = 0; i < this.nearest.length; i++) {
      const entry = this.nearest[i];
      const dx = entry.position.x - state.eye.x;
      const dz = entry.position.z - state.eye.z;
      if (Math.abs(dx) < 1e-4 && Math.abs(dz) < 1e-4) continue;
      // Only the closest landmark is named. Three labels within 46 m would sit
      // on top of each other on a 104-degree strip.
      this.compassMarks.push({
        bearing: Math.atan2(dx, -dz),
        kind: 'landmark',
        label: i === 0 ? entry.name : undefined,
      });
    }
    this.compass.setMarks(this.compassMarks);
    this.minimap.setMarks(this.mapMarks);
  }

  /**
   * Nearest named places, used both for the compass ticks and for the label
   * under the minimap. 38 landmarks is a linear scan of nothing, three times a
   * second.
   */
  private updatePlace(state: FrameState): void {
    this.nearest.length = 0;
    if (this.landmarks.length === 0) return;
    const limit = LANDMARK_RANGE * LANDMARK_RANGE;
    let bestName = '';
    let best = Number.POSITIVE_INFINITY;
    for (const entry of this.landmarks) {
      const dx = entry.position.x - state.eye.x;
      const dz = entry.position.z - state.eye.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < best) {
        best = d2;
        bestName = entry.name;
      }
      if (d2 > limit) continue;
      // Insertion sort into a three-slot list: cheaper than sorting 38 entries
      // and the list is always tiny.
      let at = this.nearest.length;
      while (at > 0 && this.nearest[at - 1].d2 > d2) at--;
      if (at >= MAX_LANDMARKS) continue;
      this.nearest.splice(at, 0, { name: entry.name, position: entry.position, d2 });
      if (this.nearest.length > MAX_LANDMARKS) this.nearest.length = MAX_LANDMARKS;
    }
    if (bestName && bestName !== this.place) {
      this.place = bestName;
      this.minimap.setPlace(bestName);
    }
  }

  reset(): void {
    this.reticle.reset();
    this.killfeed.clear();
    this.announce.clear();
  }

  dispose(): void {
    this.reticle.dispose();
    this.compass.dispose();
    this.minimap.dispose();
    this.scope.dispose();
    this.markers.clear();
    this.root.remove();
  }
}
