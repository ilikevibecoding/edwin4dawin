// Exterior assembly: hull skeleton + detail layers. Each layer builds into the shared exterior group
// and returns an optional per-frame update(camera, dt, t) hook.
import { buildExterior as buildHull } from "./hull.js";
import { buildGreebles } from "./greebles.js";
import { buildWeapons } from "./weapons.js";

export function buildExteriorAll(scene, materials, camera) {
  const hull = buildHull(scene, materials);
  const layers = [hull];
  for (const [name, fn] of [
    ["greebles", buildGreebles],
    ["weapons", buildWeapons],
  ]) {
    try {
      const layer = fn({ group: hull.group, materials, camera });
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
