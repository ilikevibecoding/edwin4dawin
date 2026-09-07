// Galactic Senate verification (docs/rubrics/17_senate.md, all twenty rows):
//   node scripts/test-senate.mjs [--seed 1337]           offline: the blueprint (approach, chamber volume, pods and
//                                                        tiers, reachability and lighting, twelve suites, the two
//                                                        routes, guard posts), the three scenarios, bounded influence,
//                                                        the clocked session machine, the runtime class (events,
//                                                        persistence, cast places, liaison route), import scan,
//                                                        determinism and budget
//   node scripts/test-senate.mjs --url http://localhost:5324 [--shots /tmp/senate-shots]
//                                                        + one headless Chrome: plaques inside two suites, the session
//                                                        board in the chamber during a session, senate:vote and
//                                                        senate:result on game.events, resultText()
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { initBlocks, BLOCKS, B, SHAPE } from '../src/blocks.js';
import { getLayout } from '../src/coruscant/layout.js';
import { FORCE_AIR } from '../src/coruscant/blueprint.js';
import { buildSignature } from '../src/coruscant/buildings.js';
import { EventBus } from '../src/events.js';
import { LANDMARK, G } from '../src/coruscant/landmarks/senate.js';
import { roomFunction } from '../src/npc/coruscant/rooms.js';
import { DELEGATIONS, suiteDifferences } from '../src/senate/delegations.js';
import { SCENARIOS, BLOC_SIZE, vote, positionOf, influenceSum, INFLUENCE_CAPS, INFLUENCE_TOTAL_CAP, INFLUENCE_FIRM_CAP } from '../src/senate/scenarios.js';
import { SenateSim, phaseAt, hoursToNextSession, SESSION_SLOTS, PHASES, STATES } from '../src/senate/session.js';
import { onLayout, groundGrid } from '../src/senate/route.js';
import { Senate } from '../src/senate/senate.js';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const base = opt('--url', null);
const shots = opt('--shots', '/tmp/senate-shots');
const seed = parseInt(opt('--seed', '1337'), 10);

