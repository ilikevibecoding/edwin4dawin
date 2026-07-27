/**
 * Hitmarker.ts — the crisp four-tick "X" that snaps in and fades over ~0.25s.
 *
 * The core feedback loop of the genre, so it has to feel *snappy*: a fast
 * scale-in, a brief hold, a quick fade. Headshots get a larger gold variant,
 * kills a heavier red one that kicks a little rotation. Multiple hits stack —
 * each call spawns its own element that cleans itself up on animation end.
 */
export class Hitmarker {
  readonly el: HTMLDivElement;
  private live = new Set<HTMLElement>();

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'hud-hit-layer';
    root.appendChild(this.el);
  }

  show(headshot: boolean, lethal: boolean, hold = false) {
    const m = document.createElement('div');
    m.className = 'hud-hit' + (lethal ? ' kill' : headshot ? ' hs' : '') + (hold ? ' hold' : '');
    for (const c of ['a', 'b', 'c', 'd']) {
      const i = document.createElement('i');
      i.className = c;
      m.appendChild(i);
    }
    if (!hold) {
      const done = () => {
        m.removeEventListener('animationend', done);
        this.live.delete(m);
        m.remove();
      };
      m.addEventListener('animationend', done);
      // Safety net in case animationend is missed (backgrounded tab).
      window.setTimeout(done, 600);
    }
    this.live.add(m);
    this.el.appendChild(m);
  }

  clear() {
    for (const m of this.live) m.remove();
    this.live.clear();
  }

  dispose() {
    this.clear();
    this.el.remove();
  }
}
