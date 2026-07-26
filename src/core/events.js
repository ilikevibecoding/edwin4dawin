/**
 * Minimal synchronous event bus shared by all systems.
 *
 * Systems never import each other directly for notifications; they publish and
 * subscribe here. This keeps the ownership boundaries between subsystems clean
 * (a weapon does not know that the audio mixer or the AI hearing model exists).
 */
export class EventBus {
  constructor() {
    this._map = new Map();
  }

  on(type, fn) {
    let set = this._map.get(type);
    if (!set) {
      set = new Set();
      this._map.set(type, set);
    }
    set.add(fn);
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
    const set = this._map.get(type);
    if (set) set.delete(fn);
  }

  emit(type, payload) {
    const set = this._map.get(type);
    if (!set) return;
    for (const fn of Array.from(set)) {
      try {
        fn(payload);
      } catch (err) {
        console.error(`[events] handler for "${type}" threw`, err);
      }
    }
  }

  clear() {
    this._map.clear();
  }
}

export const bus = new EventBus();

/** Canonical event names. Keeping them here prevents silent typo-subscriptions. */
export const EV = {
  // Flow
  STATE_CHANGE: 'state:change',
  MISSION_START: 'mission:start',
  MISSION_RESET: 'mission:reset',
  MISSION_END: 'mission:end',
  OBJECTIVE_UPDATE: 'objective:update',
  ANNOUNCE: 'announce',

  // Combat
  SHOT_FIRED: 'combat:shotFired',
  DRY_FIRE: 'combat:dryFire',
  RELOAD_START: 'combat:reloadStart',
  RELOAD_END: 'combat:reloadEnd',
  WEAPON_SWITCH: 'combat:weaponSwitch',
  BULLET_IMPACT: 'combat:bulletImpact',
  DAMAGE_DEALT: 'combat:damageDealt',
  PLAYER_DAMAGED: 'combat:playerDamaged',
  ENEMY_KILLED: 'combat:enemyKilled',
  PLAYER_DIED: 'combat:playerDied',
  MELEE_SWING: 'combat:meleeSwing',
  GRENADE_THROWN: 'combat:grenadeThrown',
  FLASH_DETONATE: 'combat:flashDetonate',
  SMOKE_DETONATE: 'combat:smokeDetonate',

  // World
  NOISE: 'world:noise',
  DOOR_STATE: 'world:doorState',
  GLASS_BROKEN: 'world:glassBroken',
  INTERACT: 'world:interact',
  FOOTSTEP: 'world:footstep',

  // Hostages
  HOSTAGE_SECURED: 'hostage:secured',
  HOSTAGE_EXTRACTED: 'hostage:extracted',
  HOSTAGE_DOWN: 'hostage:down',

  // Settings / UI
  SETTINGS_CHANGED: 'settings:changed',
  UI_SOUND: 'ui:sound',
  RESIZE: 'engine:resize',
};
