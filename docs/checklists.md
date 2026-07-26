# Checklists (living)

## Visual-quality checklist (applies to every asset/room)
- [ ] Correct real-world scale & orientation, useful pivot
- [ ] Believable thickness; no razor edges on close-view geometry
- [ ] Material variation (albedo/roughness/normal), no baked lighting
- [ ] No stretched UVs, no obvious tiling repetition
- [ ] Collision matches visual; no floating/intersecting geometry
- [ ] Reads correctly at gameplay distance and in room lighting
- [ ] No z-fighting, no light leaks, no missing faces/voids
- [ ] Registered in asset registry with metadata
- [ ] Seen + reviewed in a gameplay screenshot

## Playwright scenario checklist
- [x] Boot to title, zero console errors
- [x] Full menu flow: title → difficulty → briefing → loadout → playing
- [x] Movement + collision + door open/close (state + collision + visual)
- [x] Fire: ammo decreases, impacts spawn, recoil applied
- [x] Reload: state transition + ammo restore (incl. shotgun shell loop)
- [x] `advanceTime` determinism (tick/simTime/timer consistency)
- [ ] Enemy damage → death → mission stats update
- [ ] Enemy perception: sees player → combat; hears shot → investigate
- [ ] Enemy search after losing player; return to patrol
- [ ] Flash blinds enemies; smoke blocks vision
- [ ] Glass: shot → breaks, collision removed, AI vision changes
- [ ] Hostage: found → secured → follows → waits → extracted
- [ ] Full mission victory path (assisted + unassisted AI)
- [ ] Defeat paths: player death, hostage death, timeout
- [ ] Pause/resume; settings apply live
- [ ] Restart resets: enemies, hostages, doors, glass, ammo, timer, pickups
- [ ] Quality presets + resolution scale function
- [ ] Fullscreen F toggle (windowed assertion in headless)
- [ ] 1920×1080 playability screenshot evidence
- [ ] Locked door + keycard flow
- [ ] Extraction: panel → shutter opens → wave → hold → victory
- [ ] Weapon matrix: all 8 weapons fire/reload/switch correctly

## Known-issues list
| # | Issue | Severity | Owner | Status |
| --- | --- | --- | --- | --- |
| KI-01 | Pointer-lock rejection pageerror in headless | med | Opus 2 | fixed |
| KI-02 | Weapon can attempt fire during draw (test-visible) | low | Opus 2 | fixed (state machine correct; test timing adjusted) |
| KI-03 | AI door-opening broke door determinism test | low | Opus 4 | fixed (freezeAI in test) |
| KI-04 | SwiftShader render slowness in CI | med | Opus 4 | mitigated (lowspec param + manual-time render skip) |
| KI-05 | Hostage follow across stairs needs validation | high | Opus 3 | open |
| KI-06 | Extraction-hold soft-deadlock risk if hostage stuck outside zone | high | Opus 3 | open |
| KI-07 | Conference glass wall may over-expose hostage A to corridor fire | design | Fable 2 | open |
| KI-08 | Enemies have no collision against player (body overlap possible) | low | Opus 2 | open |

## Screenshot index (before/after)
Evidence lives in `screenshots/` (curated) and is referenced from
`docs/screenshot-index.md`.
