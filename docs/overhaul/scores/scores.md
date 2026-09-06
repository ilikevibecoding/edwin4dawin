# Building rubric scores

Spec 17 weights, ten categories rated 0-5 from automated evidence (`scripts/score-buildings.mjs`), seed 1337.

- Buildings scored: **433** (430 ordinary, 3 special: Senate, passenger port, Jedi precinct)
- Mean score: **88.1** (ordinary 88)
- Ordinary buildings at the 85 threshold (no category below 3, floor plan / interactions / NPC >= 4): **239/430 (56%)**
- Special buildings at the 90 threshold (no category below 4): **2/3**
- Hard failures: **0**; non-deterministic rebuilds: 0; warm builds over budget: 0 (mean 1.89 ms, max 47.3 ms)
- Lighting and sound is capped at 4/5 for every building: district ambience is not implemented (`src/audio.js` carries only the frontier-town ambience). Required audio is listed here as incomplete, not averaged away.

## Distribution

| Score | Buildings |
|---|---:|
| 95-100 | 161 |
| 90-94 | 19 |
| 85-89 | 61 |
| 80-84 | 127 |
| 70-79 | 65 |
| 50-69 | 0 |
| 0-49 | 0 |

## Category means (0-5)

| Category | Weight | Mean |
|---|---:|---:|
| Identity and exterior architecture | 12 | 3.79 |
| Floor plan and room purpose | 18 | 4.9 |
| Interior specificity and materials | 12 | 4.39 |
| Working interactions | 10 | 5 |
| NPC purpose and behaviour | 12 | 4.81 |
| Economic and city integration | 10 | 3.43 |
| Story and discoverability | 8 | 3.84 |
| Lighting and sound | 8 | 4 |
| Access and navigation | 6 | 4.99 |
| Technical integrity | 4 | 4.85 |

## Per district

| district | Buildings | Mean | At threshold | Share |
|---|---:|---:|---:|---:|
| residential | 149 | 90 | 107 | 72% |
| financial | 147 | 83.1 | 32 | 22% |
| industrial | 59 | 95.3 | 55 | 93% |
| entertainment | 47 | 88.5 | 29 | 62% |
| senate | 18 | 86.8 | 7 | 39% |
| market | 13 | 89.3 | 11 | 85% |

## Per program

| program | Buildings | Mean | At threshold | Share |
|---|---:|---:|---:|---:|
| none | 251 | 81.5 | 60 | 24% |
| worker_apartments | 35 | 97.3 | 35 | 100% |
| diner | 30 | 97.7 | 30 | 100% |
| affluent_apartments | 14 | 97.9 | 14 | 100% |
| transit_interchange | 14 | 97.3 | 14 | 100% |
| security_station | 12 | 95.2 | 12 | 100% |
| clinic | 11 | 96.7 | 11 | 100% |
| opera_house | 9 | 97 | 9 | 100% |
| cantina_club | 8 | 97.3 | 8 | 100% |
| cargo_terminal | 8 | 96.9 | 8 | 100% |
| droid_workshop | 8 | 97.5 | 8 | 100% |
| repair_hangar | 7 | 97.9 | 7 | 100% |
| utility_plant | 7 | 97.5 | 7 | 100% |
| delegation_office | 5 | 96.2 | 5 | 100% |
| community_hall | 3 | 96 | 3 | 100% |
| market_arcade | 3 | 96.5 | 3 | 100% |
| salvage_yard | 3 | 98.4 | 3 | 100% |
| criminal_front | 2 | 96.4 | 2 | 100% |
| jedi_temple | 1 | 95.6 | 1 | 100% |
| passenger_terminal | 1 | 97.6 | 1 | 100% |
| senate | 1 | 83.6 | 0 | 0% |

## Most frequent failed checks

