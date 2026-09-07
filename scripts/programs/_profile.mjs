// Building profile: everything the similarity tool (rubric 16 E), the scorer (F) and the dossiers (D) read about
// one manifested building, computed once from its blueprint. Offline, deterministic, no game needed.
//
//   profileLot(lot, layout) -> {
//     id, kind, family, district, purpose, program, sign, floors, height, w, d, area, perFloorArea,
//     rooms: [{ kind, f, x, y, z, w, d, area, reach, lit, density, variety, spots, works, beds, verbs, deg }],
//     graph: { nodes, edges, degHist, deadEnds, deadEndRatio, corridorShare, connected, components },
//     palette: [blockId...] (top blocks by count), wall, floor,
//     staff: { kinds: {kind: n}, total }, interactions: { verb: roomCount }, verbs: Set,
//     entry: { side, doors, publicDoors, serviceDoor, midDoor, lobby: {w, d, area} | null, lifts, liftSpan },
//     signature: { kind, f, area } | null, reachShare, litShare, denseShare, floating
//   }
import { BLOCKS, B, SHAPE } from '../../src/blocks.js';
import { FORCE_AIR } from '../../src/coruscant/blueprint.js';
import { analyzeBlueprint, evidence, barFor, blueprintFor, purposeFor, programFor, INTERACTIONS, PROGRAMS } from './_lib.mjs';
import { ADAPTATION_BY_KIND } from '../../src/coruscant/rooms/programs.js';

const CIRCULATION = new Set(['lobby_atrium', 'lift_landing', 'corridor', 'stairwell', 'stair_tower', 'vomitory', 'private_corridor', 'gantry_walkway', 'concourse']);
const isAir = (v) => v === 0 || v === FORCE_AIR;
const passable = (v) => isAir(v) || !BLOCKS[v] || !BLOCKS[v].solid || BLOCKS[v].shape === SHAPE.DOOR || BLOCKS[v].shape === SHAPE.SALOON_DOOR || BLOCKS[v].shape === SHAPE.SLAB;
const solid = (v) => !isAir(v) && BLOCKS[v] && BLOCKS[v].solid;
const VERBS = Object.keys(INTERACTIONS);

