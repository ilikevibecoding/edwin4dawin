# Screenshot index — before / after and graybox to final

Owner: **Opus 4**. Every PNG in `screenshots/` has a sibling `.json` holding the
`render_game_to_text()` payload captured on the same frame, so the rendered
image and the reported state can always be compared directly.

## Graybox → final

The map was authored as room rectangles and the shell is *derived* from them, so
"graybox" is a rendering mode rather than a throwaway build: the same layout data
that produced the graybox produces the final building. The progression is
therefore visible as material and dressing passes over unchanged geometry.

| Stage | Evidence | What changed |
| --- | --- | --- |
| Graybox geometry | `screenshots/rooms/*-pass1.png` (first capture matrix, medium quality) | Derived shell, doors, glazing, lighting fixtures; no dressing |
| First dressed pass | `screenshots/rooms/*.png` | 885 props placed, signage and decal atlases |
| Review pass 1 | `screenshots/fable3/*.png` | Baseline before the screen-content, book-spine and storytelling work |
| Review pass 2 | `screenshots/fable3b/*.png` | Screens showing content, cover pass, storytelling beats |
| Review pass 3 | `screenshots/fable3c/*.png` | Restrooms re-laid, vestibule gate lane, boardroom west bay |
| Final audit | `screenshots/rooms-audit/*.png` | 33 composed viewpoints, one per room |

## Before / after, by defect

| Defect | Before | After | Change |
| --- | --- | --- | --- |
| First-person arms were a bare skin tube | `screenshots/fable4/before-lobby.png` | `screenshots/fable4/after-lobby.png` | Sleeve, cuff, glove, articulated fingers, IK support hand on the handguard |
| Hostiles read as flat toy figures | `screenshots/fable4/before/openplan-centre.png` | `screenshots/fable4/after/openplan-centre.png` | Jacket / carrier / webbing value separation, pouches, radio, armband, low-ready carry |
| Monitors were blank white rectangles | `screenshots/fable3/openplan-centre.png` | `screenshots/fable3b/openplan-centre.png` | 13 original screen-content kinds on one atlas |
| Executive office read as corrugated cardboard | `screenshots/rooms/exec-office.png` | `screenshots/fable3b/exec-office.png` | Walnut regrained from 11 hard rings to 4.5 soft ones; carpet desaturated; room filled |
| Ceilings blown to flat white | `screenshots/probe-lobby-high.png` | `screenshots/rooms-audit/lobby.png` | Emitters moved 0.55 m below the soffit, bloom threshold raised, exposure reduced |
| Scene too dark at low quality | `screenshots/probe-lobby-low.png` | `screenshots/quality/openplan-low.png` | Ambient term added, hemisphere raised, fluorescent output rebalanced |
| Restrooms impassable | `screenshots/fable3b/*` (room absent from nav) | `screenshots/fable3c/restroom.png` | Room re-laid, doors widened to 1.0 m, narrow-doorway nav fallback |
| Menu order wrong | `screenshots/flow/step-05-loadout.png` (old order) | `screenshots/flow/step-04a-briefing-ground.png` → `step-05-loadout.png` | Difficulty → briefing → loadout → deploy |

## Flow evidence (`screenshots/flow/`)

| File | Step |
| --- | --- |
| `step-01-title.png` | 1 Title screen |
| `step-02a-settings.png`, `step-02b-settings-video.png`, `step-02c-controls.png` | 2 Settings and controls |
| `step-03-difficulty.png` | 3 Difficulty selection |
| `step-04a-briefing-ground.png`, `step-04b-briefing-upper.png` | 4 Mission briefing, both floor plans |
| `step-05-loadout.png` | 5 Loadout selection |
| `step-07-spawn.png` | 6 Loading, 7 Player spawn |
| `step-08-approach.png`, `step-08b-inside.png` | 8 Office infiltration |
| `step-09-hostage-found.png` | 9 Hostage discovery |
| `step-10-escort.png` | 10 Escort phase |
| `10-extraction-hold.png` | 11 Extraction |
| `step-12-victory.png`, `12-defeat.png` | 12 Victory / defeat |
| `step-13a-restarted.png`, `step-13b-menu.png` | 13 Restart and return to menu |
| `20-paused.png` | Pause menu |
| `13-before-restart.png`, `14-after-restart.png` | Restart state reset |

## Combat evidence (`screenshots/combat/`)

`01-after-burst.png` · `02-after-reload.png` · `03-hostile-hit.png` ·
`04-hostile-down.png` · `05-glass-damage.png` · `06-smoke-and-flash.png`

## Other sets

| Directory | Contents |
| --- | --- |
| `screenshots/doors/` | Closed and open door states with collision and text state |
| `screenshots/hostage/` | Held and following states |
| `screenshots/rooms-audit/` | 33 composed viewpoints, one per room, with state payloads |
| `screenshots/rooms/` | 50-viewpoint capture matrix with `index.json` (draw calls and triangles per view) |
| `screenshots/quality/` | The open plan at low, medium, high and ultra |
| `screenshots/resolution/` | 1920×1080 gameplay |
| `screenshots/gallery/` | Asset gallery interface |
| `screenshots/ai/` | Alerted hostiles, firefight |

## Reproducing the evidence

```bash
npm start                                             # in one terminal
npm test                                              # full matrix, writes screenshots/
node tests/tools/capture-matrix.mjs --quality=high --out=screenshots/rooms
node tests/tools/generate-manifest.mjs                # regenerates docs/asset-manifest.md
node tests/tools/probe.mjs --quality=medium --play --at=lobby   # single fast view
```
