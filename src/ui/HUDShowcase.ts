import * as THREE from 'three';
import type { GameContext } from '../core/GameContext';
import type {
  IAI,
  IDirector,
  IKillstreaks,
  IPlayer,
  IWeapons,
  IWorld,
  KillstreakDef,
  WeaponStats,
} from '../core/Interfaces';
import { getVantage, registerVantages, type Vantage } from '../core/Vantage';
import type HUDSystem from './HUDSystem';
import type MenuSystem from './MenuSystem';

/**
 * The interface test range, active on `?showcase=hud`.
 *
 * A HUD is only worth photographing in a state it would never be in at boot:
 * mid-firefight, on nine rounds, bleeding, with a streak in the pocket and
 * ordnance in the air. Reaching that state by playing is not reproducible, so
 * each vantage point here *composes* it — the HUD is pointed at stand-in
 * implementations of the four interfaces it reads, and its transients are pushed
 * with an explicit age so a still frame catches them at the point in their
 * animation where they look like themselves.
 *
 * That last part is the whole reason the transients take an age parameter. The
 * harness steps six frames after posing, a tenth of a second, so anything given
 * to the HUD at age zero photographs on the second frame of its entrance: a
 * killfeed sliding in from the right, a banner still translucent, a score pop
 * halfway through its rise. Backdated by a second and a half they are all where a
 * player would actually see them.
 *
 * The shots between them exercise every layer: the combat HUD complete, the two
 * menus that own the whole frame, the death card, the airstrike run, and the one
 * state in which this HUD deliberately shows nothing at all.
 */

const _v = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();

export class HUDShowcase {
  private readonly ctx: GameContext;
  private readonly hud: HUDSystem;
  private readonly world: IWorld | null;
  private readonly ai: IAI | null;
  private readonly realWeapons: IWeapons | null;
  private readonly realStreaks: IKillstreaks | null;
  private spawned = false;
  private anchor: THREE.Vector3 | null = null;
  private aim: THREE.Vector3 | null = null;
  /* Mutated from its own `setup`, because the camera pose for the designation
     shot is the killstreak system's to decide and it will only give it up once
     the target is set. The registry holds this object, and the harness reads the
     vectors after `setup` has run. */
  private readonly designateVantage: Vantage = {
    name: 'hud_designate',
    position: new THREE.Vector3(),
    lookAt: new THREE.Vector3(),
    fov: 50,
    hideViewmodel: true,
    note: 'Airstrike designation: the HUD stands down and the killstreak system owns the frame.',
    setup: () => this.designate(),
  };

  constructor(ctx: GameContext, hud: HUDSystem) {
    this.ctx = ctx;
    this.hud = hud;
    this.world = ctx.tryGet<IWorld>('world') ?? null;
    this.ai = ctx.tryGet<IAI>('ai') ?? null;
    this.realWeapons = ctx.tryGet<IWeapons>('weapons') ?? null;
    this.realStreaks = ctx.tryGet<IKillstreaks>('killstreaks') ?? null;
    this.register();
  }

  /* ================================ shots ================================= */

