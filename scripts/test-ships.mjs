// Ship quality rubric (docs/rubrics/09_ships.md) - the mechanical points per model, a N/20 scorecard, the fleet census
// and the port cycle, all offline:   node scripts/test-ships.mjs
// With --cdp <url> it also runs the browser checks against a dev server (hum spectrum, boarding ride, census):
//   node scripts/test-ships.mjs --cdp http://localhost:5222/
import assert from 'node:assert/strict';
import { initBlocks, BLOCKS, B, SHAPE } from '../src/blocks.js';
import { shipModels, buildShipGeometry, modelLight, shipMaterial, MAX_PARTS } from '../src/ships/models.js';
import { EMIT, CH, emitCodeOf, SEAT, CONSOLE } from '../src/ships/builder.js';
import { SPACEPORT, DECK_Y, FRONTIER, FRONTIER_DECK_Y } from '../src/coruscant/spaceport.js';
import { getLayout } from '../src/coruscant/layout.js';
// the fleet modules are loaded as namespaces so the model scorecard runs even while the fleet API is incomplete
const T = await import('../src/ships/traffic.js');
const { buildShips, routePose, shipState, ShipTraffic, HIDE_DIST, lanePathClear, PORT_PHASES, padStateAt } = T;
const { ShipVehicle } = await import('../src/vehicles/ship.js').catch(() => ({ ShipVehicle: null }));

initBlocks();
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.log(`FAIL ${name}\n   ${e.stack || e.message}`); }
}
const args = process.argv.slice(2);
const cdpUrl = args.includes('--cdp') ? args[args.indexOf('--cdp') + 1] : null;
const dumpName = args.includes('--dump') ? args[args.indexOf('--dump') + 1] : null;   // --dump <model>: layer maps + reach

// ASCII layer maps of a model's landed grid (x across, z down, nose at the top) with the standing cells the walk
// reached from the pad marked '*' (feet layer). Handy when a door or ramp check fails.
function dumpModel(m, reach) {
  const g = m.grid, reached = new Set(reach.map(([x, z, h]) => `${x},${z},${feetCell(h)}`));
  const ch = (id) => { if (!id) return '.'; if (id === SEAT || id === B.BED_HEAD) return 'S'; if (id === CONSOLE) return 'C'; if (id === B.STEEL_GLASS) return 'G'; const d = BLOCKS[id]; if (d.emit > 0) return 'L'; if (topOf(id) !== null && topOf(id) < 1) return '_'; return d.solid ? '#' : '~'; };
  for (let y = 0; y < g.h; y++) {
    console.log(`-- ${m.name} layer y=${y} (feet on this layer marked *)`);
    for (let z = 0; z < g.d; z++) {
      let row = '';
      for (let x = 0; x < g.w; x++) row += reached.has(`${x},${z},${y}`) ? '*' : ch(g.get(x, y, z));
      console.log(`${String(z).padStart(3)} ${row}`);
    }
  }
}

const solid = (id) => id > 0 && BLOCKS[id].solid;
const topOf = (id) => { const d = BLOCKS[id]; if (!d.solid) return null; if (d.shape === SHAPE.SLAB) return 0.5; if (d.boxes && d.boxes.length === 1 && d.boxes[0][4] < 1) return d.boxes[0][4]; return 1; };
const GREEBLE = new Set([B.VENT, B.CHROME, B.HULL_TRENCH, B.PANEL_STRIPE, B.CITY_LAMP, B.GLOW_PANEL, B.GLOW_PANEL_BLUE, B.HOLO_SIGN, B.NEON_GREEN, B.CONSOLE, B.STEEL_GLASS, B.WINDOW_LIT]);
const BANNED = /wool|plank|log|dirt|sand|grass|leaves|hay|cactus|wheat|cobble/i;

// ---------------------------------------------------------------- walkability on a model grid (landed pose, doors open)
// feet positions (x, z, h): standing on a solid top with the player's 1.8 box free above it; outside the hull the pad is
// the floor at h = 0.
function standHeights(g, x, z) {
  const out = [];
  if (!solid(g.get(x, 0, z)) && !solid(g.get(x, 1, z))) out.push(0);
  for (let y = 0; y < g.h; y++) {
    const id = g.get(x, y, z), t = topOf(id);
    if (t === null) continue;
    const h = y + t;
    let free = true;
    for (let yy = y + 1; yy <= Math.floor(h + 1.8 - 1e-6); yy++) if (solid(g.get(x, yy, z))) { free = false; break; }
    if (free) out.push(h);
  }
  return out;
}
function walk(g, start, step, limit = { x0: -1, x1: g.w + 1, z0: -1, z1: g.d + 1 }) {
  const seen = new Map(), q = [start];
  const sk = (x, z, h) => `${x},${z},${h}`;
  seen.set(sk(...start), start);
  while (q.length) {
    const [x, z, h] = q.shift();
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz;
      if (nx < limit.x0 || nx > limit.x1 || nz < limit.z0 || nz > limit.z1) continue;
      for (const nh of standHeights(g, nx, nz)) {
        if (nh - h > step + 1e-9 || h - nh > 3) continue;
        const k = sk(nx, nz, nh);
        if (!seen.has(k)) { seen.set(k, [nx, nz, nh]); q.push([nx, nz, nh]); }
      }
    }
  }
  return [...seen.values()];
}
const feetCell = (h) => Math.floor(h + 1e-6);      // grid y of the cell the feet are in (h integer -> that layer)

