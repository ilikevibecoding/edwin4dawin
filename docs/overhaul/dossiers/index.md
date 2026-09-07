# Building dossiers

433 dossiers, one per manifested playable building (seed 1337), written by `scripts/dossiers.mjs` from the blueprint profile, the program record, the similarity report and the rubric score. Regenerate with `node scripts/dossiers.mjs`; `--check` verifies the files on disk are current.

| District | Buildings | Programs | Mean score |
|---|---:|---:|---:|
| residential | 149 | 15 | 97.4 |
| financial | 147 | 15 | 96.7 |
| industrial | 59 | 11 | 97.5 |
| entertainment | 47 | 12 | 98.2 |
| senate | 18 | 6 | 96.3 |
| market | 13 | 5 | 98.1 |

| Lot | Name | Purpose | District | Program | Owner | Floors | Rooms | Nearest sibling | Score |
|---:|---|---|---|---|---|---:|---:|---|---:|
| 0 | [Galactic Senate](0.md) | ministry | senate | senate | Nalo Pelltak | 5 | 47 | [lot 8](8.md), 7/7 axes | 92.8 |
| 1 | [Jedi Temple](1.md) | temple_annex | financial | jedi_temple | Teyuna Menddar | 31 | 182 | only one of its kind | 96.4 |
| 2 | [Monument Plaza](2.md) | museum | financial | gallery | Falyn Wexwan | 3 | 19 | [lot 250](250.md), 7/7 axes | 91.2 |
| 3 | [Uscru undercity strip](3.md) | cantina | entertainment | cantina_club | Greel Davvos | 4 | 46 | [lot 39](39.md), 7/7 axes | 97.6 |
| 4 | [The Works foundry](4.md) | foundry | industrial | utility_plant | Brenon Essfell | 8 | 103 | [lot 102](102.md), 7/7 axes | 98.4 |
| 5 | [CoCo Town market halls](5.md) | market_stall | market | market_arcade | Lunik Narrsol | 2 | 54 | [lot 123](123.md), 7/7 axes | 98.4 |
| 6 | [Galaxies Opera House](6.md) | holo_theatre | entertainment | opera_house | Polum Zellulo | 11 | 148 | [lot 438](438.md), 7/7 axes | 98.4 |
| 7 | [500 Republica](7.md) | luxury_residences | residential | affluent_apartments | Teyala Mendiss | 38 | 675 | [lot 185](185.md), 6/7 axes | 98.4 |
| 8 | [Senate Office Building](8.md) | ministry | market | delegation_office | Yelara Brennkar | 23 | 417 | [lot 200](200.md), 7/7 axes | 96.4 |
| 9 | [Grand Republic Medical Facility](9.md) | clinic | residential | clinic | Norya Pelldar | 22 | 346 | [lot 175](175.md), 7/7 axes | 98.4 |
| 10 | [Republic Judiciary Central Detention Center](10.md) | security_station | industrial | security_station | Jorith Yavlor | 13 | 682 | [lot 35](35.md), 7/7 axes | 92 |
| 11 | [HoloNet broadcast tower](11.md) | holonet_office | financial | broadcast_studio | Ornus Rellison | 31 | 453 | [lot 215](215.md), 7/7 axes | 96.4 |
| 20 | [Kuat Service Bay 490](20.md) | repair_shop | industrial | repair_hangar | Tamac Vandison | 9 | 51 | [lot 87](87.md), 6/7 axes | 98.4 |
| 21 | [Bespin Power Authority](21.md) | power_plant | industrial | utility_plant | Vexax Corrbex | 13 | 64 | only one of its kind | 96.4 |
| 22 | [Drev Airspeeder Hire](22.md) | taxi_stand | industrial | transit_interchange | Paxos Prenkar | 10 | 63 | [lot 115](115.md), 5/7 axes | 98.4 |
| 23 | [The Works — Line 730](23.md) | foundry | industrial | utility_plant | Zorir Lorrulo | 7 | 67 | [lot 90](90.md), 5/7 axes | 98.4 |
| 24 | [The Works Building Supply](24.md) | hardware_store | industrial | retail_shop | Polos Pellulo | 14 | 77 | [lot 378](378.md), 7/7 axes | 98.4 |
| 25 | [Droid Works 883](25.md) | droid_shop | industrial | droid_workshop | Talis Lorrnar | 14 | 67 | [lot 72](72.md), 6/7 axes | 98.4 |
| 26 | [The Works Grill](26.md) | diner | industrial | diner | Toro Nermir | 7 | 32 | [lot 118](118.md), 4/7 axes | 96 |
| 27 | [Nalto Executive Aviation](27.md) | hangar | industrial | repair_hangar | Jaxyn Mendmir | 7 | 32 | [lot 122](122.md), 7/7 axes | 98.4 |
| 28 | [Bellith Haulage](28.md) | depot | industrial | cargo_terminal | Lununa Lomulo | 14 | 56 | [lot 53](53.md), 6/7 axes | 96 |
| 29 | [Motivator Line 633](29.md) | droid_factory | industrial | droid_workshop | Coriri Yavstro | 15 | 72 | [lot 63](63.md), 6/7 axes | 96 |
| 30 | [Hyperlane Terminus](30.md) | transit_station | industrial | transit_interchange | Greyn Nermir | 7 | 28 | [lot 105](105.md), 6/7 axes | 94.8 |
| 31 | [Garrick's Droid Depot](31.md) | droid_shop | industrial | droid_workshop | Anior Lomdar | 7 | 38 | [lot 25](25.md), 7/7 axes | 98.4 |
| 32 | [Kip's Broth House](32.md) | noodle_bar | industrial | diner | Ryliri Drenbane | 11 | 51 | [lot 187](187.md), 6/7 axes | 98.4 |
| 33 | [Korrid Bulk Goods](33.md) | warehouse | industrial | cargo_terminal | Nyxani Narrbane | 13 | 62 | [lot 75](75.md), 7/7 axes | 98.4 |
| 34 | [Glow & Signal 563](34.md) | electronics | industrial | retail_shop | Calin Tarnine | 7 | 39 | [lot 88](88.md), 6/7 axes | 98.4 |
| 35 | [CSF Station The Works](35.md) | security_station | industrial | security_station | Corar Ostnar | 11 | 70 | [lot 373](373.md), 5/7 axes | 96.4 |
| 36 | [Ostrander Components Outlet](36.md) | electronics | industrial | retail_shop | Holik Fennlor | 11 | 319 | [lot 34](34.md), 6/7 axes | 98.4 |
| 37 | [Tyvane Speeders](37.md) | speeder_dealer | entertainment | retail_shop | Mavin Davdol | 7 | 69 | only one of its kind | 98.4 |
| 38 | [Corrin Security Contractors](38.md) | private_security | entertainment | security_station | Sabus Ilkzan | 13 | 88 | [lot 112](112.md), 5/7 axes | 96.4 |
| 39 | [Corrin's Cantina](39.md) | cantina | entertainment | cantina_club | Zorir Ulrwick | 7 | 72 | [lot 81](81.md), 7/7 axes | 98.4 |
| 40 | [The Golden Wheel](40.md) | casino | entertainment | gaming_house | Nalek Zellquel | 18 | 120 | [lot 69](69.md), 7/7 axes | 98.4 |
| 41 | [Steam & Salt 545](41.md) | noodle_bar | entertainment | diner | Falan Wexdar | 7 | 60 | [lot 86](86.md), 6/7 axes | 98.4 |
| 42 | [Soundstage 385](42.md) | holo_studio | entertainment | broadcast_studio | Kylyn Haldar | 16 | 152 | [lot 365](365.md), 6/7 axes | 96.4 |
| 43 | [The Uscru Grand](43.md) | hotel | entertainment | hotel | Dexella Stelliss | 17 | 130 | [lot 301](301.md), 6/7 axes | 98.4 |
| 44 | [Sabacc Simulators 589](44.md) | holo_arcade | entertainment | gaming_house | Keleth Ulrvos | 18 | 77 | [lot 57](57.md), 6/7 axes | 98.4 |
| 45 | [Vertical City Nights](45.md) | night_club | entertainment | cantina_club | Boac Borfell | 20 | 72 | [lot 61](61.md), 6/7 axes | 98.4 |
| 46 | [Second Chance Goods](46.md) | pawn | entertainment | retail_shop | Maveth Cadkar | 19 | 85 | [lot 82](82.md), 7/7 axes | 98.4 |
| 47 | [Yorrel Sabacc Palace](47.md) | casino | entertainment | gaming_house | Mavara Ilkzan | 14 | 58 | [lot 40](40.md), 7/7 axes | 98.4 |
| 48 | [Cold Cuts 546](48.md) | butcher | entertainment | retail_shop | Talya Ostbane | 13 | 230 | [lot 233](233.md), 6/7 axes | 98.4 |
| 49 | [Bralen's Ship Repair](49.md) | repair_shop | industrial | repair_hangar | Anio Pellash | 15 | 192 | [lot 20](20.md), 6/7 axes | 98.4 |
| 50 | [Judicial Forces Depot 240](50.md) | guard_barracks | industrial | security_station | Quinani Davmont | 7 | 74 | [lot 89](89.md), 6/7 axes | 96.4 |
| 51 | [Salvage Yard 911](51.md) | recycling_plant | industrial | salvage_yard | Venen Pellova | 7 | 71 | [lot 119](119.md), 7/7 axes | 98.4 |
| 52 | [Judicial Forces Depot 341](52.md) | guard_barracks | industrial | security_station | Mekella Rellander | 10 | 94 | [lot 50](50.md), 6/7 axes | 96.4 |
| 53 | [Osmer Haulage](53.md) | depot | industrial | cargo_terminal | Uldine Ulrzan | 11 | 49 | [lot 28](28.md), 6/7 axes | 98.4 |
| 54 | [Junk Level Recycling](54.md) | recycling_plant | industrial | salvage_yard | Torel Cadkar | 13 | 54 | [lot 119](119.md), 6/7 axes | 98.4 |
| 55 | [The Works Coaxium Works](55.md) | refinery | industrial | utility_plant | Tala Lorrtak | 10 | 151 | [lot 117](117.md), 7/7 axes | 98.4 |
| 56 | [Undercity Exchange 672](56.md) | pawn | entertainment | retail_shop | Norine Menddol | 7 | 93 | [lot 82](82.md), 6/7 axes | 98.4 |
| 57 | [Sabacc Simulators 789](57.md) | holo_arcade | entertainment | gaming_house | Nalee Corrzan | 14 | 83 | [lot 71](71.md), 5/7 axes | 98.4 |
| 58 | [Bounty Board — Uscru Guild Hall](58.md) | private_security | entertainment | security_station | Miris Pellric | 17 | 139 | [lot 38](38.md), 6/7 axes | 96.4 |
| 59 | [Skylane Taxis 950](59.md) | taxi_stand | entertainment | transit_interchange | Boora Orline | 13 | 110 | [lot 65](65.md), 6/7 axes | 98.4 |
| 60 | [Sabacc Simulators 952](60.md) | holo_arcade | entertainment | gaming_house | Aniani Tharren | 9 | 85 | [lot 71](71.md), 6/7 axes | 98.4 |
| 61 | [The Glow Pit](61.md) | night_club | entertainment | cantina_club | Holae Corrsol | 13 | 120 | [lot 100](100.md), 6/7 axes | 98.4 |
| 62 | [Late Shift Diner](62.md) | diner | entertainment | diner | Korik Brenntel | 9 | 85 | [lot 150](150.md), 5/7 axes | 98.4 |
| 63 | [Chandrilan Droid Assembly 441](63.md) | droid_factory | industrial | droid_workshop | Ossara Yavison | 13 | 124 | [lot 29](29.md), 6/7 axes | 96 |
| 64 | [Starlane Interstellar](64.md) | office | industrial | criminal_front | Ornara Zellfell | 7 | 75 | [lot 198](198.md), 6/7 axes | 98.4 |
| 65 | [The Works Air Taxi](65.md) | taxi_stand | industrial | transit_interchange | Senek Corrsol | 7 | 104 | [lot 59](59.md), 6/7 axes | 98.4 |
| 66 | [The Works Bunkhouse](66.md) | hostel | industrial | hotel | Senus Essander | 14 | 256 | [lot 153](153.md), 7/7 axes | 98.4 |
| 67 | [Uscru Market Stalls 985](67.md) | market_stall | entertainment | market_arcade | Ornen Holmfell | 7 | 52 | [lot 123](123.md), 6/7 axes | 98.4 |
| 68 | [Hotel Skyhook 577](68.md) | hotel | entertainment | hotel | Harie Osttak | 10 | 69 | [lot 402](402.md), 6/7 axes | 98.4 |
| 69 | [House of Chance 300](69.md) | casino | entertainment | gaming_house | Rhous Halwick | 9 | 62 | [lot 40](40.md), 7/7 axes | 98.4 |
| 70 | [Steam Gardens 336](70.md) | bathhouse | entertainment | bath_gym | Yelor Tharzan | 14 | 88 | [lot 128](128.md), 7/7 axes | 98.4 |
| 71 | [Dejarik Den](71.md) | holo_arcade | entertainment | gaming_house | Boir Sarrlor | 11 | 75 | [lot 57](57.md), 5/7 axes | 98.4 |
| 72 | [Yorrel's Droid Depot](72.md) | droid_shop | industrial | droid_workshop | Talir Sarrfell | 14 | 78 | [lot 104](104.md), 6/7 axes | 98.4 |
| 73 | [Hangar 795 Maintenance](73.md) | repair_shop | industrial | repair_hangar | Greise Garrric | 7 | 18 | [lot 87](87.md), 7/7 axes | 94.8 |
| 74 | [Maldrin Outfitters](74.md) | armorer | industrial | retail_shop | Nalee Garrwan | 14 | 102 | [lot 114](114.md), 6/7 axes | 98.4 |
| 75 | [Vantrell Bulk Goods](75.md) | warehouse | industrial | cargo_terminal | Corise Yavlor | 7 | 38 | [lot 33](33.md), 7/7 axes | 98.4 |
| 76 | [Corvane's Armoury](76.md) | armorer | industrial | retail_shop | Kylyra Kestquel | 8 | 51 | [lot 95](95.md), 5/7 axes | 93.6 |
| 77 | [Judicial Forces Depot 314](77.md) | guard_barracks | industrial | security_station | Ossen Sarriss | 8 | 33 | [lot 52](52.md), 6/7 axes | 94 |
| 78 | [Dresh Haulage](78.md) | depot | industrial | cargo_terminal | Aniac Orlstro | 8 | 37 | [lot 53](53.md), 6/7 axes | 98.4 |
| 79 | [The Works Station](79.md) | transit_station | industrial | transit_interchange | Boath Quormont | 15 | 76 | [lot 30](30.md), 6/7 axes | 98.4 |
| 80 | [Bass Level 710](80.md) | night_club | entertainment | cantina_club | Vinuna Junek | 7 | 134 | [lot 100](100.md), 6/7 axes | 98.4 |
| 81 | [Ulvann's Cantina](81.md) | cantina | entertainment | cantina_club | Faliri Narrek | 11 | 93 | [lot 130](130.md), 5/7 axes | 98.4 |
| 82 | [Undercity Exchange 988](82.md) | pawn | entertainment | retail_shop | Elsala Morine | 11 | 90 | [lot 56](56.md), 6/7 axes | 98.4 |
| 83 | [Uscru Meat Market 291](83.md) | butcher | entertainment | retail_shop | Oriee Mendander | 10 | 84 | [lot 287](287.md), 5/7 axes | 98.4 |
| 84 | [Quorr Outfitters](84.md) | tailor | entertainment | retail_shop | Aniath Quorkar | 18 | 153 | [lot 382](382.md), 5/7 axes | 98.4 |
| 85 | [Dockside Cargo 481](85.md) | depot | industrial | cargo_terminal | Eriine Brenndar | 10 | 94 | [lot 121](121.md), 6/7 axes | 98.4 |
| 86 | [Lower Level Noodles](86.md) | noodle_bar | industrial | diner | Mekess Randlor | 7 | 100 | [lot 41](41.md), 6/7 axes | 98.4 |
| 87 | [Kuat Service Bay 777](87.md) | repair_shop | industrial | repair_hangar | Dexett Corrbex | 7 | 36 | [lot 106](106.md), 5/7 axes | 98.4 |
| 88 | [Circuit Row 115](88.md) | electronics | industrial | retail_shop | Tamara Lorrbane | 7 | 72 | [lot 327](327.md), 6/7 axes | 98.4 |
| 89 | [Chancellery Guard Quarters](89.md) | guard_barracks | industrial | security_station | Liren Brennren | 8 | 80 | [lot 50](50.md), 6/7 axes | 96.4 |
| 90 | [Mid Rim Foundry](90.md) | foundry | industrial | utility_plant | Corath Junulo | 13 | 114 | [lot 23](23.md), 5/7 axes | 98.4 |
| 91 | [Westport Customs House](91.md) | customs | market | passenger_terminal | Quinum Nervos | 7 | 134 | only one of its kind | 98.4 |
| 92 | [Ghavic-Orlann Starship Showroom 472](92.md) | ship_dealer | market | retail_shop | Venath Juntel | 6 | 62 | only one of its kind | 96.4 |
| 93 | [Zabrin Towers](93.md) | apartments | market | worker_apartments | Holum Sarrdol | 8 | 74 | [lot 315](315.md), 7/7 axes | 98.4 |
| 94 | [The Kyber Case](94.md) | jeweler | market | retail_shop | Joria Stellison | 6 | 88 | only one of its kind | 98.4 |
| 95 | [Mandalorian Ironworks Outlet](95.md) | armorer | market | retail_shop | Ithara Nerova | 7 | 43 | [lot 76](76.md), 5/7 axes | 98.4 |
| 96 | [Datacron & Dust 294](96.md) | bookshop | market | retail_shop | Luneth Sarrvos | 7 | 52 | [lot 304](304.md), 6/7 axes | 98.4 |
| 97 | [Uscru Holo-Theatre](97.md) | holo_theatre | entertainment | opera_house | Venek Pellbex | 11 | 67 | [lot 127](127.md), 6/7 axes | 98.4 |
| 98 | [Sorvann Outfitters](98.md) | tailor | entertainment | retail_shop | Senos Preniss | 13 | 89 | [lot 256](256.md), 5/7 axes | 98.4 |
| 99 | [Uscru Air Taxi](99.md) | taxi_stand | entertainment | transit_interchange | Mirin Lomtak | 13 | 76 | [lot 22](22.md), 6/7 axes | 98.4 |
| 100 | [Club Corvane](100.md) | night_club | entertainment | cantina_club | Mekya Orlsol | 15 | 119 | [lot 61](61.md), 6/7 axes | 98.4 |
| 101 | [Gallery Vyre](101.md) | art_gallery | entertainment | gallery | Kelor Vandiss | 14 | 97 | [lot 435](435.md), 5/7 axes | 98.4 |
| 102 | [Kyber Foundry](102.md) | foundry | industrial | utility_plant | Zoria Karrsol | 10 | 99 | [lot 90](90.md), 7/7 axes | 98.4 |
| 103 | [Coruscant Security — Precinct 787](103.md) | security_station | industrial | security_station | Xanir Pellric | 9 | 67 | [lot 35](35.md), 6/7 axes | 96.4 |
| 104 | [Droid Works 889](104.md) | droid_shop | industrial | droid_workshop | Eriia Antlor | 8 | 137 | [lot 72](72.md), 6/7 axes | 98.4 |
| 105 | [Level 2335 Interchange](105.md) | transit_station | industrial | transit_interchange | Silo Tarntel | 8 | 56 | [lot 30](30.md), 6/7 axes | 98.4 |
| 106 | [Kuat Service Bay 560](106.md) | repair_shop | industrial | repair_hangar | Ilous Corrmont | 9 | 68 | [lot 87](87.md), 5/7 axes | 98.4 |
| 107 | [Bellith Furnishings](107.md) | furniture_store | market | retail_shop | Ashin Rellstro | 7 | 93 | [lot 242](242.md), 6/7 axes | 98.4 |
| 108 | [Holo-Arcade 784](108.md) | holo_arcade | entertainment | gaming_house | Poliri Sarrkar | 13 | 131 | [lot 57](57.md), 6/7 axes | 98.4 |
| 109 | [Soundstage 135](109.md) | holo_studio | entertainment | broadcast_studio | Garine Drenine | 13 | 72 | [lot 349](349.md), 6/7 axes | 96.4 |
| 110 | [Gallery Palluk](110.md) | art_gallery | entertainment | gallery | Koro Ilktel | 11 | 67 | [lot 336](336.md), 5/7 axes | 98.4 |
| 111 | [The Slider Bar](111.md) | diner | entertainment | diner | Rhoa Ostander | 10 | 70 | [lot 429](429.md), 6/7 axes | 98.4 |
| 112 | [Quorr Security Contractors](112.md) | private_security | entertainment | security_station | Belon Lomash | 15 | 99 | [lot 38](38.md), 5/7 axes | 96.4 |
| 113 | [Ionic Freight Depot](113.md) | depot | industrial | cargo_terminal | Rylie Tharison | 9 | 91 | [lot 121](121.md), 5/7 axes | 98.4 |
| 114 | [Juvo's Armoury](114.md) | armorer | industrial | retail_shop | Senya Stellquel | 6 | 42 | [lot 76](76.md), 6/7 axes | 96 |
| 115 | [Yellow Fin Cabs 900](115.md) | taxi_stand | industrial | transit_interchange | Elsani Wexbane | 8 | 38 | [lot 22](22.md), 5/7 axes | 98.4 |
| 116 | [Motivator Line 461](116.md) | droid_factory | industrial | droid_workshop | Nalek Cadek | 8 | 67 | [lot 29](29.md), 6/7 axes | 98.4 |
| 117 | [Tibanna Processing 102](117.md) | refinery | industrial | utility_plant | Teyie Morkar | 8 | 54 | [lot 55](55.md), 7/7 axes | 98.4 |
| 118 | [Nerf Steaks 502](118.md) | diner | industrial | diner | Oriel Nerek | 8 | 45 | [lot 26](26.md), 4/7 axes | 96 |
| 119 | [Salvage Yard 703](119.md) | recycling_plant | industrial | salvage_yard | Noris Borbex | 8 | 45 | [lot 54](54.md), 6/7 axes | 98.4 |
| 120 | [Verpine Droid Assembly 556](120.md) | droid_factory | industrial | droid_workshop | Paxum Lorrulo | 8 | 66 | [lot 63](63.md), 7/7 axes | 96 |
| 121 | [Yavelle Freight Depot](121.md) | depot | industrial | cargo_terminal | Dexan Ulrash | 8 | 59 | [lot 113](113.md), 5/7 axes | 94.8 |
| 122 | [Mattock Flight Services](122.md) | hangar | industrial | repair_hangar | Dunis Thariss | 9 | 48 | [lot 27](27.md), 7/7 axes | 98.4 |
| 123 | [Open Market 288](123.md) | market_stall | market | market_arcade | Raliri Ostek | 6 | 42 | [lot 67](67.md), 6/7 axes | 98.4 |
| 124 | [The Sleep Pod Store](124.md) | furniture_store | market | retail_shop | Ossee Essiss | 6 | 45 | [lot 385](385.md), 6/7 axes | 98.4 |
| 125 | [Agri-Corp Outlet 172](125.md) | grocery | market | retail_shop | Siline Davine | 8 | 45 | [lot 245](245.md), 6/7 axes | 98.4 |
| 126 | [Mattock Outfitters](126.md) | tailor | market | retail_shop | Fenyra Brennsol | 7 | 32 | [lot 177](177.md), 6/7 axes | 98.4 |
| 127 | [The Dathen Playhouse](127.md) | holo_theatre | entertainment | opera_house | Jaxani Nerbex | 13 | 78 | [lot 97](97.md), 6/7 axes | 98.4 |
| 128 | [Steam Gardens 477](128.md) | bathhouse | entertainment | bath_gym | Greee Yavzan | 13 | 144 | [lot 70](70.md), 7/7 axes | 98.4 |
| 129 | [Uscru Fine Arts](129.md) | art_gallery | entertainment | gallery | Korett Ulrwan | 9 | 94 | [lot 435](435.md), 7/7 axes | 98.4 |
| 130 | [Blue Dagger Lounge](130.md) | cantina | entertainment | cantina_club | Eriara Borwan | 13 | 125 | [lot 81](81.md), 5/7 axes | 98.4 |
| 131 | [Holo-Arcade 334](131.md) | holo_arcade | entertainment | gaming_house | Vinett Nerren | 14 | 139 | [lot 108](108.md), 6/7 axes | 98.4 |
| 132 | [Starlight Cinema 157](132.md) | holo_theatre | entertainment | opera_house | Polik Wexquel | 13 | 197 | [lot 438](438.md), 5/7 axes | 98.4 |
| 133 | [The Dresh Spire](133.md) | luxury_residences | financial | affluent_apartments | Paxo Yavdar | 29 | 249 | [lot 137](137.md), 5/7 axes | 98.4 |
| 134 | [College of Xenolinguistics](134.md) | university | financial | school | Keless Prenven | 24 | 271 | [lot 212](212.md), 7/7 axes | 98.4 |
| 135 | [Tarrek & Pravik Consultants](135.md) | office | financial | corporate_office | Vinani Nerric | 30 | 157 | [lot 412](412.md), 5/7 axes | 96.4 |
| 136 | [Soundstage 183](136.md) | holo_studio | financial | broadcast_studio | Dexek Fennstro | 24 | 196 | [lot 109](109.md), 6/7 axes | 96.4 |
| 137 | [The Garrick Spire](137.md) | luxury_residences | financial | affluent_apartments | Mekath Fennsol | 30 | 237 | [lot 133](133.md), 5/7 axes | 98.4 |
| 138 | [Skarris Group](138.md) | office | financial | corporate_office | Zebar Yavren | 35 | 259 | [lot 163](163.md), 6/7 axes | 96.4 |
| 139 | [The Kaelor Spire](139.md) | luxury_residences | financial | affluent_apartments | Venath Drendol | 31 | 226 | [lot 389](389.md), 5/7 axes | 98.4 |
| 140 | [Federal District Mutual Assurance](140.md) | insurance | financial | corporate_office | Belos Ilkzan | 29 | 139 | [lot 398](398.md), 5/7 axes | 96.4 |
| 141 | [Outer Rim Imports 217](141.md) | trade_house | financial | corporate_office | Ithum Karrbex | 25 | 222 | [lot 409](409.md), 6/7 axes | 96.4 |
| 142 | [Estrik Legal](142.md) | law_office | financial | corporate_office | Ithala Kestnar | 14 | 104 | [lot 350](350.md), 5/7 axes | 96.4 |
| 143 | [Outer Rim Imports 729](143.md) | trade_house | financial | criminal_front | Koren Narriss | 13 | 76 | [lot 403](403.md), 6/7 axes | 98.4 |
| 144 | [Brannick Components Outlet](144.md) | electronics | financial | retail_shop | Wenum Stellwan | 11 | 81 | [lot 392](392.md), 6/7 axes | 98.4 |
| 145 | [Senate District District Court](145.md) | courthouse | senate | courthouse | Ossik Cadulo | 11 | 88 | [lot 227](227.md), 6/7 axes | 96.4 |
| 146 | [CSF Garrison Senate District](146.md) | guard_barracks | senate | security_station | Norine Prenash | 16 | 104 | [lot 52](52.md), 6/7 axes | 96.4 |
| 147 | [Level 5603 Primary](147.md) | school | residential | school | Zoryra Brennulo | 13 | 77 | [lot 241](241.md), 7/7 axes | 96.4 |
| 148 | [Renn Towers](148.md) | apartments | residential | worker_apartments | Zebett Sarrven | 21 | 155 | [lot 286](286.md), 5/7 axes | 98.4 |
| 149 | [Skyline Station](149.md) | transit_station | residential | transit_interchange | Xanon Pellmont | 18 | 86 | [lot 266](266.md), 5/7 axes | 98.4 |
| 150 | [Skyline Grill](150.md) | diner | residential | diner | Ashan Menddar | 11 | 137 | [lot 429](429.md), 5/7 axes | 98.4 |
| 151 | [Skyline Heights](151.md) | apartments | residential | worker_apartments | Senan Rellwan | 17 | 147 | [lot 148](148.md), 5/7 axes | 98.4 |
| 152 | [Skyline Greenhouse Supply](152.md) | garden_shop | residential | retail_shop | Mekac Drenquel | 10 | 111 | [lot 154](154.md), 7/7 axes | 98.4 |
| 153 | [Dock Row Hostel 885](153.md) | hostel | residential | hotel | Wenath Garrren | 20 | 128 | [lot 66](66.md), 7/7 axes | 98.4 |
| 154 | [Pell's Garden Shop](154.md) | garden_shop | residential | retail_shop | Talie Junzan | 25 | 176 | [lot 309](309.md), 5/7 axes | 98.4 |
| 155 | [Skyline Habitat 5755](155.md) | apartments | residential | worker_apartments | Greona Zelline | 16 | 122 | [lot 260](260.md), 5/7 axes | 98.4 |
| 156 | [Level 8673 Primary](156.md) | school | residential | school | Orian Vandulo | 18 | 126 | [lot 375](375.md), 5/7 axes | 96.4 |
| 157 | [Gravwell Components Outlet](157.md) | electronics | financial | retail_shop | Nyxis Orline | 25 | 139 | [lot 253](253.md), 5/7 axes | 98.4 |
| 158 | [Kresh Hull & Cargo Insurance](158.md) | insurance | financial | corporate_office | Joress Mendvos | 32 | 136 | [lot 320](320.md), 6/7 axes | 96.4 |
| 159 | [Core Banking Guild — Federal District Branch](159.md) | bank | financial | bank | Paxek Stellnar | 28 | 151 | [lot 164](164.md), 5/7 axes | 96.4 |
| 160 | [Outer Rim Imports 159](160.md) | trade_house | financial | corporate_office | Brenin Gorkar | 26 | 143 | [lot 403](403.md), 6/7 axes | 96.4 |
| 161 | [Tesrin Datawork](161.md) | tech_firm | financial | corporate_office | Ralia Falulo | 28 | 623 | [lot 297](297.md), 6/7 axes | 96.4 |
| 162 | [Renn, Wroth & Associates](162.md) | law_office | financial | corporate_office | Kylara Essnar | 26 | 182 | [lot 300](300.md), 6/7 axes | 96.4 |
| 163 | [Zhorrin & Dosk Consultants](163.md) | office | financial | corporate_office | Mekus Kestven | 34 | 370 | [lot 138](138.md), 6/7 axes | 96.4 |
| 164 | [Bank of Federal District](164.md) | bank | financial | bank | Wenos Nerric | 27 | 302 | [lot 417](417.md), 5/7 axes | 96.4 |
| 165 | [Renn & Othus Consultants](165.md) | office | financial | corporate_office | Mirum Mendbex | 32 | 422 | [lot 135](135.md), 5/7 axes | 96.4 |
| 166 | [The Wessik Spire](166.md) | luxury_residences | financial | affluent_apartments | Silar Ilktel | 34 | 454 | [lot 389](389.md), 6/7 axes | 98.4 |
| 167 | [Talvek Datawork](167.md) | tech_firm | financial | corporate_office | Senen Wexquel | 32 | 173 | [lot 182](182.md), 6/7 axes | 96.4 |
| 168 | [Zabrin Hull & Cargo Insurance](168.md) | insurance | financial | corporate_office | Corath Yavric | 31 | 124 | [lot 189](189.md), 5/7 axes | 96.4 |
| 169 | [Aurodium Systems Annex](169.md) | office | financial | corporate_office | Zoria Sarrulo | 35 | 317 | [lot 251](251.md), 5/7 axes | 96.4 |
| 170 | [Iron Nerf Gym](170.md) | gym | financial | bath_gym | Fenath Mendzan | 11 | 126 | [lot 338](338.md), 7/7 axes | 96.4 |
| 171 | [Rescue Company 850](171.md) | fire_station | residential | fire_station | Daress Prenren | 15 | 159 | [lot 331](331.md), 6/7 axes | 96.4 |
| 172 | [Teo's Bakery](172.md) | bakery | residential | retail_shop | Mavani Zelline | 17 | 80 | [lot 275](275.md), 5/7 axes | 96 |
| 173 | [Mox's Diner](173.md) | diner | residential | diner | Wenen Pellric | 18 | 47 | [lot 244](244.md), 5/7 axes | 94.8 |
| 174 | [Blue Milk Bakehouse 921](174.md) | bakery | residential | retail_shop | Ashath Brennkar | 13 | 102 | [lot 343](343.md), 6/7 axes | 98.4 |
| 175 | [Skyline Clinic](175.md) | clinic | residential | clinic | Boyra Fennnar | 20 | 398 | [lot 418](418.md), 6/7 axes | 98.4 |
| 176 | [The Honest Cleaver](176.md) | butcher | residential | retail_shop | Joruna Bordar | 16 | 133 | [lot 427](427.md), 5/7 axes | 98.4 |
| 177 | [Juvo Outfitters](177.md) | tailor | residential | retail_shop | Uldia Nerbex | 22 | 245 | [lot 382](382.md), 5/7 axes | 98.4 |
| 178 | [Jorak Airspeeder Hire](178.md) | taxi_stand | residential | transit_interchange | Nalo Essric | 22 | 199 | [lot 368](368.md), 6/7 axes | 98.4 |
| 179 | [Block 2762 Habitats](179.md) | apartments | residential | worker_apartments | Jorax Orlnar | 21 | 179 | [lot 236](236.md), 6/7 axes | 98.4 |
| 180 | [Tuvann & Dresh Consultants](180.md) | office | financial | corporate_office | Mekett Stelllor | 35 | 151 | [lot 191](191.md), 6/7 axes | 96.4 |
| 181 | [The Cotta Spire](181.md) | luxury_residences | financial | affluent_apartments | Senen Borquel | 35 | 268 | [lot 399](399.md), 5/7 axes | 98.4 |
| 182 | [Ulmer Dynamics](182.md) | tech_firm | financial | corporate_office | Venie Mortel | 28 | 128 | [lot 167](167.md), 6/7 axes | 96.4 |
| 183 | [Zabrin Trust](183.md) | bank | financial | bank | Ossya Vandbane | 32 | 202 | [lot 186](186.md), 6/7 axes | 96.4 |
| 184 | [The Federal District Bean](184.md) | caf | financial | diner | Keleth Karriss | 25 | 255 | [lot 367](367.md), 6/7 axes | 98.4 |
| 185 | [Thessik Executive Residences](185.md) | luxury_residences | financial | affluent_apartments | Polar Drenova | 28 | 384 | [lot 139](139.md), 6/7 axes | 98.4 |
| 186 | [Chandrilan Credit Union](186.md) | bank | financial | bank | Miror Nerdol | 35 | 189 | [lot 219](219.md), 6/7 axes | 96.4 |
| 187 | [Noodle Bar 989](187.md) | noodle_bar | financial | diner | Garett Brennbane | 28 | 127 | [lot 32](32.md), 6/7 axes | 98.4 |
| 188 | [Perrit's Holobooks](188.md) | bookshop | financial | retail_shop | Harie Ilkdar | 24 | 238 | [lot 380](380.md), 6/7 axes | 98.4 |
| 189 | [Ollum Hull & Cargo Insurance](189.md) | insurance | financial | corporate_office | Kyliri Cadric | 36 | 206 | [lot 279](279.md), 4/7 axes | 94 |
| 190 | [Outer Rim Imports 260](190.md) | trade_house | financial | corporate_office | Vinan Tharison | 23 | 117 | [lot 298](298.md), 6/7 axes | 96.4 |
| 191 | [Thessik Group](191.md) | office | financial | corporate_office | Belyn Corrwan | 22 | 92 | [lot 249](249.md), 4/7 axes | 94 |
| 192 | [Holo-Core Labs 666](192.md) | tech_firm | financial | corporate_office | Tamuna Prenwan | 21 | 134 | [lot 411](411.md), 5/7 axes | 96.4 |
| 193 | [Quillan Components Outlet](193.md) | electronics | financial | retail_shop | Tamo Ulrison | 25 | 380 | [lot 253](253.md), 6/7 axes | 98.4 |
| 194 | [Galactic Indemnity 575](194.md) | insurance | financial | corporate_office | Holia Faliss | 23 | 147 | [lot 398](398.md), 7/7 axes | 96.4 |
| 195 | [Speeder Registry 601](195.md) | licensing_office | financial | corporate_office | Paxona Zellwan | 22 | 130 | [lot 223](223.md), 6/7 axes | 96.4 |
| 196 | [Block 4272 Habitats](196.md) | apartments | financial | worker_apartments | Greum Corrstro | 11 | 120 | [lot 286](286.md), 4/7 axes | 96 |
| 197 | [Rimward Datawork](197.md) | tech_firm | financial | corporate_office | Quinora Zellsol | 11 | 102 | [lot 328](328.md), 7/7 axes | 96.4 |
| 198 | [Orsk-Dathen Holdings](198.md) | office | senate | corporate_office | Quinus Rellova | 11 | 55 | [lot 180](180.md), 6/7 axes | 96.4 |
| 199 | [Hall of Records 197](199.md) | archive | senate | corporate_office | Anio Halash | 23 | 87 | only one of its kind | 96.4 |
| 200 | [Office of Senator Quenn](200.md) | ministry | senate | delegation_office | Yeline Yavbex | 11 | 155 | [lot 222](222.md), 6/7 axes | 96.4 |
| 201 | [Maldrin Towers](201.md) | apartments | residential | worker_apartments | Norella Fennquel | 15 | 81 | [lot 274](274.md), 5/7 axes | 98.4 |
| 202 | [Skyline Pharma](202.md) | pharmacy | residential | retail_shop | Oriar Davova | 15 | 58 | [lot 381](381.md), 5/7 axes | 94.8 |
| 203 | [Skydock 597](203.md) | parking_garage | residential | speeder_garage | Brenuna Pellnar | 15 | 111 | [lot 332](332.md), 5/7 axes | 98.4 |
| 204 | [Skyline Habitat 6259](204.md) | apartments | residential | worker_apartments | Paxie Ostbex | 13 | 53 | [lot 260](260.md), 5/7 axes | 94.8 |
| 205 | [Fresh Rations 204](205.md) | grocery | residential | retail_shop | Xanie Quorric | 11 | 49 | [lot 259](259.md), 6/7 axes | 98.4 |
| 206 | [Everything Emporium 719](206.md) | general_store | residential | retail_shop | Tamala Drenmir | 18 | 339 | [lot 314](314.md), 6/7 axes | 98.4 |
| 207 | [Xel's Caf](207.md) | caf | residential | diner | Greir Stellander | 17 | 120 | [lot 285](285.md), 5/7 axes | 98.4 |
| 208 | [Grand Holovid 871](208.md) | holo_theatre | residential | opera_house | Fenus Antlor | 16 | 153 | [lot 307](307.md), 5/7 axes | 98.4 |
| 209 | [Dosk's Produce](209.md) | grocery | residential | retail_shop | Falir Halsol | 16 | 176 | [lot 245](245.md), 5/7 axes | 98.4 |
| 210 | [Block 8571 Habitats](210.md) | apartments | residential | worker_apartments | Rylon Corrfell | 15 | 58 | [lot 217](217.md), 5/7 axes | 98.4 |
| 211 | [Skyline Books](211.md) | bookshop | residential | retail_shop | Ornus Stellmir | 17 | 79 | [lot 380](380.md), 6/7 axes | 98.4 |
| 212 | [Kresh Institute of Technology](212.md) | university | financial | school | Elsani Drentak | 26 | 174 | [lot 404](404.md), 5/7 axes | 98.4 |
| 213 | [Federal District Fitness](213.md) | gym | financial | bath_gym | Garona Stellmir | 28 | 128 | [lot 358](358.md), 7/7 axes | 96.4 |
| 214 | [Corvane Systems Annex](214.md) | office | financial | corporate_office | Ornan Pelltak | 23 | 238 | [lot 169](169.md), 5/7 axes | 96.4 |
| 215 | [The Federal District Dispatch](215.md) | holonet_office | financial | corporate_office | Lirora Ilkine | 24 | 159 | [lot 252](252.md), 6/7 axes | 96.4 |
| 216 | [Maldrin & Partners Advertising](216.md) | advertising_agency | financial | corporate_office | Tamir Prenmont | 26 | 294 | [lot 348](348.md), 7/7 axes | 98.4 |
| 217 | [Federal District Residences 1458](217.md) | apartments | financial | worker_apartments | Belo Ilkric | 35 | 289 | [lot 210](210.md), 5/7 axes | 98.4 |
| 218 | [Federal District Commodities House](218.md) | trade_house | financial | corporate_office | Daror Vandash | 30 | 192 | [lot 298](298.md), 6/7 axes | 96.4 |
| 219 | [Corellian Credit Union](219.md) | bank | financial | bank | Ilous Essmir | 24 | 97 | [lot 186](186.md), 6/7 axes | 96.4 |
| 220 | [Kelvane Caf & Pastry](220.md) | caf | financial | diner | Lirie Corrtel | 24 | 163 | [lot 424](424.md), 6/7 axes | 98.4 |
| 221 | [Brea's Caf](221.md) | caf | senate | diner | Senis Kestander | 11 | 53 | [lot 361](361.md), 5/7 axes | 98.4 |
| 222 | [Office of Senator Ghavic](222.md) | ministry | senate | delegation_office | Mekala Morash | 11 | 68 | [lot 200](200.md), 6/7 axes | 96.4 |
| 223 | [Speeder Registry 355](223.md) | licensing_office | senate | corporate_office | Norie Ilkkar | 15 | 69 | [lot 195](195.md), 6/7 axes | 96.4 |
| 224 | [Wyllan & Corvane Consultants](224.md) | office | senate | corporate_office | Dexuna Essulo | 15 | 58 | [lot 231](231.md), 5/7 axes | 96.4 |
| 225 | [Falkren, Corvane & Associates](225.md) | law_office | senate | corporate_office | Venala Tharnar | 11 | 165 | [lot 248](248.md), 7/7 axes | 96.4 |
| 226 | [Chandrilan Mission](226.md) | embassy | senate | delegation_office | Haron Davric | 13 | 56 | [lot 230](230.md), 7/7 axes | 96.4 |
| 227 | [Judiciary Annex 675](227.md) | courthouse | senate | courthouse | Erieth Garrsol | 15 | 79 | [lot 145](145.md), 6/7 axes | 96.4 |
| 228 | [Republic Records Office 985](228.md) | licensing_office | senate | corporate_office | Noros Holmwan | 11 | 176 | [lot 414](414.md), 7/7 axes | 96.4 |
| 229 | [CSF Station Senate District](229.md) | security_station | senate | security_station | Senin Garrdol | 11 | 107 | [lot 373](373.md), 6/7 axes | 96.4 |
| 230 | [Ryloth Delegation House](230.md) | embassy | senate | delegation_office | Holuna Randmont | 11 | 127 | [lot 226](226.md), 7/7 axes | 96.4 |
| 231 | [Ionne & Vantrell Consultants](231.md) | office | senate | corporate_office | Calise Karrander | 13 | 48 | [lot 191](191.md), 5/7 axes | 96.4 |
| 232 | [Chez Ollum](232.md) | restaurant | senate | diner | Aniac Garrdar | 23 | 82 | [lot 397](397.md), 7/7 axes | 96 |
| 233 | [Cold Cuts 858](233.md) | butcher | residential | retail_shop | Iloiri Gortel | 11 | 196 | [lot 48](48.md), 6/7 axes | 98.4 |
| 234 | [Night Chemist 594](234.md) | pharmacy | residential | retail_shop | Jenara Kestander | 19 | 162 | [lot 202](202.md), 6/7 axes | 98.4 |
| 235 | [Zhorrin Preparatory](235.md) | school | residential | school | Jenyn Karriss | 19 | 106 | [lot 241](241.md), 6/7 axes | 96.4 |
| 236 | [Skyline Residences 9777](236.md) | apartments | residential | worker_apartments | Talora Essmont | 20 | 149 | [lot 179](179.md), 6/7 axes | 98.4 |
| 237 | [Neuro-Link Surgical](237.md) | cybernetics_clinic | residential | clinic | Torise Vandsol | 17 | 264 | [lot 425](425.md), 7/7 axes | 98.4 |
| 238 | [Starlight Cinema 384](238.md) | holo_theatre | residential | opera_house | Xanel Halfell | 21 | 182 | [lot 379](379.md), 6/7 axes | 98.4 |
| 239 | [Skyline Residences 3318](239.md) | apartments | residential | worker_apartments | Silar Wexric | 18 | 103 | [lot 335](335.md), 4/7 axes | 96 |
| 240 | [Roots & Shoots 580](240.md) | garden_shop | residential | retail_shop | Sabek Falmir | 19 | 67 | [lot 309](309.md), 7/7 axes | 92.4 |
| 241 | [Skyline Academy](241.md) | school | residential | school | Eriyra Mortel | 16 | 68 | [lot 235](235.md), 6/7 axes | 96.4 |
| 242 | [Skyline Interiors 562](242.md) | furniture_store | residential | retail_shop | Brenax Zellkar | 14 | 102 | [lot 310](310.md), 5/7 axes | 98.4 |
| 243 | [Belsar Caf & Pastry](243.md) | caf | residential | diner | Toros Pellsol | 14 | 56 | [lot 361](361.md), 5/7 axes | 98.4 |
| 244 | [Yara's Diner](244.md) | diner | residential | diner | Fenel Kestison | 14 | 44 | [lot 173](173.md), 5/7 axes | 98.4 |
| 245 | [Agri-Corp Outlet 379](245.md) | grocery | residential | retail_shop | Rylae Orlfell | 20 | 144 | [lot 209](209.md), 5/7 axes | 98.4 |
| 246 | [Sorrel Towers](246.md) | apartments | residential | worker_apartments | Korek Randiss | 20 | 69 | [lot 239](239.md), 5/7 axes | 94.8 |
| 247 | [Renn Hull & Cargo Insurance](247.md) | insurance | financial | corporate_office | Xaniri Quoriss | 21 | 108 | [lot 364](364.md), 5/7 axes | 96.4 |
| 248 | [Chambers of Belsar](248.md) | law_office | financial | corporate_office | Polia Mendmir | 23 | 111 | [lot 300](300.md), 7/7 axes | 96.4 |
| 249 | [Kelvane Group](249.md) | office | financial | corporate_office | Wenel Lomlor | 20 | 110 | [lot 191](191.md), 4/7 axes | 94 |
| 250 | [The Estrik Collection](250.md) | museum | financial | gallery | Dunine Fennstro | 23 | 125 | [lot 317](317.md), 6/7 axes | 98.4 |
| 251 | [Xanne & Renn Consultants](251.md) | office | financial | corporate_office | Quinis Gorander | 29 | 220 | [lot 169](169.md), 5/7 axes | 96.4 |
| 252 | [Vantrell Broadcast](252.md) | holonet_office | financial | corporate_office | Koren Ostmont | 21 | 52 | [lot 215](215.md), 6/7 axes | 92.8 |
| 253 | [Cadrin Holo-Electronics](253.md) | electronics | financial | retail_shop | Iloya Quorkar | 22 | 114 | [lot 327](327.md), 4/7 axes | 96 |
| 254 | [Federal District Tariff Bureau](254.md) | tax_office | financial | corporate_office | Liron Borzan | 26 | 204 | only one of its kind | 96.4 |
| 255 | [Kuati Systems Annex](255.md) | office | financial | corporate_office | Orius Fennek | 24 | 169 | [lot 214](214.md), 6/7 axes | 96.4 |
| 256 | [Needle & Thread 286](256.md) | tailor | residential | retail_shop | Ithara Mendzan | 13 | 97 | [lot 98](98.md), 5/7 axes | 98.4 |
| 257 | [Jode's Diner](257.md) | diner | residential | diner | Jenir Fennstro | 14 | 49 | [lot 244](244.md), 6/7 axes | 98.4 |
| 258 | [Ezzi's Broth House](258.md) | noodle_bar | residential | diner | Paxise Fennine | 16 | 42 | [lot 86](86.md), 6/7 axes | 94.8 |
| 259 | [Vaddon's Produce](259.md) | grocery | residential | retail_shop | Ornen Essven | 15 | 68 | [lot 339](339.md), 5/7 axes | 98.4 |
| 260 | [Block 4022 Habitats](260.md) | apartments | residential | worker_apartments | Haros Falander | 15 | 53 | [lot 204](204.md), 5/7 axes | 94.8 |
| 261 | [Onnar's Nerf & Bantha](261.md) | butcher | residential | retail_shop | Paxiri Randulo | 20 | 144 | [lot 287](287.md), 6/7 axes | 98.4 |
| 262 | [Level 3191 Interchange](262.md) | transit_station | residential | transit_interchange | Corara Brennvos | 17 | 95 | [lot 266](266.md), 5/7 axes | 98.4 |
| 263 | [The Flatbread Stand](263.md) | bakery | residential | retail_shop | Sabona Ilkzan | 17 | 84 | [lot 271](271.md), 6/7 axes | 98.4 |
| 264 | [Skyline Habitat 4724](264.md) | apartments | residential | worker_apartments | Coryn Lomfell | 13 | 76 | [lot 335](335.md), 5/7 axes | 98.4 |
| 265 | [Bralen General Supply](265.md) | general_store | residential | retail_shop | Ryluna Antwick | 16 | 163 | [lot 314](314.md), 6/7 axes | 98.4 |
| 266 | [Level 4547 Interchange](266.md) | transit_station | residential | transit_interchange | Corac Pellbex | 16 | 85 | [lot 262](262.md), 5/7 axes | 98.4 |
| 267 | [Skyline Grocer 816](267.md) | grocery | residential | retail_shop | Eriala Junric | 13 | 97 | [lot 282](282.md), 6/7 axes | 98.4 |
| 268 | [Level 4522 Walk-In Clinic](268.md) | clinic | residential | clinic | Calith Lorrfell | 19 | 50 | [lot 334](334.md), 7/7 axes | 94.8 |
| 269 | [Order of the Silent Sun](269.md) | order_house | residential | community_hall | Toren Garriss | 20 | 96 | [lot 313](313.md), 6/7 axes | 96 |
| 270 | [Spacers' Rest 132](270.md) | hostel | residential | hotel | Rylise Fennsol | 15 | 57 | [lot 153](153.md), 7/7 axes | 92.4 |
| 271 | [Skyline Ovens](271.md) | bakery | residential | retail_shop | Ithora Hallor | 16 | 45 | [lot 263](263.md), 6/7 axes | 94.8 |
| 272 | [Tank Ward 197](272.md) | bacta_ward | residential | clinic | Quinyra Garrtak | 20 | 88 | [lot 371](371.md), 6/7 axes | 96 |
| 273 | [Chapel of the Skyline Stars](273.md) | shrine | residential | community_hall | Zoron Halfell | 19 | 52 | [lot 294](294.md), 6/7 axes | 92.4 |
| 274 | [Skyline Residences 2660](274.md) | apartments | residential | worker_apartments | Mekae Sarrtak | 15 | 75 | [lot 372](372.md), 4/7 axes | 96 |
| 275 | [Vint's Bakery](275.md) | bakery | residential | retail_shop | Fenis Antbex | 15 | 65 | [lot 172](172.md), 5/7 axes | 93.6 |
| 276 | [Galactic Indemnity 482](276.md) | insurance | financial | corporate_office | Ossin Stellash | 29 | 350 | [lot 158](158.md), 6/7 axes | 96.4 |
| 277 | [Sethric Towers](277.md) | apartments | financial | worker_apartments | Zebani Pellbane | 22 | 280 | [lot 419](419.md), 6/7 axes | 98.4 |
| 278 | [Republica Annex 242](278.md) | luxury_residences | financial | affluent_apartments | Elsiri Pellnar | 24 | 372 | [lot 133](133.md), 5/7 axes | 98.4 |
| 279 | [Talvek Underwriters](279.md) | insurance | financial | corporate_office | Brenek Mortel | 21 | 139 | [lot 189](189.md), 4/7 axes | 94 |
| 280 | [Everything Emporium 142](280.md) | general_store | residential | retail_shop | Kesae Vandbane | 13 | 51 | [lot 431](431.md), 5/7 axes | 94.8 |
| 281 | [Quillan Towers](281.md) | apartments | residential | worker_apartments | Nalan Fennlor | 13 | 77 | [lot 151](151.md), 5/7 axes | 98.4 |
| 282 | [Agri-Corp Outlet 599](282.md) | grocery | residential | retail_shop | Haror Holmnar | 14 | 84 | [lot 267](267.md), 6/7 axes | 98.4 |
| 283 | [Brotherhood of Ionne](283.md) | order_house | residential | community_hall | Noror Zellwick | 14 | 107 | [lot 313](313.md), 7/7 axes | 96 |
| 284 | [Skydock 997](284.md) | parking_garage | residential | speeder_garage | Koron Borzan | 14 | 130 | [lot 332](332.md), 6/7 axes | 98.4 |
| 285 | [Caf Corner 411](285.md) | caf | residential | diner | Luness Orltak | 16 | 60 | [lot 207](207.md), 5/7 axes | 98.4 |
| 286 | [Skyline Residences 5226](286.md) | apartments | residential | worker_apartments | Lirin Esszan | 16 | 115 | [lot 196](196.md), 4/7 axes | 96 |
| 287 | [Cold Cuts 148](287.md) | butcher | residential | retail_shop | Koruna Corrulo | 9 | 63 | [lot 83](83.md), 5/7 axes | 98.4 |
| 288 | [Orrin's Broth House](288.md) | noodle_bar | residential | diner | Aniella Ostfell | 10 | 79 | [lot 362](362.md), 6/7 axes | 98.4 |
| 289 | [Skyline Habitat 8144](289.md) | apartments | residential | worker_apartments | Jenona Essek | 11 | 178 | [lot 433](433.md), 6/7 axes | 98.4 |
| 290 | [Kettrick Parking](290.md) | parking_garage | residential | speeder_garage | Aniith Zelline | 11 | 58 | [lot 305](305.md), 6/7 axes | 98.4 |
| 291 | [Falkren General Supply](291.md) | general_store | residential | retail_shop | Holiri Antova | 11 | 47 | [lot 341](341.md), 6/7 axes | 98.4 |
| 292 | [Kip's Bakery](292.md) | bakery | residential | retail_shop | Yelyra Ostdol | 14 | 50 | [lot 275](275.md), 5/7 axes | 96 |
| 293 | [Talvek Towers](293.md) | apartments | residential | worker_apartments | Joror Fenniss | 15 | 48 | [lot 210](210.md), 6/7 axes | 98.4 |
| 294 | [The Quiet Room](294.md) | shrine | residential | community_hall | Silor Ulrek | 19 | 194 | [lot 273](273.md), 6/7 axes | 98.4 |
| 295 | [Nerf Steaks 507](295.md) | diner | residential | diner | Zebel Gordar | 17 | 160 | [lot 118](118.md), 5/7 axes | 98.4 |
| 296 | [Cotta Group](296.md) | office | financial | corporate_office | Sabise Randfell | 29 | 453 | [lot 249](249.md), 5/7 axes | 96.4 |
| 297 | [Holo-Core Labs 887](297.md) | tech_firm | financial | corporate_office | Brenee Essmont | 30 | 385 | [lot 161](161.md), 6/7 axes | 96.4 |
| 298 | [Outer Rim Imports 200](298.md) | trade_house | financial | corporate_office | Kesos Oststro | 28 | 209 | [lot 190](190.md), 6/7 axes | 96.4 |
| 299 | [Federal District Heights](299.md) | apartments | financial | worker_apartments | Grein Relltak | 21 | 285 | [lot 308](308.md), 6/7 axes | 98.4 |
| 300 | [Marrov, Vokar & Associates](300.md) | law_office | financial | corporate_office | Mavar Lomek | 21 | 150 | [lot 142](142.md), 5/7 axes | 96.4 |
| 301 | [Hotel Skyhook 801](301.md) | hotel | financial | hotel | Asheth Davova | 23 | 78 | [lot 405](405.md), 5/7 axes | 94.8 |
| 302 | [Federal District Holo-Ads 175](302.md) | advertising_agency | financial | corporate_office | Iloee Holmlor | 23 | 97 | [lot 348](348.md), 6/7 axes | 98.4 |
| 303 | [Aurodium Holdings](303.md) | office | financial | corporate_office | Polo Garrkar | 31 | 119 | [lot 191](191.md), 5/7 axes | 96.4 |
| 304 | [Maldrin's Holobooks](304.md) | bookshop | financial | retail_shop | Rylyn Borash | 13 | 82 | [lot 413](413.md), 6/7 axes | 98.4 |
| 305 | [Level 3037 Garage](305.md) | parking_garage | financial | speeder_garage | Holess Cadquel | 14 | 84 | [lot 203](203.md), 6/7 axes | 98.4 |
| 306 | [Caf Corner 916](306.md) | caf | financial | diner | Iloya Drenvos | 15 | 69 | [lot 361](361.md), 5/7 axes | 98.4 |
| 307 | [Starlight Cinema 926](307.md) | holo_theatre | residential | opera_house | Harella Fennwick | 13 | 105 | [lot 208](208.md), 5/7 axes | 98.4 |
| 308 | [Skyline Habitat 1227](308.md) | apartments | residential | worker_apartments | Fenath Ostova | 14 | 150 | [lot 148](148.md), 5/7 axes | 98.4 |
| 309 | [Hollis's Garden Shop](309.md) | garden_shop | residential | retail_shop | Jaxon Karrbane | 16 | 145 | [lot 154](154.md), 5/7 axes | 98.4 |
| 310 | [Skyline Home & Habitat](310.md) | furniture_store | residential | retail_shop | Fenona Narrander | 13 | 88 | [lot 242](242.md), 5/7 axes | 98.4 |
| 311 | [Republic Athletic 311](311.md) | gym | residential | bath_gym | Mirac Nermir | 14 | 168 | [lot 338](338.md), 7/7 axes | 96.4 |
| 312 | [Sector 264 Patrol House](312.md) | security_station | residential | security_station | Rylath Mendander | 15 | 224 | [lot 384](384.md), 6/7 axes | 96.4 |
| 313 | [Monastery of the Skyline Wind](313.md) | order_house | residential | community_hall | Jaxon Zellvos | 16 | 299 | [lot 269](269.md), 6/7 axes | 96 |
| 314 | [Zell General Supply](314.md) | general_store | residential | retail_shop | Orio Ostmont | 17 | 334 | [lot 265](265.md), 6/7 axes | 98.4 |
| 315 | [Federal District Residences 4522](315.md) | apartments | financial | worker_apartments | Nalo Yavvos | 25 | 139 | [lot 204](204.md), 6/7 axes | 98.4 |
| 316 | [Quillan Credit Union](316.md) | bank | financial | bank | Xanyn Vandstro | 36 | 165 | [lot 159](159.md), 5/7 axes | 96.4 |
| 317 | [The Cadrin Collection](317.md) | museum | financial | gallery | Harella Davbex | 28 | 148 | [lot 250](250.md), 6/7 axes | 98.4 |
| 318 | [Federal District Penthouses](318.md) | luxury_residences | financial | affluent_apartments | Iloos Prenvos | 29 | 146 | [lot 389](389.md), 5/7 axes | 98.4 |
| 319 | [The Federal District Grand](319.md) | hotel | financial | hotel | Rhoyra Brennmont | 21 | 217 | [lot 321](321.md), 6/7 axes | 98.4 |
| 320 | [Galactic Indemnity 473](320.md) | insurance | financial | corporate_office | Dunala Narrtak | 22 | 183 | [lot 140](140.md), 6/7 axes | 96.4 |
| 321 | [Corellian Suites](321.md) | hotel | financial | hotel | Rhoya Lorrlor | 23 | 89 | [lot 405](405.md), 5/7 axes | 98.4 |
| 322 | [Corvane Underwriters](322.md) | insurance | financial | corporate_office | Jaxyn Nerulo | 29 | 170 | [lot 279](279.md), 5/7 axes | 96.4 |
| 323 | [Osmer Institute of Technology](323.md) | university | financial | school | Senett Yavkar | 20 | 69 | [lot 404](404.md), 6/7 axes | 94.8 |
| 324 | [Caf Corner 456](324.md) | caf | financial | diner | Greara Lomnar | 21 | 74 | [lot 285](285.md), 5/7 axes | 92.4 |
| 325 | [Outer Rim Credit Union](325.md) | bank | financial | bank | Fenine Haline | 14 | 96 | [lot 186](186.md), 6/7 axes | 96.4 |
| 326 | [Republic Records Office 789](326.md) | licensing_office | financial | corporate_office | Rylyra Ulrren | 25 | 121 | [lot 360](360.md), 5/7 axes | 96.4 |
| 327 | [Glow & Signal 876](327.md) | electronics | financial | retail_shop | Polara Ulrric | 23 | 124 | [lot 253](253.md), 4/7 axes | 96 |
| 328 | [Sullustan Datawork](328.md) | tech_firm | financial | corporate_office | Sabett Holmquel | 13 | 116 | [lot 408](408.md), 6/7 axes | 96.4 |
| 329 | [Perrit, Hessik & Associates](329.md) | law_office | financial | corporate_office | Rhoac Ostbex | 30 | 141 | [lot 350](350.md), 6/7 axes | 96.4 |
| 330 | [Vaddon Group](330.md) | office | financial | corporate_office | Jaxen Tharnar | 29 | 102 | [lot 412](412.md), 5/7 axes | 90.4 |
| 331 | [Coruscant Fire Brigade — Skyline](331.md) | fire_station | residential | fire_station | Lunan Antulo | 15 | 60 | [lot 387](387.md), 6/7 axes | 96.4 |
| 332 | [Skydock 563](332.md) | parking_garage | residential | speeder_garage | Quinora Wexwick | 15 | 74 | [lot 203](203.md), 5/7 axes | 98.4 |
| 333 | [Block 6334 Habitats](333.md) | apartments | residential | worker_apartments | Kesel Garrwick | 20 | 72 | [lot 239](239.md), 5/7 axes | 92.4 |
| 334 | [Level 4747 Walk-In Clinic](334.md) | clinic | residential | clinic | Mirac Drenven | 14 | 51 | [lot 175](175.md), 6/7 axes | 92.4 |
| 335 | [Block 6407 Habitats](335.md) | apartments | residential | worker_apartments | Ashir Orlander | 10 | 65 | [lot 239](239.md), 4/7 axes | 96 |
| 336 | [Skyline Fine Arts](336.md) | art_gallery | residential | gallery | Silia Cadmir | 16 | 146 | [lot 426](426.md), 5/7 axes | 98.4 |
| 337 | [Vint's Caf](337.md) | caf | residential | diner | Ithiri Falzan | 13 | 81 | [lot 361](361.md), 5/7 axes | 98.4 |
| 338 | [Corrin Training Hall](338.md) | gym | residential | bath_gym | Korya Mendwan | 15 | 96 | [lot 311](311.md), 7/7 axes | 96.4 |
| 339 | [Skyline Grocer 283](339.md) | grocery | residential | retail_shop | Zora Tharander | 14 | 204 | [lot 259](259.md), 5/7 axes | 98.4 |
| 340 | [Borvik's Nerf & Bantha](340.md) | butcher | residential | retail_shop | Ryla Brennander | 23 | 170 | [lot 287](287.md), 6/7 axes | 98.4 |
| 341 | [Kwikmart 456](341.md) | general_store | residential | retail_shop | Fenyra Nertak | 20 | 80 | [lot 291](291.md), 6/7 axes | 94.8 |
| 342 | [Borvik Towers](342.md) | apartments | residential | worker_apartments | Vexae Vandquel | 16 | 65 | [lot 260](260.md), 6/7 axes | 94.8 |
| 343 | [Lorn's Bakery](343.md) | bakery | residential | retail_shop | Venan Halnar | 17 | 120 | [lot 172](172.md), 5/7 axes | 98.4 |
| 344 | [New Limb Clinic 325](344.md) | cybernetics_clinic | residential | clinic | Paxis Cadquel | 14 | 151 | [lot 425](425.md), 6/7 axes | 98.4 |
| 345 | [Lannick & Dresh Consultants](345.md) | office | financial | corporate_office | Ashise Vanddol | 35 | 226 | [lot 251](251.md), 6/7 axes | 96.4 |
| 346 | [Coaxium Datawork](346.md) | tech_firm | financial | corporate_office | Dunir Wextak | 37 | 182 | [lot 328](328.md), 6/7 axes | 96.4 |
| 347 | [Ironclad Escorts 560](347.md) | private_security | financial | security_station | Teyac Gorven | 19 | 127 | [lot 112](112.md), 5/7 axes | 96.4 |
| 348 | [Slogan Works](348.md) | advertising_agency | financial | corporate_office | Elsess Essvos | 24 | 136 | [lot 302](302.md), 6/7 axes | 98.4 |
| 349 | [Blue Screen Pictures](349.md) | holo_studio | financial | broadcast_studio | Jorya Corrfell | 27 | 167 | [lot 365](365.md), 6/7 axes | 96.4 |
| 350 | [Hasque Legal](350.md) | law_office | financial | corporate_office | Jaxess Narrstro | 21 | 130 | [lot 142](142.md), 5/7 axes | 96.4 |
| 351 | [Republica Annex 898](351.md) | luxury_residences | financial | affluent_apartments | Vexor Yavmont | 28 | 262 | [lot 133](133.md), 6/7 axes | 98.4 |
| 352 | [Hotel Jesk](352.md) | hotel | financial | hotel | Elsara Antander | 21 | 427 | [lot 43](43.md), 6/7 axes | 98.4 |
| 353 | [Belsar Hull & Cargo Insurance](353.md) | insurance | financial | corporate_office | Silar Brennulo | 20 | 208 | [lot 247](247.md), 6/7 axes | 96.4 |
| 354 | [Hydian Holdings](354.md) | office | financial | corporate_office | Itha Stellash | 29 | 183 | [lot 255](255.md), 6/7 axes | 96.4 |
| 355 | [Ionic Credit Union](355.md) | bank | financial | bank | Paxella Karrsol | 29 | 76 | [lot 400](400.md), 5/7 axes | 92.8 |
| 356 | [Manarai Terrace](356.md) | restaurant | financial | diner | Nalum Vandlor | 21 | 266 | [lot 397](397.md), 7/7 axes | 98.4 |
| 357 | [Kresh & Brannick Consultants](357.md) | office | financial | corporate_office | Toro Brennwan | 23 | 64 | [lot 394](394.md), 4/7 axes | 90.4 |
| 358 | [Kallow Training Hall](358.md) | gym | financial | bath_gym | Wenen Lomvos | 18 | 62 | [lot 338](338.md), 7/7 axes | 92.8 |
| 359 | [Yavelle Holdings](359.md) | office | financial | corporate_office | Rylella Junzan | 23 | 318 | [lot 169](169.md), 6/7 axes | 96.4 |
| 360 | [Republic Records Office 304](360.md) | licensing_office | financial | corporate_office | Rhoel Cadine | 21 | 83 | [lot 326](326.md), 5/7 axes | 96.4 |
| 361 | [Jawa Juice 897](361.md) | caf | financial | diner | Kelee Lorrvos | 21 | 90 | [lot 243](243.md), 5/7 axes | 98.4 |
| 362 | [Noodle Bar 925](362.md) | noodle_bar | financial | diner | Nyxya Keststro | 30 | 205 | [lot 288](288.md), 6/7 axes | 98.4 |
| 363 | [Ironclad Escorts 466](363.md) | private_security | financial | security_station | Darir Tarnren | 25 | 96 | [lot 112](112.md), 6/7 axes | 96.4 |
| 364 | [Galactic Indemnity 937](364.md) | insurance | financial | corporate_office | Mirani Wexek | 25 | 75 | [lot 279](279.md), 5/7 axes | 96.4 |
| 365 | [Jesk Holo-Productions](365.md) | holo_studio | financial | broadcast_studio | Jenek Halmir | 20 | 158 | [lot 349](349.md), 6/7 axes | 96.4 |
| 366 | [University of Federal District — Faculty 497](366.md) | university | financial | school | Elsir Lorrmont | 25 | 125 | [lot 212](212.md), 6/7 axes | 98.4 |
| 367 | [Jawa Juice 724](367.md) | caf | residential | diner | Zorath Lorrzan | 13 | 159 | [lot 184](184.md), 6/7 axes | 98.4 |
| 368 | [Skyline Air Taxi](368.md) | taxi_stand | residential | transit_interchange | Ossir Narrine | 13 | 127 | [lot 178](178.md), 6/7 axes | 98.4 |
| 369 | [Skyline Interiors 258](369.md) | furniture_store | residential | retail_shop | Oriin Narrwan | 16 | 44 | [lot 310](310.md), 6/7 axes | 94.8 |
| 370 | [Skyline Grocer 202](370.md) | grocery | residential | retail_shop | Elsyra Holmash | 14 | 55 | [lot 282](282.md), 6/7 axes | 94.8 |
| 371 | [Skyline Bacta Ward](371.md) | bacta_ward | residential | clinic | Orno Morsol | 16 | 79 | [lot 272](272.md), 6/7 axes | 96 |
| 372 | [Block 2585 Habitats](372.md) | apartments | residential | worker_apartments | Talyra Tarnlor | 17 | 74 | [lot 274](274.md), 4/7 axes | 96 |
| 373 | [Sector 141 Patrol House](373.md) | security_station | residential | security_station | Uldyra Cadvos | 16 | 92 | [lot 35](35.md), 5/7 axes | 94 |
| 374 | [Yellow Fin Cabs 494](374.md) | taxi_stand | residential | transit_interchange | Vinan Ulrfell | 14 | 74 | [lot 99](99.md), 6/7 axes | 98.4 |
| 375 | [Hasque Preparatory](375.md) | school | residential | school | Senan Relline | 18 | 121 | [lot 156](156.md), 5/7 axes | 96.4 |
| 376 | [Caf Corner 846](376.md) | caf | residential | diner | Nyxara Yavulo | 14 | 46 | [lot 324](324.md), 6/7 axes | 98.4 |
| 377 | [Skyline Residences 1604](377.md) | apartments | residential | worker_apartments | Brenek Holmzan | 11 | 47 | [lot 204](204.md), 6/7 axes | 98.4 |
| 378 | [Durasteel Direct 515](378.md) | hardware_store | residential | retail_shop | Dexani Essdol | 14 | 93 | [lot 386](386.md), 6/7 axes | 98.4 |
| 379 | [Starlight Cinema 657](379.md) | holo_theatre | residential | opera_house | Torara Prenven | 18 | 122 | [lot 208](208.md), 6/7 axes | 98.4 |
| 380 | [Datacron & Dust 663](380.md) | bookshop | residential | retail_shop | Zebona Nerander | 15 | 132 | [lot 439](439.md), 6/7 axes | 98.4 |
| 381 | [Bacta & Sundries](381.md) | pharmacy | residential | retail_shop | Fenum Tharbex | 16 | 84 | [lot 202](202.md), 5/7 axes | 98.4 |
| 382 | [Needle & Thread 872](382.md) | tailor | residential | retail_shop | Yelax Drensol | 19 | 146 | [lot 177](177.md), 5/7 axes | 98.4 |
| 383 | [Ovo's Bakery](383.md) | bakery | residential | retail_shop | Tamee Brennvos | 16 | 116 | [lot 434](434.md), 6/7 axes | 98.4 |
| 384 | [CSF Station Skyline](384.md) | security_station | residential | security_station | Vexax Stellmont | 16 | 295 | [lot 312](312.md), 6/7 axes | 96.4 |
| 385 | [Skyline Interiors 795](385.md) | furniture_store | residential | retail_shop | Kelon Ulrdol | 16 | 74 | [lot 124](124.md), 6/7 axes | 98.4 |
| 386 | [Corvane Hardware](386.md) | hardware_store | residential | retail_shop | Nalis Tarnwick | 17 | 67 | [lot 378](378.md), 6/7 axes | 98.4 |
| 387 | [Fire Suppression Station 231](387.md) | fire_station | residential | fire_station | Dexath Wexbex | 15 | 61 | [lot 331](331.md), 6/7 axes | 96.4 |
| 388 | [Zhorrin Towers](388.md) | apartments | residential | worker_apartments | Kelin Garrtel | 11 | 56 | [lot 335](335.md), 5/7 axes | 98.4 |
| 389 | [The Merret Spire](389.md) | luxury_residences | financial | affluent_apartments | Garum Wexdol | 25 | 157 | [lot 139](139.md), 5/7 axes | 98.4 |
| 390 | [Hyperlane Holdings](390.md) | office | financial | corporate_office | Kylar Randova | 27 | 146 | [lot 135](135.md), 6/7 axes | 92.8 |
| 391 | [Grek Legal](391.md) | law_office | financial | corporate_office | Jorus Rellison | 23 | 92 | [lot 162](162.md), 7/7 axes | 96.4 |
| 392 | [Circuit Row 383](392.md) | electronics | financial | retail_shop | Jorine Zellwan | 20 | 119 | [lot 253](253.md), 5/7 axes | 98.4 |
| 393 | [Bounty Board — Federal District Guild Hall](393.md) | private_security | financial | security_station | Sena Corrash | 21 | 108 | [lot 38](38.md), 5/7 axes | 96.4 |
| 394 | [Corellian Holdings](394.md) | office | financial | corporate_office | Boir Sarrander | 22 | 59 | [lot 357](357.md), 4/7 axes | 90.4 |
| 395 | [Galactic Indemnity 321](395.md) | insurance | financial | corporate_office | Senani Yavvos | 23 | 97 | [lot 398](398.md), 6/7 axes | 96.4 |
| 396 | [Drev Dynamics](396.md) | tech_firm | financial | corporate_office | Tamala Holmbex | 29 | 239 | [lot 408](408.md), 6/7 axes | 96.4 |
| 397 | [Skyline Dining Room 399](397.md) | restaurant | financial | diner | Jenus Lorrquel | 26 | 116 | [lot 356](356.md), 7/7 axes | 98.4 |
| 398 | [Outer Rim Underwriters](398.md) | insurance | financial | corporate_office | Itheth Quorine | 29 | 139 | [lot 140](140.md), 5/7 axes | 96.4 |
| 399 | [Republica Annex 901](399.md) | luxury_residences | financial | affluent_apartments | Venee Wexsol | 32 | 254 | [lot 181](181.md), 5/7 axes | 98.4 |
| 400 | [Orlann Trust](400.md) | bank | financial | bank | Jorax Fennven | 29 | 174 | [lot 355](355.md), 5/7 axes | 96.4 |
| 401 | [Ardo & Quillan Consultants](401.md) | office | financial | corporate_office | Xanara Sarrmir | 36 | 183 | [lot 169](169.md), 6/7 axes | 96.4 |
| 402 | [Hotel Orlann](402.md) | hotel | financial | hotel | Ornyn Wexsol | 27 | 140 | [lot 68](68.md), 6/7 axes | 98.4 |
| 403 | [Tashaan Trading Company](403.md) | trade_house | financial | corporate_office | Iloara Ostren | 25 | 144 | [lot 160](160.md), 6/7 axes | 96.4 |
| 404 | [Jesk Institute of Technology](404.md) | university | financial | school | Kelel Holmbane | 24 | 198 | [lot 212](212.md), 5/7 axes | 98.4 |
| 405 | [Hotel Ionne](405.md) | hotel | financial | hotel | Erio Karrwan | 23 | 78 | [lot 301](301.md), 5/7 axes | 94.8 |
| 406 | [Ironclad Escorts 201](406.md) | private_security | financial | security_station | Zorus Tharkar | 26 | 172 | [lot 347](347.md), 6/7 axes | 96.4 |
| 407 | [Cadrin Trust](407.md) | bank | financial | bank | Teyella Narrtel | 26 | 132 | [lot 316](316.md), 6/7 axes | 96.4 |
| 408 | [Federal District Cybernetics Software](408.md) | tech_firm | financial | corporate_office | Ithyn Vandtak | 27 | 134 | [lot 396](396.md), 6/7 axes | 96.4 |
| 409 | [Corvane Mercantile Exchange](409.md) | trade_house | financial | corporate_office | Vina Quormont | 23 | 110 | [lot 141](141.md), 6/7 axes | 96.4 |
| 410 | [Repulsor Executive Residences](410.md) | luxury_residences | financial | affluent_apartments | Luna Junlor | 20 | 177 | [lot 399](399.md), 6/7 axes | 98.4 |
| 411 | [Kelvane Dynamics](411.md) | tech_firm | financial | corporate_office | Ossik Fennvos | 23 | 116 | [lot 192](192.md), 5/7 axes | 96.4 |
| 412 | [Bespin Systems Annex](412.md) | office | financial | corporate_office | Seneth Holmzan | 28 | 83 | [lot 135](135.md), 5/7 axes | 96.4 |
| 413 | [Federal District Books](413.md) | bookshop | financial | retail_shop | Iloora Brenniss | 24 | 129 | [lot 304](304.md), 6/7 axes | 98.4 |
| 414 | [Bureau of Ships and Services — Office 702](414.md) | licensing_office | financial | corporate_office | Elsor Drenzan | 28 | 147 | [lot 326](326.md), 7/7 axes | 96.4 |
| 415 | [Hotel Sunder](415.md) | hotel | financial | hotel | Brenuna Lorrander | 25 | 166 | [lot 43](43.md), 6/7 axes | 98.4 |
| 416 | [The Yendt Spire](416.md) | luxury_residences | financial | affluent_apartments | Yelo Yavdar | 26 | 141 | [lot 133](133.md), 5/7 axes | 98.4 |
| 417 | [Kelvane Trust](417.md) | bank | financial | bank | Belan Junven | 30 | 534 | [lot 164](164.md), 5/7 axes | 96.4 |
| 418 | [Dr Jesk — Family Medicine](418.md) | clinic | residential | clinic | Ossus Quorlor | 17 | 220 | [lot 175](175.md), 6/7 axes | 98.4 |
| 419 | [Block 5530 Habitats](419.md) | apartments | residential | worker_apartments | Dexyn Quorquel | 18 | 114 | [lot 433](433.md), 5/7 axes | 98.4 |
| 420 | [Republic School 196](420.md) | school | residential | school | Kelel Prenzan | 11 | 82 | [lot 235](235.md), 7/7 axes | 96.4 |
| 421 | [Halvor General Supply](421.md) | general_store | residential | retail_shop | Bouna Quorulo | 17 | 86 | [lot 431](431.md), 5/7 axes | 98.4 |
| 422 | [Level 2460 Walk-In Clinic](422.md) | clinic | residential | clinic | Belan Stelltak | 16 | 67 | [lot 268](268.md), 7/7 axes | 98.4 |
| 423 | [Skyline Residences 7463](423.md) | apartments | residential | worker_apartments | Daren Antren | 15 | 136 | [lot 428](428.md), 5/7 axes | 98.4 |
| 424 | [The Skyline Bean](424.md) | caf | residential | diner | Greiri Holmine | 14 | 139 | [lot 324](324.md), 5/7 axes | 98.4 |
| 425 | [Vaddon Prosthetics](425.md) | cybernetics_clinic | residential | clinic | Rhoek Yavison | 18 | 109 | [lot 344](344.md), 6/7 axes | 96 |
| 426 | [Studio 665 Exhibitions](426.md) | art_gallery | residential | gallery | Calith Brennmir | 21 | 105 | [lot 336](336.md), 5/7 axes | 98.4 |
| 427 | [Cold Cuts 940](427.md) | butcher | residential | retail_shop | Garya Haltak | 16 | 130 | [lot 176](176.md), 5/7 axes | 98.4 |
| 428 | [Skyline Habitat 2435](428.md) | apartments | residential | worker_apartments | Holae Tarnstro | 15 | 137 | [lot 217](217.md), 5/7 axes | 98.4 |
| 429 | [Ezzi's Diner](429.md) | diner | residential | diner | Tamen Ulrsol | 10 | 106 | [lot 150](150.md), 5/7 axes | 98.4 |
| 430 | [Ardo Furnishings](430.md) | furniture_store | residential | retail_shop | Venon Orlsol | 15 | 126 | [lot 242](242.md), 6/7 axes | 98.4 |
| 431 | [Galactic Goods 905](431.md) | general_store | residential | retail_shop | Zoran Tarnova | 16 | 136 | [lot 421](421.md), 5/7 axes | 98.4 |
| 432 | [Wayfarers’ Shrine 974](432.md) | shrine | residential | community_hall | Corir Mendsol | 13 | 138 | [lot 294](294.md), 7/7 axes | 98.4 |
| 433 | [Prethen Towers](433.md) | apartments | residential | worker_apartments | Fenos Cadmont | 17 | 116 | [lot 286](286.md), 5/7 axes | 98.4 |
| 434 | [Blue Milk Bakehouse 616](434.md) | bakery | residential | retail_shop | Vexyra Osttak | 13 | 139 | [lot 383](383.md), 6/7 axes | 98.4 |
| 435 | [Gallery Renn](435.md) | art_gallery | residential | gallery | Darala Garrek | 16 | 60 | [lot 101](101.md), 5/7 axes | 94.8 |
| 436 | [Skyline Grocer 581](436.md) | grocery | residential | retail_shop | Zorus Ostek | 9 | 49 | [lot 370](370.md), 6/7 axes | 98.4 |
| 437 | [Everything Emporium 101](437.md) | general_store | residential | retail_shop | Dexin Fennek | 8 | 86 | [lot 206](206.md), 6/7 axes | 98.4 |
| 438 | [Skyline Holo-Theatre](438.md) | holo_theatre | residential | opera_house | Ossee Borine | 15 | 167 | [lot 132](132.md), 5/7 axes | 98.4 |
| 439 | [The Paper Archive](439.md) | bookshop | residential | retail_shop | Yelin Antstro | 16 | 101 | [lot 380](380.md), 6/7 axes | 98.4 |
| 440 | [Block 7765 Habitats](440.md) | apartments | residential | worker_apartments | Weno Orlek | 10 | 50 | [lot 388](388.md), 6/7 axes | 98.4 |
