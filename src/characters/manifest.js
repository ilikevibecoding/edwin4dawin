import { assets } from '../core/assets.js';
import { WEAPONS } from './weapons-models.js';
import { ANIMATION_STATES } from './animation.js';

// ---------------------------------------------------------------------------
// Character / weapon / animation / VFX asset registration.  (owner: fable4)
//
// Called lazily by every fable4 subsystem constructor (idempotent), so the
// records exist regardless of which system boots first.
// ---------------------------------------------------------------------------

let registered = false;

const FILES = {
  rig: ['src/characters/rig.js', 'src/characters/animation.js'],
  enemy: ['src/characters/enemy-model.js', 'src/characters/rig.js', 'src/characters/animation.js'],
  hostage: ['src/characters/hostage-model.js', 'src/characters/rig.js', 'src/characters/animation.js'],
  weapon: ['src/characters/weapons-models.js'],
  vm: ['src/characters/viewmodel.js', 'src/characters/weapons-models.js'],
  fx: ['src/fx/effects.js'],
  weather: ['src/fx/weather.js'],
  postfx: ['src/fx/postfx.js'],
};

export function registerCharacterAssets() {
  if (registered) return;
  registered = true;

  // ------------------------------------------------------------ characters --
  const enemyCommon = {
    category: 'character', owner: 'fable4', files: FILES.enemy,
    pivot: 'feet centre, -Z forward', collision: 'capsule (AI-owned) + per-bone hit boxes',
    lod: 'segmented full body <18 m, 12-mesh simplified beyond',
    materials: ['fabric', 'armour plate', 'skin', 'rubber', 'metal', 'leather'],
    textures: ['procedural fabric/plastic sets', 'canvas insignia patch'],
    anims: ANIMATION_STATES,
    audio: ['enemy voice + foley (audio engine)'],
    status: 'integrated',
    acceptance: 'Consistent human scale (1.78 m), distinct silhouette per variant, head 4.0x/chest 1.0x/stomach 1.25x/limbs 0.75x hit regions, no mesh separation at joints, shadows on.',
    evidence: 'tests/characters.spec.js + gallery screenshots',
  };
  assets.register({
    id: 'CHAR-ENEMY-BREACHER', name: 'Ash Vector Breacher (heavy plate carrier, knee pads, balaclava)',
    rooms: ['vestibule', 'lobby', 'loading', 'garage'], dims: [0.62, 1.78, 0.42], ...enemyCommon,
  });
  assets.register({
    id: 'CHAR-ENEMY-RUNNER', name: 'Ash Vector Runner (light jacket, chest rig, beanie/respirator)',
    rooms: ['openoffice', 'midcorr', 'breakroom', 'servicecorr'], dims: [0.52, 1.78, 0.36], ...enemyCommon,
  });
  assets.register({
    id: 'CHAR-ENEMY-MARKSMAN', name: 'Ash Vector Marksman (long coat, shoulder rig, cap + headset)',
    rooms: ['execcorr', 'upperlanding', 'archive', 'conference'], dims: [0.56, 1.80, 0.40], ...enemyCommon,
  });
  for (const head of ['BALACLAVA', 'RESPIRATOR', 'BEANIE', 'HEADSET']) {
    assets.register({
      id: `CHAR-HEAD-${head}`, componentOf: 'CHAR-ENEMY-BREACHER',
      name: `Head variation — ${head.toLowerCase()}`,
      category: 'character', owner: 'fable4', files: FILES.enemy,
      rooms: ['all combat'], dims: [0.2, 0.28, 0.24],
      pivot: 'neck joint', materials: ['skin', 'fabric', 'rubber', 'plastic'],
      textures: ['procedural'], collision: 'head hit box (4.0x)',
      lod: 'hidden on simplified body', status: 'integrated',
      acceptance: 'Brow, nose bridge and cheekbones read at 2 m; overlay never clips the skull.',
      evidence: 'gallery screenshots',
    });
  }
  assets.register({
    id: 'CHAR-HOSTAGE-ANALYST', name: 'Dr. Rhea Calloway (cardigan, lanyard, glasses)',
    category: 'character', owner: 'fable4', files: FILES.hostage,
    rooms: ['conference'], dims: [0.48, 1.67, 0.34],
    pivot: 'feet centre, -Z forward', collision: 'capsule + hit boxes',
    materials: ['fabric', 'skin', 'plastic', 'leather'], textures: ['procedural', 'canvas ID badge'],
    lod: 'segmented full body <18 m, simplified beyond',
    anims: ['hostage_idle', 'hostage_fear', 'hostage_crouch', 'hostage_follow', 'hostage_stop', 'hostage_extract'],
    status: 'integrated',
    acceptance: 'Bound-wrists pose while captive; zip-tie removed and hands-free poses after securing.',
    evidence: 'tests/hostages.spec.js',
  });
  assets.register({
    id: 'CHAR-HOSTAGE-DIRECTOR', name: 'Martin Oyelaran (shirt sleeves, tie, ID badge)',
    category: 'character', owner: 'fable4', files: FILES.hostage,
    rooms: ['execoffice'], dims: [0.52, 1.78, 0.36],
    pivot: 'feet centre, -Z forward', collision: 'capsule + hit boxes',
    materials: ['fabric', 'skin', 'leather'], textures: ['procedural', 'canvas ID badge'],
    lod: 'segmented full body <18 m, simplified beyond',
    anims: ['hostage_idle', 'hostage_fear', 'hostage_crouch', 'hostage_follow', 'hostage_stop', 'hostage_extract'],
    status: 'integrated',
    acceptance: 'Bound-wrists pose while captive; zip-tie removed and hands-free poses after securing.',
    evidence: 'tests/hostages.spec.js',
  });
  assets.register({
    id: 'CHAR-VM-ARMS', category2: 'viewmodel', name: 'First-person arms (tactical gloves, articulated fingers)',
    category: 'character', owner: 'fable4', files: FILES.vm,
    rooms: ['viewmodel overlay'], dims: [0.08, 0.1, 0.45],
    pivot: 'wrist', materials: ['glove fabric', 'knuckle plastic', 'sleeve fabric', 'skin'],
    textures: ['procedural'], collision: 'none', lod: 'single (overlay only)',
    anims: ['draw', 'holster', 'idle', 'fire', 'ads_in', 'ads_out', 'reload_tactical', 'reload_empty',
      'dry_fire', 'recoil_recovery', 'movement_sway', 'landing', 'inspect'],
    status: 'integrated',
    acceptance: 'Trigger finger on the trigger, support hand on handguard/pump; no self-clipping; overlay pass never intersects walls.',
    evidence: 'tests/viewmodel.spec.js',
  });

  // -------------------------------------------------------------- weapons --
  for (const def of Object.values(WEAPONS)) {
    assets.register({
      id: def.id,
      name: `${def.name} — ${def.brand}`,
      category: 'weapon', owner: 'fable4', files: FILES.weapon,
      rooms: ['loadout', 'enemy hands', 'pickups'],
      dims: def.dims,
      pivot: 'firing-hand grip, barrel -Z',
      materials: ['polymer frame', 'phosphate steel', 'aluminium receiver', 'rubber grip', 'glass optic', 'brass'],
      textures: ['procedural PBR', 'canvas hudIcon + inventoryIcon (line art)'],
      collision: 'none (attached) / aabb (pickup)',
      lod: 'shared geometry FP + world; icons for HUD',
      anims: ['fire', 'reload_tactical', 'reload_empty', 'draw', 'holster', 'inspect'],
      audio: [`${def.key} fire/reload set`],
      status: 'integrated',
      acceptance: `Real-world scale (${def.dims[2]} m long), separate magazine child, cycling slide/bolt, muzzle + ejection empties, iron sights or optic.`,
      evidence: 'tests/weapons.spec.js + gallery screenshots',
    });
  }

  // ------------------------------------------------------------ animations --
  for (const st of ANIMATION_STATES) {
    assets.register({
      id: `ANIM-${st.toUpperCase().replace(/_/g, '-')}`,
      name: `Rig animation — ${st}`,
      category: 'character', owner: 'fable4', files: FILES.rig,
      rooms: ['all characters'], dims: [0, 0, 0],
      pivot: 'n/a', materials: [], textures: [], collision: 'n/a',
      lod: 'procedural, LOD-independent',
      status: 'integrated',
      acceptance: 'Feet plant from real speed (no sliding); crossfades without pops; additive layers stack.',
      evidence: 'tests/characters.spec.js',
    });
  }
  for (const st of ['RELOAD-EMPTY', 'RELOAD-TACTICAL', 'ADS', 'VM-DRAW', 'VM-INSPECT']) {
    assets.register({
      id: `ANIM-${st}`, name: `Viewmodel animation — ${st.toLowerCase()}`,
      category: 'character', owner: 'fable4', files: FILES.vm,
      rooms: ['viewmodel overlay'], dims: [0, 0, 0], pivot: 'n/a',
      collision: 'n/a', lod: 'n/a', status: 'integrated',
      acceptance: 'Magazine physically leaves/returns; empty reload cycles the action; sights align at ADS.',
      evidence: 'tests/viewmodel.spec.js',
    });
  }

  // ------------------------------------------------------------------ VFX --
  const vfx = (id, name, acceptance) => assets.register({
    id, name, category: 'vfx', owner: 'fable4', files: FILES.fx,
    rooms: ['gameplay'], dims: [0, 0, 0], pivot: 'world-space',
    materials: ['additive/alpha point sprites'], textures: ['procedural canvas sprites'],
    collision: 'n/a', lod: 'particle counts scale with quality.particleScale',
    status: 'integrated', acceptance, evidence: 'tests/effects.spec.js',
  });
  for (const fam of ['PISTOL', 'SMG', 'RIFLE', 'SHOTGUN', 'SNIPER']) {
    vfx(`VFX-MUZZLE-${fam}`, `Muzzle flash — ${fam.toLowerCase()}`,
      'Distinct silhouette per family: star core, halo, forward sparks, smoke wisp, <80 ms light pulse.');
  }
  for (const surf of ['CONCRETE', 'DRYWALL', 'WOOD', 'METAL', 'GLASS', 'FABRIC', 'SNOW', 'FLESH']) {
    vfx(`VFX-IMPACT-${surf}`, `Bullet impact — ${surf.toLowerCase()}`,
      'Reads the surface type at a glance; flesh mist suppressed by reducedBlood.');
  }
  vfx('VFX-SHELL-CASINGS', 'Ejected shell casings', 'Instanced, bounce with a bus tink event, come to rest, expire.');
  vfx('VFX-TRACER', 'Bullet tracer streak', 'Subtle stretched streak, not a laser; 90 ms.');
  vfx('VFX-SMOKE-VOLUME', 'Smoke grenade volume', 'Blocks AI line of sight via blocksLineOfSight(a,b) during its solid window.');
  vfx('VFX-FLASH-DETONATION', 'LX-2 flash detonation', 'White core + shock ring + light pop; UI blind handled by combat.');
  vfx('VFX-GLASS-SHATTER', 'Glass pane shatter', 'Pane hidden, fragments fall with gravity and rest at the sill line.');
  vfx('VFX-DOOR-IMPACT', 'Door impact dust', 'Splinters + dust at the impact point.');
  vfx('VFX-BLOOD', 'Blood spray', 'Mist + droplets; grey puff under reducedBlood.');
  vfx('VFX-DUST-MOTES', 'Ambient dust motes', 'Slow drift inside registered room bounds, only near the camera.');
  vfx('VFX-OBJECTIVE-MARKER', 'Objective marker pulse', 'Pulsing ring + column glow; removable handle.');
  vfx('VFX-HOSTAGE-FEEDBACK', 'Hostage feedback burst', 'Teal secured / amber warning ring + sparkles.');
  vfx('VFX-TRANSITION-VICTORY', 'Victory transition', 'Cool pulse + rising motes.');
  vfx('VFX-TRANSITION-DEFEAT', 'Defeat transition', 'Red pulse + settling smoke.');

  assets.register({
    id: 'VFX-WEATHER-STORM', name: 'Winter storm (snow, wind streaks, breath vapour, haze)',
    category: 'vfx', owner: 'fable4', files: FILES.weather,
    rooms: ['courtyard', 'eastapron', 'entrance', 'garage'], dims: [0, 0, 0],
    pivot: 'world-space', materials: ['point sprites', 'alpha planes'],
    textures: ['procedural flake/streak/haze'], collision: 'n/a',
    lod: 'snow culled when the camera is deep inside; counts scale with particleScale',
    status: 'integrated',
    acceptance: 'Snow only in exterior volumes + open doorways; breath puffs in cold zones; haze visible through glazing.',
    evidence: 'tests/weather.spec.js',
  });
  assets.register({
    id: 'VFX-POSTFX-COMPOSITE', name: 'Post-processing composite (bloom, grade, vignette, grain, FXAA, motion blur)',
    category: 'vfx', owner: 'fable4', files: FILES.postfx,
    rooms: ['fullscreen'], dims: [0, 0, 0], pivot: 'n/a',
    materials: ['fullscreen shaders'], textures: ['render targets'],
    collision: 'n/a', lod: 'bloom at quarter res; every stage toggled by settings',
    status: 'integrated',
    acceptance: 'ACES output matches the raw pipeline; motion blur exists but defaults OFF; respects bloom/vignette/filmGrain/motionBlur/quality/resolutionScale.',
    evidence: 'tests/postfx.spec.js',
  });
}
