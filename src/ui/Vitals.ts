import type * as THREE from 'three';
import { StyleCell, Surface, clamp01, div, smoothstep } from './dom';

/**
 * Health, and being shot.
 *
 * There is no health bar. A bar is a number the player reads instead of looking
 * at the world, and the modern convention is better on every axis: the screen
 * itself tells you, so the information arrives in peripheral vision while you
 * are still aiming. Four channels carry it, and they are deliberately
 * different in kind so they do not read as one effect fading up:
 *
 *  - **Desaturation and a red vignette**, driven through
 *    `IRenderPipeline.setDamageVignette`, so it is part of the image rather
 *    than a layer over it.
 *  - **Blood on the glass**, procedural spatter concentrated at the edges,
 *    which accumulates with hits and clears as regeneration runs. This is the
 *    channel that says *how long since* rather than *how much*.
 *  - **A heartbeat**, a double-thump pulse that only exists below a third and
 *    grows in rate and depth as it gets worse. Motion in the periphery is
 *    noticed when a colour shift is not.
 *  - **Directional arcs**, which are the only part that is about the enemy
 *    rather than about you: where the round came from, at the edge of the frame.
 *
 * The arcs are canvas because they are per-frame vector work at arbitrary
 * angles; the spatter and the pulse are DOM because they are two composited
 * layers whose only animated property is opacity.
 */

const ARC_LIFE = 1.25;
const ARC_MERGE = 0.22;

interface Arc {
  /** Bearing of the source relative to the view, radians, right positive. */
  bearing: number;
  age: number;
  weight: number;
}

