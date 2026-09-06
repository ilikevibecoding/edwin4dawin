// Archetype -> allowed species / outfits / genders / ages / wear. The population builder (W4) asks for an
// archetype (rubric 07 criterion 5 names plus the spec-14 factions); the composer draws the rest from the seed.
// Weights are relative. Species lists are filtered again at compose time by the outfit's headgear (a Togruta
// never gets a riot helmet, a Rodian never a Coruscant Guard helmet - the Guard are human clones).

// species mixes (ids from species.js). No morality by species: the same mixes feed guards, senators and gangs.
const CORE = { human: 55, twilek: 6, togruta: 3, zabrak: 3, rodian: 5, duros: 5, nautolan: 2, mon_calamari: 1.5, bothan: 2.5, sullustan: 3, gran: 2, aqualish: 2, ithorian: 1.5, weequay: 1.5, chagrian: 1.5, pantoran: 3, mirialan: 3 };
const UNDER = { human: 32, twilek: 8, togruta: 3, zabrak: 4, rodian: 8, duros: 6, nautolan: 3, mon_calamari: 1, bothan: 3, sullustan: 4, gran: 4, aqualish: 5, ithorian: 2, weequay: 5, chagrian: 1, pantoran: 2, mirialan: 3 };
const SENATE = { human: 40, twilek: 6, togruta: 4, rodian: 6, duros: 4, mon_calamari: 5, gran: 3, sullustan: 3, chagrian: 4, pantoran: 6, mirialan: 4, ithorian: 3, bothan: 3, nautolan: 2, aqualish: 2, zabrak: 2, weequay: 1 };
const HUMANLIKE = { human: 80, pantoran: 10, mirialan: 10 };
const HELMETED = { human: 70, duros: 10, weequay: 6, pantoran: 7, mirialan: 7 }; // species whose heads take a full helmet
const PILOTS = { human: 45, duros: 14, rodian: 8, sullustan: 12, twilek: 6, mon_calamari: 4, nautolan: 3, bothan: 4, gran: 2, weequay: 2 };
const DROID = { droid: 1 };

const G_ANY = { feminine: 1, masculine: 1, androgynous: 0.35 };
const G_NONE = { none: 1 };
const A_WORK = { young: 1.2, adult: 3, middle: 2, elder: 0.5 };
const A_SENIOR = { young: 0.2, adult: 1.5, middle: 3, elder: 2 };
const A_YOUNG = { young: 3, adult: 2, middle: 0.5, elder: 0.1 };
const A_ALL = { young: 1, adult: 2, middle: 1.5, elder: 1 };
const A_NONE = { none: 1 };
const W_CLEAN = { clean: 4, worn: 1 };
const W_WORK = { clean: 1, worn: 3, patched: 0.5 };
const W_UNDER = { worn: 2, patched: 3 };

