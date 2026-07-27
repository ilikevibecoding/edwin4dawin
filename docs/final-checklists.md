# Final Checklists — Northstar Rescue

Verified on the final build (47/47 Playwright tests green, two consecutive runs; audits #1 and #2
complete with all findings fixed). Evidence: `docs/evidence/` (86 curated frames + index),
`artifacts/shots/` (working captures), `docs/reports/wp-016.md` (defect audit table).

## Room-by-room checklist (all 22 required areas + extras)

| # | Required area | Implemented as | Inspected | Evidence |
|---|---|---|---|---|
| 1 | Snow-covered employee entrance | Entrance plaza w/ canopy, monolith sign, flagpoles, drifts | ✅ | `evidence/rooms--plaza.jpg`, `rooms--plaza-spawn.jpg` |
| 2 | Security vestibule | Badge airlock w/ glass walls, card gates | ✅ | `evidence/rooms--vest.jpg` |
| 3 | Reception lobby | Two-story atrium, brand wall, curved reception desk | ✅ | `evidence/rooms--lobby.jpg`, `rooms--lobby-desk.jpg` |
| 4 | Visitor waiting area | South-east lounge, sofas, winter view curtain wall | ✅ | `evidence/rooms--wait.jpg` |
| 5 | Main open-plan cubicle floor | Upper-floor cubicle field w/ pods, monitors, clutter | ✅ | `evidence/rooms--cubes.jpg`, `rooms--cubes-west.jpg` |
| 6 | Conference room | Glass-front boardroom w/ table, display | ✅ | `evidence/rooms--conference.jpg` |
| 7 | Executive-office corridor | Wood-panelled corridor w/ wainscot | ✅ | `evidence/rooms--exec-corr.jpg` |
| 8 | Executive office | Corner office, hostage site B dressing | ✅ | `evidence/rooms--exec.jpg` |
| 9 | Records archive | Rolling racks, banker's boxes, cart | ✅ | `evidence/rooms--records.jpg` |
| 10 | Copy and mail room | Copier hero prop, sorting, reams | ✅ | `evidence/rooms--copy.jpg` |
| 11 | Break room and kitchen | Cabinets, appliances, vending, café tables | ✅ | `evidence/rooms--break.jpg` |
| 12 | IT workspace | Benches, equipment, dual monitors | ✅ | `evidence/rooms--it.jpg` |
| 13 | Server room | Dark data center, LED racks, hostage site A | ✅ | `evidence/rooms--server.jpg`, `chars--hostage-a.jpg` |
| 14 | Restrooms | M/W pair, stalls, mirrors, wet decals | ✅ | `evidence/rooms--rr-m.jpg`, `rooms--rr-w.jpg` |
| 15 | Janitor closet | Cart, mop, shelving, chemicals | ✅ | `evidence/rooms--janitor.jpg` |
| 16 | Electrical/mechanical room | Panels, transformer, HVAC, ducts | ✅ | `evidence/rooms--mech.jpg` |
| 17 | Central stairwell | Dogleg stair, dado, signage, rails | ✅ | `evidence/rooms--stair-a.jpg`, `rooms--stair-a1.jpg` |
| 18 | Service corridor | 38 m spine w/ exposed services (long sightline #1) | ✅ | `evidence/rooms--sc-west.jpg`, `rooms--sc-mid.jpg` |
| 19 | Loading area | Dock, crates, pallets, hand truck | ✅ | `evidence/rooms--loading.jpg` |
| 20 | Extraction garage | Response van, roll shutter, markings | ✅ | `evidence/rooms--garage.jpg`, `moments--extraction-zone.jpg` |
| 21 | Two hostage locations | Server room (A) + executive office (B), dressed | ✅ | `evidence/chars--hostage-a.jpg`, `chars--hostage-b.jpg` |
| 22 | Exterior snow area / courtyard | Entrance plaza + west courtyard, fenced, snowbound | ✅ | `evidence/rooms--plaza.jpg`, `rooms--courtyard.jpg` |
| + | Security office | CCTV wall, interview table, struggle dressing | ✅ | `evidence/rooms--sec.jpg` |
| + | Service stair B | Secondary vertical route | ✅ | `evidence/rooms--stair-b.jpg`, `rooms--stair-b1.jpg` |
| + | Mezzanine gallery ring | Atrium overlook w/ skylight | ✅ | `evidence/rooms--mezz-south.jpg`, `rooms--mezz-west.jpg`, `rooms--mezz-east.jpg` |
| + | Print & supply, HR, quiet room, storage, corridors | Purposeful support spaces | ✅ | `evidence/rooms--print.jpg`, `rooms--hr.jpg`, `rooms--well.jpg`, `rooms--store.jpg`, `rooms--corr-*.jpg` |

Map-design requirements verified: ≥2 routes to each hostage (server: IT/security door + mech back
door; exec: main stair + service stair via north corridor), short/medium combat everywhere,
controlled long sightlines (service corridor; north corridor + conference glass), landmarks (atrium,
brand wall, garage, server glow), loops on both floors (verified nav sweep: all checkpoints
mutually reachable), no dead ends, no inaccessible promises, no void gaps (light-leak sweep clean).

## Weapon checklist (all original designs, fictional manufacturers)

| Weapon | FP model | ADS | Fire/recoil pattern | Reload (tac + empty) | Sound | Evidence |
|---|---|---|---|---|---|---|
| Karst P9 (pistol) | ✅ | ✅ | ✅ crisp pop | ✅ +1 chamber | ✅ | `evidence/weapons--karst-p9-*.jpg` |
| Boreal K5 (SMG) | ✅ | ✅ | ✅ fast rise/jitter | ✅ | ✅ | `evidence/weapons--boreal-k5-*.jpg` |
| Halcyon HC-4 (carbine) | ✅ | ✅ | ✅ rise-then-drift | ✅ | ✅ | `evidence/weapons--halcyon-hc4-*.jpg` |
| Vanta S-12 (shotgun) | ✅ | ✅ | ✅ heavy punch + pump | ✅ shell-by-shell, interruptible | ✅ | `evidence/weapons--vanta-s12-*.jpg` |
| Meridian LR-8 (precision) | ✅ | ✅ scope overlay | ✅ heavy + slow recover | ✅ | ✅ | `evidence/weapons--meridian-lr8-*.jpg`, `ui--scope-overlay.jpg` |
| Fieldman CQ (knife) | ✅ | — | ✅ slash + backstab bonus | — | ✅ | `evidence/weapons--cq-blade-*.jpg` |
| FB-3 Dazzler (flash) | ✅ | — | ✅ throw arc/bounce/fuse | — | ✅ | `evidence/weapons--fb-3-*.jpg`, `moments--flash-whiteout.jpg` |
| SG-2 Veil (smoke) | ✅ | — | ✅ 16 s vision-blocking volume | — | ✅ | `evidence/weapons--sg-2-*.jpg`, `moments--smoke-cloud.jpg` |

Per-weapon chains tested (PW-05/06/07/23): ammo accounting, dry fire, draw/holster, switching,
penetration (rifle through drywall; glass pass-through), tracers, casings, muzzle flash variants,
world pickups from fallen hostiles (inherit remaining ammo).

## Character checklist

| Character | Variants | Anim states verified | Evidence |
|---|---|---|---|
| Hostile — scout | cap, light webbing; head variants | patrol/investigate/combat/search, cover, reload, flinch, 2 deaths, flashed cower | `evidence/chars--hostile-scout.jpg` |
| Hostile — trooper | helmet, plate vest | same + door tactics, shout propagation | `evidence/chars--hostile-trooper.jpg` |
| Hostile — heavy | heavy armor, S-12 | same | `evidence/chars--hostile-heavy.jpg` |
| Hostage A (D. Okafor) | analyst, office wear | kneel captive, fear cower, follow, wait, extract kneel | `evidence/chars--hostage-a.jpg`, `moments--hostage-following.jpg` |
| Hostage B (M. Lindqvist) | director, distinct build/colors | same | `evidence/chars--hostage-b.jpg` |
| FP arms | sleeved + gloved, per-weapon grips | draw/holster/fire/reload/pump/throw/melee, sway/bob/landing | all `weapons--*.jpg` |

≥4 hostile head/face combinations confirmed in `src/characters/humanoid.js` (6 combos).

## Final statement on originality

**No Counter-Strike or Valve asset, sound, texture, model, name, or map section was copied or
used in any form.** Every asset in this project is generated procedurally by original code in this
repository; all branding (Northstar Dynamics, Kestrel Syndicate, Karst Arms, Boreal Defense,
Halcyon Ordnance, Vanta Systems, Meridian Precision, Polar Bites) is fictional and original. The
map is an original design whose footprint, adjacency graph, sightlines and spawn logic were
designed from scratch for this project.
