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
