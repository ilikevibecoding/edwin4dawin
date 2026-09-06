// What every Coruscant room kind is used for (rubric 07 row 3): the jobs a room hosts (with counts), the prop the
// worker faces, the idle behaviour played there and whether the room takes visitors, sleepers or diners.
// `roomFunction(kind)` covers the 53 kinds of src/coruscant/rooms/*.js explicitly and infers a function for
// landmark-specific kinds (rotunda, ward, bay_1, ...) from keywords, so no room is ever left without a purpose.
// Jobs are the role names of src/coruscant/purposes.js (CATALOGUE roles) plus the `work` kinds the room templates
// record (desk, operator, medic, ...). `JOB_ARCHETYPE` maps every job to one of the 22 skin families.

export const IDLE = {
  TYPING: 'typing', SERVING: 'serving', SWEEPING: 'sweeping', WELDING: 'welding', SLEEPING: 'sleeping', EATING: 'eating',
  BROWSING: 'browsing', GUARDING: 'guarding', SITTING: 'sitting', STANDING: 'standing', TALKING: 'talking', DANCING: 'dancing',
  WATCHING: 'watching', EXERCISING: 'exercising', MEDITATING: 'meditating', WAITING: 'waiting', TENDING: 'tending', SPEAKING: 'speaking',
};

