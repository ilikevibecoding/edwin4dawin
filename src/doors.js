// Two-block doors: state helpers (open / closed as separate block ids, see blocks.js) and the NPC door controller
// that opens doors for walking NPCs when they are within a block and closes them one second after everyone has
// passed. Everything here is deterministic: it depends only on block data, NPC positions and the tick counter.
import { BLOCKS, doorSet } from './blocks.js';
import { World } from './world.js';

const CLOSE_DELAY_TICKS = 20;   // 1 s after the last NPC left the doorway
const NEAR = 1.25;              // NPC distance (blocks, horizontal, to the cell centre) that counts as "at the door"

// y of the bottom half of the door occupying (x,y,z), or null when the cell is not a door.
export function doorBottomY(world, x, y, z) {
  const d = BLOCKS[world.getBlock(x, y, z)];
  if (!d.door) return null;
  if (d.doorTop) return y - 1;
  if (d.doorOpen) { const below = BLOCKS[world.getBlock(x, y - 1, z)]; return below.door && below.doorOpen && below.door === d.door ? y - 1 : y; }
  return y;
}

export const isDoorOpenAt = (world, x, y, z) => BLOCKS[world.getBlock(x, y, z)].doorOpen;

// Sets both halves of the door whose bottom half is at (x, yb, z). Returns true when the state changed.
export function setDoorOpen(world, x, yb, z, open) {
  const set = doorSet(world.getBlock(x, yb, z));
  if (!set) return false;
  if (BLOCKS[world.getBlock(x, yb, z)].doorOpen === open) return false;
  const topIsDoor = doorSet(world.getBlock(x, yb + 1, z)) === set;
  world.setBlock(x, yb, z, open ? set.open : set.bottom);
  if (topIsDoor) world.setBlock(x, yb + 1, z, open ? set.open : set.top);
  return true;
}

export class DoorController {
  constructor(world, audio) {
    this.world = world;
    this.audio = audio;
    this.held = new Map();   // posKey(bottom) -> {x, y, z, lastNear} doors opened by NPCs (closed again by us)
    this.tickCount = 0;
    this.onChange = null;    // (x, yb, z, open) after any state change (remesh hook)
    this.toggles = 0;        // stats for tests
  }

  // Player interaction with any door cell: flips the whole door. Returns {x, y, z, open} or null.
  toggle(x, y, z) {
    const yb = doorBottomY(this.world, x, y, z);
    if (yb === null) return null;
    const open = !isDoorOpenAt(this.world, x, yb, z);
    if (!setDoorOpen(this.world, x, yb, z, open)) return null;
    this.held.delete(World.posKey(x, yb, z)); // a player-set state is never auto-closed
    this.toggles++;
    this.sound(x, yb, z, open);
    if (this.onChange) this.onChange(x, yb, z, open);
    return { x, y: yb, z, open };
  }

  sound(x, yb, z, open) {
    if (!this.audio) return;
    const pos = { x: x + 0.5, y: yb + 1, z: z + 0.5 };
    if (open) this.audio.doorOpen(pos); else this.audio.doorClose(pos);
  }

  // Called once per tick with the NPC list and the player (whose box must never be trapped by a closing door).
  update(npcs, player) {
    this.tickCount++;
    const world = this.world;
    if (npcs) {
      for (const npc of npcs) {
        if (npc.state !== 'walk' || !npc.path || npc.air) continue;
        const fx = Math.floor(npc.pos.x), fy = Math.floor(npc.pos.y + 0.01), fz = Math.floor(npc.pos.z);
        this.approach(npc, fx, fy, fz);
        for (let i = npc.pathIndex; i < Math.min(npc.path.length, npc.pathIndex + 2); i++) {
          const c = npc.path[i];
          if (Math.abs(c.y - fy) <= 1) this.approach(npc, c.x, c.y, c.z);
        }
      }
    }
    if (!this.held.size) return;
    for (const [k, d] of this.held) {
      if (!BLOCKS[world.getBlock(d.x, d.y, d.z)].doorOpen) { this.held.delete(k); continue; } // player closed it / door broken
      let near = false;
      if (npcs) for (const npc of npcs) { if (this.isNear(npc.pos, d) && Math.abs(npc.pos.y - d.y) < 2) { near = true; break; } }
      if (near) { d.lastNear = this.tickCount; continue; }
      if (this.tickCount - d.lastNear < CLOSE_DELAY_TICKS) continue;
      if (player && this.playerInDoorway(player, d)) { d.lastNear = this.tickCount; continue; }
      if (setDoorOpen(world, d.x, d.y, d.z, false)) { this.toggles++; this.sound(d.x, d.y, d.z, false); if (this.onChange) this.onChange(d.x, d.y, d.z, false); }
      this.held.delete(k);
    }
  }

  isNear(pos, d) { const dx = pos.x - (d.x + 0.5), dz = pos.z - (d.z + 0.5); return dx * dx + dz * dz <= NEAR * NEAR; }

  playerInDoorway(player, d) {
    const b = player.box;
    return b && b.x1 > d.x && b.x0 < d.x + 1 && b.z1 > d.z && b.z0 < d.z + 1 && b.y1 > d.y && b.y0 < d.y + 2;
  }

  // An NPC is at / about to enter cell (x,y,z): if it holds a closed door within reach, open it.
  approach(npc, x, y, z) {
    const world = this.world;
    let yb = doorBottomY(world, x, y, z);
    if (yb === null) yb = doorBottomY(world, x, y + 1, z);
    if (yb === null) return;
    const d = { x, y: yb, z, lastNear: this.tickCount };
    if (!this.isNear(npc.pos, d)) return;
    const k = World.posKey(x, yb, z);
    if (isDoorOpenAt(world, x, yb, z)) { const h = this.held.get(k); if (h) h.lastNear = this.tickCount; return; }
    if (!setDoorOpen(world, x, yb, z, true)) return;
    this.toggles++;
    this.held.set(k, d);
    this.sound(x, yb, z, true);
    if (this.onChange) this.onChange(x, yb, z, true);
  }
}
