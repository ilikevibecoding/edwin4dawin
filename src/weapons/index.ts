/** PLACEHOLDER — replaced by the full weapon + viewmodel implementation. */
import * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { ORDER } from '../core/System';
import type { WeaponDefinition, WeaponSystem } from '../core/Contracts';

export class WeaponSystemImpl implements WeaponSystem, System {
  readonly name = 'weapons' as const;
  readonly order = ORDER.WEAPONS;
  readonly dependencies = ['player', 'combat'] as const;

  current: WeaponDefinition | null = null;
  ammoInMag = 30;
  reserveAmmo = 210;
  isAiming = false;
  adsAmount = 0;
  isReloading = false;
  isFiring = false;
  currentSpread = 0.01;
  readonly loadout: readonly string[] = [];

  init(_ctx: EngineContext): void {}
  getMuzzlePosition(out: THREE.Vector3): THREE.Vector3 {
    return out.set(0, 0, 0);
  }
  equip(): void {}
  giveAmmo(): void {}
  forceReload(): void {}
  setInputEnabled(): void {}
  dispose(): void {}
}
