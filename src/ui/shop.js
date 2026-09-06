// Shop / jobs screen (rubric 08 #2, #4, #6, #7): a Minecraft-styled DOM panel in the admin panel's frontier look.
//   shop mode: header (name, category, hours, wallet), the vendor's goods grid (icon, price, stock; left-click buys
//              1, shift-click 8; services and ships are cards with a description), your inventory below (click sells
//              1, shift 8 - only what the vendor trades, with the offered price on the slot)
//   jobs mode: the terminal's board (3-6 jobs, Accept), the active job (Abandon)
// Opened through game.economy.openShop / openJobs, closed by game.closeScreen() (Esc / E / the X button).
import './shop.css';
import { BLOCKS } from '../blocks.js';
import { displayName } from '../items.js';
import { blockIcon } from '../hud.js';
import { GOODS, districtMult } from '../economy/prices.js';
import { goodLabel } from '../economy/jobs.js';

const KIND_LABEL = (kind) => kind.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const CATEGORY_LABEL = { housing: 'Housing', office: 'Offices', government: 'Government', hospitality: 'Hospitality', retail: 'Retail', food: 'Food & drink', industry: 'Industry', transport: 'Transport', security: 'Security', culture: 'Culture', medical: 'Medical', media: 'Media', religion: 'Religion' };
const fmtHours = ([a, b]) => `${String(a % 24).padStart(2, '0')}:00\u2013${String(b % 24).padStart(2, '0')}:00${b >= 24 && a > 0 ? ' (next day)' : ''}`;
const fmt = (n) => String(n | 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function h(tag, attrs, ...children) {
  const e = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (typeof v === 'boolean') e[k] = v;
      else e.setAttribute(k, v);
    }
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}

const iconCache = new Map();
// Item icon as an <img> (the HUD's isometric block renderer, 32 px), cached per id.
function itemIcon(id, size = 32) {
  const key = id + ':' + size;
  let url = iconCache.get(key);
  if (!url) { try { url = blockIcon(id, size).toDataURL(); } catch (e) { url = ''; } iconCache.set(key, url); }
  return h('img', { class: 'sh-icon', src: url, alt: '', draggable: false });
}
// Service glyphs drawn on a small canvas (no inventory item behind them)
function serviceIcon(kind, size = 32) {
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
  const px = (x, y, w, hh, col) => { ctx.fillStyle = col; ctx.fillRect(x * size / 16, y * size / 16, w * size / 16, hh * size / 16); };
  if (kind === 'rent') { px(2, 5, 12, 9, '#3a2a1e'); px(3, 6, 10, 7, '#7a5a3a'); px(1, 4, 14, 2, '#c8b090'); px(6, 9, 4, 5, '#2e6fd8'); px(4, 7, 2, 2, '#ffd866'); px(10, 7, 2, 2, '#ffd866'); }
  else if (kind === 'ride') { px(2, 7, 12, 4, '#c8c8c8'); px(4, 5, 7, 2, '#ffd866'); px(1, 9, 3, 2, '#5a5a5a'); px(12, 8, 3, 2, '#5a5a5a'); px(5, 11, 2, 2, '#ff8a2a'); px(9, 11, 2, 2, '#ff8a2a'); }
  else if (kind === 'heal') { px(6, 2, 4, 12, '#e8f6ff'); px(2, 6, 12, 4, '#e8f6ff'); px(7, 3, 2, 10, '#ff4040'); px(3, 7, 10, 2, '#ff4040'); }
  else { px(3, 8, 10, 3, '#c8d0e0'); px(6, 5, 4, 3, '#4fd8ff'); px(1, 9, 3, 2, '#7a8090'); px(12, 9, 3, 2, '#7a8090'); px(7, 11, 2, 3, '#ff8a2a'); }
  return h('img', { class: 'sh-icon', src: c.toDataURL(), alt: '', draggable: false });
}

