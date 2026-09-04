// Turbolift geometry every lobby author needs (COORDINATION.md §9.2).
//   import { LIFT_DOOR, LIFT_VOLUME, liftDoorHole, liftCabinBox } from "../../systems/lifts/helper.js";
// The lobby manifest carries lift: { id, pos, dir } — pos is the lift door centre at floor level on the
// lobby wall, dir points from the cabin INTO the lobby. The lobby cuts a LIFT_DOOR hole there and keeps
// the LIFT_VOLUME box behind the wall free; the lifts system builds the cabin, doors and call panel.

export const LIFT_DOOR = { w: 2.4, h: 3.0 };
export const LIFT_VOLUME = { across: 4.0, deep: 4.0, high: 3.6 };

export function liftDoorHole() {
  return { ...LIFT_DOOR };
}

/** AABB {min,max} of the reserved cabin volume behind the lobby wall for a manifest lift entry. */
export function liftCabinBox(lift) {
  const [px, py, pz] = lift.pos;
  const [dx, , dz] = lift.dir;
  const { across, deep, high } = LIFT_VOLUME;
  // cabin sits opposite dir (behind the wall)
  const cx = px - dx * (deep / 2);
  const cz = pz - dz * (deep / 2);
  const hx = Math.abs(dx) > 0.5 ? deep / 2 : across / 2;
  const hz = Math.abs(dz) > 0.5 ? deep / 2 : across / 2;
  return { min: [cx - hx, py, cz - hz], max: [cx + hx, py + high, cz + hz] };
}

// What the lifts system builds ON THE LOBBY SIDE of the wall (frame 1.5 m either side of the door
// centre, indicator to 3.6 m, call panel to the viewer's right out to 2.2 m, all ≤ 0.4 m proud of the
// wall). Keep this footprint free of props so nothing intersects the frame or the call panel.
export const LIFT_LOBBY_CLEARANCE = { left: 1.6, right: 2.3, high: 3.6, proud: 0.4 };

/**
 * AABB {min,max} in the lobby that the lifts system occupies (frame, lintel indicator, call panel).
 * "right" is the viewer's right when standing in the lobby facing the lift door.
 */
export function liftLobbyClearance(lift) {
  const [px, py, pz] = lift.pos;
  const [dx, , dz] = lift.dir;
  const { left, right, high, proud } = LIFT_LOBBY_CLEARANCE;
  // viewer's right when facing the door (looking along -dir) = (-dir) × up = (dz, 0, -dx)
  const rx = dz;
  const rz = -dx;
  const min = [Infinity, py, Infinity];
  const max = [-Infinity, py + high, -Infinity];
  for (const [a, d] of [
    [-left, 0],
    [right, 0],
    [-left, proud],
    [right, proud],
  ]) {
    const x = px + rx * a + dx * d;
    const z = pz + rz * a + dz * d;
    min[0] = Math.min(min[0], x);
    max[0] = Math.max(max[0], x);
    min[2] = Math.min(min[2], z);
    max[2] = Math.max(max[2], z);
  }
  return { min, max };
}

/** Where a rider stands after arriving: feet 1.2 m inside the doors, facing them (yaw in degrees). */
export function liftSpawn(lift) {
  const [px, py, pz] = lift.pos;
  const [dx, , dz] = lift.dir;
  return { pos: [px - dx * 1.2, py, pz - dz * 1.2], yaw: (Math.atan2(-dx, -dz) * 180) / Math.PI };
}