// room kind -> { jobs: [{ job, count }], prop: [block names], idle, visitors?: idle behaviour of non-staff, beds?: bool, meal?: bool }
export const ROOM_FUNCTIONS = {
  arcade: { jobs: [{ job: 'attendant', count: 1 }], prop: ['CONSOLE'], idle: IDLE.SERVING, visitors: IDLE.TYPING, leisure: true },
  archive: { jobs: [{ job: 'archivist', count: 1 }, { job: 'clerk', count: 1 }], prop: ['CONSOLE', 'BOOKSHELF'], idle: IDLE.TYPING, visitors: IDLE.BROWSING },
  armory: { jobs: [{ job: 'quartermaster', count: 1 }, { job: 'guard', count: 1 }], prop: ['CHEST', 'SHELF'], idle: IDLE.GUARDING },
  bank_vault: { jobs: [{ job: 'teller', count: 2 }, { job: 'vault guard', count: 1 }], prop: ['CONSOLE', 'PANEL_BLACK'], idle: IDLE.TYPING, visitors: IDLE.WAITING },
  barracks: { jobs: [{ job: 'guard', count: 2 }], prop: ['BED_HEAD'], idle: IDLE.SLEEPING, beds: true },
  cafeteria: { jobs: [{ job: 'server', count: 1 }, { job: 'barista', count: 1 }], prop: ['PANEL_BLACK', 'TABLE'], idle: IDLE.SERVING, visitors: IDLE.EATING, meal: true },
  cantina: { jobs: [{ job: 'bartender', count: 2 }, { job: 'musician', count: 1 }], prop: ['SHELF', 'PANEL_BLACK', 'PIANO'], idle: IDLE.SERVING, visitors: IDLE.EATING, meal: true, leisure: true },
  clinic_ward: { jobs: [{ job: 'nurse', count: 1 }, { job: 'medic', count: 1 }], prop: ['CONSOLE', 'BED_HEAD'], idle: IDLE.TENDING, visitors: IDLE.SLEEPING, beds: true },
  comms_room: { jobs: [{ job: 'comms', count: 1 }, { job: 'technician', count: 1 }], prop: ['CONSOLE'], idle: IDLE.TYPING },
  control_room: { jobs: [{ job: 'operator', count: 2 }, { job: 'foreman', count: 1 }, { job: 'officer', count: 1 }], prop: ['CONSOLE'], idle: IDLE.TYPING },
  corridor: { jobs: [{ job: 'maintenance droid', count: 1 }, { job: 'porter', count: 1 }], prop: [], idle: IDLE.SWEEPING, visitors: IDLE.STANDING },
  council_chamber: { jobs: [{ job: 'senator', count: 3 }, { job: 'aide', count: 2 }, { job: 'speaker', count: 1 }], prop: ['CONSOLE', 'GOLD_BLOCK', 'CHROME'], idle: IDLE.SPEAKING, visitors: IDLE.SITTING, fill: 'senator' },
  courtroom: { jobs: [{ job: 'advocate', count: 2 }, { job: 'judge', count: 1 }, { job: 'witness', count: 1 }], prop: ['PANEL_BLACK', 'STONE_BRICK_SLAB'], idle: IDLE.SPEAKING, visitors: IDLE.SITTING, fill: 'visitor' },
  detention_cell: { jobs: [{ job: 'warden', count: 1 }, { job: 'guard', count: 1 }], prop: ['CONSOLE', 'IRON_BARS'], idle: IDLE.GUARDING, visitors: IDLE.SITTING, beds: true },
  dressing_room: { jobs: [{ job: 'musician', count: 1 }, { job: 'tailor', count: 1 }], prop: ['CHEST', 'SHELF'], idle: IDLE.STANDING },
  droid_bay: { jobs: [{ job: 'droid tech', count: 1 }, { job: 'technician', count: 1 }, { job: 'astromech', count: 1 }], prop: ['CONSOLE', 'ANVIL'], idle: IDLE.WELDING },
  executive_office: { jobs: [{ job: 'executive', count: 1 }, { job: 'senator', count: 1 }, { job: 'advocate', count: 1 }, { job: 'officer', count: 1 }], prop: ['TABLE', 'CONSOLE'], idle: IDLE.TYPING, visitors: IDLE.SITTING },
  family_apartment: { jobs: [{ job: 'resident', count: 2 }], prop: ['BED_HEAD', 'TABLE'], idle: IDLE.SLEEPING, visitors: IDLE.EATING, beds: true },
  gallery: { jobs: [{ job: 'curator', count: 1 }], prop: ['HOLO_SIGN', 'GLOW_PANEL'], idle: IDLE.STANDING, visitors: IDLE.BROWSING, leisure: true },
  garage: { jobs: [{ job: 'mechanic', count: 2 }, { job: 'vendor', count: 1 }], prop: ['ANVIL', 'CRATE', 'CONSOLE'], idle: IDLE.WELDING },
  garden_terrace: { jobs: [{ job: 'gardener', count: 1 }, { job: 'acolyte', count: 1 }], prop: ['OAK_LEAVES', 'GRASS'], idle: IDLE.TENDING, visitors: IDLE.SITTING, leisure: true },
  greenhouse: { jobs: [{ job: 'gardener', count: 1 }], prop: ['OAK_LEAVES', 'FARMLAND'], idle: IDLE.TENDING },
  gym: { jobs: [{ job: 'trainer', count: 1 }], prop: ['IRON_BLOCK', 'ANVIL'], idle: IDLE.EXERCISING, visitors: IDLE.EXERCISING, leisure: true },
  hangar: { jobs: [{ job: 'mechanic', count: 2 }, { job: 'deck officer', count: 1 }, { job: 'astromech', count: 1 }, { job: 'pilot', count: 1 }], prop: ['CONSOLE', 'CRATE', 'ANVIL'], idle: IDLE.WELDING },
  holo_theatre: { jobs: [{ job: 'projectionist', count: 1 }], prop: ['CONSOLE'], idle: IDLE.TYPING, visitors: IDLE.WATCHING, leisure: true },
  hotel_room: { jobs: [{ job: 'guest', count: 1 }], prop: ['BED_HEAD', 'CHEST'], idle: IDLE.SLEEPING, beds: true },
  kitchen: { jobs: [{ job: 'cook', count: 2 }], prop: ['FURNACE', 'PANEL_BLACK', 'TABLE'], idle: IDLE.SERVING },
  laundry: { jobs: [{ job: 'maintenance droid', count: 1 }, { job: 'porter', count: 1 }], prop: ['CHEST', 'BARREL'], idle: IDLE.TENDING },
  library: { jobs: [{ job: 'librarian', count: 1 }, { job: 'archivist', count: 1 }, { job: 'teacher', count: 1 }], prop: ['CONSOLE', 'BOOKSHELF'], idle: IDLE.TYPING, visitors: IDLE.BROWSING, leisure: true },
  lift_landing: { jobs: [{ job: 'porter', count: 1 }], prop: ['CHROME'], idle: IDLE.WAITING, visitors: IDLE.WAITING },
  lobby_atrium: { jobs: [{ job: 'receptionist', count: 2 }, { job: 'concierge', count: 1 }, { job: 'guard', count: 1 }, { job: 'protocol droid', count: 1 }, { job: 'customs officer', count: 1 }, { job: 'conductor', count: 1 }], prop: ['PANEL_BLACK', 'CONSOLE'], idle: IDLE.SERVING, visitors: IDLE.WAITING },
  lounge: { jobs: [{ job: 'bartender', count: 1 }], prop: ['SHELF', 'PANEL_BLACK'], idle: IDLE.SERVING, visitors: IDLE.SITTING, meal: true, leisure: true },
  market_stalls: { jobs: [{ job: 'vendor', count: 2 }], prop: ['CRATE', 'BARREL', 'PANEL_BLACK'], idle: IDLE.SERVING, visitors: IDLE.BROWSING, leisure: true },
  medbay: { jobs: [{ job: 'medic', count: 2 }], prop: ['CONSOLE', 'BED_HEAD'], idle: IDLE.TENDING, visitors: IDLE.SLEEPING, beds: true },
  meditation_chamber: { jobs: [{ job: 'acolyte', count: 2 }], prop: ['WHITE_WOOL'], idle: IDLE.MEDITATING, visitors: IDLE.MEDITATING },
  meeting_room: { jobs: [{ job: 'executive', count: 1 }, { job: 'advocate', count: 1 }, { job: 'aide', count: 2 }], prop: ['TABLE'], idle: IDLE.TALKING, visitors: IDLE.SITTING },
  museum_hall: { jobs: [{ job: 'guide', count: 1 }], prop: ['GOLD_BLOCK', 'HOLO_SIGN'], idle: IDLE.SPEAKING, visitors: IDLE.BROWSING, leisure: true },
  night_club: { jobs: [{ job: 'dj', count: 1 }, { job: 'bartender', count: 1 }, { job: 'bouncer', count: 1 }], prop: ['CONSOLE', 'SHELF'], idle: IDLE.SERVING, visitors: IDLE.DANCING, leisure: true },
  observation_deck: { jobs: [{ job: 'guide', count: 1 }], prop: ['STEEL_GLASS'], idle: IDLE.WATCHING, visitors: IDLE.WATCHING, leisure: true },
  open_plan_office: { jobs: [{ job: 'clerk', count: 4 }, { job: 'aide', count: 2 }, { job: 'journalist', count: 2 }, { job: 'customs officer', count: 1 }, { job: 'teller', count: 1 }], prop: ['CONSOLE', 'TABLE'], idle: IDLE.TYPING },
  penthouse: { jobs: [{ job: 'resident', count: 2 }, { job: 'bartender', count: 1 }], prop: ['BED_HEAD', 'SHELF'], idle: IDLE.SLEEPING, visitors: IDLE.SITTING, beds: true },
  reactor_room: { jobs: [{ job: 'engineer', count: 1 }, { job: 'smelter', count: 1 }], prop: ['CONSOLE', 'GLOW_PANEL_BLUE'], idle: IDLE.TYPING },
  restaurant: { jobs: [{ job: 'cook', count: 1 }, { job: 'waitress droid', count: 1 }, { job: 'barista', count: 1 }], prop: ['TABLE', 'PANEL_BLACK'], idle: IDLE.SERVING, visitors: IDLE.EATING, meal: true },
  restroom: { jobs: [{ job: 'maintenance droid', count: 1 }], prop: ['CHROME', 'WHITE_WOOL'], idle: IDLE.SWEEPING, visitors: IDLE.STANDING },
  roof_garden: { jobs: [{ job: 'gardener', count: 1 }], prop: ['OAK_LEAVES', 'GRASS'], idle: IDLE.TENDING, visitors: IDLE.SITTING, leisure: true },
  school_room: { jobs: [{ job: 'teacher', count: 1 }, { job: 'child', count: 6 }], prop: ['CONSOLE', 'STONE_BRICK_SLAB'], idle: IDLE.SPEAKING, visitors: IDLE.SITTING },
  security_post: { jobs: [{ job: 'guard', count: 2 }, { job: 'officer', count: 1 }, { job: 'customs officer', count: 1 }], prop: ['CONSOLE'], idle: IDLE.GUARDING },
  server_room: { jobs: [{ job: 'technician', count: 1 }], prop: ['CONSOLE', 'PANEL_BLACK'], idle: IDLE.TYPING },
  shop: { jobs: [{ job: 'shopkeeper', count: 1 }, { job: 'vendor', count: 1 }, { job: 'pharmacist', count: 1 }, { job: 'broker', count: 1 }, { job: 'tailor', count: 1 }], prop: ['PANEL_BLACK', 'SHELF', 'CRATE'], idle: IDLE.SERVING, visitors: IDLE.BROWSING, leisure: true },
  stairwell: { jobs: [], prop: ['STONE_BRICK_SLAB'], idle: IDLE.STANDING, visitors: IDLE.STANDING },
  storage: { jobs: [{ job: 'stock', count: 1 }, { job: 'dock worker', count: 1 }, { job: 'cargo droid', count: 1 }], prop: ['CRATE', 'BARREL', 'CHEST'], idle: IDLE.TENDING },
  studio: { jobs: [{ job: 'resident', count: 1 }, { job: 'journalist', count: 1 }, { job: 'tailor', count: 1 }], prop: ['BED_HEAD', 'CONSOLE'], idle: IDLE.SLEEPING, visitors: IDLE.SITTING, beds: true },
  workshop: { jobs: [{ job: 'mechanic', count: 2 }, { job: 'technician', count: 1 }, { job: 'smelter', count: 1 }, { job: 'tailor', count: 1 }], prop: ['ANVIL', 'FURNACE', 'CRATE'], idle: IDLE.WELDING },
};

