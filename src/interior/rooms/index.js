// Room builder registry: one module per room, keyed by the room id in shipSpec.js.
// Each builder has the signature build(kit, ctx, room, lib) and is given its own Kit, so rooms can be
// streamed and culled independently. lib bundles the shared helpers (shell, panelGrid, Frame, ...).
import { build as bridge } from "./bridge.js";
import { build as tactical } from "./tactical.js";
import { build as comms } from "./comms.js";
import { build as intel } from "./intel.js";
import { build as officers } from "./officers.js";
import { build as observation } from "./observation.js";
import { build as lift1LobbyA } from "./lift1LobbyA.js";
import { build as escapePods } from "./escapePods.js";
import { build as crewQuarters } from "./crewQuarters.js";
import { build as refresher } from "./refresher.js";
import { build as mess } from "./mess.js";
import { build as medbay } from "./medbay.js";
import { build as lounge } from "./lounge.js";
import { build as briefing } from "./briefing.js";
import { build as armory } from "./armory.js";
import { build as detention } from "./detention.js";
import { build as lifeSupport } from "./lifeSupport.js";
import { build as lift1LobbyB } from "./lift1LobbyB.js";
import { build as engineering } from "./engineering.js";
import { build as reactor } from "./reactor.js";
import { build as hyperdrive } from "./hyperdrive.js";
import { build as maintenance } from "./maintenance.js";
import { build as hangar } from "./hangar.js";
import { build as fighterMaint } from "./fighterMaint.js";
import { build as shuttleDock } from "./shuttleDock.js";
import { build as cargo } from "./cargo.js";

export const ROOM_BUILDERS = {
  bridge,
  tactical,
  comms,
  intel,
  officers,
  observation,
  lift1LobbyA,
  escapePods,
  crewQuarters,
  refresher,
  mess,
  medbay,
  lounge,
  briefing,
  armory,
  detention,
  lifeSupport,
  lift1LobbyB,
  engineering,
  reactor,
  hyperdrive,
  maintenance,
  hangar,
  fighterMaint,
  shuttleDock,
  cargo,
};
