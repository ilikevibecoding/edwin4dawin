/**
 * Rapier bootstrap.
 *
 * `@dimforge/rapier3d-compat` inlines its WebAssembly as base64, so there is no
 * asset to fetch — but the module still has to be instantiated before any of its
 * classes can be constructed. Everything in this folder goes through
 * `initRapier()` so the WASM instance is created exactly once no matter how many
 * callers race for it.
 */
import RAPIER from '@dimforge/rapier3d-compat';

let pending: Promise<void> | null = null;
let initialised = false;

export function isRapierReady(): boolean {
  return initialised;
}

export function initRapier(): Promise<void> {
  if (!pending) pending = load();
  return pending;
}

async function load(): Promise<void> {
  const warn = console.warn;
  // rapier3d-compat 0.19.3 still calls its wasm-bindgen entry point with the
  // pre-1.0 positional signature, which logs a deprecation notice we cannot
  // influence from here. Swallow that one line so the boot console stays clean.
  console.warn = (...args: unknown[]): void => {
    const first = args[0];
    if (typeof first === 'string' && first.includes('deprecated parameters for the initialization')) {
      return;
    }
    warn.apply(console, args as []);
  };
  try {
    await RAPIER.init();
    initialised = true;
  } finally {
    console.warn = warn;
  }
}

export { RAPIER };
export const rapierVersion = (): string => RAPIER.version();
