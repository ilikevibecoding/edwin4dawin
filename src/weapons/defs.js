// Weapon definitions (Opus 2 balance, Fable 4 art). All names/manufacturers are fictional and
// original: Karst Arms, Boreal Defense, Halcyon Ordnance, Vanta Systems, Meridian Precision.
export const WEAPONS = {
  'karst-p9': {
    id: 'karst-p9', name: 'Karst P9', maker: 'Karst Arms', class: 'pistol', slot: 1,
    damage: 26, rpm: 330, auto: false, magSize: 15, reserveMax: 60,
    reloadMs: 1550, reloadEmptyMs: 1950, drawMs: 420,
    spread: { base: 0.9, move: 2.4, crouch: 0.65, aim: 0.42, perShot: 0.55, max: 5 },
    recoil: { pitch: 1.5, yaw: 0.45, recover: 9 },
    penetration: 0.4, noise: 30, tracer: false, adsFovScale: 0.88,
    range: 60, falloffStart: 18,
    sound: { body: { f0: 190, f1: 70, gain: 0.8, dur: 0.1 }, crack: { f: 3400, q: 0.9, gain: 0.6, dur: 0.04 }, tail: { gain: 0.28, dur: 0.5, f: 1400 } },
    hud: 'pistol',
  },
  'boreal-k5': {
    id: 'boreal-k5', name: 'Boreal K5', maker: 'Boreal Defense', class: 'smg', slot: 2,
    damage: 21, rpm: 800, auto: true, magSize: 30, reserveMax: 120,
    reloadMs: 1900, reloadEmptyMs: 2450, drawMs: 500,
    spread: { base: 1.1, move: 2.2, crouch: 0.8, aim: 0.55, perShot: 0.35, max: 4.5 },
    recoil: { pitch: 0.85, yaw: 0.5, recover: 11 },
    penetration: 0.35, noise: 34, tracer: true, adsFovScale: 0.85,
    range: 45, falloffStart: 12,
    sound: { body: { f0: 170, f1: 62, gain: 0.75, dur: 0.09 }, crack: { f: 3000, q: 0.8, gain: 0.62, dur: 0.035 }, tail: { gain: 0.26, dur: 0.45, f: 1300 } },
    hud: 'smg',
  },
  'halcyon-hc4': {
    id: 'halcyon-hc4', name: 'Halcyon HC-4', maker: 'Halcyon Ordnance', class: 'carbine', slot: 2,
    damage: 33, rpm: 640, auto: true, magSize: 30, reserveMax: 90,
    reloadMs: 2100, reloadEmptyMs: 2700, drawMs: 560,
    spread: { base: 0.75, move: 2.8, crouch: 0.5, aim: 0.3, perShot: 0.5, max: 5 },
    recoil: { pitch: 1.35, yaw: 0.7, recover: 9.5 },
    penetration: 0.7, noise: 42, tracer: true, adsFovScale: 0.8,
    range: 90, falloffStart: 30,
    sound: { body: { f0: 220, f1: 60, gain: 0.95, dur: 0.13 }, crack: { f: 3600, q: 0.7, gain: 0.75, dur: 0.05 }, tail: { gain: 0.4, dur: 0.8, f: 1200 } },
    hud: 'carbine',
  },
  'vanta-s12': {
    id: 'vanta-s12', name: 'Vanta S-12', maker: 'Vanta Systems', class: 'shotgun', slot: 2,
    damage: 10, pellets: 8, rpm: 68, auto: false, magSize: 7, reserveMax: 28,
    reloadMs: 700, reloadEmptyMs: 700, reloadPerShell: true, pumpMs: 620, drawMs: 620,
    spread: { base: 3.4, move: 4.2, crouch: 3.0, aim: 2.6, perShot: 0.4, max: 6 },
    recoil: { pitch: 3.4, yaw: 1.1, recover: 6.5 },
    penetration: 0.15, noise: 46, tracer: false, adsFovScale: 0.9,
    range: 30, falloffStart: 7,
    sound: { body: { f0: 150, f1: 45, gain: 1.15, dur: 0.2 }, crack: { f: 2200, q: 0.6, gain: 0.8, dur: 0.06 }, tail: { gain: 0.5, dur: 1.0, f: 900 } },
    hud: 'shotgun',
  },
  'meridian-lr8': {
    id: 'meridian-lr8', name: 'Meridian LR-8', maker: 'Meridian Precision', class: 'sniper', slot: 2,
    damage: 95, rpm: 45, auto: false, magSize: 10, reserveMax: 30,
    reloadMs: 2600, reloadEmptyMs: 3200, drawMs: 800, boltMs: 1050,
    spread: { base: 3.5, move: 6, crouch: 3.0, aim: 0.06, perShot: 1.2, max: 8 },
    recoil: { pitch: 4.2, yaw: 1.0, recover: 5.5 },
    penetration: 0.95, noise: 55, tracer: true, adsFovScale: 0.32, scope: true,
    range: 200, falloffStart: 80,
    sound: { body: { f0: 260, f1: 50, gain: 1.2, dur: 0.18 }, crack: { f: 3900, q: 0.6, gain: 0.9, dur: 0.06 }, tail: { gain: 0.55, dur: 1.3, f: 1100 } },
    hud: 'sniper',
  },
  'cq-blade': {
    id: 'cq-blade', name: 'Fieldman CQ', maker: 'Karst Arms', class: 'melee', slot: 3,
    damage: 48, rpm: 90, auto: false, magSize: Infinity, reserveMax: Infinity,
    drawMs: 300, meleeRange: 1.7, noise: 4,
    spread: { base: 0, move: 0, crouch: 0, aim: 0, perShot: 0, max: 0 },
    recoil: { pitch: 0.3, yaw: 0.4, recover: 12 },
    hud: 'knife',
  },
  'fb-3': {
    id: 'fb-3', name: 'FB-3 Dazzler', maker: 'Vanta Systems', class: 'thrown', slot: 4,
    damage: 0, magSize: 1, reserveMax: 2, carried: 2, drawMs: 350, throwMs: 480,
    effect: 'flash', fuseMs: 1600, effectRadius: 11, noise: 60,
    spread: { base: 0, move: 0, crouch: 0, aim: 0, perShot: 0, max: 0 },
    recoil: { pitch: 0.2, yaw: 0.1, recover: 10 },
    hud: 'flash',
  },
  'sg-2': {
    id: 'sg-2', name: 'SG-2 Veil', maker: 'Vanta Systems', class: 'thrown', slot: 5,
    damage: 0, magSize: 1, reserveMax: 2, carried: 2, drawMs: 350, throwMs: 480,
    effect: 'smoke', fuseMs: 1300, effectRadius: 4.2, durationMs: 16000, noise: 24,
    spread: { base: 0, move: 0, crouch: 0, aim: 0, perShot: 0, max: 0 },
    recoil: { pitch: 0.2, yaw: 0.1, recover: 10 },
    hud: 'smoke',
  },
};

export const PRIMARIES = ['boreal-k5', 'halcyon-hc4', 'vanta-s12', 'meridian-lr8'];
export const DEFAULT_LOADOUT = { primary: 'halcyon-hc4', sidearm: 'karst-p9', slot4: 'fb-3', slot5: 'sg-2' };

export const HEAD_MULT = 2.5;
export const LEG_MULT = 0.8;
