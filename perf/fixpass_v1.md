# perf fixpass_v1 — 2026-09-04T18:15:02.464Z

ready 13454 ms · boot {"materials":{"imperialPanel":170,"wornMetal":514,"deckBlack":381,"deckGrey":341,"hullPlate":2034,"rubber":17,"fabric":14,"hazard":14,"hazardRed":15,"grate":233,"diffuser":8,"decals":51,"screens":8,"leds":2},"space":983,"exterior":147,"boot":5147,"totalMs":5147}

| view | calls | tris | lights | objects | geometries | textures | programs | heap MB | frame ms (sw) | rooms visible |
|---|---|---|---|---|---|---|---|---|---|---|
| ext_far | 94 | 388k | 2 | 61 | 88 | 43 | 47 | 124.9 | 1316.55 |  |
| ext_mid | 202 | 583k | 2 | 169 | 152 | 43 | 47 | 126.2 | 1851.06 |  |
| ext_tower | 550 | 1299k | 15 | 433 | 374 | 76 | 70 | 84.3 | 2938.03 | bridge tactical nav_station observation |
| ext_close | 526 | 1267k | 15 | 433 | 374 | 76 | 70 | 84.2 | 4404.96 | bridge tactical nav_station observation |
| ext_belly | 252 | 659k | 2 | 247 | 396 | 76 | 70 | 84.7 | 5807.17 |  |
| bridge | 419 | 1202k | 15 | 320 | 469 | 77 | 89 | 87.5 | 8171.83 | bridge cmd_corridor |
| bridge_window | 391 | 1202k | 15 | 320 | 469 | 77 | 89 | 86 | 7898.9 | bridge cmd_corridor |
| cmd_corridor | 432 | 856k | 15 | 320 | 482 | 77 | 106 | 89.6 | 8753.01 | cmd_corridor bridge |
| hangar | 489 | 2345k | 18 | 319 | 674 | 77 | 113 | 139.3 | 10326.5 | hangar fighter_maint cargo_bay repair_bay flight_control |
| hangar_well | 466 | 2341k | 18 | 319 | 678 | 77 | 113 | 138.6 | 8284.98 | hangar fighter_maint cargo_bay repair_bay flight_control |
| shuttle_bay | 191 | 1081k | 10 | 164 | 706 | 77 | 113 | 139.3 | 6781.3 | shuttle_bay |
| reactor | 180 | 939k | 14 | 187 | 767 | 77 | 120 | 187 | 6769.07 | reactor engineering |
| engineering | 276 | 1189k | 14 | 254 | 826 | 77 | 120 | 187 | 6837.92 | engineering eng_corridor reactor |
| hyperdrive | 267 | 994k | 14 | 268 | 864 | 77 | 120 | 186.9 | 6579.16 | hyperdrive eng_corridor |
| crew_corridor | 385 | 960k | 14 | 295 | 1037 | 77 | 123 | 239.6 | 6627.09 | crew_corridor crew_connector crew_corridor_fwd |
| crew_quarters | 189 | 716k | 13 | 164 | 1068 | 77 | 124 | 241.2 | 6340.56 | crew_quarters |
| mess | 179 | 549k | 13 | 159 | 1094 | 77 | 124 | 239.7 | 5692.95 | mess |
| medbay | 255 | 799k | 13 | 199 | 1143 | 77 | 131 | 240.2 | 5119.96 | medbay |
| detention | 274 | 1140k | 15 | 230 | 1162 | 77 | 131 | 240.9 | 5115.45 | detention crew_corridor_fwd crew_connector |

long tasks (last 20): [{"t":648766,"dur":6322},{"t":655088,"dur":6519},{"t":661627,"dur":6146},{"t":667775,"dur":4587},{"t":672364,"dur":4507},{"t":676873,"dur":4617},{"t":681491,"dur":4180},{"t":685676,"dur":4445},{"t":690125,"dur":4217},{"t":694346,"dur":6265},{"t":700612,"dur":4102},{"t":704723,"dur":3731},{"t":708456,"dur":4289},{"t":712747,"dur":4701},{"t":717452,"dur":4499},{"t":721958,"dur":5380},{"t":727343,"dur":5403},{"t":732751,"dur":5239},{"t":737990,"dur":5183},{"t":743179,"dur":5373}]
