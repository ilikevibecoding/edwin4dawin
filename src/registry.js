/**
 * Every buildable model registers here so the asset lab can render it in
 * isolation (npm run shot -- --m=<id>) without booting the whole film.
 */
export const models = new Map();

/**
 * @param {string} id
 * @param {(opts?:object)=>Promise<THREE.Object3D>|THREE.Object3D} factory
 * @param {{scale?:number, view?:[number,number,number], notes?:string}} [meta]
 */
export function register(id, factory, meta = {}) {
  if (models.has(id)) console.warn(`[registry] duplicate model id: ${id}`);
  models.set(id, { id, factory, meta });
}

export async function make(id, opts) {
  const entry = models.get(id);
  if (!entry) throw new Error(`Unknown model "${id}". Known: ${[...models.keys()].join(', ')}`);
  return entry.factory(opts);
}

export function listModels() { return [...models.keys()].sort(); }
