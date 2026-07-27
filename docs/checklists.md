# Checklists — Northstar Rescue

## Visual-quality checklist (per area / per asset pass)

- [x] Correct real-world scale (doors 0.9×2.05 m, desks 0.75 m high, ceilings 2.7–3.0 m)
- [x] Beveled/thick exposed edges on frequently viewed geometry (no razor edges)
- [x] Material variation (roughness NOT uniform; metal/wood/fabric/plastic distinct)
- [x] No baked-in fake lighting in base color
- [x] Lighting: readable, palette-conformant (cold windows / neutral office / warm accents / dark-but-readable service)
- [x] No crushed blacks or blown-out windows; enemies readable everywhere
- [x] No z-fighting, no floating props, no intersecting meshes, no stretched UVs
- [x] No light leaking through walls
- [x] Decals grounded (wear, scuffs, stains) without conspicuous repetition
- [x] Silhouettes readable at gameplay distance
- [x] Storytelling: rooms look inhabited and purposeful
- [x] Consistent with `docs/visual-bible.md`

## Playwright scenario checklist

- [x] PW-01 Boot: title screen renders, zero console errors
- [x] PW-02 Full menu flow: title→settings (change+persist)→difficulty→briefing→loadout→loading→playing
- [x] PW-03 Movement: WASD, crouch, jump; position/velocity reflected in render_game_to_text
- [x] PW-04 Look: injected mouse deltas change orientation exactly (sensitivity, invert-Y)
- [x] PW-05 Fire chain: ammo decreases, recoil applied, impact FX spawn, surface hit registered
- [x] PW-06 Reload chain: state transitions, correct ammo restored (tactical + empty reload)
- [x] PW-07 Weapon switching: all loadout slots, draw/holster states
- [x] PW-08 Damage chain: enemy hit → health decreases → death → mission state updates
- [x] PW-09 Player damage/armor/death → defeat screen → restart works cleanly
- [x] PW-10 Doors: open/close/locked; collision + nav + text state agree
- [x] PW-11 Hostage: discover → interact → follows → stop/resume → extraction zone
- [x] PW-12 Extraction: both hostages secure+extracted → victory screen
- [x] PW-13 Timer runs; objective states progress in order
- [x] PW-14 AI: patrol movement, hears shot → investigates, sees player → combat, loses → search
- [x] PW-15 AI cannot see through walls (LOS negative test)
- [x] PW-16 Pause/resume: sim freezes, HUD hidden, resume restores
- [x] PW-17 Restart mid-mission: full state reset (enemies, hostages, ammo, timer, doors)
- [x] PW-18 Quality settings switch live; resolution scale changes buffer size
- [x] PW-19 Fullscreen F enters, Esc exits
- [x] PW-20 Resize: canvas+camera+UI adapt at 1920×1080 and smaller
- [x] PW-21 QA hooks: teleports, weapon select, spawn enemy, freeze AI, lighting scenarios, gallery
- [x] PW-22 Console clean across the complete mission playthrough
- [x] PW-23 Flash device: blinds enemies with LOS; smoke blocks AI vision
- [x] PW-24 Glass: shots crack/break panes, fragments spawn, AI vision changes
- [x] PW-25 Performance: stepped frame budget within target on quality=low

## Before/after screenshot index

Maintained at `docs/evidence/README.md` (graybox vs final comparisons per area).
