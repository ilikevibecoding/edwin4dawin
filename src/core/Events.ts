import type * as THREE from 'three';

/**
 * The complete event vocabulary shared by every subsystem. Systems communicate
 * exclusively through this map so that no subsystem needs a direct reference to
 * another, which keeps the dependency graph acyclic.
 */

export type SurfaceKind =
  | 'concrete'
  | 'metal'
  | 'wood'
  | 'sand'
  | 'dirt'
  | 'glass'
  | 'water'
  | 'flesh'
  | 'foliage'
  | 'fabric'
  | 'rubber'
  | 'plaster';

export type DamageKind = 'bullet' | 'explosion' | 'melee' | 'fall' | 'fire';

export interface ImpactEvent {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  surface: SurfaceKind;
  /** Incoming direction of the projectile, normalised. */
  direction: THREE.Vector3;
  /** 0..1 scalar used to scale spark/dust volume. */
  energy: number;
  /** Object that was struck, when one is known. */
  target?: THREE.Object3D;
}

export interface ExplosionEvent {
  position: THREE.Vector3;
  radius: number;
  /** Peak damage at the centre of the blast. */
  damage: number;
  /** Visual scale multiplier, independent of gameplay radius. */
  scale?: number;
  source?: 'grenade' | 'airstrike' | 'barrel' | 'rocket' | 'vehicle';
  /** Normal of the surface the blast originated against, for directional debris. */
  normal?: THREE.Vector3;
}

export interface TracerEvent {
  origin: THREE.Vector3;
  end: THREE.Vector3;
  /** Metres per second; controls how fast the tracer streak travels. */
  speed: number;
  caliber: number;
  /** Tracers from the local player are rendered slightly differently. */
  fromPlayer: boolean;
}

export interface MuzzleFlashEvent {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  scale: number;
  /** Attach the flash to this object so it follows weapon animation. */
  parent?: THREE.Object3D;
}

export interface DamageEvent {
  amount: number;
  kind: DamageKind;
  /** World-space origin of the damage, used for directional indicators. */
  from?: THREE.Vector3;
  headshot?: boolean;
  attacker?: 'player' | 'enemy';
  targetId?: number;
}

export interface CameraShakeEvent {
  /** Peak translational amplitude in metres. */
  amplitude: number;
  /** Seconds until the shake fully decays. */
  duration: number;
  /** Higher values feel snappier / more violent. */
  frequency?: number;
  /** Optional world position; shake attenuates with distance from the camera. */
  position?: THREE.Vector3;
  /** Falloff radius when `position` is supplied. */
  radius?: number;
}

export interface AudioEvent {
  id: string;
  position?: THREE.Vector3;
  volume?: number;
  /** Playback rate multiplier, used for pitch variation. */
  rate?: number;
  /** Attach to a moving object so the emitter tracks it. */
  parent?: THREE.Object3D;
}

export interface KillfeedEvent {
  attacker: string;
  victim: string;
  weapon: string;
  headshot?: boolean;
  /** True when the local player was involved. */
  highlight?: boolean;
}

export interface HitmarkerEvent {
  lethal: boolean;
  headshot: boolean;
  /** Damage dealt, used to scale the marker. */
  damage: number;
}

export interface NotifyEvent {
  title: string;
  subtitle?: string;
  /** Seconds the banner remains on screen. */
  duration?: number;
  tone?: 'neutral' | 'positive' | 'warning' | 'danger';
}

export interface AirstrikeEvent {
  /** Centre of the target box on the ground plane. */
  target: THREE.Vector3;
  /** Compass heading in radians the jets approach along. */
  heading: number;
  kind: 'precision' | 'carpet' | 'cluster' | 'napalm';
}

export interface EnemyDeathEvent {
  id: number;
  position: THREE.Vector3;
  headshot: boolean;
  /** Direction of the killing blow, for ragdoll impulse. */
  impulse: THREE.Vector3;
  weapon: string;
}

export interface WeaponFireEvent {
  weaponId: string;
  /** Muzzle position in world space. */
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  ammoLeft: number;
  suppressed: boolean;
}

export interface DecalRequest {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  surface: SurfaceKind;
  size: number;
  kind: 'bullet' | 'scorch' | 'blood' | 'crater';
  /** Object the decal should be projected against, for correct parenting. */
  target?: THREE.Object3D;
}

