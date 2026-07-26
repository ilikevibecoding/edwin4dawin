# Final Report — Northstar Rescue (vertical slice 1.0)

## Statement of originality

**No Counter-Strike or Valve asset, sound, texture, model, map section,
name, logo or UI element was copied or used.** Every asset in this project
is generated procedurally by code in this repository (geometry, PBR canvas
textures, characters, weapons, UI, synthesized audio and music). The map is
an original design (footprint, adjacency graph, sightlines, spawns and
identity) for the fictional **Northstar Logistics Group**; hostiles belong
to the fictional **Kestrel Syndicate**; weapons use fictional manufacturers
(Aster Dynamics, Vesper, Borealis Defense, Havelock, Meridian).

## How to run / test

- `npm install && npm run dev` → http://127.0.0.1:5173 (Chromium).
- `npm test` — 52 Playwright scenarios (all green; one `fixme` reserved to
  enforce a stricter future draw-call budget).
- `node tools/playthrough.mjs` — scripted full-mission audit (walks, opens
  doors, climbs stairs, fights, secures + escorts both hostages, extraction
  hold → victory). Three consecutive audits ended in victory with zero
  console errors.
- `npm run shots` — room-by-room screenshot matrix.

## Room-by-room checklist (all inspected via screenshot matrix + playthroughs)

| # | Area | Built | Furnished | Inspected | Notes |
|---|---|---|---|---|---|
| 1 | Snow-covered employee entrance (courtyard) | ✅ | ✅ | ✅ | drifts, planters, flagpole, mats, falling snow |
| 2 | Security vestibule | ✅ | ✅ | ✅ | glazed sidelights, notice board, boot tray |
| 3 | Reception lobby | ✅ | ✅ | ✅ | two-story, clerestory light, brand walls, reception desk |
| 4 | Visitor waiting area | ✅ | ✅ | ✅ | sofas, brochures, courtyard windows |
| 5 | Open-plan cubicle floor | ✅ | ✅ | ✅ | 7 pods, collab corner, print corner, columns |
| 6 | Conference room (hostage A) | ✅ | ✅ | ✅ | glass wall + blinds, boat table, projection screen |
| 7 | Executive corridor | ✅ | ✅ | ✅ | floor 1, art frames, warm palette |
| 8 | Executive office (hostage B) | ✅ | ✅ | ✅ | corner office, wood floor, panorama windows |
| 9 | Records archive | ✅ | ✅ | ✅ | rolling racks, filing wall |
| 10 | Copy & mail room | ✅ | ✅ | ✅ | large copier, work counter, sorting shelves |
| 11 | Break room & kitchen | ✅ | ✅ | ✅ | kitchen run, vending ("Frostbite"), tables |
| 12 | IT workspace | ✅ | ✅ | ✅ | dual-monitor desks, spares shelving |
| 13 | Server room | ✅ | ✅ | ✅ | 6 racks w/ LEDs, UPS, keycard door |
| 14 | Restrooms (M+W) | ✅ | ✅ | ✅ | vanities, stalls, urinals, wainscot |
| 15 | Janitor closet | ✅ | ✅ | ✅ | cart, mop, chemical shelf |
| 16 | Electrical room | ✅ | ✅ | ✅ | panels, transformer, conduit |
| 17 | Central stairwell | ✅ | ✅ | ✅ | U-stair + solid core, handrails, sconces |
| 18 | Service corridor | ✅ | ✅ | ✅ | concrete, ducts, block wainscot |
| 19 | Loading area | ✅ | ✅ | ✅ | roller shutter, pallets, freight |
| 20 | Extraction garage | ✅ | ✅ | ✅ | Northstar van (evac), exit shutter, panel |
| 21 | Two hostage locations | ✅ | ✅ | ✅ | conference (A) + executive office (B) |
| 22 | Exterior snow areas | ✅ | ✅ | ✅ | playable courtyard + visible south yard/roads/lot |
| + | File room, first-aid, storage, security office, mezzanine, corridors | ✅ | ✅ | ✅ | added by the design for loops/purpose |

Map design requirements verified in play: two routes to each hostage
(conference via corridor or cubicle floor; exec office via landing door or
mezzanine gallery), loops (records↔file room↔copy, south corridor ring),
controlled long sightlines (north + south corridors), chokepoints with
alternates, no dead ends, no voids (environment closes every view).

