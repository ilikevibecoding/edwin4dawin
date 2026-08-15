import * as THREE from 'three';

export function createInteractions({ camera, scene, hud, onSonar, onRest, onSilent }) {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2(0, 0);
  const targets = [];
  let hover = null;
  let busy = false;

  function add(mesh, name, prompt) {
    mesh.userData.interact = { name, prompt };
    targets.push(mesh);
  }

  function update() {
    if (busy) return hover;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(targets, true);
    let next = null;
    for (const hit of hits) {
      let o = hit.object;
      while (o && !o.userData.interact) o = o.parent;
      if (o && o.userData.interact && hit.distance < 2.8) {
        next = o;
        break;
      }
    }
    if (hover && hover !== next) setHighlight(hover, false);
    if (next && next !== hover) setHighlight(next, true);
    hover = next;
    if (hud) {
      if (hover) hud.setPrompt(hover.userData.interact.prompt);
      else hud.setPrompt('');
    }
    return hover;
  }

  function activate() {
    if (busy || !hover) return false;
    const name = hover.userData.interact.name;
    if (name === 'sonar') {
      onSonar?.();
      return true;
    }
    if (name === 'rest') {
      busy = true;
      onRest?.(() => {
        busy = false;
      });
      return true;
    }
    if (name === 'silentRunning') {
      onSilent?.();
      return true;
    }
    return false;
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE') activate();
  });

  return {
    add,
    update,
    activate,
    getHover: () => hover,
    setBusy(v) {
      busy = v;
    },
    isBusy: () => busy,
    targets,
  };
}

function setHighlight(obj, on) {
  obj.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const m of mats) {
      if (!m.emissive) continue;
      if (on) {
        if (m.userData.prevEmissive == null) {
          m.userData.prevEmissive = m.emissive.getHex();
          m.userData.prevEmissiveInt = m.emissiveIntensity;
        }
        m.emissive.setHex(0x6a5a3a);
        m.emissiveIntensity = Math.max(m.emissiveIntensity, 0.18);
      } else if (m.userData.prevEmissive != null) {
        m.emissive.setHex(m.userData.prevEmissive);
        m.emissiveIntensity = m.userData.prevEmissiveInt ?? 0;
      }
    }
  });
}

export function createHUD() {
  const promptEl = document.getElementById('prompt');
  const statusEl = document.getElementById('status');
  const fadeEl = document.getElementById('fade');
  const hudRoot = document.getElementById('hud');
  const blocker = document.getElementById('blocker');
  let statusTimer = 0;

  return {
    setPrompt(text) {
      if (!promptEl) return;
      promptEl.textContent = text;
      promptEl.classList.toggle('visible', !!text);
    },
    setStatus(text, hold = 2.4) {
      if (!statusEl) return;
      statusEl.textContent = text;
      statusEl.style.opacity = text ? '1' : '0';
      statusTimer = hold;
    },
    setFade(a) {
      if (fadeEl) fadeEl.style.opacity = String(a);
    },
    setVisible(v) {
      if (hudRoot) hudRoot.style.display = v ? 'block' : 'none';
      if (blocker && !v) blocker.classList.add('hidden');
    },
    hideBlocker() {
      blocker?.classList.add('hidden');
    },
    update(dt) {
      if (statusTimer > 0) {
        statusTimer -= dt;
        if (statusTimer <= 0 && statusEl) statusEl.style.opacity = '0';
      }
    },
    getPrompt() {
      return promptEl?.textContent ?? '';
    },
    getStatus() {
      return statusEl?.textContent ?? '';
    },
    getFade() {
      return Number(fadeEl?.style.opacity || 0);
    },
  };
}

export function createAudio() {
  let ctx = null;
  function ensure() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }
  return {
    ping() {
      const ac = ensure();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, ac.currentTime + 0.9);
      gain.gain.setValueAtTime(0.0001, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, ac.currentTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 1.4);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + 1.5);
    },
  };
}
