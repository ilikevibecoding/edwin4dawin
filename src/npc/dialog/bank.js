// Composed line banks for persistent people (spec §12, rubric 14 section B). A bank is >= 30 lines per person in the
// seven categories, composed from fragments - trade vocabulary x personality x situation templates - and filled with
// the person's own facts (workplace, home, coworker, supplier, family, the goods they really sell). Two people of the
// same trade share a template pool but not a bank: the seeded pick, the fills and the personality openers make every
// bank its own, and scripts/test-cast.mjs asserts the distinctness rules. Every line carries `when`, the eligibility
// conditions dialog/api.js evaluates against the real context, so a state claim (shortage, late shipment, a Senate
// result) can only be said when the state supports it. Static fills happen here; `{price}`, `{stockQty}`,
// `{senateScenario}`, `{disaster}` and the other live facts stay as tokens filled at say-time from the context.
import { RNG, hash2 } from '../../rng.js';
import { itemName } from './dialog.js';
import { PORT } from '../coruscant/port.js';
import { DISTRICT_NAME } from '../cast/persistent.js';

export const CATEGORIES = ['greet', 'work', 'personal', 'event', 'trust', 'task', 'farewell'];
// minimum distribution (spec §12) for staff, and what a composed bank aims for
export const MIN_DIST = { greet: 5, work: 6, personal: 5, event: 5, trust: 4, task: 3, farewell: 2 };
export const STAFF_DIST = { greet: 5, work: 7, personal: 5, event: 5, trust: 4, task: 3, farewell: 3 };
export const PRIORITY = { greet: 3, work: 2, personal: 1, event: 4, trust: 2, task: 3, farewell: 2, interrupt: 5 };
export const COOLDOWN = { greet: 120, work: 90, personal: 180, event: 240, trust: 240, task: 300, farewell: 60, interrupt: 20 };
const TONES = { brisk: ['brisk', 'gruff', 'wry'], warm: ['warm', 'wry'], wry: ['wry', 'warm', 'brisk'], formal: ['formal', 'brisk'], gruff: ['gruff', 'brisk', 'wry'], anxious: ['anxious', 'formal', 'warm'] };
const OPENERS = {
  brisk: ['Right.', 'Quick version:', 'Short answer:'], warm: ['Ah, hello.', 'Well now.', 'Oh, good.'], wry: ['Mm.', 'Funny thing.', 'Between us:'],
  formal: ['Certainly.', 'For the record:', 'To be precise:'], gruff: ['Hm.', 'Listen.', 'Fine.'], anxious: ['Oh.', 'Sorry, sorry.', 'Um.'],
};