// outside-air mask of a grid: air reachable from the boundary
function outsideMask(g) {
  const { w, h, d } = g, mask = new Uint8Array(w * h * d), idx = (x, y, z) => (x * d + z) * h + y;
  const q = [];
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) for (let z = 0; z < d; z++) if ((x === 0 || y === 0 || z === 0 || x === w - 1 || y === h - 1 || z === d - 1) && g.get(x, y, z) === 0) { mask[idx(x, y, z)] = 1; q.push([x, y, z]); }
  while (q.length) {
    const [x, y, z] = q.pop();
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const nx = x + dx, ny = y + dy, nz = z + dz;
      if (nx < 0 || ny < 0 || nz < 0 || nx >= w || ny >= h || nz >= d) continue;
      const i = idx(nx, ny, nz);
      if (mask[i] || g.get(nx, ny, nz) !== 0) continue;
      mask[i] = 1; q.push([nx, ny, nz]);
    }
  }
  return { mask, idx, outside: (x, y, z) => (x < 0 || y < 0 || z < 0 || x >= w || y >= h || z >= d) ? 1 : mask[idx(x, y, z)] };
}

// ---------------------------------------------------------------- the 20 points
function grade(m) {
  const pts = [], notes = [];
  const pt = (n, ok, label, kind = 'auto') => { pts.push({ n, ok: !!ok, label, kind }); if (!ok) notes.push(`${n} ${label}`); };
  const g = m.grid, gf = m.gridFlight;
  const step = m.compact ? 1.0 : 0.6;
  // 1 scale
  const lenOk = m.compact ? m.d >= 10 && m.d <= 40 : m.d >= 14 && m.d <= 40;
  pt(1, lenOk && m.w <= m.d * 1.3 && m.h <= m.d, `scale ${m.w}x${m.h}x${m.d}`);
  pt(2, true, 'silhouette (critic)', 'critic');
  // 3 symmetry (flight pose: doors closed, ramps up)
  let mis = 0, tot = 0;
  for (let x = 0; x < m.w; x++) for (let y = 0; y < m.h; y++) for (let z = 0; z < m.d; z++) { const a = gf.get(x, y, z), b = gf.get(m.w - 1 - x, y, z); if (a || b) { tot++; if ((a === 0) !== (b === 0)) mis++; } }
  pt(3, m.asym || mis / tot <= 0.04, `symmetry mismatch ${(100 * mis / tot).toFixed(1)}%${m.asym ? ' (deliberately asymmetric)' : ''}`);
  // exterior cells (flight grid)
  const out = outsideMask(gf);
  const ext = [], extIds = new Map(), faces = [];
  for (let x = 0; x < m.w; x++) for (let y = 0; y < m.h; y++) for (let z = 0; z < m.d; z++) {
    const id = gf.get(x, y, z);
    if (!id) continue;
    let exposed = 0;
    const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    for (let f = 0; f < 6; f++) { const [dx, dy, dz] = dirs[f]; if (out.outside(x + dx, y + dy, z + dz)) { exposed++; faces.push([f, x, y, z, id]); } }
    if (exposed) { ext.push([x, y, z, id, exposed]); extIds.set(id, (extIds.get(id) || 0) + 1); }
  }
  const seamZ = new Set();
  for (const [x, y, z, id] of ext) if (id === m.seam) seamZ.add(z);
  let maxGap = 0, prev = null;
  for (let z = 2; z < m.d - 2; z++) if (seamZ.has(z)) { if (prev !== null) maxGap = Math.max(maxGap, z - prev); prev = z; }
  pt(4, extIds.size >= 5 && maxGap <= 5 && seamZ.size >= 3, `exterior types ${extIds.size}, seam gap ${maxGap}`);
  // 5 engines
  let engines = 0;
  for (let x = 0; x < m.w; x++) for (let y = 0; y < m.h; y++) for (let z = 0; z < m.d; z++) { const id = m.hull.get(x, y, z); if (id && emitCodeOf(m, x, y, z, id) === EMIT.ENGINE) engines++; }
  for (const p of m.parts) for (const c of p.cells) if (c[4] === EMIT.ENGINE) engines++;
  pt(5, engines >= 2, `engine cores ${engines}`);
  // 6 cockpit
  const c = m.cockpit;
  const man = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
  const cockOk = c && g.get(...c.seat) === SEAT && g.get(...c.console) === CONSOLE && g.get(...c.glass) === B.STEEL_GLASS && man(c.seat, c.console) <= 2 && man(c.console, c.glass) <= 2;
  pt(6, cockOk, 'cockpit glass + seat + console');
  // 7/8 interior + door (walk from the ground through the door)
  const door = m.door;
  const outer = door && door.outer, inner = door && door.inner;
  const reach = door ? walk(g, [outer[0], outer[2], 0], step) : [];
  if (dumpName === m.name) dumpModel(m, reach);
  const reached = new Set(reach.map(([x, z, h]) => `${x},${z},${h}`));
  const innerH = inner ? standHeights(g, inner[0], inner[2]).find((h) => Math.abs(h - inner[1]) < 1e-6) : undefined;
  const innerReached = innerH !== undefined && reached.has(`${inner[0]},${inner[2]},${innerH}`);
  // interior standing cells = reached cells enclosed once the doors are sealed (not outside air of the closed grid, so
  // cells under overhangs and in ramp bays do not count); light from the model's own lamps at the feet cell
  const light = modelLight(m);
  const enclosed = outsideMask(m.gridClosed);
  const covered = [];
  let minLight = 15, darkest = null;
  for (const [x, z, h] of reach) {
    if (x < 0 || z < 0 || x >= m.w || z >= m.d) continue;
    const fy = Math.min(m.h - 1, feetCell(h));
    if (enclosed.outside(x, fy, z) || solid(m.gridClosed.get(x, fy, z))) continue;
    covered.push([x, z, h]);
    const l = light.block[light.idx(x, fy, z)];
    if (l < minLight) { minLight = l; darkest = [x, fy, z]; }
  }
  const near = (cells, pred) => { let n = 0; const seen = new Set(); for (const [x, z, h] of cells) for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) for (const dy of [-1, 0, 1]) { const cx = x + dx, cy = feetCell(h) + dy, cz = z + dz, k = `${cx},${cy},${cz}`; if (!seen.has(k) && pred(g.get(cx, cy, cz))) { seen.add(k); n++; } } return n; };
  const seats = near(covered, (id) => id === SEAT || id === B.BED_HEAD), consoles = near(covered, (id) => id === CONSOLE);
  const cockpitReached = c && reach.some(([x, z, h]) => Math.abs(x - c.seat[0]) + Math.abs(z - c.seat[2]) <= 1 && Math.abs(feetCell(h) - c.seat[1]) <= 1);
  if (m.compact) {
    const seatReach = near(reach.filter(([x, z]) => x >= 0 && z >= 0 && x < m.w && z < m.d), (id) => id === SEAT);
    pt(7, innerReached && seatReach >= 1 && m.seats.length >= 1, `compact seat entry: seats ${m.seats.length}, reachable seats ${seatReach}`);
  } else {
    pt(7, covered.length >= 12 && seats >= 4 && consoles >= 1 && minLight >= 6, `interior cells ${covered.length}, seats ${seats}, consoles ${consoles}, min light ${minLight}${darkest ? ' at ' + darkest.join(',') : ''}`);
  }
  pt(8, !!door && innerReached && cockpitReached, `door reachable from the pad ${innerReached}, cockpit reached ${cockpitReached}`);
  // 9 gear, 10 class animation
  const gearParts = m.parts.filter((p) => p.channel === CH.GEAR);
  const moves = (p) => { const f = p.flightCells(m.w, m.h, m.d); return f.some((fc) => !p.cells.some((cc) => cc[0] === fc[0] && cc[1] === fc[1] && cc[2] === fc[2])) || f.length < p.cells.length; };
  pt(9, gearParts.length >= 1 && gearParts.some(moves), `gear parts ${gearParts.length}`);
  const need = { shuttle: CH.CLASS, starfighter: CH.CLASS, gunship: CH.DOOR, freighter: CH.DOOR, hauler: CH.DOOR, yacht: CH.DOOR, bus: CH.DOOR, taxi: CH.GEAR, police: CH.DOOR }[m.cls];
  const classParts = m.parts.filter((p) => p.channel === need);
  pt(10, classParts.length >= 1 && classParts.some(moves), `class animation (${['gear', 'wings/foils', 'doors/ramp'][need] || need}) parts ${classParts.length}`);
  // 11 lights: red + green nav, landing lights, cabin lamps
  let red = 0, green = 0, landing = 0, lamps = 0;
  const countEmit = (id, code) => { if (code === EMIT.NAV) { if (id === B.PANEL_RED) red++; else if (id === B.NEON_GREEN) green++; } else if (code === EMIT.LANDING) landing++; else if (code === EMIT.LAMP || (code === 0 && BLOCKS[id].emit >= 12)) lamps++; };
  for (let x = 0; x < m.w; x++) for (let y = 0; y < m.h; y++) for (let z = 0; z < m.d; z++) { const id = m.hull.get(x, y, z); if (id) countEmit(id, emitCodeOf(m, x, y, z, id)); }
  for (const p of m.parts) for (const cc of p.cells) countEmit(cc[3], cc[4]);
  pt(11, red >= 1 && green >= 1 && landing >= 1 && lamps >= 2, `nav red ${red} green ${green}, landing ${landing}, lamps ${lamps}`, 'auto+critic');
  // 12 greebles + flat patches
  let greeb = 0;
  for (const [x, y, z, id, exposed] of ext) if (GREEBLE.has(id) || exposed >= 4) greeb++;
  const planes = new Map();
  for (const [f, x, y, z, id] of faces) {
    const axis = f >> 1, coord = axis === 0 ? x : axis === 1 ? y : z, u = axis === 0 ? z : x, v = axis === 1 ? z : y;
    const k = `${f}:${coord}:${id}`;
    if (!planes.has(k)) planes.set(k, new Set());
    planes.get(k).add(`${u},${v}`);
  }
  let patches = 0, firstPatch = '';
  const FACE_NAMES = ['+x', '-x', 'top', 'belly', '+z', 'nose'];
  for (const [k, set] of planes) {
    if (set.size < 25) continue;
    const pts2 = [...set].map((s) => s.split(',').map(Number));
    for (const [u, v] of pts2) { let full = true; for (let du = 0; du < 5 && full; du++) for (let dv = 0; dv < 5; dv++) if (!set.has(`${u + du},${v + dv}`)) { full = false; break; } if (full) { patches++; if (!firstPatch) { const [f, coord, id] = k.split(':'); firstPatch = ` (${FACE_NAMES[+f]} face at ${coord}, ${BLOCKS[+id].name} from u${u} v${v})`; } break; } }
  }
  const greebleFrac = greeb / ext.length;
  pt(12, greebleFrac >= 0.15 && patches === 0, `greebles ${(100 * greebleFrac).toFixed(0)}% of ${ext.length} exterior cells, flat 5x5 patches ${patches}${firstPatch}`);
  // 13 colour story: hull colours = plain opaque cubes (greebles, glass, lamps, seats and slabs are detail, not
  // palette); one primary (with its seam) carrying >= 30 %, one visible accent (2..25 %), at most 6 hull colours
  const hullColours = [...extIds.keys()].filter((id) => !GREEBLE.has(id) && BLOCKS[id].emit === 0 && BLOCKS[id].shape === SHAPE.CUBE && BLOCKS[id].opaque);
  const primaryFrac = ((extIds.get(m.primary) || 0) + (extIds.get(m.seam) || 0)) / ext.length;
  const accentFrac = (extIds.get(m.accent) || 0) / ext.length;
  pt(13, primaryFrac >= 0.3 && accentFrac >= 0.02 && accentFrac <= 0.25 && hullColours.length <= 6, `primary+seam ${(100 * primaryFrac).toFixed(0)}%, accent ${(100 * accentFrac).toFixed(1)}%, hull colours ${hullColours.map((id) => BLOCKS[id].name).join('/')}`, 'auto+critic');
  // 14 texture fit
  const banned = [...extIds.keys()].filter((id) => BANNED.test(BLOCKS[id].name));
  pt(14, banned.length === 0, `no wood/wool on the hull${banned.length ? ': ' + banned.map((id) => BLOCKS[id].name).join(',') : ''}`, 'auto+critic');
  pt(15, true, 'motion (fleet check below)', 'fleet');
  pt(16, m.engineHz >= 60 && m.engineHz <= 140, `hum f0 ${m.engineHz} Hz`, 'auto+critic');
  pt(17, true, 'shadow caster material', 'auto');
  const { faces: nf } = buildShipGeometry(m);
  pt(18, nf * 2 <= 6000 && m.parts.length < MAX_PARTS, `${nf * 2} tris, ${m.parts.length} parts`);
  pt(19, m.interiors.length >= 1 && m.interiors.every((b) => b.x0 >= 0 && b.z0 >= 0 && b.x1 <= m.w && b.z1 <= m.d && b.y1 <= m.h), `interior boxes ${m.interiors.length} (carry test below)`);
  pt(20, true, 'originality (critic)', 'critic');
  const score = pts.filter((p) => p.ok).length;
  const mech = pts.filter((p) => p.kind !== 'critic' && p.kind !== 'fleet'), mechOk = mech.filter((p) => p.ok).length;
  const structural = pts.slice(0, 8).every((p) => p.ok);
  return { score, pts, notes, structural, faces: nf, mech: `${mechOk}/${mech.length}` };
}

