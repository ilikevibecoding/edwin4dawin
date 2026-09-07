# Goods requests from the building programs (P3)

`src/economy/prices.js` is another builder's file (read only for P3). Every program record's `inputs` and `outputs`
uses existing `GOODS` keys only (the scorer's hard failure "fake transaction" catches anything else, and
`scripts/test-programs.mjs` A5 asserts it). The goods below are what the programs *want* to trade and the economy
does not have yet; they are recorded per program as `wants` in `src/coruscant/programs/catalogue.js` and never
used as keys. Where a real GOODS key stands in today, the substitute is named so the dossiers stay honest.

Categories follow the existing ones (`food`, `meat`, `produce`, `hide`, `material`, `ore`, `service`); suggested base
prices are in credits, in line with the current table (bread 8, room_night 25-60, bacta_shot ~40).

| Requested good | Category | Base | Wanted by | Stands in today | Why |
|---|---|---:|---|---|---|
| `caf` | food | 4 | diner | `apple` on the diner counter | the diner's signature drink; stallholders and the counter sell it |
| `noodles` | food | 9 | diner | `bread`, cooked meats | the diner's plate of the day |
| `ale` | food | 6 | cantina_club | `apple` at the bar | what the cantina bar actually pours |
| `juri_juice` | food | 7 | cantina_club | none | the club's house drink |
| `spice` | material | 120 | cantina_club, criminal_front | none | the contraband the freight brokerage really moves; the club's back-room trade |
| `droid_part` | material | 30 | droid_workshop | `iron_block`, `iron_bars` | parts sorted and fitted on the bench |
| `droid_repair` | service | 45 | droid_workshop | none | the workshop's output: a droid handed back |
| `hyperdrive_part` | material | 250 | repair_hangar | `iron_block` | the part the hangar waits on in its story |
| `repair_service` | service | 180 | repair_hangar | `ship_shuttle` (sold) | a berth and a crew for a day |
| `scrap` | material | 5 | salvage_yard, utility_plant, market_arcade | `iron_ore` | what the yard buys by the ton and the salvage kiosk resells |
| `salvage_permit` | service | 60 | salvage_yard | none | the licence the yard renews |
| `power` | service | 12 | utility_plant, worker_apartments | `coal_ore` in | the plant's output; the apartments' input |
| `reclaimed_water` | material | 6 | utility_plant | none | the reclamation plant's second output |
| `water_allocation` | service | 20 | bath_gym, fire_station | none | what the baths and the pumps draw |
| `medical_supplies` | material | 35 | clinic | `bacta_shot` | consumables behind `bacta_shot` |
| `cybernetic_implant` | material | 400 | clinic | none | the clinic's high-value procedure |
| `rent` | service | 60-150 | worker_apartments, affluent_apartments | `room_night` (purpose sells) | monthly, not nightly |
| `transit_pass` | service | 3 | transit_interchange | `speeder_ride` | the fare at the barrier |
| `passage_ticket` | service | 90 | passenger_terminal | `ship_shuttle` | a seat on a departing shuttle |
| `customs_clearance` | service | 25 | passenger_terminal | none | the stamp at the checkpoint |
| `freight_contract` | service | 200 | cargo_terminal, criminal_front | none | the brokerage's legitimate face |
| `performance_ticket` | service | 40 | opera_house | `apple`, `bread` at the foyer bar | the ticket desk's only real product |
| `admission` | service | 8 | gallery | none | the gallery door |
| `art_piece` | material | 300 | gallery, affluent_apartments | none | what the studios make and the penthouses buy |
| `nav_chart` | material | 22 | market_arcade | none | the navigation kiosk's stock |
| `wholesale_delivery` | service | 50 | retail_shop | none | the delivery the shops wait on |
| `booking` | service | 60 | hotel | `room_night` | a reservation, not a walk-in |
| `linen_service` | service | 10 | hotel | none | the laundry contract |
| `contract` | service | 500 | corporate_office | none | what an office sells |
| `licence` | service | 75 | corporate_office | none | the licensing office's stamp |
| `credit_account` | service | 0 | bank | none | opening an account (the bank's interaction) |
| `loan` | service | 1000 | bank | none | the bank's product |
| `tuition` | service | 30 | school | none | the school's income |
| `teaching_licence` | service | 40 | school | none | the credential on the wall |
| `membership` | service | 15 | bath_gym | none | the gym's income |
| `parking_fee` | service | 5 | speeder_garage | none | the garage's income |
| `speeder_fuel` | material | 9 | speeder_garage | none | the pump |
| `emergency_call` | service | 0 | fire_station | none | the service the station provides free |
| `fine` | service | 50 | security_station | none | the station's income |
| `bounty` | service | 500 | security_station | none | the board in the squad room |
| `court_fee` | service | 20 | courthouse | none | filing |
| `verdict` | service | 0 | courthouse | none | the court's output (not a sale; documents the flow) |
| `gaming_licence` | service | 200 | gaming_house | none | the licence behind the cage |
| `jackpot` | service | 0 | gaming_house | none | the payout (documents the flow) |
| `broadcast_slot` | service | 150 | broadcast_studio | none | the studio's product |
| `news_story` | service | 0 | broadcast_studio | none | the newsroom's output |
| `donation` | service | 0 | community_hall | none | the hall's income |
| `holocron` | material | 0 | jedi_temple | none | never sold; documents the archive's holdings |
| `kyber_crystal` | material | 0 | jedi_temple | none | never sold; the workshop's input |
| `legislation` | service | 0 | senate | none | the Senate's output (documents the flow) |
| `petition_filing` | service | 0 | senate, delegation_office | none | the petition office's interaction |
| `visa` | service | 15 | delegation_office | none | the delegation's stamp |

Once a key exists, the program record picks it up by moving the name from `wants` to `inputs` / `outputs` in the
catalogue; nothing else changes (the dossiers and the scorer read the record).
