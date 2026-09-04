// Exterior assembly: hull skeleton + detail layers. Each layer builds into the shared exterior group
// and returns an optional per-frame update(camera, dt, t) hook.
import { buildExterior as buildHull } from "./hull.js";
import { buildGreebles } from "./greebles.js";
import { buildWeapons } from "./weapons.js";
import { resolveKey } from "./hull_util.js";

export function buildExteriorAll(scene, materials, camera) {
  const hull = buildHull(scene, materials);
  const layers = [hull];
  // detail layers look materials up by the shared keys; route them to the hull's planet-shine twins so
  // ventral greebles / turrets pick up the same fill as the plating they sit on
  const shineMaterials = new Proxy(materials, { get: (t, k) => (typeof k === "string" && t[resolveKey(k)]) || t[k] });
  for (const [name, fn] of [
    ["greebles", buildGreebles],
    ["weapons", buildWeapons],
  ]) {
    try {
      const layer = fn({ group: hull.group, materials: shineMaterials, camera });
      if (layer) layers.push(layer);
    } catch (e) {
      console.error(`[exterior] ${name} layer failed:`, e);
    }
  }
  return {
    group: hull.group,
    layers,
    get triangles() {
      let n = 0;
      hull.group.traverse((o) => {
        if (o.isMesh || o.isInstancedMesh) {
          const g = o.geometry;
          const per = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
          n += per * (o.isInstancedMesh ? o.count : 1);
        }
      });
      return n;
    },
    update(camera, dt, t) {
      for (const l of layers) if (l.update) l.update(camera, dt, t);
    },
  };
}