const models = shipModels();
const grades = new Map();
console.log('\n== ship rubric scorecard ==');
for (const m of models) {
  const r = grade(m);
  grades.set(m.name, r);
  console.log(`${m.name}: ${r.score}/20 (mechanical ${r.mech}, ${r.faces * 2} tris)${r.structural ? '' : '  STRUCTURAL FAIL'}${r.notes.length ? '   missing: ' + r.notes.join('; ') : ''}`);
}
console.log('(points 2 silhouette, 15 motion, 17 shadow and 20 originality are critic-judged and counted as given here)\n');

test('>= 8 models graded >= 16/20 with no structural fail, covering the six families + fighter, police, bus', () => {
  const good = models.filter((m) => grades.get(m.name).score >= 16 && grades.get(m.name).structural);
  assert.ok(good.length >= 8, `${good.length} models >= 16/20`);
  const fams = new Set(models.map((m) => m.family));
  for (const f of ['bulk freight', 'light freighter', 'passenger shuttle', 'diplomatic transport', 'security / troop transport', 'local taxi / courier', 'starfighter', 'police speeder', 'local transit']) assert.ok(fams.has(f), `family ${f}`);
  for (const m of models) assert.ok(grades.get(m.name).structural, `${m.name} structural points 1-8`);
});

test('every model: parts within the shader table, door cells sealed in the closed and flight grids', () => {
  for (const m of models) {
    assert.ok(m.parts.length < MAX_PARTS);
    if (m.door && m.door.cells) for (const [x, y, z] of m.door.cells) { assert.ok(solid(m.gridClosed.get(x, y, z)), `${m.name} closed door cell ${x},${y},${z}`); assert.ok(solid(m.gridFlight.get(x, y, z)), `${m.name} flight door cell`); assert.equal(m.grid.get(x, y, z), 0, `${m.name} open door cell is air`); }
    // ramps swing up out of the way: no flight-pose ramp cell below the sill outside the hull footprint
    for (const p of m.parts.filter((p) => p.name === 'ramp')) {
      const f = p.flightCells(m.w, m.h, m.d);
      assert.ok(f.every((c) => c[1] >= 1), `${m.name} raised ramp stays off the pad`);
    }
  }
});

