// Minimal synchronous pub/sub used across systems.
// Channels in use (documented to keep agents aligned):
//   'noise'        {pos:{x,y,z}, radius, type:'gunshot'|'footstep'|'door'|'glass'|'impact'|'flash'|'voice'}
//   'damage'       {target:'player'|'enemy'|'hostage', entity, amount, dir}
//   'kill'         {entity}
//   'door'         {door, state}
//   'objective'    {id, state}
//   'modechange'   {from, to}
//   'subtitle'     {speaker, text, ttl}
//   'hit-marker'   {kind:'hit'|'kill'|'headshot'}
//   'glassbreak'   {pane}

const listeners = new Map();

export function on(channel, fn) {
  if (!listeners.has(channel)) listeners.set(channel, new Set());
  listeners.get(channel).add(fn);
  return () => off(channel, fn);
}
export function off(channel, fn) { listeners.get(channel)?.delete(fn); }
export function emit(channel, payload) {
  const set = listeners.get(channel);
  if (!set) return;
  for (const fn of [...set]) { try { fn(payload); } catch (e) { console.error(`[events] handler error on '${channel}'`, e); } }
}
export function clearChannel(channel) { listeners.delete(channel); }
