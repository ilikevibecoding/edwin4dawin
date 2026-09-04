// Room builder registry: id -> module exporting build(ctx). Generated stubs grey-box every room until its
// workstream lands the detailed version; the RoomManager falls back to greybox() for unknown ids.
import * as bridge from "./tower/bridge.js";
import * as tactical from "./tower/tactical.js";
import * as nav_station from "./tower/nav_station.js";
import * as observation from "./tower/observation.js";
import * as intelligence from "./tower/intelligence.js";
import * as briefing from "./tower/briefing.js";
import * as comms from "./tower/comms.js";
import * as officers_quarters from "./tower/officers_quarters.js";
import * as hangar from "./hangar/hangar.js";
import * as flight_control from "./hangar/flight_control.js";
import * as fighter_maint from "./hangar/fighter_maint.js";
import * as cargo_bay from "./hangar/cargo_bay.js";
import * as repair_bay from "./hangar/repair_bay.js";
import * as shuttle_bay from "./hangar/shuttle_bay.js";
import * as engineering from "./engineering/engineering.js";
import * as reactor from "./engineering/reactor.js";
import * as hyperdrive from "./engineering/hyperdrive.js";
import * as life_support from "./engineering/life_support.js";
import * as crew_quarters from "./crew/crew_quarters.js";
import * as mess from "./crew/mess.js";
import * as lounge from "./crew/lounge.js";
import * as medbay from "./crew/medbay.js";
import * as armory from "./crew/armory.js";
import * as detention from "./crew/detention.js";
import * as escape_pods from "./crew/escape_pods.js";
import * as cmd_corridor from "./common/cmd_corridor.js";
import * as lift_lobby_tower from "./common/lift_lobby_tower.js";
import * as hangar_lobby from "./common/hangar_lobby.js";
import * as eng_lobby from "./common/eng_lobby.js";
import * as eng_corridor from "./common/eng_corridor.js";
import * as crew_lobby from "./common/crew_lobby.js";
import * as crew_corridor from "./common/crew_corridor.js";
import * as crew_connector from "./common/crew_connector.js";
import * as crew_corridor_fwd from "./common/crew_corridor_fwd.js";

export const ROOM_BUILDERS = {
  bridge,
  tactical,
  nav_station,
  observation,
  intelligence,
  briefing,
  comms,
  officers_quarters,
  hangar,
  flight_control,
  fighter_maint,
  cargo_bay,
  repair_bay,
  shuttle_bay,
  engineering,
  reactor,
  hyperdrive,
  life_support,
  crew_quarters,
  mess,
  lounge,
  medbay,
  armory,
  detention,
  escape_pods,
  cmd_corridor,
  lift_lobby_tower,
  hangar_lobby,
  eng_lobby,
  eng_corridor,
  crew_lobby,
  crew_corridor,
  crew_connector,
  crew_corridor_fwd,
};