test('shipMaterial: shadow caster, part uniforms, instancing attributes', () => {
  const mat = shipMaterial(null, models[0]);
  assert.ok(mat.userData.shadowCaster && mat.uniforms.uPartA.value.length === MAX_PARTS * 4);
  assert.ok(mat.vertexShader.includes('aState') && mat.fragmentShader.includes('uTime'));
});

// ---------------------------------------------------------------- fleet
const layout = getLayout(1337);
const ships = buildShips(SPACEPORT.pads, DECK_Y, { pad: FRONTIER.pad, deckY: FRONTIER_DECK_Y }, layout);
const center = { x: SPACEPORT.terminal.cx, y: DECK_Y, z: 0 };

test('fleet census: >= 30 ships airborne within 300 blocks of the spaceport at every sampled time, every type flying', () => {
  let min = Infinity, minT = 0, total = 0, samples = 0;
  const typesSeen = new Set();
  const p = {};
  for (let t = 0; t < 900; t += 2.5) {
    let n = 0;
    for (const sh of ships) {
      routePose(sh.route, t + sh.offset, p);
      const air = p.y > (sh.deckY || DECK_Y) + 0.5;
      if (air && Math.hypot(p.x - center.x, p.z - center.z) <= 300) { n++; typesSeen.add(sh.type); }
    }
    if (n < min) { min = n; minT = t; }
    total += n; samples++;
  }
  console.log(`   ships ${ships.length}, airborne within 300 of the spaceport: min ${min} (t=${minT}s), mean ${(total / samples).toFixed(1)}; types flying ${[...typesSeen].sort().join(',')}`);
  assert.ok(min >= 30, `min airborne ${min}`);
  assert.equal(typesSeen.size, models.length, 'every model type flies');
  assert.equal(ships.filter((s) => typeof s.pad === 'number').length, SPACEPORT.pads.length, 'one landing cycle per pad');
});

