// Building purposes for Coruscant (rubric 07/08): every lot gets a category, a specific kind, a Star-Wars-flavoured
// name, the jobs it hosts (what the NPC planner staffs), what it sells (what the vendor UI offers), what it buys from
// the player and opening hours. Pure and deterministic: `purposeFor(lot, layout)` depends only on the layout (seed,
// district, kind, family, size) so every client agrees on what a building is.
//
// Assignment is layout-wide: lots are visited in id order, each rolls a kind from its district's weighted list, and
// neighbouring lots (sharing a street: same block across an alley, or facing across a boulevard / intersection) never
// end up with the same kind + name. Rare kinds a random roll may have skipped are placed by a coverage pass, and a few
// kinds are pinned near the place they belong to (the ship dealer, customs and the repair yard sit at the spaceport
// gate). Owners: the economy/signs workstream extends the catalogue, the NPC workstream reads it (docs/ROUND6_PLAN.md).
import { RNG, hash2 } from '../rng.js';

// ---------------------------------------------------------------------------------------------- catalogue
// kind -> { category, roles: [{ job, count, rooms }], sells?: [{ item, price, stock }], buys?: [itemCategory...],
//           hours: [open, close] (0..24, close may pass 24), names: [pattern...], greeting }
// `sells` items are price-book keys (src/economy/prices.js): food/blocks by name, services (room_night, speeder_ride,
// bacta_shot, ship_*) are handled by the economy. `buys` lists the item categories the vendor purchases from the
// player (food, meat, produce, hide, ore, material; 'any' = a pawn broker).
// Name patterns: {sur} family name, {given} given name, {corp} corporate word, {place} district word, {n} 3-digit
// lot number, {nn} 4-digit number.
export const CATALOGUE = {
  // --- housing
  apartments: { category: 'housing', roles: [{ job: 'concierge', count: 1, rooms: ['lobby_atrium'] }, { job: 'resident', count: 6, rooms: ['family_apartment', 'penthouse', 'hotel_room', 'studio'] }, { job: 'maintenance droid', count: 1, rooms: ['corridor', 'laundry'] }], sells: [{ item: 'room_night', price: 60, stock: 99 }], hours: [0, 24], names: ['{place} Residences {nn}', '{sur} Towers', 'Skyline Habitat {nn}', '{place} Heights', 'Block {nn} Habitats'], greeting: 'Residents and guests only past the lobby. Rooms to let on the upper floors.' },
  hostel: { category: 'housing', roles: [{ job: 'warden', count: 1, rooms: ['lobby_atrium'] }, { job: 'lodger', count: 6, rooms: ['barracks', 'studio', 'cafeteria'] }, { job: 'maintenance droid', count: 1, rooms: ['corridor', 'laundry'] }], sells: [{ item: 'room_night', price: 25, stock: 99 }, { item: 'bread', price: 8, stock: 12 }], hours: [0, 24], names: ['{place} Bunkhouse', "Spacers' Rest {n}", '{sur} Lodging House', 'Dock Row Hostel {n}'], greeting: 'Bunks are twenty-five a night. Lights out at midnight.' },
  luxury_residences: { category: 'housing', roles: [{ job: 'concierge', count: 2, rooms: ['lobby_atrium'] }, { job: 'resident', count: 4, rooms: ['penthouse', 'family_apartment', 'roof_garden'] }, { job: 'guard', count: 1, rooms: ['lobby_atrium', 'security_post'] }, { job: 'protocol droid', count: 1, rooms: ['lobby_atrium', 'corridor'] }], sells: [{ item: 'room_night', price: 140, stock: 99 }], hours: [0, 24], names: ['The {sur} Spire', '{place} Penthouses', 'Republica Annex {n}', '{corp} Executive Residences'], greeting: 'Good day. The concierge will announce you.' },
  // --- offices
  office: { category: 'office', roles: [{ job: 'clerk', count: 6, rooms: ['open_plan_office', 'executive_office'] }, { job: 'executive', count: 1, rooms: ['executive_office', 'meeting_room'] }, { job: 'receptionist', count: 1, rooms: ['lobby_atrium'] }], hours: [7, 19], names: ['{corp} Holdings', '{corp} Systems Annex', '{sur} & {sur} Consultants', '{corp} Interstellar', '{sur} Group'], greeting: 'Do you have an appointment?' },
  bank: { category: 'office', roles: [{ job: 'teller', count: 3, rooms: ['lobby_atrium', 'open_plan_office'] }, { job: 'guard', count: 2, rooms: ['lobby_atrium', 'security_post', 'bank_vault'] }], buys: ['ore'], hours: [8, 18], names: ['Bank of {place}', '{corp} Credit Union', 'Banking Clan — {place} Branch', '{sur} Trust'], greeting: 'The Banking Clan welcomes your deposits. Bullion is bought at the counter.' },
  law_office: { category: 'office', roles: [{ job: 'advocate', count: 3, rooms: ['executive_office', 'meeting_room', 'library'] }, { job: 'clerk', count: 2, rooms: ['open_plan_office', 'archive'] }], hours: [8, 19], names: ['{sur}, {sur} & Associates', '{sur} Legal', 'Chambers of {sur}', '{sur} Advocates'], greeting: 'Consultations by appointment.' },
  insurance: { category: 'office', roles: [{ job: 'underwriter', count: 4, rooms: ['open_plan_office', 'meeting_room'] }, { job: 'clerk', count: 2, rooms: ['open_plan_office', 'archive'] }, { job: 'receptionist', count: 1, rooms: ['lobby_atrium'] }], hours: [8, 18], names: ['{corp} Underwriters', '{place} Mutual Assurance', '{sur} Hull & Cargo Insurance', 'Galactic Indemnity {n}'], greeting: 'Speeder, ship or life? We cover all three.' },
  tech_firm: { category: 'office', roles: [{ job: 'engineer', count: 5, rooms: ['open_plan_office', 'server_room', 'workshop'] }, { job: 'executive', count: 1, rooms: ['executive_office', 'meeting_room'] }, { job: 'astromech', count: 1, rooms: ['server_room', 'corridor'] }], hours: [8, 22], names: ['{corp} Datawork', '{sur} Dynamics', 'Holo-Core Labs {n}', '{place} Cybernetics Software'], greeting: 'The servers are humming. Keep your voice down.' },
  trade_house: { category: 'office', roles: [{ job: 'broker', count: 4, rooms: ['open_plan_office', 'meeting_room'] }, { job: 'courier', count: 2, rooms: ['lobby_atrium', 'corridor'] }, { job: 'receptionist', count: 1, rooms: ['lobby_atrium'] }], buys: ['ore', 'produce'], hours: [6, 20], names: ['{corp} Mercantile Exchange', '{place} Commodities House', '{sur} Trading Company', 'Outer Rim Imports {n}'], greeting: 'Spot prices are on the board. Ore and grain bought in bulk.' },
  // --- government / security
  ministry: { category: 'government', roles: [{ job: 'aide', count: 5, rooms: ['open_plan_office', 'executive_office', 'meeting_room'] }, { job: 'senator', count: 1, rooms: ['executive_office', 'council_chamber'] }, { job: 'guard', count: 2, rooms: ['lobby_atrium', 'security_post'] }, { job: 'protocol droid', count: 1, rooms: ['lobby_atrium', 'corridor'] }], hours: [7, 20], names: ['Ministry of {place} Affairs', 'Office of Senator {sur}', 'Republic {corp} Bureau', 'Committee on {place} Matters'], greeting: 'State your business with the Republic.' },
  courthouse: { category: 'government', roles: [{ job: 'judge', count: 1, rooms: ['courtroom', 'executive_office'] }, { job: 'advocate', count: 2, rooms: ['courtroom', 'meeting_room'] }, { job: 'clerk', count: 2, rooms: ['open_plan_office', 'archive'] }, { job: 'guard', count: 2, rooms: ['lobby_atrium', 'courtroom', 'detention_cell'] }], hours: [8, 18], names: ['{place} District Court', 'Republic Tribunal {n}', 'Court of Appeals — {place}', 'Judiciary Annex {n}'], greeting: 'All rise. Hearings are posted in the lobby.' },
  licensing_office: { category: 'government', roles: [{ job: 'clerk', count: 4, rooms: ['open_plan_office', 'lobby_atrium'] }, { job: 'applicant', count: 4, rooms: ['lobby_atrium', 'corridor'] }, { job: 'protocol droid', count: 1, rooms: ['lobby_atrium'] }], hours: [8, 17], names: ['Bureau of Ships and Services — Office {n}', '{place} Permits & Licensing', 'Speeder Registry {n}', 'Republic Records Office {n}'], greeting: 'Take a ticket. Forms are on the left, complaints on the right.' },
  tax_office: { category: 'government', roles: [{ job: 'auditor', count: 4, rooms: ['open_plan_office', 'archive'] }, { job: 'clerk', count: 2, rooms: ['lobby_atrium', 'open_plan_office'] }, { job: 'guard', count: 1, rooms: ['lobby_atrium'] }], hours: [8, 17], names: ['Republic Revenue Service — {place}', 'Office of Levies {n}', '{place} Tariff Bureau', 'Customs Duties Directorate'], greeting: 'Everything is taxable. Even that.' },
  embassy: { category: 'government', roles: [{ job: 'ambassador', count: 1, rooms: ['executive_office', 'council_chamber'] }, { job: 'aide', count: 3, rooms: ['open_plan_office', 'meeting_room'] }, { job: 'guard', count: 2, rooms: ['lobby_atrium', 'security_post'] }, { job: 'protocol droid', count: 1, rooms: ['lobby_atrium', 'corridor'] }], hours: [9, 18], names: ['Embassy of Naboo', 'Alderaanian Consulate', 'Chandrilan Mission', 'Corellian Trade Legation', 'Mon Cala Embassy', 'Ryloth Delegation House'], greeting: 'Welcome. You are on sovereign ground here.' },
  security_station: { category: 'security', roles: [{ job: 'guard', count: 5, rooms: ['security_post', 'lobby_atrium', 'detention_cell', 'armory'] }, { job: 'officer', count: 1, rooms: ['executive_office', 'control_room'] }], hours: [0, 24], names: ['Coruscant Security — Precinct {n}', 'CSF Station {place}', 'Judicial Outpost {n}', 'Sector {n} Patrol House'], greeting: 'Move along, citizen.' },
  guard_barracks: { category: 'security', roles: [{ job: 'guard', count: 6, rooms: ['barracks', 'armory', 'gym', 'cafeteria'] }, { job: 'officer', count: 1, rooms: ['executive_office', 'control_room'] }, { job: 'cook', count: 1, rooms: ['kitchen', 'cafeteria'] }], hours: [0, 24], names: ['Senate Guard Barracks {n}', 'CSF Garrison {place}', 'Blue Guard Quarters', 'Judicial Forces Depot {n}'], greeting: 'Authorised personnel only past the gate.' },
  private_security: { category: 'security', roles: [{ job: 'contractor', count: 4, rooms: ['open_plan_office', 'armory', 'gym'] }, { job: 'officer', count: 1, rooms: ['executive_office', 'control_room'] }, { job: 'receptionist', count: 1, rooms: ['lobby_atrium'] }], hours: [0, 24], names: ['{sur} Security Contractors', '{corp} Protective Services', 'Ironclad Escorts {n}', 'Bounty Board — {place} Guild Hall'], greeting: 'Bodyguards, escorts, recoveries. Rates are per standard day.' },
  fire_station: { category: 'security', roles: [{ job: 'firefighter', count: 5, rooms: ['garage', 'barracks', 'gym', 'cafeteria'] }, { job: 'operator', count: 1, rooms: ['control_room', 'comms_room'] }, { job: 'fire droid', count: 1, rooms: ['garage', 'corridor'] }], hours: [0, 24], names: ['{place} Emergency Response {n}', 'Fire Suppression Station {n}', 'Rescue Company {n}', 'Coruscant Fire Brigade — {place}'], greeting: 'If it is burning, tell the droid at the desk.' },
  // --- culture
  archive: { category: 'culture', roles: [{ job: 'archivist', count: 3, rooms: ['library', 'archive', 'gallery'] }, { job: 'visitor', count: 3, rooms: ['library', 'museum_hall'] }], hours: [8, 22], names: ['{place} Archives', 'Hall of Records {n}', 'The {sur} Library', '{place} Reading Rooms'], greeting: 'Quiet, please. The records remember everything.' },
  museum: { category: 'culture', roles: [{ job: 'curator', count: 2, rooms: ['museum_hall', 'gallery', 'archive'] }, { job: 'visitor', count: 6, rooms: ['museum_hall', 'gallery', 'lobby_atrium'] }, { job: 'guard', count: 1, rooms: ['museum_hall', 'lobby_atrium'] }], sells: [{ item: 'apple', price: 5, stock: 12 }], hours: [9, 20], names: ['Museum of {place}', 'Galactic Museum Annex {n}', 'The {sur} Collection', 'Hall of Republic History'], greeting: 'Admission is free. The exhibits are not for touching.' },
  art_gallery: { category: 'culture', roles: [{ job: 'curator', count: 1, rooms: ['gallery', 'shop'] }, { job: 'artist', count: 1, rooms: ['gallery', 'studio'] }, { job: 'visitor', count: 4, rooms: ['gallery', 'lounge'] }], sells: [{ item: 'red_wool', price: 8, stock: 16 }, { item: 'blue_wool', price: 8, stock: 16 }, { item: 'green_wool', price: 8, stock: 16 }, { item: 'glow_panel', price: 18, stock: 8 }], buys: ['hide'], hours: [10, 22], names: ['Gallery {sur}', '{place} Fine Arts', 'The Neon Frame', 'Studio {n} Exhibitions'], greeting: 'Everything on the walls is for sale. The walls are not.' },
  holo_theatre: { category: 'culture', roles: [{ job: 'usher', count: 2, rooms: ['lobby_atrium', 'holo_theatre'] }, { job: 'projectionist', count: 1, rooms: ['control_room', 'holo_theatre'] }, { job: 'patron', count: 8, rooms: ['holo_theatre', 'lounge', 'lobby_atrium'] }], sells: [{ item: 'apple', price: 5, stock: 20 }, { item: 'bread', price: 9, stock: 12 }], hours: [12, 26], names: ['{place} Holo-Theatre', 'The {sur} Playhouse', 'Grand Holovid {n}', 'Starlight Cinema {n}'], greeting: 'Next showing in ten minutes. Snacks at the counter.' },
  holo_arcade: { category: 'culture', roles: [{ job: 'attendant', count: 1, rooms: ['arcade', 'shop'] }, { job: 'patron', count: 6, rooms: ['arcade', 'holo_theatre'] }], sells: [{ item: 'apple', price: 5, stock: 10 }], hours: [10, 28], names: ['Holo-Arcade {n}', "{sur}'s Games", 'Dejarik Den', 'Sabacc Simulators {n}'], greeting: 'Tokens are two credits. No cheating the droids.' },
  gym: { category: 'culture', roles: [{ job: 'trainer', count: 1, rooms: ['gym'] }, { job: 'patron', count: 4, rooms: ['gym', 'lounge'] }], hours: [6, 23], names: ['{place} Fitness', 'Iron Nerf Gym', 'Republic Athletic {n}', '{sur} Training Hall'], greeting: 'Lift, citizen. The Republic needs strong backs.' },
  school: { category: 'culture', roles: [{ job: 'teacher', count: 2, rooms: ['school_room', 'library'] }, { job: 'child', count: 8, rooms: ['school_room', 'gym', 'cafeteria'] }], hours: [8, 16], names: ['{place} Academy', 'Republic School {n}', '{sur} Preparatory', 'Level {nn} Primary'], greeting: 'Class is in session.' },
  university: { category: 'culture', roles: [{ job: 'professor', count: 2, rooms: ['school_room', 'library', 'executive_office'] }, { job: 'student', count: 8, rooms: ['school_room', 'library', 'cafeteria', 'lounge'] }, { job: 'archivist', count: 1, rooms: ['archive', 'library'] }], sells: [{ item: 'bookshelf', price: 30, stock: 6 }], hours: [7, 23], names: ['University of {place} — Faculty {n}', '{sur} Institute of Technology', 'Republic Polytechnic {n}', 'College of Xenolinguistics'], greeting: 'Lectures are open to the public. Exams are not.' },
  // --- religion
  temple_annex: { category: 'religion', roles: [{ job: 'acolyte', count: 3, rooms: ['meditation_chamber', 'library', 'garden_terrace'] }], hours: [0, 24], names: ['Meditation Hall {n}', 'Order of {sur}', '{place} Sanctum', 'House of Contemplation {n}'], greeting: 'Peace. Leave your weapons in the vestibule.' },
  shrine: { category: 'religion', roles: [{ job: 'keeper', count: 1, rooms: ['meditation_chamber', 'lobby_atrium'] }, { job: 'pilgrim', count: 4, rooms: ['meditation_chamber', 'garden_terrace', 'corridor'] }], sells: [{ item: 'torch', price: 2, stock: 64 }], hours: [5, 23], names: ['Shrine of the Living Force', 'Chapel of the {place} Stars', 'Wayfarers\u2019 Shrine {n}', 'The Quiet Room'], greeting: 'Light a candle for those still out there.' },
  order_house: { category: 'religion', roles: [{ job: 'monk', count: 4, rooms: ['meditation_chamber', 'library', 'kitchen', 'garden_terrace'] }, { job: 'novice', count: 2, rooms: ['barracks', 'corridor'] }], sells: [{ item: 'bread', price: 6, stock: 16 }], buys: ['produce'], hours: [5, 21], names: ['Brotherhood of {sur}', 'Order of the Silent Sun', 'Monastery of the {place} Wind', 'The Guardians\u2019 Cloister'], greeting: 'The kitchen bakes at dawn. Grain is always welcome.' },
  // --- food and drink
  caf: { category: 'food', roles: [{ job: 'barista', count: 2, rooms: ['restaurant', 'cafeteria', 'kitchen'] }, { job: 'patron', count: 4, rooms: ['restaurant', 'cafeteria', 'lounge'] }], sells: [{ item: 'bread', price: 8, stock: 24 }, { item: 'apple', price: 4, stock: 30 }, { item: 'cooked_chicken', price: 14, stock: 12 }], buys: ['food', 'produce'], hours: [6, 22], names: ["{given}'s Caf", 'The {place} Bean', 'Jawa Juice {n}', '{sur} Caf & Pastry', 'Caf Corner {n}'], greeting: 'Caf is hot, credits up front.' },
  diner: { category: 'food', roles: [{ job: 'cook', count: 2, rooms: ['kitchen'] }, { job: 'waitress droid', count: 1, rooms: ['restaurant'] }, { job: 'patron', count: 5, rooms: ['restaurant'] }], sells: [{ item: 'cooked_beef', price: 16, stock: 16 }, { item: 'cooked_porkchop', price: 16, stock: 16 }, { item: 'bread', price: 8, stock: 20 }, { item: 'apple', price: 4, stock: 20 }], buys: ['food', 'meat', 'produce'], hours: [5, 24], names: ["{given}'s Diner", 'Nerf Steaks {n}', 'The Slider Bar', '{place} Grill', 'Late Shift Diner'], greeting: 'Sit anywhere. Special is nerf steak.' },
  restaurant: { category: 'food', roles: [{ job: 'chef', count: 2, rooms: ['kitchen'] }, { job: 'waiter', count: 2, rooms: ['restaurant', 'lounge'] }, { job: 'patron', count: 6, rooms: ['restaurant', 'lounge'] }], sells: [{ item: 'cooked_beef', price: 22, stock: 10 }, { item: 'cooked_chicken', price: 18, stock: 10 }, { item: 'bread', price: 10, stock: 10 }], buys: ['meat', 'produce'], hours: [11, 25], names: ['Chez {sur}', 'The {place} Table', 'Skyline Dining Room {n}', 'Manarai Terrace'], greeting: 'Reservations recommended. The kitchen buys fresh meat.' },
  bakery: { category: 'food', roles: [{ job: 'baker', count: 2, rooms: ['kitchen'] }, { job: 'vendor', count: 1, rooms: ['shop', 'cafeteria'] }, { job: 'shopper', count: 3, rooms: ['shop'] }], sells: [{ item: 'bread', price: 7, stock: 40 }, { item: 'apple', price: 4, stock: 16 }], buys: ['produce'], hours: [4, 19], names: ["{given}'s Bakery", '{place} Ovens', 'Blue Milk Bakehouse {n}', 'The Flatbread Stand'], greeting: 'Fresh loaves every hour. Wheat bought by the sack.' },
  butcher: { category: 'food', roles: [{ job: 'butcher', count: 2, rooms: ['shop', 'storage', 'kitchen'] }, { job: 'shopper', count: 3, rooms: ['shop'] }], sells: [{ item: 'raw_beef', price: 9, stock: 20 }, { item: 'raw_porkchop', price: 9, stock: 20 }, { item: 'raw_chicken', price: 6, stock: 20 }], buys: ['meat', 'hide'], hours: [5, 19], names: ["{sur}'s Nerf & Bantha", '{place} Meat Market {n}', 'Cold Cuts {n}', 'The Honest Cleaver'], greeting: 'Nerf, bantha, dewback. Hides bought at the back counter.' },
  grocery: { category: 'food', roles: [{ job: 'vendor', count: 2, rooms: ['shop', 'market_stalls', 'storage'] }, { job: 'shopper', count: 5, rooms: ['shop', 'market_stalls'] }], sells: [{ item: 'apple', price: 4, stock: 40 }, { item: 'bread', price: 8, stock: 24 }, { item: 'wheat', price: 3, stock: 32 }, { item: 'seeds', price: 1, stock: 64 }, { item: 'raw_chicken', price: 6, stock: 12 }], buys: ['food', 'produce', 'meat'], hours: [6, 23], names: ['{place} Grocer {n}', "{sur}'s Produce", 'Agri-Corp Outlet {n}', 'Fresh Rations {n}'], greeting: 'Fruit from the agri-worlds, grain from the lower levels.' },
  noodle_bar: { category: 'food', roles: [{ job: 'cook', count: 1, rooms: ['kitchen', 'restaurant'] }, { job: 'patron', count: 6, rooms: ['restaurant', 'cafeteria'] }], sells: [{ item: 'cooked_chicken', price: 12, stock: 20 }, { item: 'bread', price: 7, stock: 16 }], buys: ['meat', 'produce'], hours: [10, 27], names: ['Noodle Bar {n}', "{given}'s Broth House", 'Lower Level Noodles', 'Steam & Salt {n}'], greeting: 'Stand, eat, go. Best broth on this level.' },
  cantina: { category: 'hospitality', roles: [{ job: 'bartender', count: 2, rooms: ['cantina', 'night_club', 'lounge'] }, { job: 'musician', count: 2, rooms: ['cantina', 'night_club'] }, { job: 'bouncer', count: 1, rooms: ['lobby_atrium', 'corridor', 'cantina'] }, { job: 'patron', count: 6, rooms: ['cantina', 'night_club', 'lounge'] }], sells: [{ item: 'bread', price: 10, stock: 10 }, { item: 'cooked_porkchop', price: 18, stock: 10 }], buys: ['food', 'meat'], hours: [16, 30], names: ["{sur}'s Cantina", 'The Outlander Club', 'Blue Dagger Lounge', 'Twin Suns Bar', "Dex's Lounge {n}", 'The Rusty Vaporator'], greeting: 'No blasters, no droids, no credit. The job board is by the door.' },
  // --- hospitality
  hotel: { category: 'hospitality', roles: [{ job: 'receptionist', count: 2, rooms: ['lobby_atrium'] }, { job: 'porter', count: 1, rooms: ['lobby_atrium', 'corridor'] }, { job: 'guest', count: 5, rooms: ['hotel_room', 'lounge'] }], sells: [{ item: 'room_night', price: 60, stock: 99 }], hours: [0, 24], names: ['Hotel {sur}', 'The {place} Grand', '{corp} Suites', 'Hotel Skyhook {n}'], greeting: 'Welcome. Rooms are sixty credits a night.' },
  night_club: { category: 'hospitality', roles: [{ job: 'bartender', count: 2, rooms: ['night_club', 'lounge'] }, { job: 'dancer', count: 2, rooms: ['night_club'] }, { job: 'bouncer', count: 1, rooms: ['lobby_atrium', 'corridor'] }, { job: 'patron', count: 8, rooms: ['night_club', 'lounge'] }], sells: [{ item: 'apple', price: 6, stock: 12 }], hours: [20, 30], names: ['Club {sur}', 'The Glow Pit', 'Neon Bantha', 'Vertical City Nights', 'Bass Level {n}'], greeting: 'Cover is ten credits. Dress code: shiny.' },
  casino: { category: 'hospitality', roles: [{ job: 'croupier', count: 3, rooms: ['night_club', 'lounge'] }, { job: 'bouncer', count: 2, rooms: ['lobby_atrium', 'corridor'] }, { job: 'gambler', count: 8, rooms: ['night_club', 'lounge', 'arcade'] }], sells: [{ item: 'gold_block', price: 260, stock: 1 }], buys: ['ore'], hours: [14, 30], names: ['{sur} Sabacc Palace', 'The Golden Wheel', 'Canto Annex {n}', 'House of Chance {n}'], greeting: 'The house always wins. Gold is accepted at the cage.' },
  bathhouse: { category: 'hospitality', roles: [{ job: 'attendant', count: 2, rooms: ['lobby_atrium', 'dressing_room'] }, { job: 'guest', count: 5, rooms: ['gym', 'lounge', 'dressing_room'] }], sells: [{ item: 'bacta_shot', price: 30, stock: 6 }], hours: [7, 24], names: ['{place} Bathhouse', 'Steam Gardens {n}', '{sur} Spa & Wellness', 'The Vapour Rooms'], greeting: 'Towels are included. Bacta soaks are extra.' },
  // --- retail
  general_store: { category: 'retail', roles: [{ job: 'vendor', count: 2, rooms: ['shop', 'market_stalls', 'storage'] }, { job: 'shopper', count: 3, rooms: ['shop', 'market_stalls'] }], sells: [{ item: 'torch', price: 3, stock: 64 }, { item: 'planks', price: 2, stock: 64 }, { item: 'chest', price: 40, stock: 4 }, { item: 'door', price: 25, stock: 6 }, { item: 'seeds', price: 1, stock: 64 }, { item: 'wool', price: 6, stock: 32 }, { item: 'lantern', price: 12, stock: 16 }], buys: ['material', 'produce'], hours: [8, 21], names: ['{sur} General Supply', '{place} Provisions', 'Galactic Goods {n}', 'Kwikmart {n}', 'Everything Emporium {n}'], greeting: 'Everything you need, nothing you want.' },
  market_stall: { category: 'retail', roles: [{ job: 'vendor', count: 3, rooms: ['market_stalls', 'shop'] }, { job: 'shopper', count: 6, rooms: ['market_stalls', 'corridor'] }, { job: 'astromech', count: 1, rooms: ['market_stalls'] }], sells: [{ item: 'apple', price: 3, stock: 40 }, { item: 'bread', price: 7, stock: 24 }, { item: 'wheat', price: 3, stock: 24 }, { item: 'torch', price: 3, stock: 32 }, { item: 'wool', price: 5, stock: 16 }, { item: 'feather', price: 2, stock: 24 }], buys: ['food', 'produce', 'meat', 'hide'], hours: [6, 22], names: ['{place} Market Stalls {n}', "{given}'s Stall Row", 'Bazaar Level {nn}', 'Open Market {n}'], greeting: 'Fresh in this morning! Haggling costs extra.' },
  hardware_store: { category: 'retail', roles: [{ job: 'vendor', count: 2, rooms: ['shop', 'storage'] }, { job: 'shopper', count: 3, rooms: ['shop'] }], sells: [{ item: 'planks', price: 2, stock: 64 }, { item: 'cobblestone', price: 2, stock: 64 }, { item: 'bricks', price: 4, stock: 64 }, { item: 'glass', price: 5, stock: 48 }, { item: 'stone_bricks', price: 4, stock: 48 }, { item: 'iron_bars', price: 6, stock: 32 }, { item: 'torch', price: 3, stock: 64 }, { item: 'door', price: 25, stock: 8 }], buys: ['material', 'ore'], hours: [7, 20], names: ['{sur} Hardware', '{place} Building Supply', 'Durasteel Direct {n}', 'Bolt & Panel {n}'], greeting: 'Planks, panels, permacrete. Scrap metal bought by weight.' },
  furniture_store: { category: 'retail', roles: [{ job: 'vendor', count: 1, rooms: ['shop', 'lobby_atrium'] }, { job: 'shopper', count: 3, rooms: ['shop'] }, { job: 'cargo droid', count: 1, rooms: ['storage'] }], sells: [{ item: 'bed', price: 45, stock: 6 }, { item: 'chest', price: 40, stock: 6 }, { item: 'table', price: 18, stock: 8 }, { item: 'bookshelf', price: 30, stock: 6 }, { item: 'shelf', price: 15, stock: 8 }, { item: 'lantern', price: 12, stock: 12 }], buys: ['material'], hours: [9, 20], names: ['{sur} Furnishings', '{place} Home & Habitat', 'Skyline Interiors {n}', 'The Sleep Pod Store'], greeting: 'Beds, chests, tables. Delivery by cargo droid.' },
  electronics: { category: 'retail', roles: [{ job: 'vendor', count: 1, rooms: ['shop'] }, { job: 'technician', count: 1, rooms: ['workshop', 'shop'] }, { job: 'shopper', count: 3, rooms: ['shop'] }], sells: [{ item: 'glow_panel', price: 18, stock: 16 }, { item: 'glow_panel_blue', price: 18, stock: 16 }, { item: 'holo_sign', price: 24, stock: 8 }, { item: 'console', price: 55, stock: 4 }], buys: ['ore'], hours: [9, 21], names: ['{sur} Holo-Electronics', 'Circuit Row {n}', '{corp} Components Outlet', 'Glow & Signal {n}'], greeting: 'Panels, holo-signs, consoles. We test everything before it leaves.' },
  droid_shop: { category: 'retail', roles: [{ job: 'vendor', count: 1, rooms: ['shop', 'workshop'] }, { job: 'technician', count: 2, rooms: ['workshop', 'droid_bay'] }, { job: 'astromech', count: 2, rooms: ['droid_bay', 'shop'] }], sells: [{ item: 'iron_block', price: 60, stock: 6 }, { item: 'torch', price: 3, stock: 32 }, { item: 'console', price: 50, stock: 3 }], buys: ['ore'], hours: [8, 20], names: ["{sur}'s Droid Depot", 'Binary Motivators', 'Droid Works {n}', 'Cybot Galactica Outlet'], greeting: 'We speak Bocce. Do you?' },
  tailor: { category: 'retail', roles: [{ job: 'vendor', count: 1, rooms: ['shop'] }, { job: 'tailor', count: 1, rooms: ['workshop', 'studio'] }], sells: [{ item: 'wool', price: 6, stock: 48 }, { item: 'leather', price: 9, stock: 12 }, { item: 'red_wool', price: 7, stock: 16 }, { item: 'blue_wool', price: 7, stock: 16 }], buys: ['hide'], hours: [9, 20], names: ['{sur} Outfitters', 'Senatorial Robes & Tailoring', '{place} Cloth', 'Needle & Thread {n}'], greeting: 'Senatorial cut, or working cut? Leather and feathers bought.' },
  armorer: { category: 'retail', roles: [{ job: 'vendor', count: 1, rooms: ['shop', 'armory'] }, { job: 'armourer', count: 1, rooms: ['workshop', 'armory'] }, { job: 'shopper', count: 2, rooms: ['shop'] }], sells: [{ item: 'iron_block', price: 55, stock: 4 }, { item: 'leather', price: 9, stock: 16 }, { item: 'iron_bars', price: 6, stock: 32 }], buys: ['hide', 'ore'], hours: [9, 21], names: ['{corp} Outfitters', "{sur}'s Armoury", 'Plate & Blaster {n}', 'Mandalorian Ironworks Outlet'], greeting: 'Beskar is out of stock. Durasteel will have to do.' },
  jeweler: { category: 'retail', roles: [{ job: 'vendor', count: 1, rooms: ['shop'] }, { job: 'guard', count: 1, rooms: ['shop', 'lobby_atrium'] }, { job: 'shopper', count: 2, rooms: ['shop'] }], sells: [{ item: 'gold_block', price: 240, stock: 2 }, { item: 'glow_panel', price: 20, stock: 6 }], buys: ['ore'], hours: [10, 19], names: ['{sur} Fine Jewels', 'Corusca Gems {n}', 'The Kyber Case', 'Aurodium & Sons'], greeting: 'Gold and ore appraised while you wait.' },
  bookshop: { category: 'retail', roles: [{ job: 'vendor', count: 1, rooms: ['shop', 'library'] }, { job: 'shopper', count: 3, rooms: ['shop', 'library'] }], sells: [{ item: 'bookshelf', price: 28, stock: 8 }, { item: 'torch', price: 3, stock: 16 }], hours: [9, 21], names: ["{sur}'s Holobooks", 'The Paper Archive', 'Datacron & Dust {n}', '{place} Books'], greeting: 'Real paper on the left, datacrons on the right.' },
  garden_shop: { category: 'retail', roles: [{ job: 'vendor', count: 1, rooms: ['shop', 'greenhouse'] }, { job: 'gardener', count: 1, rooms: ['greenhouse', 'garden_terrace'] }, { job: 'shopper', count: 2, rooms: ['shop', 'greenhouse'] }], sells: [{ item: 'seeds', price: 1, stock: 64 }, { item: 'wheat', price: 3, stock: 24 }, { item: 'dandelion', price: 2, stock: 24 }, { item: 'poppy', price: 2, stock: 24 }, { item: 'oak_log', price: 4, stock: 32 }, { item: 'grass_block', price: 2, stock: 48 }], buys: ['produce'], hours: [7, 20], names: ['{place} Greenhouse Supply', "{given}'s Garden Shop", 'Agri-Dome Outlet {n}', 'Roots & Shoots {n}'], greeting: 'Seeds, soil and saplings. Grain bought back at harvest.' },
  speeder_dealer: { category: 'retail', roles: [{ job: 'vendor', count: 2, rooms: ['shop', 'garage', 'lobby_atrium'] }, { job: 'mechanic', count: 1, rooms: ['garage', 'workshop'] }], sells: [{ item: 'speeder_ride', price: 15, stock: 99 }], buys: ['ore'], hours: [8, 20], names: ['{sur} Speeders', 'Aratech {place}', 'Mobquet Showroom {n}', 'SoroSuub Speeder Mart'], greeting: 'Test drive? Sure. Crash it and you own it.' },
  pawn: { category: 'retail', roles: [{ job: 'broker', count: 1, rooms: ['shop'] }, { job: 'shopper', count: 2, rooms: ['shop'] }], sells: [{ item: 'iron_block', price: 45, stock: 3 }, { item: 'gold_block', price: 220, stock: 1 }, { item: 'chest', price: 30, stock: 3 }, { item: 'lantern', price: 9, stock: 6 }], buys: ['any'], hours: [10, 28], names: ["{sur}'s Pawn", 'Watto Credit & Trade', 'Undercity Exchange {n}', 'Second Chance Goods'], greeting: 'No refunds. No questions. Thirty percent on anything.' },
  // --- medical
  pharmacy: { category: 'medical', roles: [{ job: 'pharmacist', count: 1, rooms: ['shop', 'storage'] }, { job: 'patient', count: 2, rooms: ['shop', 'lounge'] }], sells: [{ item: 'bacta_shot', price: 20, stock: 12 }, { item: 'bread', price: 9, stock: 8 }, { item: 'apple', price: 5, stock: 12 }], hours: [7, 23], names: ['{place} Pharma', 'Bacta & Sundries', 'MedSupply {n}', 'Night Chemist {n}'], greeting: 'Bacta shots are twenty. Try the synth-flesh if you are short.' },
  clinic: { category: 'medical', roles: [{ job: 'medic', count: 3, rooms: ['medbay', 'clinic_ward'] }, { job: 'patient', count: 4, rooms: ['clinic_ward', 'lounge', 'lobby_atrium'] }, { job: 'receptionist', count: 1, rooms: ['lobby_atrium'] }], sells: [{ item: 'bacta_shot', price: 18, stock: 20 }], hours: [0, 24], names: ['{place} Clinic', 'Dr {sur} — Family Medicine', 'MedCenter Annex {n}', 'Level {nn} Walk-In Clinic'], greeting: 'Take a number. The med-droid will see you.' },
  bacta_ward: { category: 'medical', roles: [{ job: 'medic', count: 2, rooms: ['medbay', 'clinic_ward'] }, { job: 'nurse droid', count: 2, rooms: ['medbay', 'corridor'] }, { job: 'patient', count: 5, rooms: ['clinic_ward', 'medbay'] }], sells: [{ item: 'bacta_shot', price: 16, stock: 30 }], hours: [0, 24], names: ['{place} Bacta Ward', 'Thyferra Treatment Centre {n}', 'Tank Ward {n}', 'Recovery Suites — {place}'], greeting: 'Full immersion takes an hour. Shots are quicker.' },
  cybernetics_clinic: { category: 'medical', roles: [{ job: 'surgeon', count: 2, rooms: ['medbay', 'workshop'] }, { job: 'technician', count: 1, rooms: ['workshop', 'droid_bay'] }, { job: 'patient', count: 3, rooms: ['clinic_ward', 'lounge'] }], sells: [{ item: 'bacta_shot', price: 22, stock: 8 }, { item: 'iron_block', price: 58, stock: 2 }], buys: ['ore'], hours: [8, 20], names: ['{sur} Prosthetics', '{place} Cybernetics', 'New Limb Clinic {n}', 'Neuro-Link Surgical'], greeting: 'Arms, legs, eyes. All under warranty for a year.' },
  // --- media
  holonet_office: { category: 'media', roles: [{ job: 'journalist', count: 4, rooms: ['open_plan_office', 'studio'] }, { job: 'technician', count: 2, rooms: ['server_room', 'comms_room', 'control_room'] }], hours: [0, 24], names: ['{place} HoloNews', 'Channel {n} Studios', '{corp} Broadcast', 'The {place} Dispatch'], greeting: 'Live in five, keep it down.' },
  holo_studio: { category: 'media', roles: [{ job: 'producer', count: 1, rooms: ['control_room', 'executive_office'] }, { job: 'performer', count: 3, rooms: ['studio', 'dressing_room'] }, { job: 'technician', count: 2, rooms: ['control_room', 'comms_room'] }], hours: [9, 24], names: ['{sur} Holo-Productions', 'Soundstage {n}', '{place} Recording Studios', 'Blue Screen Pictures'], greeting: 'Recording in progress. Do not open the red door.' },
  advertising_agency: { category: 'media', roles: [{ job: 'copywriter', count: 4, rooms: ['open_plan_office', 'meeting_room'] }, { job: 'executive', count: 1, rooms: ['executive_office'] }, { job: 'receptionist', count: 1, rooms: ['lobby_atrium'] }], sells: [{ item: 'holo_sign', price: 26, stock: 6 }], hours: [9, 20], names: ['{sur} & Partners Advertising', 'Bright Signal Agency', '{place} Holo-Ads {n}', 'Slogan Works'], greeting: 'Your name in lights, five thousand credits a week.' },
  // --- industry
  depot: { category: 'industry', roles: [{ job: 'dock worker', count: 4, rooms: ['storage', 'garage', 'hangar'] }, { job: 'foreman', count: 1, rooms: ['control_room', 'executive_office'] }, { job: 'cargo droid', count: 2, rooms: ['storage', 'corridor'] }], buys: ['material', 'ore', 'produce'], hours: [5, 23], names: ['{corp} Freight Depot', 'Bay {n} Logistics', '{sur} Haulage', 'Dockside Cargo {n}'], greeting: 'Sign the manifest or get off the dock. Jobs on the board.' },
  warehouse: { category: 'industry', roles: [{ job: 'dock worker', count: 3, rooms: ['storage', 'garage'] }, { job: 'clerk', count: 1, rooms: ['open_plan_office', 'control_room'] }, { job: 'cargo droid', count: 2, rooms: ['storage', 'corridor'] }], sells: [{ item: 'planks', price: 2, stock: 128 }, { item: 'cobblestone', price: 2, stock: 128 }, { item: 'chest', price: 36, stock: 8 }], buys: ['material'], hours: [6, 22], names: ['{corp} Storage {n}', '{place} Bonded Warehouse', 'Unit {nn} Self-Store', '{sur} Bulk Goods'], greeting: 'Bulk lots only. Bring a hauler.' },
  foundry: { category: 'industry', roles: [{ job: 'foreman', count: 1, rooms: ['control_room'] }, { job: 'smelter', count: 4, rooms: ['workshop', 'reactor_room', 'storage'] }, { job: 'maintenance droid', count: 2, rooms: ['workshop', 'corridor'] }], sells: [{ item: 'iron_block', price: 52, stock: 8 }, { item: 'iron_bars', price: 5, stock: 64 }], buys: ['ore'], hours: [0, 24], names: ['{corp} Foundry', 'The Works — Line {n}', '{sur} Alloys', 'Smelter {n}'], greeting: 'Hard hats. Eyes on the pour. Ore bought at the gate.' },
  refinery: { category: 'industry', roles: [{ job: 'operator', count: 3, rooms: ['control_room', 'reactor_room'] }, { job: 'technician', count: 2, rooms: ['workshop', 'storage'] }, { job: 'guard', count: 1, rooms: ['security_post', 'lobby_atrium'] }], buys: ['ore'], hours: [0, 24], names: ['{corp} Fuel Refinery', 'Tibanna Processing {n}', '{place} Coaxium Works', 'Hyperfuel Terminal {n}'], greeting: 'No open flames. No exceptions.' },
  power_plant: { category: 'industry', roles: [{ job: 'operator', count: 3, rooms: ['control_room', 'reactor_room'] }, { job: 'engineer', count: 2, rooms: ['workshop', 'server_room'] }, { job: 'maintenance droid', count: 2, rooms: ['reactor_room', 'corridor'] }], sells: [{ item: 'glow_panel', price: 16, stock: 24 }, { item: 'glow_panel_blue', price: 16, stock: 24 }], hours: [0, 24], names: ['{place} Reactor Station {n}', '{corp} Power Authority', 'Substation {nn}', 'Fusion Plant {n}'], greeting: 'Keep clear of the reactor room. Panels sold at the gatehouse.' },
  recycling_plant: { category: 'industry', roles: [{ job: 'sorter', count: 4, rooms: ['workshop', 'storage'] }, { job: 'foreman', count: 1, rooms: ['control_room'] }, { job: 'scrap droid', count: 2, rooms: ['storage', 'corridor'] }], sells: [{ item: 'cobblestone', price: 1, stock: 128 }, { item: 'iron_bars', price: 4, stock: 32 }, { item: 'planks', price: 2, stock: 64 }], buys: ['any'], hours: [6, 22], names: ['{place} Reclamation {n}', "{sur}'s Scrapworks", 'Junk Level Recycling', 'Salvage Yard {n}'], greeting: 'Anything sells here. Thirty percent, cash on the belt.' },
  droid_factory: { category: 'industry', roles: [{ job: 'assembler', count: 4, rooms: ['workshop', 'droid_bay'] }, { job: 'engineer', count: 2, rooms: ['control_room', 'server_room'] }, { job: 'astromech', count: 3, rooms: ['droid_bay', 'corridor'] }], sells: [{ item: 'console', price: 48, stock: 6 }, { item: 'iron_block', price: 56, stock: 4 }], buys: ['ore'], hours: [0, 24], names: ['{corp} Droid Assembly {n}', 'Baktoid Annex {n}', '{place} Automata Plant', 'Motivator Line {n}'], greeting: 'Units roll off every six minutes. Mind the conveyors.' },
  repair_shop: { category: 'industry', roles: [{ job: 'mechanic', count: 3, rooms: ['hangar', 'garage', 'workshop'] }, { job: 'foreman', count: 1, rooms: ['control_room', 'executive_office'] }, { job: 'astromech', count: 1, rooms: ['hangar', 'droid_bay'] }], sells: [{ item: 'iron_bars', price: 6, stock: 32 }, { item: 'torch', price: 3, stock: 32 }], buys: ['ore', 'material'], hours: [6, 22], names: ["{sur}'s Ship Repair", 'Hangar {n} Maintenance', 'Kuat Service Bay {n}', 'Corellian Engineering Outlet'], greeting: 'Leave the ship, keep the credits ready. Repair jobs pay by the part.' },
  // --- transport
  customs: { category: 'transport', roles: [{ job: 'customs officer', count: 3, rooms: ['lobby_atrium', 'security_post', 'open_plan_office'] }, { job: 'guard', count: 2, rooms: ['lobby_atrium', 'security_post'] }, { job: 'passenger', count: 6, rooms: ['lobby_atrium', 'lounge', 'restaurant'] }], hours: [0, 24], names: ['Republic Customs — Terminal {n}', 'Arrivals Hall {n}', 'Spaceport Authority', 'Westport Customs House'], greeting: 'Papers. Cargo manifest. Anything to declare? Courier work on the board.' },
  ship_dealer: { category: 'retail', roles: [{ job: 'vendor', count: 2, rooms: ['shop', 'lobby_atrium', 'hangar'] }, { job: 'mechanic', count: 1, rooms: ['hangar', 'garage'] }], sells: [{ item: 'ship_speeder', price: 4000, stock: 2 }, { item: 'ship_shuttle', price: 14000, stock: 1 }, { item: 'ship_freighter', price: 32000, stock: 1 }, { item: 'ship_yacht', price: 60000, stock: 1 }], hours: [8, 22], names: ['{sur} Starships', 'Nubian Design Collective', 'Sienar Showroom {n}', 'Incom Sales {place}', 'Westport Starship Brokers'], greeting: 'Four classes on the floor, all flight-tested. Your pad is ready when you are.' },
  transit_station: { category: 'transport', roles: [{ job: 'conductor', count: 2, rooms: ['lobby_atrium', 'corridor'] }, { job: 'passenger', count: 8, rooms: ['lobby_atrium', 'lounge'] }, { job: 'guard', count: 1, rooms: ['security_post', 'lobby_atrium'] }], sells: [{ item: 'speeder_ride', price: 12, stock: 99 }], hours: [0, 24], names: ['{place} Station', 'Hyperlane Terminus', 'Transit Hub {n}', 'Level {nn} Interchange'], greeting: 'Mind the doors. Courier jobs on the board by the platform.' },
  taxi_stand: { category: 'transport', roles: [{ job: 'dispatcher', count: 1, rooms: ['lobby_atrium', 'control_room'] }, { job: 'pilot', count: 3, rooms: ['lounge', 'garage', 'lobby_atrium'] }, { job: 'passenger', count: 3, rooms: ['lobby_atrium'] }], sells: [{ item: 'speeder_ride', price: 15, stock: 99 }], hours: [0, 24], names: ['{place} Air Taxi', 'Yellow Fin Cabs {n}', '{sur} Airspeeder Hire', 'Skylane Taxis {n}'], greeting: 'Anywhere in the city, fifteen credits. Hold on to something.' },
  hangar: { category: 'transport', roles: [{ job: 'pilot', count: 2, rooms: ['hangar', 'lounge'] }, { job: 'mechanic', count: 2, rooms: ['hangar', 'workshop'] }, { job: 'astromech', count: 1, rooms: ['hangar', 'droid_bay'] }], buys: ['ore'], hours: [0, 24], names: ['Private Hangar {n}', '{sur} Flight Services', 'Bay {nn} Hangars', '{corp} Executive Aviation'], greeting: 'Private craft only. Fuel is metered.' },
  parking_garage: { category: 'transport', roles: [{ job: 'attendant', count: 2, rooms: ['garage', 'lobby_atrium'] }, { job: 'driver', count: 4, rooms: ['garage', 'corridor'] }, { job: 'security droid', count: 1, rooms: ['garage'] }], sells: [{ item: 'speeder_ride', price: 15, stock: 99 }], hours: [0, 24], names: ['{place} Speeder Park {n}', 'Level {nn} Garage', '{sur} Parking', 'Skydock {n}'], greeting: 'Speeder parking, hourly rates. Rides for hire at the ramp.' },
};

