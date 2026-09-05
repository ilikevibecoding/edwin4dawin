// Room template library. Every template is `fn(room, rng, ctx)` writing furniture into a Room frame (see room.js)
// and recording NPC spots. Templates declare their minimum interior size; the floor planner picks a template that
// fits from the pool a tower family asks for. `list()` reports the library for stats.
import './living.js';
import './work.js';
import './public.js';
import './civic.js';
import { ROOMS, defRoom, pickRoom } from './registry.js';

export { ROOMS, defRoom, pickRoom };
export function list() { return Object.keys(ROOMS); }
