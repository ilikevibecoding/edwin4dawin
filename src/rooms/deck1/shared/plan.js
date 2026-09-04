// Deck 1 plan (Agent B). Every manifest reads its bounds and doors from here so the two rooms sharing a
// door always declare the same id / pos / kind (COORDINATION.md §7). Numbers match docs/status/b-command-tower.md.
export const FLOOR = 240;
export const PIT_FLOOR = 237.6;

export const BOUNDS = {
  "d1-bridge": { min: [-20, 236, 458], max: [20, 250, 512] },
  "d1-observation": { min: [-84, 239.5, 458], max: [-20, 246, 466] },
  "d1-nav": { min: [-44, 239.5, 468], max: [-23.6, 245, 486] },
  "d1-comms": { min: [-44, 239.5, 490], max: [-23.6, 245, 508] },
  "d1-tactical": { min: [23.6, 239.5, 468], max: [44, 245, 486] },
  "d1-intel": { min: [23.6, 239.5, 490], max: [40, 244, 504] },
  "d1-officers": { min: [44, 239.5, 458], max: [84, 244, 512] },
  "d1-corridor-port": { min: [-23.6, 239.5, 466], max: [-20, 244, 512] },
  "d1-corridor-stbd": { min: [20, 239.5, 466], max: [23.6, 244, 512] },
  "d1-spine": { min: [-84, 239.5, 512], max: [84, 244, 516] },
  "d1-lobby": { min: [-8, 239.5, 516], max: [8, 244.6, 526] },
};

export const CEIL = {
  "d1-bridge": 248,
  "d1-observation": 245.4,
  "d1-nav": 244.2,
  "d1-comms": 244.2,
  "d1-tactical": 244.2,
  "d1-intel": 243.4,
  "d1-officers": 243.2,
  "d1-corridor-port": 243.2,
  "d1-corridor-stbd": 243.2,
  "d1-spine": 243.2,
  "d1-lobby": 244,
};

// Door pairs: a/b are the two rooms; pos is the shared opening centre at floor level on the common bounds
// face; dirA is the outward normal as seen from room a (b gets the opposite).
const PAIRS = [
  { id: "d1-bridge-aft", a: "d1-bridge", b: "d1-spine", pos: [0, FLOOR, 512], dirA: [0, 0, 1], kind: "blast" },
  { id: "d1-bridge-port", a: "d1-bridge", b: "d1-corridor-port", pos: [-20, FLOOR, 506], dirA: [-1, 0, 0], kind: "standard" },
  { id: "d1-bridge-stbd", a: "d1-bridge", b: "d1-corridor-stbd", pos: [20, FLOOR, 506], dirA: [1, 0, 0], kind: "standard" },
  { id: "d1-observation-corridor", a: "d1-observation", b: "d1-corridor-port", pos: [-21.8, FLOOR, 466], dirA: [0, 0, 1], kind: "standard" },
  { id: "d1-nav-corridor", a: "d1-nav", b: "d1-corridor-port", pos: [-23.6, FLOOR, 477], dirA: [1, 0, 0], kind: "standard" },
  { id: "d1-comms-corridor", a: "d1-comms", b: "d1-corridor-port", pos: [-23.6, FLOOR, 499], dirA: [1, 0, 0], kind: "standard" },
  { id: "d1-tactical-corridor", a: "d1-tactical", b: "d1-corridor-stbd", pos: [23.6, FLOOR, 477], dirA: [-1, 0, 0], kind: "standard" },
  { id: "d1-intel-corridor", a: "d1-intel", b: "d1-corridor-stbd", pos: [23.6, FLOOR, 497], dirA: [-1, 0, 0], kind: "blast" },
  { id: "d1-officers-spine", a: "d1-officers", b: "d1-spine", pos: [66, FLOOR, 512], dirA: [0, 0, 1], kind: "standard" },
  { id: "d1-spine-port", a: "d1-corridor-port", b: "d1-spine", pos: [-21.8, FLOOR, 512], dirA: [0, 0, 1], kind: "standard" },
  { id: "d1-spine-stbd", a: "d1-corridor-stbd", b: "d1-spine", pos: [21.8, FLOOR, 512], dirA: [0, 0, 1], kind: "standard" },
  { id: "d1-spine-lobby", a: "d1-spine", b: "d1-lobby", pos: [0, FLOOR, 516], dirA: [0, 0, 1], kind: "blast" },
  // future-expansion doors (unpaired on purpose: D builds them locked, §9.1)
  { id: "d1-spine-end-port", a: "d1-spine", b: "d1-future-port", pos: [-84, FLOOR, 514], dirA: [-1, 0, 0], kind: "standard", unpaired: true },
  { id: "d1-spine-end-stbd", a: "d1-spine", b: "d1-future-stbd", pos: [84, FLOOR, 514], dirA: [1, 0, 0], kind: "standard", unpaired: true },
];

export function doorsFor(roomId) {
  const out = [];
  for (const p of PAIRS) {
    if (p.a === roomId) out.push({ id: p.id, pos: [...p.pos], dir: [...p.dirA], kind: p.kind, to: p.b });
    else if (p.b === roomId && !p.unpaired) out.push({ id: p.id, pos: [...p.pos], dir: p.dirA.map((v) => -v), kind: p.kind, to: p.a });
  }
  return out;
}

export const LIFT = { id: "T1", pos: [0, FLOOR, 522], dir: [0, 0, -1] };
