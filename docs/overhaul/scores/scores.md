# Building rubric scores

Spec 17 weights, ten categories rated 0-5 from automated evidence (`scripts/score-buildings.mjs`), seed 1337.

- Buildings scored: **433** (430 ordinary, 3 special: Senate, passenger port, Jedi precinct)
- Mean score: **97.2** (ordinary 97.2)
- Ordinary buildings at the 85 threshold (no category below 3, floor plan / interactions / NPC >= 4): **430/430 (100%)**
- Special buildings at the 90 threshold (no category below 4): **3/3**
- Hard failures: **0**; non-deterministic rebuilds: 0; warm builds over budget: 0 (mean 1.2 ms, max 35.6 ms)
- Lighting and sound is capped at 4/5 for every building: district ambience is not implemented (`src/audio.js` carries only the frontier-town ambience). Required audio is listed here as incomplete, not averaged away.

## Distribution

| Score | Buildings |
|---|---:|
| 95-100 | 389 |
| 90-94 | 44 |
| 85-89 | 0 |
| 80-84 | 0 |
| 70-79 | 0 |
| 50-69 | 0 |
| 0-49 | 0 |

## Category means (0-5)

| Category | Weight | Mean |
|---|---:|---:|
| Identity and exterior architecture | 12 | 4.96 |
| Floor plan and room purpose | 18 | 4.92 |
| Interior specificity and materials | 12 | 4.97 |
| Working interactions | 10 | 5 |
| NPC purpose and behaviour | 12 | 4.96 |
| Economic and city integration | 10 | 4.69 |
| Story and discoverability | 8 | 5 |
| Lighting and sound | 8 | 4 |
| Access and navigation | 6 | 5 |
| Technical integrity | 4 | 5 |

## Per district

| district | Buildings | Mean | At threshold | Share |
|---|---:|---:|---:|---:|
| residential | 149 | 97.4 | 149 | 100% |
| financial | 147 | 96.7 | 147 | 100% |
| industrial | 59 | 97.5 | 59 | 100% |
| entertainment | 47 | 98.2 | 47 | 100% |
| senate | 18 | 96.3 | 18 | 100% |
| market | 13 | 98.1 | 13 | 100% |

## Per program

| program | Buildings | Mean | At threshold | Share |
|---|---:|---:|---:|---:|
| retail_shop | 85 | 97.8 | 85 | 100% |
| corporate_office | 78 | 96 | 78 | 100% |
| worker_apartments | 35 | 97.4 | 35 | 100% |
| diner | 33 | 97.8 | 33 | 100% |
| security_station | 19 | 95.9 | 19 | 100% |
| affluent_apartments | 14 | 98.4 | 14 | 100% |
| transit_interchange | 14 | 98.1 | 14 | 100% |
| hotel | 12 | 97.3 | 12 | 100% |
| bank | 11 | 96.1 | 11 | 100% |
| clinic | 11 | 96.9 | 11 | 100% |
| school | 11 | 97 | 11 | 100% |
| gallery | 9 | 97.2 | 9 | 100% |
| gaming_house | 9 | 98.4 | 9 | 100% |
| opera_house | 9 | 98.4 | 9 | 100% |
| cantina_club | 8 | 98.3 | 8 | 100% |
| cargo_terminal | 8 | 97.6 | 8 | 100% |
| droid_workshop | 8 | 97.5 | 8 | 100% |
| bath_gym | 7 | 96.5 | 7 | 100% |
| repair_hangar | 7 | 97.9 | 7 | 100% |
| utility_plant | 7 | 98.1 | 7 | 100% |
| broadcast_studio | 6 | 96.4 | 6 | 100% |
| community_hall | 6 | 96.2 | 6 | 100% |
| delegation_office | 5 | 96.4 | 5 | 100% |
| speeder_garage | 5 | 98.4 | 5 | 100% |
| fire_station | 3 | 96.4 | 3 | 100% |
| market_arcade | 3 | 98.4 | 3 | 100% |
| salvage_yard | 3 | 98.4 | 3 | 100% |
| courthouse | 2 | 96.4 | 2 | 100% |
| criminal_front | 2 | 98.4 | 2 | 100% |
| jedi_temple | 1 | 96.4 | 1 | 100% |
| passenger_terminal | 1 | 98.4 | 1 | 100% |
| senate | 1 | 92.8 | 1 | 100% |

## Most frequent failed checks

