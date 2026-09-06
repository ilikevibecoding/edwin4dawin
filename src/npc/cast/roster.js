// The thirteen anchors of the starting cast (spec §13) as data. Nothing here touches the world: `persistent.js`
// binds every anchor to a real lot / room / ship of the generated layout with the rules below (kind, preferred name,
// nearest-to), so the same seed always yields the same places, and the offline test asserts the result.
//
// Binding rule shapes (resolved by bindAnchors in persistent.js):
//   'port'                                  the spaceport (pseudo lot PORT of the census)
//   { landmark: 'senate' | 'temple' | ... } the landmark lot with that family
//   { kind, prefer?: RegExp, district?, near?: anchorRef | 'port' | { landmark } }
//     the purposed lot of that kind (by name preference, else nearest to `near`, else the first)
//   { sameAs: 'tavi_renn.home' }            another anchor's resolved lot
//   { housingNear: 'work' | 'port' }        the nearest apartments/hotel to the anchor's work lot (or the port)
// Relationships reference another anchor id, or a lot role: { lot: 'tessa_venn.work', role: 'owner' | 'key' } or
// { lot: { kind: 'customs' }, role: 'owner' } (the persistent owner/key person of that lot). All edges are made
// bidirectional by the registry; `label` is what the anchor calls the other person, `back` what they call the anchor.
import { PORT } from '../coruscant/port.js';

// personality -> the fragment voice used by bank.js and the delivery tag of composed lines
export const PERSONALITIES = ['brisk', 'warm', 'wry', 'formal', 'gruff', 'anxious'];

// behaviour states (spec §11) and the roles allowed each of them
export const STATES = ['commuting', 'working', 'serving', 'eating', 'resting', 'sleeping', 'conversing', 'investigating', 'waiting-for-resources', 'fleeing', 'recovering'];
const BASE_STATES = ['commuting', 'resting', 'sleeping', 'conversing', 'fleeing', 'recovering'];
const S = (...extra) => [...BASE_STATES, ...extra];

