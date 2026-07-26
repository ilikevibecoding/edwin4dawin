/** Menu flow: main menu, controls, settings, pause, death screen. */
export class MenuSystem {
  constructor({ onDeploy, onResume, onQuit, onSettings, audio }) {
    this.root = document.getElementById('menu-root');
    this.screens = {
      main: document.getElementById('menu-main'),
      controls: document.getElementById('menu-controls'),
      settings: document.getElementById('menu-settings'),
      pause: document.getElementById('menu-pause'),
      death: document.getElementById('death-screen'),
    };
    this.audio = audio;
    this.onDeploy = onDeploy;
    this.onResume = onResume;
    this.onQuit = onQuit;
    this.onSettings = onSettings;

    // One-line descriptions under the main menu items + mono key legend in
    // the footer (DOM injected here so index.html stays untouched).
    const DESCS = {
      'btn-deploy': 'Enter the AO',
      'btn-controls': 'Mission intel and input map',
      'btn-settings': 'Video and audio options',
    };
    for (const [id, desc] of Object.entries(DESCS)) {
      const btn = document.getElementById(id);
      const label = document.createElement('span');
      label.className = 'menu-label';
      label.textContent = btn.textContent.trim();
      const d = document.createElement('span');
      d.className = 'menu-desc';
      d.textContent = desc;
      btn.textContent = '';
      btn.append(label, d);
      btn.classList.add('has-desc');
    }
    const footSpans = document.querySelectorAll('#menu-foot span');
    const keys = footSpans[footSpans.length - 1];
    keys.className = 'menu-keys';
    keys.textContent = '[\u21B5] SELECT\u2003[ESC] BACK';

    document.getElementById('btn-deploy').addEventListener('click', () => { this._click(true); onDeploy(); });
    document.getElementById('btn-controls').addEventListener('click', () => { this._click(); this.show('controls'); });
    document.getElementById('btn-settings').addEventListener('click', () => { this._click(); this.show('settings'); });
    document.getElementById('btn-resume').addEventListener('click', () => { this._click(true); onResume(); });
    document.getElementById('btn-quit').addEventListener('click', () => { this._click(); onQuit(); });
    document.getElementById('btn-redeploy').addEventListener('click', () => { this._click(true); onDeploy(); });
    for (const btn of document.querySelectorAll('[data-back]')) {
      btn.addEventListener('click', () => { this._click(); this.show('main'); });
    }

    // Settings bindings
    const sens = document.getElementById('set-sens');
    const fov = document.getElementById('set-fov');
    const quality = document.getElementById('set-quality');
    const sensV = document.getElementById('set-sens-v');
    const fovV = document.getElementById('set-fov-v');
    const emit = () => {
      sensV.textContent = parseFloat(sens.value).toFixed(1);
      fovV.textContent = fov.value;
      onSettings({ sensitivity: parseFloat(sens.value), fov: parseFloat(fov.value), quality: quality.value });
    };
    sens.addEventListener('input', emit);
    fov.addEventListener('input', emit);
    quality.addEventListener('change', emit);

    for (const b of document.querySelectorAll('.menu-btn')) {
      b.addEventListener('mouseenter', () => this.audio.started && this.audio.uiClick());
    }
  }

  _click(confirm = false) {
    this.audio.ensure();
    this.audio.uiClick(confirm);
  }

  show(name) {
    this.root.classList.add('active');
    for (const [k, el] of Object.entries(this.screens)) {
      el.classList.toggle('hidden', k !== name);
    }
  }

  showDeath(subtitle) {
    document.getElementById('death-sub').textContent = subtitle;
    this.show('death');
  }

  hideAll() {
    this.root.classList.remove('active');
    for (const el of Object.values(this.screens)) el.classList.add('hidden');
  }
}
