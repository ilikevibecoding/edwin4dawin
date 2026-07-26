import * as THREE from 'three';

/**
 * Named camera poses used by the screenshot harness and the in-game photo
 * mode. Subsystems register vantage points as they build the level so the
 * critique loop can frame the same shots reproducibly.
 */
export interface Vantage {
  name: string;
  position: THREE.Vector3;
  /** Point the camera looks at. Mutually exclusive with `rotation`. */
  lookAt?: THREE.Vector3;
  rotation?: THREE.Euler;
  fov?: number;
  /** Optional description shown in tooling. */
  note?: string;
  /** Hide the weapon viewmodel for pure environment shots. */
  hideViewmodel?: boolean;
  /** Freeze time of day at this value (0..24) for the shot. */
  timeOfDay?: number;
  /** Applied to the sun azimuth for dramatic relighting in a shot. */
  sunAzimuth?: number;
  /** Called immediately before the shot, for one-off scene setup. */
  setup?: () => void;
}

const registry = new Map<string, Vantage>();

export function registerVantage(v: Vantage): void {
  registry.set(v.name, v);
}

export function registerVantages(list: Vantage[]): void {
  for (const v of list) registerVantage(v);
}

export function getVantage(name: string): Vantage | undefined {
  return registry.get(name);
}

export function listVantages(): string[] {
  return Array.from(registry.keys());
}

export function clearVantages(): void {
  registry.clear();
}
