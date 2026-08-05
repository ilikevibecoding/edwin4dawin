/**
 * Lighting helpers. Scenes are lit like film sets: a motivated key, a cool rim
 * to separate the subject from the dark, a low bounce fill, and practicals that
 * double as bloom sources.
 */
import * as THREE from 'three';
import type { QualitySettings } from './quality';

export type KeyOpts = {
  color?: THREE.ColorRepresentation;
  intensity?: number;
  position?: THREE.Vector3;
  target?: THREE.Vector3;
  angle?: number;
  penumbra?: number;
  distance?: number;
  decay?: number;
  shadow?: boolean;
  shadowBias?: number;
  radius?: number;
  near?: number;
  far?: number;
};

export function spotLight(q: QualitySettings, o: KeyOpts = {}): THREE.SpotLight {
  const l = new THREE.SpotLight(
    o.color ?? 0xffffff,
    o.intensity ?? 40,
    o.distance ?? 24,
    o.angle ?? 0.62,
    o.penumbra ?? 0.65,
    o.decay ?? 1.7,
  );
  l.position.copy(o.position ?? new THREE.Vector3(2, 3.4, 2));
  l.target.position.copy(o.target ?? new THREE.Vector3(0, 1.4, 0));
  const wantShadow = (o.shadow ?? true) && q.shadowMapSize > 0;
  l.castShadow = wantShadow;
  if (wantShadow) {
    l.shadow.mapSize.set(q.shadowMapSize, q.shadowMapSize);
    l.shadow.bias = o.shadowBias ?? -0.0009;
    l.shadow.normalBias = 0.022;
    l.shadow.radius = q.softShadows ? (o.radius ?? 3.2) : 1;
    l.shadow.camera.near = o.near ?? 0.4;
    l.shadow.camera.far = o.far ?? (o.distance ?? 24);
    l.shadow.blurSamples = q.softShadows ? 12 : 4;
  }
  return l;
}

export function dirLight(q: QualitySettings, o: KeyOpts & { area?: number } = {}): THREE.DirectionalLight {
  const l = new THREE.DirectionalLight(o.color ?? 0xbcd4ee, o.intensity ?? 0.9);
  l.position.copy(o.position ?? new THREE.Vector3(-8, 14, -6));
  l.target.position.copy(o.target ?? new THREE.Vector3(0, 1, 0));
  const wantShadow = (o.shadow ?? true) && q.shadowMapSize > 0;
  l.castShadow = wantShadow;
  if (wantShadow) {
    const a = o.area ?? 12;
    l.shadow.mapSize.set(q.shadowMapSize, q.shadowMapSize);
    l.shadow.camera.left = -a;
    l.shadow.camera.right = a;
    l.shadow.camera.top = a;
    l.shadow.camera.bottom = -a;
    l.shadow.camera.near = 0.5;
    l.shadow.camera.far = o.far ?? 60;
    l.shadow.bias = o.shadowBias ?? -0.0006;
    l.shadow.normalBias = 0.03;
    l.shadow.radius = q.softShadows ? (o.radius ?? 2.4) : 1;
    l.shadow.blurSamples = q.softShadows ? 10 : 4;
  }
  return l;
}

export function pointLight(
  color: THREE.ColorRepresentation,
  intensity: number,
  pos: THREE.Vector3,
  distance = 8,
  decay = 2,
): THREE.PointLight {
  const l = new THREE.PointLight(color, intensity, distance, decay);
  l.position.copy(pos);
  return l;
}

/** A three-point rig aimed at a subject; returns the lights for later tweaks. */
export function threePoint(
  q: QualitySettings,
  target: THREE.Vector3,
  opts: {
    keyColor?: THREE.ColorRepresentation;
    keyIntensity?: number;
    keyDir?: THREE.Vector3;
    rimColor?: THREE.ColorRepresentation;
    rimIntensity?: number;
    rimDir?: THREE.Vector3;
    fillColor?: THREE.ColorRepresentation;
    fillIntensity?: number;
    distance?: number;
  } = {},
): { key: THREE.SpotLight; rim: THREE.SpotLight; fill: THREE.SpotLight; group: THREE.Group } {
  const g = new THREE.Group();
  const d = opts.distance ?? 3.2;
  const keyDir = (opts.keyDir ?? new THREE.Vector3(-0.8, 0.85, 0.9)).clone().normalize();
  const rimDir = (opts.rimDir ?? new THREE.Vector3(0.7, 0.6, -1)).clone().normalize();

  const key = spotLight(q, {
    color: opts.keyColor ?? 0xfff0dd,
    intensity: opts.keyIntensity ?? 26,
    position: target.clone().addScaledVector(keyDir, d),
    target: target.clone(),
    angle: 0.62,
    penumbra: 0.75,
    distance: d * 4,
  });
  const rim = spotLight(q, {
    color: opts.rimColor ?? 0x8fc8ff,
    intensity: opts.rimIntensity ?? 34,
    position: target.clone().addScaledVector(rimDir, d * 1.1),
    target: target.clone(),
    angle: 0.5,
    penumbra: 0.9,
    distance: d * 4,
    shadow: false,
  });
  const fill = spotLight(q, {
    color: opts.fillColor ?? 0x415d7a,
    intensity: opts.fillIntensity ?? 8,
    position: target.clone().add(new THREE.Vector3(d * 0.9, -0.2, d * 0.6)),
    target: target.clone(),
    angle: 0.9,
    penumbra: 1,
    distance: d * 5,
    shadow: false,
  });

  g.add(key, key.target, rim, rim.target, fill, fill.target);
  return { key, rim, fill, group: g };
}

/** Cheap "bounce card" — a large dim area-ish light from below/side. */
export function bounce(color: THREE.ColorRepresentation, intensity: number, pos: THREE.Vector3): THREE.HemisphereLight {
  const l = new THREE.HemisphereLight(color, 0x000000, intensity);
  l.position.copy(pos);
  return l;
}
