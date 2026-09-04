// Room builder registry: room id -> builder(kit, ctx, room). Rooms without a dedicated builder fall
// back to the generic Imperial shell. Each dedicated builder lives in its own file so workstreams
// never edit the same file.
import { buildGeneric } from "./generic.js";
import { buildCorridor } from "./corridor.js";
import { buildLobby } from "./lobby.js";
import { buildLift } from "./lift.js";

const BUILDERS = {
  // deck A
  bridge: () => import("./bridge.js").then((m) => m.buildBridge),
  intel: () => import("./intel.js").then((m) => m.buildIntel),
  ready_room: () => import("./ready_room.js").then((m) => m.buildReadyRoom),
  comms: () => import("./comms.js").then((m) => m.buildComms),
  tactical: () => import("./tactical.js").then((m) => m.buildTactical),
  navigation: () => import("./navigation.js").then((m) => m.buildNavigation),
  // deck B
  observation: () => import("./observation.js").then((m) => m.buildObservation),
  officers_quarters: () => import("./officers_quarters.js").then((m) => m.buildOfficersQuarters),
  briefing: () => import("./briefing.js").then((m) => m.buildBriefing),
  lounge: () => import("./lounge.js").then((m) => m.buildLounge),
  escape_pods: () => import("./escape_pods.js").then((m) => m.buildEscapePods),
  // deck C
  crew_quarters: () => import("./crew_quarters.js").then((m) => m.buildCrewQuarters),
  mess_hall: () => import("./mess_hall.js").then((m) => m.buildMessHall),
  medbay: () => import("./medbay.js").then((m) => m.buildMedbay),
  armory: () => import("./armory.js").then((m) => m.buildArmory),
  detention: () => import("./detention.js").then((m) => m.buildDetention),
  // deck D
  engineering: () => import("./engineering.js").then((m) => m.buildEngineering),
  hyperdrive: () => import("./hyperdrive.js").then((m) => m.buildHyperdrive),
  life_support: () => import("./life_support.js").then((m) => m.buildLifeSupport),
  maintenance: () => import("./maintenance.js").then((m) => m.buildMaintenance),
  reactor: () => import("./reactor.js").then((m) => m.buildReactor),
  // deck E
  hangar: () => import("./hangar.js").then((m) => m.buildHangar),
  fighter_bay: () => import("./fighter_bay.js").then((m) => m.buildFighterBay),
  shuttle_bay: () => import("./shuttle_bay.js").then((m) => m.buildShuttleBay),
  cargo: () => import("./cargo.js").then((m) => m.buildCargo),
  flight_control: () => import("./flight_control.js").then((m) => m.buildFlightControl),
};

/** Resolve the builder for a room: dedicated module if present, else by kind, else generic. */
export async function builderFor(room) {
  const loader = BUILDERS[room.id];
  if (loader) {
    try {
      const b = await loader();
      if (typeof b === "function") return b;
    } catch (e) {
      // module not written yet (or broken): fall through to the placeholder and say so once
      console.warn(`[rooms] ${room.id}: dedicated builder unavailable (${e.message.split("\n")[0]}); using placeholder`);
    }
  }
  if (room.kind === "corridor") return buildCorridor;
  if (room.kind === "lobby") return buildLobby;
  if (room.kind === "lift") return buildLift;
  return buildGeneric;
}

export { buildGeneric, buildCorridor, buildLobby, buildLift };
