// Deterministic line selection for the Coruscant crowd (rubric 07 row 8). A `Voice` is the per-NPC state: which
// bank indices it used recently (no repeat within the last 5 lines) and a counter that, hashed with the person's
// key, picks the next line, so the same person says the same things in the same order every session. Contexts are
// ranked: disaster shouts > reactions to the player > job / time-of-day / district gossip / vendor call-outs.
import { hash2 } from '../../rng.js';
import {
  JOB_LINES, TIME_LINES, GOSSIP, DISASTER_LINES, PLAYER_LINES, DIRECTION_LINES, NO_LANDMARK_LINES, PRICE_LINES,
  NOT_VENDOR_LINES, WORK_INTRO, STREET_INTRO, RESIDENT_INTRO, CALLOUTS,
} from './lines.js';

export const HISTORY = 5;
export const MAX_LINE = 90;

export function periodOf(hour) {
  const h = ((hour % 24) + 24) % 24;
  if (h < 6.5) return 'night';
  if (h < 9) return 'dawn';
  if (h < 11.5) return 'morning';
  if (h < 14) return 'noon';
  if (h < 18) return 'afternoon';
  if (h < 21.5) return 'evening';
  return 'night';
}

// Star Wars names for the shop inventory items of purposes.js (`sells[].item`)
export const ITEM_NAMES = {
  cooked_beef: 'nerf steak', cooked_porkchop: 'roast bantha', bread: 'flatbread', apple: 'Jogan fruit', torch: 'glow rod', iron_block: 'durasteel block',
  gold_block: 'aurodium block', chest: 'cargo crate', ship_repair: 'hull repair', iron_ingot: 'durasteel ingot', gold_ingot: 'aurodium ingot', coal: 'fuel cell',
  stick: 'power cell', planks: 'plasteel panel', glass: 'transparisteel', wool: 'shimmersilk', leather: 'nerf hide', book: 'holobook', paper: 'flimsiplast',
  diamond: 'kyber shard', emerald: 'credit chip', redstone: 'circuit', lantern: 'glow lamp', bucket: 'canister', boat: 'skiff pass', saddle: 'speeder seat',
  potion: 'bacta shot', bed: 'sleep couch', clock: 'chrono', compass: 'nav beacon', map: 'holomap', arrow: 'blaster charge', bow: 'blaster', sword: 'vibroblade',
};
export function itemName(item) { return ITEM_NAMES[item] || String(item || 'goods').replace(/_/g, ' '); }

export function fill(template, vars) {
  return template.replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : m));
}

// Pick index in [0, n) for step `k` of voice `key`, skipping indices in `recent`. Deterministic; n > recent.length
// guaranteed by the >= 20 lines per bank rule (banks shorter than HISTORY + 1 just avoid the last few).
function pickIndex(key, k, n, recent) {
  if (n <= 0) return -1;
  const avoid = recent.length >= n ? new Set(recent.slice(-(n - 1))) : new Set(recent);
  let i = Math.floor(hash2(key, k, 0x5157) * n) % n;
  for (let t = 0; t < n && avoid.has(i); t++) i = (i + 1) % n;
  return i;
}

export class Voice {
  constructor(key, archetype) {
    this.key = key >>> 0;
    this.archetype = archetype;
    this.step = 0;
    this.recent = [];        // last HISTORY lines said (strings), across all banks
    this.recentIdx = {};     // bank -> recent indices
  }
  // Choose from `bank` (array) under `name`; records history. Returns the line or null.
  say(name, bank, vars) {
    if (!bank || !bank.length) return null;
    const rec = this.recentIdx[name] || (this.recentIdx[name] = []);
    const i = pickIndex(this.key, this.step++, bank.length, rec);
    if (i < 0) return null;
    const line = vars ? fill(bank[i], vars) : bank[i];
    if (this.recent.includes(line) && bank.length > HISTORY) {
      // template banks can collide after filling; step once more
      const j = pickIndex(this.key, this.step++, bank.length, rec.concat([i]));
      return this.commit(name, j, vars ? fill(bank[j], vars) : bank[j]);
    }
    return this.commit(name, i, line);
  }
  commit(name, i, line) {
    const rec = this.recentIdx[name];
    rec.push(i); if (rec.length > HISTORY) rec.shift();
    this.recent.push(line); if (this.recent.length > HISTORY) this.recent.shift();
    return line;
  }
}