/** Deterministic noise for the spatter, so two runs photograph identically. */
function rng(seed: number): () => number {
  let s = seed | 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

export class Vitals {
  private readonly arcs: Arc[] = [];
  private readonly surface: Surface;
  private readonly bloodLight: HTMLElement;
  private readonly bloodHeavy: HTMLElement;
  private readonly pulse: HTMLElement;
  private readonly bloodLightOpacity: StyleCell;
  private readonly bloodHeavyOpacity: StyleCell;
  private readonly pulseOpacity: StyleCell;

  /** 0..1 spatter load, driven up by hits and down by regeneration. */
  private grime = 0;
  private beat = 0;
  private lastHealth = 1;
  private arcsDirty = false;

  constructor(parent: HTMLElement) {
    this.bloodHeavy = div('hud-blood hud-blood-heavy', parent);
    this.bloodLight = div('hud-blood hud-blood-light', parent);
    this.pulse = div('hud-pulse', parent);
    this.surface = new Surface('hud-damage', parent);

    this.bloodLight.style.backgroundImage = `url(${spatter(0x51ee, 14, 0.6)})`;
    this.bloodHeavy.style.backgroundImage = `url(${spatter(0x9c31, 26, 1)})`;

    this.bloodLightOpacity = new StyleCell(this.bloodLight, 'opacity');
    this.bloodHeavyOpacity = new StyleCell(this.bloodHeavy, 'opacity');
    this.pulseOpacity = new StyleCell(this.pulse, 'opacity');

    for (let i = 0; i < 8; i++) this.arcs.push({ bearing: 0, age: ARC_LIFE + 1, weight: 0 });
  }

  resize(width: number, height: number, ratio: number): void {
    this.surface.resize(width, height, ratio);
  }

  /**
   * Records a hit. `bearing` is the source's direction relative to the view in
   * radians with right positive; the caller does the projection because it has
   * the camera basis and this does not.
   */
  hit(bearing: number, amount: number): void {
    const weight = clamp01(0.4 + amount / 55);
    // Two rounds from the same rifle are one threat, not two arcs. Merging on
    // bearing also stops a burst from stacking eight indicators into an opaque
    // red band, which is what the first version did.
    let slot: Arc | null = null;
    let oldest = this.arcs[0];
    for (const a of this.arcs) {
      if (a.age <= ARC_LIFE && Math.abs(angleDelta(a.bearing, bearing)) < ARC_MERGE) {
        slot = a;
        break;
      }
      if (a.age > oldest.age) oldest = a;
    }
    const arc = slot ?? oldest;
    arc.bearing = bearing;
    arc.age = 0;
    arc.weight = Math.max(slot ? arc.weight : 0, weight);
    this.grime = Math.min(1, this.grime + 0.16 + weight * 0.3);
  }

  clear(): void {
    for (const a of this.arcs) a.age = ARC_LIFE + 1;
    this.grime = 0;
    this.beat = 0;
  }

  /** Full spatter and a hard pulse, for the death screen and the showcase. */
  force(grime: number): void {
    this.grime = clamp01(grime);
  }

  /**
   * Places the heartbeat at a chosen point in its cycle. The pulse is at its
   * strongest around 0.06, which is where the screenshot harness wants it: a
   * still frame taken at a trough shows no pulse at all and reads as a bug.
   */
  poseBeat(phase: number): void {
    this.beat = phase - Math.floor(phase);
  }

  /**
   * @returns the 0..1 amount to hand to `IRenderPipeline.setDamageVignette`.
   */
  update(
    dt: number,
    healthFraction: number,
    alive: boolean,
    hudVisible: boolean,
  ): number {
    const hp = clamp01(healthFraction);

    // Regeneration cleans the glass; taking damage dirties it. Tying the spatter
    // to *recovery* rather than to the health value itself is what makes it
    // read as "I got hurt a moment ago" instead of as a second health bar.
    if (hp > this.lastHealth + 1e-4) this.grime = Math.max(0, this.grime - dt * 0.42);
    else this.grime = Math.max(0, this.grime - dt * 0.05);
    this.lastHealth = hp;

    const wounded = 1 - smoothstep(0.2, 0.92, hp);
    // The three channels are additive over the same frame, so each one is
    // budgeted rather than driven to full: the post vignette does the heavy
    // lifting, and these two only have to say "edges of the visor". Together at
    // ten health they cost roughly a third of the frame's contrast, which is the
    // most a shooter can take away and still be playable.
    const load = alive ? Math.max(this.grime, wounded * 0.7) : 1;
    this.bloodLightOpacity.set((clamp01(load * 1.35) * 0.34).toFixed(3));
    this.bloodHeavyOpacity.set((smoothstep(0.38, 1, load) * 0.38).toFixed(3));

    // Critical only. A heartbeat that runs at half health is noise; one that
    // starts at a third is information.
    const critical = alive ? smoothstep(0.34, 0.1, hp) : 0;
    if (critical > 0.001) {
      this.beat += dt * (1.05 + critical * 0.75);
      if (this.beat > 1) this.beat -= 1;
      this.pulseOpacity.set((thump(this.beat) * critical * 0.5).toFixed(3));
    } else {
      this.beat = 0;
      this.pulseOpacity.set('0');
    }

    this.drawArcs(dt, hudVisible);

    // Shaped so the frame is untouched down to three quarters and unmistakable
    // at a tenth, rather than creeping in linearly from full health. The ceiling
    // is low because the grade's damage term is not a vignette: it tints the
    // centre of the frame at 35% of whatever it is handed and desaturates the
    // whole image, so anything near 1 turns a sunlit street into a red slide.
    // 0.38 lands at roughly a tenth red through the middle and a quarter at the
    // corners, which is as far as it can go and leave the picture readable.
    return (alive ? 0.38 : 0.55) * smoothstep(0.8, 0.08, hp);
  }

  private drawArcs(dt: number, hudVisible: boolean): void {
    const s = this.surface;
    if (s.width === 0) return;

    let live = false;
    for (const a of this.arcs) {
      if (a.age <= ARC_LIFE) {
        a.age += dt;
        live = true;
      }
    }
    if (!live || !hudVisible) {
      if (this.arcsDirty) {
        s.clear();
        this.arcsDirty = false;
      }
      return;
    }

    s.clear();
    this.arcsDirty = true;
    const g = s.g;
    const cx = s.width * 0.5;
    const cy = s.height * 0.5;
    const u = Math.max(1, s.height / 720);
    // Laid on an ellipse rather than a circle, so an indicator for a shot from
    // dead ahead sits the same distance from the top edge as one from the flank
    // sits from the side edge. On a circle at 16:9 the flank indicators land a
    // long way inboard and stop reading as *edge* of frame at all.
    const rx = s.width * 0.405;
    const ry = s.height * 0.4;

    for (const a of this.arcs) {
      if (a.age > ARC_LIFE) continue;
      const t = clamp01(a.age / ARC_LIFE);
      // Punches in from outside the frame and settles: an indicator that simply
      // fades up is read a beat later than one that moves.
      const settle = smoothstep(0, 0.15, a.age);
      const alpha = (1 - t * t) * (0.6 + a.weight * 0.4);
      const push = 1.08 - 0.08 * settle;
      const thickness = (7.5 + a.weight * 5.5) * u;
      const half = 0.105 + a.weight * 0.035;
      const centre = a.bearing - Math.PI / 2;

      g.save();
      g.globalAlpha = alpha;
      g.translate(cx, cy);

      // A crescent whose thickness tapers to nothing at both ends, built as one
      // filled path. Two stroked arcs were tried first and read as a fragment of
      // a dial; a shape that is thickest exactly on the bearing reads as an
      // arrowhead bent around the frame, which is what it is for.
      const steps = 20;
      g.beginPath();
      for (let i = 0; i <= steps; i++) {
        const f = i / steps;
        const angle = centre + (f - 0.5) * 2 * half;
        const taper = Math.pow(Math.sin(f * Math.PI), 0.42);
        const r = ellipse(angle, rx, ry) * push;
        // Thickness grows outward only, so the inner edge is a clean arc and the
        // outer edge is the bulge: that asymmetry is what makes it read as
        // pointing away from the player rather than as a lens on the frame.
        const out = r + thickness * taper;
        const x = Math.cos(angle) * out;
        const y = Math.sin(angle) * out;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      for (let i = steps; i >= 0; i--) {
        const f = i / steps;
        const angle = centre + (f - 0.5) * 2 * half;
        const r = ellipse(angle, rx, ry) * push;
        g.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      g.closePath();

      const mid = ellipse(centre, rx, ry) * push;
      const cxm = Math.cos(centre) * mid;
      const cym = Math.sin(centre) * mid;
      const nx = Math.cos(centre);
      const ny = Math.sin(centre);
      // Graded across the thickness rather than along the arc: bright on the
      // inside edge, deepening outward, which is the direction the eye tracks.
      const body = g.createLinearGradient(
        cxm,
        cym,
        cxm + nx * thickness * 1.1,
        cym + ny * thickness * 1.1,
      );
      body.addColorStop(0, 'rgba(255, 148, 128, 0.98)');
      body.addColorStop(0.4, 'rgba(252, 62, 44, 0.96)');
      body.addColorStop(1, 'rgba(184, 18, 10, 0.78)');
      g.fillStyle = body;
      g.fill();

      // A hairline of shadow on the outside only, which is what keeps a red arc
      // legible against a bleached ochre wall without darkening the shape.
      g.strokeStyle = 'rgba(24, 3, 2, 0.55)';
      g.lineWidth = 1;
      g.stroke();

      // A short wash bleeding outward from behind it, so the direction is
      // carried by that whole corner of the frame and not only by the shape.
      const glow = g.createRadialGradient(cxm, cym, 0, cxm, cym, Math.min(rx, ry) * 0.55);
      glow.addColorStop(0, `rgba(255, 46, 30, ${(0.24 * alpha).toFixed(3)})`);
      glow.addColorStop(0.6, `rgba(255, 46, 30, ${(0.07 * alpha).toFixed(3)})`);
      glow.addColorStop(1, 'rgba(255, 46, 30, 0)');
      g.globalAlpha = 1;
      g.fillStyle = glow;
      g.fillRect(-cx, -cy, s.width, s.height);
      g.restore();
    }
  }
}

/** Radius of an axis-aligned ellipse in a given direction. */
function ellipse(angle: number, rx: number, ry: number): number {
  const c = Math.cos(angle) / rx;
  const s = Math.sin(angle) / ry;
  return 1 / Math.max(1e-6, Math.hypot(c, s));
}

/** Signed shortest angular difference, in radians. */
function angleDelta(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** A double-thump cardiac envelope over one normalised cycle. */
function thump(t: number): number {
  const beat = (phase: number, width: number): number => {
    const x = (t - phase) / width;
    return x < 0 || x > 1 ? 0 : Math.sin(x * Math.PI) ** 2;
  };
  return Math.min(1, beat(0, 0.13) + beat(0.18, 0.1) * 0.62);
}

/**
 * Bakes a screen-edge blood spatter into a data URL.
 *
 * Drawn once at boot rather than per frame, and masked radially so the middle
 * of the frame — where the player is actually aiming — stays clear however bad
 * it gets. Irregular by construction: a spatter made of circles reads as
 * bubbles, so each blot is a wobbled polygon with satellites thrown off it.
 */
function spatter(seed: number, blots: number, weight: number): string {
  const W = 1024;
  const H = 576;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  if (!g) return '';
  const rand = rng(seed);

  const blot = (x: number, y: number, r: number, alpha: number): void => {
    g.beginPath();
    const points = 11;
    for (let i = 0; i <= points; i++) {
      const a = (i / points) * Math.PI * 2;
      const wobble = r * (0.62 + rand() * 0.68);
      const px = x + Math.cos(a) * wobble;
      const py = y + Math.sin(a) * wobble * (0.78 + rand() * 0.4);
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    // Not near-black. The layer multiplies, and a blot dark enough to look like
    // blood on a white page turns a shaded souk doorway into a hole.
    const grad = g.createRadialGradient(x, y, 0, x, y, r * 1.25);
    grad.addColorStop(0, `rgba(172, 34, 26, ${alpha})`);
    grad.addColorStop(0.62, `rgba(136, 20, 16, ${alpha * 0.84})`);
    grad.addColorStop(1, `rgba(104, 12, 11, ${alpha * 0.26})`);
    g.fillStyle = grad;
    g.fill();
  };

  for (let i = 0; i < blots; i++) {
    // Confined to narrow bands along the four edges. The first version biased a
    // radius outward and let the tail land anywhere, which at full strength
    // covered the middle of the frame and made the game unplayable at low
    // health — the one thing this effect must never do.
    const edge = rand();
    const along = rand();
    let x: number;
    let y: number;
    if (edge < 0.27) {
      x = along * W;
      y = rand() * H * 0.11;
    } else if (edge < 0.54) {
      x = along * W;
      y = H - rand() * H * 0.14;
    } else if (edge < 0.77) {
      x = rand() * W * 0.085;
      y = along * H;
    } else {
      x = W - rand() * W * 0.085;
      y = along * H;
    }
    const r = (11 + rand() * 34) * (0.7 + weight * 0.45);
    blot(x, y, r, (0.34 + rand() * 0.42) * weight);
    const satellites = 3 + Math.floor(rand() * 7);
    for (let k = 0; k < satellites; k++) {
      const a = rand() * Math.PI * 2;
      // Thrown along the edge rather than in from it, so the streak reads as
      // spatter running across the glass instead of creeping toward the middle.
      const d = r * (0.9 + rand() * 1.8);
      blot(
        x + Math.cos(a) * d * 1.5,
        y + Math.sin(a) * d * 0.55,
        1.6 + rand() * 7,
        (0.24 + rand() * 0.38) * weight,
      );
    }
  }

  // Insurance only: the bands already keep the aiming area clear, so this just
  // guarantees the very middle is untouched however the noise falls.
  const mask = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.3);
  mask.addColorStop(0, 'rgba(0,0,0,0)');
  mask.addColorStop(0.62, 'rgba(0,0,0,0.12)');
  mask.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-in';
  g.fillStyle = mask;
  g.fillRect(0, 0, W, H);

  return canvas.toDataURL('image/png');
}

/**
 * Bearing of a world position relative to the camera basis, right positive.
 * Shared by the damage arcs and the minimap so both agree on where "behind" is.
 */
export function screenBearing(
  from: THREE.Vector3,
  forward: THREE.Vector3,
  target: THREE.Vector3,
): number {
  const dx = target.x - from.x;
  const dz = target.z - from.z;
  if (dx * dx + dz * dz < 1e-6) return 0;
  const fx = forward.x;
  const fz = forward.z;
  const len = Math.hypot(fx, fz) || 1;
  const ahead = (dx * fx + dz * fz) / len;
  // Right-hand vector on the ground plane for a Y-up world.
  const right = (dx * -fz + dz * fx) / len;
  return Math.atan2(right, ahead);
}
