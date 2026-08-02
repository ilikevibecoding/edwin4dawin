/**
 * DOM overlay: subtitles, opening text card, chapter slates, loading state.
 * Driven by absolute film time so it behaves identically live and in capture.
 */
export class Hud {
  constructor(root, { timing }) {
    this.root = root;
    this.timing = timing;
    this.lines = timing?.lines || [];
    this.el = {};
    this._build();
    this._current = null;
  }

  _build() {
    const mk = (cls, tag = 'div') => {
      const e = document.createElement(tag);
      e.className = cls;
      this.root.appendChild(e);
      return e;
    };
    this.el.card = mk('hud-card');
    this.el.sub = mk('hud-sub');
    this.el.subWho = document.createElement('span');
    this.el.subWho.className = 'hud-who';
    this.el.subText = document.createElement('span');
    this.el.subText.className = 'hud-text';
    this.el.sub.append(this.el.subWho, this.el.subText);
    this.el.slate = mk('hud-slate');
  }

  /** The "A long time ago..." card. */
  setCard(text, opacity) {
    this.el.card.textContent = text;
    this.el.card.style.opacity = opacity.toFixed(3);
  }

  setSlate(text, opacity) {
    this.el.slate.textContent = text || '';
    this.el.slate.style.opacity = (text ? opacity : 0).toFixed(3);
  }

  lineAt(t) {
    for (const l of this.lines) {
      if (t >= l.start - 0.08 && t <= l.start + l.dur + 0.35) return l;
    }
    return null;
  }

  update(t) {
    const l = this.lineAt(t);
    if (l !== this._current) {
      this._current = l;
      if (l) {
        const who = l.who === 'narrator' ? '' : SPEAKER_LABEL[l.who] || l.who.toUpperCase();
        this.el.subWho.textContent = who ? who + ': ' : '';
        this.el.subText.textContent = l.text;
        this.el.sub.dataset.who = l.who;
      } else {
        this.el.subText.textContent = '';
        this.el.subWho.textContent = '';
      }
    }
    if (l) {
      const fin = Math.min(1, (t - l.start + 0.08) / 0.22);
      const fout = Math.min(1, (l.start + l.dur + 0.35 - t) / 0.3);
      this.el.sub.style.opacity = Math.max(0, Math.min(fin, fout)).toFixed(3);
    } else {
      this.el.sub.style.opacity = '0';
    }
  }
}

export const SPEAKER_LABEL = {
  vader: 'VADER',
  leia: 'LEIA',
  luke: 'LUKE',
  obiwan: 'BEN',
  ghost: 'BEN',
  threepio: 'C-3PO',
  officer: 'CAPTAIN',
  pilot: 'RED LEADER',
};
