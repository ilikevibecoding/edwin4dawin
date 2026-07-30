import * as THREE from 'three';
import type { MaterialId, MaterialLibrary } from '../../core/Contracts';
import { Rng } from '../../core/MathUtils';
import { applyGunSurface, cloneGunSurface, type GunSurfaceOptions } from './Surface';
import { reticleTexture, type ReticleKind } from './Textures';

/**
 * Material palette for the viewmodel.
 *
 * The procgen library owns the surface look; this only splits it into the roles
 * a weapon needs and applies the per-instance variation that stops every rifle
 * in the game looking like it came out of the same crate five minutes ago.
 */
export interface GunPalette {
  /** Receiver, rails, sight bases. */
  metal: THREE.Material;
  /** Barrel, internals, anything in shadow — darker and rougher. */
  metalDark: THREE.Material;
  /** Barrel steel: nitrided, and the one part with a directional finish. */
  barrel: THREE.Material;
  /** Bolt faces and wear edges — brighter, smoother, more reflective. */
  metalWorn: THREE.Material;
  /**
   * Cerakote/DLC over steel: knife blades, launcher tubes, suppressor bodies.
   * Deliberately only part-metallic. A fully metallic dark surface has no diffuse
   * term at all, so against a dim sky it returns nothing and the part reads as a
   * black hole; a coating has a real albedo and keeps its form.
   */
  coating: THREE.Material;
  /** Furniture: handguard, grip, stock. */
  polymer: THREE.Material;
  polymerDark: THREE.Material;
  wood: THREE.Material;
  /** Slings, pouches, glove knuckle pads. */
  nylon: THREE.Material;
  /** Glove leather: much darker than the uniform so the hands read separately. */
  glove: THREE.Material;
  /** Combat-shirt sleeve on the forearm. */
  sleeve: THREE.Material;
  brass: THREE.Material;
  /** Inside of a bore or a scope tube. */
  bore: THREE.Material;
  rubber: THREE.Material;
  glass: THREE.Material;
  glassAmber: THREE.Material;
  tritium: THREE.Material;
}

const FALLBACK: Record<string, { color: number; roughness: number; metalness: number }> = {
  gun_metal: { color: 0x3c3f43, roughness: 0.42, metalness: 1 },
  gun_polymer: { color: 0x24262a, roughness: 0.74, metalness: 0 },
  gun_wood: { color: 0x5a3a22, roughness: 0.58, metalness: 0 },
  gear_nylon: { color: 0x33352f, roughness: 0.88, metalness: 0 },
};

/**
 * What each library map actually averages, measured on the GPU.
 *
 * Both numbers matter because three multiplies `color` into the albedo map and
 * `roughness` into the ORM map, so neither property is a value — each is a
 * multiplier over something already painted. The palette used to be written as
 * if they were values, with a mid grey standing for "grey metal", and that is the
 * whole of the untextured-and-black-handed bug: a mid grey over `gear_nylon`
 * lands on a 0.015 albedo, which is darker than coal and cannot be lit, and a mid
 * grey over `gun_metal` lands on a 0.09 F0, which for a fully metallic surface
 * means no diffuse term and almost no specular either.
 *
 * The hue matters as much as the value. `gear_nylon` bakes a warm Cordura with
 * blue at 63 per cent of red, so a glove tinted cool grey still comes out tan and
 * disappears into the handguard it is wrapped around; the only way to place a
 * fabric anywhere but on the library's own hue line is to divide that bias out.
 *
 * These are read off `dev/ViewProbe`, which averages the bound map over a few
 * hundred taps per texel. They only shift if a generator is re-authored, and if
 * one is the probe reports it as a mismatch between the intended and effective
 * albedo rather than as a weapon that has quietly gone black.
 */
interface LibrarySurface {
  /** Mean linear albedo of the baked map, per channel. */
  albedo: readonly [number, number, number];
  /** Mean of the ORM green channel, which is what `roughness` multiplies. */
  roughness: number;
}

