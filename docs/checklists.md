# Checklists — Northstar Rescue

## Visual-quality checklist (per area / per asset pass)

- [ ] Correct real-world scale (doors 0.9×2.05 m, desks 0.75 m high, ceilings 2.7–3.0 m)
- [ ] Beveled/thick exposed edges on frequently viewed geometry (no razor edges)
- [ ] Material variation (roughness NOT uniform; metal/wood/fabric/plastic distinct)
- [ ] No baked-in fake lighting in base color
- [ ] Lighting: readable, palette-conformant (cold windows / neutral office / warm accents / dark-but-readable service)
- [ ] No crushed blacks or blown-out windows; enemies readable everywhere
- [ ] No z-fighting, no floating props, no intersecting meshes, no stretched UVs
- [ ] No light leaking through walls
- [ ] Decals grounded (wear, scuffs, stains) without conspicuous repetition
- [ ] Silhouettes readable at gameplay distance
- [ ] Storytelling: rooms look inhabited and purposeful
- [ ] Consistent with `docs/visual-bible.md`

## Playwright scenario checklist

- [ ] PW-01 Boot: title screen renders, zero console errors
- [ ] PW-02 Full menu flow: title→settings (change+persist)→difficulty→briefing→loadout→loading→playing
- [ ] PW-03 Movement: WASD, crouch, jump; position/velocity reflected in render_game_to_text
- [ ] PW-04 Look: injected mouse deltas change orientation exactly (sensitivity, invert-Y)
- [ ] PW-05 Fire chain: ammo decreases, recoil applied, impact FX spawn, surface hit registered
- [ ] PW-06 Reload chain: state transitions, correct ammo restored (tactical + empty reload)
- [ ] PW-07 Weapon switching: all loadout slots, draw/holster states
- [ ] PW-08 Damage chain: enemy hit → health decreases → death → mission state updates
- [ ] PW-09 Player damage/armor/death → defeat screen → restart works cleanly
- [ ] PW-10 Doors: open/close/locked; collision + nav + text state agree
- [ ] PW-11 Hostage: discover → interact → follows → stop/resume → extraction zone
- [ ] PW-12 Extraction: both hostages secure+extracted → victory screen
- [ ] PW-13 Timer runs; objective states progress in order
- [ ] PW-14 AI: patrol movement, hears shot → investigates, sees player → combat, loses → search
- [ ] PW-15 AI cannot see through walls (LOS negative test)
- [ ] PW-16 Pause/resume: sim freezes, HUD hidden, resume restores
- [ ] PW-17 Restart mid-mission: full state reset (enemies, hostages, ammo, timer, doors)
- [ ] PW-18 Quality settings switch live; resolution scale changes buffer size
- [ ] PW-19 Fullscreen F enters, Esc exits
- [ ] PW-20 Resize: canvas+camera+UI adapt at 1920×1080 and smaller
- [ ] PW-21 QA hooks: teleports, weapon select, spawn enemy, freeze AI, lighting scenarios, gallery
- [ ] PW-22 Console clean across the complete mission playthrough
- [ ] PW-23 Flash device: blinds enemies with LOS; smoke blocks AI vision
- [ ] PW-24 Glass: shots crack/break panes, fragments spawn, AI vision changes
- [ ] PW-25 Performance: stepped frame budget within target on quality=low

## Before/after screenshot index

Maintained at `docs/evidence/README.md` (graybox vs final comparisons per area).
