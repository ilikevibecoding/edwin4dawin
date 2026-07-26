/**
 * Shared interfaces between ownership areas.
 * Owner: Opus 1 (lead). Other agents request additions rather than editing directly.
 *
 * Coordinate convention for the whole project:
 *   - Right handed, metres. 1 world unit = 1 metre.
 *   - +Y is up. Ground floor slab top sits at y = 0.
 *   - Yaw 0 looks down -Z. Yaw increases counter-clockwise seen from above (+Y).
 *   - Pitch is positive looking up, clamped to +/- 89 degrees.
 */
import type * as THREE from 'three';

export const COORDINATE_CONVENTION =
  'right-handed; metres; +Y up; yaw 0 faces -Z; yaw CCW from above; pitch + is up';

export type GameMode =
  | 'boot'
  | 'title'
  | 'settings'
  | 'controls'
  | 'difficulty'
  | 'briefing'
  | 'loadout'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'victory'
  | 'defeat'
  | 'gallery';

export type DifficultyId = 'recruit' | 'operator' | 'veteran' | 'blackout';

export type SurfaceKind =
  | 'drywall'
  | 'plaster'
  | 'concrete'
  | 'carpet'
  | 'tile'
  | 'vinyl'
  | 'wood'
  | 'metal'
  | 'glass'
  | 'fabric'
  | 'paper'
  | 'plastic'
  | 'snow'
  | 'ceiling'
  | 'flesh';

export type MovementState =
  | 'idle'
  | 'walking'
  | 'running'
  | 'crouch-idle'
  | 'crouch-walking'
  | 'airborne'
  | 'landing'
  | 'dead';

export type WeaponId =
  | 'vk7-sidearm'
  | 'wraith-9'
  | 'lynx-mk4'
  | 'boreas-12'
  | 'meridian-dmr'
  | 'talon-knife'
  | 'flash-device'
  | 'smoke-device';

export type WeaponFamily = 'pistol' | 'smg' | 'carbine' | 'shotgun' | 'dmr' | 'melee' | 'throwable';

export type WeaponActionState =
  | 'holstered'
  | 'drawing'
  | 'idle'
  | 'firing'
  | 'reloading'
  | 'empty-reloading'
  | 'chambering'
  | 'holstering'
  | 'dryfire'
  | 'melee-swing'
  | 'throw-windup'
  | 'throw-release';

export type ObjectiveId =
  | 'infiltrate'
  | 'locate-hostages'
  | 'secure-hostage-a'
  | 'secure-hostage-b'
  | 'escort'
  | 'extract';

export type ObjectiveStatus = 'locked' | 'active' | 'complete' | 'failed';

export type HostageId = 'hostage-a' | 'hostage-b';

export type HostageBehaviour =
  | 'bound-idle'
  | 'fear'
  | 'freed'
  | 'following'
  | 'holding'
  | 'crouched'
  | 'extracted'
  | 'down';

export type EnemyAlertState = 'idle' | 'suspicious' | 'investigating' | 'combat' | 'searching' | 'dead';

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

/** A static collision brush registered by the map builder. */
export interface StaticBrush {
  /** Axis-aligned box in world space (metres). */
  min: THREE.Vector3;
  max: THREE.Vector3;
  surface: SurfaceKind;
  /** Blocks the player/AI capsule. */
  solid: boolean;
  /** Blocks bullets and line of sight. */
  opaque: boolean;
  /** Optional owner id, used by doors and breakables. */
  id?: string;
}

export interface HitResult {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
  surface: SurfaceKind;
  /** Set when an actor was hit. */
  actorId?: string;
  bodyPart?: 'head' | 'chest' | 'limb';
  brushId?: string;
}

export interface InteractableInfo {
  id: string;
  kind: 'door' | 'hostage' | 'extraction' | 'terminal' | 'pickup' | 'switch';
  label: string;
  /** Verb shown in the prompt, e.g. "Open", "Secure". */
  verb: string;
  position: THREE.Vector3;
  enabled: boolean;
  locked?: boolean;
}

/** Quality tiers exposed in settings. */
export type QualityTier = 'low' | 'medium' | 'high' | 'ultra';

export interface QualityProfile {
  tier: QualityTier;
  shadowMapSize: number;
  shadowsEnabled: boolean;
  maxDynamicLights: number;
  anisotropy: number;
  textureScale: number;
  ssaoEnabled: boolean;
  bloomEnabled: boolean;
  antialias: 'none' | 'fxaa' | 'smaa';
  particleScale: number;
  decalBudget: number;
  drawDistance: number;
  reflectionProbe: boolean;
}

export interface Settings {
  masterVolume: number;
  effectsVolume: number;
  musicVolume: number;
  mouseSensitivity: number;
  invertY: boolean;
  fieldOfView: number;
  quality: QualityTier;
  resolutionScale: number;
  crosshairVisible: boolean;
  reducedCameraMotion: boolean;
  reducedBlood: boolean;
  subtitles: boolean;
  minimap: boolean;
  motionBlur: boolean;
  showFps: boolean;
}

export interface Announcement {
  id: string;
  text: string;
  /** seconds remaining */
  ttl: number;
  tone: 'info' | 'objective' | 'warning' | 'success' | 'failure';
}

/** Everything a system needs from the frame. */
export interface UpdateContext {
  /** Fixed simulation step, seconds. */
  dt: number;
  /** Seconds since mission start (simulation clock, not wall clock). */
  elapsed: number;
  /** Total simulation ticks since boot. */
  tick: number;
}