  private register(): void {
    const combat = this.pose('market_eye', 2.6, 22, 0, -6, 1.6);
    // Kept so the hostiles can be put down relative to the framing rather than
    // at absolute coordinates: the pose is borrowed from a world vantage, so
    // nothing here knows in advance where the camera ends up.
    this.anchor = combat.position.clone();
    this.aim = combat.lookAt?.clone() ?? null;

    registerVantages([
      {
        ...combat,
        name: 'hud_combat',
        fov: 76,
        note: 'The whole combat HUD: radar, compass, killfeed, streaks, ammo, hit and damage feedback at low health.',
        setup: () => this.combat(),
      },
      {
        ...this.pose('market_hero', -3.9, 51, 0.6, -20, 3),
        name: 'hud_menu',
        fov: 56,
        hideViewmodel: true,
        note: 'Main menu over the live level at one of the cinematic vantage points.',
        setup: () => this.menu('main'),
      },
      {
        ...this.pose('cross_street', -20, 12, -20, -14, 1.7),
        name: 'hud_loadout',
        fov: 62,
        note: 'Loadout: the weapon in the frame is the real viewmodel, switched by the list.',
        setup: () => this.menu('loadout'),
      },
      {
        ...this.pose('market_eye', 2.6, 22, 0, -6, 1.6),
        name: 'hud_death',
        fov: 70,
        hideViewmodel: true,
        note: 'Death card: what killed you, the redeploy clock, lives spent and the match so far.',
        setup: () => this.death(),
      },
      {
        ...this.pose('market_eye', 1.2, 26, 0, -14, 2.4),
        name: 'hud_strike',
        fov: 76,
        note: 'Airstrike run: the inbound clock, the marked target on the radar and the streak tray.',
        setup: () => this.strike(),
      },
      {
        ...this.pose('garage', 10.4, 39.5, 9, 28, 1.4),
        name: 'hud_interior',
        fov: 64,
        note: 'The same HUD in a dark workshop: the other half of the legibility test.',
        setup: () => this.interior(),
      },
      this.designateVantage,
    ]);
  }

  /**
   * Borrows the framing of a world vantage point so these shots are composed by
   * whoever art-directed the level rather than by guesswork here, and falls back
   * to explicit coordinates when that vantage has not been registered.
   */
  private pose(
    borrow: string,
    x: number,
    z: number,
    lx: number,
    lz: number,
    lookHeight: number,
  ): Pick<Vantage, 'name' | 'position' | 'lookAt'> {
    const from = getVantage(borrow);
    const ground = (gx: number, gz: number) => this.world?.terrainHeight(gx, gz) ?? 0;
    return {
      name: borrow,
      position: from ? from.position.clone() : new THREE.Vector3(x, ground(x, z) + 1.65, z),
      lookAt: from?.lookAt
        ? from.lookAt.clone()
        : new THREE.Vector3(lx, ground(lx, lz) + lookHeight, lz),
    };
  }

  /* ------------------------------- combat -------------------------------- */

  private combat(): void {
    const p = this.parts;
    this.hud.poseReset();
    this.menuSystem?.poseScreen('none');

    const streaks = this.fakeStreaks(['uav', 'precision'], 7, true);
    this.hud.substitute({
      player: this.fakePlayer(0.26),
      weapons: this.fakeWeapons('rifle', 9, 124),
      killstreaks: streaks,
      director: this.fakeDirector('playing', {
        score: 12450,
        kills: 31,
        wave: 4,
        enemiesLeft: 6,
        waveSize: 11,
      }),
    });
    this.poseViewmodel('rifle');
    this.populate();

    // Backdated so the feed reads as a running fight rather than five rows that
    // all arrived on the same frame.
    p.killfeed.push({ attacker: 'RECON 1', victim: 'HASSAN', weapon: 'rifle' }, 5.0);
    p.killfeed.push({ attacker: 'YOU', victim: 'NADIR', weapon: 'rifle', headshot: true, highlight: true }, 3.7);
    p.killfeed.push({ attacker: 'FARID', victim: 'RECON 3', weapon: 'smg' }, 2.5);
    p.killfeed.push({ attacker: 'YOU', victim: 'TARIQ', weapon: 'rifle', highlight: true }, 1.4);
    p.killfeed.push({ attacker: 'AIRSTRIKE', victim: 'IMRAN', weapon: 'explosive' }, 0.5);

    p.notices.push(
      { title: 'UAV RECON READY', subtitle: 'Press 4 to call it in', tone: 'positive' },
      1.5,
    );
    p.banner.show('PRECISION AIRSTRIKE', 'bomb', 'KILLSTREAK READY', 1.05);
    p.pops.push(150, 'Headshot', 0.28);
    p.pops.push(100, 'Kill', 0.62);

    // Two rounds from different bearings, and a fresh headshot marker. The
    // marker is left at zero deliberately: it peaks almost immediately, which is
    // the whole point of a hitmarker.
    p.vitals.hit(-2.1, 34);
    p.vitals.hit(0.85, 22);
    p.vitals.force(0.62);
    p.vitals.poseBeat(0.03);
    p.reticle.hit(41, false, true);

    p.status.setObjective('Eliminate hostiles — 6 remaining');
    p.inbound.set(4.4, 'ORDNANCE INBOUND', 9);
    p.streaks.update(streaks, 7, null, 0);
    // Reconnaissance is up, so the radar sweeps and every hostile is a contact.
    p.minimap.setUav(true, 3);
    p.minimap.poseSweep(0.62);
  }