// ---------------------------------------------------------------------------------------------------- trade vocabulary
export const TRADES = {
  food: { goods: ['nerf stew', 'jogan pie', 'blue-milk tea'], tools: ['ladle', 'order pad', 'heat lamp'], stations: ['counter', 'kitchen pass', 'grill'], tasks: ['prepping the stock pots', 'wiping the counter', 'plating the rush', 'counting the till'], troubles: ['the grill runs hot', 'the produce came in bruised', 'the caf machine only works when it is watched'], customers: 'regulars', component: 'a replacement burner' },
  retail: { goods: ['a spare relay', 'a power cell', 'a good tarp'], tools: ['price scanner', 'stock ledger', 'shelf key'], stations: ['front counter', 'stockroom', 'display wall'], tasks: ['restocking the shelves', 'checking the ledger', 'pricing the new crate', 'dusting the display'], troubles: ['the supplier changed the packaging again', 'someone unpacks things and never buys', 'the shelf lights flicker'], customers: 'customers', component: 'the restock crate' },
  office: { goods: ['a filing', 'an appointment', 'a notarised copy'], tools: ['datapad', 'stylus', 'file index'], stations: ['front desk', 'file room', 'meeting table'], tasks: ['clearing the inbox', 'filing the morning forms', 'chasing signatures', 'reconciling the ledger'], troubles: ['the index is a week behind', 'signatures come back unsigned', 'the terminal reboots at noon'], customers: 'clients', component: 'a new terminal core' },
  civic: { goods: ['a permit', 'a stamped form', 'a hearing slot'], tools: ['stamp', 'permit ledger', 'queue board'], stations: ['front counter', 'records room', 'inspection bay'], tasks: ['clearing the queue', 'stamping permits', 'reading manifests', 'logging inspections'], troubles: ['the queue is longer than the shift', 'half the forms arrive wrong', 'the seal printer jams'], customers: 'applicants', component: 'a new seal printer' },
  security: { goods: ['a patrol pass', 'an incident report'], tools: ['stun baton', 'comm unit', 'scanner'], stations: ['post', 'checkpoint', 'monitor wall'], tasks: ['walking the perimeter', 'checking badges', 'watching the monitors', 'writing up the shift'], troubles: ['the monitors go dark for a second every hour', 'people argue with a badge scanner', 'the relief is always late'], customers: 'visitors', component: 'a scanner relay' },
  medical: { goods: ['bacta', 'dressings', 'a stim'], tools: ['scanner', 'bacta dispenser', 'chart'], stations: ['triage desk', 'ward', 'dispensary'], tasks: ['running triage', 'restocking the dispensary', 'reading charts', 'changing dressings'], troubles: ['the bacta crates clear customs slowly', 'the ward is full by noon', 'the scanner drifts'], customers: 'patients', component: 'a scanner calibrator' },
  industry: { goods: ['a coupling', 'a relay', 'a sheet of plating'], tools: ['torque driver', 'welder', 'lifter'], stations: ['bench', 'line', 'loading bay'], tasks: ['clearing the line', 'logging the intake', 'testing couplings', 'loading the bay'], troubles: ['the line jams on the third cycle', 'parts arrive without the fittings', 'the lifter needs a new cell'], customers: 'clients', component: 'a coupling' },
  transport: { goods: ['a ticket', 'a ride', 'a timetable'], tools: ['ticket punch', 'timetable board', 'signal comm'], stations: ['platform', 'dispatch desk', 'barrier'], tasks: ['clearing the platform', 'checking tickets', 'calling the delays', 'reading the board'], troubles: ['the board says one thing and the train another', 'the barrier sticks', 'someone always misses the last one'], customers: 'passengers', component: 'a signal relay' },
  hospitality: { goods: ['a room for the night', 'a key', 'a laundry slot'], tools: ['key rack', 'register', 'lift key'], stations: ['front desk', 'lobby', 'laundry'], tasks: ['sorting the post', 'resetting the lift', 'logging complaints', 'walking the corridors'], troubles: ['the lift stops between floors', 'the residents argue about the noise', 'the laundry floods on rest days'], customers: 'residents', component: 'a lift controller' },
  leisure: { goods: ['a table', 'a drink', 'a ticket'], tools: ['door list', 'sound board', 'chip tray'], stations: ['door', 'floor', 'bar'], tasks: ['setting up the floor', 'checking the door list', 'balancing the sound', 'counting the tray'], troubles: ['the crowd comes late and leaves later', 'the sound rig hums', 'nobody reads the door rules'], customers: 'guests', component: 'a sound amplifier' },
  learning: { goods: ['a lesson', 'a reading list', 'a quiet hour'], tools: ['reader', 'archive key', 'lesson board'], stations: ['reading room', 'lesson hall', 'archive'], tasks: ['setting the lessons', 'reshelving the archive', 'marking the readers', 'keeping the hall quiet'], troubles: ['the readers wander', 'the archive damp is back', 'the hall echoes'], customers: 'students', component: 'a new reader' },
  port_control: { goods: ['a pad slot', 'a clearance'], tools: ['pad roster', 'clearance stamp', 'tower comm'], stations: ['control desk', 'tower', 'pad line'], tasks: ['clearing the pad roster', 'logging arrivals', 'chasing inspections', 'reading manifests'], troubles: ['customs holds every third crate', 'pilots argue with the roster', 'the tower comm drops at dusk'], customers: 'crews', component: 'a comm relay' },
  freighter_captain: { goods: ['a charter', 'cargo space'], tools: ['manifest', 'fuel gauge', 'nav computer'], stations: ['cockpit', 'cargo ramp', 'pad'], tasks: ['checking the manifest', 'nursing the coolant loop', 'chasing a charter', 'watching the fuel gauge'], troubles: ['the coolant loop needs a mechanic', 'customs sits on the manifest', 'charters pay late'], customers: 'clients', component: 'a coolant coupling' },
  repair: { goods: ['a coupling', 'a relay', 'a rebuilt regulator'], tools: ['torque driver', 'welder', 'diagnostic rig'], stations: ['bench', 'hangar floor', 'parts wall'], tasks: ['stripping a regulator', 'testing relays', 'sorting reclaimed parts', 'chasing a bill'], troubles: ['ship parts and plant parts keep getting mixed', 'bills go unpaid', 'the diagnostic rig lies'], customers: 'pilots', component: 'a coupling' },
  utility_droid: { goods: ['a diagnostic', 'a relay swap'], tools: ['probe arm', 'diagnostic jack', 'log buffer'], stations: ['reactor room', 'droid bay', 'circuit 7-Besh'], tasks: ['reading the maintenance topology', 'logging faults', 'requesting authorisations', 'running a charge cycle'], troubles: ['authorisation lags the fault', 'relays go missing between the log and the shelf', 'the topology has undocumented nodes'], customers: 'operators', component: 'a replacement relay' },
  diner: { goods: ['nerf steak', 'stew', 'caf'], tools: ['ladle', 'order pad', 'grill'], stations: ['counter', 'grill', 'back booth'], tasks: ['feeding the night shift', 'counting the produce', 'saving plates', 'wiping the counter'], troubles: ['the market delivery is late', 'the grill runs hot', 'a regular stops coming'], customers: 'regulars', component: 'a replacement burner' },
  clinic: { goods: ['bacta', 'dressings', 'a scan'], tools: ['scanner', 'bacta dispenser', 'chart'], stations: ['triage desk', 'ward', 'dispensary'], tasks: ['running triage', 'counting bacta', 'arguing with customs', 'reading charts'], troubles: ['customs holds the medical crates', 'the ward fills by noon', 'the scanner drifts'], customers: 'patients', component: 'a bacta crate' },
  senate_clerk: { goods: ['a filing', 'a hearing slot', 'a certified copy'], tools: ['petition ledger', 'stamp', 'schedule board'], stations: ['clerk desk', 'archive', 'committee door'], tasks: ['filing petitions', 'keeping the hearing schedule', 'routing evidence', 'chasing signatures'], troubles: ['petitions arrive in the wrong form', 'committees move without telling the clerk', 'the archive index lags'], customers: 'petitioners', component: 'a new schedule board' },
  senator: { goods: ['a hearing', 'a vote', 'a signature'], tools: ['briefing', 'delegation seal', 'chamber pass'], stations: ['delegation suite', 'committee room', 'chamber'], tasks: ['reading briefings', 'counting votes', 'hearing constituents', 'writing the proposal'], troubles: ['the budget never balances', 'votes move for reasons that are not the bill', 'constituents are right too often'], customers: 'constituents', component: 'a majority' },
  jedi_liaison: { goods: ['a briefing', 'a question'], tools: ['lightsaber', 'briefing', 'patience'], stations: ['committee room', 'Temple steps', 'the depot gate'], tasks: ['briefing the Council', 'sitting in committee', 'tracing one disruption', 'meditating'], troubles: ['everyone wants all the disruptions traced at once', 'manifests do not add up', 'committees talk'], customers: 'senators', component: 'one honest manifest' },
  courier: { goods: ['a delivery', 'a message'], tools: ['satchel', 'route pad', 'transit pass'], stations: ['station lobby', 'platform', 'the fourth-floor landing'], tasks: ['running market orders', 'filing at the Senate', 'waiting for a train', 'carrying messages'], troubles: ['the train is late', 'the lift at home is out', 'jobs pay by evening or not at all'], customers: 'clients', component: 'a train that runs' },
  salvage: { goods: ['reclaimed plating', 'a rebuilt coupling', 'sorted scrap'], tools: ['cutter', 'sorting rack', 'yard ledger'], stations: ['yard gate', 'sorting floor', 'bench'], tasks: ['sorting the intake', 'keeping the gate open', 'rebuilding couplings', 'logging what came in'], troubles: ['the gang leans on the gate', 'plant parts turn up in the scrap', 'the cutter needs a new cell'], customers: 'mechanics', component: 'a cutter cell' },
  caretaker: { goods: ['a watered planter', 'a notice', 'a word with the concierge'], tools: ['watering can', 'noticeboard', 'planter pump'], stations: ['garden terrace', 'noticeboard', 'the lift landing'], tasks: ['watering the terrace', 'updating the noticeboard', 'checking on the old ones', 'coaxing the planter pumps'], troubles: ['the lift stops between floors', 'the planter pumps stall', 'the noticeboard fills with arguments'], customers: 'residents', component: 'a pump cell' },
  brokerage: { goods: ['a routing', 'a manifest', 'a quiet crate'], tools: ['manifest ledger', 'routing board', 'a smile'], stations: ['front office', 'depot floor', 'the back office'], tasks: ['keeping clients respectable', 'routing crates', 'balancing the manifests', 'handling the crew'], troubles: ['records add up wrong', 'the Jedi keep visiting', 'the salvage yard will not sell'], customers: 'clients', component: 'a manifest that adds up' },
};
const JOB_TRADE = { guard: 'security', 'security officer': 'security', 'senate guard': 'security', 'customs officer': 'civic', officer: 'security', warden: 'security', medic: 'medical', nurse: 'medical', pharmacist: 'medical', surgeon: 'medical', cook: 'food', server: 'food', barista: 'food', bartender: 'food', 'waitress droid': 'food', mechanic: 'industry', technician: 'industry', engineer: 'industry', foreman: 'industry', 'dock worker': 'industry', operator: 'industry', 'droid tech': 'industry', astromech: 'industry', 'maintenance droid': 'industry', conductor: 'transport', attendant: 'transport', concierge: 'hospitality', receptionist: 'office', clerk: 'office', teller: 'office', archivist: 'learning', librarian: 'learning', teacher: 'learning', gardener: 'hospitality' };

