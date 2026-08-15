import * as THREE from 'three';

export function createInteractions({ camera, interactables, onPrompt, onStatus, onFade, onSonar, onRest, onSilent }) {
  const ray = new THREE.Raycaster();
  ray.far = 1.85;
  const ndc = new THREE.Vector2(0, 0);
  let hover = null;
  let highlight = null;
  const clock = { restBusy: false };

  function update() {
    ray.setFromCamera(ndc, camera);
    const hits = interactables
      .map((it) => {
        const rec = ray.intersectObject(it.object, true)[0];
        return rec ? { it, rec } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.rec.distance - b.rec.distance);

    const next = hits[0]?.it || null;
    if (next !== hover) {
      if (highlight) {
        highlight.material?.dispose?.();
        highlight.parent?.remove(highlight);
        highlight = null;
      }
      hover = next;
      if (hover) {
        highlight = new THREE.Mesh(
          new THREE.SphereGeometry(0.04, 10, 8),
          new THREE.MeshBasicMaterial({ color: 0xc8e0a8, transparent: true, opacity: 0.55 }),
        );
        highlight.position.copy(hover.position);
        hover.object.parent?.add(highlight);
      }
      onPrompt(hover ? hover.prompt : '');
    }
  }

  function activate() {
    if (!hover) return false;
    return trigger(hover.name);
  }

  function trigger(name) {
    if (name === 'sonar') {
      onSonar();
      onStatus('Sonar pulse transmitted.');
      setTimeout(() => onStatus('No immediate contact.'), 900);
      return true;
    }
    if (name === 'rest') {
      if (clock.restBusy) return true;
      clock.restBusy = true;
      onFade(true);
      onStatus('6 hours pass.');
      onRest('start');
      setTimeout(() => {
        onRest('hold');
        onFade(false);
        onStatus('Rested.');
        setTimeout(() => {
          onRest('end');
          clock.restBusy = false;
        }, 2200);
      }, 1400);
      return true;
    }
    if (name === 'silentRunning') {
      const engaged = onSilent();
      onStatus(engaged ? 'Silent running engaged.' : 'Silent running disengaged.');
      return true;
    }
    return false;
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE') activate();
  });

  return { update, activate, trigger, getHover: () => hover };
}

export function createAudio() {
  let ctx = null;
  function ensure() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }
  function ping() {
    const ac = ensure();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(180, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(70, ac.currentTime + 0.9);
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.18, ac.currentTime + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 1.2);
    o.connect(g);
    g.connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + 1.25);
  }
  return { ping };
}
