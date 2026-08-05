import * as THREE from 'three';
import type { Actor } from '../actors/Actor';

/**
 * Shot framing.
 *
 * Camera positions are derived from where the actors actually are rather than
 * hard-coded, so a shot stays correctly composed when staging changes. Framings
 * follow standard coverage: singles, over-the-shoulder two-shots, and wides that
 * keep the subject on a third.
 */

export interface Shot {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
  /** Where the lens should focus; usually the subject's eyes. */
  focus: THREE.Vector3;
  bokeh: number;
  /** Camera roll in radians, for unease. */
  roll?: number;
}

const v = (): THREE.Vector3 => new THREE.Vector3();

/** Horizontal direction from a to b. */
function flatDir(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3 {
  const d = v().subVectors(to, from);
  d.y = 0;
  if (d.lengthSq() < 1e-8) d.set(0, 0, 1);
  return d.normalize();
}

function perpendicular(dir: THREE.Vector3): THREE.Vector3 {
  return v().set(-dir.z, 0, dir.x);
}

export interface SingleOptions {
  /** Lens length in millimetres, converted to a vertical FOV. */
  lens?: number;
  /** Distance from the subject in metres. */
  distance?: number;
  /** Positive swings the camera to the subject's left. */
  angle?: number;
  /** Height offset relative to the subject's eyes. */
  rise?: number;
  bokeh?: number;
  /** Where the subject is looking, used to place the camera off their eyeline. */
  lookingAt?: THREE.Vector3;
}

/** 35mm-equivalent lens to vertical FOV for a 24mm-high sensor. */
export function lensToFov(lens: number): number {
  return 2 * Math.atan(24 / (2 * lens)) * (180 / Math.PI);
}

/** Single of one actor, angled off their eyeline so the face reads in depth. */
export function single(actor: Actor, opts: SingleOptions = {}): Shot {
  const lens = opts.lens ?? 65;
  const distance = opts.distance ?? 1.5;
  const angle = opts.angle ?? 0.5;
  const eyes = actor.getEyePosition(v());
  const facing = opts.lookingAt
    ? flatDir(actor.root.position, opts.lookingAt)
    : new THREE.Vector3(0, 0, 1).applyQuaternion(actor.root.quaternion).setY(0).normalize();
  const side = perpendicular(facing);
  const dir = facing.clone().multiplyScalar(Math.cos(angle)).addScaledVector(side, Math.sin(angle)).normalize();
  const position = eyes.clone().addScaledVector(dir, distance);
  position.y += opts.rise ?? 0.02;
  return {
    position,
    target: eyes.clone(),
    focus: eyes.clone(),
    fov: lensToFov(lens),
    bokeh: opts.bokeh ?? 3.4,
  };
}

/** Close-up: tight, shallow, slightly below eye level so the subject has weight. */
export function closeUp(actor: Actor, opts: SingleOptions = {}): Shot {
  return single(actor, { lens: 85, distance: 0.95, angle: 0.42, rise: -0.03, bokeh: 5.0, ...opts });
}

export function medium(actor: Actor, opts: SingleOptions = {}): Shot {
  const shot = single(actor, { lens: 50, distance: 2.4, angle: 0.55, bokeh: 3.0, ...opts });
  shot.target.y -= 0.18;
  return shot;
}

/**
 * Over-the-shoulder two-shot: the foreground actor's shoulder frames the
 * subject, which is what makes a dialogue exchange feel like a conversation
 * rather than two separate singles.
 */
export function overShoulder(
  foreground: Actor,
  subject: Actor,
  opts: { lens?: number; side?: number; distance?: number; rise?: number; bokeh?: number } = {}
): Shot {
  const lens = opts.lens ?? 58;
  const side = opts.side ?? 1;
  const fgEyes = foreground.getEyePosition(v());
  const subjEyes = subject.getEyePosition(v());
  const dir = flatDir(fgEyes, subjEyes);
  const perp = perpendicular(dir).multiplyScalar(side);
  // Behind and to one side of the foreground actor's head.
  const position = fgEyes
    .clone()
    .addScaledVector(dir, -(opts.distance ?? 0.62))
    .addScaledVector(perp, 0.34);
  position.y += opts.rise ?? 0.06;
  return {
    position,
    target: subjEyes.clone(),
    focus: subjEyes.clone(),
    fov: lensToFov(lens),
    bokeh: opts.bokeh ?? 3.6,
  };
}

/** Wide that holds two actors, placed off the axis between them. */
export function twoShot(
  a: Actor,
  b: Actor,
  opts: { lens?: number; distance?: number; side?: number; rise?: number } = {}
): Shot {
  const pa = a.getEyePosition(v());
  const pb = b.getEyePosition(v());
  const mid = pa.clone().add(pb).multiplyScalar(0.5);
  const axis = flatDir(pa, pb);
  const perp = perpendicular(axis).multiplyScalar(opts.side ?? 1);
  const separation = pa.distanceTo(pb);
  const distance = opts.distance ?? Math.max(2.6, separation * 1.15);
  const position = mid.clone().addScaledVector(perp, distance);
  position.y += opts.rise ?? 0.25;
  return {
    position,
    target: mid.clone(),
    focus: mid.clone(),
    fov: lensToFov(opts.lens ?? 40),
    bokeh: 2.0,
  };
}

/** Establishing wide from an arbitrary viewpoint. */
export function establish(
  from: THREE.Vector3,
  lookAt: THREE.Vector3,
  opts: { lens?: number; focusOn?: THREE.Vector3; bokeh?: number; roll?: number } = {}
): Shot {
  return {
    position: from.clone(),
    target: lookAt.clone(),
    focus: (opts.focusOn ?? lookAt).clone(),
    fov: lensToFov(opts.lens ?? 32),
    bokeh: opts.bokeh ?? 1.4,
    roll: opts.roll,
  };
}

/** Low angle looking up at a subject: makes them loom. */
export function lowAngle(actor: Actor, opts: { lens?: number; distance?: number; angle?: number } = {}): Shot {
  const eyes = actor.getEyePosition(v());
  const facing = new THREE.Vector3(0, 0, 1).applyQuaternion(actor.root.quaternion).setY(0).normalize();
  const side = perpendicular(facing);
  const angle = opts.angle ?? 0.3;
  const dir = facing.clone().multiplyScalar(Math.cos(angle)).addScaledVector(side, Math.sin(angle)).normalize();
  const distance = opts.distance ?? 2.0;
  const position = actor.root.position.clone().addScaledVector(dir, distance);
  position.y = actor.root.position.y + 0.5;
  return {
    position,
    target: eyes.clone(),
    focus: eyes.clone(),
    fov: lensToFov(opts.lens ?? 35),
    bokeh: 2.4,
  };
}

/** Insert on a prop or detail. */
export function insert(point: THREE.Vector3, from: THREE.Vector3, lens = 85): Shot {
  return {
    position: from.clone(),
    target: point.clone(),
    focus: point.clone(),
    fov: lensToFov(lens),
    bokeh: 5.5,
  };
}