let passed = 0, failed = 0;
const log = (...a) => console.log(...a);
const check = (name, cond, detail = '') => { if (cond) { passed++; log(`PASS ${name}${detail ? '  (' + detail + ')' : ''}`); } else { failed++; log(`FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ================================================================================================ the blueprint
initBlocks();
const layout = getLayout(seed);
const lot = layout.lots.find((l) => l.kind === 'landmark' && l.family === 'senate');
if (!lot) { console.error('no Senate lot in this layout'); process.exit(1); }
const hashBlocks = (a) => { let h = 2166136261; for (let i = 0; i < a.length; i++) { h ^= a[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
const bpA = buildSignature(LANDMARK, lot, layout);
const times = [];
let bp = bpA;
for (let i = 0; i < 5; i++) { const t0 = performance.now(); bp = buildSignature(LANDMARK, lot, layout); times.push(performance.now() - t0); }
const buildMs = Math.min(...times);
const M = bp.meta.senate;
const { w, h, d } = bp;
const { CX, CZ } = G;
const at = (x, y, z) => (x < 0 || y < 0 || z < 0 || x >= w || y >= h || z >= d) ? 0 : bp.blocks[(x * d + z) * h + y];
const isAir = (v) => v === 0 || v === FORCE_AIR;
const blk = (v) => BLOCKS[v];
const passable = (v) => isAir(v) || !blk(v) || !blk(v).solid || blk(v).shape === SHAPE.DOOR || blk(v).shape === SHAPE.SALOON_DOOR;
const lowStep = (v) => !isAir(v) && blk(v) && (blk(v).shape === SHAPE.SLAB || blk(v).shape === SHAPE.RAIL || blk(v).shape === SHAPE.FARMLAND);
const standable = (v) => !isAir(v) && blk(v) && blk(v).solid;
const name = (v) => (blk(v) ? blk(v).name : 'id' + v);
// world <-> local
const LX = (x) => x - lot.x0, LY = (y) => y - bp.y0, LZ = (z) => z - lot.z0;
const local = (p) => [LX(p.x), LY(p.y), LZ(p.z)];

// the engine's walking rules (the same as landmark-stats): feet + head passable, support below (or a slab under the
// feet); 4-neighbour moves with a step up of 1 and a drop of up to 3; lifts optional
const key = (x, y, z) => (x * d + z) * h + y;
const standing = (x, y, z) => {
  if (x < 0 || z < 0 || x >= w || z >= d || y < 1 || y + 1 >= h) return false;
  const feet = at(x, y, z), head = at(x, y + 1, z);
  if (!passable(head)) return false;
  if (lowStep(feet)) return true;
  return passable(feet) && (standable(at(x, y - 1, z)) || lowStep(at(x, y - 1, z)));
};
const liftCols = bp.meta.lifts.map((l) => ({ x: LX(l.x), z: LZ(l.z), y0: LY(l.y0), y1: LY(l.y1) }));
function flood(seeds, { lifts = false, tol = 1 } = {}) {
  const visited = new Uint8Array(w * h * d), queue = [];
  const push = (x, y, z) => { if (standing(x, y, z) && !visited[key(x, y, z)]) { visited[key(x, y, z)] = 1; queue.push(x, y, z); } };
  for (const [x, y, z] of seeds) for (let dy = -tol; dy <= tol; dy++) for (let dx = -tol; dx <= tol; dx++) for (let dz = -tol; dz <= tol; dz++) push(x + dx, y + dy, z + dz);
  let head = 0;
  while (head < queue.length) {
    const x = queue[head++], y = queue[head++], z = queue[head++];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (let dy = 1; dy >= -3; dy--) {
        if (dy === 1 && !passable(at(x, y + 2, z))) continue;
        if (standing(x + dx, y + dy, z + dz)) { push(x + dx, y + dy, z + dz); break; }
      }
    }
    if (lifts) for (const l of liftCols) {
      if (Math.abs(l.x - x) > 1 || Math.abs(l.z - z) > 1 || y < l.y0 - 1 || y > l.y1 + 1) continue;
      for (let yy = l.y0; yy <= l.y1 + 1; yy++) for (let dx = -1; dx <= 2; dx++) for (let dz = -1; dz <= 2; dz++) push(l.x + dx, yy, l.z + dz);
    }
  }
  const has = (x, y, z, t = 1) => { for (let dy = -t; dy <= t; dy++) for (let dx = -t; dx <= t; dx++) for (let dz = -t; dz <= t; dz++) { const xx = x + dx, yy = y + dy, zz = z + dz; if (xx >= 0 && zz >= 0 && yy >= 0 && xx < w && zz < d && yy < h && visited[key(xx, yy, zz)]) return true; } return false; };
  const room = (r) => { const x0 = LX(r.x), z0 = LZ(r.z), y = LY(r.y); for (let x = x0; x < x0 + r.w; x++) for (let z = z0; z < z0 + r.d; z++) if (visited[key(x, y, z)] || visited[key(x, y + 1, z)] || visited[key(x, y - 1, z)]) return true; return false; };
  return { visited, has, room, count: queue.length / 3 };
}
const doorLocal = { x: lot.door.in.x - lot.x0, z: lot.door.in.z - lot.z0 };
const fromDoor = flood([[doorLocal.x, 1, doorLocal.z], [lot.door.x - lot.x0, 1, lot.door.z - lot.z0]], { lifts: false, tol: 2 });
const fromDoorLifts = flood([[doorLocal.x, 1, doorLocal.z]], { lifts: true, tol: 2 });
const floorOK = (p) => { const [x, y, z] = local(p); return standing(x, y, z); };
const roomsOfKind = (kind) => bp.meta.rooms.filter((r) => r.kind === kind);
const inRoom = (r, p) => p.x >= r.x && p.x < r.x + r.w && p.z >= r.z && p.z < r.z + r.d && Math.abs(p.y - r.y) <= 1;

log(`== Senate blueprint: lot ${lot.x0},${lot.z0} ${w}x${d}x${h}, centre ${M.centre.x},${M.centre.z}, levels ${M.levels.join('/')}, rooms ${bp.meta.rooms.length}, build ${buildMs.toFixed(1)} ms (min of 5) ==`);

// ------------------------------------------------------------------------------------------------ 1 approach
log('\n== 1 Silhouette and approach ==');
{
  const zArch = CZ + G.SKIN_R[1];
  let statues = 0, columns = 0;
  for (let x = 0; x < w; x++) for (let z = zArch + 1; z < d; z++) {
    if (at(x, 4, z) === B.GOLD_BLOCK && at(x, 7, z) === B.GOLD_BLOCK && at(x, 9, z) === B.GLOW_PANEL && at(x, 8, z) === B.SMOOTH_STONE) statues++;
    if (at(x, 1, z) === B.CHROME && at(x, 6, z) === B.CHROME && at(x, 7, z) === B.GLOW_PANEL) columns++;
  }
  const avenueGuards = bp.meta.work.filter((r) => r.kind === 'guard' && LZ(r.z) > zArch && LY(r.y) === 1).length;
  check('avenue: >= 6 statue plinths and >= 10 lit chrome colonnade columns between the arch and the gate', statues >= 6 && columns >= 10, `${statues} statues, ${columns} columns`);
  check('avenue: Senate Guard posts at the arch and at the gate (>= 4 guard work records)', avenueGuards >= 4, `${avenueGuards}`);
  let x0 = CX, x1 = CX;
  while (isAir(at(x0 - 1, 1, zArch)) && isAir(at(x0 - 1, 4, zArch))) x0--;
  while (isAir(at(x1 + 1, 1, zArch)) && isAir(at(x1 + 1, 4, zArch))) x1++;
  let archH = 0; while (isAir(at(CX, 1 + archH, zArch))) archH++;
  check('south arch >= 10 wide and >= 8 high through the skin', x1 - x0 + 1 >= 10 && archH >= 8, `${x1 - x0 + 1} wide, ${archH} high`);
  const deck = M.deck; const [dx, dy, dz] = local(deck);
  check('boulevard gate deck spans the avenue on the twin stalks (deck plate slab at y 35, standable, a door to the bridge)', at(dx, dy - 1, dz) !== 0 && standing(dx, dy, dz) && bp.meta.doors.some((o) => LY(o.y) === 36), `deck ${deck.x},${deck.y},${deck.z}`);
  const dome = at(CX, Math.round(-21.56 + 83.56) + 1, CZ);
  check('the dome closes over the axis (a solid shell block above the inner surface)', standable(dome) || standable(at(CX, Math.round(-21.56 + 83.56) + 2, CZ)), name(dome));
}

// ------------------------------------------------------------------------------------------------ 2 volume
log('\n== 2 Grand Convocation Chamber volume ==');
{
  // pit floor: bins 0..PIT_R at y 1 (the floor block is y 0); measure the air span along the axis through the centre,
  // one row off the tunnel channel (z CZ-1..CZ+1) so the run stops at ring 1's parapet and not at the drum's skin
  const pz = CZ + 2;
  let pit0 = CX, pit1 = CX;
  while (passable(at(pit0 - 1, 1, pz)) || Math.abs(pit0 - 1 - CX) <= G.PODIUM_R + 1) { pit0--; if (pit0 <= CX - 60) break; }
  while (passable(at(pit1 + 1, 1, pz)) || Math.abs(pit1 + 1 - CX) <= G.PODIUM_R + 1) { pit1++; if (pit1 >= CX + 60) break; }
  const pitSpan = pit1 - pit0 + 1;
  // the enclosing wall: the air run along the axis between the top tier and the public gallery (the podium column
  // and its lift head-house stop below the top tier)
  const wy = G.GALLERY_Y - 2;
  let wall0 = CX, wall1 = CX;
  while (passable(at(wall0 - 1, wy, CZ))) wall0--;
  while (passable(at(wall1 + 1, wy, CZ))) wall1++;
  const enclosure = wall1 - wall0 + 1;
  let air = 0; const ax = CX + G.PODIUM_R + 2;
  while (isAir(at(ax, 1 + air, CZ))) air++;
  // the Chancellor's work record stands on the dais; above it nothing but the dome (the lift's head-house is beside it)
  const chancellor = bp.meta.work.find((r) => r.kind === 'chancellor' && Math.abs(LX(r.x) - CX) <= G.PODIUM_R && Math.abs(LZ(r.z) - CZ) <= G.PODIUM_R && LY(r.y) === G.DAIS_Y);
  let daisTop = 0; if (chancellor) while (isAir(at(LX(chancellor.x), G.DAIS_Y + 1 + daisTop, LZ(chancellor.z)))) daisTop++;
  check('open interior >= 60 across at the pit floor (air run along the axis at y 1, podium column excepted)', pitSpan >= 60, `${pitSpan} blocks (pit), enclosure wall to wall ${enclosure}`);
  check('curved enclosing wall >= 100 across above the bowl', enclosure >= 100, `${enclosure} at y ${wy}`);
  check('>= 40 blocks of air from the pit floor to the dome inner surface beside the axis', air >= 40, `${air} at x=CX+${G.PODIUM_R + 2}`);
  check('podium column at the centre with the Chancellor dais at mid-height (chancellor work record on top, air above)', !!chancellor && daisTop >= 30 && standable(at(CX, G.DAIS_Y - 1, CZ)) && standable(at(LX(chancellor.x), G.DAIS_Y - 1, LZ(chancellor.z))), `dais y ${G.DAIS_Y}, ${daisTop} air above the Chancellor`);
}

// ------------------------------------------------------------------------------------------------ 3 pods, tiers
log('\n== 3 Layered pods and tiers ==');
{
  const tierPods = M.pods.flat();
  const total = tierPods.length + M.bowlPods;
  check('>= 140 pods in total (three wall tiers of 30 + the two bowl rings)', total >= 140 && M.pods.length === 3, `${M.pods.map((t) => t.length).join('+')} wall + ${M.bowlPods} bowl = ${total}`);
  let badSeats = 0, noConsole = 0, floorless = 0;
  for (const p of tierPods) {
    if (p.seats.length < 2) badSeats++;
    const [px, py, pz] = local(p.spot);
    let found = false;
    for (let dx = -6; dx <= 6 && !found; dx++) for (let dz = -6; dz <= 6 && !found; dz++) if (at(px + dx, py, pz + dz) === B.CONSOLE) found = true;
    if (!found) noConsole++;
    if (!standing(px, py, pz)) floorless++;
  }
  check('every wall-tier pod has a console and >= 2 seats, its spot stands on a floor', badSeats === 0 && noConsole === 0 && floorless === 0, `${badSeats} short of seats, ${noConsole} without console, ${floorless} floorless`);
  let hanging = 0;
  for (const p of M.pods[1]) { const [px, py, pz] = local(p.spot); const r = Math.hypot(px - CX, pz - CZ); const ux = (px - CX) / r, uz = (pz - CZ) / r; const fx = Math.round(CX + ux * (G.POD_R[0] + 1)), fz = Math.round(CZ + uz * (G.POD_R[0] + 1)); let airBelow = 0; for (let y = py - 3; y >= py - 6; y--) if (isAir(at(fx, y, fz))) airBelow++; if (airBelow >= 3) hanging++; }
  check('tier pods are cantilevered: air under the front of the middle tier pods', hanging >= 25, `${hanging}/30`);
  const seats = bp.meta.spots.filter((s) => s.kind === 'seat' && Math.hypot(LX(s.x) - CX, LZ(s.z) - CZ) <= G.R_HALL).length;
  check('>= 400 seat spots inside the chamber (W4 seats its session)', seats >= 400, `${seats}`);
  const galleries = G.TIERS.map((y) => [CX + 49, y, CZ]).concat([[CX + 50, G.GALLERY_Y, CZ]]);
  const missing = galleries.filter(([x, y, z]) => !fromDoor.has(x, y, z, 1));
  check('flood fill from the plaza door WITHOUT lifts reaches every tier gallery ring and the public gallery', missing.length === 0, missing.length ? 'missing ' + missing.map((c) => c.join(',')).join(' ') : `${galleries.length} galleries`);
  // ring 1's walk (bins 35..36 behind its pods) sampled every 15 degrees off the cardinals, the four slab bridges
  // that carry it over the tunnels (a slab: the walker stands at y 4 or 5), ring 2's walk and the pit floor
  const ring1 = []; for (let deg = 15; deg < 360; deg += 15) if (deg % 90) { const a = deg * Math.PI / 180; ring1.push([Math.round(CX + Math.cos(a) * 35.5), 3, Math.round(CZ + Math.sin(a) * 35.5)]); }
  const bridges = [[CX + 33, 4, CZ], [CX - 33, 4, CZ], [CX, 4, CZ + 33], [CX, 4, CZ - 33]];
  const bowl = [...ring1, ...bridges, [CX + 39, 6, CZ], [CX + 20, 1, CZ]].filter(([x, y, z]) => !fromDoor.has(x, y, z, 1));
  check('...and the bowl rings and the pit floor', bowl.length === 0, bowl.length ? 'missing ' + bowl.map((c) => c.join(',')).join(' ') : `ring 1 (${ring1.length} samples, 4 tunnel bridges), ring 2, pit`);
}

// ------------------------------------------------------------------------------------------------ 4 dark / floorless
log('\n== 4 Nothing dark, nothing floorless ==');
{
  let unreachable = 0, unlit = 0; const badRooms = [];
  for (const r of bp.meta.rooms) {
    const rx0 = LX(r.x), rz0 = LZ(r.z), ry = LY(r.y), rx1 = rx0 + r.w - 1, rz1 = rz0 + r.d - 1;
    let emit = 0;
    for (let x = rx0 + 1; x < rx1; x++) for (let z = rz0 + 1; z < rz1; z++) for (let y = ry - 1; y <= ry + 4; y++) { const v = at(x, y, z); if (!isAir(v) && blk(v) && blk(v).emit > 0) emit++; }
    const reach = fromDoorLifts.room(r);
    if (!reach) unreachable++;
    if (emit === 0) unlit++;
    if (!reach || emit === 0) badRooms.push(`${r.kind}@${r.x},${r.y},${r.z}`);
  }
  check(`every registered room reachable (${bp.meta.rooms.length} rooms)`, unreachable === 0, badRooms.slice(0, 6).join(' '));
  check('every registered room lit', unlit === 0, `${unlit} unlit`);
  const badSpots = bp.meta.spots.filter((s) => !floorOK(s)), badWork = bp.meta.work.filter((s) => !floorOK(s));
  check('every spot and work record stands on a floor', badSpots.length === 0 && badWork.length === 0, `${badSpots.length} spots, ${badWork.length} work records floorless` + (badWork.length ? ' e.g. ' + badWork.slice(0, 3).map((s) => `${s.kind}@${LX(s.x)},${LY(s.y)},${LZ(s.z)}`).join(' ') : ''));
}

// ------------------------------------------------------------------------------------------------ 5 suites
log('\n== 5 Twelve differentiated delegation suites ==');
{
  const SUITE_KIND = { reception: 'delegation_reception', office: 'executive_office', aides: 'aides_office', records: 'delegation_records', lounge: 'delegation_lounge' };
  const recs = M.delegations;
  check('12 delegation records in bp.meta.senate.delegations, ids match delegations.js', recs.length === 12 && same(recs.map((r) => r.id).sort(), DELEGATIONS.map((d) => d.id).sort()), recs.map((r) => r.id).join(','));
  const badRooms = [], badLift = [], badPod = [], notFromLobby = [], notFromGallery = [], tierWrong = [];
  const galleryFloods = G.TIERS.map((y) => flood([[CX + 49, y, CZ]], { lifts: false }));
  for (const r of recs) {
    for (const [role, kind] of Object.entries(SUITE_KIND)) { const room = r.suite.rooms.find((q) => q.role === role); if (!room || room.kind !== kind) badRooms.push(`${r.id}:${role}`); }
    const lift = bp.meta.lifts.find((l) => l.x === r.suite.lift.x && l.z === r.suite.lift.z);
    if (!lift || lift.y0 > M.levels[0] || lift.y1 < r.suite.y) badLift.push(r.id);
    const [px, py, pz] = local(r.suite.podDoor);
    if (!(passable(at(px, py, pz)) && passable(at(px, py + 1, pz)))) badPod.push(r.id);
    const podR = Math.hypot(LX(r.pod.spot.x) - CX, LZ(r.pod.spot.z) - CZ);
    if (!(podR >= G.POD_R[0] && podR <= G.POD_R[1] + 1) || LY(r.pod.spot.y) !== G.TIERS[r.tier - 1] || r.pod.seats.length < 2) tierWrong.push(r.id);
    const rec = r.suite.rooms.find((q) => q.role === 'reception');
    if (!fromDoorLifts.room(rec)) notFromLobby.push(r.id);
    if (!r.suite.rooms.every((q) => galleryFloods[r.tier - 1].room(q))) notFromGallery.push(r.id);
  }
  check('each suite has reception, senator office, aides room, records and lounge of the right kinds', badRooms.length === 0, badRooms.join(' '));
  check('each suite has its own lift from the grand lobby (y 1) to its tier', badLift.length === 0, badLift.join(' '));
  check('each suite has a private pod door through the chamber wall (open)', badPod.length === 0, badPod.join(' '));
  check('each pod is a wall-tier pod on the suite tier with >= 2 seats', tierWrong.length === 0, tierWrong.join(' '));
  check('each suite reachable from the plaza door / lobby ring (lifts allowed)', notFromLobby.length === 0, notFromLobby.join(' '));
  check('every room of each suite reachable on foot from its tier gallery (pod door, back corridor)', notFromGallery.length === 0, notFromGallery.join(' '));
  let minDiff = 99, pair = '';
  for (let i = 0; i < DELEGATIONS.length; i++) for (let j = i + 1; j < DELEGATIONS.length; j++) { const n = suiteDifferences(DELEGATIONS[i], DELEGATIONS[j]).length; if (n < minDiff) { minDiff = n; pair = `${DELEGATIONS[i].id}/${DELEGATIONS[j].id}`; } }
  check('every pair of suites differs in >= 4 meaningful ways (palette, size, layout, artifact, view, tier, extra room)', minDiff >= 4, `min ${minDiff} (${pair})`);
  const tiers = [1, 2].map((t) => recs.filter((r) => r.tier === t).length);
  check('six suites per tier, one pod each, twelve distinct pods', tiers[0] === 6 && tiers[1] === 6 && new Set(recs.map((r) => `${r.pod.tier}:${r.pod.k}`)).size === 12, tiers.join('/'));
  const palettes = new Set(recs.map((r) => `${r.suite.rooms.length}|${r.palette.wall}|${r.palette.floor}`));
  check('names, senators and emblems are all distinct', new Set(recs.map((r) => r.name)).size === 12 && new Set(recs.map((r) => r.senator)).size === 12 && new Set(recs.map((r) => r.emblem)).size === 12, `${palettes.size} palette/room-count combinations`);
}

// ------------------------------------------------------------------------------------------------ 7, 8 routes
log('\n== 7 / 8 Visitor route and service route ==');
const VISITOR_MATS = new Set([B.SMOOTH_STONE, B.STONE_BRICKS, B.GOLD_BLOCK, B.PLASTER, B.CHROME, B.GLOW_PANEL]);
const SERVICE_MATS = new Set([B.DECK_PLATE, B.PANEL_STRIPE, B.PANEL_BLACK, B.VENT, B.CRATE, B.DURASTEEL_DARK]);
function walkRoute(pts) {
  const broken = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = local(pts[i]), b = local(pts[i + 1]);
    const f = flood([a], { lifts: false, tol: 1 });
    if (!f.has(b[0], b[1], b[2], 1)) broken.push(`${i}->${i + 1} (${pts[i].x},${pts[i].y},${pts[i].z} -> ${pts[i + 1].x},${pts[i + 1].y},${pts[i + 1].z})`);
  }
  return broken;
}
function floorCensus(pts) {
  const hist = new Map();
  for (const p of pts) {
    const [x, y, z] = local(p);
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = -1; dy <= 1; dy++) {
      if (!standing(x + dx, y + dy, z + dz)) continue;
      const feet = at(x + dx, y + dy, z + dz), under = lowStep(feet) ? feet : at(x + dx, y + dy - 1, z + dz);
      hist.set(under, (hist.get(under) || 0) + 1); break;
    }
  }
  const total = [...hist.values()].reduce((a, b) => a + b, 0) || 1;
  const share = (set) => [...hist.entries()].filter(([id]) => set.has(id)).reduce((a, [, n]) => a + n, 0) / total;
  const top = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id, n]) => `${name(id)} ${Math.round(100 * n / total)}%`).join(', ');
  return { visitor: share(VISITOR_MATS), service: share(SERVICE_MATS), top };
}
{
  const V = M.routes.visitor, S = M.routes.service;
  check('visitor route has >= 12 waypoints from the plaza gate (lot edge) to the public gallery (y 26)', V.length >= 12 && LZ(V[0].z) >= d - 3 && LY(V[V.length - 1].y) === G.GALLERY_Y, `${V.length} waypoints`);
  const vb = walkRoute(V);
  check('visitor route walkable end to end without lifts (step 1, drop <= 3, slabs)', vb.length === 0, vb.join('; '));
  check('service route has >= 8 waypoints from the north dock to a delegation pod', S.length >= 8 && LZ(S[0].z) <= CZ - G.SKIN_R[1] && Math.hypot(LX(S[S.length - 1].x) - CX, LZ(S[S.length - 1].z) - CZ) <= G.POD_R[1] + 1, `${S.length} waypoints`);
  const sb = walkRoute(S);
  check('service route walkable end to end without lifts', sb.length === 0, sb.join('; '));
  const cv = floorCensus(V), cs = floorCensus(S);
  check('the two routes read differently underfoot: visitor stone/brick/gold, service deck plate/stripes', cv.visitor > cv.service && cs.service > cs.visitor && cv.visitor >= 0.5 && cs.service >= 0.5, `visitor [${cv.top}] | service [${cs.top}]`);
  const shared = V.filter((p) => S.some((q) => Math.hypot(p.x - q.x, p.z - q.z) < 6 && Math.abs(p.y - q.y) < 3)).length;
  check('the routes are distinct (no shared waypoints)', shared === 0, `${shared} shared`);
  const screening = roomsOfKind('security_screening'), lobby = roomsOfKind('grand_lobby'), dock = roomsOfKind('loading_dock_storage');
  check('visitor route passes the security screening and the grand lobby; service route the loading dock', screening.length === 1 && V.some((p) => inRoom(screening[0], p)) && lobby.length === 4 && V.some((p) => lobby.some((r) => inRoom(r, p))) && dock.length === 1 && S.some((p) => inRoom(dock[0], p)));
}

// ------------------------------------------------------------------------------------------------ 9 guards
log('\n== 9 Senate Guard posts ==');
{
  const guards = bp.meta.work.filter((r) => r.kind === 'guard').map((r) => ({ x: LX(r.x), y: LY(r.y), z: LZ(r.z) }));
  const zone = (f) => guards.filter(f).length;
  const avenue = zone((g) => g.y === 1 && g.z > CZ + G.SKIN_R[1]);
  const screening = zone((g) => g.y === 1 && Math.abs(g.x - CX) <= 6 && g.z >= CZ + 57 && g.z <= CZ + 66);
  const vestE = zone((g) => g.y === 1 && g.x - CX >= 60 && Math.abs(g.z - CZ) <= 6), vestW = zone((g) => g.y === 1 && CX - g.x >= 60 && Math.abs(g.z - CZ) <= 6);
  const dock = zone((g) => g.y === 1 && Math.abs(g.x - CX) <= 8 && CZ - g.z >= 57 && CZ - g.z <= 66);
  const chancellor = zone((g) => g.y === 21 && Math.hypot(g.x - CX, g.z - CZ) >= 62 && g.z < CZ - 30);
  const tiers = G.TIERS.map((y) => zone((g) => g.y === y && Math.hypot(g.x - CX, g.z - CZ) >= 56 && Math.hypot(g.x - CX, g.z - CZ) <= 62));
  check('>= 12 guard work records', guards.length >= 12, `${guards.length}`);
  check('guards at the avenue (>= 2), the security screening (>= 2), both vestibules, the dock, the Chancellor door, every tier gallery entrance', avenue >= 2 && screening >= 2 && vestE >= 1 && vestW >= 1 && dock >= 1 && chancellor >= 1 && tiers.every((n) => n >= 1), `avenue ${avenue}, screening ${screening}, vestibules ${vestE}/${vestW}, dock ${dock}, chancellor ${chancellor}, tiers ${tiers.join('/')}`);
  const roles = new Set(bp.meta.work.map((r) => r.kind));
  check('the chamber staff: chancellor, clerk (petition desk), executive (senator offices), stock (dock), deck officer', ['chancellor', 'clerk', 'executive', 'stock', 'deck officer'].every((k) => roles.has(k)), [...roles].join(','));
}

// ================================================================================================ scenarios
log('\n== 11 Three original policy scenarios ==');
{
  check('three scenarios: infrastructure, customs, portfees', same(SCENARIOS.map((s) => s.id), ['infrastructure', 'customs', 'portfees']));
  const ids = DELEGATIONS.map((d) => d.id);
  let bad = [];
  for (const s of SCENARIOS) {
    const keys = Object.keys(s.positions);
    if (keys.length !== 12 || !same(keys.slice().sort(), ids.slice().sort())) bad.push(s.id + ':positions');
    for (const [id, [pos, reason]] of Object.entries(s.positions)) { if (!['for', 'against', 'undecided'].includes(pos)) bad.push(`${s.id}:${id}:pos`); if (!reason || reason.length > 120) bad.push(`${s.id}:${id}:reason`); }
    if (!s.title || !s.question || !s.summary || !s.sponsor || !s.positions[s.sponsor] || s.positions[s.sponsor][0] !== 'for') bad.push(s.id + ':sponsor');
    if (!s.firm.every((id) => s.positions[id])) bad.push(s.id + ':firm');
    if (Math.abs(s.bloc.for + s.bloc.against + s.bloc.undecided - 1) > 1e-9 || s.bloc.size !== BLOC_SIZE) bad.push(s.id + ':bloc');
    if (!s.headline.pass || !s.headline.fail || !s.effects.pass || !s.effects.fail) bad.push(s.id + ':effects');
  }
  check('every scenario: 12 positions (for / against / undecided), one-line reasons <= 120 chars, a sponsor who is for, firm ids valid, bloc lean sums to 1', bad.length === 0, bad.join(' '));
  const inf = SCENARIOS[0], cus = SCENARIOS[1], pf = SCENARIOS[2];
  check('effects as specified: infrastructure { publicFunds, service: lift }, customs { detentionRate }, portfees { landingFee, portCapacity }',
    inf.effects.pass.service === 'lift' && inf.effects.pass.publicFunds > 0 && inf.effects.fail.publicFunds === 0 && typeof cus.effects.pass.detentionRate === 'number' && cus.effects.pass.detentionRate > cus.effects.fail.detentionRate && pf.effects.pass.landingFee > pf.effects.fail.landingFee && pf.effects.pass.portCapacity === 2 && pf.effects.fail.portCapacity === 0);
  // hand-computed tallies
  let mismatch = [];
  for (const s of SCENARIOS) {
    const ind = { for: 0, against: 0, undecided: 0 };
    for (const [, [pos]] of Object.entries(s.positions)) ind[pos]++;
    const bFor = Math.round(BLOC_SIZE * s.bloc.for), bAg = Math.round(BLOC_SIZE * s.bloc.against), swing = BLOC_SIZE - bFor - bAg;
    const bloc = { for: bFor, against: bAg, undecided: 0 };
    if (ind.for > ind.against) bloc.for += swing; else if (ind.against > ind.for) bloc.against += swing; else bloc.undecided += swing;
    const t = vote(s);
    if (!same(t.individual, ind) || t.bloc.for !== bloc.for || t.bloc.against !== bloc.against || t.bloc.undecided !== bloc.undecided) mismatch.push(s.id);
    if (t.total.for !== ind.for + bloc.for || t.total.against !== ind.against + bloc.against || t.total.undecided !== ind.undecided + bloc.undecided) mismatch.push(s.id + ':total');
    if (t.pass !== (t.total.for > t.total.against)) mismatch.push(s.id + ':pass');
  }
  check('vote() tallies match the hand-computed sums; pass iff for > against', mismatch.length === 0, SCENARIOS.map((s) => { const t = vote(s); return `${s.id} ${t.total.for}-${t.total.against}-${t.total.undecided} ${t.pass ? 'pass' : 'fail'}`; }).join(' | '));
  const outcomes = SCENARIOS.map((s) => vote(s).pass);
  check('the three baseline outcomes are not all the same (something passes, something fails)', new Set(outcomes).size === 2, outcomes.join(','));
}

log('\n== 12 Bounded, deterministic influence ==');
{
  const s = SCENARIOS[0];
  const logA = [];
  const push = (delegation, delta, cause) => logA.push({ scenario: s.id, delegation, delta, cause });
  push('sennet', 3, 'evidence'); push('sennet', 3, 'evidence'); push('sennet', 3, 'petition'); push('sennet', 3, 'favour');
  const sum = influenceSum(logA, s.id, 'sennet', false);
  check(`influence is clamped: evidence cap ${INFLUENCE_CAPS.evidence}, petition ${INFLUENCE_CAPS.petition}, favour ${INFLUENCE_CAPS.favour}, total ${INFLUENCE_TOTAL_CAP}`, sum === INFLUENCE_TOTAL_CAP, `sum ${sum}`);
  check('an undecided delegation swings one step with a small push (dhessen: undecided -> for with +1 evidence, -> against with -1)', positionOf(s, 'dhessen') === 'undecided' && positionOf(s, 'dhessen', [{ scenario: s.id, delegation: 'dhessen', delta: 1, cause: 'evidence' }]) === 'for' && positionOf(s, 'dhessen', [{ scenario: s.id, delegation: 'dhessen', delta: -1, cause: 'evidence' }]) === 'against');
  const firm = s.firm[0];
  const big = [{ scenario: s.id, delegation: firm, delta: 3, cause: 'evidence' }, { scenario: s.id, delegation: firm, delta: 3, cause: 'petition' }, { scenario: s.id, delegation: firm, delta: 3, cause: 'favour' }];
  check(`a firm delegation (${firm}) moves at most ${INFLUENCE_FIRM_CAP}: stays against under maximal pressure`, positionOf(s, firm, big) === 'against' && influenceSum(big, s.id, firm, true) === INFLUENCE_FIRM_CAP);
  check('one conversation never flips a decided delegation (veth against: +1 favour -> still against; needs evidence + petition to reach undecided)', positionOf(s, 'veth', [{ scenario: s.id, delegation: 'veth', delta: 1, cause: 'favour' }]) === 'against' && positionOf(s, 'veth', [{ scenario: s.id, delegation: 'veth', delta: 2, cause: 'evidence' }]) === 'undecided' && positionOf(s, 'veth', [{ scenario: s.id, delegation: 'veth', delta: 2, cause: 'evidence' }, { scenario: s.id, delegation: 'veth', delta: 1, cause: 'petition' }]) === 'for');
  const t1 = vote(s, logA), t2 = vote(s, JSON.parse(JSON.stringify(logA)));
  check('the tally is a pure function of the influence log (replay gives the identical tally)', same(t1, t2) && t1.byDelegation.sennet === 'for');
  const before = vote(s), after = vote(s, [{ scenario: s.id, delegation: 'dhessen', delta: 1, cause: 'evidence' }, { scenario: s.id, delegation: 'sennet', delta: 1, cause: 'evidence' }]);
  check('an undecided swing is visible in vote(): individual for rises, the bloc swing follows the floor', after.individual.for === before.individual.for + 2 && after.total.for > before.total.for, `${before.total.for}-${before.total.against} -> ${after.total.for}-${after.total.against}`);
  check('influence on another scenario leaves this one alone', same(vote(s, [{ scenario: 'customs', delegation: 'dhessen', delta: 3, cause: 'evidence' }]), before));
}

log('\n== 13 Which votes are simulated ==');
{
  let ok = true;
  for (const s of SCENARIOS) { const t = vote(s); for (const k of ['for', 'against', 'undecided']) if (t.individual[k] + t.bloc[k] !== t.total[k]) ok = false; if (t.individual.for + t.individual.against + t.individual.undecided !== 12 || t.bloc.for + t.bloc.against + t.bloc.undecided !== BLOC_SIZE) ok = false; }
  check('tally.individual + tally.bloc = tally.total; 12 individual votes + a bloc of 88 = 100 delegations', ok);
  check('the bloc weight and lean are published in every scenario record', SCENARIOS.every((s) => s.bloc.size === BLOC_SIZE && typeof s.bloc.for === 'number' && typeof s.bloc.against === 'number'));
}

// ================================================================================================ sessions
log('\n== 10 Sessions on a schedule ==');
function drive(sim, days = 3, step = 0.05) {
  const out = [];
  for (let t = 0; t < 24 * days; t = +(t + step).toFixed(4)) {
    const hour = t % 24;
    for (const tr of sim.advance(hour)) out.push({ hour: +hour.toFixed(2), ...tr, tally: tr.tally ? `${tr.tally.total.for}-${tr.tally.total.against}` : undefined, result: tr.result ? tr.result.outcome : undefined });
    const sp = sim.speakerDue(hour); if (sp) out.push({ hour: +hour.toFixed(2), speaker: sp.delegation });
  }
  return out;
}
{
  const a = drive(new SenateSim(seed)), b = drive(new SenateSim(seed));
  check('three game days driven twice with the same seed give identical event sequences', same(a, b), `${a.length} events`);
  const transitions = a.filter((e) => e.state);
  const perSession = 5 * SESSION_SLOTS.length * 3;
  check(`two sessions a day: ${perSession} transitions over 3 days, in the order convening -> session -> vote -> adjourned -> recess`, transitions.length === perSession && transitions.every((e, i) => e.state === ['convening', 'session', 'vote', 'adjourned', 'recess'][i % 5]), `${transitions.length}`);
  const scen = transitions.filter((e) => e.state === 'convening').map((e) => e.scenario);
  check('the three scenarios rotate across sessions', same(scen.slice(0, 3), ['infrastructure', 'customs', 'portfees']) && scen[3] === 'infrastructure', scen.join(','));
  const speakers = a.filter((e) => e.speaker);
  check('speaker lines during the session state: every delegation speaks once per session', speakers.length === 12 * 6 && new Set(speakers.slice(0, 12).map((e) => e.speaker)).size === 12, `${speakers.length} lines`);
  check('the speaking order differs between sessions (seeded)', !same(speakers.slice(0, 12).map((e) => e.speaker), speakers.slice(12, 24).map((e) => e.speaker)));
  check('a different seed gives a different speaking order but the same transitions', !same(drive(new SenateSim(1)).filter((e) => e.speaker), speakers) && same(drive(new SenateSim(1)).filter((e) => e.state).map((e) => [e.hour, e.state, e.scenario]), transitions.map((e) => [e.hour, e.state, e.scenario])));
  // re-entry: a fresh machine sampled at any hour lands in the state the clock says
  let wrong = [];
  for (let hh = 0; hh < 24; hh += 0.25) { const s = new SenateSim(seed); s.advance(hh); if (s.state !== phaseAt(hh).state) wrong.push(hh); }
  check('re-entry at any hour restores the state the clock says', wrong.length === 0, wrong.join(','));
  // a clock jump never skips states
  const j = new SenateSim(seed); j.advance(9.6); const jumped = j.advance(14).map((e) => e.state);
  check('a clock jump from mid-session to recess still emits vote, adjourned, recess', same(jumped, ['vote', 'adjourned', 'recess']), jumped.join(','));
  const j2 = new SenateSim(seed); j2.advance(9.6); const jumped2 = j2.advance(15.6).map((e) => e.state);
  check('...and into the next session: the old session closes, the new one opens', same(jumped2, ['vote', 'adjourned', 'recess', 'convening', 'session']), jumped2.join(','));
  // save mid-session, restore, continue: the same remaining transitions
  const s1 = new SenateSim(seed); const all1 = []; for (let hh = 8; hh <= 13; hh += 0.05) for (const tr of s1.advance(+hh.toFixed(2))) all1.push(tr.state);
  const s2 = new SenateSim(seed); const all2 = []; for (let hh = 8; hh <= 10.4; hh += 0.05) for (const tr of s2.advance(+hh.toFixed(2))) all2.push(tr.state);
  const s3 = new SenateSim(seed); s3.restore(JSON.parse(JSON.stringify(s2.serialize()))); for (let hh = 10.45; hh <= 13; hh += 0.05) for (const tr of s3.advance(+hh.toFixed(2))) all2.push(tr.state);
  check('serialize mid-session -> restore -> continue yields the same transitions as an uninterrupted run', same(all1, all2) && s3.lastResult && s3.lastResult.scenario === s1.lastResult.scenario, all2.join(','));
  check('phaseAt / hoursToNextSession: 08:59 recess (1 min to go), 09:00 convening, 09:30 session, 11:30 vote, 11:45 adjourned, 12:15 recess', phaseAt(8.99).state === 'recess' && Math.abs(hoursToNextSession(8.99) - 0.01) < 1e-6 && phaseAt(9).state === 'convening' && phaseAt(9.5).state === 'session' && phaseAt(11.5).state === 'vote' && phaseAt(11.75).state === 'adjourned' && phaseAt(12.25).state === 'recess' && phaseAt(15).state === 'convening');
  check('PHASES / STATES exported in the machine order', same(PHASES.map((p) => p[0]), ['convening', 'session', 'vote', 'adjourned', 'recess']) && same(STATES, ['recess', 'convening', 'session', 'vote', 'adjourned']));
}

// ================================================================================================ the runtime class
log('\n== 14 / 16 / 17 Runtime: events only, persistence, cast places, result text ==');
const fakeGame = (time = 0.5) => ({ coruscant: { layout }, player: { pos: { x: 0, y: 0, z: 0 } }, events: new EventBus(), sky: { time }, save: null, dialog: null });
{
  const files = readdirSync(new URL('../src/senate/', import.meta.url)).filter((f) => f.endsWith('.js'));
  const bad = [], rnd = [];
  for (const f of files) {
    const src = readFileSync(new URL('../src/senate/' + f, import.meta.url), 'utf8');
    for (const m of src.matchAll(/from\s+'([^']+)'/g)) if (/\/(economy|npc|factions|surprise)\//.test(m[1]) || /^\.\.\/(economy|npc|factions)/.test(m[1])) bad.push(`${f}: ${m[1]}`);
    if (/Math\.random/.test(src)) rnd.push(f);
  }
  check(`src/senate/** never imports the economy, factions or NPC modules (${files.length} files scanned)`, bad.length === 0, bad.join(' '));
  check('no Math.random in src/senate/** or the Senate landmark', rnd.length === 0 && !/Math\.random/.test(readFileSync(new URL('../src/coruscant/landmarks/senate.js', import.meta.url), 'utf8')), rnd.join(','));
  const g = fakeGame(8.5 / 24);
  const senate = new Senate(g);
  const seen = [];
  g.events.on('senate:session', (e) => seen.push(['session', e.state, e.scenario]));
  g.events.on('senate:vote', (e) => seen.push(['vote', e.scenario, e.tally && e.tally.total ? 'tally' : 'no-tally']));
  g.events.on('senate:result', (e) => seen.push(['result', e.scenario, e.outcome, e.headline ? 'headline' : 'no-headline', e.effects ? 'effects' : 'no-effects']));
  let now = 1000;
  const step = (hour) => { g.sky.time = hour / 24; now += 300; senate.tick(now); };
  step(8.5); step(9.1); step(10); step(11.6); step(11.9); step(12.5);
  check('the runtime emits senate:session at each transition, senate:vote at the vote, senate:result (headline, effects) at adjournment', same(seen, [['session', 'convening', 'infrastructure'], ['session', 'session', 'infrastructure'], ['session', 'vote', 'infrastructure'], ['vote', 'infrastructure', 'tally'], ['session', 'adjourned', 'infrastructure'], ['result', 'infrastructure', vote(SCENARIOS[0]).pass ? 'pass' : 'fail', 'headline', 'effects'], ['session', 'recess', 'infrastructure']]), JSON.stringify(seen));
  check('resultText() gives a one-line headline with the count after the vote (empty before)', senate.resultText().length > 10 && /\d+-\d+\)$/.test(senate.resultText()) && new Senate(fakeGame()).resultText() === '', senate.resultText());
  check('game.events.recent("senate:") holds the chain for tests and screens', g.events.recent('senate:').map((e) => e.name).includes('senate:result'));
  const sp = g.events.recent('senate:speaker');
  check('speaker lines are announced on the bus during the session (subtitle fallback when game.dialog is absent)', sp.length >= 1 && senate.speakerLine && typeof senate.speakerLine.line === 'string');
  // the payload names the speaker and the line is the spoken sentence (world, stance, reason) — a box or subtitle
  // that shows the speaker never reads the name twice
  const spk = sp.map((e) => e.args[0]);
  check('senate:speaker carries { delegation, senator, world, position, line } and the line does not start with the senator\'s name', spk.length >= 1 && spk.every((e) => e.delegation && e.senator && e.world && /^(for|against|undecided)$/.test(e.position) && typeof e.line === 'string' && e.line.startsWith(e.world) && !e.line.startsWith(e.senator) && /stands for the measure|stands against the measure|has not decided/.test(e.line)), spk.length ? `${spk[0].senator}: "${spk[0].line}"` : 'no speaker events');
  // influence through the runtime, then serialize / restore round trip
  const pos0 = senate.positions('customs').tyrell.position;
  const pos1 = senate.influence('customs', 'tyrell', 1, 'evidence');
  check('influence() moves an undecided delegation one step and emits senate:influence', pos0 === 'undecided' && pos1 === 'for' && g.events.recent('senate:influence').length === 1);
  let threw = false; try { senate.influence('customs', 'tyrell', 1, 'bribe'); } catch (e) { threw = true; }
  check('unknown influence causes are rejected', threw);
  const data = JSON.parse(JSON.stringify(senate.serialize()));
  const g2 = fakeGame(12.5 / 24); g2.save = { senate: data };
  const senate2 = new Senate(g2);
  check('serialize -> restore round trip (via save.senate) preserves the state, the influence log and the results', senate2.state === senate.state && same(senate2.sim.influence, senate.sim.influence) && same(senate2.results(), senate.results()) && senate2.resultText() === senate.resultText() && senate2.lastResult.headline === senate.lastResult.headline);
  check('persist() falls back to nothing harmful without save.setSenate / localStorage (no throw)', (() => { try { senate.persist(); return true; } catch (e) { return false; } })());
  // cast places
  const cast = senate.castPlaces();
  const std = (p) => p && floorOK(p);
  check('castPlaces(): Senator Merin (kessar) with her office and pod, Ilen Rook at the petition desk, Seran Vale at the liaison alcove — all standable', cast && cast.merin && cast.merin.delegation === 'kessar' && cast.merin.office && cast.merin.office.kind === 'executive_office' && std(cast.merin.pod) && std(cast.merin.entry) && cast.rook && std(cast.rook.desk) && cast.rook.room.kind === 'petition_office' && cast.vale && std(cast.vale.spot) && cast.vale.room.kind === 'liaison_lounge', cast ? `merin office ${cast.merin.office.x},${cast.merin.office.y},${cast.merin.office.z}; rook ${cast.rook.desk.x},${cast.rook.desk.z}; vale ${cast.vale.spot.x},${cast.vale.spot.z}` : 'null');
  check('the petition desk has a clerk work record beside its console', bp.meta.work.some((r) => r.kind === 'clerk' && r.x === cast.rook.desk.x && r.z === cast.rook.desk.z));
  check('schedule(): two sessions with convening / session / vote / adjourned / recess hours', senate.schedule().length === 2 && senate.schedule()[0].convening === 9 && senate.schedule()[1].vote === 17.5);
  check('seatsFor(id) returns the pod seats of a delegation; podSeats() all wall-tier seats', senate.seatsFor('kessar').length >= 2 && senate.podSeats().length >= 180 && senate.seatsFor('nobody').length === 0);
  const pos = senate.positions('infrastructure');
  check('positions(scenario) exposes position, reason and firmness for every delegation', Object.keys(pos).length === 12 && pos.talvane.firm === true && pos.kessar.position === 'for' && pos.kessar.reason.length > 0);
}

// ------------------------------------------------------------------------------------------------ 15 liaison
log('\n== 15 Jedi liaison ==');
{
  const g = fakeGame();
  const senate = new Senate(g);
  const spot = senate.liaisonSpot();
  const room = roomsOfKind('liaison_lounge')[0];
  check('liaisonSpot() is standable and inside the registered liaison_lounge room, next to the chamber (inner band)', spot && floorOK(spot) && room && inRoom(room, spot) && Math.hypot(LX(spot.x) - CX, LZ(spot.z) - CZ) < G.R_HALL, spot ? `${spot.x},${spot.y},${spot.z}` : 'null');
  const [sx, sy, sz] = local(spot);
  const f = flood([[sx, sy, sz]], { lifts: false });
  check('from the alcove the liaison can step straight into the chamber (bowl ring 2 reachable without lifts)', f.has(CX + 39, 6, CZ, 1) || f.has(CX - 39, 6, CZ, 1) || f.has(CX, 6, CZ + 39, 1) || f.has(CX, 6, CZ - 39, 1));
  const route = senate.liaisonRoute();
  check('liaisonRoute() returns waypoints, the schedule (when) and the spot', route && route.waypoints.length >= 6 && route.when.length === SESSION_SLOTS.length && same(route.spot, spot), route ? `${route.waypoints.length} waypoints` : 'null');
  const temple = layout.lots.find((l) => l.kind === 'landmark' && l.family === 'temple');
  const GG = groundGrid(layout);
  const inLot = (p, l) => p.x >= l.x0 && p.x <= l.x1 + 2 && p.z >= l.z0 && p.z <= l.z1 + 2;
  const off = route.waypoints.filter((p) => !(onLayout(layout, p.x, p.z, GG) || inLot(p, lot) || inLot(p, temple)));
  check('every waypoint is on a street or a lot cell of the layout', off.length === 0, off.length ? off.slice(0, 4).map((p) => `${p.x},${p.z}`).join(' ') : `${route.waypoints.length} on the layout`);
  let maxGap = 0; for (let i = 0; i + 1 < route.waypoints.length; i++) maxGap = Math.max(maxGap, Math.hypot(route.waypoints[i].x - route.waypoints[i + 1].x, route.waypoints[i].z - route.waypoints[i + 1].z));
  check('consecutive waypoints <= 80 blocks apart', maxGap <= 80, `max ${maxGap.toFixed(1)}`);
  check('the route starts at the Jedi Temple gate and ends at the alcove', route.waypoints[0].label === 'Jedi Temple gate' && Math.abs(route.waypoints[0].x - temple.door.out.x) <= 1 && same(route.waypoints[route.waypoints.length - 1], spot));
  const inLotPts = M.liaison.route;
  const broken = walkRoute(inLotPts);
  check('the in-lot part (forecourt -> east entry -> lobby -> east stairs -> level-6 passage -> alcove) is walkable without lifts', broken.length === 0, broken.join('; ') || `${inLotPts.length} waypoints`);
  const streetPts = route.waypoints.filter((p) => !inLot(p, lot) && !inLot(p, temple));
  check('the street part is real streets (>= 3 waypoints on the ground grid between the two lots)', streetPts.length >= 3 && streetPts.every((p) => onLayout(layout, p.x, p.z, GG)), `${streetPts.length} street waypoints`);
  check('the schedule says when the liaison is due (arrive before convening, leave after recess)', route.when.every((wn, i) => wn.arrive < SESSION_SLOTS[i] && wn.leave > SESSION_SLOTS[i] + PHASES[PHASES.length - 1][1]));
}

// ================================================================================================ 19, 20
log('\n== 19 / 20 Budget, determinism, room kinds ==');
{
  check('blueprint build <= 80 ms (1.5 x the 53 ms baseline; min of 5 warm builds)', buildMs <= 80, `${buildMs.toFixed(1)} ms, all: ${times.map((t) => t.toFixed(0)).join('/')}`);
  check('deterministic: two builds are hash-identical', hashBlocks(bpA.blocks) === hashBlocks(bp.blocks));
  const kinds = [...new Set(bp.meta.rooms.map((r) => r.kind))];
  const w4 = ['convocation_chamber', 'chancellor_podium', 'vestibule', 'senators_lounge', 'hearing_chamber', 'press_office', 'archive', 'guard_post', 'chancellor_office'];
  check('the room kinds W4 staffs stay registered', w4.every((k) => kinds.includes(k)), w4.filter((k) => !kinds.includes(k)).join(',') || `${kinds.length} kinds`);
  const fn = (k) => roomFunction(k).base;
  check('new kinds resolve to sensible staffing functions (reception -> lobby, senator office -> executive_office, lounge -> lounge, records -> archive-like, liaison -> lounge, chamber -> council_chamber)',
    fn('delegation_reception') === 'lobby_atrium' && fn('executive_office') === 'executive_office' && fn('delegation_lounge') === 'lounge' && ['archive', 'records_office', 'library', 'office'].some((b) => fn('delegation_records').includes(b.split('_')[0])) && fn('convocation_chamber') === 'council_chamber' && fn('chancellor_podium') === 'council_chamber' && fn('liaison_lounge') === 'lounge',
    ['delegation_reception', 'aides_office', 'delegation_records', 'delegation_lounge', 'liaison_lounge', 'petition_office', 'security_screening', 'loading_dock_storage'].map((k) => `${k}->${fn(k)}`).join(' '));
  check('lot footprint respected (167 x 175 or larger, drum inside)', w >= 160 && d >= 170 && CX + G.R_DRUM < w && CZ + G.R_DRUM < d);
}

// ================================================================================================ CDP
if (base) {
  log('\n== CDP: plaques, session board, the vote on the bus ==');
  mkdirSync(shots, { recursive: true });
  const { launchPage } = await import('./cdp.mjs');
  const m = M;
  const inward = (p) => { const dx = m.centre.x + 0.5 - (p.x + 0.5), dz = m.centre.z + 0.5 - (p.z + 0.5), r = Math.hypot(dx, dz); return { x: p.x + Math.round(2.5 * dx / r), z: p.z + Math.round(2.5 * dz / r) }; };
  const kessar = m.delegations.find((r) => r.id === 'kessar'), second = m.delegations.find((r) => r.id === 'talvane');
  const k0 = inward(kessar.suite.entry), s0 = inward(second.suite.entry);
  const url = `${base}/?x=${k0.x + 0.5}&y=${kessar.suite.y}&z=${k0.z + 0.5}&yaw=0&pitch=0&fly=1&time=${(10.2 / 24).toFixed(4)}&quality=light&rd=8`;
  const page = await launchPage(url, { width: 1280, height: 800 });
  try {
    await page.waitForGame();
    await page.evaluate('game.input.locked = true; game.input.onLockChange = null; "ok"');
    // the runtime: the integrated one (game.senate) or, until game.js wires it, installed here the same way
    const installed = await page.evaluate(`(async () => { if (!window.game.senate) { const mod = await import('/src/senate/senate.js'); window.game.senate = new mod.Senate(window.game); window.__senateTimer = setInterval(() => window.game.senate.tick(), 250); return 'installed'; } return 'integrated'; })()`);
    log(`senate runtime: ${installed}`);
    await page.sleep(1500);
    const look = (x, y, z, yawDeg, pitchDeg) => page.evaluate(`game.player.teleport(${x}, ${y}, ${z}); game.player.yaw = ${yawDeg} * Math.PI / 180; game.player.pitch = ${pitchDeg} * Math.PI / 180; game.player.allowFlight = true; game.player.flying = true; "ok"`);
    const yawTo = (from, to) => Math.atan2(-(to.x - from.x), -(to.z - from.z)) * 180 / Math.PI;   // yaw 0 faces -z
    // suite 1: Kessar Reach reception
    await look(k0.x + 0.5, kessar.suite.y, k0.z + 0.5, yawTo(k0, { x: m.centre.x, z: m.centre.z }), 0);
    await page.sleep(6000);
    const p1 = JSON.parse(await page.evaluate(`JSON.stringify({ suite: game.senate.suiteAt() && game.senate.suiteAt().id, plaque: game.senate.ui ? game.senate.ui.plaqueText() : null, board: game.senate.ui ? game.senate.ui.boardText().slice(0, 80) : null, hidden: game.senate.ui ? game.senate.ui.plaque.hidden : null })`));
    check('teleported into the Kessar Reach reception: suiteAt() names the suite and the plaque reads the name, the senator and a position', p1.suite === 'kessar' && p1.plaque && p1.plaque.includes(kessar.name) && p1.plaque.includes(kessar.senator) && /for|against|undecided/.test(p1.plaque), (p1.plaque || '').slice(0, 140));
    check('the session board is visible inside a suite', !!p1.board && p1.board.includes('Galactic Senate'), p1.board || '');
    await page.screenshot(`${shots}/p4_suite_kessar_plaque.png`);
    // suite 2
    await look(s0.x + 0.5, second.suite.y, s0.z + 0.5, yawTo(s0, { x: m.centre.x, z: m.centre.z }), 0);
    await page.sleep(6000);
    const p2 = JSON.parse(await page.evaluate(`JSON.stringify({ suite: game.senate.suiteAt() && game.senate.suiteAt().id, plaque: game.senate.ui ? game.senate.ui.plaqueText() : null })`));
    check(`teleported into the ${second.name} reception: a different plaque (name, senator, palette)`, p2.suite === second.id && p2.plaque && p2.plaque.includes(second.name) && p2.plaque.includes(second.senator) && p2.plaque !== p1.plaque, (p2.plaque || '').slice(0, 140));
    await page.screenshot(`${shots}/p4_suite_talvane_plaque.png`);
    // the chamber during a session: the board
    const gx = m.centre.x + 49, gz = m.centre.z + 2;
    await page.evaluate(`game.sky.time = ${(10.3 / 24).toFixed(5)}; "ok"`);
    await look(gx + 0.5, m.galleryY + 0.2, gz + 0.5, yawTo({ x: gx, z: gz }, { x: m.centre.x, z: m.centre.z }), 8);
    await page.sleep(7000);
    const b1 = JSON.parse(await page.evaluate(`JSON.stringify({ inChamber: game.senate.inChamber(), state: game.senate.state, board: game.senate.ui ? game.senate.ui.boardText() : null, hidden: game.senate.ui ? game.senate.ui.board.hidden : null, scenario: game.senate.scenario && game.senate.scenario.title })`));
    check('in the public gallery during a session: inChamber(), state "session", the board shows the scenario title, the tally and the individual / bloc split', b1.inChamber && b1.state === 'session' && !b1.hidden && b1.board && b1.board.includes(b1.scenario) && /vote individually/.test(b1.board) && /Bloc of 88/.test(b1.board) && /For \d+/.test(b1.board), (b1.board || '').slice(0, 200));
    await page.screenshot(`${shots}/p4_session_board_chamber.png`);
    // the vote and the result on the bus
    await page.evaluate(`game.sky.time = ${(11.55 / 24).toFixed(5)}; "ok"`);
    await page.sleep(900);
    await page.evaluate(`game.sky.time = ${(11.85 / 24).toFixed(5)}; "ok"`);
    await page.sleep(900);
    const b2 = JSON.parse(await page.evaluate(`JSON.stringify({ state: game.senate.state, names: game.events.recent('senate:').map((e) => e.name), result: game.events.recent('senate:result').map((e) => e.args[0]), text: game.senate.resultText(), board: game.senate.ui ? game.senate.ui.boardText() : null })`));
    check('advancing the clock through the vote: game.events.recent("senate:") receives senate:vote then senate:result with headline and effects', b2.names.includes('senate:vote') && b2.names.includes('senate:result') && b2.result.length === 1 && b2.result[0].headline && b2.result[0].effects && b2.result[0].tally, b2.names.join(','));
    check('resultText() is a headline for screens elsewhere; the board shows the result', b2.text.length > 10 && b2.state === 'adjourned' && /PASSED|FAILED/.test(b2.board || ''), b2.text);
    await page.screenshot(`${shots}/p4_session_board_result.png`);
    const errors = page.exceptions.filter((e) => !/ResizeObserver/.test(e));
    check('no uncaught exceptions in the page', errors.length === 0, errors.slice(0, 2).join(' | '));
  } finally { page.close(); }
}

log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