export class ShopUI {
  constructor(game, eco) {
    this.game = game; this.eco = eco;
    this.ctx = null;       // { mode, purpose, lot, npc, jobs }
    this.isOpen = false;
    this.onKey = (e) => {
      if (!this.isOpen) return;
      if (e.code === 'Escape' || e.code === 'KeyE') { e.preventDefault(); e.stopPropagation(); this.game.closeScreen(); }
    };
    this.build();
  }
  build() {
    this.titleEl = h('h2', { id: 'sh-title' });
    this.subEl = h('small', { id: 'sh-sub' });
    this.walletEl = h('b', { id: 'sh-credits', text: '0' });
    this.walletNote = h('span', { class: 'sh-wallet-note', id: 'sh-wallet-note' });
    this.closeBtn = h('button', { class: 'sh-close', type: 'button', title: 'Close (Esc)', 'aria-label': 'Close', text: '\u00d7', onclick: () => this.game.closeScreen() });
    this.greetEl = h('p', { class: 'sh-greeting', id: 'sh-greeting' });
    this.goodsEl = h('div', { class: 'sh-grid', id: 'sh-goods' });
    this.goodsTitle = h('h3', { text: 'For sale' });
    this.goodsSec = h('section', { class: 'sh-section', id: 'sh-goods-section' }, this.goodsTitle, this.goodsEl);
    this.invEl = h('div', { class: 'sh-slots', id: 'sh-inventory' });
    this.invTitle = h('h3', { text: 'Your inventory' });
    this.invHint = h('span', { class: 'sh-sub-hint', id: 'sh-inv-hint' });
    this.invSec = h('section', { class: 'sh-section', id: 'sh-inventory-section' }, h('div', { class: 'sh-sec-head' }, this.invTitle, this.invHint), this.invEl);
    this.jobsEl = h('div', { class: 'sh-jobs', id: 'sh-jobs' });
    this.jobsSec = h('section', { class: 'sh-section', id: 'sh-jobs-section' }, h('h3', { text: 'Job board' }), this.jobsEl);
    this.activeEl = h('div', { class: 'sh-active', id: 'sh-active' });
    this.flashEl = h('span', { class: 'sh-flash', id: 'sh-flash', 'aria-live': 'polite' });
    this.hintEl = h('span', { class: 'sh-hint', id: 'sh-hint' });
    this.ownedEl = h('div', { class: 'sh-owned', id: 'sh-owned' });
    this.root = h('div', { id: 'shop-panel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sh-title', hidden: true, tabindex: '-1' },
      h('header', { class: 'sh-header' },
        h('div', { class: 'sh-title' }, this.titleEl, this.subEl),
        h('div', { class: 'sh-wallet', title: 'Your wallet (Republic credits)' }, h('span', { class: 'sh-chip' }), this.walletEl, h('span', { text: ' cr' }), this.walletNote),
        this.closeBtn),
      h('div', { class: 'sh-body' }, this.greetEl, this.activeEl, this.jobsSec, this.goodsSec, this.ownedEl, this.invSec),
      h('footer', { class: 'sh-footer' }, this.flashEl, this.hintEl));
    this.root.addEventListener('keydown', (e) => e.stopPropagation());
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
    document.body.appendChild(this.root);
  }