// district -> [kind, weight] (weights favour what a district is for; every kind appears somewhere)
const DISTRICT_KINDS = {
  senate: [['ministry', 5], ['office', 3], ['law_office', 2], ['archive', 1], ['security_station', 1], ['hotel', 1], ['caf', 1], ['courthouse', 2], ['embassy', 3], ['tax_office', 1], ['licensing_office', 1], ['guard_barracks', 1], ['restaurant', 1], ['museum', 1], ['luxury_residences', 1]],
  financial: [['office', 8], ['bank', 3], ['law_office', 2], ['holonet_office', 1], ['hotel', 2], ['caf', 3], ['apartments', 2], ['gym', 1], ['insurance', 3], ['tech_firm', 3], ['trade_house', 2], ['advertising_agency', 1], ['holo_studio', 1], ['restaurant', 1], ['luxury_residences', 2], ['jeweler', 1], ['private_security', 1], ['electronics', 1], ['university', 1], ['licensing_office', 1], ['tax_office', 1], ['parking_garage', 1], ['bookshop', 1], ['noodle_bar', 1], ['museum', 1]],
  residential: [['apartments', 12], ['caf', 2], ['general_store', 2], ['clinic', 2], ['school', 2], ['pharmacy', 2], ['gym', 1], ['tailor', 1], ['diner', 2], ['grocery', 3], ['bakery', 2], ['butcher', 1], ['hardware_store', 1], ['furniture_store', 1], ['garden_shop', 1], ['bookshop', 1], ['shrine', 1], ['temple_annex', 1], ['order_house', 1], ['fire_station', 1], ['security_station', 1], ['holo_theatre', 1], ['noodle_bar', 1], ['bacta_ward', 1], ['cybernetics_clinic', 1], ['parking_garage', 1], ['taxi_stand', 1], ['hostel', 1], ['art_gallery', 1], ['luxury_residences', 1], ['transit_station', 1]],
  industrial: [['depot', 4], ['foundry', 2], ['repair_shop', 2], ['droid_shop', 1], ['office', 1], ['diner', 2], ['security_station', 1], ['warehouse', 3], ['refinery', 1], ['power_plant', 1], ['recycling_plant', 2], ['droid_factory', 2], ['hangar', 1], ['hostel', 2], ['noodle_bar', 1], ['hardware_store', 1], ['armorer', 1], ['fire_station', 1], ['electronics', 1], ['transit_station', 1], ['taxi_stand', 1], ['guard_barracks', 1]],
  entertainment: [['cantina', 5], ['hotel', 2], ['holo_arcade', 2], ['diner', 2], ['apartments', 1], ['tailor', 1], ['pawn', 2], ['speeder_dealer', 1], ['night_club', 3], ['casino', 2], ['bathhouse', 1], ['holo_theatre', 2], ['noodle_bar', 2], ['hostel', 1], ['art_gallery', 1], ['holo_studio', 1], ['clinic', 1], ['private_security', 1], ['taxi_stand', 1], ['butcher', 1], ['market_stall', 1]],
  market: [['general_store', 3], ['diner', 1], ['caf', 1], ['droid_shop', 1], ['tailor', 1], ['pharmacy', 1], ['pawn', 1], ['apartments', 1], ['market_stall', 4], ['grocery', 2], ['bakery', 1], ['butcher', 1], ['hardware_store', 1], ['furniture_store', 1], ['electronics', 1], ['garden_shop', 1], ['jeweler', 1], ['armorer', 1], ['bookshop', 1]],
  spaceport: [['customs', 2], ['depot', 2], ['repair_shop', 2], ['ship_dealer', 1], ['caf', 1], ['hotel', 1], ['transit_station', 1], ['hangar', 1], ['taxi_stand', 1], ['noodle_bar', 1], ['hostel', 1]],
};

