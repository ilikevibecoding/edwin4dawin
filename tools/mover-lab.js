global.window = { addEventListener() {}, __consoleErrors: [], location: { search: '' } };
global.document = {
  createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }), addEventListener() {} }),
  addEventListener() {},
};
global.localStorage = { getItem: () => null, setItem() {} };
const THREE = await import('three');
const { CollisionWorld, moveCharacter } = await import('../src/core/collide.js');
const { buildMap } = await import('../src/map/builder.js');
const scene = new THREE.Scene();
const world = new CollisionWorld();
buildMap(scene, world);

const RADIUS = 0.32, HEIGHT = 1.72;
let pos = { x: 32.221, y: 3.6, z: 20.7798 };
console.log('start', pos);
for (let i = 0; i < 6; i++) {
  const wp = { x: 30.75, z: 20.75 };
  const dir = new THREE.Vector3(wp.x - pos.x, 0, wp.z - pos.z).normalize();
  const dt = 1 / 120, speed = 3.4;
  const step = moveCharacter(world, pos, RADIUS, HEIGHT,
    { x: dir.x * speed * dt, y: -9 * dt, z: dir.z * speed * dt },
    { stepHeight: 0.4, filter: (c) => c.tag !== 'enemy', trace: true });
  console.log(`frame ${i}: from (${pos.x.toFixed(4)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(4)}) delta (${(dir.x*speed*dt).toFixed(4)}, ${(dir.z*speed*dt).toFixed(4)}) -> (${step.pos.x.toFixed(4)}, ${step.pos.y.toFixed(3)}, ${step.pos.z.toFixed(4)}) clamps=${JSON.stringify(step.clamps)}`);
  pos = { x: step.pos.x, y: step.pos.y, z: step.pos.z };
}

console.log('\n--- variations from (32.1927, 3.6, 20.7804) ---');
const base = { x: 32.1927, y: 3.6, z: 20.7804 };
for (const [name, delta] of [
  ['x only', { x: -0.0283, y: 0, z: 0 }],
  ['x+y', { x: -0.0283, y: -0.075, z: 0 }],
  ['x+z', { x: -0.0283, y: 0, z: -0.0006 }],
  ['y only', { x: 0, y: -0.075, z: 0 }],
  ['z only', { x: 0, y: 0, z: -0.0006 }],
  ['bigger x', { x: -0.3, y: -0.075, z: 0 }],
]) {
  const r = moveCharacter(world, base, RADIUS, HEIGHT, delta, { stepHeight: 0.4, filter: (c) => c.tag !== 'enemy', trace: true });
  console.log(`${name}: -> (${r.pos.x.toFixed(4)}, ${r.pos.y.toFixed(3)}, ${r.pos.z.toFixed(4)}) onGround=${r.onGround} hitWall=${r.hitWall} clamps=${JSON.stringify(r.clamps)}`);
}
const out = [];
world.query({ x: 31.5, y: 3.4, z: 20.2 }, { x: 32.6, y: 5.4, z: 21.2 }, out);
console.log('\ncolliders in region:', out.filter((c) => c.blockMove).map((c) => `${c.tag}[(${c.min.x.toFixed(2)},${c.min.y.toFixed(2)},${c.min.z.toFixed(2)})-(${c.max.x.toFixed(2)},${c.max.y.toFixed(2)},${c.max.z.toFixed(2)})]`).join('\n  '));
