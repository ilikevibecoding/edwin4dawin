# Rubric 14 — Persistent people, thirty lines each, the thirteen-anchor cast, speech with subtitles

Goal (spec §11, §12, §13, §16): the Coruscant crowd stays for scale, but the people who *count* are persistent: a
stable identity with a job, a home, a workplace room, a schedule, a behaviour state, needs, relationships, limited
knowledge, a disposition and an interaction history that survives a reload. Every one of them has at least thirty
meaningfully distinct lines chosen by eligibility from real game state, spoken aloud where a speech voice exists and
subtitled always. Thirteen named anchors carry the systems and know each other.

## Acceptance criteria

| # | Criterion | Measure |
| --- | --- | --- |
| 1 | **Persistent registry.** `game.cast.list()` returns 600-1000 persistent people: the 13 anchors plus, for every purposed Coruscant lot, the owner/manager and one key role. Each has a stable id (`cast:<id>` or `lot:<lotId>:<role>:<n>`), name, appearance seed, home lot, work lot **and room**, schedule, needs, disposition, knowledge limits, relationships and an interaction history. Lot staff map onto the existing census person (same key, same W4 schedule). | `scripts/test-cast.mjs` offline: count, field presence, census mapping |
| 2 | **One state at a time.** `person.state` is one of commuting, working, serving, eating, resting, sleeping, conversing, investigating, waiting-for-resources, fleeing, recovering; the set allowed per role is declared and a person is never reported in two states. | offline: state transitions over a simulated day; allowed-set check |
| 3 | **Relationships are bidirectional and practical.** owner <-> supplier's owner (from `game.economy.business(lot).suppliers` when present, else the nearest supplying trade), coworkers, family in a residential lot, a regular customer; every edge has its reverse. Anchors' relationships match §13 (Vela/customs supervisor and a veteran pilot, Brin/Tessa repair bill, Tessa/components vendor, Seli/market grocer and a missing regular, Nera/supplier, Ilen/Asha committee, Seran/Senate, Tavi/family, Koro/gang and Tessa, Mira/residents, Ral/respectable clients). | offline: symmetry assert; per-anchor edge list |
| 4 | **Knowledge limits.** An NPC's context only contains its own business's stock/funds, its own district's recent events (`game.events.recent()` filtered), and defined broadcasts (Senate results, disasters). No line reads state outside `person.knows`. | offline: context builder unit test with a foreign-district event |
| 5 | **Interaction history persists.** First met, times talked, jobs completed, favours, offences per NPC; `game.cast.serialize()` / `restore()` round-trip; stored under the save's `cast` key (integrator hook) with defaults so old saves load. | offline round-trip; CDP: talk, reload, `talks` count kept |
| 6 | **Thirty lines, the distribution.** Every persistent NPC's bank has >= 30 records with >= 5 greeting/recognition, >= 6 work/service, >= 5 personal/neighbourhood, >= 5 current-event/world-state, >= 4 trust/faction/access, >= 3 task/quest, >= 2 interruption/farewell. Anchors have >= 40. | offline over the whole registry |
| 7 | **Line record.** `{ id, speaker, text, delivery, trigger, priority, cooldown, refs, audio }`; ids stable across runs; `refs` name the state read (`economy:stock:<lot>:<item>`, `event:senate:result`, `ship:pad:<n>`, `history:talks`, ...). | offline schema check |
| 8 | **Meaningfully distinct.** Within one NPC every pair of lines has normalised Levenshtein distance >= 0.35. At least 50 % of each NPC's lines appear verbatim in no other NPC's bank. No line is a well-known film quote (blocklist). | offline over the whole registry |
| 9 | **Every line reachable; no false claims.** A scenario generator derives a context from each line's trigger and the line must be eligible in it; a shortage / completed-repair / political-result line is ineligible when the state does not support it. Rumours carry `rumor: true` and a rumour delivery. | offline: reachability + state-claim guard tests |
| 10 | **Selection.** `game.dialog.lineFor(npc, ctx)` filters by eligibility, skips the last 5 heard per NPC, honours per-line cooldowns, orders by priority, breaks ties deterministically (no `Math.random`). | offline: 200-step run per NPC |
| 11 | **Audio budget.** At most one voiced speaker within 24 blocks; an open talk box suppresses incidental chatter within 16 blocks; the crowd's non-persistent citizens keep the W4 banks. | offline budget unit test; CDP chatter check |
| 12 | **The cast in the world.** All 13 anchors bound to real places: Vela at the port control desk, Brin owning the light freighter of pad 8 (`game.shipTraffic`), Tessa at a repair hangar lot, D4-LT at the power plant, Seli at a diner, Nera at a clinic, Ilen in a Senate office, Asha in a Senate office (delegation 0 when `game.senate` exists), Seran Temple <-> Senate, Tavi at a transit station living in worker apartments, Koro at a salvage yard, Mira at a residential garden terrace, Ral at a freight depot. Schedules are conflict-free (one place per hour). | offline: lot kinds/rooms/ship asserted; 24 h schedule scan |
| 13 | **Full models.** Anchors render as W9 `composeAppearance` + `buildAppearanceModel` articulated models (limbs, head look, blink, lighting), never as crowd instances; a static LOD beyond 28 blocks. They follow the W4 planner/nav, are never recycled while in view, and are re-placed at their scheduled place when the player returns. | CDP: `game.cast.actors` count, model kind; screenshots |
| 14 | **Talk.** Right-click opens the talk box with 2-3 options leading to different line categories; the reply is subtitled and spoken; `history.talks` increments; the box says "text only" when no voice exists. | CDP: talk to three anchors |
| 15 | **Speech + subtitles.** Web Speech with per-NPC deterministic pitch/rate (species ranges, droids clipped/monotone); subtitle overlay with speaker name; admin "Dialogue" section: subtitles toggle, dialogue volume, voice on/off, persisted in localStorage. With no voices every spoken line lands in `game.dialog.unvoiced` and `audioReport()` says text-only; text-only is never labelled voiced. | CDP: manifest fills; panel screenshot |
| 16 | **Budget.** Senate view, Light, rd 10: <= +4 ms JS/frame, <= +20 draw calls, <= +40 MB heap versus `?cast=0`. | `scripts/bench.mjs` before/after |
| 17 | **Determinism and hygiene.** Everything seeded from layout/lot seeds and NPC ids; `game.mode` read only; `npm run test-unit`, `npm test`, `scripts/test-dialog.mjs`, `scripts/test-cast.mjs` green. | CI |