  /**
   * The same HUD indoors and undamaged.
   *
   * Half the legibility problem is a white number over pale stucco at noon; the
   * other half is a dark scrim over an unlit workshop, where a panel that reads
   * well outside becomes a black rectangle and the type inside it disappears.
   * Nothing is posed dramatically here on purpose — the shot exists to be read,
   * not to look busy.
   */
  private interior(): void {
    const p = this.parts;
    this.hud.poseReset();
    this.menuSystem?.poseScreen('none');

    const streaks = this.fakeStreaks(['uav'], 4, false, 6);
    this.hud.substitute({
      player: this.fakePlayer(1),
      weapons: this.fakeWeapons('smg', 22, 150),
      killstreaks: streaks,
      director: this.fakeDirector('playing', {
        score: 4820,
        kills: 12,
        wave: 2,
        enemiesLeft: 3,
        waveSize: 8,
      }),
    });
    this.poseViewmodel('smg');
    this.populate();

    p.killfeed.push({ attacker: 'YOU', victim: 'OMAR', weapon: 'smg', highlight: true }, 2.8);
    p.killfeed.push({ attacker: 'RECON 2', victim: 'BILAL', weapon: 'rifle' }, 1.2);
    p.notices.push(
      { title: 'WAVE 2 CLEARED', subtitle: 'Resupply at the crates', tone: 'neutral' },
      1.6,
    );
    p.status.setObjective('Clear the workshop — 3 remaining');
    p.streaks.update(streaks, 4, null, 0);
  }

  /* -------------------------------- menus -------------------------------- */

  private menu(screen: 'main' | 'loadout'): void {
    this.hud.poseReset();
    this.hud.substitute({
      player: this.fakePlayer(1),
      weapons: null,
      killstreaks: null,
      director: this.fakeDirector('menu', {}),
    });
    if (screen === 'loadout') this.poseViewmodel('rifle');
    this.menuSystem?.poseScreen(screen);
  }

  /* -------------------------------- death -------------------------------- */

  private death(): void {
    const p = this.parts;
    this.hud.poseReset();
    this.menuSystem?.poseScreen('none');
    this.hud.substitute({
      player: this.fakePlayer(0, false),
      weapons: this.fakeWeapons('rifle', 0, 92),
      killstreaks: this.fakeStreaks([], 0, false, 9),
      director: this.fakeDirector('dead', {
        score: 18320,
        kills: 46,
        wave: 6,
        lives: 1,
        respawnIn: 4.2,
        enemiesLeft: 5,
        waveSize: 14,
      }),
    });
    this.populate();
    p.killfeed.push({ attacker: 'FARID', victim: 'YOU', weapon: 'smg', highlight: true }, 0.8);
    p.killfeed.push({ attacker: 'YOU', victim: 'BASHIR', weapon: 'rifle', headshot: true, highlight: true }, 2.6);
    this.hud.poseDeath('Farid Al-Nasiri', 'MP5A5 · 24 m');
    p.vitals.force(1);
  }

  /* ------------------------------- airstrike ------------------------------ */