// landmark families and undercity/market/spaceport buildings map straight to kinds
const FAMILY_KINDS = {
  senate: 'ministry', chancellery: 'ministry', temple: 'temple_annex', detention: 'security_station', holonet: 'holonet_office',
  medcenter: 'clinic', opera: 'holo_theatre', republica: 'luxury_residences', works: 'foundry', market: 'market_stall', underworld: 'cantina',
  plaza_monument: 'museum', spaceport: 'customs', station: 'transit_station',
};

// Kinds a random roll must not skip: the coverage pass gives each of them at least `min` lots, and `near` pins the
// first of them to the eligible lot closest to a world position (the spaceport gate for anything to do with ships).
// A kind listed here is placed in any district whose list contains it; `districts` widens that set.
const SPACEPORT_GATE = [2735, 0];
const PINNED = [
  { kind: 'ship_dealer', min: 1, near: SPACEPORT_GATE, districts: ['market', 'industrial'] },
  { kind: 'customs', min: 1, near: [2735, -40], districts: ['market', 'industrial'] },
  { kind: 'repair_shop', min: 2, near: [2735, 40], districts: ['market', 'industrial'] },
  { kind: 'transit_station', min: 4 },
  { kind: 'taxi_stand', min: 3 },
  { kind: 'depot', min: 4 },
  { kind: 'cantina', min: 4 },
];

