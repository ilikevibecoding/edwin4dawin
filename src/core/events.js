/** Tiny synchronous event bus used for cross-system communication. */
export class EventBus {
  constructor() { this._map = new Map(); }
  on(type, fn) {
    if (!this._map.has(type)) this._map.set(type, new Set());
    this._map.get(type).add(fn);
    return () => this.off(type, fn);
  }
  off(type, fn) { this._map.get(type)?.delete(fn); }
  emit(type, payload) {
    const set = this._map.get(type);
    if (!set) return;
    for (const fn of [...set]) fn(payload);
  }
}

/**
 * Event reference (emit/listen from any system):
 *  'player:damage'   { amount, direction }        — player took damage
 *  'player:heal'     {}                           — regen tick
 *  'player:death'    {}
 *  'player:respawn'  {}
 *  'player:land'     { velocity }                 — landed from a fall
 *  'player:footstep' { surface, sprint }
 *  'weapon:fire'     { weapon, origin, direction }
 *  'weapon:reload'   { weapon }
 *  'weapon:switch'   { weapon }
 *  'weapon:hit'      { point, normal, object, damage, enemy, headshot }
 *  'enemy:death'     { enemy, position, headshot, cause }  cause: 'gun'|'airstrike'|'grenade'
 *  'enemy:damage'    { enemy, amount, headshot }
 *  'enemy:fire'      { position }                 — an enemy fired (for audio/vfx)
 *  'kill'            { headshot, cause, streak }  — confirmed player kill
 *  'killstreak:ready'   { name, kills }
 *  'airstrike:called'   { target }
 *  'airstrike:incoming' {}                        — jets audible
 *  'airstrike:impact'   { position, index }       — each bomb hit
 *  'explosion'       { position, radius, damage } — generic explosion (grenades etc)
 *  'game:start'      {}
 *  'game:over'       { victory }
 *  'ui:hitmarker'    { headshot, kill }
 *  'ui:message'      { text, sub }
 */