export const ROOM_KINDS = Object.keys(ROOM_FUNCTIONS);

// Landmark modules register their own room kinds (rotunda, ward, bay_1, hall_of_records, senator_office, ...):
// keyword rules pick the closest standard function. A keyword matches a word of the kind (split on `_` and spaces):
// exactly, as its plural, or as a stem of five letters or more ('meditat' -> meditation, 'stair' -> stairwell); a
// keyword with an underscore matches the whole kind. Order matters: the first entry with a matching keyword wins, so
// specific words (food, archive, control, cafe) come before generic ones (court, office, hall, room, deck).
const KEYWORDS = [
  [['stair', 'stairs', 'ramp'], 'stairwell'], [['lift', 'turbolift'], 'lift_landing'],
  [['corridor', 'hall_way', 'hallway', 'passage', 'walkway', 'gangway', 'concourse', 'bridge', 'catwalk', 'gantry', 'street', 'alley', 'vomitory'], 'corridor'],
  [['archive', 'archives', 'records', 'registry'], 'archive'], [['kitchen', 'galley'], 'kitchen'],
  [['food', 'restaurant', 'diner', 'cafe', 'cafeteria', 'canteen', 'mess', 'bistro'], 'restaurant'], [['cantina', 'bar', 'club', 'tavern', 'pub'], 'cantina'],
  [['control', 'ops', 'operations', 'command', 'bridge_deck', 'watchtower', 'dispatch'], 'control_room'],
  [['observation', 'observatory', 'observ', 'overlook', 'viewing', 'telescope', 'balcony_deck'], 'observation_deck'],
  [['medical', 'medic', 'medbay', 'clinic', 'infirmary', 'pharmacy', 'aid', 'treatment'], 'medbay'],
  [['ward', 'recovery', 'bacta', 'surgery', 'triage', 'ambulance', 'emergency', 'morgue'], 'clinic_ward'],
  [['chamber', 'rotunda', 'senate', 'council', 'assembly', 'convocation', 'pod', 'podium'], 'council_chamber'],
  [['cell', 'detention', 'brig', 'holding'], 'detention_cell'], [['armory', 'armoury', 'weapons'], 'armory'],
  [['barrack', 'dorm', 'dormitory', 'bunk', 'quarters', 'ready'], 'barracks'],
  [['security', 'checkpoint', 'guard', 'customs', 'post', 'gatehouse', 'gate', 'interrogation'], 'security_post'],
  [['meeting', 'briefing', 'conference', 'boardroom'], 'meeting_room'],
  [['office', 'bureau', 'desk', 'accounts', 'admin', 'logistics', 'shipping', 'planning', 'intake'], 'open_plan_office'], [['vault', 'treasury'], 'bank_vault'],
  [['server', 'data', 'comms', 'transmit', 'transmitter', 'broadcast', 'antenna', 'relay'], 'comms_room'],
  [['studio', 'newsroom', 'edit'], 'studio'],
  [['stage', 'auditorium', 'theatre', 'theater', 'opera', 'orchestra', 'balcony', 'box', 'tier', 'circle', 'stalls', 'screen'], 'holo_theatre'],
  [['dressing', 'green_room', 'backstage', 'wardrobe', 'locker', 'changing'], 'dressing_room'],
  [['library', 'reading', 'study'], 'library'], [['class', 'classroom', 'school', 'lecture', 'training'], 'school_room'],
  [['meditat', 'temple', 'sanctum', 'shrine', 'contemplat'], 'meditation_chamber'],
  [['hangar', 'bay', 'dock', 'landing', 'gunship', 'pad'], 'hangar'], [['garage', 'speeder', 'motor_pool'], 'garage'],
  [['workshop', 'repair', 'machine', 'forge', 'assembly_line', 'line', 'maintenance', 'scenery'], 'workshop'],
  [['reactor', 'power', 'generator', 'furnace', 'smelt', 'smelter', 'foundry', 'works', 'casting'], 'reactor_room'], [['droid'], 'droid_bay'],
  [['storage', 'store', 'stores', 'store_room', 'cargo', 'warehouse', 'depot', 'supply', 'stock', 'spares', 'parts', 'yard', 'property'], 'storage'],
  [['museum', 'gallery', 'exhibit', 'monument', 'memorial', 'statue'], 'museum_hall'],
  [['arcade', 'games', 'dejarik', 'gambling', 'casino', 'den', 'pool_hall', 'hologame'], 'arcade'],
  [['shop', 'market', 'stall', 'retail', 'vendor', 'vendors', 'bazaar', 'kiosk', 'pawn', 'fitting'], 'shop'],
  [['gym', 'dojo', 'sparring', 'training_hall'], 'gym'],
  [['garden', 'terrace', 'greenhouse', 'green', 'park', 'arboretum', 'fountain'], 'garden_terrace'],
  [['antechamber', 'anteroom'], 'lounge'], [['penthouse', 'chancellor', 'executive_suite'], 'penthouse'],
  [['apartment', 'flat', 'residence', 'home', 'suite', 'living', 'senator_suite'], 'family_apartment'], [['hotel', 'guest'], 'hotel_room'],
  [['restroom', 'washroom', 'refresher', 'bath', 'shower', 'showers', 'sauna', 'steam'], 'restroom'], [['laundry', 'utility', 'service'], 'laundry'],
  [['lobby', 'atrium', 'foyer', 'vestibule', 'entrance', 'reception', 'arrival', 'arrivals', 'departures', 'terminal', 'platform', 'forecourt', 'ticket', 'hall'], 'lobby_atrium'],
  [['court', 'tribunal'], 'courtroom'],
  [['lounge', 'waiting', 'wait', 'salon', 'antechamber', 'break'], 'lounge'],
  [['room', 'deck', 'floor'], 'corridor'],
];
const _inferred = new Map();
const wordMatch = (tok, kw) => tok === kw || tok === kw + 's' || (kw.length >= 5 && tok.startsWith(kw)) || (tok.length >= 5 && kw.startsWith(tok));
function inferBase(k) {
  if (_inferred.has(k)) return _inferred.get(k);
  const toks = k.split(/[_\s]+/).filter(Boolean);
  let base = 'lounge';
  outer: for (const [words, b] of KEYWORDS) for (const w of words) {
    if (w.includes('_') ? k.includes(w) : toks.some((t) => wordMatch(t, w))) { base = b; break outer; }
  }
  _inferred.set(k, base);
  return base;
}