## Weapon checklist (each state validated by Playwright + screenshots)

| Weapon | Fire | Reload | Special | ADS | Damage chain | Icons/HUD |
|---|---|---|---|---|---|---|
| AD-9 Sidearm | ✅ semi | ✅ partial+empty | slide lock-back | ✅ | ✅ | ✅ |
| Vesper K10 (SMG) | ✅ auto 780rpm | ✅ | — | ✅ | ✅ | ✅ |
| BDR-15 Carbine | ✅ auto 660rpm | ✅ | penetrates drywall | ✅ | ✅ | ✅ |
| Havelock S8 (shotgun) | ✅ pump-gated | ✅ shell-by-shell, interruptible | pump state+sound | ✅ | ✅ | ✅ |
| Meridian LR-7 (precision) | ✅ bolt-gated | ✅ | scope overlay, bolt state+sound | ✅ | ✅ | ✅ |
| K2 Field Knife | ✅ melee | — | — | — | ✅ | ✅ |
| MK2 Dazzler (flash) | ✅ throw+fuse | — | blinds AI+player by LOS/facing | — | ✅ | ✅ |
| Cirrus Screen (smoke) | ✅ throw+fuse | — | blocks AI vision (verified) | — | ✅ | ✅ |

Viewmodel: draw/holster, idle sway, movement bob, fire kick + blowback,
mag-out/in, chambering, dry-fire twitch, landing dip; sights align at ADS
(verified numerically, NDC 0.000/−0.002); no camera or wall clipping seen.

## Character checklist

- First-person arms + gloves ✅ (all weapons, all animations)
- Hostile outfits: merc / scout / heavy ✅ (3) with red readability accents
- Head variants: balaclava, beard+beanie, cap, helmet+goggles ✅ (4), 3 skin tones
- Hostages: analyst + manager ✅ (2)
- Animations: idle/breathe, walk, run, crouch, aim, fire, reload (AI pauses),
  investigate/search behaviors, flinch (blood puff + suppression), 2 death
  variants, hostage kneel/fear/follow/wait/extracted ✅
- No mesh separation at close range after the joint-seal pass ✅ (evidence:
  screenshots/characters/seams-*.png)

## Performance summary

- Busy-view draw calls ~600–900 (was ~6,700 before the static-merge +
  shadow-throttle pass); triangles ~0.3–0.7 M per frame incl. shadow pass.
- Quality presets Low/Medium/High/Ultra scale shadow map size (1–4k),
  dynamic light pool (6–24) and particle budgets; independent resolution
  scale 50–100%; verified functional in tests.
- Fixed 60 Hz simulation is decoupled from rendering; `advanceTime` test
  clock; SwiftShader (software GL) runs the whole suite headless.

## Evidence index

- `screenshots/matrix-final/` — every room, final build (high quality)
- `screenshots/graybox/` — the same views at graybox phase (before/after)
- `screenshots/playthrough-final/` — full-mission beat-by-beat run
- `screenshots/evidence-1080p/` — 1920×1080 gameplay frames
- `screenshots/characters/`, `viewmodel/`, `props/`, `materials/`,
  `archkit/`, `environment/`, `decals/`, `ui/` — per-discipline acceptance shots
- `docs/asset-manifest.md` — 193 registered assets (generated)

## Known limitations (accepted scope)

- Segmented (non-skinned) characters: readable and seam-free, but cloth
  deformation is stylized rather than organic.
- AI cover selection is sampling-based (hide-and-peek), not a tactical
  cover-point graph; enemies do not use grenades.
- Penetration is limited to thin drywall/doors/glass with damage falloff.
- No environmental audio reverb zones — a single small-room convolution
  approximation is applied globally indoors.
- Headless software-GL (SwiftShader) tabs can crash in very long automated
  sessions; audit tooling splits sessions + retries (hardware GL unaffected).
- Minimap is fixed north-up by design; no rotation option.

## Final audit trail

- Audit 1 (post-art): 10 findings → all fixed (see checklists KI-05…KI-13).
- Audit 2: victory, zero console errors, 1 bot-navigation note (tooling).
- Audit 3: victory, zero console errors (final build).
- Full Playwright matrix green at the final commit.