test('port cycle: reservation -> approach -> landing -> shutdown -> doors -> boarding -> servicing -> closure -> departure, deterministic states', () => {
  for (const sh of ships.filter((s) => s.pad !== null)) {
    const phases = sh.route.phases;   // segment phases plus 'reservation' (the tail of the fly segment)
    for (const ph of PORT_PHASES) assert.ok(phases.includes(ph), `${sh.name} has phase ${ph}`);
    const by = (ph) => sh.route.segs.find((s) => s.phase === ph);
    const st = {}, pose = {};
    // doors closed in flight and during approach, open only while boarding/servicing, gear down on the pad
    for (const [ph, want] of [['fly', { door: 0, gear: 0 }], ['approach', { door: 0 }], ['boarding', { door: 1, gear: 1 }], ['servicing', { door: 1, gear: 1 }], ['departure', { door: 0, gear: 1 }]]) {
      const t = by(ph).t0 + by(ph).dur / 2;
      routePose(sh.route, t, pose); shipState(sh.route, t, st);
      for (const [k, v] of Object.entries(want)) assert.equal(st[k], v, `${sh.name} ${ph} ${k}`);
      assert.equal(pose.phase, ph);
    }
    // the wings fold before touchdown and stay folded on the pad; open state exactly 1 only when fully open
    routePose(sh.route, by('touchdown').t0 + by('touchdown').dur - 1e-3, pose); shipState(sh.route, by('touchdown').t0 + by('touchdown').dur - 1e-3, st);
    assert.ok(st.cls >= 0.99, `${sh.name} class animation done at touchdown`);
    shipState(sh.route, by('doors').t0 + by('doors').dur / 2, st); assert.ok(st.door > 0 && st.door < 1, 'doors opening mid-phase');
    // the pad is reserved from the approach until the departure climb ends
    assert.equal(padStateAt(sh, by('approach').t0 + 1 - sh.offset).reserved, true);
    assert.equal(padStateAt(sh, by('fly').t0 + by('fly').dur / 2 - sh.offset).reserved, false);
    // landed yaw is cardinal so the vehicle collision is exact
    routePose(sh.route, by('boarding').t0 + 1, pose);
    const q = pose.yaw / (Math.PI / 2);
    assert.ok(Math.abs(q - Math.round(q)) < 1e-6, `${sh.name} landed yaw ${pose.yaw}`);
    // deterministic + continuous: the same route built twice agrees everywhere, no jump larger than a tick of top speed
    const vmax = models[sh.type].speed * 1.1;
    let prev = null, maxJump = 0;
    for (let t = 0; t <= sh.route.period + 0.05; t += 0.05) { const qq = routePose(sh.route, t, {}); if (prev) maxJump = Math.max(maxJump, Math.hypot(qq.x - prev.x, qq.y - prev.y, qq.z - prev.z)); prev = qq; }
    assert.ok(maxJump <= vmax * 0.05 + 1e-6, `${sh.name}: jump ${maxJump.toFixed(2)}`);
  }
});