## Design notes

- `src/npc/cast/roster.js` — the 13 anchors as data: identity, appearance options, lot/room/ship binding rules,
  schedule template, disposition, knowledge, relationships (by anchor id or by role at a lot).
- `src/npc/cast/persistent.js` — `CastRegistry`: builds the registry from the census pool, exposes
  `get/list/nearby/serialize/restore`, tracks states and history, resolves anchor spots (pad 8, the port desk) and
  hands `talk()`/ambient chatter to the dialog API. `installCast(game, pop)` attaches `game.cast` and `game.dialog`.
- `src/npc/cast/actors.js` — the full-model renderers for anchors that are live citizens.
- `src/npc/dialog/bank.js` — line composition: trade family x personality x situation fragments filled with the
  person's real names, places and state; `src/npc/dialog/castLines.js` — the anchors' authored lines.
- `src/npc/dialog/api.js` — `DialogAPI` (`lineFor`, `say`, `unvoiced`, `audioReport`, budget);
  `src/npc/dialog/context.js` — builds an NPC's context from real state within its knowledge limits;
  `src/npc/dialog/voice.js` — Web Speech + subtitles + settings.
- Integrator hooks (outside P1's files): `save.js` gains a `cast` blob (`setCast`, in `serialize()`), `game.js`
  `persistState()` calls `this.cast.serialize()`; both listed in the P1 report.