const LIBRARY: Record<string, LibrarySurface> = {
  gun_metal: { albedo: [0.2368, 0.2332, 0.2322], roughness: 0.501 },
  gun_polymer: { albedo: [0.0396, 0.0385, 0.0382], roughness: 0.76 },
  gear_nylon: { albedo: [0.0588, 0.0566, 0.0371], roughness: 0.866 },
  // Derived from the generator's own walnut constants rather than measured: no
  // weapon with timber furniture appears in the frames the probe captures.
  gun_wood: { albedo: [0.24, 0.175, 0.125], roughness: 0.62 },
};

/**
 * A per-role instance of a library material.
 *
 * Always `lib.clone`, never `lib.tiled(...).clone()`, which is what the palette
 * used to do for its four fabric and timber roles. The library tracks every
 * instance it hands out so it can repoint maps after a re-bake and assign the
 * environment probe, and that extra clone was invisible to it. Worse, three's
 * `Material.copy` does not copy `onBeforeCompile` and round-trips `userData`
 * through JSON, so the clone lost both the compile hook carrying the UV scale and
 * the `Vector2` it read from — every "tiled" material in the palette was
 * rendering at native scale anyway, silently, for as long as the code existed.
 *
 * Tiling is set in metres per tile by `Parts.ts` when the UVs are generated,
 * which is the right place for it: it is a property of the geometry's scale, not
 * of the role the surface plays.
 */
function baseMaterial(lib: MaterialLibrary | null, id: MaterialId): THREE.MeshStandardMaterial {
  if (lib) return lib.clone(id);
  const f = FALLBACK[id] ?? { color: 0x606060, roughness: 0.6, metalness: 0 };
  return new THREE.MeshStandardMaterial({
    color: f.color,
    roughness: f.roughness,
    metalness: f.metalness,
  });
}

/**
 * Cycles per metre of the object-space break-up field, per class of part.
 *
 * The number is set by the ADS frame rather than by the hipfire one, and getting
 * that backwards is what left the optic reading as a moulded grey box after the
 * break-up layer was already working. At 24 cycles a 90 mm sight body carries two
 * cycles of variation over its whole length — one blotch — and at 0.2 m from the
 * eye that body is a fifth of the frame. Worse, the two terms that do most of the
 * work elsewhere both fail on it: `fwidth` of the normal finds no edge on a face
 * pointed straight at the lens, and a downward-biased grime term finds no
 * downward faces either. The noise is all there is, so it has to be at a scale
 * that survives being looked at from 200 mm.
 *
 * Set here rather than per role because it is a property of how close the part is
 * seen and how large it is, which is the same question for every metal on the
 * weapon.
 */
const BREAKUP_SCALE = {
  /** Phosphate and Cerakote over machined steel: fine, even mottle. */
  metal: 95,
  /** Turned barrel steel, where the striation carries the fine detail instead. */
  barrel: 62,
  /** Moulded polymer: coarser, because the stipple it sits over already is. */
  polymer: 78,
  /** Timber, whose grain is directional and does not want isotropic noise. */
  wood: 44,
} as const;

interface RoleSpec {
  /** Library material to instance. */
  id: MaterialId;
  name: string;
  /**
   * Linear albedo the surface should end up with, after the library's map.
   *
   * For a dielectric this is the diffuse colour; for a metal it is F0, the
   * specular reflectance at normal incidence, so the numbers are much higher —
   * bare steel is near 0.55 and there is no such thing as a dark metal without a
   * coating over it.
   */
  albedo: readonly [number, number, number];
  /** Roughness the surface should end up with, after the library's ORM map. */
  roughness: number;
  metalness: number;
  envIntensity?: number;
  /**
   * Multiplier over the library's own normal strength. Needed because `GUN_TILE`
   * shows these maps at a quarter of the size they were authored for, which
   * steepens every slope in the height field by the same factor.
   */
  normalScale?: number;
  surface?: GunSurfaceOptions;
}

/**
 * Instances a library material and lands it on a stated albedo and roughness.
 *
 * The division is the point. Everything downstream — the wear colour, the value
 * relationship between a glove and the handguard it grips, whether a receiver has
 * a diffuse term at all — depends on knowing what the surface's albedo actually
 * is, and with a multiplier over an unknown map nobody knows. Stating the target
 * and dividing the map's own mean out of it makes the palette readable as a
 * material list and makes a wrong value a wrong number rather than a wrong guess.
 */
