// Runtime glue between the population (coruscant/index.js) and the cast: one object the population calls at its
// spawn / render / talk / chatter hooks. It owns the registry (persistent people, spec §11), the dialog API (§12), the
// full-model actors of the thirteen anchors (§13) and publishes `game.cast` (the registry) and `game.dialog`. The
// anchors spawn ahead of the crowd budget when their place is in range and render through CastActors instead of a
// crowd slot; every persistent person - anchor or lot staff - talks from their own bank through the talk box, with
// speech + subtitles, and their interaction history is recorded in the registry (saved under `cast`).
// ?cast=0 leaves the city without the cast (the bench baseline): installCast returns null and nothing here runs.
import { CastRegistry } from './persistent.js';
import { CastActors } from './actors.js';
import { DialogAPI } from '../dialog/api.js';
import { activityAt } from '../coruscant/census.js';

const SPAWN_R = 96, INDOOR_MARGIN = 24;        // the population's ring (index.js), mirrored: the anchors use the same ring
const CHAT_CLOSE = 12;                         // ambient lines this close also go to the chat log (as speak() does)

export function installCast(pop) {
  if (typeof location !== 'undefined' && /[?&]cast=0(&|$)/.test(location.search)) return null;
  try { return new CastRuntime(pop); }
  catch (e) { console.error('[cast] failed to start', e); return null; }
}

export class CastRuntime {
  constructor(pop) {
    this.pop = pop; this.game = pop.game;
    this.registry = new CastRegistry(pop.layout, pop.pool, pop.lots, { game: pop.game, pop });
    this.dialog = new DialogAPI(pop.game, this.registry, pop);
    this.actors = new CastActors(pop.game, this.registry);
    this.registry.loadSaved();
    this.stats = { anchorSpawns: 0, talks: 0, replies: 0, chatter: 0, pokes: 0, farewells: 0 };
    this.lastChatAt = -10;
    // the dockmaster's control desk and the captain's own pad: spots the planner would not pick by hash
    const planner = pop.planner, resolve = planner.resolveSpot.bind(planner);
    planner.resolveSpot = (npc, act, lot, rng, within) => this.registry.resolveSpot(npc, act, lot, rng, within) || resolve(npc, act, lot, rng, within);
    // a persistent person who ran from a disaster is 'recovering' for a while after the all-clear (§11 states)
    const clearAlert = pop.clearAlert.bind(pop);
    pop.clearAlert = () => { for (const n of pop.live) if (n.panic) { const pp = this.forNpc(n); if (pp) this.registry.onFled(pp); } clearAlert(); };
    // leaving a conversation: a farewell line
    pop.talkBox.onClose = (npc, turns) => this.onTalkClose(npc, turns);
    const g = pop.game;
    g.cast = this.registry; g.dialog = this.dialog;
    g.coruscant = g.coruscant || {}; g.coruscant.cast = this;
    const s = this.registry.stats;
    console.log(`[cast] ${s.anchors} anchors, ${s.staff} persistent staff in ${s.lotsStaffed} lots, ${s.relationships} relationships (${s.adopted} adopted, ${s.created} created)`);
  }
  forNpc(npc) { return npc && npc.person ? this.registry.forPerson(npc.person) : null; }
  isAnchor(npc) { return !!(npc && npc.person && npc.person.cast); }

  // ------------------------------------------------------------------------------------------------ spawning
  // Anchors whose place is in range spawn first and outside the crowd budget (they carry their own model, not a
  // crowd slot). Same ring as everyone else, so nobody appears in view; the population's spawn() does the placing.
  spawnCycle(p, inLot) {
    const pop = this.pop;
    for (const pp of this.registry.anchors.values()) {
      const person = pp.person;
      if (pop.liveByPerson.has(person.id)) continue;
      const skip = pop.skip.get(person.id);
      if (skip !== undefined) { if (skip > pop.tickCount) continue; pop.skip.delete(person.id); }
      const a = activityAt(person, pop.hour);
      const d = pop.placeDist(a, p, person);
      const indoor = pop.isIndoor(person, a) && a.lot !== inLot;
      if (d > (indoor ? SPAWN_R - INDOOR_MARGIN : SPAWN_R)) continue;
      if (pop.spawn(person, a)) this.stats.anchorSpawns++;
    }
  }
  // spawn() asks before allocating a crowd slot: an anchor gets a full model instead (null for everyone else)
  spawnActor(npc) {
    const pp = this.forNpc(npc);
    if (!pp || pp.kind !== 'cast') return null;
    return this.actors.spawn(npc, pp);
  }
  despawnActor(npc) { if (npc.actor) this.actors.despawn(npc); }
  hideActor(npc) { this.actors.hide(npc); }
  setActor(npc, v, d2) { this.actors.set(npc, v, Math.sqrt(d2)); }
  update(dt, time) { this.dialog.update(time); this.actors.update(dt, time); }

