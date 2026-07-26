// Prop system entry (Fable 3 domain). The mission calls placeProps() once during build, after
// the map exists and BEFORE the navgrid bakes (props with blockMove colliders shape navigation).
import { worldUVs } from '../materials/uvtools.js';
import { registerLibrary } from './library.js';
import { placeAll } from './placement.js';

// Materials with userData.tileM expect world-scale UVs. The map builder emits plain box
// geometry (0..1 UVs per face), so we retrofit planar world projection onto every static,
// axis-aligned map mesh here. Door/shutter subtrees are skipped (they move).
function retrofitWorldUVs(map) {
  const movingRoots = new Set();
  for (const d of map.doors || []) if (d.group) movingRoots.add(d.group);
  map.group.updateMatrixWorld(true);
  map.group.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const tileM = mesh.material?.userData?.tileM;
    if (!tileM) return;
    const g = mesh.geometry;
    if (!g?.attributes?.position || !g.attributes.normal || !g.attributes.uv) return;
    if (g.userData.worldUVsApplied) return;
    // skip meshes under a moving root (doors/shutters)
    for (let p = mesh.parent; p; p = p.parent) if (movingRoots.has(p)) return;
    // pure translation only (walls/slabs/stairs are axis-aligned)
    const e = mesh.matrixWorld.elements;
    if (Math.abs(e[0] - 1) > 1e-4 || Math.abs(e[5] - 1) > 1e-4 || Math.abs(e[10] - 1) > 1e-4 ||
        Math.abs(e[1]) > 1e-4 || Math.abs(e[2]) > 1e-4 || Math.abs(e[4]) > 1e-4 ||
        Math.abs(e[6]) > 1e-4 || Math.abs(e[8]) > 1e-4 || Math.abs(e[9]) > 1e-4) return;
    worldUVs(g, tileM, { x: e[12], y: e[13], z: e[14] });
    g.userData.worldUVsApplied = true;
  });
}

export function placeProps(scene, world, map) {
  retrofitWorldUVs(map);
  registerLibrary();
  return placeAll(scene, world);
}