  private strike(): void {
    const p = this.parts;
    this.hud.poseReset();
    this.menuSystem?.poseScreen('none');

    this.hud.substitute({
      player: this.fakePlayer(0.72),
      weapons: this.fakeWeapons('rifle', 24, 96),
      killstreaks: this.fakeStreaks(['mortar', 'carpet'], 9, true, 9),
      director: this.fakeDirector('playing', {
        score: 21980,
        kills: 52,
        wave: 7,
        enemiesLeft: 9,
        waveSize: 18,
      }),
    });
    this.poseViewmodel('rifle');
    this.populate();

    // The strike is already in the air, so the radar marker, the clock and the
    // warning all refer to the same event.
    const from = this.anchor ?? this.ctx.camera.position;
    if (this.aim) _fwd.copy(this.aim).sub(from);
    else _fwd.set(0, 0, -1);
    _fwd.y = 0;
    _fwd.normalize();
    _v.copy(from).addScaledVector(_fwd, 24);
    _v.y = this.world?.terrainHeight(_v.x, _v.z) ?? 0;
    p.minimap.mark('strike', _v, 12);
    p.inbound.set(3.4, 'ORDNANCE INBOUND', 9);
    p.minimap.setUav(false, 3);
    p.notices.push(
      { title: 'ORDNANCE INBOUND', subtitle: 'Clear the target box', tone: 'danger' },
      1.4,
    );
    p.killfeed.push({ attacker: 'YOU', victim: 'RASHID', weapon: 'rifle', highlight: true }, 2.2);
    p.killfeed.push({ attacker: 'AIRSTRIKE', victim: 'JAMAL', weapon: 'explosive' }, 0.9);
    p.status.setObjective('Eliminate hostiles — 9 remaining');
    p.pops.push(250, 'Airstrike kill', 0.4);
    p.vitals.hit(2.6, 18);
  }

  /* ----------------------------- designation ------------------------------ */

  /**
   * Killstreak designation, which is the one combat state where this HUD's job
   * is to get out of the way.
   *
   * The killstreak system ships a full-frame tactical instrument panel — header,
   * two data stacks at the margins, a prompt bar along the bottom — and it is the
   * authority on the footprint, the run-in and whether the shot is legal. A
   * second overlay from here would collide with it in all four corners and
   * disagree with it about the rules, so instead `.hud.targeting` takes the
   * combat layer down and this shot exists to prove it: the radar, reticle,
   * killfeed, ammo and streak tray are all up on the frame before, and the frame
   * after is the other system's panel over a clean picture.
   */
  private designate(): void {
    this.hud.poseReset();
    this.menuSystem?.poseScreen('none');
    this.hud.substitute({
      player: this.fakePlayer(0.86),
      weapons: this.fakeWeapons('rifle', 24, 96),
      killstreaks: this.fakeStreaks(['carpet'], 11, false, 11, true),
      director: this.fakeDirector('playing', {
        score: 24600,
        kills: 58,
        wave: 8,
        enemiesLeft: 12,
        waveSize: 20,
      }),
    });
    this.populate();

    const site = this.designateSite();
    const heading = Math.atan2(_fwd.x, -_fwd.z);
    const streaks = this.realStreaks as (IKillstreaks & TacticalStreaks) | null;
    const v = this.designateVantage;
    v.lookAt?.copy(site);
    if (streaks?.showTargeting?.('carpet', site, heading) && streaks.tacticalPose) {
      v.fov = streaks.tacticalPose(site, v.position);
    } else {
      // No killstreak system: still frame the ground, so the shot shows the HUD
      // standing down rather than failing.
      v.position.copy(site).add(new THREE.Vector3(-14, 30, 16));
    }
  }

  /** An open patch of ground down the axis the combat shots look along. */
  private designateSite(): THREE.Vector3 {
    const from = this.anchor ?? this.ctx.camera.position;
    if (this.aim) _fwd.copy(this.aim).sub(from);
    else _fwd.set(0, 0, -1);
    _fwd.y = 0;
    if (_fwd.lengthSq() < 1e-4) _fwd.set(0, 0, -1);
    _fwd.normalize();
    const site = from.clone().addScaledVector(_fwd, 30);
    this.world?.nearestNavPoint(site, site);
    site.y = this.world?.terrainHeight(site.x, site.z) ?? 0;
    return site;
  }