export interface GameEvents {
  'game:start': void;
  'game:pause': boolean;
  'game:over': { won: boolean; score: number };
  'game:restart': void;
  /** Emitted once all systems finished async initialisation. */
  'game:ready': void;
  /** Progress 0..1 during boot, with a human readable label. */
  'loading:progress': { progress: number; label: string };

  'player:spawn': { position: THREE.Vector3 };
  'player:damage': DamageEvent;
  'player:death': { by: string };
  'player:heal': { amount: number };
  'player:footstep': { surface: SurfaceKind; running: boolean; position: THREE.Vector3 };
  'player:land': { velocity: number; surface: SurfaceKind };
  'player:sprint': boolean;
  'player:slide': boolean;
  'player:mantle': void;
  /* --- additive: the rest of the player's movement vocabulary --- */
  'player:jump': void;
  /** A waist-high obstacle was vaulted rather than climbed onto. */
  'player:vault': void;
  /** Stance changed. Mirrors `IPlayer.stance`; inlined to stay dependency-free. */
  'player:stance': { stance: 'stand' | 'crouch' | 'prone' | 'slide' };
  /** The player started or stopped holding their breath to steady a shot. */
  'player:breath': boolean;

  'weapon:fire': WeaponFireEvent;
  'weapon:dryfire': { weaponId: string };
  'weapon:reload:start': { weaponId: string; tactical: boolean };
  'weapon:reload:end': { weaponId: string };
  'weapon:switch': { weaponId: string; name: string };
  'weapon:ads': boolean;
  'weapon:ammo': { mag: number; reserve: number };
  'weapon:grenade': { kind: 'frag' | 'flash' | 'smoke'; count: number };
  /* --- additive: the rest of the weapon's vocabulary --- */
  /** Selector moved. Mirrors `IWeapons.fireMode`; inlined to stay dependency-free. */
  'weapon:firemode': { weaponId: string; mode: 'auto' | 'semi' | 'burst' | 'bolt' | 'pump' };
  /** A melee strike started; `hit` is resolved on the same frame it connects. */
  'weapon:melee': { hit: boolean };
  /** One shell went into a shell-by-shell reload, so the HUD can tick. */
  'weapon:reload:shell': { weaponId: string; mag: number };
  /** The action was worked by hand: a bolt lift-and-throw or a pump stroke. */
  'weapon:cycle': { weaponId: string };
  /** Inspect flourish started. */
  'weapon:inspect': { weaponId: string };

  'enemy:spawn': { id: number; position: THREE.Vector3 };
  'enemy:damage': DamageEvent & { id: number };
  'enemy:death': EnemyDeathEvent;
  'enemy:fire': { id: number; origin: THREE.Vector3; direction: THREE.Vector3 };

  'fx:impact': ImpactEvent;
  'fx:explosion': ExplosionEvent;
  'fx:tracer': TracerEvent;
  'fx:muzzleflash': MuzzleFlashEvent;
  'fx:decal': DecalRequest;
  'fx:shell': { position: THREE.Vector3; velocity: THREE.Vector3; caliber: number };
  'fx:blood': { position: THREE.Vector3; direction: THREE.Vector3; amount: number };
  'fx:smoke': { position: THREE.Vector3; radius: number; duration: number };
  'fx:flashbang': { position: THREE.Vector3 };
  /**
   * Additive: a round passed close enough to the camera to be heard as a crack
   * rather than a report. The effects system detects it while processing
   * tracers and publishes it so the audio system can place the snap without
   * repeating the geometry. `position` is where the listener is, `distance` is
   * the miss distance in metres and `speed` the round's muzzle velocity.
   */
  'fx:whizby': { position: THREE.Vector3; distance: number; speed: number };

  'camera:shake': CameraShakeEvent;
  /** Recoil kick applied to the view, in radians (pitch, yaw). */
  'camera:kick': { pitch: number; yaw: number; roll?: number };
  'camera:fov': { fov: number; duration: number };

  'audio:play': AudioEvent;
  'audio:duck': { amount: number; duration: number };

  'ui:killfeed': KillfeedEvent;
  'ui:hitmarker': HitmarkerEvent;
  'ui:notify': NotifyEvent;
  'ui:objective': { text: string; position?: THREE.Vector3 };
  'ui:score': { score: number; delta: number; reason: string };

