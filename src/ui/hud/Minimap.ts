/**
 * The minimap.
 *
 * A rasterised floor plan of the level (see MapRaster), the player at the centre
 * with a field-of-view wedge, and blips for everything the player is entitled to
 * know about: hostiles a UAV has actually painted, hostiles who have just fired
 * at them regardless, killstreak markers and objectives.
 *
 * Rotation is a setting. North-up is easier to build a mental model from and
 * rotating is easier to act on, and players are religious about both.
 */
import { CanvasLayer, div, setText, span } from '../Dom';
import { COLOR, FONT } from '../Theme';
import type { Contact, FrameState, UavSweep } from '../HudState';
import type { MarkKind } from './Compass';
import type { RasterisedMap } from './MapRaster';
import { rgba, shadowText } from './Draw';

export interface MapMark {
  x: number;
  z: number;
  kind: MarkKind;
  label?: string;
}

/** Metres visible across the map. Tuned against a 120 m playable square. */
const SPAN_METRES = 72;
/** The map is redrawn at this rate rather than every frame. */
const HZ = 30;
/** Radians of decaying tail behind the drone's radar arm. */
const SWEEP_ARC = 0.9;

export class Minimap {
  readonly root: HTMLDivElement;

  private readonly layer: CanvasLayer;
  private readonly placeEl: HTMLElement;
  private readonly aliveEl: HTMLElement;

  private map: RasterisedMap | null = null;
  private marks: readonly MapMark[] = [];
  private contacts: readonly Contact[] = [];
  private uav: UavSweep | null = null;
  private rotate = true;
  private unit = 10;
  private nextDraw = 0;
  /** Depends only on the canvas size, so it is rebuilt on resize, not per draw. */
  private cone: CanvasGradient | null = null;
  private northFont = '';

  constructor(parent: HTMLElement) {
    this.root = div('ob-mm region-tl', parent);
    const frame = div('ob-mm-frame brackets', this.root);
    this.layer = new CanvasLayer('ob-mm-canvas', frame);
    div('ob-mm-grad', frame);
    // Inside the frame rather than in the bar below: place names run long and
    // the two competing for one row was truncating both.
    const badge = div('ob-mm-badge', frame);
    span('ob-mm-pip', badge);
    this.aliveEl = span('n', badge, '0');
    const bar = div('ob-mm-bar', this.root);
    this.placeEl = span('ob-mm-place', bar, 'AL-RASHID CROSSING');
  }

  setMap(map: RasterisedMap | null): void {
    this.map = map;
    this.nextDraw = 0;
  }

  setRotate(rotate: boolean): void {
    if (this.rotate === rotate) return;
    this.rotate = rotate;
    this.nextDraw = 0;
  }

  setMarks(marks: readonly MapMark[]): void {
    this.marks = marks;
  }

  setContacts(contacts: readonly Contact[]): void {
    this.contacts = contacts;
  }

  setUav(uav: UavSweep): void {
    this.uav = uav;
  }

  setPlace(name: string): void {
    setText(this.placeEl, name);
  }

  resize(unit: number): void {
    this.unit = unit;
    this.layer.measure(2);
    this.cone = null;
    this.northFont = `700 ${(unit * 1.05).toFixed(1)}px ${FONT.condensed}`;
    this.nextDraw = 0;
  }

  update(state: FrameState): void {
    setText(this.aliveEl, String(state.aliveEnemies));
    if (state.time < this.nextDraw) return;
    this.nextDraw = state.time + 1 / HZ;
    this.draw(state);
  }

  private draw(state: FrameState): void {
    const ctx = this.layer.begin();
    const w = this.layer.width;
    const h = this.layer.height;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const scale = Math.min(w, h) / SPAN_METRES;
    const yaw = state.yaw;
    const rot = this.rotate ? yaw : 0;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const px = state.eye.x;
    const pz = state.eye.z;

    ctx.fillStyle = 'rgba(7, 10, 13, 0.92)';
    ctx.fillRect(0, 0, w, h);
    // Whatever the rasterised plan does not cover is outside the playable area.
    // Left flat it reads as a hole in the map; hatched it reads as a boundary.
    this.drawOutOfBounds(ctx, w, h, rot);

    const map = this.map;
    if (map) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.scale(scale, scale);
      ctx.translate(-px, -pz);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(map.canvas, map.originX, map.originZ, map.widthMetres, map.depthMetres);
      ctx.restore();
    }

