# perf validator — 2026-09-04T15:19:46.993Z

ready 35623 ms · boot {"materials":{"imperialPanel":508,"wornMetal":1602,"deckBlack":1179,"deckGrey":586,"hullPlate":7013,"rubber":58,"fabric":64,"hazard":48,"hazardRed":41,"grate":816,"diffuser":23,"decals":156,"screens":41,"leds":4},"space":2432,"exterior":365,"boot":15492,"totalMs":15492}

| view | calls | tris | lights | objects | geometries | textures | programs | heap MB | frame ms (sw) | rooms visible |
|---|---|---|---|---|---|---|---|---|---|---|
| ext_far | 87 | 356k | 2 | 59 | 86 | 43 | 43 | 157.9 | 2560.41 |  |
| ext_mid | 195 | 551k | 2 | 167 | 150 | 43 | 43 | 82.2 | 3292.11 |  |
| ext_tower | 538 | 1239k | 16 | 431 | 370 | 76 | 69 | 86.1 | 7372.98 | bridge tactical nav_station observation |
| ext_close | 515 | 1207k | 16 | 431 | 370 | 76 | 69 | 83.9 | 9179.44 | bridge tactical nav_station observation |
| ext_belly | 247 | 628k | 2 | 245 | 391 | 76 | 69 | 84.3 | 9496.47 |  |
| bridge | 411 | 1144k | 16 | 318 | 468 | 77 | 130 | 90.2 | 14266.15 | bridge cmd_corridor |
| bridge_window | 383 | 1143k | 16 | 318 | 468 | 77 | 130 | 87.6 | 13309.61 | bridge cmd_corridor |
| cmd_corridor | 427 | 826k | 16 | 318 | 481 | 77 | 151 | 91.2 | 13667.97 | cmd_corridor bridge |
| hangar | 354 | 1876k | 16 | 317 | 657 | 80 | 187 | 140.4 | 15193.97 | hangar fighter_maint cargo_bay repair_bay flight_control |
| hangar_well | 447 | 2255k | 16 | 317 | 669 | 80 | 226 | 141.7 | 14599.19 | hangar fighter_maint cargo_bay repair_bay flight_control |
| shuttle_bay | 183 | 1021k | 10 | 162 | 697 | 82 | 226 | 142.5 | 14312.08 | shuttle_bay |
| reactor | 176 | 903k | 14 | 185 | 758 | 83 | 273 | 190.1 | 16396 | reactor engineering |
| engineering | 197 | 908k | 14 | 185 | 759 | 83 | 273 | 190.4 | 15310.1 | engineering reactor |
| hyperdrive | 188 | 720k | 9 | 199 | 807 | 83 | 284 | 191.4 | 13243.14 | hyperdrive |
| crew_corridor | 380 | 928k | 12 | 293 | 980 | 84 | 318 | 243.5 | 13146.55 | crew_corridor crew_connector crew_corridor_fwd |
| crew_quarters | 181 | 682k | 10 | 162 | 1011 | 84 | 337 | 246 | 12238.91 | crew_quarters |
| mess | 171 | 515k | 10 | 157 | 1037 | 84 | 337 | 247.1 | 8928.77 | mess |
| medbay | 247 | 740k | 10 | 197 | 1086 | 86 | 343 | 244.8 | 6685.8 | medbay |
| detention | 169 | 724k | 10 | 150 | 1105 | 88 | 343 | 244.9 | 5208.9 | detention |

long tasks (last 20): [{"t":1250779,"dur":11235},{"t":1262025,"dur":6691},{"t":1268725,"dur":3770},{"t":1272498,"dur":4080},{"t":1276582,"dur":3639},{"t":1280222,"dur":3875},{"t":1284098,"dur":3140},{"t":1287242,"dur":4205},{"t":1291449,"dur":5750},{"t":1297209,"dur":3689},{"t":1300898,"dur":3569},{"t":1304469,"dur":4389},{"t":1308858,"dur":2995},{"t":1311855,"dur":2908},{"t":1314764,"dur":4222},{"t":1318987,"dur":3224},{"t":1322213,"dur":3505},{"t":1325718,"dur":4033},{"t":1329752,"dur":3710},{"t":1333463,"dur":4239}]
