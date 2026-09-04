// Exterior hull entry point. Assembles the Imperial-class exterior from the sibling modules:
//   plating.js   analytic dorsal / ventral seam floor, layered bevelled armour plates, trench walls, stern face
//   greebles.js  instanced greeble library + plate / seam / wall dressing
//   trench.js    the side trench (conduits, equipment, struts, hangar mouths, docking rings)
//   city.js      terraced superstructure, shoulders, the roof-top "city"
//   tower.js     neck blocks, bridge block with open glazing slots, globes, comms mast
//   engines.js   engine bells with glow shader, stern machinery
//   weapons.js   heavy octuple turbolasers, medium turrets, point-defence, tractor beams, sensor domes
//   belly.js     belly plate, bay wells + containment fields, reactor bulb, docking ports
//   lights.js    instanced blinking running lights
// Everything static is merged per material (base kit); repeated parts are instanced in three LOD tiers
// (base: always, mid: < 1500 m, near: < 400 m) whose z-chunks toggle from the camera position each frame.
import * as THREE from "three";
import { SYSTEMS } from "../core/systems.js";
import { tOf } from "../core/layout.js";
import { rng, ExtKit, Tier, LodSets, LOD_NEAR, LOD_MID, makeExteriorMaterials, syncSharedMaterials } from "./common.js";
import { PROTOS, dressPlates } from "./greebles.js";
import { buildBaseSurfaces, buildDorsalPlates, buildVentralPlates, buildTrenchWalls, buildSternFace } from "./plating.js";
import { buildTrench } from "./trench.js";
import { buildCity } from "./city.js";
import { buildTower } from "./tower.js";
import { buildEngines, updateEngines } from "./engines.js";
import { WEAPON_PROTOS, buildWeapons } from "./weapons.js";
import { buildBelly } from "./belly.js";
import { buildRunLights } from "./lights.js";

const _cam = new THREE.Vector3();

export function buildExterior(scene, materials) {
  const t0 = performance.now();
  const M = makeExteriorMaterials(materials);
  const group = new THREE.Group();
  group.name = "exterior";
  scene.add(group);

  const rand = rng(77);
  const kit = new ExtKit(M);
  const DEFS = { ...PROTOS, ...WEAPON_PROTOS };
  const tiers = {
    base: new Tier(M, DEFS, { chunks: 1, name: "base" }),
    mid: new Tier(M, DEFS, { chunks: 5, name: "mid" }),
    near: new Tier(M, DEFS, { chunks: 9, name: "near" }),
  };

  const plates = [];
  buildBaseSurfaces(kit);
  buildDorsalPlates(kit, rand, plates, tiers);
  buildVentralPlates(kit, rand, plates);
  buildTrenchWalls(kit);
  buildSternFace(kit);
  buildCity(kit, tiers, rand);
  buildTower(kit, tiers, rand);
  buildEngines(kit, tiers, rand);
  buildWeapons(kit, tiers, rand);
  const { fields } = buildBelly(kit, tiers, rand, M);
  buildTrench(kit, tiers, rand);
  dressPlates(tiers, rand, plates);
  const runLights = buildRunLights(group, M, rand);
  for (const f of fields) group.add(f);

  // merge + instance. Big merged pieces cast the sun shadow; instanced greebles never do.
  const meshes = kit.build(group);
  for (const m of meshes) if (m.isInstancedMesh) m.castShadow = false;
  const lod = new LodSets();
  let triangles = kit.triangles;
  triangles += tiers.base.build(group, lod, Infinity);
  triangles += tiers.mid.build(group, lod, LOD_MID);
  triangles += tiers.near.build(group, lod, LOD_NEAR);
  for (const t of Object.values(tiers)) for (const k of t.kits) meshes.push(...k.meshes);
  const buildMs = performance.now() - t0;

  // start with the far configuration until the first camera update
  lod.update(_cam.set(0, 4000, 8000));

  function update(dt, t) {
    syncSharedMaterials(M);
    updateEngines(M, t);
    M.runLight.uniforms.time.value = t;
    if (materials.field && materials.field.uniforms && materials.field.uniforms.time) materials.field.uniforms.time.value = t;
    const cam = SYSTEMS.camera;
    if (cam) {
      cam.getWorldPosition(_cam);
      lod.update(_cam);
    }
  }

  const stats = () => ({ buildMs: +buildMs.toFixed(0), plates: plates.length, lodSets: lod.sets.length, nearVisible: lod.stats.near, midVisible: lod.stats.mid, meshes: meshes.length });

  return { group, meshes, update, fields, runLights, triangles, materials: M, lod, stats };
}

export { tOf };