export const ANCHORS = [
  {
    id: 'vela_marr', name: 'Vela Marr', title: 'Dockmaster', job: 'deck officer', female: true,
    appearance: { archetype: 'pilot', species: 'human', gender: 'feminine', age: 'middle', wear: 'worn' },
    personality: 'brisk', trade: 'port_control',
    bind: { work: 'port', home: { housingNear: 'port' }, meal: 'port', leisure: 'port', spot: 'control' },
    shift: 'day', offset: -20,
    states: S('working', 'eating', 'investigating', 'waiting-for-resources'),
    needs: ['inspections cleared', 'a full pad roster', 'sleep'],
    knows: { district: 'spaceport', port: true, broadcasts: ['senate:result', 'disaster'] },
    relationships: [
      { to: 'brin_tal', kind: 'trust', label: 'the one pilot I trust', back: 'the dockmaster who trusts me' },
      { to: { lot: { kind: 'customs' }, role: 'owner' }, kind: 'rival', label: 'the customs supervisor', back: 'the dockmaster' },
      { to: 'asha_merin', kind: 'petition', label: 'the senator with the port bill', back: 'the dockmaster at Westport' },
      { to: 'tessa_venn', kind: 'colleague', label: 'the mechanic the pilots swear by', back: 'the dockmaster' },
    ],
    voice: { pitch: 0.92, rate: 1.06 },
  },
  {
    id: 'brin_tal', name: 'Brin Tal', title: 'Captain', job: 'pilot', female: true,
    appearance: { archetype: 'pilot', species: 'duros', gender: 'feminine', age: 'adult', wear: 'patched' },
    personality: 'wry', trade: 'freighter_captain',
    bind: { work: 'port', home: 'port', meal: 'port', leisure: 'port', spot: 'pad', ship: { model: 'light_freighter', pad: 7 } },
    shift: 'day', offset: 35,
    states: S('working', 'eating', 'waiting-for-resources'),
    needs: ['the repair bill paid', 'a paying charter', 'a full tank'],
    knows: { district: 'spaceport', port: true, ship: true, broadcasts: ['senate:result', 'disaster'] },
    relationships: [
      { to: 'tessa_venn', kind: 'debt', label: 'the mechanic I owe', back: 'the captain with the open bill' },
      { to: 'nera_vos', kind: 'charter', label: 'the doctor who needs a run flown', back: 'the captain who could fly my supplies' },
      { to: 'ral_drenn', kind: 'temptation', label: 'the broker with the better-paying charter', back: 'a captain with a light freighter and debts' },
    ],
    voice: { pitch: 0.8, rate: 0.98 },
  },
  {
    id: 'tessa_venn', name: 'Tessa Venn', title: '', job: 'mechanic', female: true,
    appearance: { archetype: 'mechanic', species: 'zabrak', gender: 'feminine', age: 'adult', wear: 'worn' },
    personality: 'gruff', trade: 'repair',
    bind: { work: { kind: 'repair_shop', prefer: /Hangar/i, near: 'port' }, home: { housingNear: 'work' }, roomPrefs: ['hangar', 'garage', 'workshop', 'droid_bay'] },
    shift: 'day', offset: 10,
    states: S('working', 'eating', 'waiting-for-resources', 'investigating'),
    needs: ['couplings and relays in stock', 'the bill paid', 'a quiet bench'],
    knows: { district: 'industrial', business: 'work', broadcasts: ['senate:result', 'disaster'] },
    relationships: [
      { to: { lot: { kind: 'electronics', near: 'work' }, role: 'owner' }, kind: 'supplier', label: 'my components vendor', back: 'the mechanic who buys my relays' },
      { to: 'koro_den', kind: 'supplier', label: 'the salvage co-op that finds me parts', back: 'the mechanic who takes our reclaimed parts' },
      { to: 'd4lt', kind: 'colleague', label: 'the plant droid whose parts keep turning up', back: 'the mechanic who recognises plant parts' },
      { to: 'seran_vale', kind: 'witness', label: 'the Jedi asking about diverted parts', back: 'the mechanic who can tell a plant relay from a ship relay' },
    ],
    voice: { pitch: 0.86, rate: 1.0 },
  },
  {
    id: 'd4lt', name: 'D4-LT', title: '', job: 'maintenance droid', female: false, droid: true,
    appearance: { archetype: 'astromech', wear: 'worn' },
    personality: 'formal', trade: 'utility_droid',
    bind: { work: { kind: 'power_plant' }, home: 'work', roomPrefs: ['reactor_room', 'droid_bay', 'control_room', 'workshop'] },
    shift: 'day', offset: 0,
    states: S('working', 'waiting-for-resources', 'investigating'),
    needs: ['authorisation for circuit 7-Besh', 'a replacement relay', 'a charge cycle'],
    knows: { district: 'industrial', business: 'work', topology: true, broadcasts: ['disaster'] },
    relationships: [
      { to: 'tessa_venn', kind: 'colleague', label: 'the mechanic who can fit what I am not authorised to fit', back: 'the plant droid' },
      { to: 'koro_den', kind: 'supplier', label: 'the salvage organiser who returns plant parts', back: 'the plant droid that logs what goes missing' },
      { to: 'seran_vale', kind: 'witness', label: 'the Jedi who asked for the maintenance log', back: 'the droid with the maintenance topology' },
    ],
    voice: { pitch: 1.6, rate: 1.18, droid: true },
  },
  {
    id: 'seli_noor', name: 'Seli Noor', title: '', job: 'cook', female: true,
    appearance: { archetype: 'cook', species: 'twilek', gender: 'feminine', age: 'middle', wear: 'worn' },
    personality: 'warm', trade: 'diner',
    bind: { work: { kind: 'diner', district: 'industrial', near: 'd4lt.work' }, home: { housingNear: 'work' }, meal: 'work', roomPrefs: ['kitchen', 'restaurant', 'cafeteria', 'lobby_atrium'] },
    shift: 'day', offset: -40,
    states: S('working', 'serving', 'eating', 'waiting-for-resources'),
    needs: ['the market delivery on time', 'the night shift fed', 'her regulars accounted for'],
    knows: { district: 'industrial', business: 'work', broadcasts: ['senate:result', 'disaster'] },
    relationships: [
      { to: { lot: { landmark: 'market' }, role: 'owner' }, kind: 'supplier', label: 'my grocer at the market halls', back: 'the diner cook who buys my produce' },
      { to: { lot: 'd4lt.work', role: 'key' }, kind: 'regular', label: 'my night-shift regular from the plant', back: 'the cook who saves me a plate', mealHere: true },
      { to: 'tavi_renn', kind: 'courier', label: 'the courier who runs my market orders', back: 'the diner I deliver to' },
      { to: 'koro_den', kind: 'regular', label: 'the salvage organiser who eats here', back: 'the cook who feeds the co-op' },
    ],
    voice: { pitch: 1.08, rate: 0.98 },
  },
  {
    id: 'nera_vos', name: 'Dr Nera Vos', title: 'Dr', job: 'medic', female: true,
    appearance: { archetype: 'medic', species: 'mirialan', gender: 'feminine', age: 'middle', wear: 'clean' },
    personality: 'formal', trade: 'clinic',
    bind: { work: { kind: 'clinic', prefer: /Skyline Clinic/i, near: { landmark: 'republica' } }, home: { housingNear: 'work' }, roomPrefs: ['medbay', 'clinic_ward', 'lobby_atrium'] },
    shift: 'day', offset: 15,
    states: S('working', 'serving', 'eating', 'waiting-for-resources'),
    needs: ['bacta and dressings in stock', 'customs cleared on medical crates', 'sleep'],
    knows: { district: 'residential', business: 'work', broadcasts: ['senate:result', 'disaster'] },
    relationships: [
      { to: { lot: { kind: 'pharmacy', near: 'work' }, role: 'owner' }, kind: 'supplier', label: 'my pharmacist', back: 'the clinic doctor I supply' },
      { to: 'brin_tal', kind: 'charter', label: 'the captain who could fly my supplies in', back: 'the doctor with the clinic run' },
      { to: 'asha_merin', kind: 'constituent', label: 'the senator who asks what customs does to a clinic', back: 'the doctor who explains customs to me' },
      { to: 'mira_sol', kind: 'colleague', label: 'the caretaker who sends me her residents', back: 'the doctor who sees my residents' },
    ],
    voice: { pitch: 1.0, rate: 0.94 },
  },
  {
    id: 'ilen_rook', name: 'Ilen Rook', title: '', job: 'clerk', female: false,
    appearance: { archetype: 'senate_aide', species: 'human', gender: 'masculine', age: 'adult', wear: 'clean' },
    personality: 'formal', trade: 'senate_clerk',
    bind: { work: { landmark: 'senate' }, home: { housingNear: 'work' }, roomPrefs: ['open_plan_office', 'archive', 'vestibule'] },
    shift: 'day', offset: -10,
    states: S('working', 'serving', 'eating', 'investigating'),
    needs: ['petitions filed in order', 'the hearing schedule kept', 'lunch'],
    knows: { district: 'senate', business: 'work', senate: true, broadcasts: ['senate:result', 'disaster'] },
    relationships: [
      { to: 'asha_merin', kind: 'committee', label: 'the senator whose committee takes real evidence', back: 'the clerk who knows which committee' },
      { to: 'tavi_renn', kind: 'regular', label: 'the courier who files for half the district', back: 'the clerk who recognises me' },
      { to: 'seran_vale', kind: 'colleague', label: 'the Jedi liaison', back: 'the clerk who finds the records' },
    ],
    voice: { pitch: 0.95, rate: 0.96 },
  },
  {
    id: 'asha_merin', name: 'Asha Merin', title: 'Senator', job: 'senator', female: true,
    appearance: { archetype: 'senator', species: 'pantoran', gender: 'feminine', age: 'middle', wear: 'clean' },
    personality: 'formal', trade: 'senator',
    bind: { work: { landmark: 'senate' }, home: { kind: 'luxury_residences', near: 'work' }, roomPrefs: ['executive_office', 'senators_lounge', 'meeting_room'], delegation: 0 },
    shift: 'day', offset: 25,
    states: S('working', 'eating', 'investigating'),
    needs: ['the infrastructure proposal carried', 'the budget balanced', 'constituents heard'],
    knows: { district: 'senate', senate: true, broadcasts: ['senate:result', 'senate:vote', 'disaster'] },
    relationships: [
      { to: 'ilen_rook', kind: 'committee', label: 'the clerk who routes evidence to me', back: 'the senator I file for' },
      { to: 'seran_vale', kind: 'liaison', label: 'the Jedi liaison to my committee', back: 'the senator I report to' },
      { to: 'nera_vos', kind: 'constituent', label: 'the clinic doctor from my district', back: 'my senator' },
      { to: 'vela_marr', kind: 'petition', label: 'the dockmaster whose inspections I am trying to fix', back: 'the senator with the port bill' },
    ],
    voice: { pitch: 1.02, rate: 0.9 },
  },
  {
    id: 'seran_vale', name: 'Seran Vale', title: 'Knight', job: 'jedi', female: false,
    appearance: { archetype: 'jedi', rank: 'knight', species: 'nautolan', gender: 'masculine', age: 'adult', wear: 'clean' },
    personality: 'wry', trade: 'jedi_liaison',
    bind: { work: { landmark: 'senate' }, home: { landmark: 'temple' }, meal: 'home', leisure: 'home', roomPrefs: ['meeting_room', 'lounge', 'library'] },
    shift: 'day', offset: 5,
    states: S('working', 'eating', 'investigating'),
    needs: ['one disruption traced, not all of them', 'the Council briefed', 'meditation'],
    knows: { district: 'senate', senate: true, investigation: true, broadcasts: ['senate:result', 'senate:vote', 'disaster'] },
    relationships: [
      { to: 'asha_merin', kind: 'liaison', label: 'the senator I liaise with', back: 'the Jedi liaison' },
      { to: 'ilen_rook', kind: 'colleague', label: 'the clerk who pulls records for me', back: 'the Jedi liaison' },
      { to: 'tessa_venn', kind: 'witness', label: 'the mechanic who can identify plant parts', back: 'the Jedi asking about diverted parts' },
      { to: 'd4lt', kind: 'witness', label: 'the plant droid with the maintenance log', back: 'the Jedi who asked for the log' },
      { to: 'ral_drenn', kind: 'suspect', label: 'the freight broker whose manifests do not add up', back: 'the Jedi who keeps visiting the depot' },
    ],
    voice: { pitch: 0.9, rate: 0.95 },
  },
  {
    id: 'tavi_renn', name: 'Tavi Renn', title: '', job: 'courier', female: true,
    appearance: { archetype: 'courier', species: 'human', gender: 'feminine', age: 'young', wear: 'worn' },
    personality: 'warm', trade: 'courier',
    bind: { work: { kind: 'transit_station', district: 'residential', prefer: /Skyline Station/i }, home: { kind: 'apartments', near: 'work' }, roomPrefs: ['lobby_atrium', 'lounge'] },
    shift: 'day', offset: -30,
    states: S('working', 'eating', 'waiting-for-resources'),
    needs: ['a train that runs', "her mother's lift fixed", 'jobs that pay by evening'],
    knows: { district: 'residential', transit: true, broadcasts: ['senate:result', 'disaster'] },
    relationships: [
      { to: { lot: 'tavi_renn.home', role: 'key', rename: 'Hessa Renn' }, kind: 'family', label: 'my mother', back: 'my daughter' },
      { to: 'mira_sol', kind: 'neighbour', label: 'the caretaker of our block', back: 'the courier from the fourth floor' },
      { to: 'ilen_rook', kind: 'regular', label: 'the Senate clerk who knows my face', back: 'the courier who files for half the district' },
      { to: 'seli_noor', kind: 'customer', label: 'the diner I run market orders for', back: 'my courier' },
    ],
    voice: { pitch: 1.12, rate: 1.1 },
  },
  {
    id: 'koro_den', name: 'Koro Den', title: '', job: 'foreman', female: false,
    appearance: { archetype: 'salvage_worker', species: 'aqualish', gender: 'masculine', age: 'middle', wear: 'patched' },
    personality: 'gruff', trade: 'salvage',
    bind: { work: { kind: 'recycling_plant', prefer: /Salvage Yard/i, near: 'tessa_venn.work' }, home: { housingNear: 'work' }, meal: 'seli_noor.work', roomPrefs: ['workshop', 'storage', 'control_room'] },
    shift: 'day', offset: -15,
    states: S('working', 'eating', 'waiting-for-resources', 'investigating'),
    needs: ['yard access kept open', 'repairable parts kept in circulation', 'the gang off the gate'],
    knows: { district: 'industrial', business: 'work', broadcasts: ['senate:result', 'disaster'] },
    relationships: [
      { to: 'tessa_venn', kind: 'customer', label: 'the mechanic who takes our reclaimed parts', back: 'the salvage co-op that finds me parts' },
      { to: 'ral_drenn', kind: 'dispute', label: 'the broker whose crew leans on our gate', back: 'the salvage organiser who will not sell' },
      { to: { lot: 'ral_drenn.work', role: 'key' }, kind: 'gang', label: 'the haulage crew that blocks our gate', back: 'the yard boss' },
      { to: 'd4lt', kind: 'colleague', label: 'the plant droid that logs what goes missing', back: 'the salvage organiser who returns plant parts' },
      { to: 'seli_noor', kind: 'regular', label: 'the cook who feeds the co-op', back: 'the salvage organiser who eats here' },
    ],
    voice: { pitch: 0.72, rate: 0.92 },
  },
  {
    id: 'mira_sol', name: 'Mira Sol', title: '', job: 'gardener', female: true,
    appearance: { archetype: 'resident', species: 'togruta', gender: 'feminine', age: 'elder', wear: 'worn' },
    personality: 'warm', trade: 'caretaker',
    bind: { work: { sameAs: 'tavi_renn.home', requireRoom: /garden/, fallback: { kind: 'apartments', hasRoom: /garden/, near: 'tavi_renn.home' } }, home: 'work', roomPrefs: ['garden_terrace', 'roof_garden', 'greenhouse'] },
    shift: 'day', offset: 20,
    states: S('working', 'serving', 'eating'),
    needs: ['the garden watered', 'the noticeboard current', 'the lift working for the old ones'],
    knows: { district: 'residential', residents: true, broadcasts: ['senate:result', 'disaster'] },
    relationships: [
      { to: 'tavi_renn', kind: 'neighbour', label: 'the courier from the fourth floor', back: 'the caretaker of our block' },
      { to: { lot: 'mira_sol.work', role: 'owner' }, kind: 'colleague', label: 'our concierge', back: 'the caretaker of the garden' },
      { to: 'nera_vos', kind: 'colleague', label: 'the doctor who sees my residents', back: 'the caretaker who sends me her residents' },
      { to: 'koro_den', kind: 'supplier', label: 'the salvage organiser who fixed our planter pumps', back: 'the caretaker with the garden pumps' },
    ],
    voice: { pitch: 1.05, rate: 0.9 },
  },
  {
    id: 'ral_drenn', name: 'Ral Drenn', title: '', job: 'foreman', female: false,
    appearance: { archetype: 'black_sun_manager', species: 'human', gender: 'masculine', age: 'middle', wear: 'clean' },
    personality: 'wry', trade: 'brokerage',
    bind: { work: { kind: 'depot', near: 'koro_den.work' }, home: { kind: 'luxury_residences', near: 'work', fallback: { housingNear: 'work' } }, roomPrefs: ['executive_office', 'open_plan_office', 'control_room'] },
    shift: 'day', offset: 30,
    states: S('working', 'serving', 'eating', 'investigating'),
    needs: ['respectable clients kept', 'selected crates routed quietly', 'no records that add up wrong'],
    knows: { district: 'industrial', business: 'work', broadcasts: ['senate:result', 'disaster'] },
    relationships: [
      { to: { lot: { kind: 'warehouse', near: 'work' }, role: 'owner' }, kind: 'client', label: 'a respectable client', back: 'my freight broker' },
      { to: { lot: { kind: 'office', near: 'work' }, role: 'owner' }, kind: 'client', label: 'another respectable client', back: 'my freight broker' },
      { to: 'koro_den', kind: 'dispute', label: 'the salvage organiser who will not sell', back: 'the broker whose crew leans on our gate' },
      { to: 'brin_tal', kind: 'temptation', label: 'a captain with a light freighter and debts', back: 'the broker with the better-paying charter' },
      { to: 'seran_vale', kind: 'suspect', label: 'the Jedi who keeps visiting the depot', back: 'the freight broker whose manifests do not add up' },
    ],
    voice: { pitch: 0.84, rate: 0.96 },
  },
];

