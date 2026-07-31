import type { MaterialLibrary } from '../../core/Contracts';
import { Rng, hash1 } from '../../core/MathUtils';
import { createPalette, weatherPalette, type GunPalette } from './Materials';
import { buildKnife } from './Melee';
import { buildRevolver, buildSidearm } from './Pistols';
import { buildRpg } from './Launchers';
import { buildAk74, buildBullpup, buildMk4Carbine, type RifleContext } from './Rifles';
import { buildPumpShotgun } from './Shotguns';
import { buildMp5, buildVector } from './Smgs';
import { buildBoltSniper, buildDmr } from './Snipers';
import { buildM249 } from './Support';
import { WeaponModel, type WeaponBuild } from './WeaponModel';

/**
 * Weapon model factory.
 *
 * Models are built on demand and cached for the session. Each weapon gets its
 * own seeded RNG so the wear pattern, the reticle brightness and the serial
 * number are stable for a given weapon across a match but different between
 * weapons — the point is that the rifle you have carried all game is *your*
 * rifle, not a fresh copy every time you switch back to it.
 */

type Builder = (ctx: RifleContext) => WeaponBuild;

const BUILDERS: Record<string, Builder> = {
  ar_mk4: buildMk4Carbine,
  ar_ak74: buildAk74,
  ar_aug: (ctx) => buildBullpup(ctx, 'aug'),
  ar_famas: (ctx) => buildBullpup(ctx, 'famas'),
  smg_mp5: buildMp5,
  smg_vector: buildVector,
  lmg_m249: buildM249,
  sniper_bolt: buildBoltSniper,
  sniper_dmr: buildDmr,
  shotgun_pump: buildPumpShotgun,
  pistol_m19: buildSidearm,
  pistol_revolver: buildRevolver,
  launcher_rpg: buildRpg,
  melee_knife: buildKnife,
};

export class WeaponModelFactory {
  readonly palette: GunPalette;
  private readonly cache = new Map<string, WeaponModel>();
  private readonly palettes = new Map<string, GunPalette>();

  constructor(materials: MaterialLibrary | null) {
    this.palette = createPalette(materials);
  }

  has(id: string): boolean {
    return BUILDERS[id] !== undefined;
  }

  /** Per-weapon weathered palette, also used by anything parented to the gun. */
  paletteFor(id: string): GunPalette {
    let pal = this.palettes.get(id);
    if (!pal) {
      pal = weatherPalette(this.palette, hash1(stringSeed(id)));
      this.palettes.set(id, pal);
    }
    return pal;
  }

  get(id: string): WeaponModel | null {
    const cached = this.cache.get(id);
    if (cached) return cached;
    const builder = BUILDERS[id];
    if (!builder) return null;
    const model = new WeaponModel(id, builder({ pal: this.paletteFor(id), rng: new Rng(hash1(stringSeed(id) + 7)) }));
    model.root.visible = false;
    this.cache.set(id, model);
    return model;
  }

  dispose(): void {
    for (const model of this.cache.values()) model.dispose();
    this.cache.clear();
    this.palettes.clear();
  }
}

function stringSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
