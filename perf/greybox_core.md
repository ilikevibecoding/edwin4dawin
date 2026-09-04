# perf greybox_core — 2026-09-04T07:28:57.961Z

ready 9829 ms · boot {"materials":{"imperialPanel":138,"wornMetal":463,"deckBlack":538,"deckGrey":303,"hullPlate":2429,"rubber":17,"fabric":14,"hazard":13,"hazardRed":14,"grate":231,"diffuser":8,"decals":53,"screens":8,"leds":2},"space":973,"exterior":51,"boot":5438,"totalMs":5438}

| view | calls | tris | lights | objects | geometries | textures | programs | heap MB | frame ms (sw) | rooms visible |
|---|---|---|---|---|---|---|---|---|---|---|
| ext_far | 86 | 230k | 2 | 58 | 40 | 43 | 38 | 226.5 | 433.53 |  |
| ext_mid | 86 | 230k | 2 | 58 | 40 | 43 | 38 | 227.3 | 449.99 |  |
| ext_tower | 84 | 230k | 2 | 58 | 40 | 43 | 38 | 228 | 552.83 |  |
| ext_close | 80 | 229k | 2 | 58 | 40 | 43 | 38 | 228.6 | 711.96 |  |
| ext_belly | 86 | 230k | 2 | 58 | 40 | 43 | 38 | 31.8 | 859.5 |  |
| bridge | 233 | 500k | 26 | 207 | 166 | 60 | 64 | 56.2 | 2221.76 | bridge cmd_corridor |
| bridge_window | 210 | 499k | 26 | 207 | 166 | 60 | 64 | 57.1 | 2980.1 | bridge cmd_corridor |
| cmd_corridor | 313 | 503k | 26 | 208 | 184 | 60 | 64 | 56.5 | 4572.66 | cmd_corridor bridge |
| hangar | 167 | 1118k | 36 | 164 | 285 | 61 | 75 | 120.6 | 9389.02 | hangar fighter_maint cargo_bay repair_bay flight_control |
| hangar_well | 216 | 1386k | 36 | 163 | 286 | 61 | 76 | 121.6 | 10091.3 | hangar fighter_maint cargo_bay repair_bay flight_control |
| shuttle_bay | 112 | 660k | 10 | 85 | 298 | 61 | 83 | 121.4 | 8587.37 | shuttle_bay |
| reactor | 106 | 684k | 6 | 83 | 323 | 62 | 95 | 162.1 | 8127.14 | reactor |
| engineering | 130 | 328k | 6 | 97 | 345 | 62 | 95 | 162.4 | 6180.67 | engineering |
| hyperdrive | 106 | 380k | 8 | 83 | 367 | 62 | 101 | 163.7 | 4722.8 | hyperdrive |
| crew_corridor | 268 | 619k | 27 | 188 | 495 | 63 | 113 | 202.2 | 4796.84 | crew_corridor crew_connector crew_corridor_fwd |
| crew_quarters | 102 | 295k | 6 | 83 | 507 | 63 | 113 | 202.5 | 3601.62 | crew_quarters |
| mess | 102 | 303k | 6 | 83 | 519 | 63 | 113 | 202.1 | 3040.87 | mess |
| medbay | 102 | 295k | 6 | 81 | 531 | 63 | 113 | 202.7 | 2694.03 | medbay |
| detention | 101 | 318k | 6 | 82 | 542 | 63 | 113 | 202.4 | 2609.17 | detention |

long tasks (last 20): [{"t":433306,"dur":1675},{"t":434982,"dur":2164},{"t":437148,"dur":2160},{"t":439309,"dur":2171},{"t":441481,"dur":2188},{"t":443671,"dur":3317},{"t":446989,"dur":2227},{"t":449217,"dur":2528},{"t":451751,"dur":2322},{"t":454074,"dur":2286},{"t":456364,"dur":2560},{"t":458925,"dur":1992},{"t":460918,"dur":2217},{"t":463140,"dur":2376},{"t":465519,"dur":2296},{"t":467818,"dur":2283},{"t":470104,"dur":2406},{"t":472511,"dur":2259},{"t":474773,"dur":3209},{"t":477982,"dur":2697}]