  open(ctx) {
    this.ctx = ctx;
    this.isOpen = true;
    this.root.hidden = false;
    this.flashEl.textContent = '';
    this.refresh();
    window.addEventListener('keydown', this.onKey, true);
    setTimeout(() => this.root.focus(), 0);
  }
  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.root.hidden = true;
    this.ctx = null;
    window.removeEventListener('keydown', this.onKey, true);
  }
  flash(text) {
    this.flashEl.textContent = text;
    this.flashEl.classList.remove('sh-flash-on');
    void this.flashEl.offsetWidth;   // restart the highlight animation
    this.flashEl.classList.add('sh-flash-on');
  }

  refresh() {
    const c = this.ctx;
    if (!c || !this.isOpen) return;
    const eco = this.eco, p = c.purpose;
    this.walletEl.textContent = fmt(eco.credits);
    this.walletNote.textContent = eco.free ? 'creative: prices shown, nothing charged' : '';
    const mult = districtMult(p.district);
    const status = eco.isOpenNow(p) ? 'open now' : 'closed (staff still trades)';
    this.titleEl.textContent = p.name;
    this.subEl.textContent = `${CATEGORY_LABEL[p.category] || p.category} \u00b7 ${KIND_LABEL(p.kind)} \u00b7 ${fmtHours(p.hours)} \u00b7 ${status}${mult !== 1 ? ` \u00b7 district prices \u00d7${mult}` : ''}`;
    this.greetEl.textContent = c.npc ? `<${c.npc.name}> ${p.greeting}` : `\u201c${p.greeting}\u201d`;
    this.renderOwned();
    if (c.mode === 'jobs') {
      this.jobsSec.hidden = false; this.goodsSec.hidden = true; this.invSec.hidden = true;
      this.renderJobs();
      this.hintEl.textContent = 'One job at a time \u00b7 boards refresh daily \u00b7 Esc closes';
    } else {
      this.jobsSec.hidden = true; this.goodsSec.hidden = false; this.invSec.hidden = false;
      this.renderActive();
      this.renderGoods();
      this.renderInventory();
      this.hintEl.textContent = 'Left-click buys 1 \u00b7 Shift+click buys 8 \u00b7 click your items to sell \u00b7 Esc closes';
    }
  }

  renderOwned() {
    const eco = this.eco, s = eco.summary();
    this.ownedEl.replaceChildren();
    const bits = [];
    if (s.ships.length) bits.push(`Ships: ${s.ships.join(', ')}`);
    if (s.apartment) bits.push(`Apartment: ${s.apartment}`);
    if (s.job) bits.push(`Job: ${s.job}`);
    if (!bits.length) return;
    this.ownedEl.append(h('span', { class: 'sh-owned-title', text: 'Wallet' }), ...bits.map((b) => h('span', { class: 'sh-owned-item', text: b })));
  }

  renderGoods() {
    const c = this.ctx, eco = this.eco, p = c.purpose;
    this.goodsEl.replaceChildren();
    const sells = p.sells || [];
    if (!sells.length) { this.goodsEl.append(h('p', { class: 'sh-empty', text: 'Nothing for sale here - but they may buy from you.' })); return; }
    for (const entry of sells) {
      const g = GOODS[entry.item];
      if (!g) continue;
      const price = eco.priceOf(p, entry);
      if (g.service) { this.goodsEl.append(this.serviceCard(p, entry, g, price)); continue; }
      const stock = eco.stockOf(p.id, entry);
      const card = h('button', {
        class: 'sh-card' + (stock <= 0 ? ' sh-soldout' : '') + (!eco.canAfford(price) ? ' sh-poor' : ''), type: 'button',
        title: `${displayName(g.id)} - ${price} cr each - ${stock} in stock (restocks daily). Click: buy 1, Shift+click: buy 8.`,
        onclick: (e) => { eco.buy(p, entry, e.shiftKey ? 8 : 1); },
      },
      itemIcon(g.id),
      h('span', { class: 'sh-name', text: displayName(g.id) }),
      h('span', { class: 'sh-price' }, h('span', { class: 'sh-chip sh-chip-sm' }), `${price} cr`),
      h('span', { class: 'sh-stock', text: stock > 0 ? `${stock} in stock` : 'sold out' }));
      this.goodsEl.append(card);
    }
  }
  serviceCard(p, entry, g, price) {
    const eco = this.eco;
    let note = '', disabled = false, cls = '';
    if (g.service === 'ship') {
      const owned = eco.ownedShips[0];
      if (owned && owned.cls === g.cls) { note = `owned - pad ${owned.padIndex + 1}`; disabled = true; cls = ' sh-owned-ship'; }
      else if (owned) note = `trade-in ${Math.round(owned.price * 0.6)} cr`;
      else note = 'parked on your pad';
    } else if (g.service === 'rent') {
      const a = eco.apartment;
      note = a && a.lotId === p.id ? `yours - paid through day ${a.paidUntilDay}` : 'first free room, one night';
    } else if (g.service === 'heal') note = 'full health, +6 food';
    else if (g.service === 'ride') note = 'to any landmark';
    const card = h('button', {
      class: 'sh-card sh-service' + cls + (!eco.canAfford(price) && !disabled ? ' sh-poor' : ''), type: 'button', disabled,
      title: `${g.label} - ${price} cr. ${g.desc || ''}`,
      onclick: () => { eco.buy(p, entry, 1); },
    },
    serviceIcon(g.service),
    h('span', { class: 'sh-name', text: g.label }),
    h('span', { class: 'sh-price' }, h('span', { class: 'sh-chip sh-chip-sm' }), `${fmt(price)} cr`),
    h('span', { class: 'sh-stock', text: note }),
    g.desc ? h('span', { class: 'sh-desc', text: g.desc }) : null);
    return card;
  }
  // Air-taxi destinations: replaces the goods grid with the landmark list until one is picked.
  pickDestination(purpose, entry, unit) {
    const eco = this.eco, lm = (eco.layout && eco.layout.landmarks) || [];
    this.goodsEl.replaceChildren(h('p', { class: 'sh-empty', text: `Where to? ${unit} cr a ride.` }));
    for (const l of lm) {
      const d = Math.round(Math.hypot(l.x - this.game.player.pos.x, l.z - this.game.player.pos.z));
      this.goodsEl.append(h('button', { class: 'sh-card sh-dest', type: 'button', onclick: () => eco.ride(purpose, unit, l) },
        serviceIcon('ride'), h('span', { class: 'sh-name', text: l.name }), h('span', { class: 'sh-stock', text: `${d} blocks` })));
    }
    this.goodsEl.append(h('button', { class: 'sh-card sh-dest', type: 'button', onclick: () => this.renderGoods() }, h('span', { class: 'sh-name', text: 'Back' })));
  }

  renderInventory() {
    const c = this.ctx, eco = this.eco, p = c.purpose, inv = this.game.inventory;
    this.invEl.replaceChildren();
    const buys = p.buys || [];
    this.invHint.textContent = buys.length ? (buys.includes('any') ? 'buys anything at 30% - click a stack to sell 1, Shift+click 8' : `buys ${buys.join(', ')} at 45% - click a stack to sell 1, Shift+click 8`) : 'this vendor does not buy from players';
    for (let i = 0; i < inv.slots.length; i++) {
      const slot = inv.slots[i];
      const offer = slot ? eco.offerFor(p, slot.id) : null;
      const el = h('button', {
        class: 'sh-slot' + (i < 9 ? ' sh-hotbar' : '') + (slot ? (offer != null ? ' sh-sellable' : ' sh-nosale') : ''), type: 'button', disabled: !slot || offer == null,
        title: slot ? `${displayName(slot.id)} \u00d7 ${slot.count}${offer != null ? ` - sells for ${offer} cr each` : ' - not bought here'}` : 'empty',
        onclick: (e) => { if (slot && offer != null) eco.sell(p, slot.id, e.shiftKey ? 8 : 1); },
      },
      slot ? itemIcon(slot.id, 32) : null,
      slot && slot.count > 1 ? h('span', { class: 'sh-count', text: slot.count }) : null,
      slot && offer != null ? h('span', { class: 'sh-offer', text: `${offer}` }) : null);
      this.invEl.append(el);
    }
  }

  renderActive() {
    const jb = this.eco.jobs, a = jb.active;
    this.activeEl.replaceChildren();
    if (!a) { this.activeEl.hidden = true; return; }
    this.activeEl.hidden = false;
    this.activeEl.append(
      h('span', { class: 'sh-active-title', text: 'Active job' }),
      h('span', { class: 'sh-active-text', text: jb.status() || a.job.title }),
      h('span', { class: 'sh-active-reward', text: `${a.job.reward} cr \u00b7 ${jb.remaining().toFixed(2)} days left` }),
      h('button', { class: 'sh-btn sh-btn-danger', type: 'button', text: 'Abandon', onclick: () => { jb.abandon(); this.refresh(); } }));
  }
  renderJobs() {
    const c = this.ctx, jb = this.eco.jobs;
    this.renderActive();
    this.jobsEl.replaceChildren();
    const jobs = c.jobs || [];
    if (!jobs.length) { this.jobsEl.append(h('p', { class: 'sh-empty', text: 'No work posted today. Come back tomorrow.' })); return; }
    for (const job of jobs) {
      const active = jb.active && jb.active.job.id === job.id;
      const avail = jb.available(job);
      const canTake = !jb.active && avail;
      const meta = [];
      if (job.distance) meta.push(`${job.distance} blocks`);
      if (job.items) meta.push(job.items.map((it) => `${it.count} \u00d7 ${goodLabel(it.key)}`).join(', '));
      if (job.parts) meta.push(`${job.parts} parts`);
      if (job.count) meta.push(`${job.count} blocks`);
      this.jobsEl.append(h('div', { class: 'sh-job' + (active ? ' sh-job-active' : '') + (!avail ? ' sh-job-off' : ''), 'data-kind': job.kind },
        h('div', { class: 'sh-job-head' }, h('span', { class: 'sh-job-kind', text: job.kind.replace('_', ' ') }), h('span', { class: 'sh-job-reward' }, h('span', { class: 'sh-chip sh-chip-sm' }), `${job.reward} cr`)),
        h('div', { class: 'sh-job-title', text: job.title }),
        h('p', { class: 'sh-job-desc', text: job.desc }),
        h('div', { class: 'sh-job-foot' }, h('span', { class: 'sh-job-meta', text: meta.join(' \u00b7 ') }),
          active ? h('span', { class: 'sh-job-tag', text: 'accepted' }) : !avail ? h('span', { class: 'sh-job-tag', text: 'no debris reported nearby' })
            : h('button', { class: 'sh-btn', type: 'button', text: jb.active ? 'Busy' : 'Accept', disabled: !canTake, onclick: () => { if (jb.accept(job, c.lot)) this.refresh(); } }))));
    }
  }
}
