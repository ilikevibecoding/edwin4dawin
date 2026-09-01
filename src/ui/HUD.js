/**
 * In-game HUD (DOM based, styled in src/styles/hud.css). STUB — the real COD-style HUD lives in src/ui/* (UI team):
 * minimap, team score + timer, objective marker, health, ammo, hitmarkers, killfeed, killstreak prompt, damage direction.
 *
 * Required interface: update(dt), toggle(), setVisible(bool), root (HTMLElement), showMessage(text, duration)
 * Listens to: weapon:ammo, player:health, enemy:killed, enemy:damaged, killstreak:*, objective:*, score, game:state
 */
export class HUD {
  constructor(game) {
    this.game = game;
    this.root = game.hudRoot;
    this.visible = true;
    this.root.innerHTML = `
      <div class="hud__crosshair"></div>
      <div class="hud__ammo"><span id="hud-ammo">30</span> <span style="opacity:.6;font-size:18px">/ <span id="hud-reserve">180</span></span></div>
    `;
    this._ammo = this.root.querySelector('#hud-ammo');
    this._reserve = this.root.querySelector('#hud-reserve');
    game.events.on('weapon:ammo', (e) => {
      this._ammo.textContent = e.ammo;
      this._reserve.textContent = e.reserve;
    });
    game.events.on('game:state', ({ state }) => this.setVisible(state === 'playing' || state === 'dead'));
    this.setVisible(game.state === 'playing');
  }

  setVisible(v) {
    this.visible = v;
    this.root.style.display = v ? '' : 'none';
  }

  toggle() {
    this.setVisible(!this.visible);
  }

  showMessage() {}

  update() {}
}