// Function of a room kind: the table entry, or the closest one by keyword, else a generic public room. `base` is the
// standard kind the function was taken from (for census/statistics).
export function roomFunction(kind) {
  const k = String(kind || '').toLowerCase();
  if (ROOM_FUNCTIONS[k]) return { ...ROOM_FUNCTIONS[k], base: k, inferred: false };
  const base = inferBase(k);
  return { ...ROOM_FUNCTIONS[base], base, inferred: true };
}

// Room kinds whose jobs include `job`.
export function roomsForJob(job) {
  const out = [];
  for (const [kind, fn] of Object.entries(ROOM_FUNCTIONS)) if (fn.jobs.some((j) => j.job === job)) out.push(kind);
  return out;
}

// The block kinds a worker of `job` in a room of `kind` faces (names into blocks.js B).
export function propsFor(kind) { return roomFunction(kind).prop; }

// Occupants of one concrete room (rubric row 3: "each room is used for something specific"): the jobs to seat there,
// given the number of seat spots (and beds) the room has. Small rooms take up to STAFF_CAP of the function's jobs
// (one of each, in table order); rooms with many seats that take visitors (the Senate chamber, auditoria, canteens,
// galleries) fill up with `fill` (or the visitors' job) so a session, a show or a lunch crowd is actually there.
// Rooms that host only staff (workshops, kitchens, comms rooms) never fill; wards fill with one patient per bed.
// Deterministic and pure.
export const STAFF_CAP = 3, STAFF_MAX = 12, BIG_ROOM_SEATS = 12, BIG_ROOM_MAX = 40;
const VISITOR_FILL = { restaurant: 'patron', cafeteria: 'patron', cantina: 'patron', lounge: 'patron', night_club: 'patron', holo_theatre: 'patron', school_room: 'child', observation_deck: 'tourist', museum_hall: 'visitor', gallery: 'visitor', library: 'visitor', arcade: 'patron', market_stalls: 'shopper', shop: 'shopper', medbay: 'patient', clinic_ward: 'patient', garden_terrace: 'visitor', roof_garden: 'visitor', lobby_atrium: 'visitor', meeting_room: 'aide', courtroom: 'visitor', gym: 'patron' };
// `works` is the number of work records (desks, consoles, counters) inside the room: a room with sixteen desks seats
// the table's counts (four clerks, two aides, ...) up to STAFF_MAX; a room without records takes STAFF_CAP people.
export function roomStaff(kind, seats = 0, beds = 0, works = 0) {
  const f = roomFunction(kind);
  const out = [];
  const cap = works > 0 ? Math.min(STAFF_MAX, Math.max(STAFF_CAP, works)) : STAFF_CAP;
  for (const j of f.jobs) for (let k = 0; k < j.count && out.length < cap; k++) out.push(j.job);
  if (seats >= BIG_ROOM_SEATS) {
    const fill = f.fill || VISITOR_FILL[f.base] || null;
    if (fill) {
      let n = Math.min(seats >= 400 ? BIG_ROOM_MAX + 20 : BIG_ROOM_MAX, Math.ceil(seats / 4));
      if (f.beds && VISITOR_JOBS.has(fill)) n = Math.min(n, out.length + Math.max(1, beds));
      while (out.length < n) out.push(fill);
    }
  }
  return out;
}