// ---------------------------------------------------------------------------------------------------- templates
// t: text with {slots}; tone: personalities allowed (absent = any); when: eligibility; needs: fill keys required;
// droid / human: restricted to droids / organics; rumor: hedged hearsay; ambient: also usable as chatter
const T = {
  greet: [
    { t: "Haven't seen you in {place} before. I'm {first}; I keep this place running.", tone: ['warm', 'brisk'], when: { met: 'first' }, human: true },
    { t: 'New face. If you were looking for {place}, you found it.', tone: ['brisk', 'gruff', 'wry'], when: { met: 'first' } },
    { t: "Welcome to {place}. State your business and I'll see what can be done.", tone: ['formal'], when: { met: 'first' } },
    { t: "Don't know you. {place} does not get many strangers, and I am not complaining - yet.", tone: ['gruff', 'wry'], when: { met: 'first' }, human: true },
    { t: "Oh - hello. Sorry, I wasn't expecting anyone this side of the {station} at {place}.", tone: ['anxious', 'warm'], when: { met: 'first' }, human: true },
    { t: "First time at {place}? Everyone's first time looks exactly like that.", tone: ['wry', 'warm'], when: { met: 'first' }, human: true },
    { t: 'You are not in my recognition log. Logging you now. Welcome to {place}.', when: { met: 'first' }, droid: true },
    { t: "You'd be new to {district}, then. Most faces around {place} I know by now.", when: { met: 'first' } },
    { t: 'Back again. {place} grows on people, I am told.', tone: ['wry', 'brisk'], when: { met: 'returning' } },
    { t: 'Good to see you again at {place}. Come in - mind the {tool}.', tone: ['warm', 'anxious'], when: { met: 'returning' }, human: true },
    { t: 'You again, at {place}. Fine. What is it this time?', tone: ['gruff'], when: { met: 'returning' } },
    { t: 'Ah, you are back. I remember your face from last time - not many come twice to {place}.', when: { met: 'returning' } },
    { t: 'Returning visitor recognised at {place}. My record shows we have spoken before.', when: { met: 'returning' }, droid: true },
    { t: 'Right, I know you from {place}. Give me a moment with this {tool} and I am yours.', tone: ['brisk', 'formal', 'wry'], when: { met: 'returning' } },
    { t: "You came back to {place}. Good - I was afraid I'd scared you off last time.", tone: ['anxious', 'warm'], when: { met: 'returning' }, human: true },
    { t: "Twice now at {place}. Once more and I'll start calling you a {customers}.", tone: ['wry', 'warm', 'brisk'], when: { met: 'returning' } },
    { t: 'There is the one who actually finished the job for {place}. Not many do.', when: { met: 'afterJob' } },
    { t: 'You sorted that job for us. {place} owes you a drink at the very least.', tone: ['warm', 'wry'], when: { met: 'afterJob' }, human: true },
    { t: 'The work you did for {place} held up. I checked. Twice.', tone: ['gruff', 'brisk', 'formal'], when: { met: 'afterJob' } },
    { t: 'Task completion for {place} is confirmed in my records. Your reliability rating has been updated.', when: { met: 'afterJob' }, droid: true },
    { t: 'You did the run I asked for, so today you get the polite version of {first}.', tone: ['wry', 'gruff'], when: { met: 'afterJob' } },
  ],
  work: [
    { t: '{place} deals in {good}, mostly. {price} credits if you want one.', when: { stock: 'ok' }, needs: ['good'] },
    { t: "{place} is down to the last of the {good}. Until the next crate lands, don't ask me for a discount.", when: { stock: 'low' }, needs: ['good'] },
    { t: 'Out of {good} at {place} entirely. That is not a sales tactic, it is a shortage.', when: { stock: 'out' }, needs: ['good'] },
    { t: 'Waiting on {component} from {supplierPlace}. Nothing gets finished at {place} until it turns up.', when: { waiting: true }, needs: ['supplierPlace'] },
    { t: '{supplier} over at {supplierPlace} keeps us stocked - when the deliveries actually come.', needs: ['supplier'] },
    { t: 'My day at {place} is {task}, then {task2}, then whatever breaks.', human: true },
    { t: 'The {station} at {place} has seen more hours than I have. It is older than half of {district}.' },
    { t: 'Between the {tool} and the {customers}, you do not get a slow minute at {place}.' },
    { t: 'We are open at {place}; {hours}. After that you would be talking to a locked door.', when: { open: true }, needs: ['hours'] },
    { t: '{place} is closed, technically. I am only still here because {trouble}.', when: { open: false } },
    { t: '{troubleCap} - that is {place} in one sentence.' },
    { t: 'Ask {coworker} about the {station}; that end of {place} is theirs.', needs: ['coworker'] },
    { t: 'The {customers} at {place} come in waves. Mornings are {shift} people; evenings are everyone else.' },
    { t: 'Function at {place}: {task}. Current cycle: {task2}. Efficiency within tolerance.', droid: true },
    { t: 'If you need {good2}, {place} stocks it at {price2}. If you need advice, that is free and worth about that much.', when: { stock: 'ok' }, needs: ['good2'] },
    { t: 'The last shipment landed, so the shelves at {place} are honest for once.', when: { shipment: 'arrived' } },
    { t: 'The shipment for {place} is late. Every one of the {customers} asks about {good} and I give the same answer.', when: { shipment: 'late' }, needs: ['good'] },
    { t: 'I run the {station} at {place}. {bossName} runs everything else, or says so.', needs: ['bossName'] },
    { t: 'I run {place}. {coworker} handles the {station}; I handle the complaints.', needs: ['coworker'], when: { role: 'owner' } },
    { t: '{stockQty} of {good} on the shelf at {place} right now. I count them more often than I would like.', when: { stock: 'ok' }, needs: ['good'] },
    { t: 'The {tool} broke twice this tenday. {supplier} says the replacement is coming. {supplier} says a lot of things.', needs: ['supplier'], tone: ['wry', 'gruff', 'brisk'] },
  ],
  personal: [
    { t: 'I live at {home}, in {homeDistrict}. Walkable, if you count the lifts.', needs: ['home'], human: true },
    { t: 'My {familyRelation}, {familyName}, keeps a place at {home} too. We eat together when the shifts line up.', needs: ['familyName'], human: true },
    { t: '{neighbour} lives on my floor at {home}. Good neighbour. Loud door.', needs: ['neighbour', 'home'] },
    { t: 'I grew up in {district}, two streets from {home}. Never saw a reason to leave that a shuttle ticket could fix.', needs: ['home'], human: true },
    { t: '{landmark} is where I go when I am off from {place}. You can see half the city from the steps.', needs: ['landmark'], human: true },
    { t: 'The lift at {home} has been out twice this month. I know every stair by name now.', needs: ['home'], human: true },
    { t: 'My {familyRelation} {familyName} thinks this job is temporary. It has been temporary for eleven years.', needs: ['familyName'], tone: ['wry', 'gruff', 'warm'], human: true },
    { t: 'Off shift I eat at {mealPlace}; {mealOwner} knows my order before I sit.', needs: ['mealPlace', 'mealOwner'], human: true },
    { t: "Everybody at {home} knows everybody's business. The trick is knowing which bits to forget.", needs: ['home'] },
    { t: 'Nights are the best time at {place}. The lights come on and the noise finally finds a rhythm.' },
    { t: 'I keep one plant on the sill at {home}. It is the only thing in {district} that never asks me for anything.', needs: ['home'], tone: ['warm', 'wry', 'anxious'], human: true },
    { t: 'My charging station is at {home}. Idle cycles are spent defragmenting eleven years of memory.', needs: ['home'], droid: true },
    { t: '{regular} is in here most days. Same table, same complaint about the {station}.', needs: ['regular'] },
    { t: 'My {familyRelation} {familyName} says I talk about work too much. Then asks how {place} was.', needs: ['familyName'], human: true },
    { t: '{coworker} and I have shared the {station} for years. We stopped arguing about the {tool} in the first one.', needs: ['coworker'] },
    { t: 'Home is {home}. Work is {place}. The walk between them is the only time nobody wants anything.', needs: ['home'], human: true },
    { t: 'I have logged four thousand shifts at {place}. The organics call that dedication. I call it firmware.', droid: true },
    { t: 'On rest days I take the long way through {plazaName} and pretend I have somewhere to be.', needs: ['plazaName'], human: true },
  ],
  event: [
    { t: 'The Senate carried the {senateScenario} vote. At {place} we will believe it when the first credit arrives.', when: { senate: 'passed' } },
    { t: 'The {senateScenario} proposal failed in the chamber. Everyone at {place} saw that coming except the Senate.', when: { senate: 'failed' } },
    { t: 'The Senate is in session on {senateScenario} today. You can tell at {place} by how quiet the aides have gone.', when: { senateSitting: true } },
    { t: 'Half of {district} felt that {disaster}. I was mid-{task} at {place} and the whole {station} shook.', when: { disaster: true } },
    { t: 'Still shaking a little from the {disaster}; so is the {station} at {place}. Give me a minute before you ask for anything.', when: { recovering: true } },
    { t: 'Night trade is different at {place}. Fewer {customers}, more questions I do not answer.', when: { period: ['evening', 'night', 'late'] } },
    { t: 'Mornings at {place} are all {task}. Do not expect conversation before the first hour is done.', when: { period: ['dawn', 'morning'] } },
    { t: 'Word from {supplierPlace}: the crate is stuck at customs. Word from me at {place}: same as yesterday.', when: { shipment: 'late' }, needs: ['supplierPlace'] },
    { t: 'A shipment just came in at Westport. Everyone at {place} is waiting to hear what was in it.', when: { event: 'economy:shipment' } },
    { t: 'They have called the {disaster} over. At {place} the cleaning up is the part nobody broadcasts.', when: { event: 'disaster:cleared' } },
    { t: 'They say the customs house holds crates for whoever pays the most. I only know that the crate for {place} is late.', rumor: true },
    { t: 'Word is the freight brokers in the Works move more than freight. Word is cheap at {place}.', rumor: true },
    { t: 'Someone told me the Jedi have a liaison sitting in Senate committees now. Someone tells {first} a lot of things.', rumor: true },
    { t: 'The trains have run on time all week. I say that quietly at {place}, so nothing hears me.', when: { trainsOk: true } },
    { t: 'There is a freighter down on the pads right now; you can hear the coolant venting from the {station}.', when: { shipOnPad: true } },
    { t: 'The plant droid keeps logging missing relays, or so they say at {place}. Relays do not walk.', rumor: true },
    { t: 'A Senator has a port bill in committee, I hear. The dockmaster has been saying so to anyone at {place} who stands still.', rumor: true },
    { t: 'Nothing has happened at {place} today, which in {district} counts as news.', when: { quiet: true } },
  ],
  trust: [
    { t: 'You have done right by {place}. If you need a favour, ask before I change my mind.', when: { standing: 'trusted' } },
    { t: 'I do not know you well enough to lend you the {tool} from {place}, let alone anything that matters.', when: { standing: 'neutral' } },
    { t: 'Those who barge through {district} get noticed. {place} noticed; so did I.', when: { standing: 'suspect' } },
    { t: 'You shoved past me once at {place}. I remember that better than I remember most faces.', when: { offences: '>0' }, human: true },
    { t: 'The back of {place} is staff only. Trust is not a word here, it is a key.', when: { standing: 'neutral' } },
    { t: 'Come round the back next time; {coworker} will let you through if I am not here.', when: { standing: 'trusted' }, needs: ['coworker'] },
    { t: 'Access to the {station} at {place} needs a badge. I cannot get you one, and I would not yet.', when: { standing: ['neutral', 'suspect'] } },
    { t: 'Your access level at {place} is: visitor. Escalation requires an authorised organic.', when: { standing: ['neutral', 'suspect'] }, droid: true },
    { t: 'I keep a list of people I would hide in a raid on {place}. You are not on it. You are not off it either.', when: { standing: 'neutral' }, tone: ['wry', 'gruff'], human: true },
    { t: 'Do the {customers} at {place} a good turn and word gets round {district} faster than any broadcast.', when: { standing: ['neutral', 'trusted'] } },
    { t: 'Your record with {place} is clean and useful. That combination opens doors around the {station}.', when: { standing: 'trusted' }, droid: true },
    { t: 'Twice you have caused trouble at {place}. A third time and the {tool} comes out.', when: { offences: '>1' } },
  ],
  task: [
    { t: 'The board at {terminal} has a run posted - {jobTitle}. Take it before someone from {place} does.', when: { job: 'available' }, needs: ['terminal'] },
    { t: 'Nothing on the board at {terminal} today. Come back to {place} when a crate goes missing; one always does.', when: { job: 'none' }, needs: ['terminal'] },
    { t: 'If you pass {supplierPlace}, tell {supplier} we are still waiting. They pretend not to hear me.', needs: ['supplier'] },
    { t: 'What {place} needs is {need}. If you know how to make that happen, you are ahead of me.' },
    { t: 'Bring word of what is happening at {landmark} back to {place}; I never get out that far.', needs: ['landmark'], human: true },
    { t: 'Requesting assistance for {place}: {need}. Compensation is available within the usual parameters.', droid: true },
    { t: 'Someone reliable could carry a message to {coworker} for me. You do not look unreliable.', needs: ['coworker'] },
    { t: 'There is a job in it if you can find {component} for less than {supplier} charges.', needs: ['supplier'] },
    { t: 'Check the board at {terminal}. Whatever is on it pays better than standing at {place} with me.', when: { job: 'available' }, needs: ['terminal'] },
  ],
  farewell: [
    { t: 'Right. The {station} will not run itself; mind the lifts on your way out of {place}.', trigger: 'farewell' },
    { t: 'Take care out there. {district} is kinder than it looks, mostly, and {place} kinder still.', trigger: 'farewell', tone: ['warm', 'wry', 'anxious'] },
    { t: 'That is all I have. The {customers} at {place} will not wait.', trigger: 'farewell', tone: ['brisk', 'gruff', 'formal'] },
    { t: 'Go on, then. Come back when you have news for {place}, not before.', trigger: 'farewell', tone: ['gruff', 'wry'] },
    { t: 'Conversation at {place} logged. Resuming {task}.', trigger: 'farewell', droid: true },
    { t: 'Safe walking. Tell {coworker} I said you were all right, if you see them.', trigger: 'farewell', needs: ['coworker'], human: true },
    { t: 'Not now. Come back when the {tool} is down and the {customers} are gone.', trigger: 'interrupt' },
    { t: 'Mind the {tool}! Eyes up when you walk through {place}.', trigger: 'interrupt' },
    { t: 'Hands off. Ask first.', trigger: 'interrupt', when: { poke: true }, human: true },
    { t: 'You are standing in my light at the {station}. Move along, please.', trigger: 'interrupt', tone: ['gruff', 'brisk', 'formal'] },
    { t: 'One moment; I am in the middle of {task} for {place}.', trigger: 'interrupt' },
    { t: 'Physical contact is not required to get my attention. A word will do.', trigger: 'interrupt', when: { poke: true }, droid: true },
  ],
};

