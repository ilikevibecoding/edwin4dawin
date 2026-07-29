import type { QualityConfig } from '../core/Config';
import { ParticleGroup, ParticleSystem } from './ParticleSystem';
import type { FXTextures } from './Textures';

export interface FXGroups {
  /** Thick, lit, soft, flipbook smoke: explosions, smoke grenades, fires. */
  smoke: ParticleGroup;
  /** Lighter, faster-dissipating puffs: impacts, footfalls, ground waves. */
  dust: ParticleGroup;
  /** Additive flame flipbook. */
  fire: ParticleGroup;
  /** Explosion fireball: burning inside, sooty opaque limb. */
  fireball: ParticleGroup;
  /** Velocity-stretched hot streaks. */
  spark: ParticleGroup;
  /** Chips, splinters, leaves, shards, droplets. */
  debris: ParticleGroup;
  blood: ParticleGroup;
  /** Every additive shape: flashes, cores, rings, embers, lens streaks. */
  glow: ParticleGroup;
  /** Quads laid flat on the ground: shockwave rings, dust waves, ripples. */
  ring: ParticleGroup;
  /** Viewmodel-scene counterparts, authored in camera space. */
  vGlow: ParticleGroup;
  vSmoke: ParticleGroup;
  vSpark: ParticleGroup;
}

/**
 * Share of `particleBudget` per group. Chosen from what a heavy frame actually
 * needs: an airstrike is mostly smoke and dust, a firefight is mostly sparks and
 * dust, and the viewmodel only ever holds one weapon's worth of muzzle effects.
 */
const SHARE: Record<keyof FXGroups, number> = {
  smoke: 0.22,
  dust: 0.19,
  fire: 0.06,
  fireball: 0.06,
  spark: 0.14,
  debris: 0.12,
  blood: 0.05,
  glow: 0.1,
  ring: 0.02,
  vGlow: 0.014,
  vSmoke: 0.014,
  vSpark: 0.012,
};

