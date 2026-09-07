// Price book (rubric 08 #3): base prices in Republic credits for everything a vendor can sell or buy, item
// categories (what a vendor trades), per-district multipliers and the buy/sell maths. Pure data + functions so the
// offline test can check the book; the vendor catalogue (src/coruscant/purposes.js) refers to goods by these keys.
import { B } from '../blocks.js';
import { I } from '../items.js';

// key -> { id: block/item id (null for services), base: credits, cat: item category, label?, service? }
// Categories: food (eat), meat (raw, cookable), produce (wheat/seeds), hide (leather/feather/bone), ore (ores and
// metal blocks), material (any other placeable block), service (rooms, rides, treatments, ships).
export const GOODS = {
  // food & farm
  apple: { id: I.APPLE, base: 4, cat: 'food' },
  bread: { id: I.BREAD, base: 8, cat: 'food' },
  cooked_chicken: { id: I.CHICKEN_COOKED, base: 12, cat: 'food' },
  cooked_beef: { id: I.BEEF_COOKED, base: 16, cat: 'food' },
  cooked_porkchop: { id: I.PORKCHOP_COOKED, base: 16, cat: 'food' },
  raw_beef: { id: I.BEEF_RAW, base: 9, cat: 'meat' },
  raw_porkchop: { id: I.PORKCHOP_RAW, base: 9, cat: 'meat' },
  raw_chicken: { id: I.CHICKEN_RAW, base: 6, cat: 'meat' },
  wheat: { id: I.WHEAT, base: 3, cat: 'produce' },
  seeds: { id: I.SEEDS, base: 1, cat: 'produce' },
  leather: { id: I.LEATHER, base: 9, cat: 'hide' },
  feather: { id: I.FEATHER, base: 2, cat: 'hide' },
  bone: { id: I.BONE, base: 2, cat: 'hide' },
  stick: { id: I.STICK, base: 1, cat: 'material' },
  // building materials
  planks: { id: B.OAK_PLANKS, base: 2, cat: 'material' },
  spruce_planks: { id: B.SPRUCE_PLANKS, base: 2, cat: 'material' },
  oak_log: { id: B.OAK_LOG, base: 4, cat: 'material' },
  cobblestone: { id: B.COBBLESTONE, base: 1, cat: 'material' },
  stone: { id: B.STONE, base: 1, cat: 'material' },
  stone_bricks: { id: B.STONE_BRICKS, base: 4, cat: 'material' },
  bricks: { id: B.BRICKS, base: 4, cat: 'material' },
  glass: { id: B.GLASS, base: 5, cat: 'material' },
  iron_bars: { id: B.IRON_BARS, base: 6, cat: 'material' },
  torch: { id: B.TORCH, base: 3, cat: 'material' },
  lantern: { id: B.LANTERN, base: 12, cat: 'material' },
  wool: { id: B.WHITE_WOOL, base: 6, cat: 'material' },
  red_wool: { id: B.RED_WOOL, base: 7, cat: 'material' },
  blue_wool: { id: B.BLUE_WOOL, base: 7, cat: 'material' },
  green_wool: { id: B.GREEN_WOOL, base: 7, cat: 'material' },
  chest: { id: B.CHEST, base: 40, cat: 'material' },
  door: { id: B.OAK_DOOR, base: 25, cat: 'material' },
  bed: { id: B.BED_HEAD, base: 45, cat: 'material' },
  table: { id: B.TABLE, base: 18, cat: 'material' },
  bookshelf: { id: B.BOOKSHELF, base: 30, cat: 'material' },
  shelf: { id: B.SHELF, base: 15, cat: 'material' },
  glow_panel: { id: B.GLOW_PANEL, base: 18, cat: 'material' },
  glow_panel_blue: { id: B.GLOW_PANEL_BLUE, base: 18, cat: 'material' },
  holo_sign: { id: B.HOLO_SIGN, base: 24, cat: 'material' },
  console: { id: B.CONSOLE, base: 55, cat: 'material' },
  dandelion: { id: B.DANDELION, base: 2, cat: 'material' },
  poppy: { id: B.POPPY, base: 2, cat: 'material' },
  grass_block: { id: B.GRASS, base: 1, cat: 'material' },
  // ores and metals
  coal_ore: { id: B.COAL_ORE, base: 6, cat: 'ore' },
  iron_ore: { id: B.IRON_ORE, base: 14, cat: 'ore' },
  gold_ore: { id: B.GOLD_ORE, base: 40, cat: 'ore' },
  iron_block: { id: B.IRON_BLOCK, base: 60, cat: 'ore' },
  gold_block: { id: B.GOLD_BLOCK, base: 240, cat: 'ore' },
  // services (no inventory item; the economy applies the effect)
  room_night: { id: null, base: 60, cat: 'service', service: 'rent', label: 'Room for the night', desc: 'Rent this building\u2019s apartment: your bed and chest, one night.' },
  speeder_ride: { id: null, base: 15, cat: 'service', service: 'ride', label: 'Air-taxi ride', desc: 'A speeder ride to any landmark in the city.' },
  bacta_shot: { id: null, base: 20, cat: 'service', service: 'heal', label: 'Bacta shot', desc: 'Restores health and takes the edge off hunger.' },
  ship_speeder: { id: null, base: 4000, cat: 'service', service: 'ship', cls: 'speeder', label: 'Light speeder', desc: 'Two seats, no cargo, fastest thing off the pad.' },
  ship_shuttle: { id: null, base: 14000, cat: 'service', service: 'ship', cls: 'shuttle', label: 'Shuttle', desc: 'Eight seats and a hold. The commuter\u2019s ship.' },
  ship_freighter: { id: null, base: 32000, cat: 'service', service: 'ship', cls: 'freighter', label: 'Light freighter', desc: 'Fifty tons of cargo and a galley. Pays for itself.' },
  ship_yacht: { id: null, base: 60000, cat: 'service', service: 'ship', cls: 'yacht', label: 'Star yacht', desc: 'Chromium hull, senator-grade cabins.' },
  // wholesale goods (economy v2, rubric 15 #1): the ten categories of spec section 10 as bulk units that move between
  // businesses in shipments and are turned into retail items / services on site. No inventory item (id null); a unit
  // is a batch (one meal's ingredients, one canister, one fuel cell, one kit, one bale, one crate of scrap).
  staples: { id: null, base: 3, cat: 'staple', bulk: true, label: 'Staple ingredients', unit: 'crate' },
  water: { id: null, base: 2, cat: 'water', bulk: true, label: 'Clean water', unit: 'canister' },
  fuel: { id: null, base: 12, cat: 'fuel', bulk: true, label: 'Fuel cells', unit: 'cell' },
  parts: { id: null, base: 25, cat: 'parts', bulk: true, label: 'Machine parts', unit: 'part' },
  components: { id: null, base: 30, cat: 'electronics', bulk: true, label: 'Electronic components', unit: 'board' },
  medical: { id: null, base: 20, cat: 'medical', bulk: true, label: 'Medical supplies', unit: 'kit' },
  textiles: { id: null, base: 8, cat: 'domestic', bulk: true, label: 'Textiles & domestic goods', unit: 'bale' },
  salvage: { id: null, base: 5, cat: 'salvage', bulk: true, label: 'Reusable salvage', unit: 'crate' },
  waste: { id: null, base: 0, cat: 'waste', bulk: true, label: 'Waste', unit: 'bin' },
};
export const SHIP_CLASSES = ['speeder', 'shuttle', 'freighter', 'yacht'];
export const BULK_GOODS = Object.keys(GOODS).filter((k) => GOODS[k].bulk);
// Retail item category -> the wholesale good it is unpacked / cooked from (rubric 15 #1); glow panels, holo signs and
// consoles are electronics although they place as blocks (cat material), so they carry their own `bulk` below.
export const BULK_OF_CAT = { food: 'staples', meat: 'staples', produce: 'staples', hide: 'staples', material: 'textiles', ore: 'parts' };
for (const k of ['glow_panel', 'glow_panel_blue', 'holo_sign', 'console']) GOODS[k].bulk = 'components';
// The wholesale input of a retail good (null for services and for bulk goods themselves).
export function bulkOf(key) {
  const g = GOODS[key];
  if (!g || g.service) return null;
  if (g.bulk === true) return null;
  if (typeof g.bulk === 'string') return g.bulk;
  return BULK_OF_CAT[g.cat] || null;
}
export const isBulk = (key) => !!(GOODS[key] && GOODS[key].bulk === true);
export const goodLabelOf = (key) => { const g = GOODS[key]; return g && g.label ? g.label : String(key).replace(/^raw_/, 'raw ').replace(/^cooked_/, 'cooked ').replace(/_/g, ' '); };

