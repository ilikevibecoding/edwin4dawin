import type * as THREE from 'three';
import type { IWorld } from '../core/Interfaces';
import { ClassCell, StyleCell, TextCell, div, el } from './dom';

/**
 * The heading strip across the top of the frame.
 *
 * A hundred and ten degrees of compass under a fixed caret. Two layers, for two
 * different reasons:
 *
 *  - The **graduation and the cardinals** never change relative to each other,
 *    so they are built once as a track three full turns wide and the whole
 *    thing is slid under the caret with a single `translateX`. One composited
 *    property per frame moves eighty ticks.
 *  - The **landmark ticks** do change relative to each other, because their
 *    bearing depends on where the player is standing. So each gets its own
 *    node and its own `translateX`, still transform-only, and the range readout
 *    is quantised to five metres so the text is rewritten a few times a second
 *    rather than a hundred and twenty.
 *
 * `left` is never written. A strip that repositions eighty absolutely
 * positioned ticks per frame is a full layout per frame, and it is measurably
 * the most expensive thing a HUD can do to itself.
 */

/** Degrees visible across the strip. */
const SPAN = 110;
const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const MAX_MARKS = 5;
/**
 * Half-width of the window in which a landmark is close enough to the caret to
 * be worth naming, in degrees. Every landmark on the strip gets a tick; only the
 * one being looked at gets its name, because five names across a hundred and ten
 * degrees overlap each other and the cardinals underneath them, and a strip you
 * cannot read is worse than one with less on it.
 */
const NAME_WINDOW = 18;

interface Mark {
  node: HTMLElement;
  label: TextCell;
  range: TextCell;
  transform: StyleCell;
  opacity: StyleCell;
  named: ClassCell;
}

export class Compass {
  readonly root: HTMLElement;
  private readonly track: HTMLElement;
  private readonly trackTransform: StyleCell;
  private readonly marksLayer: HTMLElement;
  private readonly marks: Mark[] = [];
  private readonly bearingText: TextCell;

  private width = 0;
  private perDegree = 4;
  private landmarks: Array<{ name: string; x: number; z: number }> = [];
  private readonly ranked: Array<{ name: string; bearing: number; range: number }> = [];

  constructor(parent: HTMLElement) {
    this.root = div('hud-compass', parent);
    const bearing = div('hud-compass-bearing', this.root);
    this.bearingText = new TextCell(el('span', 'bearing-value', bearing));
    const window_ = div('hud-compass-window', this.root);
    this.track = div('hud-compass-track', window_);
    this.marksLayer = div('hud-compass-marks', window_);
    div('hud-compass-caret', this.root);
    this.trackTransform = new StyleCell(this.track, 'transform');

    this.buildTrack();
    for (let i = 0; i < MAX_MARKS; i++) this.marks.push(this.buildMark());
  }

  attach(world: IWorld | null): void {
    this.landmarks = [];
    if (!world) return;
    for (const l of world.landmarks) {
      this.landmarks.push({
        name: l.name.toUpperCase(),
        x: l.position.x,
        z: l.position.z,
      });
    }
  }

  resize(width: number, height: number): void {
    const w = Math.round(Math.min(width * 0.42, height * 0.82));
    if (w === this.width) return;
    this.width = w;
    this.perDegree = w / SPAN;
    this.root.style.width = `${w}px`;
    this.track.style.width = `${(1080 * this.perDegree).toFixed(1)}px`;
    for (const item of this.track.children) {
      const node = item as HTMLElement;
      const deg = Number(node.dataset.deg ?? 0);
      node.style.transform = `translateX(${(deg * this.perDegree).toFixed(2)}px)`;
    }
  }

  /** @param yaw View heading in radians, 0 = north, increasing clockwise. */
  update(position: THREE.Vector3, yaw: number): void {
    if (this.width === 0) return;
    let deg = ((yaw * 180) / Math.PI) % 360;
    if (deg < 0) deg += 360;

    // The middle copy of the three-turn track is the one under the caret, so
    // the strip can be dragged 360 degrees either way without a seam.
    const offset = this.width * 0.5 - (deg + 360) * this.perDegree;
    this.trackTransform.set(`translate3d(${offset.toFixed(2)}px,0,0)`);
    this.bearingText.set(`${Math.round(deg).toString().padStart(3, '0')}°`);

    this.rank(position);
    const half = SPAN * 0.5;

    // Which one gets a name: nearest the caret, and only if it is actually being
    // looked at. Resolved before the layout pass so at most one name is ever on
    // the strip.
    let focus = -1;
    let closest = NAME_WINDOW;
    for (let i = 0; i < this.ranked.length; i++) {
      const rel = Math.abs(wrap180(this.ranked[i].bearing - deg));
      if (rel < closest) {
        closest = rel;
        focus = i;
      }
    }

    for (let i = 0; i < this.marks.length; i++) {
      const mark = this.marks[i];
      const item = this.ranked[i];
      if (!item) {
        mark.opacity.set('0');
        mark.named.set(false);
        continue;
      }
      const rel = wrap180(item.bearing - deg);
      if (Math.abs(rel) > half - 2) {
        mark.opacity.set('0');
        mark.named.set(false);
        continue;
      }
      // Faded at the ends rather than clipped, so a landmark arriving on the
      // strip does not blink into existence.
      const edge = 1 - Math.max(0, (Math.abs(rel) - (half - 16)) / 14);
      mark.opacity.set(Math.min(1, edge).toFixed(2));
      mark.transform.set(
        `translate3d(${(this.width * 0.5 + rel * this.perDegree).toFixed(2)}px,0,0)`,
      );
      mark.named.set(i === focus);
      if (i === focus) {
        mark.label.set(item.name);
        mark.range.set(`${Math.round(item.range / 5) * 5}M`);
      }
    }
  }

  private rank(position: THREE.Vector3): void {
    const list = this.ranked;
    list.length = 0;
    for (const l of this.landmarks) {
      const dx = l.x - position.x;
      const dz = l.z - position.z;
      let bearing = (Math.atan2(dx, -dz) * 180) / Math.PI;
      if (bearing < 0) bearing += 360;
      list.push({ name: l.name, bearing, range: Math.hypot(dx, dz) });
    }
    list.sort((a, b) => a.range - b.range);
    list.length = Math.min(list.length, MAX_MARKS);
  }

  private buildTrack(): void {
    for (let turn = 0; turn < 3; turn++) {
      for (let d = 0; d < 360; d += 5) {
        const deg = turn * 360 + d;
        const major = d % 45 === 0;
        const node = div(major ? 'ctick major' : d % 15 === 0 ? 'ctick mid' : 'ctick', this.track);
        node.dataset.deg = String(deg);
        if (major) {
          const label = el('span', 'clabel', node);
          label.textContent = CARDINALS[(d / 45) % 8];
          if (d === 0) node.classList.add('north');
        }
      }
    }
  }

  private buildMark(): Mark {
    const node = div('cmark', this.marksLayer);
    div('cmark-tick', node);
    const text = div('cmark-text', node);
    const label = el('span', 'cmark-name', text);
    const range = el('span', 'cmark-range', text);
    node.style.opacity = '0';
    return {
      node,
      label: new TextCell(label),
      range: new TextCell(range),
      transform: new StyleCell(node, 'transform'),
      opacity: new StyleCell(node, 'opacity'),
      named: new ClassCell(node, 'named'),
    };
  }
}

function wrap180(deg: number): number {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}
