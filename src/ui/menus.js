/** Loading screen, main menu, pause menu. */
export class Menus {
  constructor(game) {
    this.game = game;
    const el = document.createElement('div');
    el.id = 'menus';
    el.innerHTML = `
      <style>
        #menus .screen { position: fixed; inset: 0; z-index: 50; display: none;
          align-items: center; justify-content: center; flex-direction: column;
          background: radial-gradient(ellipse at 30% 20%, #1a2027 0%, #0a0d10 70%);
          color: #e8e6e0; font-family: 'Rajdhani', sans-serif; }
        #menus .screen.on { display: flex; }
        #menus h1 { font-size: 56px; letter-spacing: 14px; font-weight: 700; margin: 0 0 6px;
          text-shadow: 0 0 30px rgba(255,180,90,.25); }
        #menus .sub { letter-spacing: 6px; opacity: .65; font-size: 16px; margin-bottom: 48px; }
        #menus button { pointer-events: auto; cursor: pointer; background: rgba(255,255,255,.06);
          color: #fff; border: 1px solid rgba(255,255,255,.3); padding: 13px 60px; font-size: 19px;
          font-family: inherit; letter-spacing: 5px; font-weight: 600; transition: all .15s; }
        #menus button:hover { background: rgba(255,190,90,.18); border-color: rgba(255,190,90,.7); }
        #menus .bar { width: 320px; height: 3px; background: rgba(255,255,255,.12); margin-top: 26px; }
        #menus .bar i { display: block; height: 100%; width: 0%; background: #ffb45a; transition: width .2s; }
        #menus .keys { position: absolute; bottom: 36px; font-size: 14px; letter-spacing: 2px; opacity: .55; line-height: 1.9; text-align: center; }
      </style>
      <div class="screen loading on">
        <h1>OPERATION BLACKSITE</h1>
        <div class="sub">LOADING THEATER ASSETS</div>
        <div class="bar"><i></i></div>
      </div>
      <div class="screen main">
        <h1>OPERATION BLACKSITE</h1>
        <div class="sub">URBAN WARFARE &nbsp;·&nbsp; TEAM DEATHMATCH</div>
        <button class="deploy">DEPLOY</button>
        <div class="keys">
          WASD MOVE · SHIFT SPRINT · C CROUCH/SLIDE · SPACE JUMP<br/>
          MOUSE AIM · RMB ADS · R RELOAD · G FRAG · 1/2 WEAPONS · 4 AIRSTRIKE
        </div>
      </div>
      <div class="screen pause">
        <h1>PAUSED</h1>
        <div class="sub">STAND BY</div>
        <button class="resume">RESUME</button>
      </div>
    `;
    document.body.appendChild(el);
    this.el = el;
    this.$ = (s) => el.querySelector(s);
    this.game.assets.onProgress((p) => { this.$('.bar i').style.width = `${Math.round(p * 100)}%`; });
  }

  showLoading() { this._show('loading'); }
  hideLoading() { this.$('.loading').classList.remove('on'); }
  showMain(onDeploy) {
    this._show('main');
    this.$('.deploy').onclick = () => { this.hideAll(); onDeploy(); };
  }
  showPause(onResume) {
    this._show('pause');
    this.$('.resume').onclick = () => { this.hideAll(); onResume(); };
  }
  hideAll() { this.el.querySelectorAll('.screen').forEach((s) => s.classList.remove('on')); }
  _show(name) {
    this.hideAll();
    this.$(`.${name}`).classList.add('on');
  }
}
