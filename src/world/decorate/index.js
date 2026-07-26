// Room decoration orchestrator (lead-owned). Per-room decorator modules are
// owned by the prop agents (see docs/ownership-ledger.md) and return placement
// lists consumed by placeProps().

import { placeProps } from '../props/index.js';
import { decorateLobbyFront } from './lobbyFront.js';
import { decorateOfficeFloor } from './officeFloor.js';
import { decorateFacilities } from './facilities.js';
import { decorateServiceAreas } from './serviceAreas.js';
import { decorateBasement } from './basement.js';

export function decorateRooms(world, group) {
  const sections = [
    ['lobby_front', decorateLobbyFront],
    ['office_floor', decorateOfficeFloor],
    ['facilities', decorateFacilities],
    ['service_areas', decorateServiceAreas],
    ['basement', decorateBasement],
  ];
  for (const [id, fn] of sections) {
    try {
      const placements = fn(world) || [];
      if (placements.length) placeProps(world, group, placements, { roomId: id });
    } catch (e) {
      console.error(`[decorate] section '${id}' failed`, e);
    }
  }
}