function role(lib: MaterialLibrary | null, spec: RoleSpec): THREE.MeshStandardMaterial {
  const m = baseMaterial(lib, spec.id);
  const library = LIBRARY[spec.id];
  m.name = spec.name;
  if (m.map && library) {
    m.color.setRGB(
      spec.albedo[0] / library.albedo[0],
      spec.albedo[1] / library.albedo[1],
      spec.albedo[2] / library.albedo[2],
      THREE.LinearSRGBColorSpace,
    );
  } else {
    // No map bound, so `color` is the albedo and there is nothing to divide out.
    m.color.setRGB(spec.albedo[0], spec.albedo[1], spec.albedo[2], THREE.LinearSRGBColorSpace);
  }
  const mapped = m.roughnessMap && library ? library.roughness : 1;
  // Prefer the multiplier, which preserves the map's variation in proportion, and
  // only shift with the additive bias for a target the map cannot reach — three's
  // own weathering pass clamps the multiplier at 1, so above the map's mean the
  // bias is the only route there.
  const multiplier = Math.min(1, spec.roughness / mapped);
  m.roughness = multiplier;
  m.metalness = spec.metalness;
  m.envMapIntensity = spec.envIntensity ?? 1;
  if (spec.normalScale !== undefined) m.normalScale.multiplyScalar(spec.normalScale);
  m.needsUpdate = true;
  if (!spec.surface) return m;
  return applyGunSurface(m, {
    ...spec.surface,
    roughnessBias: (spec.surface.roughnessBias ?? 0) + Math.max(0, spec.roughness - mapped),
  });
}

const clampWear = (n: number): number => THREE.MathUtils.clamp(n, 0, 1);

/** Reads back an option the surface layer was installed with. */
function surfaceOption(m: THREE.Material, key: keyof GunSurfaceOptions, fallback: number): number {
  const options = m.userData.gunSurface as GunSurfaceOptions | undefined;
  const value = options?.[key];
  return typeof value === 'number' ? value : fallback;
}

/**
 * Builds the shared palette; per-weapon wear is layered on top of this.
 *
 * Every role states the albedo and roughness it wants and `role()` works out the
 * multipliers, so the table below can be read as what it claims to be: a list of
 * finishes with values that can be checked against a real one.
 *
 * The values are chosen for three relationships rather than for absolute realism,
 * because those relationships are what the review was actually reading:
 *
 *  - the furniture, the receiver and the glove sit at roughly 0.045, 0.034 and
 *    0.016 albedo, so a hand on a handguard is a dark shape on a light one
 *    instead of two neighbouring khakis;
 *  - nothing large is fully metallic, because a metal has no diffuse term and a
 *    receiver that returns only what a sparse environment hands it goes black in
 *    its own shadow, which is the failure the black-hand report describes;
 *  - the bare steel the rub-through exposes is left near 0.6, an order of
 *    magnitude above the coatings around it, so a worn edge is genuinely a
 *    highlight and not a slightly different grey.
 *
 * The absolute level has to be photographic even so, and an earlier pass here
 * getting that wrong is worth recording because the failure is not intuitive.
 * Reasoning that the weapon catches both the scene's sun and a camera-locked rig
 * and would therefore photograph hot, the diffuse roles were set two or three
 * stops under life — the handguard at 0.046 rather than the 0.11 a dark-earth
 * polymer measures, the glove at 0.017. The frame that came back was not dark. It
 * was a uniform pale cream, every role the same value and the same warm hue, and
 * a probe of the isolated glove pixels said why: rendered radiance 0.18 against a
 * 0.018 albedo, and warm — R above B — where the albedo was cool.
 *
 * A dielectric reflects about four per cent specularly whatever its albedo, and
 * under a bright sky that floor is a fixed 0.05 or so of radiance. At 0.10 albedo
 * it is a highlight over the surface's own colour. At 0.017 it *is* the surface,
 * the diffuse term is a rounding error beneath it, and every material converges
 * on the colour of the environment: which is why the receiver, the furniture and
 * the glove all photographed as the same sky-coloured khaki no matter how far
 * apart their albedos were set. Darkening a surface past the specular floor does
 * not make it darker, it makes it stop being a material.
 *
 * So the environment intensity is cut to roughly a third across the dielectrics.
 * That is the part that matters, and it is separable from the absolute level: with
 * the floor at a quarter of the diffuse term rather than three times it, the
 * albedos below arrive in frame in the proportions they are written in. Measured
 * per material off the GPU, every dielectric role now renders at 2.4 to 3.0 times
 * its own albedo where the glove used to render at 9.7 times, and the ratio
 * between the furniture and the glove reaches the frame at 2.5 rather than 0.9.
 *
 * The absolute level is then set against the world, and it does have to sit under
 * a photograph. The view scene is lit by the render module's own sun and
 * hemisphere and the weapon is in the open catching all of it, so at measured
 * albedo the furniture came out at 0.29 in frame against a sunlit white-painted
 * wall at 0.37 — a dark-earth handguard the value of white paint. Halved, it lands
 * near a sunlit sandbag, which is where it belongs.
 */