  'killstreak:progress': { kills: number; next: string | null };
  'killstreak:earned': { id: string; name: string };
  'killstreak:call': { id: string };
  'airstrike:request': { kind: AirstrikeEvent['kind'] };
  'airstrike:begin': AirstrikeEvent;
  'airstrike:inbound': { secondsToImpact: number };
  'airstrike:impact': { position: THREE.Vector3; index: number; total: number };
  'airstrike:end': void;

  /* --- additive: what the HUD needs to draw a killstreak, and the rest of
     the support vocabulary the ladder produces --- */

  /**
   * A streak was consumed. Emitted the moment it leaves the player's hand,
   * which for a targeted streak is the confirm and not the activation.
   */
  'killstreak:spent': { id: string; name: string };
  /** A streak the player owned was thrown away without being used. */
  'killstreak:cancel': { id: string };
  /** The player entered or left a streak's targeting mode. */
  'killstreak:targeting': { active: boolean; id: string };
  /**
   * Live targeting feedback, emitted every frame the player is choosing a
   * target so the HUD can draw the reticle readout without duplicating the
   * validity rules.
   */
  'killstreak:target': {
    position: THREE.Vector3;
    heading: number;
    valid: boolean;
    /** Why the target was rejected: '' when valid. */
    reason: string;
    /** Enemies currently standing inside the blast footprint. */
    enemies: number;
    /** Seconds left before the targeting mode times out. */
    timeLeft: number;
  };
  /**
   * Aerial reconnaissance is up or down. While `active`, the HUD reveals every
   * enemy on the minimap and the radar sweeps at `sweepPeriod` seconds.
   */
  'killstreak:uav': { active: boolean; duration: number; sweepPeriod: number };
  /** A resupply crate was dropped, is falling, or has landed. */
  'killstreak:package': {
    position: THREE.Vector3;
    state: 'inbound' | 'landed' | 'collected';
  };
  /** A friendly aircraft is on station and should be marked on the HUD. */
  'killstreak:aircraft': {
    id: string;
    kind: 'jet' | 'helicopter' | 'gunship';
    position: THREE.Vector3;
    active: boolean;
  };

  /**
   * Which act of the airstrike is running. `secondsRemaining` is how long this
   * phase has left, so a HUD can size a progress arc without a second clock.
   */
  'airstrike:phase': {
    kind: AirstrikeEvent['kind'];
    phase: 'targeting' | 'inbound' | 'impact' | 'aftermath';
    secondsRemaining: number;
  };
  /** A bomb left a hardpoint. Position is the hardpoint, in world space. */
  'airstrike:release': { position: THREE.Vector3; index: number; total: number };
  /** A jet passed the target. Used for the doppler pass-by and the HUD. */
  'airstrike:flyby': { position: THREE.Vector3; velocity: THREE.Vector3; index: number };

  /**
   * The sky changed materially and any cached lighting derived from it — IBL,
   * probes, baked shadow colour — is stale. `revision` matches `ISky.revision`.
   */
  'sky:changed': { timeOfDay: number; revision: number; sunElevation: number };
  /** A named sky preset was applied. */
  'sky:preset': { name: string };
  /** Structurally a `WeatherState`; inlined so this file stays dependency-free. */
  'weather:changed': {
    cloudCover: number;
    haze: number;
    windSpeed: number;
    windDirection: number;
    dust: number;
  };

  'quality:changed': { preset: string };
  'debug:toggle': string;

  /* --- additive: what the HUD, the menus and the game director publish --- */

  /**
   * Which full-screen interface owns the frame. The HUD stands itself down for
   * anything other than `none`, and the audio mix can duck on the same signal.
   */
  'ui:screen': {
    screen: 'none' | 'loading' | 'main' | 'loadout' | 'settings' | 'controls' | 'pause' | 'over';
  };
  /**
   * A wave of the survival mode changed phase. `size` is the number of hostiles
   * the wave contains, which is fixed for its whole life.
   */
  'game:wave': {
    wave: number;
    size: number;
    phase: 'briefing' | 'incoming' | 'active' | 'cleared';
  };
  /** The player is waiting to redeploy. Emitted once per death. */
  'game:respawn': { seconds: number; livesLeft: number };
  /**
   * A setting the player changed in the options screen, published so any system
   * holding a derived value can refresh without polling.
   */
  'settings:changed': { key: string; value: number | boolean | string };
}

export type EventKey = keyof GameEvents;
