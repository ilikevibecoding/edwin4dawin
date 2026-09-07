// Deterministic Star-Wars-flavoured names for Coruscant citizens and droids (no canon characters).
const GIVEN_A = ['Bo', 'Kel', 'Dar', 'Tal', 'Vin', 'Ryl', 'Jax', 'Mir', 'Sab', 'Zeb', 'Kor', 'Fen', 'Nyx', 'Orn', 'Tey', 'Ash', 'Bren', 'Cal', 'Dex', 'Els', 'Gar', 'Hol', 'Ith', 'Jor', 'Kyl', 'Lun', 'Mav', 'Nor', 'Oss', 'Pol', 'Quin', 'Ral', 'Sen', 'Tor', 'Uld', 'Vex', 'Wen', 'Xan', 'Yel', 'Zor', 'Ani', 'Bel', 'Cor', 'Dun', 'Eri', 'Fal', 'Gre', 'Har', 'Ilo', 'Jen', 'Kes', 'Lir', 'Mek', 'Nal', 'Ori', 'Pax', 'Rho', 'Sil', 'Tam', 'Ven'];
const GIVEN_B_M = ['an', 'ar', 'en', 'in', 'is', 'on', 'or', 'us', 'ek', 'o', 'ax', 'el', 'yn', 'ath', 'os', 'um', 'ir', 'ac', 'ett', 'ik'];
const GIVEN_B_F = ['a', 'ia', 'ie', 'ara', 'ine', 'ya', 'ella', 'ani', 'ora', 'ith', 'ee', 'una', 'ise', 'eth', 'ala', 'ess', 'iri', 'ona', 'yra', 'ae'];
const SUR_A = ['Ant', 'Bor', 'Cad', 'Dren', 'Ess', 'Fal', 'Gor', 'Hal', 'Ilk', 'Jun', 'Kest', 'Lom', 'Mor', 'Ner', 'Ost', 'Pell', 'Rand', 'Sarr', 'Tarn', 'Ulr', 'Vand', 'Wex', 'Yav', 'Zell', 'Brenn', 'Corr', 'Dav', 'Fenn', 'Garr', 'Holm', 'Karr', 'Lorr', 'Mend', 'Narr', 'Orl', 'Pren', 'Quor', 'Rell', 'Stell', 'Thar'];
const SUR_B = ['dar', 'ren', 'vos', 'tak', 'mir', 'sol', 'wan', 'dol', 'kar', 'tel', 'ven', 'bex', 'nar', 'quel', 'zan', 'lor', 'ric', 'mont', 'ash', 'iss', 'ova', 'ek', 'ine', 'ulo', 'ander', 'ison', 'wick', 'stro', 'bane', 'fell'];
const TITLES = { senator: 'Senator ', judge: 'Magistrate ', medic: 'Dr ', nurse: 'Nurse ', executive: 'Director ', officer: 'Lt ', 'customs officer': 'Inspector ', foreman: 'Foreman ', 'deck officer': 'Cmdr ', acolyte: 'Padawan ', jedi: 'Master ', speaker: 'Vice Chair ' };
const DROID_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
// famous droid designations stay out of the crowd
const RESERVED = new Set(['R2-D2', 'C-3PO', 'BB-8', 'K-2SO', 'TC-14', 'R5-D4', 'IG-88', 'HK-47', 'L3-37', 'R4-P17', 'BD-1', 'D-O', 'AP-5', 'FX-7', '2-1B', 'EV-9D9', 'BT-1', '0-0-0', 'R7-A7', 'CB-23', 'ME-8D9', 'WAC-47']);

export function personName(rng, female, job = null) {
  const a = GIVEN_A[Math.floor(rng.next() * GIVEN_A.length)];
  const b = (female ? GIVEN_B_F : GIVEN_B_M)[Math.floor(rng.next() * 20)];
  const s = SUR_A[Math.floor(rng.next() * SUR_A.length)] + SUR_B[Math.floor(rng.next() * SUR_B.length)];
  const title = (job && TITLES[job]) || '';
  return `${title}${a}${b} ${s}`;
}

export function droidName(rng, archetype = 'astromech') {
  for (let tries = 0; tries < 8; tries++) {
    const L = () => DROID_LETTERS[Math.floor(rng.next() * DROID_LETTERS.length)];
    const D = () => Math.floor(rng.next() * 10);
    let n;
    if (archetype === 'astromech') n = `R${2 + Math.floor(rng.next() * 8)}-${L()}${D()}`;
    else if (archetype === 'protocol droid') n = rng.next() < 0.5 ? `${L()}-${D()}P${L()}` : `${L()}${L()}-${D()}${D()}`;
    else n = `${L()}${L()}-${D()}${D()}${L()}`;
    if (!RESERVED.has(n)) return n;
  }
  return `MX-${Math.floor(rng.next() * 900) + 100}`;
}
