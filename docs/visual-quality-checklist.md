# Visual Quality Checklist (Fable 1 gate)

Scored per the per-asset production loop (silhouette, proportion, materials, texture,
lighting response, animation, integration, function, performance, bible-consistency —
all must be ≥ 4/5). This file tracks *scene-level* quality gates.

## Global gates
- [x] No placeholder/flat-shaded geometry (graybox cover fully replaced by the prop library)
- [x] Exposed edges beveled on props/doors/furniture; architectural openings framed & trimmed
- [x] Roughness variation on all large surfaces (procedural roughness maps per material)
- [x] No baked directional light in albedo textures
- [x] No crushed blacks; service spaces darkest but navigable (emergency fixtures + tubes)
- [x] No blown-out windows: exterior shows snow, fence, treeline, mountains from every glass
- [x] Bloom restrained: intentionally omitted; emissive-only glow language (see KI-104)
- [x] Enemies readable at 25 m (dark silhouettes vs bright interiors; snow-camo vs dark server rooms)
- [x] Objective/danger/navigation color language consistent (gold / red / teal)
- [x] No z-fighting (decals polygon-offset), no floating props (audited), no visible void

## Per-room sign-off (audit 1 sweep, `artifacts/shots/audit1/*.png`)
| Room | Furnished | Lit per plan | Decals/story | Collision | Screenshot | Signed |
|---|---|---|---|---|---|---|
| Employee entrance (snow) | ✓ | ✓ canopy tube | snow tracks, mat | ✓ | entrance/spawn.png | Fable 1 |
| Security vestibule | ✓ gates, mat, coat rack | ✓ | wet grime | ✓ | vestibule.png | Fable 1 |
| Reception lobby | ✓ desk, brand wall, banners, planters | ✓ 2-story plan | wear paths, Kestrel crates | ✓ | lobby.png | Fable 1 |
| Visitor waiting | ✓ sofa, chairs, rack, cooler | ✓ warm | wear | ✓ | waiting/mainhall.png | Fable 1 |
| Cubicle floor | ✓ 10 pods, screens, chairs, cabinets | ✓ 4-grid fluorescent | papers, stains, leak pair | ✓ | cubicles.png | Fable 1 |
| Conference room | ✓ table, 9 chairs, display, whiteboard | ✓ warm pendant | scattered papers | ✓ | conference.png | Fable 1 |
| Executive corridor | ✓ benches, plants, signs | ✓ clerestory + troffers | wear | ✓ | execcorr.png | Fable 1 |
| Executive office | ✓ desk, sofa, bookcases, laptop | ✓ warm lamps | — | ✓ | exec.png | Fable 1 |
| Records archive | ✓ 4 racks + boxes, desk | ✓ | grime, paper | ✓ | records.png | Fable 1 |
| Copy/mail room | ✓ copier, shelving, desk | ✓ | toner grime, papers | ✓ | copy.png | Fable 1 |
| Break room/kitchen | ✓ kitchen, fridge, vending, tables | ✓ warm | bin grime, stain | ✓ | breakroom.png | Fable 1 |
| IT workspace | ✓ benches, dual screens, shelving | ✓ | cable runs | ✓ | itroom.png | Fable 1 |
| Server room | ✓ 6 racks, UPS, admin desk | ✓ LED + cyan | cable decals | ✓ | server.png | Fable 1 |
| Restrooms ×2 | ✓ sinks, mirrors, stalls, dryers | ✓ | damp grime | ✓ | restrooms.png | Fable 1 |
| Janitor closet | ✓ shelf, cart, ladder | ✓ | — | ✓ | janitor.png | Fable 1 |
| Electrical/mechanical | ✓ panels, HVAC, pipes | ✓ dim tubes | heavy grime, cables | ✓ | mech.png | Fable 1 |
| Central stairwell | ✓ balusters, exit signs | ✓ shaft tubes | step wear, scuffs | ✓ | stairwell2.png | Fable 1 |
| Service corridor | ✓ pipes, tray, shelving | ✓ dim + red accents | grime, stains, cables | ✓ | servicecorr.png | Fable 1 |
| Loading area | ✓ pallets, crates, duct, truck | ✓ cool bay | tire grime | ✓ | loading.png | Fable 1 |
| Extraction garage | ✓ van, bench, barrels, controls | ✓ sodium | oil stains, wear | ✓ | garage.png | Fable 1 |
| Exterior courtyard | ✓ fence, benches, planters, flag | ✓ overcast + snowfall | drifts, tracks | ✓ | courtyard.png | Fable 1 |
| Lobby balcony (bonus) | ✓ bench, plants, rails | ✓ | wear | ✓ | balcony.png | Fable 1 |
| Security office (bonus) | ✓ console, lockers | ✓ | — | ✓ | security.png | Fable 1 |

## Weapon & character state checklist (evidence: `artifacts/shots/ui/`, `artifacts/shots/gallery/`)
- [x] C-7 carbine: hip / ADS (red-dot) / reload stages / firing (tracer, casing, flash)
- [x] KIS-10, BR-8, LR-30, P-9: hip + draw + ADS anchors (10–15 series)
- [x] Fieldmate blade: draw + swing pose
- [x] Starburst / Whiteout devices: draw, throw, detonation effects (S24/S25 + smoke-test2.png)
- [x] Kestrel variants: charcoal/olive/snow × 4 heads; idle/walk/aim/search/death (gallery)
- [x] Hostages: analyst + engineer; kneel/fear/follow (gallery + hostage-server.png)
