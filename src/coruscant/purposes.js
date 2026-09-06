// Building purposes for Coruscant (rubric 07/08): every lot gets a category, a specific kind, a Star-Wars-flavoured
// name, the jobs it hosts (what the NPC planner staffs), what it sells (what the vendor UI offers) and opening hours.
// Pure and deterministic: `purposeFor(lot, layout)` depends only on the lot (seed, district, kind, family, size) so
// every client agrees on what a building is. Owners: the economy/signs workstream extends the catalogue, the NPC
// workstream reads it (docs/ROUND6_PLAN.md).
import { RNG, hash2 } from '../rng.js';

// ---------------------------------------------------------------------------------------------- catalogue
// kind -> { category, roles: [{ job, count, rooms }], sells?: [{ item, price, stock }], hours: [open, close] (0..24),
//           names: [pattern...], greeting }
// Name patterns: {sur} family name, {given} given name, {corp} corporate word, {place} district word, {n} lot number.
export const CATALOGUE = {
  // --- housing
  apartments: { category: 'housing', roles: [{ job: 'concierge', count: 1, rooms: ['lobby_atrium'] }, { job: 'resident', count: 6, rooms: ['family_apartment', 'penthouse', 'hotel_room', 'studio'] }, { job: 'maintenance droid', count: 1, rooms: ['corridor', 'laundry'] }], hours: [0, 24], names: ['{place} Residences {n}', '{sur} Towers', 'Skyline Habitat {n}', '{place} Heights'], greeting: 'Residents and guests only past the lobby.' },
  hotel: { category: 'hospitality', roles: [{ job: 'receptionist', count: 2, rooms: ['lobby_atrium'] }, { job: 'porter', count: 1, rooms: ['lobby_atrium', 'corridor'] }, { job: 'guest', count: 5, rooms: ['hotel_room', 'lounge'] }], sells: [{ item: 'room_night', price: 60, stock: 99 }], hours: [0, 24], names: ['Hotel {sur}', 'The {place} Grand', '{corp} Suites'], greeting: 'Welcome. Rooms are sixty credits a night.' },
  // --- offices
  office: { category: 'office', roles: [{ job: 'clerk', count: 6, rooms: ['open_plan_office', 'executive_office'] }, { job: 'executive', count: 1, rooms: ['executive_office', 'meeting_room'] }, { job: 'receptionist', count: 1, rooms: ['lobby_atrium'] }], hours: [7, 19], names: ['{corp} Holdings', '{corp} Systems Annex', '{sur} & {sur} Consultants', '{corp} Interstellar'], greeting: 'Do you have an appointment?' },
  bank: { category: 'office', roles: [{ job: 'teller', count: 3, rooms: ['lobby_atrium', 'open_plan_office'] }, { job: 'guard', count: 2, rooms: ['lobby_atrium', 'security_post', 'bank_vault'] }], sells: [], hours: [8, 18], names: ['Bank of {place}', '{corp} Credit Union', 'InterGalactic Banking Clan — {place} Branch'], greeting: 'The Banking Clan welcomes your deposits.' },
  law_office: { category: 'office', roles: [{ job: 'advocate', count: 3, rooms: ['executive_office', 'meeting_room', 'library'] }, { job: 'clerk', count: 2, rooms: ['open_plan_office', 'archive'] }], hours: [8, 19], names: ['{sur}, {sur} & Associates', '{sur} Legal', 'Chambers of {sur}'], greeting: 'Consultations by appointment.' },
  holonet_office: { category: 'media', roles: [{ job: 'journalist', count: 4, rooms: ['open_plan_office', 'studio'] }, { job: 'technician', count: 2, rooms: ['server_room', 'comms_room', 'control_room'] }], hours: [0, 24], names: ['{place} HoloNews', 'Channel {n} Studios', '{corp} Broadcast'], greeting: 'Live in five, keep it down.' },
  // --- government / security
  ministry: { category: 'government', roles: [{ job: 'aide', count: 5, rooms: ['open_plan_office', 'executive_office', 'meeting_room'] }, { job: 'senator', count: 1, rooms: ['executive_office', 'council_chamber'] }, { job: 'guard', count: 2, rooms: ['lobby_atrium', 'security_post'] }, { job: 'protocol droid', count: 1, rooms: ['lobby_atrium', 'corridor'] }], hours: [7, 20], names: ['Ministry of {place} Affairs', 'Office of Senator {sur}', 'Republic {corp} Bureau', 'Committee on {place} Matters'], greeting: 'State your business with the Republic.' },
  security_station: { category: 'security', roles: [{ job: 'guard', count: 5, rooms: ['security_post', 'lobby_atrium', 'detention_cell', 'armory'] }, { job: 'officer', count: 1, rooms: ['executive_office', 'control_room'] }], hours: [0, 24], names: ['Coruscant Security — Precinct {n}', 'CSF Station {place}', 'Judicial Outpost {n}'], greeting: 'Move along, citizen.' },
  archive: { category: 'culture', roles: [{ job: 'archivist', count: 3, rooms: ['library', 'archive', 'gallery'] }, { job: 'visitor', count: 3, rooms: ['library', 'museum_hall'] }], hours: [8, 22], names: ['{place} Archives', 'Hall of Records {n}', 'The {sur} Library'], greeting: 'Quiet, please. The records remember everything.' },
  // --- food and drink
  caf: { category: 'food', roles: [{ job: 'barista', count: 2, rooms: ['restaurant', 'cafeteria', 'kitchen'] }, { job: 'patron', count: 4, rooms: ['restaurant', 'cafeteria', 'lounge'] }], sells: [{ item: 'bread', price: 8, stock: 24 }, { item: 'apple', price: 4, stock: 30 }, { item: 'cooked_chicken', price: 14, stock: 12 }], hours: [6, 22], names: ["{given}'s Caf", 'The {place} Bean', 'Jawa Juice {n}', '{sur} Caf & Pastry'], greeting: 'Caf is hot, credits up front.' },
  diner: { category: 'food', roles: [{ job: 'cook', count: 2, rooms: ['kitchen'] }, { job: 'waitress droid', count: 1, rooms: ['restaurant'] }, { job: 'patron', count: 5, rooms: ['restaurant'] }], sells: [{ item: 'cooked_beef', price: 16, stock: 16 }, { item: 'cooked_porkchop', price: 16, stock: 16 }, { item: 'bread', price: 8, stock: 20 }, { item: 'apple', price: 4, stock: 20 }], hours: [5, 24], names: ["{given}'s Diner", 'Nerf Steaks {n}', 'The Slider Bar', '{place} Grill'], greeting: 'Sit anywhere. Special is nerf steak.' },
  cantina: { category: 'hospitality', roles: [{ job: 'bartender', count: 2, rooms: ['cantina', 'night_club', 'lounge'] }, { job: 'musician', count: 2, rooms: ['cantina', 'night_club'] }, { job: 'bouncer', count: 1, rooms: ['lobby_atrium', 'corridor', 'cantina'] }, { job: 'patron', count: 6, rooms: ['cantina', 'night_club', 'lounge'] }], sells: [{ item: 'bread', price: 10, stock: 10 }, { item: 'cooked_porkchop', price: 18, stock: 10 }], hours: [16, 30], names: ["{sur}'s Cantina", 'The Outlander Club', 'Blue Dagger Lounge', 'Twin Suns Bar', "Dex's Lounge {n}"], greeting: 'No blasters, no droids, no credit.' },
  // --- retail
  general_store: { category: 'retail', roles: [{ job: 'vendor', count: 2, rooms: ['shop', 'market_stalls', 'storage'] }, { job: 'shopper', count: 3, rooms: ['shop', 'market_stalls'] }], sells: [{ item: 'torch', price: 3, stock: 64 }, { item: 'planks', price: 2, stock: 64 }, { item: 'chest', price: 40, stock: 4 }, { item: 'door', price: 25, stock: 6 }, { item: 'seeds', price: 1, stock: 64 }, { item: 'wool', price: 6, stock: 32 }], hours: [8, 21], names: ['{sur} General Supply', '{place} Provisions', 'Galactic Goods {n}', 'Kwikmart {n}'], greeting: 'Everything you need, nothing you want.' },
  droid_shop: { category: 'retail', roles: [{ job: 'vendor', count: 1, rooms: ['shop', 'workshop'] }, { job: 'technician', count: 2, rooms: ['workshop', 'droid_bay'] }, { job: 'astromech', count: 2, rooms: ['droid_bay', 'shop'] }], sells: [{ item: 'iron_block', price: 60, stock: 6 }, { item: 'torch', price: 3, stock: 32 }], hours: [8, 20], names: ["{sur}'s Droid Depot", 'Binary Motivators', 'Droid Works {n}', 'Cybot Galactica Outlet'], greeting: 'We speak Bocce. Do you?' },
  tailor: { category: 'retail', roles: [{ job: 'vendor', count: 1, rooms: ['shop'] }, { job: 'tailor', count: 1, rooms: ['workshop', 'studio'] }], sells: [{ item: 'wool', price: 6, stock: 48 }, { item: 'leather', price: 9, stock: 12 }], hours: [9, 20], names: ['{sur} Outfitters', 'Senatorial Robes & Tailoring', '{place} Cloth'], greeting: 'Senatorial cut, or working cut?' },
  speeder_dealer: { category: 'retail', roles: [{ job: 'vendor', count: 2, rooms: ['shop', 'garage', 'lobby_atrium'] }, { job: 'mechanic', count: 1, rooms: ['garage', 'workshop'] }], sells: [{ item: 'speeder_ride', price: 15, stock: 99 }], hours: [8, 20], names: ['{sur} Speeders', 'Aratech {place}', 'Mobquet Showroom {n}'], greeting: 'Test drive? Sure. Crash it and you own it.' },
  pharmacy: { category: 'medical', roles: [{ job: 'pharmacist', count: 1, rooms: ['shop', 'storage'] }, { job: 'patient', count: 2, rooms: ['shop', 'lounge'] }], sells: [{ item: 'bread', price: 9, stock: 8 }, { item: 'apple', price: 5, stock: 12 }], hours: [7, 23], names: ['{place} Pharma', 'Bacta & Sundries', 'MedSupply {n}'], greeting: 'Bacta is out. Try the synth-flesh.' },
  // --- medical
  clinic: { category: 'medical', roles: [{ job: 'medic', count: 3, rooms: ['medbay', 'clinic_ward'] }, { job: 'patient', count: 4, rooms: ['clinic_ward', 'lounge', 'lobby_atrium'] }, { job: 'receptionist', count: 1, rooms: ['lobby_atrium'] }], hours: [0, 24], names: ['{place} Clinic', 'Dr {sur} — Family Medicine', 'MedCenter Annex {n}'], greeting: 'Take a number. The med-droid will see you.' },
  // --- culture / entertainment
  holo_arcade: { category: 'culture', roles: [{ job: 'attendant', count: 1, rooms: ['arcade', 'shop'] }, { job: 'patron', count: 6, rooms: ['arcade', 'holo_theatre'] }], sells: [{ item: 'apple', price: 5, stock: 10 }], hours: [10, 28], names: ['Holo-Arcade {n}', "{sur}'s Games", 'Dejarik Den'], greeting: 'Tokens are two credits. No cheating the droids.' },
  gym: { category: 'culture', roles: [{ job: 'trainer', count: 1, rooms: ['gym'] }, { job: 'patron', count: 4, rooms: ['gym', 'lounge'] }], hours: [6, 23], names: ['{place} Fitness', 'Iron Nerf Gym', 'Republic Athletic {n}'], greeting: 'Lift, citizen. The Republic needs strong backs.' },
  school: { category: 'culture', roles: [{ job: 'teacher', count: 2, rooms: ['school_room', 'library'] }, { job: 'child', count: 8, rooms: ['school_room', 'gym', 'cafeteria'] }], hours: [8, 16], names: ['{place} Academy', 'Republic School {n}', '{sur} Preparatory'], greeting: 'Class is in session.' },
  temple_annex: { category: 'religion', roles: [{ job: 'acolyte', count: 3, rooms: ['meditation_chamber', 'library', 'garden_terrace'] }], hours: [0, 24], names: ['Meditation Hall {n}', 'Order of {sur}', '{place} Sanctum'], greeting: 'Peace. Leave your weapons in the vestibule.' },
  // --- industry / transport
  depot: { category: 'industry', roles: [{ job: 'dock worker', count: 4, rooms: ['storage', 'garage', 'hangar'] }, { job: 'foreman', count: 1, rooms: ['control_room', 'executive_office'] }, { job: 'cargo droid', count: 2, rooms: ['storage', 'corridor'] }], hours: [5, 23], names: ['{corp} Freight Depot', 'Bay {n} Logistics', '{sur} Haulage'], greeting: 'Sign the manifest or get off the dock.' },
  foundry: { category: 'industry', roles: [{ job: 'foreman', count: 1, rooms: ['control_room'] }, { job: 'smelter', count: 4, rooms: ['workshop', 'reactor_room', 'storage'] }, { job: 'maintenance droid', count: 2, rooms: ['workshop', 'corridor'] }], hours: [0, 24], names: ['{corp} Foundry', 'The Works — Line {n}', '{sur} Alloys'], greeting: 'Hard hats. Eyes on the pour.' },
  repair_shop: { category: 'industry', roles: [{ job: 'mechanic', count: 3, rooms: ['hangar', 'garage', 'workshop'] }, { job: 'foreman', count: 1, rooms: ['control_room', 'executive_office'] }, { job: 'astromech', count: 1, rooms: ['hangar', 'droid_bay'] }], sells: [{ item: 'ship_repair', price: 120, stock: 99 }], hours: [6, 22], names: ["{sur}'s Ship Repair", 'Hangar {n} Maintenance', 'Kuat Service Bay {n}', 'Corellian Engineering Outlet'], greeting: 'Leave the ship, keep the credits ready.' },
  customs: { category: 'transport', roles: [{ job: 'customs officer', count: 3, rooms: ['lobby_atrium', 'security_post', 'open_plan_office'] }, { job: 'guard', count: 2, rooms: ['lobby_atrium', 'security_post'] }, { job: 'passenger', count: 6, rooms: ['lobby_atrium', 'lounge', 'restaurant'] }], hours: [0, 24], names: ['Republic Customs — Terminal {n}', 'Arrivals Hall {n}', 'Spaceport Authority'], greeting: 'Papers. Cargo manifest. Anything to declare?' },
  ship_dealer: { category: 'retail', roles: [{ job: 'vendor', count: 2, rooms: ['shop', 'lobby_atrium', 'hangar'] }, { job: 'mechanic', count: 1, rooms: ['hangar', 'garage'] }], sells: [{ item: 'ship_speeder', price: 4000, stock: 2 }, { item: 'ship_shuttle', price: 14000, stock: 1 }, { item: 'ship_freighter', price: 32000, stock: 1 }, { item: 'ship_yacht', price: 60000, stock: 1 }], hours: [8, 22], names: ['{sur} Starships', 'Nubian Design Collective', 'Sienar Showroom {n}', 'Incom Sales {place}'], greeting: 'She may not look like much, but she has it where it counts.' },
  transit_station: { category: 'transport', roles: [{ job: 'conductor', count: 2, rooms: ['lobby_atrium', 'corridor'] }, { job: 'passenger', count: 8, rooms: ['lobby_atrium', 'lounge'] }, { job: 'guard', count: 1, rooms: ['security_post', 'lobby_atrium'] }], hours: [0, 24], names: ['{place} Station', 'Hyperlane Terminus', 'Transit Hub {n}'], greeting: 'Mind the doors.' },
  pawn: { category: 'retail', roles: [{ job: 'broker', count: 1, rooms: ['shop'] }, { job: 'shopper', count: 2, rooms: ['shop'] }], sells: [{ item: 'iron_block', price: 45, stock: 3 }, { item: 'gold_block', price: 220, stock: 1 }, { item: 'chest', price: 30, stock: 3 }], hours: [10, 28], names: ["{sur}'s Pawn", 'Watto Credit & Trade', 'Undercity Exchange {n}'], greeting: 'No refunds. No questions.' },
};

