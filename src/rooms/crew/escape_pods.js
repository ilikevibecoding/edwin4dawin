// Emergency Escape Pods — grey-box stub (owner: crew-rooms workstream). Replace build() with the detailed room.
// Contract: see src/core/room.js (BuildContext) and PLAN.md §3 for this room's box, floor, doors and accent.
import { greybox } from "../../core/room.js";

export const meta = { id: "escape_pods", stream: "crew-rooms" };

export function build(ctx) {
  greybox(ctx);
}