// quotas: the `when` groups a category must cover so a question always has an answer
const QUOTAS = {
  greet: [[(x) => x.when && x.when.met === 'first', 2], [(x) => x.when && x.when.met === 'returning', 2], [(x) => x.when && x.when.met === 'afterJob', 1]],
  work: [[(x) => !x.when, 2], [(x) => x.when && x.when.stock === 'ok', 1], [(x) => x.when && (x.when.stock === 'low' || x.when.stock === 'out' || x.when.waiting), 1]],
  personal: [[(x) => !x.when, 5]],
  event: [[(x) => x.rumor, 2], [(x) => x.when && x.when.senate, 1], [(x) => x.when && (x.when.disaster || x.when.recovering), 1]],
  trust: [[(x) => x.when && (x.when.standing === 'trusted'), 1], [(x) => x.when && (x.when.standing === 'neutral' || (Array.isArray(x.when.standing) && x.when.standing.includes('neutral'))), 1], [(x) => x.when && (x.when.standing === 'suspect' || (Array.isArray(x.when.standing) && x.when.standing.includes('suspect'))), 1]],
  task: [[(x) => x.when && x.when.job === 'available', 1], [(x) => x.when && x.when.job === 'none', 1], [(x) => !x.when, 1]],
  farewell: [[(x) => x.trigger === 'farewell', 1], [(x) => x.trigger === 'interrupt' && !(x.when && x.when.poke), 1]],
};

