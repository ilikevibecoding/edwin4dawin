# Final Checklists

Compiled at the end of Phase 7 from the Audit 3 and Audit 4 full-map tours
(both zero-console-error passes; Audit 4 uncovered no material issue).
Per-room gates are those in `docs/visual-quality-checklist.md`: purpose,
scale, materials/wear, ceiling/floor complete, lighting readable, natural
cover, landmark, signage, no z-fighting/floaters/voids, enemies readable.

## Room-by-room

| # | room | landmark | evidence | result |
|---|---|---|---|---|
| 1 | Employee entrance (snow plaza) | canopy + blue facade band, falling snow | final_spawn.jpg | pass |
| 2 | Security vestibule | double glass airlock, walk-off mat | final_vestibule.jpg | pass |
| 3 | Reception lobby | backlit NORTHSTAR DYNAMICS wall + terrazzo | final_lobby.jpg | pass |
| 4 | Visitor waiting area | armchairs + wall clock + art prints | final_waiting.jpg | pass |
| 5 | Cubicle floor | navy fabric pods, monitor glow, columns | final_cubicles.jpg / _135 | pass |
| 6 | Conference room (hostage A) | ribbon window to courtyard, whiteboard | final_conference.jpg | pass |
| 7 | Executive corridor | warm pendants, conference glass, room signs | final_exec_corridor.jpg | pass |
| 8 | Executive office | courtyard vista w/ star obelisk, credenza | final_exec_office.jpg | pass |
| 9 | Records archive (hostage B) | rolling racks of record boxes, ladder | final_archive.jpg | pass |
| 10 | Copy & mail room | pigeonhole wall, work counter | final_copy_mail.jpg | pass |
| 11 | Break room & kitchen | ribbon window, cabinet run, coffee corner | final_break_room.jpg | pass |
| 12 | IT workspace | dual-monitor desks, parts shelving | final_it_room.jpg | pass |
| 13 | Server room | LED racks, raised floor, cable tray | final_server_room.jpg | pass |
| 14 | Restrooms | tiled sink wall, mirrors, stalls | final_restrooms.jpg | pass |
| 15 | Janitor closet | cart, mop sink, chemical shelf | final_janitor.jpg | pass |
| 16 | Mechanical room | breaker panels, pipe runs w/ valves | final_mech_room.jpg | pass |
| 17 | Central stairwell | caged strips, yellow nosing line | final_stairwell_top.jpg | pass |
| 18 | Service corridor | green nav lights, red standpipes, lockers | final_service_corridor.jpg | pass |
| 19 | Loading dock | DOCK 1 shutter, pallets, dock bumper | final_loading.jpg | pass |
| 20 | Extraction garage | van + signal light, yellow-band columns | final_garage.jpg / final_extraction.jpg | pass |
| 21 | Hostage locations ×2 | conference (Voss) + archive (Reid) | final_conference.jpg / final_archive.jpg | pass |
| 22 | Exterior snow / courtyard | plaza + courtyard views from windows | final_spawn.jpg / final_exec_office.jpg | pass |
| — | East hall (connector) | fire cabinet, notice board, planter | final_east_hall.jpg | pass |
| — | Training room | lectern + window band | final_training.jpg | pass |
| — | Facilities office | desk + window band | final_facilities.jpg | pass |
| — | Storage | metal racking, box stacks | final_storage.jpg | pass |
| — | North corridor | fire-door sightline, evac end-cap | final_north_corridor*.jpg | pass |
| — | West stairwell | caged strips, painted band | final_stair_west_top.jpg | pass |
| — | Utility room | pump pad + pressure tanks | final_utility.jpg | pass |

## Weapons

Gates: world + FP model, magazine, muzzle, sights, casing ejection, pickup,
HUD icon, flash/smoke/tracer, recoil, full sound set, draw/fire/reload
(tactical + empty)/dry-fire/sway animations. Suite scenarios S20–S27 verify
fire/reload/ammo state; captures listed in `docs/screenshot-index.md`.

| weapon | class | evidence | result |
|---|---|---|---|
| P-11 Vireo | service pistol | weapon_vireo_ads.jpg, S20 | pass |
| VX-7 Kestrel | compact SMG | weapon_kestrel_ads.jpg, S20 | pass |
| HC-4 Ridgeline | tactical carbine | weapon_ridgeline_idle/_ads.jpg, weapon_reload.jpg | pass |
| B-12 Boreas | pump shotgun | weapon_boreas_pump.jpg, S22 | pass |
| LR-8 Longwatch | precision rifle | weapon_longwatch_ads.jpg, S23 | pass |
| Talon Field Knife | melee | weapon_knife.jpg, S24 | pass |
| FL-2 Dazzle | flash device | vfx_flash_device.jpg, S26 | pass |
| SG-3 Veil | smoke device | vfx_smoke_volume.jpg, S27 | pass |

## Characters

Gates: human scale, silhouette, clothing layers, insignia, material split
(fabric/armor/skin/metal), rig + animation set, weapon attachment, hit
regions, shadow casting, no mesh separation.

| character | variants | evidence | result |
|---|---|---|---|
| Player arms | gloved tactical sleeves, per-weapon poses | weapon_* captures | pass |
| Hostile: Scout | green shell, cap, light rig | chars_enemy_lineup.jpg | pass |
| Hostile: Trooper | gray uniform, plate carrier, orange armband | chars_enemy_lineup.jpg | pass |
| Hostile: Heavy | helmet + shoulder plate, dark armor | chars_enemy_lineup.jpg | pass |
| Head variants ×4 | skin tones / caps / goggles / beanie mixes | chars_enemy_lineup_close.jpg | pass |
| Hostage: Dr. Elin Voss | blazer, bound → freed → following | chars_hostage_bound.jpg, final_conference.jpg | pass |
| Hostage: Marcus Reid | navy polo, bound → freed → following | chars_hostage_follow.jpg, final_archive.jpg | pass |

## Animation states verified

Idle/breathing sway, walk, crouch, aim, fire + recoil, tactical & empty
reloads, pump/bolt cycles, flinch, death fall, hostage bound idle, fear
cower, stand, follow, stop, extraction hand-off — exercised by suite
scenarios S20–S27 (weapons), S30–S36 (AI), S40–S43 (mission flow) and
reviewed in the capture set.