export const ARCHETYPES = {
  office_worker: { label: 'office worker', species: CORE, outfits: { office_worker: 7, casual_jacket: 1, casual_tunic: 1, casual_layered: 1 }, genders: G_ANY, ages: A_WORK, wear: W_CLEAN },
  resident: { label: 'resident', species: CORE, outfits: { casual_tunic: 2, casual_jacket: 2, casual_dress: 1.5, casual_layered: 1.5, casual_workwear: 1.5, casual_sport: 1, undercity_jacket: 0.5 }, genders: G_ANY, ages: A_ALL, wear: { clean: 2, worn: 2, patched: 0.5 } },
  senator: { label: 'senator', species: SENATE, outfits: { senator_naboo: 1, senator_alderaan: 1, senator_chandrila: 1.2, senator_corellia: 1, senator_rodia: 1, senator_mon_cala: 1 }, genders: G_ANY, ages: A_SENIOR, wear: { clean: 1 } },
  senate_aide: { label: 'Senate aide', species: SENATE, outfits: { senate_aide: 5, chancellor_staff: 1 }, genders: G_ANY, ages: A_WORK, wear: { clean: 1 }, ranks: { chancellor_staff: 'chancellor_staff' } },
  chancellor_staff: { label: "Chancellor's staff", species: HUMANLIKE, outfits: { chancellor_staff: 1 }, genders: G_ANY, ages: A_WORK, wear: { clean: 1 } },
  senate_guard: { label: 'Senate Guard', species: HUMANLIKE, outfits: { senate_guard: 6, senate_guard_late: 2.5, senate_commando: 1.5 }, genders: G_ANY, ages: { young: 1, adult: 3, middle: 1.5 }, wear: W_CLEAN, ranks: { commando: 'senate_commando', captain: 'senate_commando', late: 'senate_guard_late', guard: 'senate_guard' } },
  coruscant_guard: { label: 'Coruscant Guard', species: { human: 1 }, clone: true, outfits: { coruscant_guard: 6, coruscant_guard_officer: 1 }, genders: { masculine: 1 }, ages: { adult: 1 }, wear: { clean: 1, worn: 2, patched: 0.4 }, ranks: { trooper: 'coruscant_guard', officer: 'coruscant_guard_officer', commander: 'coruscant_guard_officer', lieutenant: 'coruscant_guard_officer', sergeant: 'coruscant_guard_officer' } },
  csf_officer: { label: 'CSF officer', species: CORE, outfits: { csf_patrol: 6.5, csf_detective: 2, csf_riot: 1.5 }, genders: G_ANY, ages: A_WORK, wear: W_CLEAN, ranks: { patrol: 'csf_patrol', sergeant: 'csf_patrol', detective: 'csf_detective', riot: 'csf_riot' } },
  police_droid: { label: 'GU police droid', species: DROID, outfits: { gu_police_droid: 1 }, genders: G_NONE, ages: A_NONE, wear: W_CLEAN },
  underworld_police: { label: 'Underworld Police', species: HELMETED, outfits: { underworld_police: 1 }, genders: G_ANY, ages: A_WORK, wear: W_UNDER },
  jedi: { label: 'Jedi', species: CORE, outfits: { jedi_knight: 5, jedi_padawan: 2.5, jedi_master: 2.5 }, genders: G_ANY, ages: A_ALL, wear: W_CLEAN, ranks: { padawan: 'jedi_padawan', knight: 'jedi_knight', master: 'jedi_master' }, ageByOutfit: { jedi_padawan: { young: 1 }, jedi_master: { middle: 2, elder: 2, adult: 0.5 } } },
  temple_guard: { label: 'Jedi Temple Guard', species: HUMANLIKE, outfits: { temple_guard: 1 }, genders: G_ANY, ages: A_WORK, wear: { clean: 1 } },
  pilot: { label: 'pilot', species: PILOTS, outfits: { pilot: 1 }, genders: G_ANY, ages: A_WORK, wear: W_WORK },
  mechanic: { label: 'mechanic', species: CORE, outfits: { mechanic: 6, salvage_worker: 1 }, genders: G_ANY, ages: A_WORK, wear: W_WORK },
  dock_worker: { label: 'dock worker', species: CORE, outfits: { dock_worker: 1 }, genders: G_ANY, ages: A_WORK, wear: W_WORK },
  vendor: { label: 'vendor', species: CORE, outfits: { vendor: 4, cook: 1 }, genders: G_ANY, ages: A_ALL, wear: { clean: 1, worn: 2 } },
  cook: { label: 'cook', species: CORE, outfits: { cook: 1 }, genders: G_ANY, ages: A_WORK, wear: { clean: 1, worn: 2 } },
  bartender: { label: 'bartender', species: CORE, outfits: { bartender: 1 }, genders: G_ANY, ages: A_WORK, wear: W_CLEAN },
  medic: { label: 'medic', species: CORE, outfits: { medic: 1 }, genders: G_ANY, ages: A_WORK, wear: { clean: 1 } },
  patient: { label: 'patient', species: CORE, outfits: { patient_gown: 1 }, genders: G_ANY, ages: A_ALL, wear: { clean: 1, worn: 1 } },
  tourist: { label: 'tourist', species: CORE, outfits: { tourist: 1 }, genders: G_ANY, ages: A_ALL, wear: { clean: 1 } },
  courier: { label: 'courier', species: CORE, outfits: { courier: 1 }, genders: G_ANY, ages: A_YOUNG, wear: { clean: 1, worn: 2 } },
  journalist: { label: 'journalist', species: CORE, outfits: { journalist: 1 }, genders: G_ANY, ages: A_WORK, wear: { clean: 1, worn: 1 } },
  protocol_droid: { label: 'protocol droid', species: DROID, outfits: { protocol_droid: 1 }, genders: G_NONE, ages: A_NONE, wear: { clean: 2, worn: 1 } },
  astromech: { label: 'astromech', species: DROID, outfits: { astromech: 1 }, genders: G_NONE, ages: A_NONE, wear: { clean: 1, worn: 1 } },
  sweeper_droid: { label: 'street-sweeper droid', species: DROID, outfits: { sweeper_droid: 1 }, genders: G_NONE, ages: A_NONE, wear: { worn: 2, patched: 1 } },
  bounty_hunter: { label: 'bounty hunter', species: HELMETED, outfits: { bounty_hunter: 1 }, genders: G_ANY, ages: A_WORK, wear: W_UNDER },
  performer: { label: 'performer', species: CORE, outfits: { performer: 1 }, genders: G_ANY, ages: A_YOUNG, wear: { clean: 1 } },
  opera_patron: { label: 'opera patron', species: SENATE, outfits: { opera_patron: 1 }, genders: G_ANY, ages: A_SENIOR, wear: { clean: 1 } },
  child: { label: 'child', species: CORE, child: true, outfits: { child_school: 3, casual_tunic: 1, casual_sport: 1 }, genders: G_ANY, ages: { child: 1 }, wear: { clean: 2, worn: 1 } },
  black_sun_manager: { label: 'Black Sun front manager', species: CORE, outfits: { black_sun_manager: 1 }, genders: G_ANY, ages: A_SENIOR, wear: { clean: 1 } },
  pyke_contact: { label: 'Pyke contact', species: { pyke: 7, human: 2, weequay: 1 }, outfits: { pyke_contact: 1 }, genders: G_ANY, ages: A_WORK, wear: { clean: 1, worn: 2 } },
  salvage_worker: { label: 'salvage cooperative', species: UNDER, outfits: { salvage_worker: 1 }, genders: G_ANY, ages: A_WORK, wear: W_UNDER },
  gang_member: { label: 'freight gang', species: UNDER, outfits: { gang_jacket: 4, undercity_jacket: 1 }, genders: G_ANY, ages: A_YOUNG, wear: W_UNDER },
  customs_inspector: { label: 'customs inspector', species: CORE, outfits: { customs_inspector: 1 }, genders: G_ANY, ages: A_WORK, wear: W_CLEAN },
  undercity_resident: { label: 'undercity resident', species: UNDER, outfits: { undercity_jacket: 3, casual_workwear: 2, casual_jacket: 1, casual_tunic: 1 }, genders: G_ANY, ages: A_ALL, wear: W_UNDER },
};