| Check | Buildings |
|---|---:|
| light: district ambience not implemented (src/audio#js) | 433 |
| economy: no customer for its outputs | 134 |
| plan: circulation # of the floor area | 34 |
| identity: nearest sibling lot # differs on #/# axes | 16 |
| interior: # furniture kinds per room | 10 |
| npc: #/# staff roles have a room that hosts them (missing assembl | 3 |
| npc: #/# staff roles have a room that hosts them (missing novice) | 3 |
| economy: no supplier in the city | 2 |
| npc: #/# staff roles have a room that hosts them (missing armoure | 2 |
| npc: #/# staff roles have a room that hosts them (missing nurse d | 2 |
| npc: #/# staff roles have a room that hosts them (missing baker) | 2 |
| plan: program rooms missing: security_screening, petition_office | 1 |
| npc: #/# staff roles have a room that hosts them (missing curator | 1 |
| access: # lift(s) spanning # of the height, # floors | 1 |
| technical: # floating blocks | 1 |
| interior: # of occupied rooms have storage | 1 |
| interactions: # of occupied rooms offer something to do | 1 |
| npc: #/# staff roles have a room that hosts them (missing cook) | 1 |
| npc: #/# staff roles have a room that hosts them (missing chef) | 1 |
| npc: #/# staff roles have a room that hosts them (missing gardene | 1 |
| npc: #/# staff roles have a room that hosts them (missing pilgrim | 1 |
| npc: #/# staff roles have a room that hosts them (missing surgeon | 1 |

## Below threshold (0)

none
## Every building

| Lot | Name | Purpose | District | Program | ident | plan | inter | inter | npc | econo | story | light | acces | techn | Total | Pass |
|---:|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 0 | Galactic Senate | ministry | senate | senate | 5 | 4 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 92.8 | yes |
| 1 | Jedi Temple | temple_annex | financial | jedi_temple | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 2 | Monument Plaza | museum | financial | gallery | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 4 | 4 | 5 | 91.2 | yes |
| 3 | Uscru undercity strip | cantina | entertainment | cantina_club | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 4 | The Works foundry | foundry | industrial | utility_plant | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 5 | CoCo Town market halls | market_stall | market | market_arcade | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 6 | Galaxies Opera House | holo_theatre | entertainment | opera_house | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 7 | 500 Republica | luxury_residences | residential | affluent_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 8 | Senate Office Building | ministry | market | delegation_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 9 | Grand Republic Medical Facility | clinic | residential | clinic | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 10 | Republic Judiciary Central Detention Center | security_station | industrial | security_station | 5 | 5 | 4 | 4 | 5 | 4 | 5 | 4 | 5 | 5 | 92 | yes |
| 11 | HoloNet broadcast tower | holonet_office | financial | broadcast_studio | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 20 | Kuat Service Bay 490 | repair_shop | industrial | repair_hangar | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 21 | Bespin Power Authority | power_plant | industrial | utility_plant | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 22 | Drev Airspeeder Hire | taxi_stand | industrial | transit_interchange | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 23 | The Works — Line 730 | foundry | industrial | utility_plant | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 24 | The Works Building Supply | hardware_store | industrial | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 25 | Droid Works 883 | droid_shop | industrial | droid_workshop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 26 | The Works Grill | diner | industrial | diner | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 27 | Nalto Executive Aviation | hangar | industrial | repair_hangar | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 28 | Bellith Haulage | depot | industrial | cargo_terminal | 5 | 5 | 4 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 29 | Motivator Line 633 | droid_factory | industrial | droid_workshop | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 30 | Hyperlane Terminus | transit_station | industrial | transit_interchange | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 94.8 | yes |
| 31 | Garrick's Droid Depot | droid_shop | industrial | droid_workshop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 32 | Kip's Broth House | noodle_bar | industrial | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 33 | Korrid Bulk Goods | warehouse | industrial | cargo_terminal | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 34 | Glow & Signal 563 | electronics | industrial | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 35 | CSF Station The Works | security_station | industrial | security_station | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 36 | Ostrander Components Outlet | electronics | industrial | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 37 | Tyvane Speeders | speeder_dealer | entertainment | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 38 | Corrin Security Contractors | private_security | entertainment | security_station | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 39 | Corrin's Cantina | cantina | entertainment | cantina_club | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 40 | The Golden Wheel | casino | entertainment | gaming_house | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 41 | Steam & Salt 545 | noodle_bar | entertainment | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 42 | Soundstage 385 | holo_studio | entertainment | broadcast_studio | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 43 | The Uscru Grand | hotel | entertainment | hotel | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 44 | Sabacc Simulators 589 | holo_arcade | entertainment | gaming_house | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 45 | Vertical City Nights | night_club | entertainment | cantina_club | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 46 | Second Chance Goods | pawn | entertainment | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 47 | Yorrel Sabacc Palace | casino | entertainment | gaming_house | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 48 | Cold Cuts 546 | butcher | entertainment | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 49 | Bralen's Ship Repair | repair_shop | industrial | repair_hangar | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 50 | Judicial Forces Depot 240 | guard_barracks | industrial | security_station | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 51 | Salvage Yard 911 | recycling_plant | industrial | salvage_yard | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 52 | Judicial Forces Depot 341 | guard_barracks | industrial | security_station | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 53 | Osmer Haulage | depot | industrial | cargo_terminal | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 54 | Junk Level Recycling | recycling_plant | industrial | salvage_yard | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 55 | The Works Coaxium Works | refinery | industrial | utility_plant | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 56 | Undercity Exchange 672 | pawn | entertainment | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 57 | Sabacc Simulators 789 | holo_arcade | entertainment | gaming_house | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 58 | Bounty Board — Uscru Guild Hall | private_security | entertainment | security_station | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 59 | Skylane Taxis 950 | taxi_stand | entertainment | transit_interchange | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 60 | Sabacc Simulators 952 | holo_arcade | entertainment | gaming_house | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 61 | The Glow Pit | night_club | entertainment | cantina_club | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 62 | Late Shift Diner | diner | entertainment | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 63 | Chandrilan Droid Assembly 441 | droid_factory | industrial | droid_workshop | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 64 | Starlane Interstellar | office | industrial | criminal_front | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 65 | The Works Air Taxi | taxi_stand | industrial | transit_interchange | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 66 | The Works Bunkhouse | hostel | industrial | hotel | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 67 | Uscru Market Stalls 985 | market_stall | entertainment | market_arcade | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 68 | Hotel Skyhook 577 | hotel | entertainment | hotel | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 69 | House of Chance 300 | casino | entertainment | gaming_house | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 70 | Steam Gardens 336 | bathhouse | entertainment | bath_gym | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 71 | Dejarik Den | holo_arcade | entertainment | gaming_house | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 72 | Yorrel's Droid Depot | droid_shop | industrial | droid_workshop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 73 | Hangar 795 Maintenance | repair_shop | industrial | repair_hangar | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 94.8 | yes |
| 74 | Maldrin Outfitters | armorer | industrial | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 75 | Vantrell Bulk Goods | warehouse | industrial | cargo_terminal | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 76 | Corvane's Armoury | armorer | industrial | retail_shop | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 93.6 | yes |
| 77 | Judicial Forces Depot 314 | guard_barracks | industrial | security_station | 5 | 5 | 5 | 5 | 4 | 4 | 5 | 4 | 5 | 5 | 94 | yes |
| 78 | Dresh Haulage | depot | industrial | cargo_terminal | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 79 | The Works Station | transit_station | industrial | transit_interchange | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 80 | Bass Level 710 | night_club | entertainment | cantina_club | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 81 | Ulvann's Cantina | cantina | entertainment | cantina_club | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 82 | Undercity Exchange 988 | pawn | entertainment | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 83 | Uscru Meat Market 291 | butcher | entertainment | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 84 | Quorr Outfitters | tailor | entertainment | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 85 | Dockside Cargo 481 | depot | industrial | cargo_terminal | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 86 | Lower Level Noodles | noodle_bar | industrial | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 87 | Kuat Service Bay 777 | repair_shop | industrial | repair_hangar | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 88 | Circuit Row 115 | electronics | industrial | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 89 | Chancellery Guard Quarters | guard_barracks | industrial | security_station | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 90 | Mid Rim Foundry | foundry | industrial | utility_plant | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 91 | Westport Customs House | customs | market | passenger_terminal | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 92 | Ghavic-Orlann Starship Showroom 472 | ship_dealer | market | retail_shop | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 93 | Zabrin Towers | apartments | market | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 94 | The Kyber Case | jeweler | market | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 95 | Mandalorian Ironworks Outlet | armorer | market | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 96 | Datacron & Dust 294 | bookshop | market | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 97 | Uscru Holo-Theatre | holo_theatre | entertainment | opera_house | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 98 | Sorvann Outfitters | tailor | entertainment | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 99 | Uscru Air Taxi | taxi_stand | entertainment | transit_interchange | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 100 | Club Corvane | night_club | entertainment | cantina_club | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 101 | Gallery Vyre | art_gallery | entertainment | gallery | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 102 | Kyber Foundry | foundry | industrial | utility_plant | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 103 | Coruscant Security — Precinct 787 | security_station | industrial | security_station | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 104 | Droid Works 889 | droid_shop | industrial | droid_workshop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 105 | Level 2335 Interchange | transit_station | industrial | transit_interchange | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 106 | Kuat Service Bay 560 | repair_shop | industrial | repair_hangar | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 107 | Bellith Furnishings | furniture_store | market | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 108 | Holo-Arcade 784 | holo_arcade | entertainment | gaming_house | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 109 | Soundstage 135 | holo_studio | entertainment | broadcast_studio | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 110 | Gallery Palluk | art_gallery | entertainment | gallery | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 111 | The Slider Bar | diner | entertainment | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 112 | Quorr Security Contractors | private_security | entertainment | security_station | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 113 | Ionic Freight Depot | depot | industrial | cargo_terminal | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 114 | Juvo's Armoury | armorer | industrial | retail_shop | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 115 | Yellow Fin Cabs 900 | taxi_stand | industrial | transit_interchange | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 116 | Motivator Line 461 | droid_factory | industrial | droid_workshop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 117 | Tibanna Processing 102 | refinery | industrial | utility_plant | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 118 | Nerf Steaks 502 | diner | industrial | diner | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 119 | Salvage Yard 703 | recycling_plant | industrial | salvage_yard | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 120 | Verpine Droid Assembly 556 | droid_factory | industrial | droid_workshop | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 121 | Yavelle Freight Depot | depot | industrial | cargo_terminal | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 94.8 | yes |
| 122 | Mattock Flight Services | hangar | industrial | repair_hangar | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 123 | Open Market 288 | market_stall | market | market_arcade | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 124 | The Sleep Pod Store | furniture_store | market | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 125 | Agri-Corp Outlet 172 | grocery | market | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 126 | Mattock Outfitters | tailor | market | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 127 | The Dathen Playhouse | holo_theatre | entertainment | opera_house | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 128 | Steam Gardens 477 | bathhouse | entertainment | bath_gym | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 129 | Uscru Fine Arts | art_gallery | entertainment | gallery | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 130 | Blue Dagger Lounge | cantina | entertainment | cantina_club | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 131 | Holo-Arcade 334 | holo_arcade | entertainment | gaming_house | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 132 | Starlight Cinema 157 | holo_theatre | entertainment | opera_house | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 133 | The Dresh Spire | luxury_residences | financial | affluent_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 134 | College of Xenolinguistics | university | financial | school | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 135 | Tarrek & Pravik Consultants | office | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 136 | Soundstage 183 | holo_studio | financial | broadcast_studio | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 137 | The Garrick Spire | luxury_residences | financial | affluent_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 138 | Skarris Group | office | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 139 | The Kaelor Spire | luxury_residences | financial | affluent_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 140 | Federal District Mutual Assurance | insurance | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 141 | Outer Rim Imports 217 | trade_house | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 142 | Estrik Legal | law_office | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 143 | Outer Rim Imports 729 | trade_house | financial | criminal_front | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 144 | Brannick Components Outlet | electronics | financial | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 145 | Senate District District Court | courthouse | senate | courthouse | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 146 | CSF Garrison Senate District | guard_barracks | senate | security_station | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 147 | Level 5603 Primary | school | residential | school | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 148 | Renn Towers | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 149 | Skyline Station | transit_station | residential | transit_interchange | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 150 | Skyline Grill | diner | residential | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 151 | Skyline Heights | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 152 | Skyline Greenhouse Supply | garden_shop | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 153 | Dock Row Hostel 885 | hostel | residential | hotel | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 154 | Pell's Garden Shop | garden_shop | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 155 | Skyline Habitat 5755 | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 156 | Level 8673 Primary | school | residential | school | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 157 | Gravwell Components Outlet | electronics | financial | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 158 | Kresh Hull & Cargo Insurance | insurance | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 159 | Core Banking Guild — Federal District Branch | bank | financial | bank | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 160 | Outer Rim Imports 159 | trade_house | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 161 | Tesrin Datawork | tech_firm | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 162 | Renn, Wroth & Associates | law_office | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 163 | Zhorrin & Dosk Consultants | office | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 164 | Bank of Federal District | bank | financial | bank | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 165 | Renn & Othus Consultants | office | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 166 | The Wessik Spire | luxury_residences | financial | affluent_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 167 | Talvek Datawork | tech_firm | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 168 | Zabrin Hull & Cargo Insurance | insurance | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 169 | Aurodium Systems Annex | office | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 170 | Iron Nerf Gym | gym | financial | bath_gym | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 171 | Rescue Company 850 | fire_station | residential | fire_station | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 172 | Teo's Bakery | bakery | residential | retail_shop | 5 | 5 | 4 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 173 | Mox's Diner | diner | residential | diner | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 94.8 | yes |
| 174 | Blue Milk Bakehouse 921 | bakery | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 175 | Skyline Clinic | clinic | residential | clinic | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 176 | The Honest Cleaver | butcher | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 177 | Juvo Outfitters | tailor | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 178 | Jorak Airspeeder Hire | taxi_stand | residential | transit_interchange | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 179 | Block 2762 Habitats | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 180 | Tuvann & Dresh Consultants | office | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 181 | The Cotta Spire | luxury_residences | financial | affluent_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 182 | Ulmer Dynamics | tech_firm | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 183 | Zabrin Trust | bank | financial | bank | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 184 | The Federal District Bean | caf | financial | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 185 | Thessik Executive Residences | luxury_residences | financial | affluent_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 186 | Chandrilan Credit Union | bank | financial | bank | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 187 | Noodle Bar 989 | noodle_bar | financial | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 188 | Perrit's Holobooks | bookshop | financial | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 189 | Ollum Hull & Cargo Insurance | insurance | financial | corporate_office | 4 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 94 | yes |
| 190 | Outer Rim Imports 260 | trade_house | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 191 | Thessik Group | office | financial | corporate_office | 4 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 94 | yes |
| 192 | Holo-Core Labs 666 | tech_firm | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 193 | Quillan Components Outlet | electronics | financial | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 194 | Galactic Indemnity 575 | insurance | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 195 | Speeder Registry 601 | licensing_office | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 196 | Block 4272 Habitats | apartments | financial | worker_apartments | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 197 | Rimward Datawork | tech_firm | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 198 | Orsk-Dathen Holdings | office | senate | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 199 | Hall of Records 197 | archive | senate | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 200 | Office of Senator Quenn | ministry | senate | delegation_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 201 | Maldrin Towers | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 202 | Skyline Pharma | pharmacy | residential | retail_shop | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 94.8 | yes |
| 203 | Skydock 597 | parking_garage | residential | speeder_garage | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 204 | Skyline Habitat 6259 | apartments | residential | worker_apartments | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 94.8 | yes |
| 205 | Fresh Rations 204 | grocery | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 206 | Everything Emporium 719 | general_store | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 207 | Xel's Caf | caf | residential | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 208 | Grand Holovid 871 | holo_theatre | residential | opera_house | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 209 | Dosk's Produce | grocery | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 210 | Block 8571 Habitats | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 211 | Skyline Books | bookshop | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 212 | Kresh Institute of Technology | university | financial | school | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 213 | Federal District Fitness | gym | financial | bath_gym | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 214 | Corvane Systems Annex | office | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 215 | The Federal District Dispatch | holonet_office | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 216 | Maldrin & Partners Advertising | advertising_agency | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 217 | Federal District Residences 1458 | apartments | financial | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 218 | Federal District Commodities House | trade_house | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 219 | Corellian Credit Union | bank | financial | bank | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 220 | Kelvane Caf & Pastry | caf | financial | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 221 | Brea's Caf | caf | senate | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 222 | Office of Senator Ghavic | ministry | senate | delegation_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 223 | Speeder Registry 355 | licensing_office | senate | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 224 | Wyllan & Corvane Consultants | office | senate | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 225 | Falkren, Corvane & Associates | law_office | senate | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 226 | Chandrilan Mission | embassy | senate | delegation_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 227 | Judiciary Annex 675 | courthouse | senate | courthouse | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 228 | Republic Records Office 985 | licensing_office | senate | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 229 | CSF Station Senate District | security_station | senate | security_station | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 230 | Ryloth Delegation House | embassy | senate | delegation_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 231 | Ionne & Vantrell Consultants | office | senate | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 232 | Chez Ollum | restaurant | senate | diner | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 233 | Cold Cuts 858 | butcher | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 234 | Night Chemist 594 | pharmacy | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 235 | Zhorrin Preparatory | school | residential | school | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 236 | Skyline Residences 9777 | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 237 | Neuro-Link Surgical | cybernetics_clinic | residential | clinic | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 238 | Starlight Cinema 384 | holo_theatre | residential | opera_house | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 239 | Skyline Residences 3318 | apartments | residential | worker_apartments | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 240 | Roots & Shoots 580 | garden_shop | residential | retail_shop | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 92.4 | yes |
| 241 | Skyline Academy | school | residential | school | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 242 | Skyline Interiors 562 | furniture_store | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 243 | Belsar Caf & Pastry | caf | residential | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 244 | Yara's Diner | diner | residential | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 245 | Agri-Corp Outlet 379 | grocery | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 246 | Sorrel Towers | apartments | residential | worker_apartments | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 94.8 | yes |
| 247 | Renn Hull & Cargo Insurance | insurance | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 248 | Chambers of Belsar | law_office | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 249 | Kelvane Group | office | financial | corporate_office | 4 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 94 | yes |
| 250 | The Estrik Collection | museum | financial | gallery | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 251 | Xanne & Renn Consultants | office | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 252 | Vantrell Broadcast | holonet_office | financial | corporate_office | 5 | 4 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 92.8 | yes |
| 253 | Cadrin Holo-Electronics | electronics | financial | retail_shop | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 254 | Federal District Tariff Bureau | tax_office | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 255 | Kuati Systems Annex | office | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 256 | Needle & Thread 286 | tailor | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 257 | Jode's Diner | diner | residential | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 258 | Ezzi's Broth House | noodle_bar | residential | diner | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 94.8 | yes |
| 259 | Vaddon's Produce | grocery | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 260 | Block 4022 Habitats | apartments | residential | worker_apartments | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 94.8 | yes |
| 261 | Onnar's Nerf & Bantha | butcher | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 262 | Level 3191 Interchange | transit_station | residential | transit_interchange | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 263 | The Flatbread Stand | bakery | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 264 | Skyline Habitat 4724 | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 265 | Bralen General Supply | general_store | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 266 | Level 4547 Interchange | transit_station | residential | transit_interchange | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 267 | Skyline Grocer 816 | grocery | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 268 | Level 4522 Walk-In Clinic | clinic | residential | clinic | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 94.8 | yes |
| 269 | Order of the Silent Sun | order_house | residential | community_hall | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 270 | Spacers' Rest 132 | hostel | residential | hotel | 5 | 4 | 4 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 92.4 | yes |
| 271 | Skyline Ovens | bakery | residential | retail_shop | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 94.8 | yes |
| 272 | Tank Ward 197 | bacta_ward | residential | clinic | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 273 | Chapel of the Skyline Stars | shrine | residential | community_hall | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 92.4 | yes |
| 274 | Skyline Residences 2660 | apartments | residential | worker_apartments | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 275 | Vint's Bakery | bakery | residential | retail_shop | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 93.6 | yes |
| 276 | Galactic Indemnity 482 | insurance | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 277 | Sethric Towers | apartments | financial | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 278 | Republica Annex 242 | luxury_residences | financial | affluent_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 279 | Talvek Underwriters | insurance | financial | corporate_office | 4 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 94 | yes |
| 280 | Everything Emporium 142 | general_store | residential | retail_shop | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 94.8 | yes |
| 281 | Quillan Towers | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 282 | Agri-Corp Outlet 599 | grocery | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 283 | Brotherhood of Ionne | order_house | residential | community_hall | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 284 | Skydock 997 | parking_garage | residential | speeder_garage | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 285 | Caf Corner 411 | caf | residential | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 286 | Skyline Residences 5226 | apartments | residential | worker_apartments | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 287 | Cold Cuts 148 | butcher | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 288 | Orrin's Broth House | noodle_bar | residential | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 289 | Skyline Habitat 8144 | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 290 | Kettrick Parking | parking_garage | residential | speeder_garage | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 291 | Falkren General Supply | general_store | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 292 | Kip's Bakery | bakery | residential | retail_shop | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 293 | Talvek Towers | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 294 | The Quiet Room | shrine | residential | community_hall | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 295 | Nerf Steaks 507 | diner | residential | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 296 | Cotta Group | office | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 297 | Holo-Core Labs 887 | tech_firm | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 298 | Outer Rim Imports 200 | trade_house | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 299 | Federal District Heights | apartments | financial | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 300 | Marrov, Vokar & Associates | law_office | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 301 | Hotel Skyhook 801 | hotel | financial | hotel | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 94.8 | yes |
| 302 | Federal District Holo-Ads 175 | advertising_agency | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 303 | Aurodium Holdings | office | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 304 | Maldrin's Holobooks | bookshop | financial | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 305 | Level 3037 Garage | parking_garage | financial | speeder_garage | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 306 | Caf Corner 916 | caf | financial | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 307 | Starlight Cinema 926 | holo_theatre | residential | opera_house | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 308 | Skyline Habitat 1227 | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 309 | Hollis's Garden Shop | garden_shop | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 310 | Skyline Home & Habitat | furniture_store | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 311 | Republic Athletic 311 | gym | residential | bath_gym | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 312 | Sector 264 Patrol House | security_station | residential | security_station | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 313 | Monastery of the Skyline Wind | order_house | residential | community_hall | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 314 | Zell General Supply | general_store | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 315 | Federal District Residences 4522 | apartments | financial | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 316 | Quillan Credit Union | bank | financial | bank | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 317 | The Cadrin Collection | museum | financial | gallery | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 318 | Federal District Penthouses | luxury_residences | financial | affluent_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 319 | The Federal District Grand | hotel | financial | hotel | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 320 | Galactic Indemnity 473 | insurance | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 321 | Corellian Suites | hotel | financial | hotel | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 322 | Corvane Underwriters | insurance | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 323 | Osmer Institute of Technology | university | financial | school | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 94.8 | yes |
| 324 | Caf Corner 456 | caf | financial | diner | 5 | 4 | 4 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 92.4 | yes |
| 325 | Outer Rim Credit Union | bank | financial | bank | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 326 | Republic Records Office 789 | licensing_office | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 327 | Glow & Signal 876 | electronics | financial | retail_shop | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 328 | Sullustan Datawork | tech_firm | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 329 | Perrit, Hessik & Associates | law_office | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 330 | Vaddon Group | office | financial | corporate_office | 5 | 4 | 4 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 90.4 | yes |
| 331 | Coruscant Fire Brigade — Skyline | fire_station | residential | fire_station | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 332 | Skydock 563 | parking_garage | residential | speeder_garage | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 333 | Block 6334 Habitats | apartments | residential | worker_apartments | 5 | 4 | 4 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 92.4 | yes |
| 334 | Level 4747 Walk-In Clinic | clinic | residential | clinic | 5 | 4 | 4 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 92.4 | yes |
| 335 | Block 6407 Habitats | apartments | residential | worker_apartments | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 336 | Skyline Fine Arts | art_gallery | residential | gallery | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 337 | Vint's Caf | caf | residential | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 338 | Corrin Training Hall | gym | residential | bath_gym | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 339 | Skyline Grocer 283 | grocery | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 340 | Borvik's Nerf & Bantha | butcher | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 341 | Kwikmart 456 | general_store | residential | retail_shop | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 94.8 | yes |
| 342 | Borvik Towers | apartments | residential | worker_apartments | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 94.8 | yes |
| 343 | Lorn's Bakery | bakery | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 344 | New Limb Clinic 325 | cybernetics_clinic | residential | clinic | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 345 | Lannick & Dresh Consultants | office | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 346 | Coaxium Datawork | tech_firm | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 347 | Ironclad Escorts 560 | private_security | financial | security_station | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 348 | Slogan Works | advertising_agency | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 349 | Blue Screen Pictures | holo_studio | financial | broadcast_studio | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 350 | Hasque Legal | law_office | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 351 | Republica Annex 898 | luxury_residences | financial | affluent_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 352 | Hotel Jesk | hotel | financial | hotel | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 353 | Belsar Hull & Cargo Insurance | insurance | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 354 | Hydian Holdings | office | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 355 | Ionic Credit Union | bank | financial | bank | 5 | 4 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 92.8 | yes |
| 356 | Manarai Terrace | restaurant | financial | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 357 | Kresh & Brannick Consultants | office | financial | corporate_office | 4 | 4 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 90.4 | yes |
| 358 | Kallow Training Hall | gym | financial | bath_gym | 5 | 4 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 92.8 | yes |
| 359 | Yavelle Holdings | office | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 360 | Republic Records Office 304 | licensing_office | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 361 | Jawa Juice 897 | caf | financial | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 362 | Noodle Bar 925 | noodle_bar | financial | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 363 | Ironclad Escorts 466 | private_security | financial | security_station | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 364 | Galactic Indemnity 937 | insurance | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 365 | Jesk Holo-Productions | holo_studio | financial | broadcast_studio | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 366 | University of Federal District — Faculty 497 | university | financial | school | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 367 | Jawa Juice 724 | caf | residential | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 368 | Skyline Air Taxi | taxi_stand | residential | transit_interchange | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 369 | Skyline Interiors 258 | furniture_store | residential | retail_shop | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 94.8 | yes |
| 370 | Skyline Grocer 202 | grocery | residential | retail_shop | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 94.8 | yes |
| 371 | Skyline Bacta Ward | bacta_ward | residential | clinic | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 372 | Block 2585 Habitats | apartments | residential | worker_apartments | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 373 | Sector 141 Patrol House | security_station | residential | security_station | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 94 | yes |
| 374 | Yellow Fin Cabs 494 | taxi_stand | residential | transit_interchange | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 375 | Hasque Preparatory | school | residential | school | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 376 | Caf Corner 846 | caf | residential | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 377 | Skyline Residences 1604 | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 378 | Durasteel Direct 515 | hardware_store | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 379 | Starlight Cinema 657 | holo_theatre | residential | opera_house | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 380 | Datacron & Dust 663 | bookshop | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 381 | Bacta & Sundries | pharmacy | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 382 | Needle & Thread 872 | tailor | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 383 | Ovo's Bakery | bakery | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 384 | CSF Station Skyline | security_station | residential | security_station | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 385 | Skyline Interiors 795 | furniture_store | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 386 | Corvane Hardware | hardware_store | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 387 | Fire Suppression Station 231 | fire_station | residential | fire_station | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 388 | Zhorrin Towers | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 389 | The Merret Spire | luxury_residences | financial | affluent_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 390 | Hyperlane Holdings | office | financial | corporate_office | 5 | 4 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 92.8 | yes |
| 391 | Grek Legal | law_office | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 392 | Circuit Row 383 | electronics | financial | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 393 | Bounty Board — Federal District Guild Hall | private_security | financial | security_station | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 394 | Corellian Holdings | office | financial | corporate_office | 4 | 4 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 90.4 | yes |
| 395 | Galactic Indemnity 321 | insurance | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 396 | Drev Dynamics | tech_firm | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 397 | Skyline Dining Room 399 | restaurant | financial | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 398 | Outer Rim Underwriters | insurance | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 399 | Republica Annex 901 | luxury_residences | financial | affluent_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 400 | Orlann Trust | bank | financial | bank | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 401 | Ardo & Quillan Consultants | office | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 402 | Hotel Orlann | hotel | financial | hotel | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 403 | Tashaan Trading Company | trade_house | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 404 | Jesk Institute of Technology | university | financial | school | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 405 | Hotel Ionne | hotel | financial | hotel | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 94.8 | yes |
| 406 | Ironclad Escorts 201 | private_security | financial | security_station | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 407 | Cadrin Trust | bank | financial | bank | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 408 | Federal District Cybernetics Software | tech_firm | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 409 | Corvane Mercantile Exchange | trade_house | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 410 | Repulsor Executive Residences | luxury_residences | financial | affluent_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 411 | Kelvane Dynamics | tech_firm | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 412 | Bespin Systems Annex | office | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 413 | Federal District Books | bookshop | financial | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 414 | Bureau of Ships and Services — Office 702 | licensing_office | financial | corporate_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 415 | Hotel Sunder | hotel | financial | hotel | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 416 | The Yendt Spire | luxury_residences | financial | affluent_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 417 | Kelvane Trust | bank | financial | bank | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 418 | Dr Jesk — Family Medicine | clinic | residential | clinic | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 419 | Block 5530 Habitats | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 420 | Republic School 196 | school | residential | school | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 421 | Halvor General Supply | general_store | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 422 | Level 2460 Walk-In Clinic | clinic | residential | clinic | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 423 | Skyline Residences 7463 | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 424 | The Skyline Bean | caf | residential | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 425 | Vaddon Prosthetics | cybernetics_clinic | residential | clinic | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 426 | Studio 665 Exhibitions | art_gallery | residential | gallery | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 427 | Cold Cuts 940 | butcher | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 428 | Skyline Habitat 2435 | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 429 | Ezzi's Diner | diner | residential | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 430 | Ardo Furnishings | furniture_store | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 431 | Galactic Goods 905 | general_store | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 432 | Wayfarers’ Shrine 974 | shrine | residential | community_hall | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 433 | Prethen Towers | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 434 | Blue Milk Bakehouse 616 | bakery | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 435 | Gallery Renn | art_gallery | residential | gallery | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 94.8 | yes |
| 436 | Skyline Grocer 581 | grocery | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 437 | Everything Emporium 101 | general_store | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 438 | Skyline Holo-Theatre | holo_theatre | residential | opera_house | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 439 | The Paper Archive | bookshop | residential | retail_shop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 440 | Block 7765 Habitats | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
