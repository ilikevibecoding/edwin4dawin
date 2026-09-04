// Shared system registry: main.js fills this after construction so room modules and features can reach the
// live systems (fighter traffic, audio, HUD, rooms, doors, lifts) without import cycles.
export const SYSTEMS = {
  fighters: null, // src/fighters/index.js instance ({ group, traffic, update, attachHangar })
  audio: null,
  hud: null,
  rooms: null,
  doors: null,
  lifts: null,
  lighting: null,
  exterior: null,
  space: null,
  camera: null,
  player: null,
};
