// Headless nav laboratory: builds the collision world + navgrid in Node for fast diagnosis.
// Stubs the tiny DOM surface the map builder touches (canvas label sprites, audio).
global.window = { addEventListener() {}, __consoleErrors: [], location: { search: '' } };
global.document = {
  createElement: () => ({
    width: 0, height: 0, style: {},
    getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }),
    addEventListener() {},
  }),
  addEventListener() {},
};
global.localStorage = { getItem: () => null, setItem() {} };
global.performance = global.performance || { now: () => Date.now() };
global.ImageData = global.ImageData || class ImageData {
  constructor(w, h) { this.width = w; this.height = h; this.data = new Uint8ClampedArray(w * h * 4); }
};

const THREE = await import('three');
const { CollisionWorld } = await import('../src/core/collide.js');
const { buildMap } = await import('../src/map/builder.js');
const { NavGrid } = await import('../src/ai/navgrid.js');

const scene = new THREE.Scene();
const world = new CollisionWorld();
const map = buildMap(scene, world);
const nav = new NavGrid(world, { minX: -10, maxX: 50, minZ: -8, maxZ: 46 }).bake();
console.log('nodes:', nav.nodes.length, 'bakeMs:', nav.bakeMs.toFixed(0), 'colliders:', world.colliders.length);

function nodesIn(x0, z0, x1, z1, y0 = -1, y1 = 9) {
  return nav.nodes.filter((n) => n.x >= x0 && n.x <= x1 && n.z >= z0 && n.z <= z1 && n.y >= y0 && n.y <= y1);
}
function connected(a, b) {
  const ai = nav.nearestNode(...a), bi = nav.nearestNode(...b);
  if (ai < 0 || bi < 0) return { ai, bi, connected: false };
  const seen = new Set([ai]);
  const stack = [ai];
  let found = false;
  while (stack.length) {
    const cur = stack.pop();
    if (cur === bi) { found = true; break; }
    for (const nb of nav.nodes[cur].edges) if (!seen.has(nb)) { seen.add(nb); stack.push(nb); }
  }
  return { connected: found, regionSize: seen.size };
}
function collidersAt(min, max) {
  const out = [];
  world.query(min, max, out);
  return out.filter((c) => c.blockMove).map((c) => ({
    tag: c.tag,
    min: [+c.min.x.toFixed(2), +c.min.y.toFixed(2), +c.min.z.toFixed(2)],
    max: [+c.max.x.toFixed(2), +c.max.y.toFixed(2), +c.max.z.toFixed(2)],
  }));
}

// Flight lanes of stair-a: expected node chains
console.log('\nflight2 lane nodes (x 29.8-31.3):');
for (const n of nodesIn(29.8, 16.6, 31.3, 20.6, 1.5, 3.7).sort((a, b) => a.z - b.z || a.x - b.x)) {
  console.log(` (${n.x}, ${n.y.toFixed(2)}, ${n.z}) edges=${n.edges.length}`);
}
console.log('\nflight1 lane nodes (x 28.3-29.8):');
for (const n of nodesIn(28.3, 16.6, 29.8, 20.6, -0.1, 2.0).sort((a, b) => a.z - b.z || a.x - b.x)) {
  console.log(` (${n.x}, ${n.y.toFixed(2)}, ${n.z}) edges=${n.edges.length}`);
}
console.log('\ncolliders above flight2 @ (30.25, 18.75) y 3.1..4.55:', JSON.stringify(collidersAt({ x: 29.99, y: 3.1, z: 18.49 }, { x: 30.51, y: 4.55, z: 19.01 })));
console.log('colliders above flight1 @ (29.25, 18.75) y 1.9..3.35:', JSON.stringify(collidersAt({ x: 28.99, y: 1.9, z: 18.49 }, { x: 29.51, y: 3.35, z: 19.01 })));
console.log('\nconnectivity strip->sec:', JSON.stringify(connected([32.4, 3.6, 19.4], [24, 0, 19.5])));
console.log('connectivity landing->lobby:', JSON.stringify(connected([30, 1.8, 16], [17, 0, 28])));
console.log('connectivity platform->landing:', JSON.stringify(connected([31, 3.6, 22.5], [30, 1.8, 16])));
console.log('connectivity sec->lobby:', JSON.stringify(connected([24, 0, 19.5], [17, 0, 28])));
console.log('connectivity strip->lobby:', JSON.stringify(connected([32.4, 3.6, 19.4], [17, 0, 28])));
console.log('connectivity strip->garage:', JSON.stringify(connected([32.4, 3.6, 19.4], [7, 0, 6])));