const SUR = ['Antilles', 'Organa', 'Bibble', 'Valorum', 'Taa', 'Mothma', 'Dodonna', 'Tarkin', 'Piett', 'Veers', 'Krennic', 'Andor', 'Erso', 'Syndulla', 'Wren', 'Bridger', 'Kryze', 'Vizsla', 'Fett', 'Kenobi', 'Windu', 'Fisto', 'Koon', 'Tiin', 'Ti', 'Mundi', 'Amidala', 'Naberrie', 'Panaka', 'Typho', 'Dooku', 'Palpatine', 'Amedda', 'Sate', 'Bane', 'Vos', 'Tano', 'Offee', 'Secura', 'Unduli', 'Gallia', 'Rancisis', 'Yaddle', 'Poof', 'Piell', 'Allie', 'Drallig', 'Halcyon', 'Horn', 'Solo', 'Calrissian', 'Dameron', 'Tico', 'Holdo', 'Ackbar', 'Nunb', 'Madine', 'Rieekan', 'Cracken', 'Dreis', 'Porkins', 'Klivian', 'Janson', 'Celchu', 'Darklighter', 'Merrick', 'Draven', 'Malbus', 'Rook', 'Imwe', 'Vantor', 'Quell', 'Marek', 'Starkiller', 'Kestis', 'Dume', 'Jarrus', 'Orrelios', 'Zeb', 'Wexley', 'Bey', 'Pava', 'Kun', 'Talon', 'Xizor', 'Fel', 'Thrawn', 'Pellaeon', 'Isard', 'Zsinj'];
const GIVEN = ['Dex', 'Bail', 'Padme', 'Jar', 'Mon', 'Wilhuff', 'Cassian', 'Jyn', 'Hera', 'Sabine', 'Ezra', 'Bo', 'Boba', 'Obi', 'Mace', 'Kit', 'Plo', 'Saesee', 'Shaak', 'Ki-Adi', 'Sio', 'Finis', 'Orn', 'Mas', 'Cad', 'Quinlan', 'Ahsoka', 'Barriss', 'Aayla', 'Luminara', 'Adi', 'Oppo', 'Even', 'Stass', 'Cin', 'Nejaa', 'Corran', 'Wedge', 'Biggs', 'Jek', 'Hobbie', 'Wes', 'Tycho', 'Garven', 'Crix', 'Carlist', 'Airen', 'Bodhi', 'Baze', 'Chirrut', 'Lando', 'Poe', 'Rose', 'Amilyn', 'Gial', 'Nien', 'Zev', 'Dak', 'Tobias', 'Qi\u2019ra', 'Val', 'Rio', 'Enfys', 'Kanan', 'Zeb', 'Cal', 'Cere', 'Greez', 'Merrin', 'Trilla', 'Vaneé', 'Osha', 'Mae', 'Sol', 'Yord', 'Jecki'];
const CORP = ['Kuat', 'Sienar', 'Incom', 'Corellian', 'Czerka', 'Aratech', 'Mobquet', 'SoroSuub', 'BlasTech', 'Merr-Sonn', 'Cybot', 'Industrial Automaton', 'Arakyd', 'Baktoid', 'TaggeCo', 'Santhe', 'Loronar', 'Rendili', 'Nubian', 'Hoersch-Kessel', 'Damorian', 'Tagge', 'Trade Federation', 'Techno Union', 'Bespin Motors', 'Ubrikkian', 'Slayn & Korpil', 'Koensayr', 'Chiewab', 'Zaltin', 'Xizor Transport', 'Thyferra Bacta', 'Kessel Mining', 'Corusca Metals', 'Verpine Systems', 'Chandrila Holdings', 'Sullustan Freight', 'Gozanti Lines', 'Mandal Motors', 'Theed Palace Engineering'];
const PLACE = { senate: 'Senate District', financial: 'Federal District', residential: 'Skyline', industrial: 'The Works', entertainment: 'Uscru', market: 'CoCo Town', spaceport: 'Westport', default: 'Galactic City' };

