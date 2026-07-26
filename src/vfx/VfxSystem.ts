import * as THREE from 'three';
import type { EngineContext, Subsystem } from '../core/Engine';
import type { IVfx, SurfaceType } from '../core/Contracts';

/** STUB — replaced by the real particle/decal/explosion system. */
export class VfxSystem implements Subsystem, IVfx {
  readonly name = 'vfx';
  readonly order = 70;

  init(_ctx: EngineContext) {}
  surfaceImpact(_p: THREE.Vector3, _n: THREE.Vector3, _s: SurfaceType, _i: THREE.Vector3) {}
  bloodImpact(_p: THREE.Vector3, _n: THREE.Vector3, _i: THREE.Vector3) {}
  tracer(_from: THREE.Vector3, _to: THREE.Vector3, _speed: number, _thickness?: number) {}
  muzzleFlash(_p: THREE.Vector3, _d: THREE.Vector3, _scale: number) {}
  ejectCasing(_p: THREE.Vector3, _v: THREE.Vector3, _caliber: string) {}
  explosion(_p: THREE.Vector3, _r: number, _kind: string) {}
  smokePlume(_p: THREE.Vector3, _r: number, _d: number) {}
  dustKickup(_p: THREE.Vector3, _s: number) {}
  addFire(_p: THREE.Vector3, _r: number, _d: number) {}
}
