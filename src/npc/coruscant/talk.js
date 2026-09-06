// The talk exchange (rubric 07 row 9): right-clicking a citizen opens a small DOM box styled like the admin panel
// (dark, monospace, hard pixel edges) with the NPC's line and one to three replies - ask for directions, ask about
// their work, trade when they sell something. Trade emits `onTrade(npc, purpose)` for the economy builder. Keys 1-3
// and Escape drive it (the pointer stays locked); clicking a reply works too when the pointer is free.
const CSS = `
#npc-talk { position: absolute; left: 50%; bottom: 18%; transform: translateX(-50%); width: 520px; max-width: calc(100vw - 32px); z-index: 6;
  background: rgba(14, 18, 28, 0.94); color: #eef0f6; font: 14px/1.45 'Lucida Console', 'Courier New', ui-monospace, Menlo, Consolas, monospace;
  border: 2px solid #0a0d16; box-shadow: inset 2px 2px 0 rgba(150, 190, 255, 0.16), inset -2px -2px 0 rgba(0, 0, 0, 0.6), 0 10px 28px rgba(0, 0, 0, 0.55);
  text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.85); user-select: none; padding: 10px 14px 12px; box-sizing: border-box; }
#npc-talk[hidden] { display: none; }
#npc-talk .nt-name { color: #9cc4ff; font-weight: bold; margin-bottom: 2px; }
#npc-talk .nt-role { color: #8d97ad; font-size: 12px; margin-bottom: 8px; }
#npc-talk .nt-line { margin: 0 0 10px; min-height: 40px; }
#npc-talk .nt-opts { display: flex; flex-direction: column; gap: 6px; }
#npc-talk button { text-align: left; font: inherit; color: #f3e9d8; background: #1c2436; border: 2px solid #0a0d16; box-shadow: inset 1px 1px 0 rgba(150, 190, 255, 0.18); padding: 6px 10px; cursor: pointer; }
#npc-talk button:hover, #npc-talk button:focus-visible { background: #27324a; outline: none; }
#npc-talk button b { color: #ffd080; margin-right: 8px; }
#npc-talk .nt-hint { color: #6f7a92; font-size: 11px; margin-top: 8px; }
`;

export class TalkBox {
  constructor(game, pop) {
    this.game = game; this.pop = pop;
    this.npc = null; this.options = []; this.turns = 0;
    const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
    const root = document.createElement('div'); root.id = 'npc-talk'; root.hidden = true;
    root.innerHTML = '<div class="nt-name"></div><div class="nt-role"></div><p class="nt-line"></p><div class="nt-opts"></div><div class="nt-hint">1-3 reply, Esc leave</div>';
    document.body.appendChild(root);
    this.root = root;
    this.elName = root.querySelector('.nt-name'); this.elRole = root.querySelector('.nt-role'); this.elLine = root.querySelector('.nt-line'); this.elOpts = root.querySelector('.nt-opts');
    this.onKey = (e) => {
      if (!this.npc) return;
      if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); this.close(); return; }
      const m = /^Digit([1-3])$/.exec(e.code);
      if (m) { e.preventDefault(); e.stopImmediatePropagation(); this.choose(parseInt(m[1], 10) - 1); }
    };
    document.addEventListener('keydown', this.onKey, true);
  }
  get isOpen() { return !!this.npc; }

  open(npc, line, options, role) {
    this.npc = npc; this.turns = 0;
    this.elName.textContent = npc.name;
    this.elRole.textContent = role || '';
    this.show(line, options);
    this.root.hidden = false;
    if (this.game.hud) this.game.hud.screen = 'talk';
  }
  show(line, options) {
    this.options = options;
    this.elLine.textContent = line;
    this.elOpts.innerHTML = '';
    options.forEach((o, i) => {
      const b = document.createElement('button');
      b.innerHTML = `<b>${i + 1}</b>${o.label}`;
      b.addEventListener('click', () => this.choose(i));
      this.elOpts.appendChild(b);
    });
  }
  choose(i) {
    const o = this.options[i];
    if (!o || !this.npc) return;
    this.turns++;
    const res = o.act();
    // the reply is said out loud too (bubble + chat line), not only printed in the box
    if (res && res.line && this.pop.speak) this.pop.speak(this.npc, res.line, true);
    if (!res || this.turns >= 3) { if (res) { this.show(res.line, []); setTimeout(() => this.close(), 2600); } else this.close(); return; }
    this.show(res.line, res.options || []);
    if (!res.options || !res.options.length) setTimeout(() => { if (this.npc) this.close(); }, 2600);
  }
  close() {
    if (!this.npc) return;
    const n = this.npc;
    this.npc = null; this.options = [];
    this.root.hidden = true;
    if (this.game.hud && this.game.hud.screen === 'talk') this.game.hud.screen = null;
    if (this.pop.onTalkEnd) this.pop.onTalkEnd(n);
  }
}