export const ANCHOR_IDS = ANCHORS.map((a) => a.id);
export const ANCHOR_BY_ID = Object.fromEntries(ANCHORS.map((a) => [a.id, a]));

// States a lot-staff person may be in, by the job family their purpose category implies
export function statesForJob(job, category) {
  const serving = new Set(['cook', 'server', 'barista', 'bartender', 'vendor', 'shopkeeper', 'tailor', 'pharmacist', 'broker', 'receptionist', 'concierge', 'teller', 'attendant', 'conductor', 'medic', 'nurse', 'clerk', 'waitress droid', 'protocol droid']);
  const investigating = new Set(['guard', 'officer', 'security officer', 'senate guard', 'customs officer', 'warden', 'jedi', 'journalist', 'advocate', 'judge']);
  const waiting = new Set(['cook', 'mechanic', 'technician', 'engineer', 'smelter', 'foreman', 'dock worker', 'operator', 'droid tech', 'astromech', 'maintenance droid', 'cargo droid', 'stock', 'quartermaster', 'medic', 'pharmacist', 'shopkeeper', 'vendor', 'gardener']);
  const out = [...BASE_STATES, 'working'];
  if (!/droid/.test(job)) out.push('eating');
  if (serving.has(job) || category === 'food' || category === 'retail' || category === 'hospitality') out.push('serving');
  if (investigating.has(job)) out.push('investigating');
  if (waiting.has(job) || category === 'industry') out.push('waiting-for-resources');
  return out;
}

export { PORT };
