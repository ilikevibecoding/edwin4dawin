# Screenshot Index (before/after evidence)

All screenshots are produced by Playwright into `artifacts/screenshots/` with the
naming scheme `<phase>/<scenario>-<camera>-<state>.png`.

Phases: `p1-foundation`, `p2-graybox`, `p3-slice`, `p4-assets`, `p6-remaster`,
`p7-final`. Comparison pairs use identical named QA cameras (see `src/dev/qa.ts`
checkpoint list) so graybox-to-final diffs are exact.

| Camera ID | Location | Purpose |
|---|---|---|
| cam-entrance | Employee entrance, facing vestibule | Exterior/snow + entry read |
| cam-lobby | Reception lobby from balcony stair | Two-story hero shot |
| cam-cubicles-long | Cubicle floor long sightline | Main combat read |
| cam-conference | Conference room through interior glass | Glass + warm light |
| cam-exec | Executive office | Warm zone hero |
| cam-server | Server room aisle | Emissive/dark zone |
| cam-break | Break room | Prop density |
| cam-service | Service corridor | Dark navigation lighting |
| cam-garage | Extraction garage from dock | Objective zone |
| cam-stairwell | Central stairwell mid-landing | Vertical connection |
| cam-archive | Records archive aisles | Cover composition |
| cam-atrium-glass | Courtyard window wall | Exterior view/snowfall |

Index of captured evidence is appended below by the test tooling and by hand.

## Evidence log

| Set | Path | Contents |
|---|---|---|
| Phase 2 graybox | `artifacts/shots/p2-graybox/` | all 27 checkpoint cameras, graybox-cover map (before) |
| Phase 4 production | `artifacts/shots/p4/` | furnishing/lighting/perf iterations, extraction & shutter sequence |
| UI & weapon states | `artifacts/shots/ui/` | title, settings, controls, difficulty, briefing, loadout, spawn, pause, ADS/reload/pistol/knife/shotgun/DMR/firing |
| Asset gallery | `artifacts/shots/gallery/` | 55 exhibits: every prop family, 3 hostile outfits × heads, hostages, anim states incl. death, world weapons |
| Contact sheets | `artifacts/shots/sheets/`, `ui-sheets/`, `audit*-sheets/` | review sheets used for the audits |
| Audit 1 | `artifacts/shots/audit1/` | all cameras @high + lighting-emergency, smoke, hostages A/B evidence |
| Audit 2 | `artifacts/shots/audit2/` | all cameras (found: scuff decal defect → fixed, `stairwell-fixed.png`) |
| Audit 3 | `artifacts/shots/audit3/` | all cameras — **clean** |
| Audit 4 | `artifacts/shots/audit4/` | fresh non-checkpoint angles (cubicles-south, balcony-down, garage-north) — **clean** |

Graybox→final comparison: `p2-graybox/<cam>.png` vs `audit3/<cam>.png` (identical cameras).
