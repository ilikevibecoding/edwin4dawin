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
    // Key prompts as boxed chips (matches the HUD's square keybind chips).
    keys.innerHTML =
      '<span class="key-chip"><i>\u21B5</i>SELECT</span>' +
      '<span class="key-chip"><i>ESC</i>BACK</span>';
    // Bottom-left player identity chrome: rank chevrons + name + unit/level.
    const ident = document.createElement('div');
    ident.id = 'menu-ident';
    ident.innerHTML =
      '<svg viewBox="0 0 16 13" aria-hidden="true">' +
      '<path d="M8 0 L15.2 4.3 15.2 6.9 8 2.6 0.8 6.9 0.8 4.3 Z"/>' +
      '<path d="M8 6 L15.2 10.3 15.2 12.9 8 8.6 0.8 12.9 0.8 10.3 Z"/>' +
      '</svg>' +
      '<span class="mi-name">SGT. VANCE</span>' +
      '<span class="mi-sub">TF-141 // LEVEL 24</span>';
    document.getElementById('menu-foot').prepend(ident);

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
    // Main screen swaps the heavy shared vignette for its own left column
    // scrim (styles.css); pause/death/sub-screens keep the full dim.
    this.root.classList.toggle('on-main', name === 'main');
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
    this.root.classList.remove('on-main');
    for (const el of Object.values(this.screens)) el.classList.add('hidden');
  }
}
