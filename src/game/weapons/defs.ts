import type { WeaponDef, WeaponId } from '../types';
import { registerAsset } from '../../assets/registry';

/**
 * Original fictional weapon set — "Vektra Arms", "Koda Defense", "Boreal Werks",
 * "Latt Precision" are invented manufacturers (Opus 2 stats, Fable 4 visuals).
 */
export const WEAPONS: Record<WeaponId, WeaponDef> = {
  vp9: {
    id: 'vp9', name: 'P-9 Sidearm', maker: 'Vektra Arms', category: 'pistol', slot: 2,
    damage: 26, headshotMult: 3.2, rpm: 400, auto: false, magSize: 15, reserveMax: 60,
    reloadTime: 1.55, reloadTimeEmpty: 1.95, spreadBase: 0.008, spreadMove: 0.03,
    spreadAds: 0.35, recoilKick: 0.019, recoilYaw: 0.006, recoilRecover: 6.5,
    pellets: 1, range: 34, penetration: 0.25, adsZoom: 0.88, moveSpeedMult: 1.0,
    loudness: 26, tracerEvery: 0,
  },
  kis10: {
    id: 'kis10', name: 'KIS-10 Compact', maker: 'Koda Defense', category: 'smg', slot: 1,
    damage: 21, headshotMult: 2.6, rpm: 780, auto: true, magSize: 30, reserveMax: 120,
    reloadTime: 2.1, reloadTimeEmpty: 2.6, spreadBase: 0.012, spreadMove: 0.022,
    spreadAds: 0.45, recoilKick: 0.011, recoilYaw: 0.007, recoilRecover: 8,
    pellets: 1, range: 28, penetration: 0.3, adsZoom: 0.85, moveSpeedMult: 0.97,
    loudness: 30, tracerEvery: 3,
  },
  vc7: {
    id: 'vc7', name: 'C-7 Carbine', maker: 'Vektra Arms', category: 'carbine', slot: 1,
    damage: 30, headshotMult: 3.4, rpm: 640, auto: true, magSize: 30, reserveMax: 90,
    reloadTime: 2.3, reloadTimeEmpty: 2.9, spreadBase: 0.006, spreadMove: 0.03,
    spreadAds: 0.3, recoilKick: 0.016, recoilYaw: 0.008, recoilRecover: 7,
    pellets: 1, range: 48, penetration: 0.55, adsZoom: 0.8, moveSpeedMult: 0.94,
    loudness: 42, tracerEvery: 3,
  },
  br8: {
    id: 'br8', name: 'BR-8 Defender', maker: 'Boreal Werks', category: 'shotgun', slot: 1,
    damage: 12, headshotMult: 1.8, rpm: 68, auto: false, magSize: 6, reserveMax: 32,
    reloadTime: 0.65, reloadTimeEmpty: 0.65, spreadBase: 0.03, spreadMove: 0.012,
    spreadAds: 0.75, recoilKick: 0.05, recoilYaw: 0.012, recoilRecover: 4.5,
    pellets: 8, range: 16, penetration: 0.1, adsZoom: 0.9, moveSpeedMult: 0.92,
    loudness: 46, tracerEvery: 0,
  },
  lr30: {
    id: 'lr30', name: 'LR-30 Marksman', maker: 'Latt Precision', category: 'dmr', slot: 1,
    damage: 72, headshotMult: 2.8, rpm: 130, auto: false, magSize: 10, reserveMax: 40,
    reloadTime: 2.6, reloadTimeEmpty: 3.3, spreadBase: 0.004, spreadMove: 0.05,
    spreadAds: 0.12, recoilKick: 0.045, recoilYaw: 0.01, recoilRecover: 4,
    pellets: 1, range: 90, penetration: 0.85, adsZoom: 0.55, moveSpeedMult: 0.9,
    loudness: 55, tracerEvery: 1,
  },
  knife: {
    id: 'knife', name: 'Fieldmate Blade', maker: 'Boreal Werks', category: 'knife', slot: 3,
    damage: 55, headshotMult: 1.4, rpm: 95, auto: false, magSize: 0, reserveMax: 0,
    reloadTime: 0, reloadTimeEmpty: 0, spreadBase: 0, spreadMove: 0,
    spreadAds: 1, recoilKick: 0.008, recoilYaw: 0, recoilRecover: 10,
    pellets: 1, range: 1.9, penetration: 0, adsZoom: 1, moveSpeedMult: 1.06,
    loudness: 2, tracerEvery: 0,
  },
  flash: {
    id: 'flash', name: 'Starburst Device', maker: 'Koda Defense', category: 'flash', slot: 4,
    damage: 0, headshotMult: 1, rpm: 55, auto: false, magSize: 2, reserveMax: 2,
    reloadTime: 0, reloadTimeEmpty: 0, spreadBase: 0, spreadMove: 0,
    spreadAds: 1, recoilKick: 0, recoilYaw: 0, recoilRecover: 10,
    pellets: 1, range: 0, penetration: 0, adsZoom: 1, moveSpeedMult: 1.0,
    loudness: 60, tracerEvery: 0,
  },
  smoke: {
    id: 'smoke', name: 'Whiteout Canister', maker: 'Koda Defense', category: 'smoke', slot: 5,
    damage: 0, headshotMult: 1, rpm: 55, auto: false, magSize: 2, reserveMax: 2,
    reloadTime: 0, reloadTimeEmpty: 0, spreadBase: 0, spreadMove: 0,
    spreadAds: 1, recoilKick: 0, recoilYaw: 0, recoilRecover: 10,
    pellets: 1, range: 0, penetration: 0, adsZoom: 1, moveSpeedMult: 1.0,
    loudness: 14, tracerEvery: 0,
  },
};

for (const wd of Object.values(WEAPONS)) {
  registerAsset({
    id: `weapon.${wd.id}`,
    name: `${wd.maker} ${wd.name}`,
    category: 'weapon',
    agent: 'Fable 4',
    files: 'src/game/weapons/defs.ts, src/assets/models/weapons/*.ts',
    where: 'loadout / player hands / enemy hands / pickups',
    dims: 'per model spec',
    pivot: 'grip origin, -Z barrel',
    materials: 'matte polymer, blued steel, alu',
    textures: 'procedural detail + plain PBR',
    collision: 'none (view/world model)',
    lod: 'none',
    anim: 'draw, holster, idle, fire, ads, reload (tac/empty), dryfire, sway, land',
    audio: `${wd.category}-fire, reload set, dryfire`,
    status: 'spec',
    accept: 'silhouette/material ≥4; no camera clipping; complete anim set; correct ammo math',
  });
}
