// Stable-ID scope manifest (docs/overhaul/SPEC.md section 2): every reachable Coruscant building, its rooms, doors and
// purpose; spaceports and pads; ships in the traffic model; landmarks; the frontier town's named NPCs. Offline and
// deterministic - it runs the same generators the game runs. Writes docs/overhaul/manifest.json and manifest.md.
//   node scripts/manifest.mjs [--out docs/overhaul]
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { initBlocks } from '../src/blocks.js';
import { getLayout } from '../src/coruscant/layout.js';
import { blueprintFor } from '../src/coruscant/buildings.js';
import { purposeFor } from '../src/coruscant/purposes.js';
import { SPACEPORT, FRONTIER } from '../src/coruscant/spaceport.js';
import { buildShips } from '../src/ships/traffic.js';

const args = process.argv.slice(2);
const outDir = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'docs/overhaul';
mkdirSync(outDir, { recursive: true });
if (initBlocks) initBlocks();

const layout = getLayout(1337);
const t0 = performance.now();
const buildings = [];
let roomTotal = 0, roomKinds = new Map(), doorTotal = 0, buildFail = 0;
for (const lot of layout.lots) {
  if (lot.kind !== 'tower' && lot.kind !== 'landmark') continue;
  let bp = null;
  try { bp = blueprintFor(lot, layout); } catch (e) { buildFail++; }
  const m = bp ? bp.meta : null;
  const p = purposeFor(lot, layout);
  const rooms = m ? m.rooms : [];
  for (const r of rooms) roomKinds.set(r.kind, (roomKinds.get(r.kind) || 0) + 1);
  roomTotal += rooms.length;
  const doors = m ? m.doors : [];
  doorTotal += doors.length;
  buildings.push({
    id: `lot:${lot.id}`, kind: lot.kind, family: lot.family, district: lot.district, name: p.name, purpose: p.kind, category: p.category,
    rect: { x0: lot.x0, z0: lot.z0, x1: lot.x1, z1: lot.z1 }, height: lot.height,
    doors: doors.map((d) => ({ x: d.x, y: d.y, z: d.z, side: d.side || null })),
    lobby: m && m.lobby ? m.lobby : null, floors: m ? (m.floors || []).length : 0,
    rooms: rooms.length, roomKinds: [...new Set(rooms.map((r) => r.kind))].sort(),
    workSpots: m ? m.work.length : 0, seats: m ? m.spots.length : 0, beds: m ? m.beds.length : 0, lifts: m ? m.lifts.length : 0,
    status: bp ? 'generated' : 'BUILD FAILED', problems: [],
  });
}
const buildMs = performance.now() - t0;

// spaceports, pads, ships
const pads = SPACEPORT.pads.map((p, i) => ({ id: `pad:coruscant:${i}`, x: p.x, z: p.z, half: SPACEPORT.padHalf, port: 'coruscant' }));
const frontierPads = (FRONTIER.pads || (FRONTIER.pad ? [FRONTIER.pad] : [])).map((p, i) => ({ id: `pad:frontier:${i}`, x: p.x, z: p.z, port: 'frontier' }));
let ships = [];
try {
  const built = buildShips(SPACEPORT.pads, 97, FRONTIER, layout);
  ships = built.map((s, i) => ({ id: `ship:${i}`, type: s.type, kind: s.kind || null, pad: s.pad ?? null, boardable: false, interior: false }));
} catch (e) { ships = [{ id: 'ship:?', error: String(e.message) }]; }
const ports = [
  { id: 'port:coruscant', name: 'Coruscant spaceport (Westport)', rect: { x0: SPACEPORT.x0, z0: SPACEPORT.z0, x1: SPACEPORT.x1, z1: SPACEPORT.z1 }, pads: pads.length, hangar: !!SPACEPORT.hangar, tower: !!SPACEPORT.tower },
  { id: 'port:frontier', name: 'Frontier station roof deck (mini spaceport)', pads: frontierPads.length },
];

// frontier town NPCs (definitions are built inside NPCManager; read them from the source so the manifest stays offline)
const npcSrc = readFileSync(new URL('../src/npc/npc.js', import.meta.url), 'utf8');
const townNpcs = [...npcSrc.matchAll(/defs\.push\(\{ name: '([^']+)', role: '([^']+)'/g)].map((m, i) => ({ id: `npc:town:${i}`, name: m[1], role: m[2], lines: null }));

const landmarks = buildings.filter((b) => b.kind === 'landmark').map((b) => ({ id: b.id, family: b.family, name: b.name, rooms: b.rooms }));
const manifest = {
  generatedAt: new Date().toISOString(), seed: layout.seed,
  counts: {
    buildings: buildings.length, towers: buildings.filter((b) => b.kind === 'tower').length, landmarks: landmarks.length,
    rooms: roomTotal, roomKinds: roomKinds.size, doors: doorTotal, ports: ports.length, pads: pads.length + frontierPads.length, ships: ships.length,
    coruscantNpcs: 0, townNpcs: townNpcs.length, buildFailures: buildFail, blueprintBuildMs: Math.round(buildMs),
  },
  buildings, landmarks, ports, pads: [...pads, ...frontierPads], ships, npcs: { town: townNpcs, coruscant: [] },
  roomKinds: Object.fromEntries([...roomKinds.entries()].sort((a, b) => b[1] - a[1])),
};
writeFileSync(`${outDir}/manifest.json`, JSON.stringify(manifest, null, 1));

const md = [];
md.push('# Scope manifest (stable IDs)', '', `Generated ${manifest.generatedAt} from layout seed ${layout.seed} by \`scripts/manifest.mjs\`. Denominators for every completion count in this round come from here; nothing is reclassified as scenery to improve a ratio.`, '');
md.push('| Count | Value |', '| --- | ---: |');
for (const [k, v] of Object.entries(manifest.counts)) md.push(`| ${k} | ${v} |`);
md.push('', '## Landmarks', '', '| id | family | name | rooms |', '| --- | --- | --- | ---: |');
for (const l of landmarks) md.push(`| ${l.id} | ${l.family} | ${l.name} | ${l.rooms} |`);
md.push('', '## Ports and pads', '');
for (const p of ports) md.push(`- ${p.id}: ${p.name}, ${p.pads} pads`);
md.push(`- ships in the traffic model: ${ships.length} (boardable: ${ships.filter((s) => s.boardable).length}, with interiors: ${ships.filter((s) => s.interior).length})`);
md.push('', '## Frontier town NPCs', '', townNpcs.map((n) => `${n.name} (${n.role})`).join(', '), '', '## Coruscant NPCs', '', 'None yet (population workstream W4 in progress).');
md.push('', '## Room kinds (most common first)', '', Object.entries(manifest.roomKinds).map(([k, v]) => `${k} ${v}`).join(', '));
md.push('', '## Buildings', '', '| id | kind | district | purpose | name | rooms | doors | work | beds |', '| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: |');
for (const b of buildings) md.push(`| ${b.id} | ${b.kind}${b.family ? ':' + b.family : ''} | ${b.district} | ${b.purpose} | ${b.name} | ${b.rooms} | ${b.doors.length} | ${b.workSpots} | ${b.beds} |`);
writeFileSync(`${outDir}/manifest.md`, md.join('\n') + '\n');
console.log(JSON.stringify(manifest.counts));