// Ambient line for a person in context. ctx: { hour, district, disaster ('flood'|'tornado'|'beam'|'sky'|'panic'|null),
// player ('vandal'|'flying'|'bump'|'poke'|'running'|null), vendor: bool, working: bool }
export function ambientLine(voice, ctx) {
  if (ctx.disaster && DISASTER_LINES[ctx.disaster]) return voice.say('dis:' + ctx.disaster, DISASTER_LINES[ctx.disaster]);
  if (ctx.player && PLAYER_LINES[ctx.player]) return voice.say('pl:' + ctx.player, PLAYER_LINES[ctx.player]);
  const r = hash2(voice.key, voice.step, 0x7a11);
  if (ctx.vendor && ctx.working && r < 0.35) return voice.say('callout', CALLOUTS);
  if (r < 0.62 || !ctx.district) return voice.say('job', JOB_LINES[voice.archetype] || JOB_LINES.resident);
  if (r < 0.82 && GOSSIP[ctx.district]) return voice.say('gossip:' + ctx.district, GOSSIP[ctx.district]);
  return voice.say('time:' + periodOf(ctx.hour || 12), TIME_LINES[periodOf(ctx.hour || 12)]);
}

export function greetLine(voice) { return voice.say('pl:greet', PLAYER_LINES.greet); }
export function jobLine(voice) { return voice.say('job', JOB_LINES[voice.archetype] || JOB_LINES.resident); }

// Compass direction + distance text from `from` to `to` ({x,z})
export function bearing(from, to) {
  const dx = to.x - from.x, dz = to.z - from.z;
  const dist = Math.hypot(dx, dz);
  const ang = Math.atan2(dx, -dz); // 0 = north (-z)
  const names = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  const dir = names[((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];
  const blocks = dist < 40 ? 'a few dozen blocks' : dist < 120 ? 'a hundred blocks' : dist < 250 ? 'two hundred blocks' : dist < 450 ? 'a few hundred blocks' : 'half the plateau';
  return { dir, blocks, dist };
}

// The nearest named landmark to `pos` (layout.landmarks: [{ name, x, z, w, d, lot }]) other than `excludeLot`.
export function nearestLandmark(layout, pos, excludeLot = -1) {
  let best = null, bd = Infinity;
  for (const g of layout.landmarks || []) {
    if (g.lot === excludeLot) continue;
    const d = Math.hypot(g.x - pos.x, g.z - pos.z);
    if (d < bd) { bd = d; best = g; }
  }
  return best;
}

export function directionsLine(voice, layout, pos, excludeLot = -1) {
  const lm = nearestLandmark(layout, pos, excludeLot);
  if (!lm) return voice.say('nolm', NO_LANDMARK_LINES);
  const b = bearing(pos, lm);
  return voice.say('dir', DIRECTION_LINES, { landmark: lm.name, dir: b.dir, blocks: b.blocks });
}

export function priceLine(voice, purpose) {
  const sells = purpose && purpose.sells;
  if (!sells || !sells.length) return voice.say('novend', NOT_VENDOR_LINES);
  const s = sells[Math.floor(hash2(voice.key, voice.step, 0x9e37) * sells.length) % sells.length];
  return voice.say('price', PRICE_LINES, { item: itemName(s.item), price: s.price });
}

// "What do you do here?" reply. person: { job, street, visitor, district }, purpose: { name } of the work lot
export function workLine(voice, person, purpose) {
  const building = purpose ? purpose.name : 'the tower';
  const job = person.job;
  if (person.street) return voice.say('intro', STREET_INTRO, { job: job[0].toUpperCase() + job.slice(1), district: districtName(person.district) });
  if (person.visitor) return voice.say('intro', RESIDENT_INTRO, { building });
  return voice.say('intro', WORK_INTRO, { building, job });
}

export function districtName(kind) {
  return { senate: 'Senate District', financial: 'Federal District', residential: 'Skyline Heights', industrial: 'Works', entertainment: 'Uscru strip', market: 'CoCo Town', spaceport: 'spaceport' }[kind] || String(kind || 'district');
}

// All banks flattened (for tests / census): [{ bank, line }]
export function allLines() {
  const out = [];
  const push = (bank, arr) => { for (const l of arr) out.push({ bank, line: l }); };
  for (const [k, v] of Object.entries(JOB_LINES)) push('job:' + k, v);
  for (const [k, v] of Object.entries(TIME_LINES)) push('time:' + k, v);
  for (const [k, v] of Object.entries(GOSSIP)) push('gossip:' + k, v);
  for (const [k, v] of Object.entries(DISASTER_LINES)) push('disaster:' + k, v);
  for (const [k, v] of Object.entries(PLAYER_LINES)) push('player:' + k, v);
  push('directions', DIRECTION_LINES); push('directions', NO_LANDMARK_LINES); push('price', PRICE_LINES); push('price', NOT_VENDOR_LINES);
  push('intro', WORK_INTRO); push('intro', STREET_INTRO); push('intro', RESIDENT_INTRO); push('callout', CALLOUTS);
  return out;
}
