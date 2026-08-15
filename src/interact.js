import { BoxGeometry, Mesh, MeshBasicMaterial, Raycaster, Vector2, Vector3, Color } from 'three';

const raycaster = new Raycaster();
const ndc = new Vector2(0, 0);

export function createInteractions(ctx) {
  const {
    camera,
    scene,
    player,
    lights,
    applyState,
    getState,
    water,
  } = ctx;

  const targets = [];
  const hud = {
    prompt: document.getElementById('prompt'),
    status: document.getElementById('status'),
    fade: document.getElementById('fade'),
    hint: document.getElementById('hint'),
    crosshair: document.getElementById('crosshair'),
  };

  let hovered = null;
  let statusTimer = 0;
  let fade = 0;
  let fadeDir = 0;
  let restPhase = 0;
  let restTimer = 0;
  let sonarPing = 0;
  let sonarTime = 0;
  let visible = true;

  function setPrompt(text) {
    if (!hud.prompt) return;
    hud.prompt.textContent = text || '';
    hud.prompt.classList.toggle('visible', Boolean(text) && visible);
  }

  function setStatus(text, hold = 2.4) {
    if (!hud.status) return;
    hud.status.textContent = text || '';
    hud.status.classList.toggle('visible', Boolean(text) && visible);
    statusTimer = hold;
    ctx.statusText = text || '';
  }

  function setHUDVisible(v) {
    visible = v;
    const display = v ? '' : 'none';
    if (hud.prompt) hud.prompt.style.display = display;
    if (hud.status) hud.status.style.display = display;
    if (hud.hint) hud.hint.style.display = display;
    if (hud.crosshair) hud.crosshair.style.display = display;
    if (!v) {
      hud.prompt?.classList.remove('visible');
    }
  }

  function highlight(obj, on) {
    obj.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m) => {
        if (!m.emissive) return;
        if (on) {
          if (m.userData._em == null) m.userData._em = m.emissiveIntensity;
          if (!m.userData._ec) m.userData._ec = m.emissive.clone();
          m.emissive = new Color(0xc8b070);
          m.emissiveIntensity = 0.18;
        } else if (m.userData._em != null) {
          m.emissiveIntensity = m.userData._em;
          if (m.userData._ec) m.emissive.copy(m.userData._ec);
        }
      });
    });
  }

  function register(name, object, prompt) {
    object.userData.interact = name;
    object.userData.prompt = prompt;
    const hit = new Mesh(
      new BoxGeometry(0.7, 0.9, 0.7),
      new MeshBasicMaterial({ visible: false })
    );
    hit.position.y = 0.35;
    object.add(hit);
    targets.push(object);
  }

  function currentAim() {
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(targets, true);
    if (hits.length && hits[0].distance <= 2.2) {
      let obj = hits[0].object;
      while (obj && !obj.userData.interact) obj = obj.parent;
      if (obj) return obj;
    }
    const origin = camera.position;
    const dir = new Vector3();
    camera.getWorldDirection(dir);
    let best = null;
    let bestScore = 0.28;
    for (const obj of targets) {
      const p = new Vector3();
      obj.getWorldPosition(p);
      p.y += 0.35;
      const to = p.clone().sub(origin);
      const dist = to.length();
      if (dist > 2.3 || dist < 0.2) continue;
      const align = to.normalize().dot(dir);
      const score = (1 - align) + dist * 0.04;
      if (align > 0.72 && score < bestScore) {
        bestScore = score;
        best = obj;
      }
    }
    return best;
  }

  function playPing() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, ac.currentTime + 0.7);
      gain.gain.setValueAtTime(0.0001, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, ac.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 1.1);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + 1.15);
    } catch {
      /* audio optional */
    }
  }

  function trigger(name) {
    if (name === 'sonar') {
      sonarPing = 1;
      ctx.sonarPing = 1;
      playPing();
      setStatus('Sonar pulse transmitted.');
      window.setTimeout(() => setStatus('No immediate contact.'), 900);
      if (ctx.onSonar) ctx.onSonar();
      return true;
    }
    if (name === 'rest') {
      fadeDir = 1;
      restPhase = 1;
      restTimer = 0;
      player.state.enabled = false;
      return true;
    }
    if (name === 'silentRunning') {
      const next = getState().lighting === 'silentRunning' ? 'cruising' : 'silentRunning';
      applyState(next);
      setStatus(next === 'silentRunning' ? 'Silent running engaged.' : 'Silent running disengaged.');
      if (ctx.onSilent) ctx.onSilent(next === 'silentRunning');
      return true;
    }
    return false;
  }

  function update(dt) {
    sonarTime += dt;
    if (sonarPing > 0) {
      sonarPing = Math.max(0, sonarPing - dt * 0.85);
      ctx.sonarPing = sonarPing;
    }
    if (statusTimer > 0) {
      statusTimer -= dt;
      if (statusTimer <= 0) {
        hud.status?.classList.remove('visible');
        ctx.statusText = '';
      }
    }

    if (restPhase > 0) {
      restTimer += dt;
      fade = Math.max(0, Math.min(1, fade + fadeDir * dt * 1.1));
      if (hud.fade) hud.fade.style.opacity = String(fade);
      if (restPhase === 1 && fade >= 1) {
        setStatus('6 hours pass.', 2.2);
        applyState('restCycle');
        restPhase = 2;
        restTimer = 0;
      } else if (restPhase === 2 && restTimer > 1.6) {
        fadeDir = -1;
        restPhase = 3;
      } else if (restPhase === 3 && fade <= 0) {
        setStatus('Rested.');
        applyState('cruising');
        player.state.enabled = true;
        restPhase = 0;
      }
    }

    const aim = currentAim();
    if (aim !== hovered) {
      if (hovered) highlight(hovered, false);
      hovered = aim;
      if (hovered) highlight(hovered, true);
    }
    ctx.promptText = aim ? aim.userData.prompt : '';
    setPrompt(aim ? aim.userData.prompt : '');
    ctx.hovered = aim ? aim.userData.interact : null;
  }

  function bind() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyE') {
        const aim = currentAim();
        if (aim) trigger(aim.userData.interact);
      }
    });
  }

  return {
    register,
    update,
    trigger,
    bind,
    setHUDVisible,
    setStatus,
    setPrompt,
    get hovered() {
      return ctx.hovered;
    },
    get prompt() {
      return ctx.promptText;
    },
    get status() {
      return ctx.statusText;
    },
    get fade() {
      return fade;
    },
    get sonarTime() {
      return sonarTime;
    },
    get sonarPing() {
      return sonarPing;
    },
  };
}
