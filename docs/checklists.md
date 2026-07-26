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
- [x] Enemy damage → death → mission stats update
- [x] Enemy perception: sees player → combat; hears shot → investigate
- [x] Enemy search after losing player; return to patrol
- [x] Flash blinds enemies; smoke blocks vision
- [x] Glass: shot → breaks, collision removed, AI vision changes
- [x] Hostage: found → secured → follows → waits → extracted
- [x] Full mission victory path (playthrough bot, real navigation + combat)
- [x] Defeat paths: player death, hostage death, timeout
- [x] Pause/resume; settings apply live
- [x] Restart resets: enemies, hostages, doors, glass, ammo, timer, pickups (×3 stress)
- [x] Quality presets + resolution scale function
- [x] Fullscreen F toggle (no-crash assertion in headless)
- [x] 1920×1080 playability screenshot evidence
- [x] Locked door + keycard flow
- [x] Extraction: panel → shutter opens → wave → hold → victory
- [x] Weapon matrix: all 8 weapons fire/reload/switch correctly (incl. shell-by-shell, bolt, pump, ADS, throwables, dry fire)
- [x] Determinism: identical inputs ⇒ identical state across two boots

## Known-issues list
| # | Issue | Severity | Owner | Status |
| --- | --- | --- | --- | --- |
| KI-01 | Pointer-lock rejection pageerror in headless | med | Opus 2 | fixed |
| KI-02 | Weapon can attempt fire during draw (test-visible) | low | Opus 2 | fixed (state machine correct; test timing adjusted) |
| KI-03 | AI door-opening broke door determinism test | low | Opus 4 | fixed (freezeAI in test) |
| KI-04 | SwiftShader render slowness in CI | med | Opus 4 | mitigated (lowspec param + manual-time render skip) |
| KI-05 | Hostage follow across stairs needs validation | high | Opus 3 | fixed (nav door-aware bake + full-loop tests + playthrough audits) |
| KI-06 | Extraction-hold soft-deadlock risk if hostage stuck outside zone | high | Opus 3 | fixed (evac wait loop retries until player+hostages in zone) |
| KI-07 | Conference glass wall may over-expose hostage A to corridor fire | design | Fable 2 | mitigated (blinds on the corridor glass, hostage repositioned to NW corner) |
| KI-08 | Enemies have no collision against player (body overlap possible) | low | Opus 2 | fixed (soft separation steering incl. coincident-spawn case) |
| KI-09 | Draw calls ~6.7k/frame from unmerged props + per-frame shadow pass | high | Opus 4→Opus 1 | fixed (static prop merge ≈10×; shadow refresh throttled to 0.12s) |
| KI-10 | Interior faces of exterior walls showed facade panels | med | Fable 2 | fixed (interior finish liners) |
| KI-11 | Floor-1 slab underside rendered as wood in rooms below | med | Fable 2 | fixed (two-layer slab: floor top + ceiling underside) |
| KI-12 | Muzzle-flash point light overexposed close walls | low | Fable 4 | fixed (intensity 26→7.5) |
| KI-13 | Character joint seams at very close range | low | Fable 4 | fixed (pivot-centered joint balls, full-length limb capsules) |
| KI-14 | SwiftShader (software GL) tabs can crash in very long headless sessions | env | Opus 4 | mitigated (audit bot session-split + retries; not a game defect, hardware GL unaffected) |

## Screenshot index (before/after)
Evidence lives in `screenshots/` (curated) and is referenced from
`docs/screenshot-index.md`.