// ---------------------------------------------------------------------------------------------- price rule (v2)
// asking price = base x district x (clamp(target / available, FACTOR_MIN, FACTOR_MAX) + disruption)
//   factor      : scarcity - a full shelf quotes 0.75 of base, an empty one 1.75 (documented in docs/overhaul/economy.md)
//   disruption  : bounded modifier from the business's supply state (overdue orders, detained shipments, oversupply),
//                 clamped to [DISRUPTION_MIN, DISRUPTION_MAX]; 0 for a business with nothing going on
// The vendor's bid for the player's goods is SELL_RATIO x the ask it would quote after taking the unit (so selling
// into a shortage pays well but every unit sold lowers the next bid: arbitrage loops converge, rubric 15 #9).
export const FACTOR_MIN = 0.75, FACTOR_MAX = 1.75;
export const DISRUPTION_MIN = -0.25, DISRUPTION_MAX = 0.35;
export function scarcityFactor(target, available) {
  if (!(target > 0)) return 1;
  if (!(available > 0)) return FACTOR_MAX;
  const f = target / available;
  return f < FACTOR_MIN ? FACTOR_MIN : f > FACTOR_MAX ? FACTOR_MAX : f;
}
export const clampDisruption = (d) => (!(d > DISRUPTION_MIN) ? DISRUPTION_MIN : d > DISRUPTION_MAX ? DISRUPTION_MAX : d);
// Asking price of one unit at a business (base already resolved: vendor override or the book).
export function askPrice(base, district, target, available, disruption = 0) {
  if (base == null) return null;
  const v = base * districtMult(district) * (scarcityFactor(target, available) + clampDisruption(disruption));
  return Math.max(1, Math.round(v));
}
// What the business pays for one unit it buys from the player (null below the minimum offer).
export function bidPrice(base, district, target, available, disruption = 0, pawn = false) {
  if (base == null) return null;
  const ask = base * districtMult(district) * (scarcityFactor(target, available + 1) + clampDisruption(disruption));
  const v = ask * (pawn ? PAWN_RATIO : SELL_RATIO);
  return v < MIN_OFFER ? null : Math.max(1, Math.round(v));
}
export const SHIP_GOODS = { speeder: 'ship_speeder', shuttle: 'ship_shuttle', freighter: 'ship_freighter', yacht: 'ship_yacht' };