export function createPalette(lib: MaterialLibrary | null): GunPalette {
  // Phosphated and Cerakoted receiver. Deliberately only half metallic: a
  // conversion coating is a dielectric film over the steel, not the steel, and
  // authoring it at metalness 1 is what left the largest part of the weapon with
  // no diffuse term at all — bright where it happened to catch sky, black
  // everywhere else, and reading as neither metal nor plastic in between.
  const metal = role(lib, {
    id: 'gun_metal',
    name: 'vm_metal',
    albedo: [0.033, 0.034, 0.037],
    roughness: 0.6,
    metalness: 0.5,
    envIntensity: 0.3,
    normalScale: 0.45,
    surface: {
      edgeWear: 0.26,
      breakup: 0.24,
      grime: 0.34,
      wearRoughness: 0.26,
      scale: BREAKUP_SCALE.metal,
      valueBreakup: 0.2,
    },
  });
  const metalDark = role(lib, {
    id: 'gun_metal',
    name: 'vm_metal_dark',
    albedo: [0.02, 0.0205, 0.023],
    roughness: 0.68,
    metalness: 0.45,
    envIntensity: 0.25,
    normalScale: 0.45,
    surface: {
      edgeWear: 0.22,
      breakup: 0.26,
      grime: 0.4,
      wearRoughness: 0.3,
      scale: BREAKUP_SCALE.metal,
      valueBreakup: 0.22,
    },
  });
  // Nitrided barrel steel: mostly bare, so it stays much more metallic than the
  // receiver. The only role with a directional finish, because a barrel is turned
  // and then polished along its axis — fine striation across the profile stretches
  // the specular lobe along the tube, which is the anisotropy, and it is the
  // difference between a barrel and a grey cylinder.
  const barrel = role(lib, {
    id: 'gun_metal',
    name: 'vm_barrel',
    albedo: [0.031, 0.032, 0.035],
    roughness: 0.44,
    metalness: 0.8,
    envIntensity: 0.4,
    normalScale: 0.4,
    surface: {
      edgeWear: 0.18,
      breakup: 0.16,
      grime: 0.3,
      wearRoughness: 0.22,
      scale: BREAKUP_SCALE.barrel,
      striation: 0.19,
      striationFrequency: 190,
    },
  });
  // Bare steel, and the one role that is allowed to be: bolt faces, charging
  // handle latches, the strip along a magazine where it drags on the well. Kept
  // rougher than a real polished face because a fully metallic surface at 0.2
  // returns only what the environment hands it, and in a sparse one that is black
  // with a single streak across it.
  //
  // The environment is where this role goes wrong if left alone. A metal has no
  // diffuse term at all, so with the probe blurred to a bright hazy sky a polished
  // face returns one flat value over its whole area — and at F0 0.42 that value is
  // a pale cream, which is how the polished corners of the optic hood came to read
  // as white plastic trim rather than as rubbed steel. Held down it stays darker
  // than the sky it reflects and the reflection is a highlight rather than the
  // surface.
  const metalWorn = role(lib, {
    id: 'gun_metal',
    name: 'vm_metal_worn',
    albedo: [0.26, 0.264, 0.273],
    roughness: 0.34,
    metalness: 1,
    // Held well above the dielectrics on purpose. A metal has no diffuse term, so
    // the environment is most of what it returns, and cutting it in proportion with
    // the rest of the palette turns a rubbed-bright edge into a dark grey one — the
    // opposite of what the role exists for.
    envIntensity: 0.75,
    normalScale: 0.45,
    surface: {
      edgeWear: 0.28,
      breakup: 0.18,
      grime: 0.22,
      wearRoughness: 0.2,
      scale: BREAKUP_SCALE.metal,
      valueBreakup: 0.18,
    },
  });
  const coating = role(lib, {
    id: 'gun_metal',
    name: 'vm_coating',
    albedo: [0.028, 0.0285, 0.031],
    roughness: 0.55,
    metalness: 0.3,
    envIntensity: 0.27,
    normalScale: 0.45,
    surface: {
      edgeWear: 0.26,
      breakup: 0.22,
      grime: 0.34,
      wearRoughness: 0.28,
      scale: BREAKUP_SCALE.metal,
      valueBreakup: 0.2,
    },
  });
  // Flat dark earth furniture, and the lightest large surface on the weapon. That
  // ordering is the point: the handguard is what a support hand is wrapped around,
  // so it has to sit well above the glove or there is nothing for the hand to be a
  // silhouette against.
  //
  // Polymer wears differently from steel — it scuffs pale and grey rather than
  // rubbing through to metal — so the edge term exposes a filled nylon instead of
  // bare steel and stays rough.
  const polymer = role(lib, {
    id: 'gun_polymer',
    name: 'vm_polymer',
    albedo: [0.053, 0.044, 0.026],
    roughness: 0.8,
    metalness: 0,
    envIntensity: 0.2,
    normalScale: 0.5,
    surface: {
      edgeWear: 0.4,
      breakup: 0.3,
      grime: 0.4,
      wearRoughness: 0.82,
      wearColor: [0.098, 0.09, 0.07],
      wearMetalness: null,
      scale: BREAKUP_SCALE.polymer,
      valueBreakup: 0.22,
    },
  });
  const polymerDark = role(lib, {
    id: 'gun_polymer',
    name: 'vm_polymer_dark',
    albedo: [0.0156, 0.0156, 0.0172],
    roughness: 0.78,
    metalness: 0,
    envIntensity: 0.16,
    normalScale: 0.5,
    surface: {
      edgeWear: 0.36,
      breakup: 0.28,
      grime: 0.34,
      wearRoughness: 0.8,
      wearColor: [0.034, 0.034, 0.036],
      wearMetalness: null,
      scale: BREAKUP_SCALE.polymer,
      valueBreakup: 0.18,
    },
  });
  const wood = role(lib, {
    id: 'gun_wood',
    name: 'vm_wood',
    albedo: [0.047, 0.026, 0.014],
    roughness: 0.44,
    metalness: 0,
    envIntensity: 0.25,
    normalScale: 0.5,
    surface: {
      edgeWear: 0.3,
      breakup: 0.22,
      grime: 0.3,
      wearRoughness: 0.42,
      wearColor: [0.082, 0.053, 0.031],
      wearMetalness: null,
      scale: BREAKUP_SCALE.wood,
      valueBreakup: 0.2,
    },
  });
  const nylon = role(lib, {
    id: 'gear_nylon',
    name: 'vm_nylon',
    albedo: [0.03, 0.029, 0.024],
    roughness: 0.88,
    metalness: 0,
    envIntensity: 0.16,
    normalScale: 0.6,
  });
  // Glove. Dark and neutral, and both halves of that have to be forced rather than
  // asked for: the library's Cordura bakes a 0.059 albedo with blue at 63 per cent
  // of red, so a glove left on the library's own hue line comes out the same tan as
  // the handguard however it is tinted, and lands within a few per cent of it in
  // value as well. At under a third of the furniture's albedo and with the warm bias
  // divided back out, the hand is a dark neutral shape on a light warm one, which
  // is the only reason there is a hand legible in the frame at all.
  //
  // The environment cut matters more here than the albedo does, for the reason in
  // the header: with it left at 0.75 the specular floor was three quarters of the
  // signal, so the glove measured 0.18 radiance against a 0.018 albedo — nine times
  // its own value, and warm where the albedo is cool, because what it was showing
  // was the sky. At 0.13 the floor is a third and the glove tracks what it is
  // given, which is the whole reason there is a legible hand in the frame.
  // Measured, the mid-tone of this is right and only its shadows are not: the lit
  // knuckles render at 0.14 against a 0.155 handguard and the median at 0.096, so
  // the hand is a dark shape on a light one exactly as intended — but the fifth
  // percentile is 0.011, which is black, and that fifth is the part that matters.
  // A support hand is a C-clamp, so most of it is wrapped round the far side of a
  // handguard where the sun never reaches and the only illumination is the
  // hemisphere and the environment. At this albedo that comes to nothing.
  //
  // So the floor is raised rather than the material: a fifth more albedo and a
  // third more environment lift the occluded side by half again while barely
  // moving the sunlit side, which is already where it should be. Raising the
  // albedo enough to fix the shadows on its own would have taken the glove past
  // the handguard in value and cost the silhouette that makes the hand legible.
  //
  // `normalScale` comes down with `FABRIC_TILE`: the arms show these maps at five
  // and a half times the density the weapon does, and a height field sampled that
  // much smaller has slopes that much steeper.
  const glove = role(lib, {
    id: 'gear_nylon',
    name: 'vm_glove',
    albedo: [0.0162, 0.0182, 0.0235],
    roughness: 0.7,
    metalness: 0,
    envIntensity: 0.17,
    normalScale: 0.14,
    surface: {
      edgeWear: 0.16,
      breakup: 0.2,
      grime: 0.22,
      wearRoughness: 0.62,
      wearColor: [0.038, 0.039, 0.043],
      wearMetalness: null,
      scale: 40,
      valueBreakup: 0.16,
    },
  });
  // Combat shirt. Sits between the glove and the furniture in value and off both
  // in hue, so the three surfaces the lower third of the frame is made of are
  // separable: a green sleeve, a tan handguard, a near-black hand.
  const sleeve = role(lib, {
    id: 'gear_nylon',
    name: 'vm_sleeve',
    // Under the glove rather than over it. The arm is the largest single surface in
    // the lower third of the frame and it is unoccluded, so at the value it had it
    // rendered at 0.11 against a cobbled street at 0.03 to 0.05 and became the
    // brightest thing in the lower half — an arm that is lighter than the ground it
    // is over reads as lit from the wrong place whatever it is textured with.
    albedo: [0.0176, 0.0208, 0.0136],
    roughness: 0.86,
    metalness: 0,
    envIntensity: 0.12,
    normalScale: 0.14,
    surface: {
      edgeWear: 0.1,
      breakup: 0.24,
      grime: 0.36,
      wearRoughness: 0.8,
      wearColor: [0.034, 0.036, 0.027],
      wearMetalness: null,
      // Much finer than the weapon roles, because the part is much larger. At 26
      // cycles per metre a 42 cm forearm carried eleven blotches over its whole
      // length and read as a smooth tube with a stain on it; at 80 the variation is
      // at the scale of a crease in a shirt sleeve, which is what has to be there
      // for the arm not to look extruded.
      scale: 80,
      valueBreakup: 0.3,
    },
  });
  const brass = role(lib, {
    id: 'gun_metal',
    name: 'vm_brass',
    albedo: [0.52, 0.37, 0.145],
    roughness: 0.32,
    metalness: 1,
    envIntensity: 0.8,
    normalScale: 0.4,
  });
  const bore = role(lib, {
    id: 'gun_metal',
    name: 'vm_bore',
    albedo: [0.008, 0.008, 0.009],
    roughness: 0.62,
    metalness: 0.4,
    envIntensity: 0.1,
    normalScale: 0.4,
  });
  const rubber = role(lib, {
    id: 'gun_polymer',
    name: 'vm_rubber',
    albedo: [0.014, 0.014, 0.015],
    roughness: 0.92,
    metalness: 0,
    envIntensity: 0.12,
    normalScale: 0.5,
    surface: {
      edgeWear: 0.2,
      breakup: 0.2,
      grime: 0.3,
      wearRoughness: 0.9,
      wearColor: [0.028, 0.028, 0.028],
      wearMetalness: null,
      scale: BREAKUP_SCALE.polymer,
    },
  });

  // Multi-coated sight window.
  //
  // What made the ADS frame read as an empty grey box was not the absence of a
  // glass look but the *value*: a low-opacity quad shows `1 - opacity` of whatever
  // is behind it plus `opacity` of its own shaded colour, and at roughness 0.035
  // with the environment at 3.1 that shaded colour was a mirror of the sky. The
  // window therefore came out brighter than the housing around it, which no real
  // lens ever is, and the additive reticle sitting on top of it had a half-clipped
  // background to add to and lifted its off-hue channels over the clip point. A
  // green reticle on a bright lens is a white reticle.
  //
  // So the material is authored dark and the opacity is high enough for the
  // transmission to visibly matter. `iridescence` over the thin film is kept
  // because it is the one term that reads as a coating rather than as tinted
  // acrylic — real AR stacks flare green at normal incidence and purple at a
  // grazing angle — but the environment behind it is cut by a factor of six so the
  // flare is a highlight on a dark window instead of the window itself.
  //
  // The compositing squares it, which is worth stating because it makes the
  // authored numbers look wrong. Alpha blending into the viewmodel target leaves
  // premultiplied colour, and the resolve then mixes by the same alpha, so the
  // glass's own contribution arrives at `opacity` squared while the world behind it
  // arrives at `1 - opacity`. At 0.52 that is 48 per cent transmission with the
  // reflection at 27 per cent of its shaded value.
  const glass = new THREE.MeshPhysicalMaterial({
    name: 'vm_glass',
    metalness: 0,
    roughness: 0.05,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    iridescence: 1,
    iridescenceIOR: 1.38,
    ior: 1.52,
    specularIntensity: 1,
    envMapIntensity: 0.52,
    side: THREE.DoubleSide,
  });
  glass.color.setRGB(0.014, 0.035, 0.042, THREE.LinearSRGBColorSpace);
  glass.iridescenceThicknessRange = [230, 620];
  const glassAmber = new THREE.MeshPhysicalMaterial({
    name: 'vm_glass_amber',
    color: 0xffb066,
    metalness: 0,
    roughness: 0.12,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    clearcoat: 1,
    ior: 1.5,
    emissive: 0x381400,
    emissiveIntensity: 1,
    envMapIntensity: 0.9,
    side: THREE.DoubleSide,
  });
  const tritium = new THREE.MeshStandardMaterial({
    name: 'vm_tritium',
    color: 0x14200f,
    emissive: 0x2ad855,
    emissiveIntensity: 0.55,
    roughness: 0.45,
    metalness: 0,
  });

  return {
    metal,
    metalDark,
    barrel,
    metalWorn,
    coating,
    polymer,
    polymerDark,
    wood,
    nylon,
    glove,
    sleeve,
    brass,
    bore,
    rubber,
    glass,
    glassAmber,
    tritium,
  };
}