// district -> [kind, weight] (weights favour what a district is for)
const DISTRICT_KINDS = {
  senate: [['ministry', 5], ['office', 3], ['law_office', 2], ['archive', 1], ['security_station', 1], ['hotel', 1], ['caf', 1]],
  financial: [['office', 6], ['bank', 2], ['law_office', 2], ['holonet_office', 1], ['hotel', 1], ['caf', 2], ['apartments', 1], ['gym', 1]],
  residential: [['apartments', 7], ['caf', 2], ['general_store', 2], ['clinic', 1], ['school', 1], ['pharmacy', 1], ['gym', 1], ['tailor', 1], ['diner', 1]],
  industrial: [['depot', 4], ['foundry', 2], ['repair_shop', 2], ['droid_shop', 1], ['office', 1], ['diner', 1], ['security_station', 1]],
  entertainment: [['cantina', 4], ['hotel', 2], ['holo_arcade', 2], ['diner', 2], ['apartments', 1], ['tailor', 1], ['pawn', 1], ['speeder_dealer', 1]],
  market: [['general_store', 3], ['diner', 2], ['caf', 2], ['droid_shop', 1], ['tailor', 1], ['pharmacy', 1], ['pawn', 1], ['apartments', 1]],
  spaceport: [['customs', 2], ['depot', 2], ['repair_shop', 2], ['ship_dealer', 1], ['caf', 1], ['hotel', 1], ['transit_station', 1]],
};

