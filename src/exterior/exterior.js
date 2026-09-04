// Exterior assembly: hull + surface details + superstructure + engines, the exterior lighting rig
// (sun with shadows, planet fill), distance-based LOD per hull chunk and for the fine-detail groups,
// and the named exterior camera stations used by the camera director and the screenshot harness.
import * as THREE from "three";
import { buildHull } from "./hull.js";
import { buildDetails } from "./details.js";
import { buildSuperstructure } from "./superstructure.js";
import { buildEngines } from "./engines.js";
import { TOWER, HANGAR, HULL, ENGINES } from "./dims.js";

// lod 0 (fine detail: greebles, hatches, pipes, lights) / lod 1 (plates, grooves) per hull chunk;
// `fine` toggles the superstructure / engine / detail fine groups by distance to their centre.
export const LOD_DISTANCES = { greebles: 1500, plates: 4200, fine: 2000 };

export function buildExterior(scene, materials) {
  const group = new THREE.Group();
  group.name = "exterior";
  scene.add(group);

  const hull = buildHull(materials);
  group.add(hull.group);
  const sup = buildSuperstructure(materials);
  group.add(sup.group);
  const det = buildDetails(materials, hull, sup);
  group.add(det.group);
  const eng = buildEngines(materials);
  group.add(eng.group);
  hull.stats.greebles = det.stats.greebles + sup.stats.greebles + (eng.stats ? eng.stats.greebles : 0);
  hull.stats.plates += sup.stats.tierPlates;

  // --- lighting rig (exterior only; toggled with the group)
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.8);
  sun.position.set(-900, 1300, 1400);
  sun.target.position.set(0, 40, 200);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 200;
  sun.shadow.camera.far = 4200;
  sun.shadow.camera.left = -900;
  sun.shadow.camera.right = 900;
  sun.shadow.camera.top = 900;
  sun.shadow.camera.bottom = -900;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 1.5;
  group.add(sun);
  group.add(sun.target);
  // cool fill from the planet / nebula side, no shadows
  const fill = new THREE.DirectionalLight(0x5f7fb8, 0.55);
  fill.position.set(1200, -600, -800);
  group.add(fill);
  group.add(fill.target);
  const hemi = new THREE.HemisphereLight(0x33405c, 0x0a0c12, 0.35);
  group.add(hemi);

  // --- camera stations (position, look-at) for the director / harness
  const stations = {
    exterior_far: { pos: [-2400, 900, -2600], look: [0, 60, 0] },
    exterior_medium: { pos: [-1100, 520, 300], look: [0, 60, 200] },
    exterior_front: { pos: [300, 260, -2300], look: [0, 40, 0] },
    exterior_close: { pos: [-420, 260, 560], look: [-80, 120, 520] },
    exterior_tower: { pos: [-260, 240, 330], look: [0, 185, 620] },
    exterior_bridge: { pos: [40, 196, 470], look: [0, 184, 592] },
    exterior_hangar: { pos: [-140, -260, -160], look: [0, -40, 0] },
    exterior_engines: { pos: [420, 120, 1300], look: [0, 10, 780] },
    exterior_plating: { pos: [-260, 92, -120], look: [-120, 40, -300] },
    exterior_trench: { pos: [-520, 4, 120], look: [-380, 0, 300] },
    exterior_bow: { pos: [-150, 75, -890], look: [0, 18, -690] },
    exterior_stern: { pos: [-380, 140, 960], look: [-60, 20, 760] },
    exterior_dorsal: { pos: [-700, 420, -300], look: [0, 60, 300] },
    exterior_dock: { pos: [-340, 14, 50], look: [-262, 0, 112] },
  };

  const chunkGroups = hull.chunkGroups;
  const fineGroups = [
    { group: sup.lod0, center: new THREE.Vector3(0, 150, 600) },
    { group: det.lod0, center: new THREE.Vector3(0, 40, 200) },
    { group: eng.lod0, center: new THREE.Vector3(0, 10, 780) },
  ].filter((f) => f.group);
  const tmp = new THREE.Vector3();
  const api = {
    group,
    hull,
    details: det,
    superstructure: sup,
    engines: eng,
    sun,
    stations,
    stats: hull.stats,
    /** Distance-based LOD: toggles per-chunk plates / greebles and the fine-detail groups. */
    updateLOD(cameraPos) {
      for (const cg of chunkGroups) {
        tmp.set(0, 0, cg.userData.centerZ);
        const d = tmp.distanceTo(cameraPos);
        for (const child of cg.children) {
          if (child.userData.lod === 0) child.visible = d < LOD_DISTANCES.greebles;
          else if (child.userData.lod === 1) child.visible = d < LOD_DISTANCES.plates;
        }
      }
      for (const f of fineGroups) f.group.visible = f.center.distanceTo(cameraPos) < LOD_DISTANCES.fine;
    },
    update(dt, t) {
      eng.update(t);
    },
    setVisible(v) {
      group.visible = v;
    },
    dims: { TOWER, HANGAR, HULL, ENGINES },
  };
  return api;
}