/**
 * Per-weapon wear pass: a fresh clone of the three hero materials with the
 * finish nudged, so two rifles never share the exact same shade of used.
 */
export function weatherPalette(base: GunPalette, seed: number): GunPalette {
  const rng = new Rng(seed >>> 0 || 1);
  const jitter = (m: THREE.Material, warm: number, rough: number, light: number): THREE.Material => {
    // Through `cloneGunSurface`, because a plain clone drops `onBeforeCompile`
    // and these five roles are most of the weapon's surface area. Shipping them
    // unpatched is what left the receiver, handguard, magazine and stock with no
    // wear at all while every smaller part had it.
    const std = cloneGunSurface(m as THREE.MeshStandardMaterial, {
      edgeWear: clampWear(surfaceOption(m, 'edgeWear', 0.4) * rng.range(0.75, 1.35)),
      grime: clampWear(surfaceOption(m, 'grime', 0.3) * rng.range(0.7, 1.4)),
    });
    // Scales the multiplier rather than shifting it through HSL. `offsetHSL` reads
    // the colour back as a hue and a lightness, which only means anything inside
    // 0..1, and these are multipliers that divide a dark map back up — bare steel
    // sits above 2. Round-tripping one through HSL clamps it and silently costs
    // the material most of its albedo.
    std.color.multiply(
      new THREE.Color().setRGB(1 + warm + light, 1 + light, 1 - warm + light, THREE.LinearSRGBColorSpace),
    );
    std.roughness = THREE.MathUtils.clamp(std.roughness + rough, 0.03, 1);
    std.needsUpdate = true;
    return std;
  };
  return {
    ...base,
    metal: jitter(base.metal, rng.range(-0.02, 0.02), rng.range(-0.07, 0.1), rng.range(-0.05, 0.03)),
    metalDark: jitter(base.metalDark, rng.range(-0.02, 0.02), rng.range(-0.05, 0.08), rng.range(-0.04, 0.02)),
    polymer: jitter(base.polymer, rng.range(-0.03, 0.03), rng.range(-0.05, 0.05), rng.range(-0.06, 0.04)),
    polymerDark: jitter(base.polymerDark, rng.range(-0.03, 0.03), rng.range(-0.04, 0.04), rng.range(-0.05, 0.03)),
    wood: jitter(base.wood, rng.range(-0.02, 0.02), rng.range(-0.08, 0.08), rng.range(-0.07, 0.05)),
  };
}

