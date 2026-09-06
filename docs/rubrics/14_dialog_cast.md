# Rubric 14 — Persistent people, thirty lines each, the thirteen-anchor cast, speech + subtitles

Derived from `docs/overhaul/SPEC.md` §11 (persistent NPCs), §12 (thirty distinct lines), §13 (the starting cast) and
§16 (subtitles, dialogue volume). Every row is testable: the checker column names the script or the in-page probe that
proves it. Verified by `node scripts/test-cast.mjs` (offline, plus `--url` for the CDP rows) and
`node scripts/test-dialog.mjs`.

## A. Persistent people (§11)

| # | Criterion | Checker |
| --- | --- | --- |
| A1 | Every Coruscant lot with roles has persistent staff: the owner/manager and one key role; 600-1000 persistent people in total, each with a stable id (`cast:<id>` or `lot:<lotId>:<job>:<slot>`) | test-cast: count, id format, one owner per purposed lot |
| A2 | Every persistent person has: name, species/appearance seed, home lot, workplace lot (+ room when the blueprint has one), schedule (the census person's W4 schedule, `activityAt`), current state, needs, relationships, knowledge limits, disposition, interaction history | test-cast: field presence for all |
| A3 | Behaviour states are the spec's list only (commuting, working, serving, eating, resting, sleeping, conversing, investigating, waiting-for-resources, fleeing, recovering); a person has exactly one state at a time, and only states appropriate to their role | test-cast: `stateOf` over 24 h x every person is one allowed state |
| A4 | Relationships are bidirectional and grounded: coworker at the same lot, supplier <-> customer owner (economy `business().suppliers` when present, else the nearest supplying kind), a neighbour at the same home lot, family in residential lots; the cast's edges are the spec's interconnections | test-cast: every edge has its reverse; anchors' edges resolve to real people |
| A5 | Knowledge limits: a person knows their own business (stock, funds), their own district's recent events (`game.events.recent()`), and defined broadcasts (Senate results, disasters) - the dialogue context exposes nothing else | test-cast: context of a diner cook has no other lot's stock; senate result reaches everyone only through the broadcast list |
| A6 | Interaction history (first met, times talked, jobs completed, favours, offences) persists: `game.cast.serialize()` -> `restore()` round-trips, defaults load from an empty save | test-cast: round trip; CDP: talk twice, reload state, `talks` survives |
| A7 | API: `game.cast.get(id)`, `game.cast.list()`, `game.cast.nearby(pos, r)`; `game.dialog.lineFor(npc, ctx)`, `game.dialog.say(npc, line)`, `game.dialog.unvoiced`, `game.dialog.audioReport()` | CDP probe |
| A8 | Positions reconcile: a persistent person out of range sleeps offscreen and is re-placed at their scheduled activity's place when the player returns (never teleported while watched) | test-cast: `activityAt` place for every anchor at every hour is a real lot/port; CDP: cast member spawns at the scheduled lot |

## B. Thirty distinct lines per persistent NPC (§12)

| # | Criterion | Checker |
| --- | --- | --- |
| B1 | >= 30 lines per persistent NPC with the minimum distribution: 5 greeting/recognition, 6 work/service, 5 personal/neighbourhood, 5 current-event/world-state, 4 trust/faction/access, 3 task/quest, 2 interruption/farewell; cast anchors >= 40 | test-cast over every bank |
| B2 | Each line: `{ id, speaker, text, delivery, trigger, priority, cooldown, refs, audio }`; ids unique and stable across runs | test-cast |
| B3 | Within one NPC all lines are pairwise distinct: normalised Levenshtein distance >= 0.35 | test-cast |
| B4 | Cross-NPC: >= 50 % of each NPC's lines appear verbatim in no other NPC's bank (fragments composed from trade x personality x situation and filled with the person's real names/places, not name-swapped templates) | test-cast |
| B5 | Greetings distinguish first meeting / returning / after a completed job from the interaction history | test-cast: scenario contexts pick each |
| B6 | Work lines use job-specific vocabulary and the real workplace name; stock / shortage / waiting-for-component lines read `game.economy` (vendor stock via `purposeFor().sells` and the ledger; `business()` when P2 lands) | test-cast: fills present, no `{`; state-claim guard |
| B7 | State-claim guard: a line that claims a shortage, a completed repair or a political result is eligible only when the state supports it; rumours are marked `rumor: true` and delivered as rumour | test-cast: shortage line ineligible when stock is fine; senate line ineligible with no `senate:result` event |
| B8 | Every line is reachable: the scenario generator produces a context that makes it eligible; unreachable lines fail the test | test-cast |
| B9 | Selection: eligibility filter, no repeat within the last 5 heard per NPC, cooldowns honoured, priority order; deterministic (no `Math.random`) | test-cast |
| B10 | Shared local audio budget: at most one spoken voice within 24 blocks; an open talk box suppresses incidental chatter within 16 blocks | test-cast (budget unit); CDP |
| B11 | No film quotes: a blocklist of well-known Star Wars lines, asserted over every bank | test-dialog + test-cast |
| B12 | Persistent people talk through the new API (talk box + ambient); the non-persistent crowd keeps W4's shared banks | CDP: talk to a cast member returns a line record with an id |

## C. The cast in the world (§13)

| # | Criterion | Checker |
| --- | --- | --- |
| C1 | All 13 anchors exist with the spec's roles: Vela Marr (dockmaster, port control), Brin Tal (freighter captain, owns the light freighter on pad 8), Tessa Venn (repair hangar), D4-LT (droid, utility plant), Seli Noor (diner), Dr Nera Vos (clinic), Ilen Rook (Senate clerk), Senator Asha Merin (delegation 0 / Senate office), Seran Vale (Jedi, Temple <-> Senate), Tavi Renn (courier, transit, worker apartments), Koro Den (salvage co-op, industrial), Mira Sol (garden caretaker, residential), Ral Drenn (freight brokerage front) | test-cast: ids, jobs, lot kinds |
| C2 | Each anchor is bound to a real lot / room / ship of the layout (lot kind matches; the room exists in the blueprint; the ship is `game.shipTraffic`'s light freighter on pad 8) | test-cast |
| C3 | Anchors are full NPC models (`composeAppearance` + `buildAppearanceModel`), animated like the town NPCs, never crowd instances; they are never recycled while in view | CDP: `game.cast.actors` has a scene root per live anchor; no crowd slot |
| C4 | Anchors follow schedules with W4's planner/nav; schedules are conflict-free (one activity per hour) and Seran Vale alternates Temple and Senate | test-cast |
| C5 | Right-click talk opens the talk box with 2-3 options leading to different line categories; the interaction history updates (talks, first met) | CDP |
| C6 | Cast lines reference other cast members by name and shared state (Vela vs the customs supervisor, Brin's repair bill with Tessa, Seli's missing regular, Ilen's committee, Asha's proposal, Seran's investigation, Koro vs the gang, Ral's respectable clients) | test-cast: named references present |

## D. Speech + subtitles (§16)

| # | Criterion | Checker |
| --- | --- | --- |
| D1 | Web Speech (`speechSynthesis`) with deterministic per-NPC pitch/rate (species ranges; droids clipped/monotone) | test-cast: `voiceParams` deterministic, droid flag |
| D2 | Subtitles (speaker name + text) in a DOM overlay for every spoken line | CDP: `#npc-subtitles` shows the line |
| D3 | Admin panel "Dialogue" section: subtitles toggle, dialogue volume, voice on/off, persisted in localStorage | CDP: controls exist, setting survives reload |
| D4 | Without voices (headless Chrome) every spoken line is recorded in `game.dialog.unvoiced`, `audioReport()` says `textOnly: true`, the UI says "text only"; text-only is never labelled voiced | CDP |

## E. Budget and rules

| # | Criterion | Checker |
| --- | --- | --- |
| E1 | At `?x=2975&z=120&y=97.2&yaw=0&pitch=-2&quality=light&rd=10`: <= +4 ms JS/frame, <= +20 draw calls, <= +40 MB heap versus `?cast=0` | `scripts/bench.mjs` before/after |
| E2 | Determinism: everything seeded from the layout/lot seeds and the NPC id; no `Math.random` in simulation or selection | grep + test-cast repeat run |
| E3 | Save state only under the `cast` key, defaults for old saves; `game.mode` read only | code review + test-cast restore(null) |
| E4 | `npm run test-unit`, `npm test`, `test-dialog`, `test-cast` green | CI |
