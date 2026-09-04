// Administrator / debug control panel for disasters. (Foundation stub: the full DOM panel replaces this
// file. Interface contract used by game.js: new AdminPanel(game); panel.toggle(); panel.open(); panel.close();
// panel.isOpen; panel.update() called every frame while open.)
export class AdminPanel {
  constructor(game) {
    this.game = game;
    this.isOpen = false;
    this.root = document.createElement('div');
    this.root.id = 'admin-panel';
    this.root.style.cssText = 'position:absolute;top:12px;right:12px;z-index:6;display:none;background:rgba(20,20,24,0.92);color:#eee;font:13px monospace;padding:10px;border:2px solid #555;max-width:360px';
    this.root.innerHTML = '<b>Disaster controls (stub)</b><div id="admin-status"></div>';
    document.body.appendChild(this.root);
  }
  open() { if (!this.game.permissions.isAdmin()) { this.game.hud.addMessage('Administrator permission required.'); return; } this.isOpen = true; this.root.style.display = 'block'; }
  close() { this.isOpen = false; this.root.style.display = 'none'; }
  toggle() { if (this.isOpen) this.close(); else this.open(); }
  update() { const s = this.game.disasters.status(); const el = this.root.querySelector('#admin-status'); if (el) el.textContent = `${s.state} ${s.type || ''} t=${s.elapsed.toFixed(1)}s journal=${s.journal}`; }
}