console.log('\nnodes at sec-lobby doorway (x 23.8-25.2, z 23.2-24.8, y<1):');
for (const n of nodesIn(23.8, 23.2, 25.2, 24.8, -1, 1).sort((a, b) => a.z - b.z || a.x - b.x)) {
  console.log(` (${n.x}, ${n.y.toFixed(2)}, ${n.z}) edges=${n.edges.length}`);
}
// Full checkpoint connectivity sweep vs the garage (the extraction point)
const { CHECKPOINTS } = await import('../src/map/layout.js');
console.log('\ncheckpoint connectivity sweep (target: garage):');
let fails = 0;
for (const [name, cp] of Object.entries(CHECKPOINTS)) {
  const r = connected([cp[0], cp[1], cp[2]].slice(0, 3), [7, 0, 6]);
  if (!r.connected) { fails++; console.log(`  FAIL ${name}: ${JSON.stringify(r)} nearest=${JSON.stringify(nav.nodes[nav.nearestNode(cp[0], cp[1], cp[2])] ?? null)}`); }
}
console.log(fails === 0 ? '  all checkpoints reach the garage' : `  ${fails} checkpoint(s) disconnected`);

// BFS truth-check from janitor
{
  const ai = nav.nearestNode(11, 0, 16.5);
  console.log('\njanitor nearest node:', ai, ai >= 0 ? JSON.stringify([nav.nodes[ai].x, nav.nodes[ai].y, nav.nodes[ai].z]) : '');
  const seen = new Set([ai]);
  const stack = [ai];
  while (stack.length) {
    const cur = stack.pop();
    for (const nb of nav.nodes[cur].edges) if (!seen.has(nb)) { seen.add(nb); stack.push(nb); }
  }
  console.log('BFS region size:', seen.size);
  const inRegion = [];
  for (const idx of seen) {
    const n = nav.nodes[idx];
    if (n.x >= 9.9 && n.x <= 11.6 && n.z >= 14.0 && n.z <= 16.2) inRegion.push(`(${n.x},${n.y.toFixed(1)},${n.z})`);
  }
  console.log('region nodes near doorway:', inRegion.sort().join(' '));
  // check the two doorway nodes' indices and whether they're in the region
  for (const n of nav.nodes) {
    if (n.x === 10.75 && (n.z === 14.75 || n.z === 15.25) && n.y < 1) {
      const idx = nav.nodes.indexOf(n);
      console.log(`doorway node (10.75,${n.z}) idx=${idx} inRegion=${seen.has(idx)} edges=${JSON.stringify(n.edges)}`);
    }
  }
}

console.log('\njanitor doorway nodes (x 10..11.5, z 14..16):');
for (const n of nodesIn(10, 14, 11.5, 16, -1, 1).sort((a, b) => a.z - b.z || a.x - b.x)) {
  const targets = n.edges.map((j) => `(${nav.nodes[j].x},${nav.nodes[j].y.toFixed(1)},${nav.nodes[j].z})`).join(' ');
  console.log(` (${n.x}, ${n.y.toFixed(2)}, ${n.z}) -> ${targets}`);
}
console.log('janitor doorway colliders y0.25-1.7 @ (10.75, 15.25):', JSON.stringify(collidersAt({ x: 10.51, y: 0.25, z: 14.99 }, { x: 10.99, y: 1.7, z: 15.51 })));
console.log('janitor doorway colliders y0.25-1.7 @ (10.75, 14.75):', JSON.stringify(collidersAt({ x: 10.51, y: 0.25, z: 14.51 }, { x: 10.99, y: 1.7, z: 14.99 })));
console.log('all colliders in janitor doorway column full height:', JSON.stringify(collidersAt({ x: 10.3, y: 0, z: 14.8 }, { x: 11.2, y: 3.6, z: 15.2 })));

console.log('\nstuck-spot check (29.25, -0.02, 20.76) -> sec:', JSON.stringify(connected([29.25, -0.02, 20.76], [24, 0, 19.5])));
console.log('nodes at flight1 base (28.9..29.6, 20.3..21.1):');
for (const n of nodesIn(28.9, 20.3, 29.6, 21.1, -1, 1)) console.log(` (${n.x}, ${n.y.toFixed(2)}, ${n.z}) edges=${n.edges.length}`);
console.log('colliders under flight1 base @ (29.25, 20.76) y -0.2..0.2:', JSON.stringify(collidersAt({ x: 28.93, y: -0.2, z: 20.44 }, { x: 29.57, y: 0.2, z: 21.08 })));
