# Rubric 7 — City life: purposes, signs, room functions, NPCs and dialog

Goal: Coruscant stops being a set of interiors and becomes a place where every building is *something*, you know what
it is when you walk in, and hundreds of people are visibly doing the thing the building is for.

## Acceptance criteria

| # | Criterion | Measure |
| --- | --- | --- |
| 1 | Every lot (towers, landmarks, market, undercity buildings, spaceport halls) has a purpose from `purposeFor(lot)`: a category (housing, office, government, hospitality, retail, food, industry, transport, security, culture, medical, media, religion), a specific kind (e.g. `speeder_dealer`, `caf`, `law_office`, `droid_repair`, `holo_arcade`) and a deterministic Star-Wars-flavoured name ("Dex's Diner", "Kuat Systems Annex", "Skyline Residences 4402") | `node scripts/test-purposes.mjs`: 100% of lots named, no two neighbouring lots identical, ≥ 60 distinct kinds across the city, names deterministic per seed |
| 2 | Entrance signs: within 12 blocks of every door the building's name and category are readable — a lit sign board over the door (text rendered on a canvas sprite, Minecraft sign proportions, max 2 lines) **and** a HUD toast "Entering <name> — <category>" when the player crosses a door column | Screenshot of 6 doors day/night; CDP walk through 10 doors logs 10 toasts |
| 3 | Room functions: every room kind in the library has a `function` record: jobs it hosts (e.g. `office → clerk×2 at consoles`, `kitchen → cook`, `medbay → medic + patient beds`, `cantina → bartender + patrons`, `barracks → sleeper beds`, `control_room → operator`, `hangar_bay → mechanic`), the props that show it (consoles, counters, beds, tools) and an idle behaviour (typing, serving, sweeping, welding) | `scripts/test-rooms.mjs`: every room kind has a function; every generated building has ≥ 1 job per 2 rooms; work spots stand on real floor |
| 4 | Population: a deterministic per-district pool (seeded) of ≥ 600 named NPCs across the city; ≥ 120 humanoids + droids visible within 96 blocks of the player in the core districts at midday; spawn/despawn with the player, same people at the same places at the same time of day; ≤ 150 live NPC objects at once; far NPCs instanced (one draw call per skin family) | CDP census at 5 spots × 3 times of day; draw calls ≤ +40 vs baseline |
| 5 | Archetypes with Star Wars skins: office worker, resident, senator, senate aide, guard (Senate Guard blue, Coruscant Security), pilot, mechanic (coveralls + goggles), dock worker, vendor, cook, bartender, medic, patient, tourist, courier, protocol droid, astromech, street-sweeper droid, jedi (rare), bounty hunter (rare), journalist | Skin sheet screenshot, critic verdict on faces (no cyclops, eyes separated) |
| 6 | Schedules: each NPC has home (apartment bed or barracks), work (a job spot from criterion 3 matching its archetype), a meal spot (caf/diner/cantina) and a leisure spot (plaza, opera foyer, arcade, market); day = home → work → meal → work → leisure → home; transitions walk along real routes (streets, lobbies, turbolifts as vehicles or stairs) | Trace 12 NPCs over a compressed day: each visits all four places without teleporting; no NPC stuck > 60 s |
| 7 | Working animations: at work spots NPCs face their prop and animate (arm motion at consoles, hammer/welding torch with spark particles at ship repair bays, tray carrying between kitchen and tables, sweeping) | Recording / CDP shots of 6 job kinds |
| 8 | Dialog: ≥ 20 lines per archetype (≥ 400 lines total), about what they do and what they see: job talk, gossip about the district, reactions to time of day, weather, disasters, the player's actions (breaking blocks in civic areas, flying, wearing nothing), directions ("the Senate is three blocks east"); vendors quote prices; lines are chosen deterministically from context, never repeat within 5 utterances for the same NPC, speech bubbles as today | `scripts/test-dialog.mjs`: counts per archetype, no duplicates, every line ≤ 90 chars, contextual lines fire in tests |
| 9 | Talk interaction: right-click an NPC opens a 2-3 line exchange with 1-3 reply options (ask for directions, ask about work, trade/buy if vendor); the HUD dialog box is Minecraft-styled | CDP interaction test |
| 10 | Bustle: plazas and boulevards at midday show crowds moving with purpose (no idle clusters > 8 NPCs within 4 blocks), speeders/ships overhead, vendors calling; at night the undercity is busier than the boulevards | Critic verdict on 6 screenshots + 1 recording |
| 11 | Performance: with 150 live NPCs JS ≤ +4 ms/frame, draw calls ≤ +40, heap ≤ +80 MB at 10 chunks (Light) | Bench JSON before/after |
| 12 | Determinism/multiplayer: NPCs stay client-side ambience (as in the town); nothing touches the simulation or protocol | `npm test` green |

## Design notes

- `purposeFor(lot)` picks from a catalogue weighted by district (`financial → offices, banks, law`, `residential →
  apartments, cafs, shops`, `civic → ministries, archives, security`, `industrial/works → depots, foundries, droid
  repair`, `undercity → cantinas, pawn, clubs, clinics`, `spaceport → freight, customs, ship dealer, hangars`) and
  by the building's rooms (a tower with a `hangar_bay` room can be a repair shop).
- Signs: one `THREE.Sprite` per door with a 256×64 canvas (name line 1, category line 2), `sizeAttenuation` on,
  culled beyond 48 blocks, shared material per text; ≤ 1 draw call per sign, ≤ 40 signs in view.
- Population manager lives beside the town's `NPCManager` and reuses `NPC`, `pathfinding`, skins/blink, bubbles; its
  own spawn/despawn ring and schedule planner; navigation is local A* inside the current zone (lot interior + its
  street segment); crossing zones uses the lot door, the lift (`meta.lifts`) or the skybridge attachment.