  /* ------------------------------ ingredients ----------------------------- */

  private get parts(): HUDSystem['parts'] {
    return this.hud.parts;
  }

  private get menuSystem(): MenuSystem | null {
    return this.ctx.tryGet<MenuSystem>('menu') ?? null;
  }

  /**
   * Puts real hostiles on the ground so the radar contacts are real contacts and
   * the frame has something in it to be shooting at. Spawned once and left, since
   * every shot wants them and re-spawning between shots would rebuild eight
   * skinned meshes for nothing.
   */
  private populate(): void {
    const ai = this.ai;
    if (!ai || this.spawned) return;
    this.spawned = true;

    // Laid out in the camera's own frame — along the axis it is looking down and
    // across it — rather than at absolute coordinates. The framing is borrowed
    // from a level vantage point whose position this module does not choose, and
    // a fixed set of coordinates put every hostile off the far end of the radar.
    const from = this.anchor ?? new THREE.Vector3();
    if (this.aim) _fwd.copy(this.aim).sub(from);
    else _fwd.set(0, 0, -1);
    _fwd.y = 0;
    if (_fwd.lengthSq() < 1e-4) _fwd.set(0, 0, -1);
    _fwd.normalize();
    _right.set(-_fwd.z, 0, _fwd.x);

    // Ahead and across: a plausible spray of contacts inside the radar's 64 m,
    // rather than a line or a cluster.
    const places: Array<[number, number]> = [
      [-5.5, 9],
      [4.5, 14],
      [-8.5, 18],
      [7.0, 22],
      [-2.5, 26],
      [10.0, 29],
      [-11.0, 31],
      [2.0, 34],
      [6.5, 8],
    ];
    // Guarded as a whole: the radar is a nice-to-have in a still, and a shot that
    // fails outright is worth less than one missing nine contacts.
    try {
      for (const [across, ahead] of places) {
        _v.copy(from).addScaledVector(_fwd, ahead).addScaledVector(_right, across);
        _v.y = this.world?.terrainHeight(_v.x, _v.z) ?? 0;
        this.world?.nearestNavPoint(_v, _v);
        ai.spawn(_v, Math.atan2(-_fwd.x, _fwd.z));
      }
      ai.setEnabled(true);
    } catch (err) {
      console.warn('[HUDShowcase] could not populate contacts', err);
    }
  }

  /** Settles the real viewmodel into a still hip-fire pose. */
  private poseViewmodel(id: string): void {
    const w = this.realWeapons as (IWeapons & PosableWeapons) | null;
    if (w?.poseFor) w.poseFor(id, 0, true);
    else w?.setVisible(true);
  }

  private fakePlayer(healthFraction: number, alive = true): IPlayer {
    const ctx = this.ctx;
    // Position and facing come from the camera rather than from the real player,
    // because the harness poses the camera after this object is built and the
    // radar and compass must agree with what is on screen.
    const eye = new THREE.Vector3();
    const fwd = new THREE.Vector3();
    const zero = new THREE.Vector3();
    return {
      enabled: false,
      get position(): THREE.Vector3 {
        return eye.copy(ctx.camera.position);
      },
      get eyePosition(): THREE.Vector3 {
        return eye.copy(ctx.camera.position);
      },
      get forward(): THREE.Vector3 {
        return ctx.camera.getWorldDirection(fwd);
      },
      get viewYaw(): number {
        ctx.camera.getWorldDirection(fwd);
        return Math.atan2(fwd.x, -fwd.z);
      },
      get fov(): number {
        return ctx.camera.fov;
      },
      velocity: zero,
      health: Math.round(100 * healthFraction),
      maxHealth: 100,
      alive,
      stance: 'stand',
      sprinting: false,
      grounded: true,
      adsFactor: 0,
      speedFactor: 0.4,
      damage: () => {},
      heal: () => {},
      teleport: () => {},
      addViewKick: () => {},
      setFrozen: () => {},
    };
  }

