import type * as THREE from 'three';

/** 1 world unit = 1 meter. +Y up. Yaw 0 faces -Z; positive yaw turns left (CCW from above). */
export const COORDS = '1 unit = 1m; +Y up; yaw0=-Z, yaw+ = CCW(left); pitch+ = up';

export type Vec3Tuple = [number, number, number];

export type GameMode =
  | 'boot' | 'title' | 'settings' | 'difficulty' | 'briefing' | 'loadout'
  | 'loading' | 'playing' | 'paused' | 'victory' | 'defeat';

export type DifficultyId = 'recruit' | 'operator' | 'veteran';

export type SurfaceKind =
  | 'concrete' | 'drywall' | 'wood' | 'metal' | 'glass' | 'carpet' | 'tile'
  | 'vinyl' | 'snow' | 'plastic' | 'paper' | 'fabric' | 'flesh' | 'ice';

export type WeaponCategory = 'pistol' | 'smg' | 'carbine' | 'shotgun' | 'dmr' | 'knife' | 'flash' | 'smoke';

export type WeaponId =
  | 'vp9'      // "Vektra P-9" service pistol
  | 'kis10'    // "Koda KIS-10" compact SMG
  | 'vc7'      // "Vektra C-7" tactical carbine
  | 'br8'      // "Boreal BR-8" pump shotgun
  | 'lr30'     // "Latt LR-30" precision rifle
  | 'knife'    // "Fieldmate" tactical knife
  | 'flash'    // "Starburst" flash device
  | 'smoke';   // "Whiteout" smoke device

export interface WeaponDef {
  id: WeaponId;
  name: string;
  maker: string;
  category: WeaponCategory;
  slot: 1 | 2 | 3 | 4 | 5;
  damage: number;
  headshotMult: number;
  rpm: number;              // rounds per minute (or swing rate)
  auto: boolean;
  magSize: number;
  reserveMax: number;
  reloadTime: number;       // s, tactical reload
  reloadTimeEmpty: number;  // s, empty reload (incl. chambering)
  spreadBase: number;       // radians, standing still hip
  spreadMove: number;       // additional at full speed
  spreadAds: number;        // multiplier when aiming
  recoilKick: number;       // radians per shot (pitch)
  recoilYaw: number;        // radians random yaw component
  recoilRecover: number;    // per second recovery rate
  pellets: number;          // >1 for shotgun
  range: number;            // effective range (falloff end)
  penetration: number;      // 0..1 surface penetration power
  adsZoom: number;          // fov multiplier when aiming
  moveSpeedMult: number;
  loudness: number;         // AI hearing radius m
  tracerEvery: number;      // 0 = never
}

export type DoorKind = 'office' | 'glass' | 'fire' | 'security' | 'restroom' | 'server' | 'loading' | 'double';
export type DoorState = 'closed' | 'opening' | 'open' | 'closing';

export type EnemyStateName = 'patrol' | 'idle' | 'suspicious' | 'investigate' | 'combat' | 'search' | 'dead';
export type HostageStateName = 'captive' | 'following' | 'waiting' | 'extracted' | 'dead';

export type ObjectiveId = 'infiltrate' | 'hostageA' | 'hostageB' | 'extract' | 'survive';
export type ObjectiveState = 'hidden' | 'active' | 'done' | 'failed';

export interface HitResult {
  kind: 'world' | 'enemy' | 'glass' | 'door' | 'none';
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
  surface: SurfaceKind;
  enemyId?: string;
  part?: 'head' | 'body' | 'limb';
  glassId?: string;
  doorId?: string;
}

/** Room identifiers for the Northstar Administrative Annex. */
export type RoomId =
  | 'courtyard' | 'entrance' | 'vestibule' | 'security' | 'lobby' | 'waiting'
  | 'ncorr' | 'stairwell' | 'restroom-m' | 'restroom-w' | 'janitor' | 'server'
  | 'it' | 'mainhall' | 'cubicles' | 'break' | 'wellness' | 'copy' | 'loading'
  | 'garage' | 'mech' | 'servicecorr'
  | 'balcony' | 'records' | 'execcorr' | 'conference' | 'exec';

export const ROOM_NAMES: Record<RoomId, string> = {
  courtyard: 'Exterior Courtyard',
  entrance: 'Employee Entrance',
  vestibule: 'Security Vestibule',
  security: 'Security Office',
  lobby: 'Reception Lobby',
  waiting: 'Visitor Waiting',
  ncorr: 'North Corridor',
  stairwell: 'Central Stairwell',
  'restroom-m': 'Restroom M',
  'restroom-w': 'Restroom W',
  janitor: 'Janitor Closet',
  server: 'Server Room',
  it: 'IT Workspace',
  mainhall: 'Main Hall',
  cubicles: 'Open-Plan Office',
  break: 'Break Room',
  wellness: 'Wellness Room',
  copy: 'Copy & Mail Room',
  loading: 'Loading Area',
  garage: 'Extraction Garage',
  mech: 'Mechanical Room',
  servicecorr: 'Service Corridor',
  balcony: 'Lobby Balcony',
  records: 'Records Archive',
  execcorr: 'Executive Corridor',
  conference: 'Conference Room',
  exec: 'Executive Office',
};

export interface DifficultyDef {
  id: DifficultyId;
  name: string;
  tagline: string;
  enemyCount: number;
  enemyHealth: number;
  enemyDamageMult: number;
  enemyAccuracy: number;    // 0..1
  enemyReactionTime: number; // s from spotting to firing
  visionRange: number;
  hearingMult: number;
  missionTime: number;      // s
  playerArmor: number;
}
