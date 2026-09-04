// Door opening sizes from COORDINATION.md §7. D's `systems/doors/helper.js` will export the same
// `doorHole()`; these imports switch to it when it lands so every wall cut stays identical.
export const DOOR_KINDS = {
  standard: { w: 2.4, h: 3.0 },
  blast: { w: 4.0, h: 4.0 },
  hatch: { w: 1.2, h: 2.0 },
};

export function doorHole(door) {
  if (door.kind === "bay") return { w: door.w, h: door.h };
  const k = DOOR_KINDS[door.kind];
  if (!k) throw new Error(`unknown door kind ${door.kind} (${door.id})`);
  return { w: k.w, h: k.h };
}

// Which bounds face a door sits on, from its outward normal.
export function doorFace(door) {
  const [dx, , dz] = door.dir;
  if (dz < -0.5) return "n";
  if (dz > 0.5) return "s";
  if (dx < -0.5) return "w";
  return "e";
}

// Lift door hole in the lobby wall (§9.2 leaves the size open; standard door size, flagged in status).
export const LIFT_DOOR = { w: 2.4, h: 3.0 };
