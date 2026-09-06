// Vendor stock ledger (rubric 08 #3): every vendor entry lists its daily `stock`; what the player buys is recorded
// per (lot, item) and forgotten when the day counter changes, so shelves refill every morning. Pure (no game
// references) so the offline test can drive it; the economy serialises it into the save so a reload mid-day keeps
// the shelves as the player left them.
export class StockLedger {
  constructor() {
    this.day = -1;
    this.sold = new Map();   // `${lotId}:${item}` -> units sold since the last restock
  }
  // Rolls the ledger to `day`: a new day clears everything. Returns true when a restock happened.
  roll(day) {
    if (day === this.day) return false;
    this.sold.clear();
    this.day = day;
    return true;
  }
  key(lotId, item) { return `${lotId}:${item}`; }
  soldOf(lotId, item) { return this.sold.get(this.key(lotId, item)) || 0; }
  // Units left of a vendor entry { item, stock } today.
  stockOf(lotId, entry, day) {
    if (day !== undefined) this.roll(day);
    return Math.max(0, (entry.stock | 0) - this.soldOf(lotId, entry.item));
  }
  // Records a sale of n units (capped at what is left); returns the units actually taken.
  take(lotId, entry, n, day) {
    if (day !== undefined) this.roll(day);
    const left = this.stockOf(lotId, entry);
    const k = Math.max(0, Math.min(n | 0, left));
    if (k > 0) this.sold.set(this.key(lotId, entry.item), this.soldOf(lotId, entry.item) + k);
    return k;
  }
  clear(day = this.day) { this.sold.clear(); this.day = day; }
  serialize() { return { day: this.day, sold: [...this.sold.entries()] }; }
  restore(data) {
    this.day = data && typeof data.day === 'number' ? data.day : -1;
    this.sold = new Map(data && Array.isArray(data.sold) ? data.sold.filter((e) => Array.isArray(e) && e.length === 2 && typeof e[0] === 'string') : []);
  }
}