    // Field of view wedge, drawn from the player outwards.
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const sfx = fx * cos - fz * sin;
    const sfz = fx * sin + fz * cos;
    const facing = Math.atan2(sfz, sfx);
    const halfFov = 0.62;
    const reach = Math.min(w, h) * 0.46;
    let cone = this.cone;
    if (!cone) {
      cone = ctx.createRadialGradient(cx, cy, 2, cx, cy, reach);
      cone.addColorStop(0, rgba(COLOR.accent, 0.24));
      cone.addColorStop(1, rgba(COLOR.accent, 0));
      this.cone = cone;
    }
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, reach, facing - halfFov, facing + halfFov);
    ctx.closePath();
    ctx.fill();

    // Hostiles the drone has actually painted. Its own contacts age out, so the
    // strength it publishes is the blip's alpha: a stale one fades rather than
    // sitting there at full strength claiming to be a live position.
    const uav = this.uav;
    if (uav && uav.active(state.time)) {
      this.drawSweepArm(ctx, cx, cy, rot, uav.sweep, Math.hypot(cx, cy));
      for (let i = 0; i < uav.count; i++) {
        const blip = uav.blips[i];
        ctx.globalAlpha = 0.35 + 0.65 * Math.max(0, Math.min(1, blip.strength));
        this.blip(ctx, cx, cy, scale, cos, sin, px, pz, blip.x, blip.z, COLOR.danger, 'triangle');
        ctx.globalAlpha = 1;
      }
    }
    for (const contact of this.contacts) {
      const fade = Math.min(1, Math.max(0.25, contact.until - state.time));
      ctx.globalAlpha = fade;
      this.blip(ctx, cx, cy, scale, cos, sin, px, pz, contact.x, contact.z, COLOR.danger, 'ping');
      ctx.globalAlpha = 1;
    }

    for (const mark of this.marks) {
      const colour =
        mark.kind === 'streak' ? COLOR.warn : mark.kind === 'hostile' ? COLOR.danger : COLOR.accent;
      this.blip(ctx, cx, cy, scale, cos, sin, px, pz, mark.x, mark.z, colour, 'diamond', true);
    }

    this.drawNorth(ctx, cx, cy, cos, sin, Math.min(w, h));
    this.drawPlayer(ctx, cx, cy, facing);
  }

  /**
   * The drone's radar sweep. Quiet, but not invisible: its job is to make "a UAV
   * is up" a legible state at a glance, while the blips it turns up stay the
   * part the player actually reads. The module's sweep angle is a compass
   * bearing, the same convention as the compass strip, so it needs the map's
   * rotation applied and a quarter turn to reach canvas angles.
   */
  private drawSweepArm(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rot: number,
    sweep: number,
    reach: number,
  ): void {
    const angle = sweep + rot - Math.PI / 2;
    // Trailing, not leading: behind the arm is where contacts have just been
    // painted and are at full strength. Stepped rather than filled flat, so the
    // tail decays into the map instead of ending on a visible edge — a wedge of
    // one alpha and a hard line read as a scratch across the plan rather than as
    // a beam that has just gone past.
    const steps = 7;
    const step = SWEEP_ARC / steps;
    ctx.save();
    for (let i = 0; i < steps; i++) {
      const near = angle - step * i;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, reach, near - step, near);
      ctx.closePath();
      // Neutral, not accent: the player's own view cone is already an accent
      // wedge on this canvas, and a second green wedge sweeping past it reads as
      // the cone having come loose rather than as a separate instrument.
      ctx.fillStyle = `rgba(226, 232, 240, ${(0.115 * (1 - i / steps) ** 1.6).toFixed(4)})`;
      ctx.fill();
    }
    // The leading edge is what makes the wedge read as a beam that has just gone
    // past rather than as a stain on the plan, so it is brighter than the fan
    // and it fades along its length — at full alpha the whole way out it is a
    // scratch across the map, which is how this first went wrong.
    const tipX = cx + Math.cos(angle) * reach;
    const tipY = cy + Math.sin(angle) * reach;
    const arm = ctx.createLinearGradient(cx, cy, tipX, tipY);
    arm.addColorStop(0, 'rgba(240, 246, 252, 0.6)');
    arm.addColorStop(0.55, 'rgba(240, 246, 252, 0.26)');
    arm.addColorStop(1, 'rgba(240, 246, 252, 0)');
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(tipX, tipY);
    ctx.strokeStyle = arm;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  }

  /** Diagonal hatch, rotated with the map so it reads as ground, not as glass. */
  private drawOutOfBounds(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    rot: number,
  ): void {
    const step = this.unit * 0.9;
    const reach = Math.hypot(w, h);
    ctx.save();
    ctx.translate(w * 0.5, h * 0.5);
    ctx.rotate(rot + Math.PI / 4);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -reach; x <= reach; x += step) {
      ctx.moveTo(x, -reach);
      ctx.lineTo(x, reach);
    }
    ctx.stroke();
    ctx.restore();
  }

  private blip(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    scale: number,
    cos: number,
    sin: number,
    px: number,
    pz: number,
    wx: number,
    wz: number,
    colour: string,
    shape: 'triangle' | 'diamond' | 'ping',
    clampToEdge = false,
  ): void {
    const dx = wx - px;
    const dz = wz - pz;
    let sx = cx + (dx * cos - dz * sin) * scale;
    let sy = cy + (dx * sin + dz * cos) * scale;
    // Clear of the frame's own border: a marker pinned exactly at the edge reads
    // as having fallen out of the panel.
    const pad = this.unit * 0.95;
    const inside = sx >= pad && sx <= cx * 2 - pad && sy >= pad && sy <= cy * 2 - pad;
    if (!inside) {
      if (!clampToEdge) return;
      sx = Math.max(pad, Math.min(cx * 2 - pad, sx));
      sy = Math.max(pad, Math.min(cy * 2 - pad, sy));
    }

    const r = this.unit * (shape === 'ping' ? 0.38 : 0.42);
    ctx.save();
    // Dimmed when clamped, so a bearing is never mistaken for a position.
    if (!inside) ctx.globalAlpha *= 0.66;
    ctx.translate(Math.round(sx), Math.round(sy));
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    if (shape === 'triangle') {
      ctx.moveTo(0, -r * 1.25);
      ctx.lineTo(r, r * 0.95);
      ctx.lineTo(-r, r * 0.95);
    } else if (shape === 'diamond') {
      ctx.moveTo(0, -r * 1.3);
      ctx.lineTo(r * 1.1, 0);
      ctx.lineTo(0, r * 1.3);
      ctx.lineTo(-r * 1.1, 0);
    } else {
      ctx.arc(0, 0, r, 0, Math.PI * 2);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = colour;
    ctx.fill();
    ctx.restore();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, cx: number, cy: number, facing: number): void {
    const r = this.unit * 0.62;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(facing + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.35);
    ctx.lineTo(r * 0.92, r);
    ctx.lineTo(0, r * 0.55);
    ctx.lineTo(-r * 0.92, r);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.fillStyle = COLOR.white;
    ctx.fill();
    ctx.restore();
  }

  private drawNorth(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    cos: number,
    sin: number,
    size: number,
  ): void {
    // North is -Z; run it through the same rotation as the map so the letter
    // tracks the map instead of being pinned to the top of a rotating frame.
    const nx = 0 * cos - -1 * sin;
    const nz = 0 * sin + -1 * cos;
    const r = size * 0.42;
    const x = cx + nx * r;
    const y = cy + nz * r;
    ctx.font = this.northFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    shadowText(ctx, 'N', x, y, COLOR.accent);
  }

  dispose(): void {
    this.layer.dispose();
  }
}
