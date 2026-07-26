// ---------------------------------------------------------------------------
// NORTHSTAR RESCUE — screen infrastructure  (owner: fable1)
//
// Small DOM helpers, the Screen base class, keyboard list-navigation and the
// shared confirmation dialog. Everything here is deliberately framework-free.
// ---------------------------------------------------------------------------

/**
 * Element factory. `attrs.class` sets className, `attrs.text` textContent,
 * `attrs.html` innerHTML (trusted, our own markup only), `attrs.onclick`
 * etc. attach listeners, everything else becomes an attribute.
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c);
  }
  return node;
}

/** Human-readable label for a KeyboardEvent.code. */
export function fmtKey(code) {
  if (!code) return '—';
  const MAP = {
    Space: 'SPACE', Escape: 'ESC', Tab: 'TAB', Enter: 'ENTER', Backspace: 'BKSP',
    ControlLeft: 'L-CTRL', ControlRight: 'R-CTRL', ShiftLeft: 'L-SHIFT', ShiftRight: 'R-SHIFT',
    AltLeft: 'L-ALT', AltRight: 'R-ALT', CapsLock: 'CAPS',
    ArrowUp: '\u2191', ArrowDown: '\u2193', ArrowLeft: '\u2190', ArrowRight: '\u2192',
    Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';',
    Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\', Backquote: '`',
    MouseLeft: 'LMB', MouseRight: 'RMB', MouseMiddle: 'MMB',
  };
  if (MAP[code]) return MAP[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `NUM ${code.slice(6)}`;
  if (/^F\d+$/.test(code)) return code;
  return code.toUpperCase();
}

const NAV_PREV = new Set(['ArrowUp', 'KeyW']);
const NAV_NEXT = new Set(['ArrowDown', 'KeyS']);
const NAV_ACTIVATE = new Set(['Enter', 'NumpadEnter', 'Space']);

/**
 * Base class for every full screen. Subclasses build DOM in `build()` (called
 * once, lazily) and may override the lifecycle hooks. Keyboard behaviour:
 * registered `nav` elements are cycled with arrows / W-S and activated with
 * Enter; anything else falls through to the manager's per-state handling.
 */
export class Screen {
  /**
   * @param {import('../manager.js').UIManager} ui
   * @param {string} name
   */
  constructor(ui, name) {
    this.ui = ui;
    this.game = ui.game;
    this.name = name;
    this.el = el('section', { class: `screen screen-${name}`, 'data-screen': name });
    this.visible = false;
    this._built = false;
    /** @type {HTMLElement[]} keyboard-navigable items, top to bottom */
    this.nav = [];
  }

  /** Subclass hook: create children of this.el. Called once. */
  build() {}

  /** Subclass hooks. */
  onShow() {}
  onHide() {}
  update() {}

  show(payload) {
    if (!this._built) {
      this.build();
      this._built = true;
    }
    this.el.classList.add('visible');
    this.visible = true;
    this.onShow(payload);
    // Give the screen an initial focus target so keyboard users are never lost.
    queueMicrotask(() => {
      if (this.visible) this.focusFirst();
    });
  }

  hide() {
    if (!this.visible) return;
    this.visible = false;
    this.el.classList.remove('visible');
    this.onHide();
  }

  /** Rebuild the keyboard ring from live, enabled nav elements. */
  navItems() {
    return this.nav.filter((n) => n && n.isConnected && !n.disabled
      && !n.getAttribute('aria-hidden') && n.offsetParent !== null);
  }

  focusFirst() {
    const items = this.navItems();
    const current = document.activeElement;
    if (current && items.includes(current)) return;
    items[0]?.focus();
  }

  /**
   * Default keyboard handling. Returns true when the event was consumed.
   * @param {KeyboardEvent} e
   */
  handleKey(e) {
    const items = this.navItems();
    if (!items.length) return false;
    const active = document.activeElement;
    const idx = items.indexOf(active);

    if (NAV_PREV.has(e.code)) {
      const next = idx <= 0 ? items.length - 1 : idx - 1;
      items[next].focus();
      return true;
    }
    if (NAV_NEXT.has(e.code)) {
      const next = idx < 0 ? 0 : (idx + 1) % items.length;
      items[next].focus();
      return true;
    }
    if (NAV_ACTIVATE.has(e.code)) {
      // Space on a slider should not "click" it; Enter always activates.
      if (e.code === 'Space' && active && active.tagName === 'INPUT') return false;
      if (idx >= 0) {
        items[idx].click();
        return true;
      }
      if (active === document.body || !this.el.contains(active)) {
        items[0]?.focus();
        return true;
      }
    }
    return false;
  }

  /** Standard chrome: dark scrim + film-grain + content column. */
  scaffold({ scrim = true, noise = true } = {}) {
    if (scrim) this.el.append(el('div', { class: 'screen-backdrop' }));
    if (noise) this.el.append(el('div', { class: 'screen-noise' }));
    const content = el('div', { class: 'screen-content' });
    this.el.append(content);
    return content;
  }

  /** Standard header block with eyebrow + title + rule. */
  header(eyebrow, title, subtitle = '') {
    return el('header', { class: 'screen-head' },
      el('p', { class: 'eyebrow', text: eyebrow }),
      el('h2', { class: 'screen-title', text: title }),
      subtitle ? el('p', { class: 'subtitle', text: subtitle }) : null,
      el('div', { class: 'rule' }));
  }

  /** Footer hint line: [['ESC','Back'], ['ENTER','Select'], ...] */
  hints(pairs) {
    const row = el('div', { class: 'key-hints' });
    for (const [key, label] of pairs) {
      row.append(el('span', { class: 'key-hint-item' },
        el('kbd', { text: key }), el('span', { text: label })));
    }
    return row;
  }
}

/**
 * Modal confirmation. Fully keyboard-safe: Escape / "No" always resolves
 * false, so no dialog can trap the player. One dialog at a time per host.
 * @returns {Promise<boolean>}
 */
export function confirmDialog(host, { title, body, yes = 'Confirm', no = 'Cancel', danger = false } = {}) {
  return new Promise((resolve) => {
    const prevFocus = document.activeElement;
    let done = false;
    const finish = (v) => {
      if (done) return;
      done = true;
      window.removeEventListener('keydown', onKey, true);
      scrim.remove();
      if (prevFocus && prevFocus.isConnected) prevFocus.focus?.();
      resolve(v);
    };
    const noBtn = el('button', { class: 'btn ghost', text: no, onclick: () => finish(false) });
    const yesBtn = el('button', {
      class: `btn ${danger ? 'danger' : 'primary'}`, text: yes, onclick: () => finish(true),
    });
    const scrim = el('div', { class: 'confirm-scrim interactive', role: 'dialog', 'aria-modal': 'true' },
      el('div', { class: 'confirm-card' },
        el('h3', { text: title || 'Are you sure?' }),
        el('p', { text: body || '' }),
        el('div', { class: 'row confirm-row' }, el('span', { class: 'spacer' }), noBtn, yesBtn)));
    const onKey = (e) => {
      if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); return; }
      if (e.code === 'Enter' || e.code === 'NumpadEnter') {
        e.preventDefault(); e.stopPropagation();
        (document.activeElement === noBtn ? noBtn : yesBtn).click();
        return;
      }
      if (['ArrowLeft', 'ArrowRight', 'Tab', 'KeyA', 'KeyD'].includes(e.code)) {
        e.preventDefault(); e.stopPropagation();
        (document.activeElement === yesBtn ? noBtn : yesBtn).focus();
      }
    };
    window.addEventListener('keydown', onKey, true);
    host.append(scrim);
    noBtn.focus();
  });
}

/**
 * A custom enum stepper (no native <select>): ◄ value ► with click-to-cycle
 * and Left/Right arrow support. Returns the root button element; exposes
 * `.value` and fires `onchange(value)`.
 */
export function cycler({ options, value, format = (v) => String(v), onchange }) {
  let idx = Math.max(0, options.indexOf(value));
  const label = el('span', { class: 'cycler-value', text: format(options[idx]) });
  const step = (dir) => {
    idx = (idx + dir + options.length) % options.length;
    root.value = options[idx];
    label.textContent = format(options[idx]);
    onchange?.(options[idx]);
  };
  const root = el('button', {
    class: 'cycler interactive',
    type: 'button',
    onclick: () => step(1),
    onkeydown: (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); e.stopPropagation(); step(-1); }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); e.stopPropagation(); step(1); }
    },
  },
  el('span', { class: 'cycler-arrow', html: '&#9666;' }),
  label,
  el('span', { class: 'cycler-arrow', html: '&#9656;' }));
  root.value = options[idx];
  /** Programmatic set without firing onchange. */
  root.setValue = (v) => {
    const i = options.indexOf(v);
    if (i >= 0) { idx = i; root.value = v; label.textContent = format(v); }
  };
  return root;
}

/** Format seconds -> M:SS. Tolerates garbage. */
export function fmtTime(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