test('motion: banked turns with roll <= 25 degrees, pitch bounded, lanes clear of towers and following the boulevards', () => {
  let maxRoll = 0, rolled = 0, samples = 0;
  for (const sh of ships) for (let t = 0; t < sh.route.period; t += 0.5) {
    const q = routePose(sh.route, t, {});
    samples++; if (Math.abs(q.roll) > 0.1) rolled++;
    maxRoll = Math.max(maxRoll, Math.abs(q.roll));
    assert.ok(Math.abs(q.roll) <= 25 * Math.PI / 180 + 1e-6 && Math.abs(q.pitch) <= 0.8, `${sh.name} roll ${q.roll} pitch ${q.pitch}`);
  }
  assert.ok(maxRoll > 0.2 && rolled > samples * 0.05, `max roll ${maxRoll}, rolled ${rolled}/${samples}`);
  const lots = layout.lots.filter((l) => l.kind !== 'plaza');
  for (const sh of ships) {
    const path = sh.route.segs[0].path, p = { x: 0, y: 0, z: 0 };
    if (!path) continue;                                  // repair berths never fly
    for (let d = 0; d < path.length; d += 2) {
      path.at(d, p);
      for (const l of lots) assert.ok(!(p.x >= l.x0 - 3 && p.x < l.x1 + 3 && p.z >= l.z0 - 3 && p.z < l.z1 + 3 && p.y < 60 + l.height + 3), `${sh.name} hits lot ${l.id} at ${Math.round(p.x)},${Math.round(p.y)},${Math.round(p.z)}`);
    }
    if (sh.lanePts && sh.boulevard) assert.ok(lanePathClear(sh.lanePts, layout), `${sh.name} leaves the boulevard corridors`);
  }
  // harbour circuits over the spaceport either fly above the control tower's antenna (y 165) or, at low level, stay
  // above the terminal roof (y 113) and out of the pad approach columns and the tower's block
  const S = SPACEPORT, ph = S.padHalf;
  for (const sh of ships.filter((s) => s.harbour)) for (let t = 0; t < sh.route.period; t += 1) {
    const q = routePose(sh.route, t, {});
    if (!(q.x >= S.x0 - 2 && q.x <= S.x1 + 2 && Math.abs(q.z) <= 182) || q.y >= 170) continue;
    assert.ok(q.y >= 116, `${sh.name} low over the spaceport at y ${q.y.toFixed(1)}`);
    for (const pad of S.pads) assert.ok(Math.abs(q.x - pad.x) > ph + 8 || Math.abs(q.z - pad.z) > ph + 8, `${sh.name} in the approach column of pad ${pad.x},${pad.z} at ${q.x.toFixed(0)},${q.z.toFixed(0)}`);
    assert.ok(!(q.x >= S.tower.x0 - 10 && q.x <= S.tower.x1 + 10 && Math.abs(q.z) <= 14), `${sh.name} at the control tower`);
  }
});

// ---------------------------------------------------------------- traffic vehicle (fake game) + boarding
function fakeGame() {
  const calls = [];
  const audio = { ctx: null };
  const msgs = [];
  const player = { pos: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } }, vel: { x: 0, y: 0, z: 0 }, yaw: 0, width: 0.6, height: 1.8, onGround: true };
  const game = { atlas: null, world: { sampleLight: () => [1, 0], getBlock: () => 0 }, audio, calls, player, hud: { addMessage: (m) => msgs.push(m) }, msgs, scene: { add() {}, remove() {} }, vehicles: null, tickCount: 0 };
  return game;
}

test('ShipTraffic: one InstancedMesh per model type, <= 2 draw calls per type, far ships not submitted, states per instance', () => {
  const game = fakeGame();
  const tr = new ShipTraffic(game, { pads: SPACEPORT.pads, deckY: DECK_Y, frontier: { pad: FRONTIER.pad, deckY: FRONTIER_DECK_Y }, layout });
  assert.equal(tr.types.length, models.length);
  for (const ty of tr.types) assert.ok(ty.mesh.isInstancedMesh && ty.mesh.frustumCulled === false && ty.state);
  const cam = { position: { x: 2620, y: 100, z: -60 } };
  tr.tick(12345); tr.update(1 / 60, 0.5, cam);
  const t = tr.timeAt(0.5); let near = 0;
  for (const sh of tr.ships) { const p = routePose(sh.route, t + sh.offset, {}); if (Math.hypot(p.x - cam.position.x, p.y - cam.position.y, p.z - cam.position.z) <= HIDE_DIST) near++; }
  assert.equal(tr.stats.visible, near);
  assert.ok(near >= 30, `visible near the spaceport ${near}`);
  assert.ok(tr.stats.drawCalls <= models.length);
  tr.update(1 / 60, 0.5, { position: { x: 0, y: 100, z: 0 } });
  for (const ty of tr.types) assert.equal(ty.mesh.visible, ty.count > 0);
});

