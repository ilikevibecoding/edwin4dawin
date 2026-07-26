# Known Issues

Live list. Severity: P0 = non-negotiable defect (blocks completion), P1 = must fix
before final, P2 = polish, P3 = accepted limitation (documented in README).

## Open

| ID | Sev | Area | Description | Owner | Status |
|---|---|---|---|---|---|
| KI-101 | P2 | Characters | Procedural humanoids use articulated primitives; faces are stylized (balaclavas/helmets/hair caps) rather than sculpted | Fable 4 | accepted for slice |
| KI-102 | P2 | Audio | All audio is synthesized; voice lines are radio-squelch + subtitles rather than speech | Opus 1 | accepted for slice |
| KI-103 | P3 | Weapons | No world weapon pickups/drops — armament is loadout-based by design (documented) | Opus 2 | accepted |
| KI-104 | P3 | Rendering | Post-process bloom intentionally omitted after evaluation (HDR blowout + double tonemap with ACES); glow via emissive materials | Opus 1 | accepted |
| KI-105 | P3 | Rendering | Headless SwiftShader runs at ~20–30 fps at 1080p (software rasterizer); real GPUs run far faster. Worst-view draw calls ~770 | Opus 4 | documented |
| KI-106 | P2 | Weapons | Inspect animation not implemented (explicitly optional in brief) | Fable 4 | accepted |
| KI-107 | P2 | AI | Enemy cover selection is sampling-based (hide-from-LOS points), not a precomputed cover-point graph | Opus 3 | accepted for slice |

## Resolved (selection)

| ID | Sev | Area | Description | Resolution |
|---|---|---|---|---|
| KI-001 | P0 | Nav | Nav grid sampled ceiling tops as floors — enemies never patrolled | ground-tag sampling (`floor:`/`stair`/`slab` only) |
| KI-002 | P0 | Nav | Elevated noise stimuli (muzzle at 1.5 m) produced unreachable path goals — investigators froze | floor-tolerant goal snapping + horizontal arrival |
| KI-003 | P0 | UI | Menu panels invisible in headless/software compositing (`backdrop-filter`) and CSS fade stuck at opacity 0 in frame-on-demand test mode | opaque panels; fade gated off in test mode |
| KI-004 | P1 | Combat | ADS placed stock/cheek in front of the camera (black screen) | per-weapon sight anchors + rear-part hiding + red-dot optic |
| KI-005 | P1 | Props | Restroom sink counter narrowed the doorway below player width (S17 catch) | counters relocated to side walls |
| KI-006 | P1 | Props | Hostage B spawned intersecting the conference table | spawn relocated to clear floor |
| KI-007 | P1 | World | Brand wall panel blocked the lobby→hall passage (no collision visual wall) | mounted above the opening on the feature wall |
| KI-008 | P1 | Rendering | UnrealBloom blew out interiors on High/Ultra | bloom removed (see KI-104) |
| KI-009 | P1 | Perf | Draw stats measured only the view-model pass; real worst view was 1026 calls | stats fixed; sun-follow shadow frustum; merged doors/fence/rails/pickets/world-weapons |
| KI-010 | P2 | World | Stair guard panels rendered as floating streaks in the stair core | stepped balusters + sloped handrail |
| KI-011 | P1 | Mission | Late infiltrate trigger downgraded completed hostage objectives | objectives only promote from `hidden` |
| KI-012 | P2 | FX | Cable decals striped across the strip (texture axis) | texture redrawn along V |
