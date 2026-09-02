import * as THREE from 'three';
import { GROUP, groups } from '../core/Physics.js';
import { PLAZA, GARDEN, STREETS } from './layout.js';

/**
 * Grid nav graph validated against the physics world:
 *  - a node exists where a downward ray finds walkable ground (y ≤ 0.5, not water) and a 1 m-high,
 *    0.7 m radius clearance check finds no obstacle;
 *  - an edge exists between neighbouring nodes (8-connectivity, ≤ 6 m) when rays at 1.0 m and 0.35 m
 *    above ground travel A→B unobstructed;
 *  - `cover` marks nodes with a blocking surface within 1.9 m at chest height (walls, planters, crates).
 */
export function buildNavGraph(game, { step = 4 } = {}) {
  const physics = game.physics;
  const filter = groups(GROUP.ALL, GROUP.WORLD);
  const rects = [
    [PLAZA.x0 + 1, PLAZA.z0 + 1, GARDEN.x1 - 1, PLAZA.z1 - 1],
    ...STREETS.map((s) => (s.axis === 'z' ? [s.x0 + 0.6, s.z0 < 0 ? s.z0 + 3 : s.z0, s.x1 - 0.6, s.z1 > 0 ? s.z1 - 3 : s.z1] : [s.x0 < 0 ? s.x0 + 3 : s.x0, s.z0 + 0.6, s.x1 > 0 ? s.x1 - 3 : s.x1, s.z1 - 0.6])),
  ];
  const inside = (x, z) => rects.some(([x0, z0, x1, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1);

  const x0 = -40;
  const z0 = -48;
  const nx = Math.ceil((58 - x0) / step) + 1;
  const nz = Math.ceil((50 - z0) / step) + 1;
  const grid = new Map();
  const nodes = [];
  const down = new THREE.Vector3(0, -1, 0);
  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const dirs8 = [];
  for (let k = 0; k < 8; k++) dirs8.push(new THREE.Vector3(Math.cos((k * Math.PI) / 4), 0, Math.sin((k * Math.PI) / 4)));

  const cast = (o, d, maxD) => physics.raycast(o, d, maxD, { filter });

  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const x = x0 + i * step;
      const z = z0 + j * step;
      if (!inside(x, z)) continue;
      const hit = cast(origin.set(x, 8, z), down, 20);
      if (!hit || hit.point.y > 0.5 || hit.data?.surface === 'water' || hit.data?.boundary) continue;
      const y = hit.point.y;
      let blocked = false;
      let cover = false;
      for (const d of dirs8) {
        if (cast(origin.set(x, y + 1.0, z), d, 0.7) || cast(origin.set(x, y + 0.4, z), d, 0.6)) {
          blocked = true;
          break;
        }
        const c = cast(origin.set(x, y + 0.9, z), d, 1.9);
        if (c && !c.data?.boundary) cover = true;
      }
      if (blocked) continue;
      const node = { id: nodes.length, position: new THREE.Vector3(x, y, z), cover, gi: i, gj: j };
      nodes.push(node);
      grid.set(`${i},${j}`, node);
    }
  }

  const edges = [];
  const offsets = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];
  for (const a of nodes) {
    for (const [di, dj] of offsets) {
      const b = grid.get(`${a.gi + di},${a.gj + dj}`);
      if (!b) continue;
      if (Math.abs(a.position.y - b.position.y) > 0.5) continue;
      dir.subVectors(b.position, a.position);
      const dist = dir.length();
      dir.normalize();
      let clear = true;
      for (const h of [1.0, 0.35]) {
        const hit = cast(origin.set(a.position.x, a.position.y + h, a.position.z), dir, dist - 0.25);
        if (hit) {
          clear = false;
          break;
        }
      }
      if (clear) edges.push([a.id, b.id]);
    }
  }
  for (const n of nodes) {
    delete n.gi;
    delete n.gj;
  }
  return { nodes, edges };
}
