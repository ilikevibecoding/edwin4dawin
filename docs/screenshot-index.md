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
