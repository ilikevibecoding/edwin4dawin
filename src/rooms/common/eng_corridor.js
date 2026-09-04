// Engineering Corridor — grey-box stub (owner: corridors workstream). Replace build() with the detailed room.
// Contract: see src/core/room.js (BuildContext) and PLAN.md §3 for this room's box, floor, doors and accent.
import { greybox } from "../../core/room.js";

export const meta = { id: "eng_corridor", stream: "corridors" };

export function build(ctx) {
  greybox(ctx);
}
