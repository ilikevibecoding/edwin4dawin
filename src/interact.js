/**
 * interact.js — centre-screen raycast interactions, hover highlight, prompts,
 * fades, HUD status line and the sleep/rest lighting cycle.
 */
import * as THREE from 'three';
import { PALETTE } from './materials.js';

// Hover tint: a *pale* teal at very low intensity. Saturated teal at 0.16 read as
// "the whole object turns neon" in the dark rooms — the DOM prompt is the real
// affordance, this is just a sheen that says "this one".
const HOVER_COLOR = new THREE.Color(0xb6f2ea);

const ACTIONS = {
  bed: {
    label: 'Sleep',
    fade: true,
    caption: '8 HOURS PASS',
    toast: 'You sleep. The ship hums on.',
    hold: 1900,
  },
  galley: {
    label: 'Eat',
    fade: false,
    toast: 'You eat. Energy restored.',
  },
  bathroom: {
    label: 'Wash',
    fade: true,
    caption: 'REFRESHED',
    toast: 'You wash up. Refreshed.',
    hold: 1200,
  },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class Interactions {
  constructor({ camera, interactables, rig, hud, onBusyChange }) {
    this.camera = camera;
    this.rig = rig;
    this.hud = hud;
    this.onBusyChange = onBusyChange;
    this.busy = false;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 4;
    this.raycaster.layers.enableAll();
    this.hover = null;
    this.time = 7 * 60 + 42;   // ship minutes
    this.stats = { rested: 78, fed: 61, hygiene: 84 };
    this.restTimer = 0;

    this.items = interactables.map((it) => {
      for (const m of it.meshes) {
        m.material = m.material.clone();
        m.material.emissive = new THREE.Color(0x000000);
        m.material.emissiveIntensity = 1;
        m.userData.interactId = it.id;
      }
      return { ...it, glow: 0 };
    });
    this.meshList = this.items.flatMap((i) => i.meshes);

    this._onKey = (e) => {
      if (e.code === 'KeyE') this.trigger();
    };
    document.addEventListener('keydown', this._onKey);
    this.updateStatus();
  }

  setBusy(v) {
    this.busy = v;
    this.onBusyChange?.(v);
  }

  update(dt, playerPos) {
    // advance ship clock
    this.time = (this.time + dt * 0.6) % 1440;
    this.stats.rested = Math.max(0, this.stats.rested - dt * 0.05);
    this.stats.fed = Math.max(0, this.stats.fed - dt * 0.07);

    let found = null;
    if (!this.busy) {
      this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
      const hits = this.raycaster.intersectObjects(this.meshList, false);
      if (hits.length) {
        const id = hits[0].object.userData.interactId;
        const item = this.items.find((i) => i.id === id);
        if (item && hits[0].distance <= item.range) found = item;
      }
      if (!found && playerPos) {
        // forgiving fallback: near + roughly facing
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        for (const item of this.items) {
          const to = item.point.clone().sub(this.camera.position);
          const d = to.length();
          if (d < item.range && to.normalize().dot(dir) > 0.86) { found = item; break; }
        }
      }
    }

    if (found !== this.hover) {
      this.hover = found;
      this.hud.setPrompt(found ? ACTIONS[found.id].label : null);
    }

    for (const item of this.items) {
      const target = item === this.hover ? 1 : 0;
      const next = THREE.MathUtils.lerp(item.glow, target, 1 - Math.exp(-9 * dt));
      if (Math.abs(next - item.glow) > 0.001) {
        item.glow = next;
        for (const m of item.meshes) {
          m.material.emissive.copy(HOVER_COLOR);
          m.material.emissiveIntensity = next * 0.05;
        }
      }
    }

    this.updateStatus();
  }

  updateStatus() {
    const h = String(Math.floor(this.time / 60)).padStart(2, '0');
    const m = String(Math.floor(this.time % 60)).padStart(2, '0');
    this.hud.setStatus(
      `SHIP TIME ${h}:${m}`,
      Math.round(this.stats.rested),
      Math.round(this.stats.fed),
      Math.round(this.stats.hygiene),
      this.rig.preset === 'rest' ? 'REST CYCLE' : 'DUTY CYCLE',
    );
  }

  canTrigger() { return !!this.hover && !this.busy; }

  trigger(forceId = null) {
    const item = forceId ? this.items.find((i) => i.id === forceId) : this.hover;
    if (!item || this.busy) return Promise.resolve(false);
    return this.run(item.id);
  }

  async run(id) {
    const a = ACTIONS[id];
    if (!a) return false;
    this.setBusy(true);
    this.hud.setPrompt(null);

    if (a.fade) {
      await this.hud.fadeTo(1, 850);
      this.hud.setCaption(a.caption);
      if (id === 'bed') {
        this.rig.set('rest', 0.01);
        this.time = (6 * 60 + 15) % 1440;
        this.stats.rested = 100;
      } else {
        this.stats.hygiene = 100;
      }
      await sleep(a.hold);
      this.hud.setCaption(null);
      await sleep(320);
      await this.hud.fadeTo(0, 900);
      if (id === 'bed') {
        // hold the rest cycle for a beat, then ease back to duty lighting
        setTimeout(() => this.rig.set('day', 14), 5200);
      }
    } else {
      this.stats.fed = 100;
      if (id === 'galley') this.hud.pulse();
    }

    this.hud.toast(a.toast);
    this.updateStatus();
    this.setBusy(false);
    return true;
  }

  dispose() {
    document.removeEventListener('keydown', this._onKey);
  }
}

/* ---------------------------------------------------------------- HUD glue */

export function createHUD() {
  const el = {
    prompt: document.getElementById('prompt'),
    promptLabel: document.getElementById('prompt-label'),
    crosshair: document.getElementById('crosshair'),
    status: document.getElementById('status'),
    toast: document.getElementById('toast'),
    fade: document.getElementById('fade'),
    caption: document.getElementById('caption'),
    splash: document.getElementById('splash'),
    loading: document.getElementById('loading'),
  };
  let fadeAlpha = 0;
  let toastTimer = 0;
  let lastToast = null;
  let captionText = '';
  let promptText = null;

  const hud = {
    el,
    setPrompt(label) {
      promptText = label;
      if (label) {
        el.promptLabel.textContent = label;
        el.prompt.classList.add('show');
        el.crosshair.classList.add('hot');
      } else {
        el.prompt.classList.remove('show');
        el.crosshair.classList.remove('hot');
      }
    },
    getPrompt: () => (promptText ? `E: ${promptText}` : null),
    setStatus(time, rested, fed, hygiene, cycle) {
      el.status.innerHTML =
        `${time} · <b>${cycle}</b> · RESTED <b>${rested}%</b> · FED <b>${fed}%</b> · HYGIENE <b>${hygiene}%</b>`;
    },
    getStatusText: () => el.status.textContent,
    toast(text, ms = 5200) {
      lastToast = text;
      el.toast.textContent = text;
      el.toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => el.toast.classList.remove('show'), ms);
    },
    getToastText: () => (el.toast.classList.contains('show') ? el.toast.textContent : null),
    getLastToast: () => lastToast,
    clearToast() { lastToast = null; },
    pulse() {
      el.crosshair.classList.add('hot');
      setTimeout(() => el.crosshair.classList.remove('hot'), 250);
    },
    setCaption(text) {
      captionText = text || '';
      el.caption.textContent = captionText;
      el.caption.style.opacity = text ? '1' : '0';
    },
    getCaption: () => (Number(el.caption.style.opacity || 0) > 0.5 ? captionText : null),
    fadeTo(target, ms) {
      return new Promise((resolve) => {
        const from = fadeAlpha;
        const t0 = performance.now();
        const step = () => {
          const k = Math.min(1, (performance.now() - t0) / ms);
          fadeAlpha = from + (target - from) * (k * k * (3 - 2 * k));
          el.fade.style.opacity = String(fadeAlpha);
          if (k < 1) requestAnimationFrame(step);
          else { fadeAlpha = target; el.fade.style.opacity = String(target); resolve(); }
        };
        step();
      });
    },
    getFadeAlpha: () => fadeAlpha,
    hideSplash() { el.splash.classList.add('hidden'); },
    showSplash() { el.splash.classList.remove('hidden'); },
    hideLoading() { el.loading.classList.add('hidden'); },
    setHudVisible(v) { document.getElementById('hud').style.display = v ? '' : 'none'; },
  };
  return hud;
}