// The 22 skin families (rubric row 5). Jobs map onto them below; `scale` shrinks children.
export const ARCHETYPES = ['office worker', 'resident', 'senator', 'senate aide', 'senate guard', 'security officer', 'pilot', 'mechanic', 'dock worker', 'vendor', 'cook', 'bartender', 'medic', 'patient', 'tourist', 'courier', 'protocol droid', 'astromech', 'sweeper droid', 'jedi', 'bounty hunter', 'journalist'];

export const JOB_ARCHETYPE = {
  clerk: 'office worker', executive: 'office worker', teller: 'office worker', advocate: 'office worker', concierge: 'office worker', receptionist: 'office worker',
  broker: 'office worker', archivist: 'office worker', librarian: 'office worker', teacher: 'office worker', attendant: 'office worker', curator: 'office worker',
  guide: 'office worker', projectionist: 'office worker', comms: 'office worker', operator: 'office worker', speaker: 'senator', judge: 'senator', witness: 'resident',
  desk: 'office worker', engineer: 'mechanic', 'deck officer': 'pilot', 'droid tech': 'mechanic', quartermaster: 'security officer', warden: 'security officer',
  resident: 'resident', guest: 'tourist', shopper: 'resident', patron: 'resident', visitor: 'tourist', passenger: 'tourist', child: 'resident', trainer: 'resident', dj: 'tourist',
  senator: 'senator', aide: 'senate aide', 'senate guard': 'senate guard', guard: 'security officer', officer: 'security officer', bouncer: 'security officer',
  'vault guard': 'security officer', 'customs officer': 'security officer', conductor: 'security officer', 'security officer': 'security officer',
  pilot: 'pilot', mechanic: 'mechanic', technician: 'mechanic', smelter: 'mechanic', 'dock worker': 'dock worker', porter: 'dock worker', foreman: 'dock worker', stock: 'dock worker',
  vendor: 'vendor', shopkeeper: 'vendor', tailor: 'vendor', pharmacist: 'medic', gardener: 'vendor', cook: 'cook', server: 'cook', barista: 'bartender', bartender: 'bartender',
  medic: 'medic', nurse: 'medic', patient: 'patient', tourist: 'tourist', musician: 'tourist', courier: 'courier',
  'protocol droid': 'protocol droid', 'waitress droid': 'protocol droid', astromech: 'astromech', 'cargo droid': 'astromech', 'maintenance droid': 'sweeper droid', 'sweeper droid': 'sweeper droid',
  jedi: 'jedi', acolyte: 'jedi', 'bounty hunter': 'bounty hunter', journalist: 'journalist',
};

export function archetypeOf(job, district = null) {
  if (job === 'guard' && district === 'senate') return 'senate guard';
  return JOB_ARCHETYPE[job] || 'resident';
}

export const DROID_ARCHETYPES = new Set(['protocol droid', 'astromech', 'sweeper droid']);
// Jobs that are customers rather than staff: they visit the lot (browse, eat, wait) instead of working a spot.
export const VISITOR_JOBS = new Set(['resident', 'guest', 'shopper', 'patron', 'visitor', 'passenger', 'patient', 'child']);