function fill(pattern, rng, district, n) {
  return pattern
    .replace(/\{sur\}/g, () => SUR[Math.floor(rng.next() * SUR.length)])
    .replace(/\{given\}/g, () => GIVEN[Math.floor(rng.next() * GIVEN.length)])
    .replace(/\{corp\}/g, () => CORP[Math.floor(rng.next() * CORP.length)])
    .replace(/\{place\}/g, PLACE[district] || PLACE.default)
    .replace(/\{nn\}/g, String(1000 + ((n * 7919) % 9000)))
    .replace(/\{n\}/g, String(n));
}

function pickWeighted(list, rng) {
  let total = 0; for (const [, w] of list) total += w;
  let r = rng.next() * total;
  for (const [k, w] of list) { r -= w; if (r <= 0) return k; }
  return list[list.length - 1][0];
}

// Kinds that need a real footprint / that only make sense at height (applied after the district roll).
function constrainKind(kind, lot, district) {
  const area = (lot.w || 20) * (lot.d || 20);
  if (area < 300 && ['hotel', 'ministry', 'depot', 'warehouse', 'courthouse', 'embassy', 'power_plant', 'refinery', 'droid_factory', 'university', 'museum', 'casino', 'transit_station', 'hangar', 'parking_garage', 'guard_barracks', 'fire_station'].includes(kind)) {
    kind = district === 'residential' ? 'caf' : district === 'industrial' ? 'repair_shop' : district === 'entertainment' ? 'noodle_bar' : 'office';
  }
  if ((lot.height || 0) >= 140 && !['apartments', 'office', 'hotel', 'luxury_residences', 'tech_firm', 'insurance', 'bank'].includes(kind)) {
    kind = district === 'residential' ? 'apartments' : district === 'financial' && lot.seed % 3 === 0 ? 'luxury_residences' : 'office';
  }
  return kind;
}

