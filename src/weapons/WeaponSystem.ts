import type * as THREE from 'three';
import type { EngineContext, Subsystem } from '../core/Engine';
import type { IWeapons, WeaponId, WeaponSpec } from '../core/Contracts';

const PLACEHOLDER: WeaponSpec = {
  id: 'ar_wolverine',
  displayName: 'WOLVERINE',
  className: 'ASSAULT RIFLE',
  fireMode: 'auto',
  rpm: 700,
  magSize: 30,
  reserveAmmo: 180,
  damage: 34,
  damageRangeStart: 28,
  damageRangeEnd: 60,
  damageFalloff: 0.6,
  headshotMultiplier: 2.1,
  muzzleVelocity: 880,
  pelletsPerShot: 1,
  spreadHip: 2.6,
  spreadAds: 0.22,
  spreadMoving: 1.4,
  recoilVertical: 0.42,
  recoilHorizontal: 0.16,
  recoilRecovery: 8,
  adsTime: 0.22,
  reloadTime: 1.9,
  reloadEmptyTime: 2.5,
  drawTime: 0.55,
  adsFovScale: 0.72,
  scoped: false,
  fireSound: 'weapon_assault_rifle',
  penetration: 0.4,
  caliber: 'rifle',
};

/** STUB — replaced by the real weapon system and viewmodel. */
export class WeaponSystem implements Subsystem, IWeapons {
  readonly name = 'weapons';
  readonly order = 50;

  current: WeaponSpec = PLACEHOLDER;
  magAmmo = PLACEHOLDER.magSize;
  reserveAmmo = PLACEHOLDER.reserveAmmo;
  reloading = false;
  adsAmount = 0;

  init(_ctx: EngineContext) {}
  getMuzzleWorld(outPos: THREE.Vector3, outDir: THREE.Vector3) {
    outPos.set(0, 0, 0);
    outDir.set(0, 0, -1);
  }
  switchTo(_id: WeaponId) {}
  giveAmmo(rounds: number) {
    this.reserveAmmo += rounds;
  }
  setEnabled(_enabled: boolean) {}
}
