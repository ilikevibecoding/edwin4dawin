import * as THREE from 'three';
import type { ILighting } from '../core/Interfaces';
import type { Batcher } from './Batcher';

/**
 * The level's working lights: souk bulbs, interior pendants, shop strips.
 *
 * Everything else in the town is lit by the sun and the sky, which is right for
 * a street at golden hour and hopeless everywhere the sky cannot reach. The
 * covered souk is the clearest case: thirty-four metres of arcade under cloth
 * and slats, open at both ends, with a six-degree sun coming in one of them. At
 * the far end that is a beautiful raking light; ten metres inside the near end
 * the floor measures two thousandths of the value of the lit arcade, which is
 * not a dim lane, it is a hole in the frame that a crouching player disappears
 * into. Interiors have the same problem away from their windows.
 *
 * A market arcade in daylight is *full* of artificial light for exactly this
 * reason — every stall runs a bulb on a flex — so the fix and the reference are
 * the same thing. `ILighting` budgets and distance-culls whatever is registered
 * here, so these are cheap: the rig submits at most `budget` of them per frame,
 * ordered by how much of the screen each can plausibly change.
 *
 * Intensity is kilocandela, per the rig's radiometric contract: illuminance is
 * `intensity / d²` kilolux, and a domestic 60 W bulb is 0.07. Traders' lamps are
 * brighter than domestic ones and hang two and a half metres over the floor, so
 * these run an order above that and still land far below the 20 kilolux of the
 * sun outside — which is the point. They are invisible in the open street and
 * they carry the arcade.
 */

/** A working light: the fitting is geometry, this is the light it gives off. */
interface Practical {
  x: number;
  y: number;
  z: number;
  /** Kilocandela. */
  intensity: number;
  /** Metres of influence; the rig culls the light's contribution to zero here. */
  radius: number;
  color: THREE.Color;
  /** Share of the lamp that clears the rim of its shade; 1 is a bare bulb. */
  shade: number;
}

/**
 * Filament colour. Warm even by tungsten standards: these are bulbs at the end
 * of a long run of thin cable, and the sag in the voltage shows in the colour.
 */
const TUNGSTEN = new THREE.Color(1.0, 0.72, 0.42);
/** Fluorescent tubes in the workshop and the lock-ups: cold, green-biased. */
const TUBE = new THREE.Color(0.82, 0.94, 0.9);
/**
 * What still reaches the ceiling over a shaded pendant.
 *
 * Not zero, and the reason is worth stating: the shade is opaque, but the room
 * is not black. Light off the floor and the table comes back up, and the local
 * lights do not go through the bounce bake — that solves for daylight through
 * the openings and knows nothing about a bulb switched on inside. A sixth is
 * about what a room of this reflectance returns, and it is the difference
 * between a ceiling that reads as plaster in shadow and one that reads as a
 * hole.
 */
const SHADE_SPILL = 0.16;

export class Practicals {
  private pending: Practical[] = [];
  private lights: THREE.PointLight[] = [];
  private lighting: ILighting | null = null;

  /**
   * Emissive glass for a lit fitting.
   *
   * Registered once and shared, because a bulb that lights the room but is not
   * itself bright reads as a fault in the renderer rather than as a bulb. The
   * value is radiance in kilonits, and a bulb envelope is genuinely of that
   * order — it is small enough on screen that the bloom does the rest.
   */
  static readonly LIT_GLASS = 'lamp_glass_lit';

  static registerMaterials(batch: Batcher): void {
    batch.registerVariant(Practicals.LIT_GLASS, 'glass', (m) => {
      m.emissive = new THREE.Color(1.0, 0.78, 0.5);
      m.emissiveIntensity = 7;
      m.roughness = 0.35;
      m.metalness = 0;
      /* The envelope is the light source, so it must not also be a shadow: the
         cascade would put the fitting's own shade between the filament and the
         floor and the pool of light would vanish. */
      m.transparent = false;
    });
  }

  /** A bare bulb on a flex. `y` is the filament. */
  bulb(x: number, y: number, z: number, intensity = 0.34, radius = 9): void {
    this.pending.push({ x, y, z, intensity, radius, color: TUNGSTEN, shade: 1 });
  }

  /**
   * A bulb under an opaque shade, hanging under a ceiling.
   *
   * Worth being a separate call rather than a flag, because the two light a
   * room quite differently and the difference is visible in every interior
   * frame in the game. A bare bulb half a metre under a slab puts twenty-five
   * times more light on that slab than on the table below it, so a room lit by
   * pendants reads brightest at the ceiling — which is the inverted interior the
   * art-direction review measured, arriving by a route that has nothing to do
   * with daylight. Under a shade the same lamp lights the table instead, and the
   * ceiling gets only what the room bounces back to it.
   *
   * `intensity` is the bulb's, not the fitting's: the rig conserves the flux
   * when it redirects it, so a shaded lamp is brighter downward than a bare one
   * of the same rating.
   */
  pendant(x: number, y: number, z: number, intensity = 0.34, radius = 9): void {
    this.pending.push({ x, y, z, intensity, radius, color: TUNGSTEN, shade: SHADE_SPILL });
  }

  /** A fluorescent batten: dimmer per unit, wider throw, cold. */
  tube(x: number, y: number, z: number, intensity = 0.22, radius = 8): void {
    this.pending.push({ x, y, z, intensity, radius, color: TUBE, shade: 1 });
  }

  get count(): number {
    return this.pending.length;
  }

  /**
   * Creates the lights and hands them to the rig.
   *
   * Parented to the level root so they travel with it and die with it, and
   * given a `distance` matching the registered radius so the rig's culling
   * sphere and the falloff window agree.
   */
  attach(root: THREE.Object3D, lighting: ILighting | null | undefined): void {
    this.lighting = lighting ?? null;
    for (const p of this.pending) {
      const light = new THREE.PointLight(p.color, p.intensity, p.radius);
      light.position.set(p.x, p.y, p.z);
      light.castShadow = false;
      light.matrixAutoUpdate = false;
      light.updateMatrix();
      root.add(light);
      this.lights.push(light);
      this.lighting?.addLocalLight(light, p.radius, p.shade);
    }
  }

  dispose(): void {
    for (const light of this.lights) {
      this.lighting?.removeLocalLight(light);
      light.removeFromParent();
    }
    this.lights.length = 0;
  }
}