// landmark families and undercity/market/spaceport buildings map straight to kinds
const FAMILY_KINDS = {
  senate: 'ministry', chancellery: 'ministry', temple: 'temple_annex', detention: 'security_station', holonet: 'holonet_office',
  medcenter: 'clinic', opera: 'holo_arcade', republica: 'apartments', works: 'foundry', market: 'general_store', underworld: 'cantina',
  plaza_monument: 'archive', spaceport: 'customs', station: 'transit_station',
};

const SUR = ['Antilles', 'Organa', 'Bibble', 'Valorum', 'Taa', 'Mothma', 'Dodonna', 'Tarkin', 'Piett', 'Veers', 'Krennic', 'Andor', 'Erso', 'Syndulla', 'Wren', 'Bridger', 'Kryze', 'Vizsla', 'Fett', 'Kenobi', 'Windu', 'Fisto', 'Koon', 'Tiin', 'Ti', 'Mundi', 'Amidala', 'Naberrie', 'Panaka', 'Typho', 'Dooku', 'Palpatine', 'Amedda', 'Sate', 'Bane', 'Vos', 'Tano', 'Offee', 'Secura', 'Unduli', 'Gallia', 'Rancisis', 'Yaddle', 'Poof', 'Piell', 'Allie', 'Drallig', 'Halcyon', 'Horn', 'Solo', 'Calrissian', 'Dameron', 'Tico', 'Holdo', 'Ackbar', 'Nunb', 'Madine', 'Rieekan', 'Cracken', 'Dreis', 'Porkins', 'Klivian', 'Janson', 'Celchu', 'Darklighter', 'Merrick', 'Draven', 'Malbus', 'Rook', 'Imwe'];
const GIVEN = ['Dex', 'Bail', 'Padme', 'Jar', 'Mon', 'Wilhuff', 'Cassian', 'Jyn', 'Hera', 'Sabine', 'Ezra', 'Bo', 'Boba', 'Obi', 'Mace', 'Kit', 'Plo', 'Saesee', 'Shaak', 'Ki-Adi', 'Sio', 'Finis', 'Orn', 'Mas', 'Cad', 'Quinlan', 'Ahsoka', 'Barriss', 'Aayla', 'Luminara', 'Adi', 'Oppo', 'Even', 'Stass', 'Cin', 'Nejaa', 'Corran', 'Wedge', 'Biggs', 'Jek', 'Hobbie', 'Wes', 'Tycho', 'Garven', 'Crix', 'Carlist', 'Airen', 'Bodhi', 'Baze', 'Chirrut', 'Lando', 'Poe', 'Rose', 'Amilyn', 'Gial', 'Nien', 'Zev', 'Dak'];
const CORP = ['Kuat', 'Sienar', 'Incom', 'Corellian', 'Czerka', 'Aratech', 'Mobquet', 'SoroSuub', 'BlasTech', 'Merr-Sonn', 'Cybot', 'Industrial Automaton', 'Arakyd', 'Baktoid', 'TaggeCo', 'Santhe', 'Loronar', 'Rendili', 'Nubian', 'Hoersch-Kessel', 'Damorian', 'Tagge', 'Trade Federation', 'Techno Union', 'Bespin Motors', 'Ubrikkian', 'Slayn & Korpil', 'Koensayr', 'Chiewab', 'Zaltin', 'Xizor Transport', 'Thyferra Bacta'];
const PLACE = { senate: 'Senate District', financial: 'Federal District', residential: 'Skyline', industrial: 'The Works', entertainment: 'Uscru', market: 'CoCo Town', spaceport: 'Westport', default: 'Galactic City' };