// ---------------------------------------------------------------------------------------------------- fills
export function buildFills(pp, world) {
  const reg = world.registry;
  const person = pp.person;
  const purpose = pp.lot.work !== PORT ? reg.purposeOf.get(pp.lot.work) : null;
  const trade = TRADES[pp.trade] || TRADES[JOB_TRADE[pp.job]] || TRADES.office;
  const rng = new RNG((pp.seed ^ 0xf111) >>> 0);
  const pick = (arr) => arr[Math.floor(rng.next() * arr.length)];
  const rel = (kinds) => pp.relationships.find((r) => kinds.includes(r.kind));
  const cow = rel(['coworker', 'colleague']);
  const sup = rel(['supplier']);
  const reg2 = rel(['regular', 'host']);
  const nb = rel(['neighbour']);
  const supPP = sup ? reg.get(sup.id) : null;
  const sells = purpose && purpose.sells && purpose.sells.length ? purpose.sells : [];
  const good = sells[0] || null, good2 = sells[1] || null;
  const tasks = trade.tasks.slice();
  const task = tasks.splice(Math.floor(rng.next() * tasks.length), 1)[0];
  const task2 = pick(tasks);
  const trouble = pick(trade.troubles);
  const first = pp.droid ? pp.name : pp.name.replace(/^(Dr|Nurse|Director|Lt|Inspector|Foreman|Cmdr|Padawan|Master|Magistrate|Senator|Vice Chair)\s+/, '').split(' ')[0];
  const landmark = world.nearestLandmark ? world.nearestLandmark(pp.lot.work) : null;
  const terminal = world.nearestTerminal ? world.nearestTerminal(pp.lot.work) : null;
  const meal = pp.lot.meal != null && pp.lot.meal !== PORT && pp.lot.meal !== pp.lot.work ? pp.lot.meal : null;
  const mealRoles = meal != null ? reg.lotRoles.get(meal) : null;
  const mealOwner = mealRoles ? (mealRoles.owner || mealRoles.key) : null;
  const roles = pp.lot.work !== PORT ? reg.lotRoles.get(pp.lot.work) : null;
  const boss = roles && pp.roleTag === 'key' && roles.owner && roles.owner !== pp ? roles.owner : null;
  const hours = purpose && purpose.hours ? (purpose.hours[0] === 0 && purpose.hours[1] >= 24 ? 'we never close' : `we open at ${hourWord(purpose.hours[0])} and close at ${hourWord(purpose.hours[1])}`) : null;
  const shift = pp.shift === 'night' ? 'night-shift' : pp.shift === 'evening' ? 'late-shift' : 'early-shift';
  const f = {
    name: pp.name, first, place: pp.workName, district: DISTRICT_NAME[pp.district] || pp.district || 'the district', homeDistrict: DISTRICT_NAME[pp.homeDistrict] || DISTRICT_NAME[pp.district] || 'the district',
    home: pp.lot.home != null && pp.lot.home !== PORT ? pp.homeName : (pp.lot.home === PORT ? 'the crew bunks at Westport' : null),
    good: good ? itemName(good.item) : null, price: good ? String(good.price) : null, good2: good2 ? itemName(good2.item) : null, price2: good2 ? String(good2.price) : null,
    tool: pick(trade.tools), station: pick(trade.stations), task, task2, trouble, troubleCap: trouble.charAt(0).toUpperCase() + trouble.slice(1), customers: trade.customers, component: trade.component,
    coworker: cow ? cow.name : null, supplier: sup ? sup.name : null, supplierPlace: supPP ? supPP.workName : null, regular: reg2 ? reg2.name : null, neighbour: nb ? nb.name : null,
    familyName: pp.family ? pp.family.name : null, familyRelation: pp.family ? pp.family.relation : null, landmark: landmark || null, terminal: terminal || null,
    mealPlace: meal != null ? reg.lotName(meal) : null, mealOwner: mealOwner ? mealOwner.name : null, bossName: boss ? boss.name : null, hours, shift,
    plazaName: person.plaza != null && person.plaza !== PORT ? reg.lotName(person.plaza) : null, need: pp.needs[0] || null,
  };
  if (f.landmark && f.landmark === f.place) f.landmark = null;
  return { fills: f, trade, goodKey: good ? good.item : null, good2Key: good2 ? good2.item : null };
}
function hourWord(h) { h = ((h % 24) + 24) % 24; if (h === 0) return 'midnight'; if (h === 12) return 'noon'; return h < 12 ? `${h} in the morning` : `${h - 12} in the ${h < 18 ? 'afternoon' : 'evening'}`; }