  // ------------------------------------------------------------------------------------------------ talking
  // Right-click on a persistent person: their own greeting (first meeting / returning / after a job), the talk box
  // with three asks, the history updated. Returns false for anyone the registry does not know (the generic path).
  talk(npc) {
    const pp = this.forNpc(npc);
    if (!pp) return false;
    const pop = this.pop, p = pop.player.pos;
    npc.face(p.x, p.z);
    npc.lookAt = { x: p.x, y: p.y + 1.6, z: p.z };
    npc.talkingT = 12;
    if (npc.state === 'at') npc.timer = Math.max(npc.timer, 8);
    pop.stats.talks++; this.stats.talks++;
    const line = this.dialog.lineFor(pp, { trigger: 'greet', talkOpen: true });   // selected against the history before this talk
    this.registry.recordTalk(pp);
    const said = line ? this.deliver(pp, npc, line, true) : null;
    pop.talkBox.open(npc, said ? said.text : `${pp.name} looks up.`, this.options(npc, pp, null), this.registry.describe(pp));
    return true;
  }
  options(npc, pp, asked) {
    const ask = (key, label, sel) => ({ key, label, act: () => this.reply(npc, pp, key, sel) });
    const rel = pp.relationships[0];
    const all = [
      ask('work', 'What do you do here?', { cats: ['work'] }),
      ask('news', 'How are things?', { cats: ['personal', 'event'] }),
      ask('task', 'Any work for me?', { cats: ['task'] }),
      ask('trust', rel ? `Where do I stand with you and ${rel.name.split(' ')[0]}?` : 'Where do I stand with you?', { cats: ['trust'] }),
    ].filter((o) => o.key !== asked);
    const out = all.slice(0, 2);
    out.push({ label: 'Thanks, take care.', act: () => null });
    return out;
  }
  reply(npc, pp, key, sel) {
    this.stats.replies++;
    const line = this.dialog.lineFor(pp, { ...sel, talkOpen: true });
    this.registry.recordTalk(pp, key);
    if (!line) return { line: `${pp.name} says nothing to that.`, spoken: true, options: this.options(npc, pp, key) };
    const said = this.deliver(pp, npc, line, true);
    return { line: said.text, spoken: true, options: this.options(npc, pp, key) };
  }
  onTalkClose(npc, turns) {
    const pp = this.forNpc(npc);
    if (!pp || npc.dead || turns < 1) return;
    const line = this.dialog.lineFor(pp, { trigger: 'farewell' });
    if (line) { this.deliver(pp, npc, line, true); this.stats.farewells++; }
  }
  // A left-click: an interruption line from the person's own bank (poke lines included)
  poke(npc) {
    const pp = this.forNpc(npc);
    if (!pp) return false;
    const line = this.dialog.lineFor(pp, { trigger: 'interrupt', poke: true });
    if (!line) return false;
    this.stats.pokes++;
    this.deliver(pp, npc, line, true);
    return true;
  }
  // The chatter pick of the population: persistent people speak an ambient line of their own bank (work / event /
  // personal, within the local voice budget); an open talk box within 16 blocks silences everyone. Returns true when
  // the pick has been handled here (spoken or silenced), false to fall through to the shared banks.
  chatter(npc, d2) {
    if (!this.dialog.allowChatter(npc)) return true;
    const pp = this.forNpc(npc);
    if (!pp) return false;
    const line = this.dialog.lineFor(pp, { ambient: true });
    if (!line) return false;
    this.stats.chatter++;
    this.deliver(pp, npc, line, false, d2 < CHAT_CLOSE * CHAT_CLOSE);
    return true;
  }
  // say() through the dialog API (subtitle, voice, bubble, history, budget) plus the population's chat log and the
  // grunt for lines that are not voiced, as speak() does for the shared banks
  deliver(pp, npc, line, important, toChat = important) {
    const pop = this.pop, now = pop.tickCount * 0.05;
    const said = this.dialog.say(pp, line, { npc, important, ambient: !important });
    if (!said) return null;
    pop.lastBubbleAt = now; pop.stats.bubbles++;
    if (toChat && (important || now - this.lastChatAt > 4) && this.game.hud) { this.lastChatAt = now; this.game.hud.addMessage(`<${pp.name}> ${said.text}`); }
    if (!said.voiced && toChat && this.game.audio && this.game.audio.npcGrunt) this.game.audio.npcGrunt(npc.pos, npc.droid ? 2.0 : npc.female ? 1.5 : 1.0);
    return said;
  }

  // ------------------------------------------------------------------------------------------------ census / dispose
  census() {
    const live = [];
    for (const n of this.pop.live) if (n.person.cast) live.push({ id: n.person.cast, name: n.name, x: +n.pos.x.toFixed(1), y: +n.pos.y.toFixed(1), z: +n.pos.z.toFixed(1), state: n.state, act: n.act, actor: !!n.actor, visible: !!(n.actor && n.actor.root.visible) });
    return { ...this.stats, anchorsLive: live.length, live, actors: { ...this.actors.stats }, audio: this.dialog.audioReport(), registry: { ...this.registry.stats } };
  }
  dispose() { this.actors.dispose(); }
}