| Check | Buildings |
|---|---:|
| light: district ambience not implemented (src/audio#js) | 433 |
| economy: no documented external consequence | 251 |
| story: no connection | 251 |
| identity: program null: # rooms built, # satisfied by the module | 249 |
| story: greeting line only | 249 |
| economy: no supplier in the city | 148 |
| economy: dependencies: none | 147 |
| economy: no customer for its outputs | 134 |
| technical: # floating blocks | 64 |
| plan: circulation # of the floor area | 34 |
| identity: signature room lounge (generic library room) | 31 |
| interior: lounge furnished to its program | 31 |
| identity: nearest sibling lot # differs on #/# axes | 23 |
| identity: signature room control_room (generic library room) | 15 |
| interior: control_room furnished to its program | 15 |
| identity: signature room studio (generic library room) | 14 |
| interior: studio furnished to its program | 14 |
| identity: signature room family_apartment (generic library room) | 14 |
| interior: family_apartment furnished to its program | 14 |
| identity: signature room meditation_chamber (generic library room) | 13 |
| interior: meditation_chamber furnished to its program | 13 |
| identity: signature room library (generic library room) | 13 |
| interior: library furnished to its program | 13 |
| interior: # furniture kinds per room | 12 |
| identity: signature room server_room (generic library room) | 11 |

## Below threshold (192)

### Lot 2 - Monument Plaza (museum, financial) - 71.2/85
- Floor plan and room purpose 3/5 (needs 4): 8 graph component(s), 0 room(s) without a doorway; circulation 88% of the floor area
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 330 - Vaddon Group (office, financial) - 71.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 357 - Kresh & Brannick Consultants (office, financial) - 71.6/85
- Identity and exterior architecture 2/5 (needs 3): program null: 0 rooms built, 0 satisfied by the module; signature room family_apartment (generic library room); nearest sibling lot 191 differs on 4/7 axes
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 394 - Corellian Holdings (office, financial) - 71.6/85
- Identity and exterior architecture 2/5 (needs 3): program null: 0 rooms built, 0 satisfied by the module; signature room school_room (generic library room); nearest sibling lot 357 differs on 4/7 axes
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 252 - Vantrell Broadcast (holonet_office, financial) - 72.4/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 390 - Hyperlane Holdings (office, financial) - 74/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 140 - Federal District Mutual Assurance (insurance, financial) - 75.2/85
- Identity and exterior architecture 2/5 (needs 3): program null: 0 rooms built, 0 satisfied by the module; signature room family_apartment (generic library room); nearest sibling lot 398 differs on 4/7 axes
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 191 - Thessik Group (office, financial) - 75.2/85
- Identity and exterior architecture 2/5 (needs 3): program null: 0 rooms built, 0 satisfied by the module; signature room family_apartment (generic library room); nearest sibling lot 357 differs on 4/7 axes
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 249 - Kelvane Group (office, financial) - 75.2/85
- Identity and exterior architecture 2/5 (needs 3): program null: 0 rooms built, 0 satisfied by the module; signature room family_apartment (generic library room); nearest sibling lot 191 differs on 4/7 axes
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 398 - Outer Rim Underwriters (insurance, financial) - 75.2/85
- Identity and exterior architecture 2/5 (needs 3): program null: 0 rooms built, 0 satisfied by the module; signature room lounge (generic library room); nearest sibling lot 140 differs on 4/7 axes
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 270 - Spacers' Rest 132 (hostel, residential) - 76/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 273 - Chapel of the Skyline Stars (shrine, residential) - 76/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 301 - Hotel Skyhook 801 (hotel, financial) - 76/85
- Identity and exterior architecture 2/5 (needs 3): program null: 0 rooms built, 0 satisfied by the module; signature room gym (generic library room); nearest sibling lot 405 differs on 4/7 axes
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 323 - Osmer Institute of Technology (university, financial) - 76/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 405 - Hotel Ionne (hotel, financial) - 76/85
- Identity and exterior architecture 2/5 (needs 3): program null: 0 rooms built, 0 satisfied by the module; signature room storage (generic library room); nearest sibling lot 301 differs on 4/7 axes
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 358 - Kallow Training Hall (gym, financial) - 76.4/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 142 - Estrik Legal (law_office, financial) - 76.8/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 162 - Renn, Wroth & Associates (law_office, financial) - 76.8/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 322 - Corvane Underwriters (insurance, financial) - 76.8/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 42 - Soundstage 385 (holo_studio, entertainment) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 109 - Soundstage 135 (holo_studio, entertainment) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 135 - Tarrek & Pravik Consultants (office, financial) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 136 - Soundstage 183 (holo_studio, financial) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 158 - Kresh Hull & Cargo Insurance (insurance, financial) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 170 - Iron Nerf Gym (gym, financial) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 171 - Rescue Company 850 (fire_station, residential) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 180 - Tuvann & Dresh Consultants (office, financial) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 182 - Ulmer Dynamics (tech_firm, financial) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 197 - Rimward Datawork (tech_firm, financial) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 248 - Chambers of Belsar (law_office, financial) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 251 - Xanne & Renn Consultants (office, financial) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 276 - Galactic Indemnity 482 (insurance, financial) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 279 - Talvek Underwriters (insurance, financial) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 300 - Marrov, Vokar & Associates (law_office, financial) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 303 - Aurodium Holdings (office, financial) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 320 - Galactic Indemnity 473 (insurance, financial) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 328 - Sullustan Datawork (tech_firm, financial) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 331 - Coruscant Fire Brigade — Skyline (fire_station, residential) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 345 - Lannick & Dresh Consultants (office, financial) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 349 - Blue Screen Pictures (holo_studio, financial) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 354 - Hydian Holdings (office, financial) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 359 - Yavelle Holdings (office, financial) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 363 - Ironclad Escorts 466 (private_security, financial) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 364 - Galactic Indemnity 937 (insurance, financial) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 365 - Jesk Holo-Productions (holo_studio, financial) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 387 - Fire Suppression Station 231 (fire_station, residential) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 391 - Grek Legal (law_office, financial) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 395 - Galactic Indemnity 321 (insurance, financial) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 401 - Ardo & Quillan Consultants (office, financial) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 412 - Bespin Systems Annex (office, financial) - 77.6/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 202 - Skyline Pharma (pharmacy, residential) - 78.4/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 203 - Skydock 597 (parking_garage, residential) - 78.8/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 216 - Maldrin & Partners Advertising (advertising_agency, financial) - 78.8/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 11 - HoloNet broadcast tower (holonet_office, financial) - 79.2/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 169 - Aurodium Systems Annex (office, financial) - 79.2/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 228 - Republic Records Office 985 (licensing_office, senate) - 79.2/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 96 - Datacron & Dust 294 (bookshop, market) - 79.6/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 153 - Dock Row Hostel 885 (hostel, residential) - 79.6/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 250 - The Estrik Collection (museum, financial) - 79.6/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 284 - Skydock 997 (parking_garage, residential) - 79.6/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 290 - Kettrick Parking (parking_garage, residential) - 79.6/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 305 - Level 3037 Garage (parking_garage, financial) - 79.6/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 317 - The Cadrin Collection (museum, financial) - 79.6/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 332 - Skydock 563 (parking_garage, residential) - 79.6/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 415 - Hotel Sunder (hotel, financial) - 79.6/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 38 - Corrin Security Contractors (private_security, entertainment) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 58 - Bounty Board — Uscru Guild Hall (private_security, entertainment) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 112 - Quorr Security Contractors (private_security, entertainment) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 138 - Skarris Group (office, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 145 - Senate District District Court (courthouse, senate) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 147 - Level 5603 Primary (school, residential) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 156 - Level 8673 Primary (school, residential) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 161 - Tesrin Datawork (tech_firm, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 163 - Zhorrin & Dosk Consultants (office, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 165 - Renn & Othus Consultants (office, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 167 - Talvek Datawork (tech_firm, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 168 - Zabrin Hull & Cargo Insurance (insurance, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 189 - Ollum Hull & Cargo Insurance (insurance, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 192 - Holo-Core Labs 666 (tech_firm, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 194 - Galactic Indemnity 575 (insurance, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 195 - Speeder Registry 601 (licensing_office, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 198 - Orsk-Dathen Holdings (office, senate) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 199 - Hall of Records 197 (archive, senate) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 213 - Federal District Fitness (gym, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 214 - Corvane Systems Annex (office, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 215 - The Federal District Dispatch (holonet_office, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 223 - Speeder Registry 355 (licensing_office, senate) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 224 - Wyllan & Corvane Consultants (office, senate) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 225 - Falkren, Corvane & Associates (law_office, senate) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 227 - Judiciary Annex 675 (courthouse, senate) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 231 - Ionne & Vantrell Consultants (office, senate) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 235 - Zhorrin Preparatory (school, residential) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 240 - Roots & Shoots 580 (garden_shop, residential) - 80/85
- total below 85: identity 3, plan 4, interior 4, npc 4, economy 4, story 3, light 4

### Lot 241 - Skyline Academy (school, residential) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 247 - Renn Hull & Cargo Insurance (insurance, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 254 - Federal District Tariff Bureau (tax_office, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 255 - Kuati Systems Annex (office, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 296 - Cotta Group (office, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 297 - Holo-Core Labs 887 (tech_firm, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 311 - Republic Athletic 311 (gym, residential) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 326 - Republic Records Office 789 (licensing_office, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 329 - Perrit, Hessik & Associates (law_office, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 338 - Corrin Training Hall (gym, residential) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 346 - Coaxium Datawork (tech_firm, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 347 - Ironclad Escorts 560 (private_security, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 350 - Hasque Legal (law_office, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 353 - Belsar Hull & Cargo Insurance (insurance, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 360 - Republic Records Office 304 (licensing_office, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 375 - Hasque Preparatory (school, residential) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 393 - Bounty Board — Federal District Guild Hall (private_security, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 396 - Drev Dynamics (tech_firm, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 406 - Ironclad Escorts 201 (private_security, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 408 - Federal District Cybernetics Software (tech_firm, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 411 - Kelvane Dynamics (tech_firm, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 414 - Bureau of Ships and Services — Office 702 (licensing_office, financial) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 420 - Republic School 196 (school, residential) - 80/85
- Economic and city integration 1/5 (needs 3): dependencies: none; no supplier in the city; no customer for its outputs; no documented external consequence

### Lot 355 - Ionic Credit Union (bank, financial) - 80.4/85
- total below 85: identity 3, plan 4, interior 4, economy 3, story 3, light 4

### Lot 76 - Corvane's Armoury (armorer, industrial) - 81.2/85
- total below 85: identity 3, interior 3, npc 4, economy 4, story 3, light 4

### Lot 92 - Ghavic-Orlann Starship Showroom 472 (ship_dealer, market) - 81.2/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 172 - Teo's Bakery (bakery, residential) - 81.2/85
- total below 85: identity 3, interior 3, npc 4, economy 4, story 3, light 4

### Lot 275 - Vint's Bakery (bakery, residential) - 81.2/85
- total below 85: identity 3, interior 3, npc 4, economy 4, story 3, light 4

### Lot 348 - Slogan Works (advertising_agency, financial) - 81.2/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 43 - The Uscru Grand (hotel, entertainment) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 44 - Sabacc Simulators 589 (holo_arcade, entertainment) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 57 - Sabacc Simulators 789 (holo_arcade, entertainment) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 60 - Sabacc Simulators 952 (holo_arcade, entertainment) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 66 - The Works Bunkhouse (hostel, industrial) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 68 - Hotel Skyhook 577 (hotel, entertainment) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 70 - Steam Gardens 336 (bathhouse, entertainment) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 71 - Dejarik Den (holo_arcade, entertainment) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 108 - Holo-Arcade 784 (holo_arcade, entertainment) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 128 - Steam Gardens 477 (bathhouse, entertainment) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 131 - Holo-Arcade 334 (holo_arcade, entertainment) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 134 - College of Xenolinguistics (university, financial) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 188 - Perrit's Holobooks (bookshop, financial) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 211 - Skyline Books (bookshop, residential) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 212 - Kresh Institute of Technology (university, financial) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 234 - Night Chemist 594 (pharmacy, residential) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 294 - The Quiet Room (shrine, residential) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 302 - Federal District Holo-Ads 175 (advertising_agency, financial) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 304 - Maldrin's Holobooks (bookshop, financial) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 319 - The Federal District Grand (hotel, financial) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 321 - Corellian Suites (hotel, financial) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 352 - Hotel Jesk (hotel, financial) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 366 - University of Federal District — Faculty 497 (university, financial) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 380 - Datacron & Dust 663 (bookshop, residential) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 381 - Bacta & Sundries (pharmacy, residential) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 402 - Hotel Orlann (hotel, financial) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 404 - Jesk Institute of Technology (university, financial) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 413 - Federal District Books (bookshop, financial) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 432 - Wayfarers’ Shrine 974 (shrine, residential) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 439 - The Paper Archive (bookshop, residential) - 82/85
- Economic and city integration 2/5 (needs 3): dependencies: none; no supplier in the city; no documented external consequence

### Lot 271 - Skyline Ovens (bakery, residential) - 82.4/85
- total below 85: identity 3, plan 4, interior 4, economy 4, story 3, light 4

### Lot 280 - Everything Emporium 142 (general_store, residential) - 82.4/85
- total below 85: identity 3, plan 4, interior 4, economy 4, story 3, light 4

### Lot 341 - Kwikmart 456 (general_store, residential) - 82.4/85
- total below 85: identity 3, plan 4, interior 4, economy 4, story 3, light 4

### Lot 369 - Skyline Interiors 258 (furniture_store, residential) - 82.4/85
- total below 85: identity 3, plan 4, interior 4, economy 4, story 3, light 4

### Lot 370 - Skyline Grocer 202 (grocery, residential) - 82.4/85
- total below 85: identity 3, plan 4, interior 4, economy 4, story 3, light 4

### Lot 435 - Gallery Renn (art_gallery, residential) - 82.4/85
- total below 85: identity 3, plan 4, interior 4, economy 4, story 3, light 4

### Lot 160 - Outer Rim Imports 159 (trade_house, financial) - 83.2/85
- total below 85: identity 3, interior 4, economy 3, story 3, light 4, technical 4

### Lot 298 - Outer Rim Imports 200 (trade_house, financial) - 83.2/85
- total below 85: identity 3, interior 4, economy 3, story 3, light 4, technical 4

### Lot 0 - Galactic Senate (ministry, senate, program senate) - 83.6/90
- Floor plan and room purpose 2/5 (needs 4): 2 graph component(s), 1 room(s) without a doorway; 74% of rooms have a known function; program rooms missing: security_screening, petition_office, press_gallery, diplomatic_reception, maintenance_access

### Lot 46 - Second Chance Goods (pawn, entertainment) - 83.6/85
- total below 85: identity 3, interior 4, npc 4, economy 4, story 3, light 4

### Lot 74 - Maldrin Outfitters (armorer, industrial) - 83.6/85
- total below 85: identity 3, interior 4, npc 4, economy 4, story 3, light 4

### Lot 83 - Uscru Meat Market 291 (butcher, entertainment) - 83.6/85
- Identity and exterior architecture 2/5 (needs 3): program null: 0 rooms built, 0 satisfied by the module; 1/6 identity blocks shared with the entertainment district palette; signature room lounge (generic library room)

### Lot 101 - Gallery Vyre (art_gallery, entertainment) - 83.6/85
- total below 85: identity 3, interior 4, npc 4, economy 4, story 3, light 4

### Lot 114 - Juvo's Armoury (armorer, industrial) - 83.6/85
- total below 85: identity 3, interior 4, npc 4, economy 4, story 3, light 4

### Lot 174 - Blue Milk Bakehouse 921 (bakery, residential) - 83.6/85
- total below 85: identity 3, interior 4, npc 4, economy 4, story 3, light 4

### Lot 232 - Chez Ollum (restaurant, senate) - 83.6/85
- total below 85: identity 3, interior 4, npc 4, economy 4, story 3, light 4

### Lot 242 - Skyline Interiors 562 (furniture_store, residential) - 83.6/85
- Identity and exterior architecture 2/5 (needs 3): program null: 0 rooms built, 0 satisfied by the module; signature room meditation_chamber (generic library room); nearest sibling lot 310 differs on 4/7 axes

### Lot 253 - Cadrin Holo-Electronics (electronics, financial) - 83.6/85
- Identity and exterior architecture 2/5 (needs 3): program null: 0 rooms built, 0 satisfied by the module; signature room storage (generic library room); nearest sibling lot 327 differs on 4/7 axes

### Lot 292 - Kip's Bakery (bakery, residential) - 83.6/85
- total below 85: identity 3, interior 4, npc 4, economy 4, story 3, light 4

### Lot 310 - Skyline Home & Habitat (furniture_store, residential) - 83.6/85
- Identity and exterior architecture 2/5 (needs 3): program null: 0 rooms built, 0 satisfied by the module; signature room meditation_chamber (generic library room); nearest sibling lot 242 differs on 4/7 axes

### Lot 327 - Glow & Signal 876 (electronics, financial) - 83.6/85
- Identity and exterior architecture 2/5 (needs 3): program null: 0 rooms built, 0 satisfied by the module; signature room cafeteria (generic library room); nearest sibling lot 253 differs on 4/7 axes

### Lot 336 - Skyline Fine Arts (art_gallery, residential) - 83.6/85
- total below 85: identity 3, interior 4, npc 4, economy 4, story 3, light 4

### Lot 343 - Lorn's Bakery (bakery, residential) - 83.6/85
- total below 85: identity 3, interior 4, npc 4, economy 4, story 3, light 4

### Lot 392 - Circuit Row 383 (electronics, financial) - 83.6/85
- Identity and exterior architecture 2/5 (needs 3): program null: 0 rooms built, 0 satisfied by the module; signature room lounge (generic library room); nearest sibling lot 327 differs on 4/7 axes

### Lot 426 - Studio 665 Exhibitions (art_gallery, residential) - 83.6/85
- total below 85: identity 3, interior 4, npc 4, economy 4, story 3, light 4

### Lot 141 - Outer Rim Imports 217 (trade_house, financial) - 84/85
- total below 85: identity 3, interior 4, economy 3, story 3, light 4

### Lot 159 - Core Banking Guild — Federal District Branch (bank, financial) - 84/85
- total below 85: identity 3, interior 4, economy 3, story 3, light 4

### Lot 164 - Bank of Federal District (bank, financial) - 84/85
- total below 85: identity 3, interior 4, economy 3, story 3, light 4

### Lot 183 - Zabrin Trust (bank, financial) - 84/85
- total below 85: identity 3, interior 4, economy 3, story 3, light 4

### Lot 186 - Chandrilan Credit Union (bank, financial) - 84/85
- total below 85: identity 3, interior 4, economy 3, story 3, light 4

### Lot 190 - Outer Rim Imports 260 (trade_house, financial) - 84/85
- total below 85: identity 3, interior 4, economy 3, story 3, light 4

### Lot 218 - Federal District Commodities House (trade_house, financial) - 84/85
- total below 85: identity 3, interior 4, economy 3, story 3, light 4

### Lot 219 - Corellian Credit Union (bank, financial) - 84/85
- total below 85: identity 3, interior 4, economy 3, story 3, light 4

### Lot 316 - Quillan Credit Union (bank, financial) - 84/85
- total below 85: identity 3, interior 4, economy 3, story 3, light 4

### Lot 325 - Outer Rim Credit Union (bank, financial) - 84/85
- total below 85: identity 3, interior 4, economy 3, story 3, light 4

### Lot 400 - Orlann Trust (bank, financial) - 84/85
- total below 85: identity 3, interior 4, economy 3, story 3, light 4

### Lot 403 - Tashaan Trading Company (trade_house, financial) - 84/85
- total below 85: identity 3, interior 4, economy 3, story 3, light 4

### Lot 407 - Cadrin Trust (bank, financial) - 84/85
- total below 85: identity 3, interior 4, economy 3, story 3, light 4

### Lot 409 - Corvane Mercantile Exchange (trade_house, financial) - 84/85
- total below 85: identity 3, interior 4, economy 3, story 3, light 4

### Lot 417 - Kelvane Trust (bank, financial) - 84/85
- total below 85: identity 3, interior 4, economy 3, story 3, light 4

## Every building

| Lot | Name | Purpose | District | Program | ident | plan | inter | inter | npc | econo | story | light | acces | techn | Total | Pass |
|---:|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 0 | Galactic Senate | ministry | senate | senate | 5 | 2 | 5 | 5 | 5 | 4 | 5 | 4 | 4 | 4 | 83.6 | no |
| 1 | Jedi Temple | temple_annex | financial | jedi_temple | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 4 | 95.6 | yes |
| 2 | Monument Plaza | museum | financial |  | 3 | 3 | 4 | 5 | 4 | 2 | 3 | 4 | 4 | 5 | 71.2 | no |
| 3 | Uscru undercity strip | cantina | entertainment | cantina_club | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 94 | yes |
| 4 | The Works foundry | foundry | industrial | utility_plant | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 94 | yes |
| 5 | CoCo Town market halls | market_stall | market | market_arcade | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 4 | 95.2 | yes |
| 6 | Galaxies Opera House | holo_theatre | entertainment | opera_house | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 4 | 4 | 4 | 90.4 | yes |
| 7 | 500 Republica | luxury_residences | residential | affluent_apartments | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 4 | 4 | 92.8 | yes |
| 8 | Senate Office Building | ministry | market | delegation_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 4 | 95.6 | yes |
| 9 | Grand Republic Medical Facility | clinic | residential | clinic | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 10 | Republic Judiciary Central Detention Center | security_station | industrial | security_station | 5 | 4 | 4 | 4 | 5 | 4 | 5 | 4 | 4 | 5 | 87.2 | yes |
| 11 | HoloNet broadcast tower | holonet_office | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 4 | 79.2 | no |
| 20 | Kuat Service Bay 490 | repair_shop | industrial | repair_hangar | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 21 | Bespin Power Authority | power_plant | industrial | utility_plant | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 22 | Drev Airspeeder Hire | taxi_stand | industrial | transit_interchange | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 23 | The Works — Line 730 | foundry | industrial | utility_plant | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 24 | The Works Building Supply | hardware_store | industrial |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 25 | Droid Works 883 | droid_shop | industrial | droid_workshop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 26 | The Works Grill | diner | industrial | diner | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 27 | Nalto Executive Aviation | hangar | industrial | repair_hangar | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 28 | Bellith Haulage | depot | industrial | cargo_terminal | 5 | 5 | 4 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 95.2 | yes |
| 29 | Motivator Line 633 | droid_factory | industrial | droid_workshop | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 30 | Hyperlane Terminus | transit_station | industrial | transit_interchange | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 94 | yes |
| 31 | Garrick's Droid Depot | droid_shop | industrial | droid_workshop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 32 | Kip's Broth House | noodle_bar | industrial | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 33 | Korrid Bulk Goods | warehouse | industrial | cargo_terminal | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 34 | Glow & Signal 563 | electronics | industrial |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 35 | CSF Station The Works | security_station | industrial | security_station | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 36 | Ostrander Components Outlet | electronics | industrial |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 37 | Tyvane Speeders | speeder_dealer | entertainment |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 38 | Corrin Security Contractors | private_security | entertainment |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 39 | Corrin's Cantina | cantina | entertainment | cantina_club | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 40 | The Golden Wheel | casino | entertainment |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 41 | Steam & Salt 545 | noodle_bar | entertainment | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 42 | Soundstage 385 | holo_studio | entertainment |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 43 | The Uscru Grand | hotel | entertainment |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 44 | Sabacc Simulators 589 | holo_arcade | entertainment |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 45 | Vertical City Nights | night_club | entertainment | cantina_club | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 46 | Second Chance Goods | pawn | entertainment |  | 3 | 5 | 4 | 5 | 4 | 4 | 3 | 4 | 5 | 5 | 83.6 | no |
| 47 | Yorrel Sabacc Palace | casino | entertainment |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 48 | Cold Cuts 546 | butcher | entertainment |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 49 | Bralen's Ship Repair | repair_shop | industrial | repair_hangar | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 50 | Judicial Forces Depot 240 | guard_barracks | industrial | security_station | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 51 | Salvage Yard 911 | recycling_plant | industrial | salvage_yard | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 52 | Judicial Forces Depot 341 | guard_barracks | industrial | security_station | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 53 | Osmer Haulage | depot | industrial | cargo_terminal | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 54 | Junk Level Recycling | recycling_plant | industrial | salvage_yard | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 55 | The Works Coaxium Works | refinery | industrial | utility_plant | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 56 | Undercity Exchange 672 | pawn | entertainment |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 57 | Sabacc Simulators 789 | holo_arcade | entertainment |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 58 | Bounty Board — Uscru Guild Hall | private_security | entertainment |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 59 | Skylane Taxis 950 | taxi_stand | entertainment | transit_interchange | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 60 | Sabacc Simulators 952 | holo_arcade | entertainment |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 61 | The Glow Pit | night_club | entertainment | cantina_club | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 62 | Late Shift Diner | diner | entertainment | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 63 | Chandrilan Droid Assembly 441 | droid_factory | industrial | droid_workshop | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 64 | Starlane Interstellar | office | industrial | criminal_front | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 65 | The Works Air Taxi | taxi_stand | industrial | transit_interchange | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 66 | The Works Bunkhouse | hostel | industrial |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 67 | Uscru Market Stalls 985 | market_stall | entertainment | market_arcade | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 68 | Hotel Skyhook 577 | hotel | entertainment |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 69 | House of Chance 300 | casino | entertainment |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 70 | Steam Gardens 336 | bathhouse | entertainment |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 71 | Dejarik Den | holo_arcade | entertainment |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 72 | Yorrel's Droid Depot | droid_shop | industrial | droid_workshop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 73 | Hangar 795 Maintenance | repair_shop | industrial | repair_hangar | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 94.8 | yes |
| 74 | Maldrin Outfitters | armorer | industrial |  | 3 | 5 | 4 | 5 | 4 | 4 | 3 | 4 | 5 | 5 | 83.6 | no |
| 75 | Vantrell Bulk Goods | warehouse | industrial | cargo_terminal | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 76 | Corvane's Armoury | armorer | industrial |  | 3 | 5 | 3 | 5 | 4 | 4 | 3 | 4 | 5 | 5 | 81.2 | no |
| 77 | Judicial Forces Depot 314 | guard_barracks | industrial | security_station | 5 | 5 | 5 | 5 | 4 | 4 | 5 | 4 | 5 | 5 | 94 | yes |
| 78 | Dresh Haulage | depot | industrial | cargo_terminal | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 79 | The Works Station | transit_station | industrial | transit_interchange | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 80 | Bass Level 710 | night_club | entertainment | cantina_club | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 81 | Ulvann's Cantina | cantina | entertainment | cantina_club | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 82 | Undercity Exchange 988 | pawn | entertainment |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 83 | Uscru Meat Market 291 | butcher | entertainment |  | 2 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 83.6 | no |
| 84 | Quorr Outfitters | tailor | entertainment |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 4 | 85.2 | yes |
| 85 | Dockside Cargo 481 | depot | industrial | cargo_terminal | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 86 | Lower Level Noodles | noodle_bar | industrial | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 87 | Kuat Service Bay 777 | repair_shop | industrial | repair_hangar | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 88 | Circuit Row 115 | electronics | industrial |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 89 | Chancellery Guard Quarters | guard_barracks | industrial | security_station | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 90 | Mid Rim Foundry | foundry | industrial | utility_plant | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 91 | Westport Customs House | customs | market | passenger_terminal | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 92 | Ghavic-Orlann Starship Showroom 472 | ship_dealer | market |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 4 | 81.2 | no |
| 93 | Zabrin Towers | apartments | market | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 94 | The Kyber Case | jeweler | market |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 95 | Mandalorian Ironworks Outlet | armorer | market |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 96 | Datacron & Dust 294 | bookshop | market |  | 3 | 5 | 3 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 79.6 | no |
| 97 | Uscru Holo-Theatre | holo_theatre | entertainment | opera_house | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 98 | Sorvann Outfitters | tailor | entertainment |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 99 | Uscru Air Taxi | taxi_stand | entertainment | transit_interchange | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 100 | Club Corvane | night_club | entertainment | cantina_club | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 101 | Gallery Vyre | art_gallery | entertainment |  | 3 | 5 | 4 | 5 | 4 | 4 | 3 | 4 | 5 | 5 | 83.6 | no |
| 102 | Kyber Foundry | foundry | industrial | utility_plant | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 103 | Coruscant Security — Precinct 787 | security_station | industrial | security_station | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 104 | Droid Works 889 | droid_shop | industrial | droid_workshop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 105 | Level 2335 Interchange | transit_station | industrial | transit_interchange | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 106 | Kuat Service Bay 560 | repair_shop | industrial | repair_hangar | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 107 | Bellith Furnishings | furniture_store | market |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 108 | Holo-Arcade 784 | holo_arcade | entertainment |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 109 | Soundstage 135 | holo_studio | entertainment |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 110 | Gallery Palluk | art_gallery | entertainment |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 111 | The Slider Bar | diner | entertainment | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 112 | Quorr Security Contractors | private_security | entertainment |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 113 | Ionic Freight Depot | depot | industrial | cargo_terminal | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 114 | Juvo's Armoury | armorer | industrial |  | 3 | 5 | 4 | 5 | 4 | 4 | 3 | 4 | 5 | 5 | 83.6 | no |
| 115 | Yellow Fin Cabs 900 | taxi_stand | industrial | transit_interchange | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 116 | Motivator Line 461 | droid_factory | industrial | droid_workshop | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 117 | Tibanna Processing 102 | refinery | industrial | utility_plant | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 118 | Nerf Steaks 502 | diner | industrial | diner | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 119 | Salvage Yard 703 | recycling_plant | industrial | salvage_yard | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 120 | Verpine Droid Assembly 556 | droid_factory | industrial | droid_workshop | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 121 | Yavelle Freight Depot | depot | industrial | cargo_terminal | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 94 | yes |
| 122 | Mattock Flight Services | hangar | industrial | repair_hangar | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 123 | Open Market 288 | market_stall | market | market_arcade | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 124 | The Sleep Pod Store | furniture_store | market |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 4 | 85.2 | yes |
| 125 | Agri-Corp Outlet 172 | grocery | market |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 4 | 85.2 | yes |
| 126 | Mattock Outfitters | tailor | market |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 127 | The Dathen Playhouse | holo_theatre | entertainment | opera_house | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 128 | Steam Gardens 477 | bathhouse | entertainment |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 129 | Uscru Fine Arts | art_gallery | entertainment |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 130 | Blue Dagger Lounge | cantina | entertainment | cantina_club | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 131 | Holo-Arcade 334 | holo_arcade | entertainment |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 132 | Starlight Cinema 157 | holo_theatre | entertainment | opera_house | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 133 | The Dresh Spire | luxury_residences | financial | affluent_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 134 | College of Xenolinguistics | university | financial |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 135 | Tarrek & Pravik Consultants | office | financial |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 136 | Soundstage 183 | holo_studio | financial |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 137 | The Garrick Spire | luxury_residences | financial | affluent_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 138 | Skarris Group | office | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 139 | The Kaelor Spire | luxury_residences | financial | affluent_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 140 | Federal District Mutual Assurance | insurance | financial |  | 2 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 75.2 | no |
| 141 | Outer Rim Imports 217 | trade_house | financial |  | 3 | 5 | 4 | 5 | 5 | 3 | 3 | 4 | 5 | 5 | 84 | no |
| 142 | Estrik Legal | law_office | financial |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 4 | 76.8 | no |
| 143 | Outer Rim Imports 729 | trade_house | financial | criminal_front | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 4 | 95.2 | yes |
| 144 | Brannick Components Outlet | electronics | financial |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 145 | Senate District District Court | courthouse | senate |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 146 | CSF Garrison Senate District | guard_barracks | senate | security_station | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 147 | Level 5603 Primary | school | residential |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 148 | Renn Towers | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 149 | Skyline Station | transit_station | residential | transit_interchange | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 150 | Skyline Grill | diner | residential | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 151 | Skyline Heights | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 152 | Skyline Greenhouse Supply | garden_shop | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 153 | Dock Row Hostel 885 | hostel | residential |  | 3 | 5 | 4 | 5 | 4 | 2 | 3 | 4 | 5 | 5 | 79.6 | no |
| 154 | Pell's Garden Shop | garden_shop | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 155 | Skyline Habitat 5755 | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 156 | Level 8673 Primary | school | residential |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 157 | Gravwell Components Outlet | electronics | financial |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 158 | Kresh Hull & Cargo Insurance | insurance | financial |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 159 | Core Banking Guild — Federal District Branch | bank | financial |  | 3 | 5 | 4 | 5 | 5 | 3 | 3 | 4 | 5 | 5 | 84 | no |
| 160 | Outer Rim Imports 159 | trade_house | financial |  | 3 | 5 | 4 | 5 | 5 | 3 | 3 | 4 | 5 | 4 | 83.2 | no |
| 161 | Tesrin Datawork | tech_firm | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 162 | Renn, Wroth & Associates | law_office | financial |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 4 | 76.8 | no |
| 163 | Zhorrin & Dosk Consultants | office | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 164 | Bank of Federal District | bank | financial |  | 3 | 5 | 4 | 5 | 5 | 3 | 3 | 4 | 5 | 5 | 84 | no |
| 165 | Renn & Othus Consultants | office | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 166 | The Wessik Spire | luxury_residences | financial | affluent_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 167 | Talvek Datawork | tech_firm | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 168 | Zabrin Hull & Cargo Insurance | insurance | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 169 | Aurodium Systems Annex | office | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 4 | 79.2 | no |
| 170 | Iron Nerf Gym | gym | financial |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 171 | Rescue Company 850 | fire_station | residential |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 172 | Teo's Bakery | bakery | residential |  | 3 | 5 | 3 | 5 | 4 | 4 | 3 | 4 | 5 | 5 | 81.2 | no |
| 173 | Mox's Diner | diner | residential | diner | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 94.8 | yes |
| 174 | Blue Milk Bakehouse 921 | bakery | residential |  | 3 | 5 | 4 | 5 | 4 | 4 | 3 | 4 | 5 | 5 | 83.6 | no |
| 175 | Skyline Clinic | clinic | residential | clinic | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 176 | The Honest Cleaver | butcher | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 177 | Juvo Outfitters | tailor | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 178 | Jorak Airspeeder Hire | taxi_stand | residential | transit_interchange | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 179 | Block 2762 Habitats | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 180 | Tuvann & Dresh Consultants | office | financial |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 181 | The Cotta Spire | luxury_residences | financial | affluent_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 182 | Ulmer Dynamics | tech_firm | financial |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 183 | Zabrin Trust | bank | financial |  | 3 | 5 | 4 | 5 | 5 | 3 | 3 | 4 | 5 | 5 | 84 | no |
| 184 | The Federal District Bean | caf | financial | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 185 | Thessik Executive Residences | luxury_residences | financial | affluent_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 186 | Chandrilan Credit Union | bank | financial |  | 3 | 5 | 4 | 5 | 5 | 3 | 3 | 4 | 5 | 5 | 84 | no |
| 187 | Noodle Bar 989 | noodle_bar | financial | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 188 | Perrit's Holobooks | bookshop | financial |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 189 | Ollum Hull & Cargo Insurance | insurance | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 190 | Outer Rim Imports 260 | trade_house | financial |  | 3 | 5 | 4 | 5 | 5 | 3 | 3 | 4 | 5 | 5 | 84 | no |
| 191 | Thessik Group | office | financial |  | 2 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 75.2 | no |
| 192 | Holo-Core Labs 666 | tech_firm | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 193 | Quillan Components Outlet | electronics | financial |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 194 | Galactic Indemnity 575 | insurance | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 195 | Speeder Registry 601 | licensing_office | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 196 | Block 4272 Habitats | apartments | financial | worker_apartments | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 197 | Rimward Datawork | tech_firm | financial |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 198 | Orsk-Dathen Holdings | office | senate |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 199 | Hall of Records 197 | archive | senate |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 200 | Office of Senator Quenn | ministry | senate | delegation_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 201 | Maldrin Towers | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 202 | Skyline Pharma | pharmacy | residential |  | 3 | 4 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 78.4 | no |
| 203 | Skydock 597 | parking_garage | residential |  | 3 | 5 | 4 | 5 | 4 | 2 | 3 | 4 | 5 | 4 | 78.8 | no |
| 204 | Skyline Habitat 6259 | apartments | residential | worker_apartments | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 94.8 | yes |
| 205 | Fresh Rations 204 | grocery | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 206 | Everything Emporium 719 | general_store | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 207 | Xel's Caf | caf | residential | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 208 | Grand Holovid 871 | holo_theatre | residential | opera_house | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 209 | Dosk's Produce | grocery | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 210 | Block 8571 Habitats | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 211 | Skyline Books | bookshop | residential |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 212 | Kresh Institute of Technology | university | financial |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 213 | Federal District Fitness | gym | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 214 | Corvane Systems Annex | office | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 215 | The Federal District Dispatch | holonet_office | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 216 | Maldrin & Partners Advertising | advertising_agency | financial |  | 3 | 5 | 4 | 5 | 4 | 2 | 3 | 4 | 5 | 4 | 78.8 | no |
| 217 | Federal District Residences 1458 | apartments | financial | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 218 | Federal District Commodities House | trade_house | financial |  | 3 | 5 | 4 | 5 | 5 | 3 | 3 | 4 | 5 | 5 | 84 | no |
| 219 | Corellian Credit Union | bank | financial |  | 3 | 5 | 4 | 5 | 5 | 3 | 3 | 4 | 5 | 5 | 84 | no |
| 220 | Kelvane Caf & Pastry | caf | financial | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 221 | Brea's Caf | caf | senate | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 222 | Office of Senator Ghavic | ministry | senate | delegation_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 223 | Speeder Registry 355 | licensing_office | senate |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 224 | Wyllan & Corvane Consultants | office | senate |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 225 | Falkren, Corvane & Associates | law_office | senate |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 226 | Chandrilan Mission | embassy | senate | delegation_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 227 | Judiciary Annex 675 | courthouse | senate |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 228 | Republic Records Office 985 | licensing_office | senate |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 4 | 79.2 | no |
| 229 | CSF Station Senate District | security_station | senate | security_station | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 230 | Ryloth Delegation House | embassy | senate | delegation_office | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 231 | Ionne & Vantrell Consultants | office | senate |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 232 | Chez Ollum | restaurant | senate |  | 3 | 5 | 4 | 5 | 4 | 4 | 3 | 4 | 5 | 5 | 83.6 | no |
| 233 | Cold Cuts 858 | butcher | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 4 | 85.2 | yes |
| 234 | Night Chemist 594 | pharmacy | residential |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 235 | Zhorrin Preparatory | school | residential |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 236 | Skyline Residences 9777 | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 237 | Neuro-Link Surgical | cybernetics_clinic | residential | clinic | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 238 | Starlight Cinema 384 | holo_theatre | residential | opera_house | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 239 | Skyline Residences 3318 | apartments | residential | worker_apartments | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 240 | Roots & Shoots 580 | garden_shop | residential |  | 3 | 4 | 4 | 5 | 4 | 4 | 3 | 4 | 5 | 5 | 80 | no |
| 241 | Skyline Academy | school | residential |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 242 | Skyline Interiors 562 | furniture_store | residential |  | 2 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 83.6 | no |
| 243 | Belsar Caf & Pastry | caf | residential | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 244 | Yara's Diner | diner | residential | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 245 | Agri-Corp Outlet 379 | grocery | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 246 | Sorrel Towers | apartments | residential | worker_apartments | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 94.8 | yes |
| 247 | Renn Hull & Cargo Insurance | insurance | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 248 | Chambers of Belsar | law_office | financial |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 249 | Kelvane Group | office | financial |  | 2 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 75.2 | no |
| 250 | The Estrik Collection | museum | financial |  | 3 | 5 | 4 | 5 | 4 | 2 | 3 | 4 | 5 | 5 | 79.6 | no |
| 251 | Xanne & Renn Consultants | office | financial |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 252 | Vantrell Broadcast | holonet_office | financial |  | 3 | 4 | 4 | 5 | 4 | 1 | 3 | 3 | 5 | 5 | 72.4 | no |
| 253 | Cadrin Holo-Electronics | electronics | financial |  | 2 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 83.6 | no |
| 254 | Federal District Tariff Bureau | tax_office | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 255 | Kuati Systems Annex | office | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 256 | Needle & Thread 286 | tailor | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 257 | Jode's Diner | diner | residential | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 258 | Ezzi's Broth House | noodle_bar | residential | diner | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 94.8 | yes |
| 259 | Vaddon's Produce | grocery | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 260 | Block 4022 Habitats | apartments | residential | worker_apartments | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 94.8 | yes |
| 261 | Onnar's Nerf & Bantha | butcher | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 262 | Level 3191 Interchange | transit_station | residential | transit_interchange | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 263 | The Flatbread Stand | bakery | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 264 | Skyline Habitat 4724 | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 265 | Bralen General Supply | general_store | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 266 | Level 4547 Interchange | transit_station | residential | transit_interchange | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 267 | Skyline Grocer 816 | grocery | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 268 | Level 4522 Walk-In Clinic | clinic | residential | clinic | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 94.8 | yes |
| 269 | Order of the Silent Sun | order_house | residential | community_hall | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 270 | Spacers' Rest 132 | hostel | residential |  | 3 | 4 | 3 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 76 | no |
| 271 | Skyline Ovens | bakery | residential |  | 3 | 4 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 82.4 | no |
| 272 | Tank Ward 197 | bacta_ward | residential | clinic | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 273 | Chapel of the Skyline Stars | shrine | residential |  | 3 | 4 | 4 | 5 | 4 | 2 | 3 | 4 | 5 | 5 | 76 | no |
| 274 | Skyline Residences 2660 | apartments | residential | worker_apartments | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 275 | Vint's Bakery | bakery | residential |  | 3 | 5 | 3 | 5 | 4 | 4 | 3 | 4 | 5 | 5 | 81.2 | no |
| 276 | Galactic Indemnity 482 | insurance | financial |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 277 | Sethric Towers | apartments | financial | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 278 | Republica Annex 242 | luxury_residences | financial | affluent_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 279 | Talvek Underwriters | insurance | financial |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 280 | Everything Emporium 142 | general_store | residential |  | 3 | 4 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 82.4 | no |
| 281 | Quillan Towers | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 282 | Agri-Corp Outlet 599 | grocery | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 283 | Brotherhood of Ionne | order_house | residential | community_hall | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 284 | Skydock 997 | parking_garage | residential |  | 3 | 5 | 4 | 5 | 4 | 2 | 3 | 4 | 5 | 5 | 79.6 | no |
| 285 | Caf Corner 411 | caf | residential | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 286 | Skyline Residences 5226 | apartments | residential | worker_apartments | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 287 | Cold Cuts 148 | butcher | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 288 | Orrin's Broth House | noodle_bar | residential | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 289 | Skyline Habitat 8144 | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 290 | Kettrick Parking | parking_garage | residential |  | 3 | 5 | 4 | 5 | 4 | 2 | 3 | 4 | 5 | 5 | 79.6 | no |
| 291 | Falkren General Supply | general_store | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 292 | Kip's Bakery | bakery | residential |  | 3 | 5 | 4 | 5 | 4 | 4 | 3 | 4 | 5 | 5 | 83.6 | no |
| 293 | Talvek Towers | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 294 | The Quiet Room | shrine | residential |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 295 | Nerf Steaks 507 | diner | residential | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 296 | Cotta Group | office | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 297 | Holo-Core Labs 887 | tech_firm | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 298 | Outer Rim Imports 200 | trade_house | financial |  | 3 | 5 | 4 | 5 | 5 | 3 | 3 | 4 | 5 | 4 | 83.2 | no |
| 299 | Federal District Heights | apartments | financial | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 300 | Marrov, Vokar & Associates | law_office | financial |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 301 | Hotel Skyhook 801 | hotel | financial |  | 2 | 4 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 76 | no |
| 302 | Federal District Holo-Ads 175 | advertising_agency | financial |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 303 | Aurodium Holdings | office | financial |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 304 | Maldrin's Holobooks | bookshop | financial |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 305 | Level 3037 Garage | parking_garage | financial |  | 3 | 5 | 4 | 5 | 4 | 2 | 3 | 4 | 5 | 5 | 79.6 | no |
| 306 | Caf Corner 916 | caf | financial | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 307 | Starlight Cinema 926 | holo_theatre | residential | opera_house | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 308 | Skyline Habitat 1227 | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 309 | Hollis's Garden Shop | garden_shop | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 310 | Skyline Home & Habitat | furniture_store | residential |  | 2 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 83.6 | no |
| 311 | Republic Athletic 311 | gym | residential |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 312 | Sector 264 Patrol House | security_station | residential | security_station | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 313 | Monastery of the Skyline Wind | order_house | residential | community_hall | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 314 | Zell General Supply | general_store | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 315 | Federal District Residences 4522 | apartments | financial | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 316 | Quillan Credit Union | bank | financial |  | 3 | 5 | 4 | 5 | 5 | 3 | 3 | 4 | 5 | 5 | 84 | no |
| 317 | The Cadrin Collection | museum | financial |  | 3 | 5 | 4 | 5 | 4 | 2 | 3 | 4 | 5 | 5 | 79.6 | no |
| 318 | Federal District Penthouses | luxury_residences | financial | affluent_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 319 | The Federal District Grand | hotel | financial |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 320 | Galactic Indemnity 473 | insurance | financial |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 321 | Corellian Suites | hotel | financial |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 322 | Corvane Underwriters | insurance | financial |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 4 | 76.8 | no |
| 323 | Osmer Institute of Technology | university | financial |  | 3 | 4 | 4 | 5 | 4 | 2 | 3 | 4 | 5 | 5 | 76 | no |
| 324 | Caf Corner 456 | caf | financial | diner | 5 | 4 | 4 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 92.4 | yes |
| 325 | Outer Rim Credit Union | bank | financial |  | 3 | 5 | 4 | 5 | 5 | 3 | 3 | 4 | 5 | 5 | 84 | no |
| 326 | Republic Records Office 789 | licensing_office | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 327 | Glow & Signal 876 | electronics | financial |  | 2 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 83.6 | no |
| 328 | Sullustan Datawork | tech_firm | financial |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 329 | Perrit, Hessik & Associates | law_office | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 330 | Vaddon Group | office | financial |  | 3 | 4 | 3 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 71.6 | no |
| 331 | Coruscant Fire Brigade — Skyline | fire_station | residential |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 332 | Skydock 563 | parking_garage | residential |  | 3 | 5 | 4 | 5 | 4 | 2 | 3 | 4 | 5 | 5 | 79.6 | no |
| 333 | Block 6334 Habitats | apartments | residential | worker_apartments | 5 | 4 | 4 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 92.4 | yes |
| 334 | Level 4747 Walk-In Clinic | clinic | residential | clinic | 5 | 4 | 4 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 92.4 | yes |
| 335 | Block 6407 Habitats | apartments | residential | worker_apartments | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 336 | Skyline Fine Arts | art_gallery | residential |  | 3 | 5 | 4 | 5 | 4 | 4 | 3 | 4 | 5 | 5 | 83.6 | no |
| 337 | Vint's Caf | caf | residential | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 338 | Corrin Training Hall | gym | residential |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 339 | Skyline Grocer 283 | grocery | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 340 | Borvik's Nerf & Bantha | butcher | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 341 | Kwikmart 456 | general_store | residential |  | 3 | 4 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 82.4 | no |
| 342 | Borvik Towers | apartments | residential | worker_apartments | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 94.8 | yes |
| 343 | Lorn's Bakery | bakery | residential |  | 3 | 5 | 4 | 5 | 4 | 4 | 3 | 4 | 5 | 5 | 83.6 | no |
| 344 | New Limb Clinic 325 | cybernetics_clinic | residential | clinic | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 345 | Lannick & Dresh Consultants | office | financial |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 346 | Coaxium Datawork | tech_firm | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 347 | Ironclad Escorts 560 | private_security | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 348 | Slogan Works | advertising_agency | financial |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 4 | 81.2 | no |
| 349 | Blue Screen Pictures | holo_studio | financial |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 350 | Hasque Legal | law_office | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 351 | Republica Annex 898 | luxury_residences | financial | affluent_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 352 | Hotel Jesk | hotel | financial |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 353 | Belsar Hull & Cargo Insurance | insurance | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 354 | Hydian Holdings | office | financial |  | 3 | 5 | 3 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 355 | Ionic Credit Union | bank | financial |  | 3 | 4 | 4 | 5 | 5 | 3 | 3 | 4 | 5 | 5 | 80.4 | no |
| 356 | Manarai Terrace | restaurant | financial |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 357 | Kresh & Brannick Consultants | office | financial |  | 2 | 4 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 71.6 | no |
| 358 | Kallow Training Hall | gym | financial |  | 3 | 4 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 76.4 | no |
| 359 | Yavelle Holdings | office | financial |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 360 | Republic Records Office 304 | licensing_office | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 361 | Jawa Juice 897 | caf | financial | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 362 | Noodle Bar 925 | noodle_bar | financial | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 363 | Ironclad Escorts 466 | private_security | financial |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 364 | Galactic Indemnity 937 | insurance | financial |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 365 | Jesk Holo-Productions | holo_studio | financial |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 366 | University of Federal District — Faculty 497 | university | financial |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 367 | Jawa Juice 724 | caf | residential | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 368 | Skyline Air Taxi | taxi_stand | residential | transit_interchange | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 369 | Skyline Interiors 258 | furniture_store | residential |  | 3 | 4 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 82.4 | no |
| 370 | Skyline Grocer 202 | grocery | residential |  | 3 | 4 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 82.4 | no |
| 371 | Skyline Bacta Ward | bacta_ward | residential | clinic | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 372 | Block 2585 Habitats | apartments | residential | worker_apartments | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 373 | Sector 141 Patrol House | security_station | residential | security_station | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 94 | yes |
| 374 | Yellow Fin Cabs 494 | taxi_stand | residential | transit_interchange | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 375 | Hasque Preparatory | school | residential |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 376 | Caf Corner 846 | caf | residential | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 377 | Skyline Residences 1604 | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 378 | Durasteel Direct 515 | hardware_store | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 379 | Starlight Cinema 657 | holo_theatre | residential | opera_house | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 380 | Datacron & Dust 663 | bookshop | residential |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 381 | Bacta & Sundries | pharmacy | residential |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 382 | Needle & Thread 872 | tailor | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 383 | Ovo's Bakery | bakery | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 384 | CSF Station Skyline | security_station | residential | security_station | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 96.4 | yes |
| 385 | Skyline Interiors 795 | furniture_store | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 386 | Corvane Hardware | hardware_store | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 387 | Fire Suppression Station 231 | fire_station | residential |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 388 | Zhorrin Towers | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 389 | The Merret Spire | luxury_residences | financial | affluent_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 390 | Hyperlane Holdings | office | financial |  | 3 | 4 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 74 | no |
| 391 | Grek Legal | law_office | financial |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 392 | Circuit Row 383 | electronics | financial |  | 2 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 83.6 | no |
| 393 | Bounty Board — Federal District Guild Hall | private_security | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 394 | Corellian Holdings | office | financial |  | 2 | 4 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 71.6 | no |
| 395 | Galactic Indemnity 321 | insurance | financial |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 396 | Drev Dynamics | tech_firm | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 397 | Skyline Dining Room 399 | restaurant | financial |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 398 | Outer Rim Underwriters | insurance | financial |  | 2 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 75.2 | no |
| 399 | Republica Annex 901 | luxury_residences | financial | affluent_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 400 | Orlann Trust | bank | financial |  | 3 | 5 | 4 | 5 | 5 | 3 | 3 | 4 | 5 | 5 | 84 | no |
| 401 | Ardo & Quillan Consultants | office | financial |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 402 | Hotel Orlann | hotel | financial |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 403 | Tashaan Trading Company | trade_house | financial |  | 3 | 5 | 4 | 5 | 5 | 3 | 3 | 4 | 5 | 5 | 84 | no |
| 404 | Jesk Institute of Technology | university | financial |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 405 | Hotel Ionne | hotel | financial |  | 2 | 4 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 76 | no |
| 406 | Ironclad Escorts 201 | private_security | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 407 | Cadrin Trust | bank | financial |  | 3 | 5 | 4 | 5 | 5 | 3 | 3 | 4 | 5 | 5 | 84 | no |
| 408 | Federal District Cybernetics Software | tech_firm | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 409 | Corvane Mercantile Exchange | trade_house | financial |  | 3 | 5 | 4 | 5 | 5 | 3 | 3 | 4 | 5 | 5 | 84 | no |
| 410 | Repulsor Executive Residences | luxury_residences | financial | affluent_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 411 | Kelvane Dynamics | tech_firm | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 412 | Bespin Systems Annex | office | financial |  | 3 | 5 | 4 | 5 | 4 | 1 | 3 | 4 | 5 | 5 | 77.6 | no |
| 413 | Federal District Books | bookshop | financial |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 414 | Bureau of Ships and Services — Office 702 | licensing_office | financial |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 415 | Hotel Sunder | hotel | financial |  | 3 | 5 | 4 | 5 | 4 | 2 | 3 | 4 | 5 | 5 | 79.6 | no |
| 416 | The Yendt Spire | luxury_residences | financial | affluent_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 417 | Kelvane Trust | bank | financial |  | 3 | 5 | 4 | 5 | 5 | 3 | 3 | 4 | 5 | 5 | 84 | no |
| 418 | Dr Jesk — Family Medicine | clinic | residential | clinic | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 419 | Block 5530 Habitats | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 420 | Republic School 196 | school | residential |  | 3 | 5 | 4 | 5 | 5 | 1 | 3 | 4 | 5 | 5 | 80 | no |
| 421 | Halvor General Supply | general_store | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 422 | Level 2460 Walk-In Clinic | clinic | residential | clinic | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 423 | Skyline Residences 7463 | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 97.6 | yes |
| 424 | The Skyline Bean | caf | residential | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 425 | Vaddon Prosthetics | cybernetics_clinic | residential | clinic | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 426 | Studio 665 Exhibitions | art_gallery | residential |  | 3 | 5 | 4 | 5 | 4 | 4 | 3 | 4 | 5 | 5 | 83.6 | no |
| 427 | Cold Cuts 940 | butcher | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 428 | Skyline Habitat 2435 | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 429 | Ezzi's Diner | diner | residential | diner | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 430 | Ardo Furnishings | furniture_store | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 4 | 85.2 | yes |
| 431 | Galactic Goods 905 | general_store | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 432 | Wayfarers’ Shrine 974 | shrine | residential |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 433 | Prethen Towers | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
| 434 | Blue Milk Bakehouse 616 | bakery | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 435 | Gallery Renn | art_gallery | residential |  | 3 | 4 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 82.4 | no |
| 436 | Skyline Grocer 581 | grocery | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 437 | Everything Emporium 101 | general_store | residential |  | 3 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 86 | yes |
| 438 | Skyline Holo-Theatre | holo_theatre | residential | opera_house | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 96 | yes |
| 439 | The Paper Archive | bookshop | residential |  | 3 | 5 | 4 | 5 | 5 | 2 | 3 | 4 | 5 | 5 | 82 | no |
| 440 | Block 7765 Habitats | apartments | residential | worker_apartments | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 98.4 | yes |