test('ShipVehicle: promoted ship carries a rider inside through flight (position stable in ship space), door interlocks, exits on landing', () => {
  const game = fakeGame();
  const tr = new ShipTraffic(game, { pads: SPACEPORT.pads, deckY: DECK_Y, layout });
  const sh = tr.ships.find((s) => s.pad === 0);
  const v = new ShipVehicle(tr, sh);
  game.vehicles = { tickCount: 0, list: [v] };
  const by = (ph) => sh.route.segs.find((s) => s.phase === ph);
  // start ticking during boarding: doors open, player walks in through the door
  const tBoard = by('boarding').t0 + 1 - sh.offset;
  let tick = Math.round(tBoard * 20);
  const step = () => { tick++; tr.tick(tick); v.tick(tick); };
  tr.tick(tick); v.onAdd(game); v.tick(tick);
  assert.equal(v.state.phase, 'boarding'); assert.ok(v.doorOpen, 'door open while boarding');
  const inner = v.gridToWorld(v.model.door.inner[0] + 0.5, v.model.door.inner[1], v.model.door.inner[2] + 0.5);
  game.player.pos.set(inner.x, inner.y, inner.z);
  const local0 = v.worldToGrid(inner.x, inner.y, inner.z);
  // the door cells are passable now, sealed once closed
  const box = { x0: inner.x - 0.3, y0: inner.y, z0: inner.z - 0.3, x1: inner.x + 0.3, y1: inner.y + 1.8, z1: inner.z + 0.3 };
  assert.ok(!v.overlapsEntity(box), 'standing inside the door is clear while open');
  // ride: tick through closure, departure, climb and 30 s of cruise; the rider stays put in ship space
  const tEnd = by('fly').t0 + sh.route.period + 30 - sh.offset;
  let maxDrift = 0, carried = 0;
  while (tick / 20 < tEnd) {
    step(); v.carry(game.player);
    const l = v.worldToGrid(game.player.pos.x, game.player.pos.y, game.player.pos.z);
    maxDrift = Math.max(maxDrift, Math.hypot(l.x - local0.x, l.y - local0.y, l.z - local0.z));
    if (v.riders.has(game.player)) carried++;
    if (v.state.phase === 'fly') { const b = v.bounds; assert.ok(game.player.pos.x >= b.x0 - 1 && game.player.pos.x <= b.x1 + 1 && game.player.pos.z >= b.z0 - 1 && game.player.pos.z <= b.z1 + 1, 'rider inside the ship bounds in flight'); }
  }
  assert.ok(maxDrift < 0.02, `rider drift in ship space ${maxDrift}`);
  assert.ok(carried > 400, `carried ticks ${carried}`);
  assert.equal(v.state.phase, 'fly'); assert.ok(!v.doorOpen && v.grid === v.model.gridFlight, 'sealed in flight');
  assert.ok(game.msgs.some((m) => /depart|destination|Pad/i.test(m)), 'HUD announced the departure');
  // leave() refuses in flight, works once landed with the door open
  assert.equal(v.leave(game.player), false);
  const tOpen = by('boarding').t0 + sh.route.period + 1 - sh.offset;
  while (tick / 20 < tOpen) { step(); v.carry(game.player); }
  assert.equal(v.state.phase, 'boarding'); assert.ok(v.doorOpen);
  assert.equal(v.leave(game.player), true);
  const outer = v.gridToWorld(v.model.door.outer[0] + 0.5, 0, v.model.door.outer[2] + 0.5);
  assert.ok(Math.hypot(game.player.pos.x - outer.x, game.player.pos.z - outer.z) < 0.01 && Math.abs(game.player.pos.y - outer.y) < 0.01, 'exited to the pad beside the door');
  // interlock: a player standing in the doorway at closure is nudged to the nearer side
  const tClose = by('closure').t0 + sh.route.period - sh.offset;
  while (tick / 20 < tClose - 0.1) { step(); }
  const sill = v.gridToWorld(v.model.door.cells[0][0] + 0.5, v.model.door.cells[0][1], v.model.door.cells[0][2] + 0.5);
  game.player.pos.set(sill.x, sill.y, sill.z);
  while (tick / 20 < tClose + 0.3) { step(); v.carry(game.player); }
  const box2 = { x0: game.player.pos.x - 0.3, y0: game.player.pos.y, z0: game.player.pos.z - 0.3, x1: game.player.pos.x + 0.3, y1: game.player.pos.y + 1.8, z1: game.player.pos.z + 0.3 };
  assert.ok(!v.doorOpen && v.grid === v.model.gridClosed, 'doorway sealed from the start of the closure phase');
  assert.ok(!v.overlapsEntity(box2), 'player nudged clear of the closing door');
  assert.ok(v.riders.has(game.player) || game.msgs.some((m) => /stepped back/.test(m)), 'nudged aboard (nearer side) or told to step back');
  const sealedBox = { ...box2 }; sealedBox.x0 = sill.x - 0.3; sealedBox.x1 = sill.x + 0.3; sealedBox.z0 = sill.z - 0.3; sealedBox.z1 = sill.z + 0.3; sealedBox.y0 = sill.y; sealedBox.y1 = sill.y + 1.8;
  assert.ok(v.overlapsEntity(sealedBox), 'the doorway itself is solid while closed');
});

test('repair spots: 2-3 docked ships in the repair state with mechanic spots on the deck', () => {
  const game = fakeGame();
  const tr = new ShipTraffic(game, { pads: SPACEPORT.pads, deckY: DECK_Y, layout });
  const spots = tr.repairSpots();
  assert.ok(tr.repairs.length >= 2 && tr.repairs.length <= 3, `repair ships ${tr.repairs.length}`);
  assert.ok(spots.length >= 4);
  for (const s of spots) assert.ok(s.x >= SPACEPORT.deck.x0 && s.x <= SPACEPORT.deck.x1 && Math.abs(s.y - DECK_Y) < 1e-6 && s.ship, `spot ${JSON.stringify(s)}`);
});