  private fakeWeapons(id: string, mag: number, reserve: number): IWeapons {
    const loadout = this.realWeapons?.loadout ?? [];
    const stats = loadout.find((w) => w.id === id) ?? loadout[0] ?? FALLBACK_STATS;
    return {
      current: stats,
      mag,
      reserve,
      reloading: false,
      aiming: false,
      // Hip-fire bloom while moving: about nineteen pixels of blade gap at 720p,
      // which is the reticle doing what it is for rather than sitting closed.
      spread: 0.045,
      adsFactor: 0,
      fireMode: stats.fireMode,
      reloadProgress: 0,
      grenades: { frag: 2, flash: 1, smoke: 1 },
      loadout,
      setVisible: () => {},
      switchTo: () => {},
      addAmmo: () => {},
    };
  }

  private fakeStreaks(
    earned: string[],
    killstreak: number,
    uavActive: boolean,
    bestStreak = 7,
    targeting = false,
  ): IKillstreaks {
    const available = this.realStreaks?.available ?? FALLBACK_LADDER;
    const next = available.find((d) => d.killsRequired > killstreak) ?? null;
    return {
      available,
      earned,
      killstreak,
      active: targeting,
      targeting,
      next,
      killsToNext: next ? Math.max(0, next.killsRequired - killstreak) : 0,
      bestStreak,
      uavActive,
      activate: () => false,
      cancel: () => {},
      callAirstrike: () => {},
    };
  }

  private fakeDirector(
    state: IDirector['state'],
    over: Partial<IDirector>,
  ): IDirector {
    return {
      score: 0,
      kills: 0,
      deaths: 0,
      wave: 1,
      lives: 3,
      maxLives: 3,
      respawnIn: 0,
      respawnTotal: 6,
      enemiesLeft: 0,
      waveSize: 0,
      bestStreak: 0,
      ...over,
      state,
      start: () => {},
      restart: () => {},
      pause: () => {},
    };
  }

  dispose(): void {
    this.hud.substitute({
      player: null,
      weapons: null,
      killstreaks: null,
      director: null,
    });
  }
}

/** `WeaponSystem.poseFor`, which settles the rig for a reproducible still. */
interface PosableWeapons {
  poseFor?(id: string, ads: number, still: boolean): void;
}

/**
 * The two harness hooks the killstreak system exposes past `IKillstreaks`.
 * Described structurally rather than imported, so this module does not reach
 * into another system's file for a type.
 */
interface TacticalStreaks {
  showTargeting?(id: string, target: THREE.Vector3, heading: number): boolean;
  tacticalPose?(target: THREE.Vector3, out: THREE.Vector3): number;
}

/** Used only if the weapon system is absent, so the shot still composes. */
const FALLBACK_STATS: WeaponStats = {
  id: 'rifle',
  name: 'M4A1 CARBINE',
  rpm: 780,
  magSize: 30,
  reserveAmmo: 210,
  damage: 33,
  headshotMultiplier: 1.6,
  falloffStart: 34,
  falloffEnd: 72,
  falloffMin: 0.55,
  muzzleVelocity: 880,
  fireMode: 'auto',
  adsTime: 0.24,
  reloadTime: 2.1,
  reloadEmptyTime: 2.95,
  hipSpread: 0.0385,
  adsSpread: 0.0015,
  recoilVertical: 0.0075,
  recoilHorizontal: 0.0031,
  recoilRecovery: 8,
  adsFov: 55,
  caliber: 5.56,
  penetration: 0.095,
};

const FALLBACK_LADDER: KillstreakDef[] = [
  { id: 'uav', name: 'UAV RECON', killsRequired: 3, cooldown: 0, icon: 'uav', description: '' },
  {
    id: 'precision',
    name: 'PRECISION AIRSTRIKE',
    killsRequired: 5,
    cooldown: 0,
    icon: 'bomb',
    description: '',
  },
  {
    id: 'helicopter',
    name: 'ATTACK HELICOPTER',
    killsRequired: 9,
    cooldown: 0,
    icon: 'heli',
    description: '',
  },
];