// Two lots share a street when their footprints are within a street's width of each other (alleys are 3-5 wide,
// a boulevard with its margins is 20): same block across an alley, facing across a boulevard, or diagonal across an
// intersection. Exported for the test harness.
export const STREET_GAP = 22;
export function areNeighbours(a, b) {
  if (a === b || a.id === b.id) return false;
  const gapX = Math.max(a.x0 - b.x1, b.x0 - a.x1), gapZ = Math.max(a.z0 - b.z1, b.z0 - a.z1);
  return gapX <= STREET_GAP && gapZ <= STREET_GAP;
}
export function neighboursOf(lot, layout) {
  const g = STREET_GAP;
  const near = layout.lotsIn ? layout.lotsIn(lot.x0 - g, lot.z0 - g, lot.x1 + g, lot.z1 + g) : layout.lots;
  return near.filter((o) => (o.kind === 'tower' || o.kind === 'landmark') && areNeighbours(lot, o));
}

const isBuilding = (lot) => lot.kind === 'tower' || lot.kind === 'landmark';
const lotRng = (lot, salt = 0x5157) => new RNG((((lot.seed ?? hash2(lot.x0 | 0, lot.z0 | 0)) >>> 0) ^ salt) >>> 0);
const lotNumber = (lot) => 100 + (((lot.seed ?? 0) >>> 0) % 900);