export function buildGroups(
  particles: ParticleSystem,
  textures: FXTextures,
  config: QualityConfig,
): FXGroups {
  const budget = Math.max(600, config.particleBudget);
  const cap = (key: keyof FXGroups): number => Math.max(32, Math.round(budget * SHARE[key]));

  const smoke = particles.add(
    new ParticleGroup({
      name: 'smoke',
      capacity: cap('smoke'),
      map: textures.smokeFlip.texture,
      atlasCols: textures.smokeFlip.cols,
      atlasRows: textures.smokeFlip.rows,
      soft: true,
      lit: true,
      stretch: false,
      turbulence: true,
      // Fast initial expansion that slows as the puff cools and entrains air.
      sizeExponent: 0.55,
      colorExponent: 0.85,
      // Below 1: a cloud holds its density for most of its life and thins at the
      // end. Above 1 it starts dying immediately, which halves the opacity of
      // every sprite by mid-life and is why smoke reads as haze instead of mass.
      fadeExponent: 0.55,
      turbFrequency: 0.32,
      turbScroll: 0.22,
      turbOctave: 0.3,
      renderOrder: 10,
      nearFadeStart: 0.4,
      nearFadeRange: 0.85,
      viewmodel: false,
      depthWrite: false,
    }),
  );

  const dust = particles.add(
    new ParticleGroup({
      name: 'dust',
      capacity: cap('dust'),
      map: textures.puff.texture,
      atlasCols: textures.puff.cols,
      atlasRows: textures.puff.rows,
      soft: true,
      lit: true,
      stretch: false,
      turbulence: true,
      sizeExponent: 0.45,
      colorExponent: 1.0,
      // Dust settles faster than smoke disperses, but not so fast that a puff is
      // half gone before the eye finds it.
      fadeExponent: 0.8,
      turbFrequency: 0.6,
      turbScroll: 0.4,
      turbOctave: 0.45,
      renderOrder: 9,
      nearFadeStart: 0.3,
      nearFadeRange: 0.6,
      viewmodel: false,
      depthWrite: false,
    }),
  );

  const fire = particles.add(
    new ParticleGroup({
      name: 'fire',
      capacity: cap('fire'),
      map: textures.fireFlip.texture,
      atlasCols: textures.fireFlip.cols,
      atlasRows: textures.fireFlip.rows,
      soft: true,
      lit: false,
      stretch: false,
      blackbody: true,
      turbulence: true,
      sizeExponent: 0.7,
      colorExponent: 1.3,
      fadeExponent: 1.0,
      turbFrequency: 0.9,
      turbScroll: 1.2,
      turbOctave: 0.5,
      renderOrder: 12,
      nearFadeStart: 0.25,
      nearFadeRange: 0.5,
      viewmodel: false,
      depthWrite: false,
    }),
  );

  const fireball = particles.add(
    new ParticleGroup({
      name: 'fireball',
      capacity: cap('fireball'),
      map: textures.fireballFlip.texture,
      atlasCols: textures.fireballFlip.cols,
      atlasRows: textures.fireballFlip.rows,
      soft: true,
      lit: false,
      stretch: false,
      soot: true,
      blackbody: true,
      turbulence: true,
      // A detonation front decelerates hard: most of the growth is over in the
      // first fifth of the ball's life.
      sizeExponent: 0.38,
      colorExponent: 1.15,
      // Holds density almost to the end, then hands over to the smoke column
      // rather than dissolving in mid-air.
      fadeExponent: 0.8,
      turbFrequency: 0.5,
      turbScroll: 0.7,
      turbOctave: 0.45,
      // Behind the additive glow so the hot core reads through the sooty limb.
      renderOrder: 11,
      nearFadeStart: 0.3,
      nearFadeRange: 0.7,
      viewmodel: false,
      depthWrite: false,
    }),
  );

  const spark = particles.add(
    new ParticleGroup({
      name: 'spark',
      capacity: cap('spark'),
      map: textures.spark,
      atlasCols: 1,
      atlasRows: 1,
      soft: false,
      lit: false,
      stretch: true,
      // Sparks skitter along the ground and die there. A shower that sinks
      // through the pavement instead reads as sprites, not as hot metal.
      bounce: true,
      turbulence: false,
      sizeExponent: 1.0,
      colorExponent: 0.7,
      fadeExponent: 1.8,
      turbFrequency: 0,
      turbScroll: 0,
      turbOctave: 0,
      renderOrder: 15,
      nearFadeStart: 0.08,
      nearFadeRange: 0.15,
      viewmodel: false,
      depthWrite: false,
    }),
  );

  const debris = particles.add(
    new ParticleGroup({
      name: 'debris',
      capacity: cap('debris'),
      map: textures.chip.texture,
      atlasCols: textures.chip.cols,
      atlasRows: textures.chip.rows,
      soft: false,
      lit: false,
      flake: true,
      stretch: false,
      bounce: true,
      turbulence: false,
      sizeExponent: 1.0,
      colorExponent: 1.0,
      // Chips land and stay put, so the group holds its opacity to the very end
      // rather than dissolving a settled chip in mid-shot.
      fadeExponent: 0.5,
      turbFrequency: 0,
      turbScroll: 0,
      turbOctave: 0,
      renderOrder: 8,
      nearFadeStart: 0.1,
      nearFadeRange: 0.2,
      viewmodel: false,
      depthWrite: false,
    }),
  );

  const blood = particles.add(
    new ParticleGroup({
      name: 'blood',
      capacity: cap('blood'),
      map: textures.blood.texture,
      atlasCols: textures.blood.cols,
      atlasRows: textures.blood.rows,
      soft: false,
      lit: false,
      flake: true,
      stretch: false,
      turbulence: false,
      sizeExponent: 0.8,
      colorExponent: 1.0,
      fadeExponent: 1.1,
      turbFrequency: 0,
      turbScroll: 0,
      turbOctave: 0,
      renderOrder: 11,
      nearFadeStart: 0.1,
      nearFadeRange: 0.2,
      viewmodel: false,
      depthWrite: false,
    }),
  );

  const glow = particles.add(
    new ParticleGroup({
      name: 'glow',
      capacity: cap('glow'),
      map: textures.glow.texture,
      atlasCols: textures.glow.cols,
      atlasRows: textures.glow.rows,
      // Additive shapes have no hard alpha silhouette to give away an
      // intersection, so they skip the depth fade and with it the depth capture
      // that every muzzle flash would otherwise trigger.
      soft: false,
      lit: false,
      stretch: false,
      turbulence: false,
      sizeExponent: 0.6,
      colorExponent: 1.1,
      fadeExponent: 1.7,
      turbFrequency: 0,
      turbScroll: 0,
      turbOctave: 0,
      renderOrder: 13,
      nearFadeStart: 0.06,
      nearFadeRange: 0.12,
      viewmodel: false,
      depthWrite: false,
    }),
  );

  const ring = particles.add(
    new ParticleGroup({
      name: 'ring',
      capacity: cap('ring'),
      map: textures.glow.texture,
      atlasCols: textures.glow.cols,
      atlasRows: textures.glow.rows,
      soft: true,
      lit: false,
      stretch: false,
      ground: true,
      turbulence: false,
      // Rings sprint outward and then coast, which is how a real pressure front
      // reads from a distance.
      sizeExponent: 0.42,
      colorExponent: 1.0,
      fadeExponent: 1.0,
      turbFrequency: 0,
      turbScroll: 0,
      turbOctave: 0,
      renderOrder: 7,
      nearFadeStart: 0.2,
      nearFadeRange: 0.4,
      viewmodel: false,
      depthWrite: false,
    }),
  );

  const vGlow = particles.add(
    new ParticleGroup({
      name: 'vGlow',
      capacity: cap('vGlow'),
      map: textures.glow.texture,
      atlasCols: textures.glow.cols,
      atlasRows: textures.glow.rows,
      soft: false,
      lit: false,
      stretch: false,
      turbulence: false,
      sizeExponent: 0.55,
      colorExponent: 1.1,
      fadeExponent: 1.8,
      turbFrequency: 0,
      turbScroll: 0,
      turbOctave: 0,
      renderOrder: 13,
      // The viewmodel camera's near plane is 5 mm, so effects can be right on
      // the lens; the fade band has to be tiny to match.
      nearFadeStart: 0.012,
      nearFadeRange: 0.02,
      viewmodel: true,
      depthWrite: false,
    }),
  );

  const vSmoke = particles.add(
    new ParticleGroup({
      name: 'vSmoke',
      capacity: cap('vSmoke'),
      map: textures.puff.texture,
      atlasCols: textures.puff.cols,
      atlasRows: textures.puff.rows,
      soft: false,
      lit: true,
      stretch: false,
      turbulence: true,
      sizeExponent: 0.5,
      colorExponent: 1.0,
      fadeExponent: 1.3,
      turbFrequency: 6.0,
      turbScroll: 0.6,
      turbOctave: 0.4,
      renderOrder: 11,
      nearFadeStart: 0.012,
      nearFadeRange: 0.02,
      viewmodel: true,
      depthWrite: false,
    }),
  );

  const vSpark = particles.add(
    new ParticleGroup({
      name: 'vSpark',
      capacity: cap('vSpark'),
      map: textures.spark,
      atlasCols: 1,
      atlasRows: 1,
      soft: false,
      lit: false,
      stretch: true,
      turbulence: false,
      sizeExponent: 1.0,
      colorExponent: 0.7,
      fadeExponent: 1.9,
      turbFrequency: 0,
      turbScroll: 0,
      turbOctave: 0,
      renderOrder: 14,
      nearFadeStart: 0.012,
      nearFadeRange: 0.02,
      viewmodel: true,
      depthWrite: false,
    }),
  );

  return {
    smoke,
    dust,
    fire,
    fireball,
    spark,
    debris,
    blood,
    glow,
    ring,
    vGlow,
    vSmoke,
    vSpark,
  };
}
