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
  council_chamber: { jobs: [{ job: 'speaker', count: 1 }, { job: 'senator', count: 1 }, { job: 'aide', count: 2 }], prop: ['GOLD_BLOCK', 'CHROME'], idle: IDLE.SPEAKING, visitors: IDLE.SITTING },
  courtroom: { jobs: [{ job: 'judge', count: 1 }, { job: 'witness', count: 1 }, { job: 'advocate', count: 2 }], prop: ['PANEL_BLACK', 'STONE_BRICK_SLAB'], idle: IDLE.SPEAKING, visitors: IDLE.SITTING },
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

// Landmark modules register their own room kinds (rotunda, ward, bay, hall_of_records, ...): keyword rules pick the
// closest standard function. Order matters: the first matching keyword wins.
const KEYWORDS = [
  [['stair', 'ramp'], 'stairwell'], [['lift', 'turbolift'], 'lift_landing'], [['corridor', 'hall_way', 'passage', 'walkway', 'gangway', 'concourse', 'bridge'], 'corridor'],
  [['lobby', 'atrium', 'foyer', 'vestibule', 'entrance', 'reception', 'arrivals', 'departures', 'terminal', 'platform'], 'lobby_atrium'],
  [['chamber', 'rotunda', 'senate', 'council', 'assembly', 'pod'], 'council_chamber'], [['court', 'tribunal'], 'courtroom'],
  [['cell', 'detention', 'brig', 'holding'], 'detention_cell'], [['armory', 'armoury', 'weapons'], 'armory'], [['barrack', 'dorm', 'bunk', 'quarters'], 'barracks'],
  [['ward', 'recovery', 'bacta', 'surgery', 'triage', 'ambulance'], 'clinic_ward'], [['medbay', 'clinic', 'infirmary', 'pharmacy'], 'medbay'],
  [['kitchen', 'galley'], 'kitchen'], [['cantina', 'bar', 'club', 'tavern'], 'cantina'], [['restaurant', 'diner', 'caf', 'canteen', 'mess'], 'restaurant'],
  [['office', 'bureau', 'desk', 'accounts', 'admin', 'records', 'archive', 'registry'], 'open_plan_office'], [['vault', 'treasury'], 'bank_vault'],
  [['server', 'data', 'comms', 'transmit', 'broadcast', 'antenna', 'relay'], 'comms_room'], [['control', 'tower', 'ops', 'operations', 'command', 'bridge_deck'], 'control_room'],
  [['studio', 'newsroom', 'edit'], 'studio'], [['stage', 'auditorium', 'theatre', 'theater', 'opera', 'orchestra', 'balcony', 'box'], 'holo_theatre'],
  [['dressing', 'green_room', 'backstage', 'wardrobe'], 'dressing_room'], [['gallery', 'exhibit', 'museum', 'monument', 'memorial', 'statue'], 'museum_hall'],
  [['library', 'reading', 'study'], 'library'], [['class', 'school', 'lecture', 'training'], 'school_room'],
  [['meditat', 'temple', 'sanctum', 'shrine', 'contemplat'], 'meditation_chamber'], [['garden', 'terrace', 'green', 'park', 'arboretum'], 'garden_terrace'],
  [['gym', 'dojo', 'sparring', 'training_hall'], 'gym'], [['observation', 'overlook', 'viewing', 'balcony_deck'], 'observation_deck'],
  [['hangar', 'bay', 'dock', 'landing'], 'hangar'], [['garage', 'speeder', 'motor_pool'], 'garage'], [['workshop', 'repair', 'machine', 'forge', 'assembly_line', 'line'], 'workshop'],
  [['reactor', 'power', 'generator', 'furnace', 'smelt', 'foundry', 'works'], 'reactor_room'], [['droid'], 'droid_bay'],
  [['storage', 'store_room', 'cargo', 'warehouse', 'depot', 'supply', 'stock'], 'storage'], [['shop', 'market', 'stall', 'retail', 'vendor', 'bazaar'], 'shop'],
  [['apartment', 'flat', 'residence', 'home', 'suite'], 'family_apartment'], [['penthouse', 'chancellor', 'executive_suite'], 'penthouse'], [['hotel', 'guest', 'room'], 'hotel_room'],
  [['lounge', 'waiting', 'wait', 'salon'], 'lounge'], [['security', 'checkpoint', 'guard', 'customs', 'post'], 'security_post'],
  [['restroom', 'washroom', 'refresher', 'bath'], 'restroom'], [['laundry', 'utility', 'service'], 'laundry'], [['arcade', 'games', 'dejarik'], 'arcade'],
];

// Function of a room kind: the table entry, or the closest one by keyword, else a generic public room. `base` is the
// standard kind the function was taken from (for census/statistics).
export function roomFunction(kind) {
  const k = String(kind || '').toLowerCase();
  if (ROOM_FUNCTIONS[k]) return { ...ROOM_FUNCTIONS[k], base: k, inferred: false };
  for (const [words, base] of KEYWORDS) for (const w of words) if (k.includes(w)) return { ...ROOM_FUNCTIONS[base], base, inferred: true };
  return { ...ROOM_FUNCTIONS.lounge, base: 'lounge', inferred: true };
}

// Room kinds whose jobs include `job`.
export function roomsForJob(job) {
  const out = [];
  for (const [kind, fn] of Object.entries(ROOM_FUNCTIONS)) if (fn.jobs.some((j) => j.job === job)) out.push(kind);
  return out;
}

// The block kinds a worker of `job` in a room of `kind` faces (names into blocks.js B).
export function propsFor(kind) { return roomFunction(kind).prop; }

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