// names the population / rubric use that map onto the records above (a 'guard' is a Senate Guard or a CSF officer)
export const ARCHETYPE_ALIASES = {
  guard: ['senate_guard', 'csf_officer'],
  coruscant_security: ['csf_officer'], csf: ['csf_officer'], police: ['csf_officer'], security: ['csf_officer'],
  street_sweeper_droid: ['sweeper_droid'], sweeper: ['sweeper_droid'], street_sweeper: ['sweeper_droid'],
  aide: ['senate_aide'], clerk: ['office_worker', 'senate_aide'], official: ['senate_aide', 'chancellor_staff'],
  worker: ['dock_worker', 'mechanic', 'casual_worker'], casual_worker: ['resident'], shopkeeper: ['vendor'], trader: ['vendor'],
  doctor: ['medic'], nurse: ['medic'], jedi_knight: ['jedi'], padawan: ['jedi'], jedi_master: ['jedi'],
  clone: ['coruscant_guard'], shock_trooper: ['coruscant_guard'], commando: ['senate_guard'],
  droid: ['protocol_droid', 'astromech', 'sweeper_droid'], repair_droid: ['astromech'], police_droid: ['police_droid'],
  kid: ['child'], student: ['child'], criminal: ['gang_member', 'pyke_contact'], smuggler: ['pyke_contact'], hunter: ['bounty_hunter'],
  entertainer: ['performer'], patron: ['opera_patron'], customs: ['customs_inspector'], inspector: ['customs_inspector'],
};