// Per-district price multipliers (rubric: undercity 0.8, senate 1.4). The undercity is the entertainment district's
// ground level; its towers share the multiplier.
export const DISTRICT_MULT = { entertainment: 0.8, undercity: 0.8, senate: 1.4, financial: 1.1, spaceport: 1.1, market: 0.9, residential: 1.0, industrial: 0.95 };
export const SELL_RATIO = 0.45;   // vendors pay 45% of their buy price
export const PAWN_RATIO = 0.30;   // pawn brokers / scrapyards buy anything at 30%

const byId = new Map();
for (const [key, g] of Object.entries(GOODS)) if (g.id != null && !byId.has(g.id)) byId.set(g.id, key);

export const goodsKey = (id) => byId.get(id) || null;
export const goodFor = (key) => GOODS[key] || null;
export const itemCategory = (id) => { const k = byId.get(id); return k ? GOODS[k].cat : (id > 0 && id < 1000 ? 'material' : null); };
export const districtMult = (district) => DISTRICT_MULT[district] ?? 1;
const roundCr = (v) => Math.max(1, Math.round(v));

// Base (undiscounted) price of a good; a vendor entry can carry its own `price` override.
export function basePrice(key, vendorPrice = null) {
  if (vendorPrice != null) return vendorPrice;
  const g = GOODS[key];
  return g ? g.base : null;
}
// What the player pays at a vendor in `district` (ships and rooms are quoted flat - the rubric prices are absolute).
export function buyPrice(key, district = null, vendorPrice = null) {
  const b = basePrice(key, vendorPrice);
  if (b == null) return null;
  const g = GOODS[key];
  if (g && g.service === 'ship') return b;
  return roundCr(b * districtMult(district));
}
// What a vendor pays the player for one item: 45% of what it would sell it for (pawn: 30% of the base price). Offers
// under three quarters of a credit are not made at all (null): dug-up stone, dirt and grass seeds are worth nothing,
// which keeps "dig and sell" from out-earning honest work.
export const MIN_OFFER = 0.75;
export function sellPrice(key, district = null, vendorPrice = null, pawn = false) {
  const b = basePrice(key, vendorPrice);
  if (b == null) return null;
  const v = b * districtMult(district) * (pawn ? PAWN_RATIO : SELL_RATIO);
  return v < MIN_OFFER ? null : Math.round(v);
}
// Does a vendor with `buys` categories accept an item id? ('any' = pawn broker)
export function vendorBuys(buys, id) {
  if (!buys || !buys.length) return false;
  if (buys.includes('any')) return id > 0 && (byId.has(id) || id < 1000);
  const cat = itemCategory(id);
  return !!cat && cat !== 'service' && buys.includes(cat);
}
// Price a vendor pays for item `id` (null when it does not trade the category): its own listed price when it sells
// the item, the book otherwise.
export function vendorSellPrice(purpose, id) {
  if (!vendorBuys(purpose.buys, id)) return null;
  const key = goodsKey(id);
  const listed = key ? (purpose.sells || []).find((s) => s.item === key) : null;
  const pawn = (purpose.buys || []).includes('any');
  if (key) return sellPrice(key, purpose.district, listed ? listed.price : null, pawn);
  return null;   // a block the book does not price (city cladding, dirt): no scrap value
}
