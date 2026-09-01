/**
 * Main menu / pause / death / end-of-match screens (DOM, styled in src/styles/menu.css).
 * STUB — the real menus live in src/ui/* (UI team). Must keep: click-to-play → pointer lock → state 'playing'.
 */
export class Menu {
  constructor(game) {
    this.game = game;
    this.root = game.menuRoot;
    this._render(game.state);
    game.events.on('game:state', ({ state }) => this._render(state));
    // Re-entering pointer lock from paused state.
    this.root.addEventListener('click', () => {
      if (game.state === 'menu' || game.state === 'paused') game.setState('playing');
    });
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && game.state === 'playing' && !game.settings.shotMode) game.setState('paused');
    });
  }

  _render(state) {
    if (state === 'playing' || state === 'loading' || this.game.settings.shotMode) {
      this.root.innerHTML = '';
      return;
    }
    const title = state === 'menu' ? 'SEASIDE STRIKE' : state === 'paused' ? 'PAUSED' : state === 'dead' ? 'KILLED IN ACTION' : 'MATCH OVER';
    this.root.innerHTML = `
      <div class="menu__overlay">
        <div class="menu__title">${title}</div>
        <div class="menu__hint">CLICK TO ${state === 'menu' ? 'DEPLOY' : 'RESUME'} · WASD MOVE · SHIFT SPRINT · RMB AIM · R RELOAD · X AIR STRIKE</div>
      </div>`;
  }

  update() {}
}
