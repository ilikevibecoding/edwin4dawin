// Minimal synchronous event bus shared by every subsystem. Keeps gameplay,
// audio, UI and VFX decoupled so agents can own separate files.

export class EventBus {
  constructor() {
    this._handlers = new Map();
  }

  on(type, fn) {
    if (!this._handlers.has(type)) this._handlers.set(type, new Set());
    this._handlers.get(type).add(fn);
    return () => this.off(type, fn);
  }

  once(type, fn) {
    const off = this.on(type, (payload) => {
      off();
      fn(payload);
    });
    return off;
  }

  off(type, fn) {
    const set = this._handlers.get(type);
    if (set) set.delete(fn);
  }

  emit(type, payload) {
    const set = this._handlers.get(type);
    if (!set) return;
    for (const fn of Array.from(set)) {
      try {
        fn(payload, type);
      } catch (err) {
        console.error(`[events] handler for "${type}" failed`, err);
      }
    }
  }

  clear() {
    this._handlers.clear();
  }
}

export const bus = new EventBus();

export const EVT = {
  // lifecycle
  GAME_STATE: 'game:state',
  MISSION_START: 'mission:start',
  MISSION_END: 'mission:end',
  MISSION_RESET: 'mission:reset',
  // player
  PLAYER_DAMAGE: 'player:damage',
  PLAYER_DEATH: 'player:death',
  PLAYER_LAND: 'player:land',
  PLAYER_FOOTSTEP: 'player:footstep',
  // weapons
  WEAPON_FIRE: 'weapon:fire',
  WEAPON_DRY: 'weapon:dry',
  WEAPON_RELOAD_START: 'weapon:reload:start',
  WEAPON_RELOAD_END: 'weapon:reload:end',
  WEAPON_SWITCH: 'weapon:switch',
  WEAPON_SHELL: 'weapon:shell',
  // world
  IMPACT: 'world:impact',
  DOOR_STATE: 'door:state',
  GLASS_BREAK: 'glass:break',
  INTERACT: 'world:interact',
  // ai
  ENEMY_ALERT: 'enemy:alert',
  ENEMY_FIRE: 'enemy:fire',
  ENEMY_DEATH: 'enemy:death',
  ENEMY_VOICE: 'enemy:voice',
  // objectives
  OBJECTIVE_UPDATE: 'objective:update',
  HOSTAGE_STATE: 'hostage:state',
  ANNOUNCE: 'ui:announce',
  // ui
  UI_NAV: 'ui:nav',
  UI_CONFIRM: 'ui:confirm',
  SETTINGS_CHANGED: 'settings:changed',
};
