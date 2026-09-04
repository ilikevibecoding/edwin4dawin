// Manifest factory for Deck 2/3 rooms: fills the §7 contract fields from a compact description,
// pulls door entries from the shared table, and wraps build() so every room gets a closed shell
// before its own detail pass. Rooms stay plain objects; nothing here depends on the registry.
import { doorsFor } from "./doors.js";
import { imperialExtras } from "./materials.js";
import { buildShell } from "./shell.js";

export const DECKS = {
  2: { floorY: 40, x: [-70, 70], z: [300, 470], ceil: 56 },
  3: { floorY: 12, x: [-80, 80], z: [540, 760], ceil: 60, reactorCeil: 110 },
};

/**
 * @param spec {
 *   id, name, deck, x: [x0, x1], z: [z0, z1], ceil (absolute y), floorY? (defaults to the deck floor),
 *   y0? (bounds min y, default floor - 0.5), y1? (bounds max y, default ceil + 0.5),
 *   spawn: { pos, yaw }, views: { name: { pos, yaw, pitch } }, apertures?: [], lift?: {...},
 *   openings?: shell openings, shell?: shell options (or false to build your own),
 *   detail?(ctx, shellResult, room) — room content after the shell,
 *   update?(dt, t, state), alwaysWithNeighbours?
 * }
 */
export function defineRoom(spec) {
  const deck = DECKS[spec.deck];
  const floorY = spec.floorY ?? deck.floorY;
  const ceilY = spec.ceil;
  const bounds = {
    min: [spec.x[0], spec.y0 ?? floorY - 0.5, spec.z[0]],
    max: [spec.x[1], spec.y1 ?? ceilY + 0.5, spec.z[1]],
  };
  const doors = doorsFor(spec.id, bounds);
  const room = {
    id: spec.id,
    name: spec.name,
    kind: "room",
    deck: spec.deck,
    owner: "C",
    bounds,
    doors,
    lift: spec.lift ?? null,
    spawn: spec.spawn,
    apertures: spec.apertures ?? [],
    views: spec.views,
    floorY,
    ceilY,
    materials: (shared) => imperialExtras(shared),
    build(ctx) {
      const t0 = performance.now();
      let shell = null;
      if (spec.shell !== false) {
        shell = buildShell(ctx, { bounds, floorY, ceilY, doors, openings: spec.openings || [], seed: hash(spec.id), ...(spec.shell || {}) });
      }
      const state = { t0 };
      const detail = spec.detail ? spec.detail(ctx, shell, room, state) : null;
      const result = {
        api: (detail && detail.api) || {},
      };
      if (detail && detail.update) result.update = detail.update;
      if (spec.update) result.update = (dt, t) => spec.update(dt, t, state);
      if (detail && detail.dispose) result.dispose = detail.dispose;
      room.buildMs = performance.now() - t0;
      return result;
    },
  };
  if (spec.alwaysWithNeighbours) room.alwaysWithNeighbours = true;
  return room;
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) % 100000;
}

// Feet position helper for views/spawns: [x, floorY, z]
export const at = (floorY) => (x, z) => [x, floorY, z];