// faction ids from spec section 14 -> archetypes (used when only a faction is given)
export const FACTION_ARCHETYPES = {
  senate_guard: ['senate_guard'], coruscant_guard: ['coruscant_guard'], csf: ['csf_officer', 'police_droid'], underworld_police: ['underworld_police'],
  jedi: ['jedi', 'temple_guard'], senate: ['senator', 'senate_aide', 'chancellor_staff'], republic: ['senate_aide', 'office_worker', 'customs_inspector'],
  business: ['vendor', 'office_worker', 'bartender', 'cook'], residents: ['resident', 'child'], neighborhood: ['resident', 'courier'],
  black_sun: ['black_sun_manager'], pykes: ['pyke_contact'], salvage_coop: ['salvage_worker'], freight_gang: ['gang_member'],
  media: ['journalist'], medical: ['medic', 'patient'], spaceport: ['pilot', 'dock_worker', 'customs_inspector', 'mechanic'], culture: ['performer', 'opera_patron'],
};

export const DISTRICTS = ['senate', 'financial', 'residential', 'industrial', 'undercity', 'spaceport', 'temple', 'entertainment', 'market'];
// district influence on wear (multipliers on the archetype's wear weights)
export const DISTRICT_WEAR = {
  senate: { clean: 2, worn: 0.6, patched: 0.1 }, financial: { clean: 1.6, worn: 0.8, patched: 0.2 }, temple: { clean: 1.5, worn: 0.8, patched: 0.2 },
  residential: { clean: 1, worn: 1, patched: 0.6 }, market: { clean: 0.8, worn: 1.2, patched: 0.7 }, entertainment: { clean: 1.4, worn: 0.9, patched: 0.3 },
  industrial: { clean: 0.5, worn: 1.5, patched: 1 }, spaceport: { clean: 0.7, worn: 1.4, patched: 0.6 }, undercity: { clean: 0.2, worn: 1.2, patched: 2 },
};
// district influence on the species mix (multiplier on the human weight; aliens fill the rest)
export const DISTRICT_HUMAN_FACTOR = { senate: 1, financial: 1.1, temple: 0.9, residential: 1, market: 0.8, entertainment: 0.9, industrial: 0.8, spaceport: 0.7, undercity: 0.55 };

export function resolveArchetype(name, rng) {
  if (!name) return 'resident';
  if (ARCHETYPES[name]) return name;
  const key = String(name).toLowerCase().replace(/[\s-]+/g, '_');
  if (ARCHETYPES[key]) return key;
  const alias = ARCHETYPE_ALIASES[key];
  if (alias) return rng ? alias[Math.floor(rng.next() * alias.length)] : alias[0];
  return 'resident';
}

// Table for the report / integrator: archetype -> allowed species ids and outfit ids
export function archetypeTable() {
  const rows = [];
  for (const [id, a] of Object.entries(ARCHETYPES)) rows.push({ archetype: id, label: a.label, species: Object.keys(a.species), outfits: Object.keys(a.outfits), genders: Object.keys(a.genders), ages: Object.keys(a.ages), wear: Object.keys(a.wear) });
  return rows;
}
