import { reg, OWNERS, assets } from './assets.js';
import { registerMaterialManifest } from '../art/materials.js';
import { registerKitManifest } from '../map/kit.js';
import { registerDoorManifest } from '../map/doors.js';
import { registerGlassManifest } from '../map/glass.js';
import { registerLightingManifest } from '../map/lighting.js';
import { registerPropManifest } from '../props/library.js';
import { registerSignageManifest } from '../props/signage.js';
import { registerDecalManifest } from '../props/decals.js';
import { registerCharacterManifest } from '../characters/models.js';
import { registerAnimationManifest } from '../characters/animation.js';
import { registerWeaponModelManifest } from '../weapons/models.js';
import { registerWeaponAnimManifest } from '../weapons/viewmodel.js';
import { registerWeaponIconManifest } from '../weapons/icons.js';
import { registerUiManifest } from '../ui/icons.js';
import { registerVfxManifest } from '../vfx/index.js';
import { registerAudioManifest } from '../audio/index.js';
import { WEAPONS } from '../weapons/defs.js';

/**
 * Central manifest bootstrap.
 * Owner: Opus 1.
 *
 * Every module that authors production content exposes a `register*Manifest()`
 * function. They are all invoked here exactly once at boot so the registry is
 * complete before the asset gallery, the docs generator or any Playwright audit
 * inspects it.
 */

let done = false;

export function registerCoreManifest() {
  if (done) return assets;
  done = true;

  const safe = (name, fn) => {
    try {
      fn();
    } catch (err) {
      console.error(`[manifest] ${name} failed to register`, err);
    }
  };

  safe('materials', registerMaterialManifest);
  safe('architecture kit', registerKitManifest);
  safe('doors', registerDoorManifest);
  safe('glass', registerGlassManifest);
  safe('lighting', registerLightingManifest);
  safe('props', registerPropManifest);
  safe('signage', registerSignageManifest);
  safe('decals', registerDecalManifest);
  safe('characters', registerCharacterManifest);
  safe('animation', registerAnimationManifest);
  safe('weapon models', registerWeaponModelManifest);
  safe('weapon animation', registerWeaponAnimManifest);
  safe('weapon icons', registerWeaponIconManifest);
  safe('ui', registerUiManifest);
  safe('vfx', registerVfxManifest);
  safe('audio', registerAudioManifest);

  /* ---- Weapon gameplay definitions (Opus 2) ---- */
  for (const w of Object.values(WEAPONS)) {
    reg({
      id: `wpn.def.${w.id}`,
      name: `${w.fullName} — handling definition`,
      category: 'weapon',
      owner: OWNERS.OPUS2,
      files: ['src/weapons/defs.js', 'src/player/combat.js'],
      usedIn: 'loadout screen, player combat, HUD, enemy loadouts',
      dimensions: 'n/a — data asset',
      pivot: 'n/a',
      materials: ['n/a'],
      textures: ['n/a'],
      collision: 'hitscan trace with cone spread and surface penetration',
      lod: 'n/a',
      animations: w.category === 'utility'
        ? ['draw', 'holster', 'throw']
        : w.category === 'melee'
          ? ['draw', 'holster', 'idle', 'melee']
          : ['draw', 'holster', 'idle', 'fire', 'adsIn', 'adsOut', 'reload', 'reloadEmpty', 'magOut', 'magIn', 'chamber', 'dryFire', 'land'],
      audio: Object.values(w.sounds ?? {}),
      status: 'accepted',
      acceptance: `Firing decrements the magazine, produces recoil pattern "${w.recoilPattern ?? 'none'}", spawns a flash, a casing and an impact, applies ${w.damage} base damage with a ${w.headMultiplier ?? 1}× head multiplier, and the reported ammunition state matches the render.`,
      evidence: ['screenshots/weapons/*.png', 'tests/weapons.spec.js'],
    });
  }

  /* ---- Systems (Opus 1/2/3/4) ---- */
  const systems = [
    ['sys.engine', 'Renderer & post chain', OWNERS.OPUS1, ['src/core/engine.js'], 'ACES tone mapping, bloom, grade, SMAA, resolution scaling, separate view-model overlay pass'],
    ['sys.input', 'Input, pointer lock & fullscreen', OWNERS.OPUS1, ['src/core/input.js'], 'Pointer lock with a virtual-capture fallback for headless automation; F toggles fullscreen, Esc exits'],
    ['sys.collision', 'Collision world', OWNERS.OPUS2, ['src/map/collision.js'], 'Uniform-grid AABB broadphase, per-axis sweep with step-up, BVH raycasts'],
    ['sys.nav', 'Multi-level navigation grid', OWNERS.OPUS3, ['src/map/nav.js'], 'Column-sampled 0.4 m grid with automatic stair links, A* and string pulling'],
    ['sys.player', 'First-person controller', OWNERS.OPUS2, ['src/player/controller.js'], 'Acceleration/friction movement, crouch, jump, lean, landing response, footstep and noise emission'],
    ['sys.combat', 'Player combat', OWNERS.OPUS2, ['src/player/combat.js'], 'Hitscan ballistics, spread, recoil patterns, penetration, reload state machine, grenades'],
    ['sys.ai', 'Hostile AI', OWNERS.OPUS3, ['src/ai/enemy.js'], 'Vision cone with real line of sight, hearing, patrol, investigate, cover, flank, search, stuck recovery'],
    ['sys.hostage', 'Hostage behaviour', OWNERS.OPUS3, ['src/ai/hostage.js'], 'Held, secured, following, stopped, extracted, down; guaranteed extraction recovery'],
    ['sys.mission', 'Mission director', OWNERS.OPUS3, ['src/mission/mission.js', 'src/mission/difficulty.js'], 'Objective chain, garrison spawning, timer, alarm, victory/defeat, total reset'],
    ['sys.testing', 'Deterministic test surface', OWNERS.OPUS4, ['src/core/testing.js', 'src/core/qa.js'], 'render_game_to_text, advanceTime, QA teleport/spawn/freeze/lighting/gallery tools'],
  ];
  for (const [id, name, owner, files, acceptance] of systems) {
    reg({
      id, name, category: 'system', owner, files,
      usedIn: 'whole game', dimensions: 'n/a', pivot: 'n/a',
      materials: ['n/a'], textures: ['n/a'], collision: 'n/a', lod: 'n/a',
      status: 'accepted', acceptance,
      evidence: ['tests/*.spec.js'],
    });
  }

  return assets;
}

export function manifestMarkdown() {
  registerCoreManifest();
  return assets.toMarkdown();
}