// What a room *offers* (spec 17 "advertised services"): a room counts a verb only when its kind advertises it and
// the blueprint evidences it. Program rooms advertise their spec's interactions, adaptations their own, standard
// library kinds the list below; a landmark's hand-built kind takes the interactions of the program specs whose kind
// pattern it matches, else the unambiguous physical verbs (SAFE). Without this, an apartment tower "offers" charging
// a droid in twenty rooms because a blue panel stands next to an iron block.
export const LIBRARY_VERBS = {
  restaurant: ['order food', 'sit'], cafeteria: ['order food', 'sit'], cantina: ['order drink', 'sit', 'listen to the band'], night_club: ['dance', 'order drink', 'listen to the band'], kitchen: ['cook a meal'],
  library: ['read', 'sit'], archive: ['read', 'inspect evidence'], bank_vault: ['inspect evidence'], laundry: ['wash'], restroom: ['wash'],
  medbay: ['receive treatment', 'rest in a bed'], clinic_ward: ['rest in a bed', 'receive treatment'], hotel_room: ['sleep'], family_apartment: ['sleep', 'cook a meal'], penthouse: ['sleep', 'admire the art', 'enjoy the view'], barracks: ['sleep'], studio: ['watch the work', 'sleep'],
  shop: ['buy', 'browse stock'], market_stalls: ['buy', 'haggle', 'browse stock'], storage: ['browse stock'], garage: ['inspect the craft', 'watch the work'], hangar: ['inspect the craft', 'watch the work'], workshop: ['watch the work'], droid_bay: ['charge a droid', 'watch the work'],
  meeting_room: ['take a private meeting'], council_chamber: ['sit', 'watch performance'], courtroom: ['sit'], holo_theatre: ['watch performance', 'sit'], arcade: ['sit', 'use console'], gym: ['watch the work', 'sit'],
  museum_hall: ['admire the art'], gallery: ['admire the art'], observation_deck: ['enjoy the view', 'sit'], garden_terrace: ['tend the garden', 'sit'], roof_garden: ['tend the garden', 'sit'], greenhouse: ['tend the garden'],
  school_room: ['sit', 'read board'], open_plan_office: ['talk to staff', 'use console'], executive_office: ['take a private meeting', 'talk to staff'], security_post: ['report a crime', 'talk to staff'], detention_cell: ['look into the cells'], armory: ['check out equipment'],
  control_room: ['read the status board', 'use console'], comms_room: ['use console'], server_room: ['use console'], reactor_room: ['follow the walkway', 'read the status board'], dressing_room: ['change clothes'], lounge: ['sit', 'wait'], lobby_atrium: ['wait', 'read board'], meditation_chamber: ['meditate'],
};
const SPEC_VERBS = {};
const ACCEPT_VERBS = [];
for (const p of PROGRAMS) for (const s of p.rooms) { SPEC_VERBS[s.kind] = [...new Set([...(SPEC_VERBS[s.kind] || []), ...s.interactions])]; if (s.accept) ACCEPT_VERBS.push({ re: s.accept, verbs: s.interactions }); }
const SAFE = ['sit', 'sleep', 'rest in a bed', 'read', 'cook a meal', 'wash', 'play the piano', 'browse stock', 'watch performance', 'meditate', 'tend the garden'];
export function offeredVerbs(kind) {
  if (SPEC_VERBS[kind]) return SPEC_VERBS[kind];
  if (ADAPTATION_BY_KIND[kind]) return ADAPTATION_BY_KIND[kind].verbs;
  if (LIBRARY_VERBS[kind]) return LIBRARY_VERBS[kind];
  const out = new Set();
  for (const a of ACCEPT_VERBS) if (a.re.test(kind)) for (const v of a.verbs) out.add(v);
  return out.size ? [...out] : SAFE;
}
// structural / facade blocks that tell one building's material identity from another's (furniture is excluded)
const PALETTE_SKIP = new Set([B.GLASS, B.WINDOW_LIT, B.WINDOW_DARK, B.TABLE, B.CHEST, B.SHELF, B.CRATE, B.BARREL, B.BOOKSHELF, B.HOLO_SIGN, B.CONSOLE, B.BED_HEAD, B.BED_FOOT, B.IRON_BARS, B.OAK_FENCE, B.TROUGH, B.FURNACE].filter((x) => x !== undefined));
// props the scorer reads per room: storage (spec 17 "believable storage"), plausible sound sources, light kinds
const STORAGE = new Set([B.CHEST, B.CRATE, B.BARREL, B.SHELF, B.BOOKSHELF].filter((x) => x !== undefined));
const SOUND = new Set([B.PIANO, B.FURNACE, B.CONSOLE, B.ANVIL, B.VENT, B.NEON_PINK, B.NEON_GREEN, B.HOLO_SIGN, B.WATER, B.MAGMA].filter((x) => x !== undefined));
const emissive = (v) => BLOCKS[v] && BLOCKS[v].emit > 0;
const HANGS = new Set([B.HOLO_SIGN, B.LANTERN, B.CITY_LAMP, B.TORCH].filter((x) => x !== undefined));

/**
 * The room graph of one floor. Nodes are the registered rooms plus the corridor components (walkable floor cells
 * outside every room rect: planner corridors and landings are not registered as rooms). Two nodes are joined where
 * a passable standing cell of one touches a passable standing cell of the other: that is exactly a doorway (the wall
 * cells between two rooms are not standing cells, so a shared wall without a door joins nothing).
 * Returns { corridors: [{ cells, ids }], edges: Set('a-b'), corridorCells }.
 */