function fill(pattern, rng, district, n) {
  return pattern
    .replace(/\{sur\}/g, () => SUR[Math.floor(rng.next() * SUR.length)])
    .replace(/\{given\}/g, () => GIVEN[Math.floor(rng.next() * GIVEN.length)])
    .replace(/\{corp\}/g, () => CORP[Math.floor(rng.next() * CORP.length)])
    .replace(/\{place\}/g, PLACE[district] || PLACE.default)
    .replace(/\{n\}/g, String(n));
}

function pickWeighted(list, rng) {
  let total = 0; for (const [, w] of list) total += w;
  let r = rng.next() * total;
  for (const [k, w] of list) { r -= w; if (r <= 0) return k; }
  return list[list.length - 1][0];
}

const cache = new Map();

// The purpose of a lot: { id, category, kind, name, roles, sells, hours, greeting, district }. Landmarks map by
// family; towers, market halls, undercity buildings and spaceport halls draw from their district's weighted list
// (undercity buildings pass `{ district: 'entertainment' }`). `lot.purpose` (set by a builder) overrides the kind.
export function purposeFor(lot, layout = null) {
  const key = `${layout ? layout.seed : 0}:${lot.id}:${lot.x0},${lot.z0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const seed = (lot.seed ?? hash2(lot.x0 | 0, lot.z0 | 0)) >>> 0;
  const rng = new RNG(seed ^ 0x5157);
  const district = lot.district || 'residential';
  let kind = lot.purpose || (lot.kind === 'landmark' ? FAMILY_KINDS[lot.family] : null);
  if (!kind || !CATALOGUE[kind]) {
    const list = DISTRICT_KINDS[district] || DISTRICT_KINDS.residential;
    kind = pickWeighted(list, rng);
    // small lots cannot be hotels/ministries; very tall towers in business districts are offices or apartments
    if ((lot.w || 20) * (lot.d || 20) < 300 && (kind === 'hotel' || kind === 'ministry' || kind === 'depot')) kind = district === 'residential' ? 'caf' : 'office';
    if ((lot.height || 0) >= 140 && kind !== 'apartments' && kind !== 'office' && kind !== 'hotel') kind = district === 'residential' ? 'apartments' : 'office';
  }
  const def = CATALOGUE[kind];
  const n = 100 + (seed % 900);
  const name = lot.kind === 'landmark' && lot.name ? lot.name : fill(def.names[Math.floor(rng.next() * def.names.length)], rng, district, n);
  const p = { id: lot.id, kind, category: def.category, name, roles: def.roles, sells: def.sells || [], hours: def.hours, greeting: def.greeting, district };
  cache.set(key, p);
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
  return layout.lots.filter((l) => l.kind === 'tower' || l.kind === 'landmark').map((lot) => ({ lot, purpose: purposeFor(lot, layout) }));
}

export const CATEGORIES = [...new Set(Object.values(CATALOGUE).map((d) => d.category))];