function makePurpose(lot, kind, name, district) {
  const def = CATALOGUE[kind];
  return { id: lot.id, kind, category: def.category, name, roles: def.roles, sells: def.sells || [], buys: def.buys || [], hours: def.hours, greeting: def.greeting, district };
}

// Standalone roll (no layout: synthetic lots such as undercity buildings or spaceport halls; also the seed of the
// layout-wide assignment). `avoidKinds` lets the assignment steer away from a neighbour's kind.
function rollPurpose(lot, avoidKinds = null) {
  const rng = lotRng(lot);
  const district = lot.district || 'residential';
  let kind = lot.purpose || (lot.kind === 'landmark' ? FAMILY_KINDS[lot.family] : null);
  const fixed = !!(kind && CATALOGUE[kind]);
  if (!fixed) {
    const list = DISTRICT_KINDS[district] || DISTRICT_KINDS.residential;
    kind = constrainKind(pickWeighted(list, rng), lot, district);
    // soft rule: a few rerolls to avoid the same kind as a neighbour (a street of five cafs is dull)
    for (let t = 0; t < 4 && avoidKinds && avoidKinds.has(kind); t++) kind = constrainKind(pickWeighted(list, rng), lot, district);
  }
  const def = CATALOGUE[kind];
  const n = lotNumber(lot);
  const name = lot.kind === 'landmark' && lot.name ? lot.name : fill(def.names[Math.floor(rng.next() * def.names.length)], rng, district, n);
  return { purpose: makePurpose(lot, kind, name, district), rng, fixed };
}