function floorGraph(an, lot, rooms, idx, y) {
  const w = lot.w, d = lot.d, ly = y - an.y0;
  const label = new Int32Array(w * d).fill(-1);
  // largest rects first, so a room registered inside another's rect (a landmark's pit in its hall) owns its own cells
  for (const i of idx.slice().sort((a, b) => rooms[b].w * rooms[b].d - rooms[a].w * rooms[a].d)) { const r = rooms[i]; for (let x = r.x - lot.x0; x < r.x - lot.x0 + r.w; x++) for (let z = r.z - lot.z0; z < r.z - lot.z0 + r.d; z++) if (x >= 0 && z >= 0 && x < w && z < d) label[x * d + z] = i; }
  const corridors = [];
  let next = rooms.length;
  const comp = new Int32Array(w * d).fill(-1);
  for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) {
    if (label[x * d + z] >= 0 || comp[x * d + z] >= 0 || !an.standing(x, ly, z)) continue;
    const cells = []; const st = [[x, z]]; comp[x * d + z] = next;
    while (st.length) {
      const [cx, cz] = st.pop(); cells.push(cx * d + cz);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, nz = cz + dz;
        if (nx < 0 || nz < 0 || nx >= w || nz >= d || label[nx * d + nz] >= 0 || comp[nx * d + nz] >= 0 || !an.standing(nx, ly, nz)) continue;
        comp[nx * d + nz] = next; st.push([nx, nz]);
      }
    }
    corridors.push({ id: next, cells: cells.length, y });
    next++;
  }
  const node = (x, z) => (x < 0 || z < 0 || x >= w || z >= d) ? -1 : (label[x * d + z] >= 0 ? label[x * d + z] : comp[x * d + z]);
  const edges = new Set();
  for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) {
    const a = node(x, z);
    if (a < 0 || !an.standing(x, ly, z)) continue;
    for (const [dx, dz] of [[1, 0], [0, 1]]) {
      const nx = x + dx, nz = z + dz;
      if (nx >= w || nz >= d) continue;
      const b = node(nx, nz);
      if (b < 0 || b === a || !an.standing(nx, ly, nz)) continue;
      edges.add(a < b ? `${a}-${b}` : `${b}-${a}`);
    }
  }
  return { corridors, edges, node, corridorCells: corridors.reduce((s, c) => s + c.cells, 0) };
}