/**
 * Reticle emitter.
 *
 * The radiance goes in `color`, deliberately far above 1, because that is the
 * only channel that survives the pipeline: `opacity` is rewritten every frame by
 * the eyebox and ADS fades, and `toneMapped` does nothing here since the renderer
 * is set to `NoToneMapping` and the composite pass owns the tonemap. An
 * illuminated reticle also passes through the viewmodel occlusion buffer, which
 * multiplies it down inside the optic's hood, so it has to start with headroom.
 */
export function reticleMaterial(kind: ReticleKind): THREE.MeshBasicMaterial {
  const r = reticleTexture(kind);
  const m = new THREE.MeshBasicMaterial({
    name: `vm_reticle_${kind}`,
    map: r.texture,
    transparent: true,
    depthWrite: false,
    depthTest: !r.additive,
    blending: r.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  if (r.additive) {
    m.color.setRGB(r.radiance[0], r.radiance[1], r.radiance[2], THREE.LinearSRGBColorSpace);
    m.opacity = 1;
  } else {
    m.color.setRGB(0, 0, 0, THREE.LinearSRGBColorSpace);
  }
  return m;
}

/**
 * Stencilled paint on a surface it is a hair proud of.
 *
 * No alpha test, which is the whole point. A cutoff is the right tool for a
 * chain-link fence, where the texel either is wire or is not at any distance; on
 * type it is a guillotine. The paint covers about a sixth of the quad, so every
 * mip level averages to roughly a sixth of full opacity, and a threshold high
 * enough to keep the edges clean at reading distance deletes the entire marking
 * a metre later. Blending instead lets a marking fade the way paint does — crisp
 * white in the aimed view, a light grey ghost at hipfire range, never absent —
 * and costs only the sorting that a decal with `depthWrite` off does not care
 * about.
 */
export function stencilMaterial(texture: THREE.Texture): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    name: 'vm_stencil',
    map: texture,
    alphaMap: texture,
    transparent: true,
    depthWrite: false,
    roughness: 0.72,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
    side: THREE.FrontSide,
  });
}

/**
 * Flat black for the eye-relief annulus around a scope's ocular.
 *
 * Ignores depth entirely. The annulus has to hide everything between the eye and
 * the sight picture — the eyecup that protrudes past the ocular plane, the
 * turrets, the mount, the receiver below — and those are on both sides of it in
 * depth, so testing against them would leave gaps. Drawing it unconditionally at
 * a high render order and sitting the reticle above it is simpler and exact.
 * Fadeable, because it spans the whole screen and may only appear once the optic
 * is actually at the eye.
 */
export function blackoutMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    name: 'vm_blackout',
    color: 0x000000,
    toneMapped: false,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
  });
}