// ---------------------------------------------------------------- browser checks (optional)
if (cdpUrl) {
  const { launchPage } = await import('./cdp.mjs');
  const runCdp = async (name, fn) => { try { await fn(); passed++; console.log(`PASS ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}\n   ${e.stack || e.message}`); } };
  // 1) census + hum spectrum from a deck vantage point
  await runCdp('CDP: >= 30 ships within 300 blocks, hum dominant frequency < 400 Hz, <= 8 voices, no chirp', async () => {
    const page = await launchPage(cdpUrl + '?x=2621&y=98&z=44&yaw=0&pitch=-6&fly=1&time=0.5&quality=light&rd=8', { width: 1100, height: 700 });
    try {
      await page.waitForGame(180000);
      await page.evaluate('game.input.locked = true; game.input.onLockChange = null; game.audio.resume(); "ok"');
      await page.sleep(6000);
      const census = await page.evaluate('JSON.stringify(game.shipTraffic.census(300))');
      const c = JSON.parse(census);
      console.log(`   census: ${census}`);
      assert.ok(c.airborne >= 30, `airborne ${c.airborne}`);
      const spec = await page.evaluate(`(async () => {
        const a = game.audio, ctx = a.ctx; const an = ctx.createAnalyser(); an.fftSize = 8192; an.smoothingTimeConstant = 0.6;
        a.master.connect(an); const data = new Float32Array(an.frequencyBinCount); const acc = new Float32Array(an.frequencyBinCount);
        for (let i = 0; i < 12; i++) { await new Promise((r) => setTimeout(r, 250)); an.getFloatFrequencyData(data); for (let k = 0; k < data.length; k++) acc[k] += Math.pow(10, data[k] / 10); }
        const hz = ctx.sampleRate / an.fftSize; let best = 0, bi = 0, lo = 0, hi = 0, total = 0;
        for (let k = 1; k < acc.length; k++) { const f = k * hz; total += acc[k]; if (f < 400) lo += acc[k]; if (f > 1500) hi += acc[k]; if (acc[k] > best) { best = acc[k]; bi = k; } }
        return { dominantHz: Math.round(bi * hz), below400: lo / total, above1500: hi / total, voices: game.shipTraffic.audio ? game.shipTraffic.audio.voiceCount() : -1, sampleRate: ctx.sampleRate };
      })()`);
      console.log(`   spectrum: ${JSON.stringify(spec)}`);
      assert.ok(spec.dominantHz < 400, `dominant ${spec.dominantHz} Hz`);
      assert.ok(spec.voices >= 1 && spec.voices <= 8, `voices ${spec.voices}`);
      assert.ok(spec.above1500 < 0.1, 'nothing above 1.5 kHz dominant');
    } finally { page.close(); }
  });
  // 2) ride test: board a landed pad ship through onUse, fly 30 s inside, land, exit
  await runCdp('CDP: ride test - onUse boards, player stays inside the ship bounds through 30 s of flight, lands, exits', async () => {
    const page = await launchPage(cdpUrl + '?x=2596&y=98&z=-50&yaw=0&pitch=0&fly=1&time=0.5&quality=light&rd=6', { width: 1100, height: 700 });
    try {
      await page.waitForGame(180000);
      await page.evaluate('game.input.locked = true; game.input.onLockChange = null; "ok"');
      await page.sleep(3000);
      const r = await page.evaluate(`(async () => {
        const tr = game.shipTraffic, p = game.player;
        const i = tr.ships.findIndex((s) => s.pad === 0);
        // jump the clock so pad 1's ship is 1 s into its servicing phase (doors open; departure follows within ~16 s)
        const ticks = tr.ticksUntil(i, 'servicing'); game.vehicles.tickCount += ticks + 20;
        for (const v of game.vehicles.list) if (v.tick) { v.tick(game.vehicles.tickCount); }
        await new Promise((r) => setTimeout(r, 1500));
        tr.promoteNear(p.pos, 200);
        const v = tr.ships[i].vehicle; if (!v) return { err: 'not promoted' };
        const outer = v.gridToWorld(v.model.door.outer[0] + 0.5, 0, v.model.door.outer[2] + 0.5);
        p.pos.set(outer.x, outer.y + 0.1, outer.z); p.vel.set(0, 0, 0); p.flying = false;
        const hit = { vehicle: v, dist: 2, point: outer };
        const used = v.onUse(p, game, hit);
        await new Promise((r) => setTimeout(r, 1500));
        const inner = v.gridToWorld(v.model.door.inner[0] + 0.5, v.model.door.inner[1], v.model.door.inner[2] + 0.5);
        const boarded = Math.hypot(p.pos.x - inner.x, p.pos.z - inner.z) < 1.5;
        const log = [], t0 = performance.now();
        let inside = 0, total = 0, phases = new Set(), flew = false, maxDrift = 0;
        const l0 = v.worldToGrid(p.pos.x, p.pos.y, p.pos.z);
        while (performance.now() - t0 < 80000) {
          await new Promise((r) => setTimeout(r, 500));
          const b = v.bounds, ph = v.state.phase; phases.add(ph);
          if (ph === 'fly' || ph === 'departure' || ph === 'climb') flew = true;
          if (flew && ph === 'fly') {
            total++;
            if (p.pos.x >= b.x0 - 0.5 && p.pos.x <= b.x1 + 0.5 && p.pos.y >= b.y0 - 0.5 && p.pos.y <= b.y1 + 0.5 && p.pos.z >= b.z0 - 0.5 && p.pos.z <= b.z1 + 0.5) inside++;
            const l = v.worldToGrid(p.pos.x, p.pos.y, p.pos.z); maxDrift = Math.max(maxDrift, Math.hypot(l.x - l0.x, l.z - l0.z));
          }
          if (flew && ph === 'fly' && total >= 60) break;
        }
        const riding = v.isPlayerRiding();
        return { used, boarded, inside, total, riding, maxDrift: +maxDrift.toFixed(2), speed: +v.cur.speed.toFixed(1), phases: [...phases], pos: [p.pos.x, p.pos.y, p.pos.z].map((n) => Math.round(n)), hud: game.hud.messages ? game.hud.messages.slice(-3).map((m) => m.text || m) : null };
      })()`);
      console.log(`   ride: ${JSON.stringify(r)}`);
      assert.ok(r.used && r.boarded, 'boarded through onUse');
      assert.ok(r.total >= 40 && r.inside === r.total, `inside ${r.inside}/${r.total} samples in flight`);
      assert.ok(r.riding, 'still riding');
    } finally { page.close(); }
  });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