export function profileLot(lot, layout) {
  const bp = blueprintFor(lot, layout);
  const purpose = purposeFor(lot, layout);
  const program = programFor(lot, purpose, layout);
  const an = analyzeBlueprint(bp, lot);
  an.y0 = bp.y0;
  const m = bp.meta;
  const ys = [...new Set(m.rooms.map((r) => r.y))].sort((a, b) => a - b);
  const fIdx = new Map(ys.map((y, i) => [y, i]));
  const ectx = { lifts: m.lifts.length, serviceDoor: !!(m.program && m.program.serviceDoor) };
  const rooms = an.rooms.map((s) => {
    const evidenced = VERBS.filter((v) => evidence(v, s, ectx));
    const offered = offeredVerbs(s.kind);
    const verbs = offered.filter((v) => evidenced.includes(v));
    let storage = false, sound = false, lights = 0;
    for (const id of s.blockIds) { if (STORAGE.has(id)) storage = true; if (SOUND.has(id)) sound = true; if (emissive(id)) lights++; }
    return { kind: s.kind, f: fIdx.get(s.y) ?? 0, x: s.x, y: s.y, z: s.z, w: s.w, d: s.d, area: s.floorCells, reach: s.reach, lit: s.lit, density: +s.density.toFixed(3), dense: s.density >= barFor(s), variety: s.variety, spots: s.spots, works: s.works, beds: s.beds, verbs, offered, evidenced, deg: 0, circulation: CIRCULATION.has(s.kind), storage, sound, lights };
  });
  // room graph: per floor, rooms + corridor components joined at doorways; lifts and stacked stairwells join floors
  const edges = new Set();
  const corridors = [];
  const byFloor = new Map();
  rooms.forEach((r, i) => { if (!byFloor.has(r.y)) byFloor.set(r.y, []); byFloor.get(r.y).push(i); });
  let corridorCells = 0;
  // corridor node ids continue after the rooms; each floor's graph is offset so ids never collide
  const corridorNodes = [];
  const lookup = new Map();   // y -> (local x, z) -> global node id on that floor
  for (const [y, idx] of [...byFloor.entries()].sort((a, b) => a[0] - b[0])) {
    const g = floorGraph(an, lot, rooms, idx, y);
    const off = rooms.length + corridorNodes.length;
    const remap = (n) => (n < 0 ? -1 : n < rooms.length ? n : off + (n - rooms.length));
    for (const c of g.corridors) corridorNodes.push({ id: remap(c.id), cells: c.cells, y, f: fIdx.get(y) ?? 0, deg: 0 });
    for (const e of g.edges) { const [a, b] = e.split('-').map(Number); edges.add(`${remap(a)}-${remap(b)}`); }
    lookup.set(y, (x, z) => remap(g.node(x, z)));
    corridorCells += g.corridorCells;
  }
  const nodeOf = (id) => (id < rooms.length ? rooms[id] : corridorNodes[id - rooms.length]);
  // the node standing at world (x, z) on the floor at y: the room or the corridor component there
  const nodeAt = (x, z, y) => { const f = lookup.get(y); return f ? f(x - lot.x0, z - lot.z0) : -1; };
  const join = (a, b) => { if (a >= 0 && b >= 0 && a !== b) edges.add(a < b ? `${a}-${b}` : `${b}-${a}`); };
  for (const l of m.lifts) {
    let prev = -1;
    for (const y of ys) {
      if (y < l.y0 || y > l.y1 + 1) continue;
      let n = -1;
      for (const [dx, dz] of [[0, 2], [2, 0], [0, -2], [-2, 0], [1, 1], [-1, -1], [1, -1], [-1, 1], [0, 3], [3, 0], [0, -3], [-3, 0]]) { n = nodeAt(l.x + dx, l.z + dz, y); if (n >= 0) break; }
      if (n < 0) continue;
      join(prev, n);
      prev = n;
    }
  }
  // a stairwell climbs to the floor above: it joins the stairwell stacked there, else whatever stands over its
  // cells on that floor (the top landing of the tower core opens onto the top floor's corridor)
  const stairs = rooms.map((r, i) => ({ r, i })).filter((o) => /stair/.test(o.r.kind));
  for (const a of stairs) {
    const above = ys[(fIdx.get(a.r.y) ?? 0) + 1];
    if (above === undefined) continue;
    const b = stairs.find((o) => o.r.y === above && o.r.x === a.r.x && o.r.z === a.r.z);
    if (b) { join(a.i, b.i); continue; }
    let n = -1;
    for (let x = a.r.x - 1; x <= a.r.x + a.r.w && n < 0; x++) for (let z = a.r.z - 1; z <= a.r.z + a.r.d && n < 0; z++) n = nodeAt(x, z, above);
    join(a.i, n);
  }
  // flights that are not registered stairwells (a rotunda's half-step flight to its upper room, the ramp to a roof
  // terrace, a raked hall): the standing cells off every floor level are walked with the flood fill's step rule and
  // the floor nodes each run of them touches are joined - the plan is connected wherever a player can walk it
  // Two horizontally adjacent standing cells are linked when the mover can drop from the higher onto the lower (up to
  // three blocks) or climb one: the lower cell's column must be open from above its head room up to the mover's head
  // at the higher cell - a stack of crates under the slab of the floor above joins nothing.
  {
    const levels = new Set(ys.map((y) => y - an.y0));
    const nodeLocal = (x, ly, z) => (levels.has(ly) ? nodeAt(x + lot.x0, z + lot.z0, ly + an.y0) : -1);
    const linked = (x, y, z, nx, ny, nz) => {
      if (Math.abs(ny - y) > 3 || ny < 1 || !an.standing(nx, ny, nz)) return false;
      if (ny === y) return true;
      const lo = ny < y ? [nx, ny, nz] : [x, y, z], hiY = Math.max(y, ny);
      for (let yy = lo[1] + 2; yy <= hiY + 1; yy++) if (!passable(an.at(lo[0], yy, lo[2]))) return false;
      return true;
    };
    const seen3 = new Uint8Array(an.w * an.h * an.d);
    const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let x = 0; x < an.w; x++) for (let z = 0; z < an.d; z++) for (let y = 1; y + 1 < an.h; y++) {
      if (levels.has(y) || seen3[an.key(x, y, z)] || !an.standing(x, y, z)) continue;
      const touched = new Set();
      const st = [[x, y, z]]; seen3[an.key(x, y, z)] = 1;
      while (st.length) {
        const [cx, cy, cz] = st.pop();
        for (const [dx, dz] of STEPS) for (let dy = -3; dy <= 3; dy++) {
          const nx = cx + dx, ny = cy + dy, nz = cz + dz;
          if (!linked(cx, cy, cz, nx, ny, nz)) continue;
          if (levels.has(ny)) { const n = nodeLocal(nx, ny, nz); if (n >= 0) touched.add(n); }
          else if (!seen3[an.key(nx, ny, nz)]) { seen3[an.key(nx, ny, nz)] = 1; st.push([nx, ny, nz]); }
        }
      }
      // one continuous flight joins the levels it touches in order (f0-f1, f1-f2, ...), not every level to the first
      const floorOf = (n) => (n < rooms.length ? rooms[n].y : corridorNodes[n - rooms.length].y);
      const t = [...touched].sort((a, b) => floorOf(a) - floorOf(b) || a - b);
      for (let i = 1; i < t.length; i++) join(t[i - 1], t[i]);
    }
    // floor cells that step straight onto a cell of another floor level (a change of level without a flight)
    for (let x = 0; x < an.w; x++) for (let z = 0; z < an.d; z++) for (const ly of levels) {
      if (!an.standing(x, ly, z)) continue;
      const a = nodeLocal(x, ly, z);
      if (a < 0) continue;
      for (const [dx, dz] of STEPS) for (let dy = -3; dy <= 3; dy++) {
        if (dy === 0 || !levels.has(ly + dy) || !linked(x, ly, z, x + dx, ly + dy, z + dz)) continue;
        join(a, nodeLocal(x + dx, ly + dy, z + dz));
      }
    }
  }
  const edgeList = [...edges].map((e) => e.split('-').map(Number));
  const N = rooms.length + corridorNodes.length;
  const adj = Array.from({ length: N }, () => []);
  for (const [a, b] of edgeList) { adj[a].push(b); adj[b].push(a); nodeOf(a).deg++; nodeOf(b).deg++; }
  // the plan's components are the ones holding a room: corridor fragments joined to no room (ledges, cornices, the
  // terraces of a rock, a stepped cone roof) are terrain, not circulation
  const seen = new Uint8Array(N);
  let components = 0;
  for (let i = 0; i < rooms.length; i++) {
    if (seen[i]) continue;
    components++;
    const st = [i]; seen[i] = 1;
    while (st.length) { const c = st.pop(); for (const n of adj[c]) if (!seen[n]) { seen[n] = 1; st.push(n); } }
  }
  // the graph's nodes and edges are those of the plan: rooms plus the corridor nodes in a room's component
  const inPlan = (i) => seen[i] === 1;
  const planCorridors = corridorNodes.filter((c, k) => inPlan(rooms.length + k)).length;
  const planEdges = edgeList.filter(([a, b]) => inPlan(a) && inPlan(b)).length;
  const occupied = rooms.filter((r) => !r.circulation);
  const deadEnds = occupied.filter((r) => r.deg <= 1).length;   // an occupied room with a single way in is a dead end
  const degHist = [0, 0, 0, 0, 0];
  for (const r of rooms) degHist[Math.min(4, r.deg)]++;
  const totalArea = rooms.reduce((s, r) => s + r.area, 0) + corridorCells || 1;
  const corridorArea = rooms.filter((r) => r.circulation).reduce((s, r) => s + r.area, 0) + corridorCells;
  const perFloorArea = ys.map((y) => rooms.filter((r) => r.y === y).reduce((s, r) => s + r.area, 0));
  // palette: the blocks that carry the building's material identity, by count over the whole blueprint
  const counts = new Map();
  const emissiveKinds = new Set();
  for (let i = 0; i < bp.blocks.length; i++) { const v = bp.blocks[i]; if (isAir(v)) continue; if (emissive(v)) emissiveKinds.add(v); if (PALETTE_SKIP.has(v)) continue; counts.set(v, (counts.get(v) || 0) + 1); }
  const palette = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 6).map((e) => e[0]);
  // staff: the work records (the stations NPCs are given) by kind
  const staff = {};
  for (const w of m.work) staff[w.kind] = (staff[w.kind] || 0) + 1;
  const interactions = {};
  for (const r of rooms) for (const v of r.verbs) interactions[v] = (interactions[v] || 0) + 1;
  // entry
  const lobby = m.rooms.find((r) => r.kind === 'lobby_atrium') || rooms.find((r) => r.f === 0 && /lobby|foyer|atrium|vestibule|concourse|hall/.test(r.kind)) || null;
  const liftSpan = m.lifts.length ? Math.max(...m.lifts.map((l) => l.y1 - l.y0)) / Math.max(1, (ys[ys.length - 1] || 0) - (ys[0] || 0)) : 0;
  const entry = { side: (m.doors[0] && m.doors[0].side) || lot.front || 'S', doors: m.doors.length, publicDoors: m.doors.filter((d) => d.side !== 'service').length, serviceDoor: !!(m.program && m.program.serviceDoor), midDoor: !!m.midDoor, lobby: lobby ? { kind: lobby.kind, w: lobby.w, d: lobby.d, area: lobby.w * lobby.d } : null, lifts: m.lifts.length, liftSpan: +Math.min(1, liftSpan).toFixed(2) };
  // signature room: the program's, else the largest occupied room
  let signature = null;
  if (m.program && m.program.rooms.some((r) => r.signature)) { const s = m.program.rooms.find((r) => r.signature); const st = rooms.find((r) => r.x === s.x && r.y === s.y && r.z === s.z); signature = { kind: s.kind, f: st ? st.f : (s.floor || 0), area: st ? st.area : s.w * s.d, program: true }; }
  else if (m.program && m.program.satisfied.length && program) {
    const sigSpec = program.rooms.find((r) => r.signature);
    const by = sigSpec && m.program.satisfied.find((s) => s.kind === sigSpec.kind);
    const st = by && rooms.find((r) => r.kind === by.by);
    if (st) signature = { kind: st.kind, f: st.f, area: st.area, program: true };
  }
  if (!signature && occupied.length) { const st = occupied.slice().sort((a, b) => b.area - a.area)[0]; signature = { kind: st.kind, f: st.f, area: st.area, program: false }; }
  // floating blocks: solid cells above the ground with no support in the 6-neighbourhood (technical integrity).
  // Support is a solid block, a cell the blueprint leaves to the terrain (0, not FORCE_AIR: the plateau, the rock a
  // landmark is cut into) or a liquid (a fountain spout stands in its pool); a projected holo sign, a hung lamp and a
  // light panel are fixtures that float by design.
  let floating = 0;
  const { w, h, d } = bp;
  const at = an.at;
  const support = (v) => v === 0 || solid(v) || (BLOCKS[v] && BLOCKS[v].shape === SHAPE.LIQUID);
  for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) for (let y = 1; y < h - 1; y++) {
    const v = at(x, y, z); if (!solid(v) || HANGS.has(v) || emissive(v)) continue;
    if (support(at(x, y - 1, z)) || support(at(x, y + 1, z)) || support(at(x - 1, y, z)) || support(at(x + 1, y, z)) || support(at(x, y, z - 1)) || support(at(x, y, z + 1))) continue;
    floating++;
  }
  const n = rooms.length || 1;
  return {
    id: lot.id, kind: lot.kind, family: m.family, district: lot.district, purpose: purpose ? { kind: purpose.kind, category: purpose.category, name: purpose.name, roles: purpose.roles, sells: purpose.sells || [], buys: purpose.buys || [], hours: purpose.hours } : null,
    program: program ? program.id : null, programInfo: program, programRecord: m.program || null, sign: purpose ? purpose.name : m.name, name: m.name,
    floors: ys.length, height: bp.h, w: lot.w, d: lot.d, area: lot.w * lot.d, perFloorArea, rooms,
    graph: { nodes: rooms.length + planCorridors, roomNodes: rooms.length, corridorNodes: planCorridors, corridors: corridorNodes.map((c) => ({ f: c.f, cells: c.cells })), edges: planEdges, edgeList: edgeList.filter(([a, b]) => inPlan(a) && inPlan(b)), degHist: degHist.map((v) => +(v / n).toFixed(3)), deadEnds, deadEndRatio: +(occupied.length ? deadEnds / occupied.length : 0).toFixed(3), corridorShare: +(corridorArea / totalArea).toFixed(3), components, connected: components <= 1, isolatedRooms: rooms.filter((r) => r.deg === 0).length },
    palette, emissiveKinds: emissiveKinds.size, staff: { kinds: staff, total: m.work.length }, interactions, verbs: new Set(Object.keys(interactions)), entry, signature,
    reachShare: +(rooms.filter((r) => r.reach).length / n).toFixed(3), litShare: +(rooms.filter((r) => r.lit).length / n).toFixed(3), denseShare: +(rooms.filter((r) => r.dense).length / n).toFixed(3),
    varietyMean: +(rooms.reduce((s, r) => s + r.variety, 0) / n).toFixed(2), floating, spots: m.spots.length, beds: m.beds.length, reachCount: an.reachCount,
  };
}

// every manifested playable building of the layout (towers and landmarks), in lot-id order
export function playableLots(layout) { return layout.lots.filter((l) => l.kind === 'tower' || l.kind === 'landmark').sort((a, b) => a.id - b.id); }

const CACHE = new WeakMap();
export function profiles(layout, onProgress) {
  let m = CACHE.get(layout);
  if (m) return m;
  m = new Map();
  const lots = playableLots(layout);
  lots.forEach((lot, i) => { m.set(lot.id, profileLot(lot, layout)); if (onProgress) onProgress(i + 1, lots.length); });
  CACHE.set(layout, m);
  return m;
}
