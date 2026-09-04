# perf integrated_v1 — 2026-09-04T13:49:31.988Z

ready 10284 ms · boot {"materials":{"imperialPanel":136,"wornMetal":466,"deckBlack":556,"deckGrey":306,"hullPlate":2441,"rubber":17,"fabric":14,"hazard":14,"hazardRed":14,"grate":232,"diffuser":8,"decals":52,"screens":8,"leds":2},"space":980,"exterior":137,"boot":5586,"totalMs":5586}

| view | calls | tris | lights | objects | geometries | textures | programs | heap MB | frame ms (sw) | rooms visible |
|---|---|---|---|---|---|---|---|---|---|---|
| ext_far | 87 | 356k | 2 | 59 | 86 | 43 | 43 | 102.9 | 501.46 |  |
| ext_mid | 195 | 551k | 2 | 167 | 150 | 43 | 43 | 104 | 540.91 |  |
| ext_tower | 538 | 1239k | 16 | 431 | 370 | 76 | 69 | 83.8 | 1352.65 | bridge tactical nav_station observation |
| ext_close | 515 | 1207k | 16 | 431 | 370 | 76 | 69 | 84.3 | 1843.61 | bridge tactical nav_station observation |
| ext_belly | 247 | 628k | 2 | 245 | 391 | 76 | 69 | 83.7 | 1883.91 |  |
| bridge | 411 | 1144k | 16 | 318 | 468 | 77 | 130 | 86.9 | 3577.82 | bridge cmd_corridor |
| bridge_window | 383 | 1143k | 16 | 318 | 468 | 77 | 130 | 87.3 | 3360 | bridge cmd_corridor |
| bridge_pit | 397 | 1142k | 16 | 318 | 468 | 77 | 130 | 87.7 | 3278.26 | bridge cmd_corridor |
| cmd_corridor | 468 | 1132k | 16 | 318 | 481 | 77 | 130 | 87.5 | 3429.36 | cmd_corridor bridge |
| lift_lobby | 315 | 675k | 13 | 310 | 539 | 77 | 163 | 89.2 | 3493.14 | lift_lobby_tower cmd_corridor |
| room_tactical | 214 | 509k | 7 | 174 | 539 | 77 | 182 | 93.8 | 3084.68 | tactical |
| room_comms | 187 | 553k | 10 | 157 | 556 | 77 | 196 | 91.1 | 3005.11 | comms |
| hangar | 387 | 2311k | 16 | 317 | 732 | 82 | 232 | 141.1 | 3624.17 | hangar fighter_maint cargo_bay repair_bay flight_control |
| hangar_well | 483 | 2744k | 16 | 317 | 744 | 84 | 237 | 141.8 | 3328.43 | hangar fighter_maint cargo_bay repair_bay flight_control |
| room_flight_control | 442 | 2569k | 16 | 317 | 749 | 84 | 237 | 141.5 | 3861.99 | flight_control hangar fighter_maint cargo_bay repair_bay |
| room_fighter_maint | 324 | 1867k | 16 | 317 | 749 | 84 | 275 | 146.9 | 3876.2 | fighter_maint hangar cargo_bay repair_bay flight_control |
| shuttle_bay | 183 | 1021k | 10 | 162 | 777 | 86 | 292 | 145.9 | 3539.2 | shuttle_bay |
| reactor | 176 | 903k | 14 | 185 | 838 | 87 | 339 | 191.7 | 4063.15 | reactor engineering |
| engineering | 197 | 908k | 14 | 185 | 839 | 87 | 339 | 191.9 | 3808.19 | engineering reactor |
| hyperdrive | 188 | 720k | 9 | 199 | 887 | 87 | 350 | 193.4 | 3498.19 | hyperdrive |
| room_life_support | 138 | 688k | 9 | 152 | 915 | 87 | 350 | 192.2 | 3005.86 | life_support |
| crew_corridor | 380 | 928k | 12 | 293 | 1088 | 88 | 384 | 245.1 | 3345.78 | crew_corridor crew_connector crew_corridor_fwd |
| crew_quarters | 181 | 682k | 10 | 162 | 1119 | 88 | 391 | 247.3 | 3223.81 | crew_quarters |
| mess | 171 | 515k | 10 | 157 | 1145 | 88 | 391 | 246.4 | 2755.7 | mess |
| room_lounge | 202 | 701k | 10 | 178 | 1192 | 90 | 395 | 247.7 | 2429.5 | lounge |
| medbay | 247 | 740k | 10 | 197 | 1241 | 92 | 398 | 247.3 | 2249.68 | medbay |
| room_armory | 204 | 758k | 10 | 169 | 1277 | 94 | 398 | 246.9 | 2072.37 | armory |
| detention | 169 | 724k | 10 | 150 | 1296 | 96 | 398 | 247.1 | 2161.82 | detention |
| room_escape_pods | 200 | 755k | 10 | 165 | 1328 | 98 | 398 | 247.4 | 2091.85 | escape_pods |

long tasks (last 20): [{"t":482734,"dur":1929},{"t":484665,"dur":1926},{"t":486592,"dur":1925},{"t":488519,"dur":1878},{"t":490398,"dur":1851},{"t":492249,"dur":1829},{"t":494079,"dur":1847},{"t":495928,"dur":1871},{"t":497801,"dur":1902},{"t":499704,"dur":2432},{"t":502136,"dur":2399},{"t":504536,"dur":2378},{"t":506915,"dur":2392},{"t":509307,"dur":2366},{"t":511676,"dur":2379},{"t":514056,"dur":1885},{"t":515942,"dur":1890},{"t":517833,"dur":1867},{"t":519700,"dur":1882},{"t":521583,"dur":1866}]
