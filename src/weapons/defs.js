/**
 * Weapon definitions: gameplay tuning + viewmodel (vm) animation tuning.
 * Gameplay fields are consumed by Weapons (index.js), vm fields by ViewmodelAnimator.
 * Positions are camera-space metres (x right, y up, z forward = negative).
 */
export const WEAPON_DEFS = [
  {
    name: 'M4A1', type: 'rifle', auto: true, rpm: 780, damage: 26, headshotMul: 2.1,
    magSize: 30, reserve: 180, reloadTime: 2.1, spreadHip: 0.013, spreadAds: 0.0014,
    adsFov: -16, adsTime: 0.22, range: 300,
    // camera recoil: rising pattern w/ gentle horizontal S-drift
    recoil: {
      pitch: 0.0062, yaw: 0.0018,
      firstShotMul: 1.35,   // extra kick on the first shots of a burst
      settleShots: 5,       // shots until the pattern settles into drift
      driftFreq: 0.42,      // horizontal sine drift per shot index
    },
    vm: {
      hipPos: [0.17, -0.168, -0.43], hipRot: [0.0, 0.045, 0.03],
      adsZ: -0.17,              // weapon-origin z at full ADS (aim point centers x/y)
      sprintPos: [0.04, -0.10, -0.36], sprintRot: [0.38, 0.62, 0.22],
      kickBack: 0.021, kickPitch: 0.05, kickYaw: 0.016, kickRoll: 0.02,
      adsKickMul: 0.45,
      cycleTime: 0.072,         // bolt carrier cycle
      flashScale: 1.3,
    },
  },
  {
    name: 'M1911', type: 'pistol', auto: false, rpm: 430, damage: 34, headshotMul: 2.4,
    magSize: 8, reserve: 64, reloadTime: 1.7, spreadHip: 0.019, spreadAds: 0.0035,
    adsFov: -8, adsTime: 0.16, range: 120,
    recoil: {
      pitch: 0.0135, yaw: 0.0038,
      firstShotMul: 1.0, settleShots: 1, driftFreq: 0.9,
    },
    vm: {
      hipPos: [0.15, -0.115, -0.29], hipRot: [0.005, 0.04, 0.02],
      adsZ: -0.31,
      sprintPos: [0.05, -0.09, -0.27], sprintRot: [0.42, 0.55, 0.28],
      kickBack: 0.030, kickPitch: 0.11, kickYaw: 0.028, kickRoll: 0.045,
      adsKickMul: 0.55,
      cycleTime: 0.085,         // slide cycle
      flashScale: 0.85,
    },
  },
];
