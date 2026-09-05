// Exterior assembly: hull + surface details + superstructure + engines, the exterior lighting rig
// (sun with shadows, planet fill), distance-based LOD per hull chunk and for the fine-detail groups,
// and the named exterior camera stations used by the camera director and the screenshot harness.
import * as THREE from "three";
import { buildHull } from "./hull.js";
import { buildDetails } from "./details.js";
import { buildSuperstructure } from "./superstructure.js";
import { buildEngines } from "./engines.js";
import { TOWER, HANGAR, HULL, ENGINES } from "./dims.js";

// lod 0 (fine detail: greebles, hatches, pipes, lights) / lod 1 (plates, grooves) / lod 2 (the far
// skin that stands in for the plates) / lod 3 (coarse landmarks: cluster blocks, galleries, soot
// fans) per hull chunk; `fine` toggles the superstructure / engine / detail fine groups by distance
// to their centre. Fine greebles go at 1100 m: beyond that they only stipple the plating into a sandy
// texture, while the landmarks stay to 1800 m so the clusters still read as knots at the medium
// station; the plates go at 2000 m for the same reason (the far station sits 2.2–3.3 km from the
// chunks and sees the smooth patchwork skin instead).
export const LOD_DISTANCES = { greebles: 1100, landmarks: 1800, plates: 2000, fine: 2000 };

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
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.1);
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
  // the ship and the sun never move: render the sun's shadow map once (and again only when the LOD
  // set or the visible side changes) instead of re-rendering the whole exterior into it every frame
  sun.shadow.autoUpdate = false;
  sun.shadow.needsUpdate = true;
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
    exterior_far: { pos: [-1750, 680, -1950], look: [0, 60, 0] },
    exterior_medium: { pos: [-1100, 520, 300], look: [0, 60, 200] },
    // front: 40 % closer than the old [220, 190, -1550] on the same ray (the ship filled ~15 % of the
    // frame); the look point sits forward of midships so the bow tip 130 m ahead stays in frame
    exterior_front: { pos: [132, 130, -930], look: [0, 20, -250] },
    exterior_close: { pos: [-420, 260, 560], look: [-80, 120, 520] },
    exterior_tower: { pos: [-260, 240, 330], look: [0, 185, 620] },
    exterior_bridge: { pos: [40, 196, 470], look: [0, 184, 592] },
    exterior_hangar: { pos: [-110, -200, -90], look: [0, -46, 0] },
    // launch: 135 m off the mouth on the exit vector, looking back up into the lit bay
    exterior_launch: { pos: [-70, -150, 70], look: [0, -60, -5] },
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
  const lastCam = new THREE.Vector3(0, 0, -1e4);
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
    /**
     * Distance LOD per hull chunk and fine-detail group. `scale` < 1 tightens every threshold — used
     * while the hull is only seen through a room's windows, where the room itself is the priority.
     */
    updateLOD(cameraPos, scale = 1) {
      lastCam.copy(cameraPos);
      let changed = false;
      const set = (o, v) => {
        if (o.visible !== v) {
          o.visible = v;
          changed = true;
        }
      };
      for (const cg of chunkGroups) {
        tmp.set(0, 0, cg.userData.centerZ);
        const d = tmp.distanceTo(cameraPos);
        const plates = d < LOD_DISTANCES.plates * scale;
        for (const child of cg.children) {
          if (child.userData.lod === 0) set(child, d < LOD_DISTANCES.greebles * scale);
          else if (child.userData.lod === 1) set(child, plates);
          else if (child.userData.lod === 2) set(child, !plates);
          else if (child.userData.lod === 3) set(child, d < LOD_DISTANCES.landmarks * scale);
        }
      }
      for (const f of fineGroups) set(f.group, f.center.distanceTo(cameraPos) < LOD_DISTANCES.fine * scale);
      if (changed) sun.shadow.needsUpdate = true;
    },
    update(dt, t) {
      eng.update(t, lastCam);
      // mast-tip anti-collision beacon: slow blink, ~2 s period. A raised-cosine pulse between 0.35
      // and 1.0 rather than on/off, so the beacon is never dark in a still frame
      if (materials.ext_navBeacon) materials.ext_navBeacon.opacity = 0.35 + 0.65 * (0.5 + 0.5 * Math.cos((t * Math.PI * 2) / 2.1));
    },
    setVisible(v) {
      group.visible = v;
    },
    /**
     * Which side of the ship a room can see. "ventral" (the hangar bay looks down through its opening)
     * hides the superstructure, engines and dorsal detail groups; "all" restores them.
     */
    setViewSide(side) {
      if (api.viewSide === side) return;
      const dorsal = side !== "ventral";
      sup.group.visible = dorsal;
      eng.group.visible = dorsal;
      det.group.visible = dorsal;
      api.viewSide = side;
      sun.shadow.needsUpdate = true;
    },
    /**
     * "interior": the hull is seen through windows while the player stands in a room — the flat fills
     * are cut so they do not wash the room out (the sun stays: the hull's own geometry shadows the rooms).
     */
    setViewMode(mode) {
      const inside = mode === "interior";
      fill.intensity = inside ? 0.12 : 0.55;
      hemi.intensity = inside ? 0.08 : 0.35;
      // from a room the sunlit faces of the city ahead are seen head-on; a little less sun keeps that
      // skyline grey through the bridge / observation glass
      sun.intensity = inside ? 1.6 : 2.1;
      // the superstructure's lit windows are a scale cue from outside; from the bridge / observation
      // gallery they are 30-100 m away and read as a city, so inside they drop to sparse dim panes
      for (const m of [materials.city, materials.cityDense]) if (m) m.emissiveIntensity = inside ? 0.25 : 1.0;
      if (materials.ext_window) materials.ext_window.emissiveIntensity = inside ? 0.3 : 0.85;
    },
    dims: { TOWER, HANGAR, HULL, ENGINES },
  };
  return api;
}