const LIVE_TOKENS = new Set(['price', 'price2', 'stockQty', 'senateScenario', 'disaster', 'jobTitle', 'shipName', 'shipDest']);
export function fillStatic(text, fills) {
  return text.replace(/\{(\w+)\}/g, (m, k) => (LIVE_TOKENS.has(k) ? m : (fills[k] != null ? fills[k] : m)));
}
// Live tokens are filled at say-time from the context (dialog/api.js); the test's scenario contexts provide them too.
export function fillLive(text, ctx) {
  return text.replace(/\{(\w+)\}/g, (m, k) => {
    switch (k) {
      case 'price': return ctx.price != null ? String(ctx.price) : m;
      case 'price2': return ctx.price2 != null ? String(ctx.price2) : m;
      case 'stockQty': return ctx.stockQty != null ? String(ctx.stockQty) : m;
      case 'senateScenario': return ctx.senateScenario || m;
      case 'disaster': return ctx.disaster || m;
      case 'jobTitle': return ctx.jobTitle || m;
      case 'shipName': return ctx.shipName || m;
      case 'shipDest': return ctx.shipDest || m;
      default: return m;
    }
  });
}

// ---------------------------------------------------------------------------------------------------- composition
// Compose the bank of a persistent person. `world`: { registry, nearestLandmark(lotId), nearestTerminal(lotId) }.
// `dist` overrides the per-category counts (cast members top up their handwritten lines with fewer composed ones).
export function composeBank(pp, world, dist = STAFF_DIST, startIndex = {}) {
  const { fills, goodKey, good2Key } = buildFills(pp, world);
  const rng = new RNG((pp.seed ^ 0xba7c) >>> 0);
  const tones = TONES[pp.personality] || TONES.brisk;
  const openers = OPENERS[pp.personality] || OPENERS.brisk;
  const lines = [];
  const usedText = new Set();
  const counter = {};
  for (const cat of CATEGORIES) {
    const want = dist[cat] || 0;
    if (!want) continue;
    const pool = T[cat].filter((x) => (pp.droid ? !x.human : !x.droid) && (!x.tone || x.tone.some((t) => tones.includes(t)) || pp.droid) && (!x.needs || x.needs.every((k) => fills[k] != null))
      && (!x.when || !x.when.role || x.when.role === pp.roleTag) && (!x.when || !x.when.senateSitting || pp.knows.senate) && (!x.when || x.when.shipOnPad === undefined || pp.district === 'spaceport' || pp.knows.port));
    const chosen = [];
    const take = (x) => { if (x && !chosen.includes(x)) chosen.push(x); };
    for (const [match, n] of QUOTAS[cat] || []) {
      const cands = shuffle(pool.filter((x) => match(x) && !chosen.includes(x)), rng);
      for (let i = 0; i < n && i < cands.length; i++) take(cands[i]);
    }
    const rest = shuffle(pool.filter((x) => !chosen.includes(x)), rng);
    for (const x of rest) { if (chosen.length >= want) break; take(x); }
    for (const x of chosen) {
      let text = fillStatic(x.t, fills);
      if (!x.droid && !x.trigger && rng.next() < 0.35 && !/^(Oh|Ah|Right|Mm|Hm|Um|Well)/.test(text)) text = `${openers[Math.floor(rng.next() * openers.length)]} ${text}`;
      if (usedText.has(text)) continue;
      usedText.add(text);
      const trigger = x.trigger || cat;
      const n = counter[trigger] = counter[trigger] === undefined ? (startIndex[trigger] || 0) : counter[trigger] + 1;
      const refs = {};
      if (pp.lot.work !== PORT) refs.lot = pp.lot.work;
      if (/\{good\}/.test(x.t) && goodKey) refs.item = goodKey;
      if (/\{good2\}/.test(x.t) && good2Key) refs.item = good2Key;
      if (/\{coworker\}/.test(x.t)) refs.person = (pp.relationships.find((r) => r.kind === 'coworker' || r.kind === 'colleague') || {}).id;
      if (/\{supplier/.test(x.t)) refs.person = (pp.relationships.find((r) => r.kind === 'supplier') || {}).id;
      if (x.when && x.when.senate) refs.event = 'senate:result';
      if (x.when && (x.when.disaster || x.when.recovering)) refs.event = 'disaster';
      if (x.when && x.when.event) refs.event = x.when.event;
      lines.push({
        id: `${pp.id}#${trigger}${n}`, speaker: pp.id, text, delivery: pp.droid ? 'droid' : pp.personality, trigger, cat,
        priority: PRIORITY[trigger] || 2, cooldown: COOLDOWN[trigger] || 120, refs, audio: { voiced: true, key: `${pp.id}#${trigger}${n}` },
        when: x.when ? { ...x.when } : null, rumor: !!x.rumor, composed: true,
      });
    }
  }
  return lines;
}

function shuffle(arr, rng) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// A small deterministic hash for tests and ids
export function textHash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return hash2(h, s.length, 7); }