// Layout-wide assignment: id order, neighbour-aware, then coverage + pins. Memoised per layout seed.
const assignments = new Map();
function assign(layout) {
  let map = assignments.get(layout.seed);
  if (map) return map;
  map = new Map();
  const lots = layout.lots.filter(isBuilding);
  const nameKey = (p) => p.kind + '|' + p.name;
  const cityNames = new Set();   // names used anywhere in the city: a second "Iron Nerf Gym" becomes "Iron Nerf Gym II"
  const distinctName = (lot, p, rng, taken) => {
    // hard rule: no neighbour shares kind + name (and no name repeats city-wide while patterns allow): reroll the
    // name a few times, then number it
    const def = CATALOGUE[p.kind];
    const clash = () => taken.has(nameKey(p)) || cityNames.has(p.name);
    for (let t = 0; t < 6 && clash(); t++) p.name = fill(def.names[Math.floor(rng.next() * def.names.length)], rng, p.district, lotNumber(lot) + t + 1);
    const base = p.name;
    for (let k = 2; clash() && k <= 10; k++) p.name = `${base} ${['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][k - 2]}`;
    if (clash()) p.name = `${base} ${lot.id}`;
    cityNames.add(p.name);
  };
  for (const lot of lots) {
    const nbLots = neighboursOf(lot, layout);
    const nb = nbLots.map((o) => map.get(o.id)).filter(Boolean);
    // the soft rule only looks at tower neighbours: the Senate should be ringed by ministries, not scared of them
    const avoid = new Set(nbLots.filter((o) => o.kind === 'tower' && map.has(o.id)).map((o) => map.get(o.id).kind));
    const { purpose, rng } = rollPurpose(lot, avoid);
    if (lot.kind !== 'landmark') distinctName(lot, purpose, rng, new Set(nb.map(nameKey))); else cityNames.add(purpose.name);
    map.set(lot.id, purpose);
  }
  // coverage: kinds with a minimum count, pinned near a spot when asked
  const counts = new Map();
  for (const p of map.values()) counts.set(p.kind, (counts.get(p.kind) || 0) + 1);
  const eligible = (lot, kind, districts) => {
    if (lot.kind !== 'tower' || lot.purpose) return false;
    const inList = (DISTRICT_KINDS[lot.district] || []).some(([k]) => k === kind) || (districts && districts.includes(lot.district));
    if (!inList) return false;
    if (constrainKind(kind, lot, lot.district) !== kind) return false;
    const cur = map.get(lot.id);
    return (counts.get(cur.kind) || 0) > 3 && !PINNED.some((pn) => pn.kind === cur.kind);   // never starve another kind
  };
  const place = (lot, kind) => {
    const cur = map.get(lot.id);
    counts.set(cur.kind, counts.get(cur.kind) - 1);
    const rng = lotRng(lot, 0x7A11);
    const def = CATALOGUE[kind];
    const p = makePurpose(lot, kind, fill(def.names[Math.floor(rng.next() * def.names.length)], rng, lot.district, lotNumber(lot)), lot.district);
    const taken = new Set(neighboursOf(lot, layout).map((o) => map.get(o.id)).filter(Boolean).map(nameKey));
    distinctName(lot, p, rng, taken);
    map.set(lot.id, p);
    counts.set(kind, (counts.get(kind) || 0) + 1);
  };
  const wanted = [...PINNED];
  for (const kind of Object.keys(CATALOGUE)) if (!wanted.some((w) => w.kind === kind)) wanted.push({ kind, min: 1 });
  for (const w of wanted) {
    let have = counts.get(w.kind) || 0;
    if (have >= w.min) continue;
    let cands = lots.filter((l) => eligible(l, w.kind, w.districts));
    if (w.near) cands.sort((a, b) => Math.hypot((a.x0 + a.x1) / 2 - w.near[0], (a.z0 + a.z1) / 2 - w.near[1]) - Math.hypot((b.x0 + b.x1) / 2 - w.near[0], (b.z0 + b.z1) / 2 - w.near[1]));
    for (const lot of cands) {
      if (have >= w.min) break;
      const nb = neighboursOf(lot, layout).map((o) => map.get(o.id)).filter(Boolean);
      if (nb.some((p) => p.kind === w.kind)) continue;
      place(lot, w.kind); have++;
    }
  }
  assignments.set(layout.seed, map);
  return map;
}

const standalone = new Map();

// The purpose of a lot: { id, kind, category, name, roles, sells, buys, hours, greeting, district }. Lots of a
// layout come from the layout-wide assignment (neighbour rule, coverage, pins); synthetic lots (undercity buildings
// pass `{ district: 'entertainment' }`, spaceport halls `{ district: 'spaceport' }`) roll on their own. `lot.purpose`
// (set by a builder) overrides the kind; landmarks keep their names.
export function purposeFor(lot, layout = null) {
  if (layout && layout.lots && lot.id != null && layout.lots[lot.id] === lot && isBuilding(lot)) {
    const p = assign(layout).get(lot.id);
    if (p) return p;
  }
  const key = `${layout ? layout.seed : 0}:${lot.id}:${lot.x0},${lot.z0}:${lot.purpose || ''}`;
  let p = standalone.get(key);
  if (!p) { p = rollPurpose(lot).purpose; standalone.set(key, p); }
  return p;
}

// Whether the purpose is open at `hour` (0..24, fractional); hours past 24 wrap (a cantina open 16..30 closes at 6).
export function isOpen(purpose, hour) {
  const [a, b] = purpose.hours;
  if (b >= 24 && a <= 24) return hour >= a || hour < b - 24;
  return hour >= a && hour < b;
}

// Every purpose in the layout, for tests and census tooling: [{ lot, purpose }].
export function allPurposes(layout) {
  return layout.lots.filter(isBuilding).map((lot) => ({ lot, purpose: purposeFor(lot, layout) }));
}

// Lots whose purpose is one of `kinds` (or all purposed lots when omitted), for the economy's job board and signs.
export function lotsOfKind(layout, kinds = null) {
  const set = kinds ? new Set(Array.isArray(kinds) ? kinds : [kinds]) : null;
  return allPurposes(layout).filter(({ purpose }) => !set || set.has(purpose.kind));
}

export const CATEGORIES = [...new Set(Object.values(CATALOGUE).map((d) => d.category))];
export const KINDS = Object.keys(CATALOGUE);
