/**
 * Keyboard, mouse and touch input. The on-screen joystick mirrors the WASD
 * keys so the scene is fully playable on a phone or tablet.
 */
export function createInput(actions) {
  const keys = new Set();
  const touch = { steer: 0, throttle: 0 };

  const held = (...codes) => codes.some((code) => keys.has(code));

  window.addEventListener('keydown', (event) => {
    if (event.repeat) {
      event.preventDefault();
      return;
    }
    keys.add(event.code);
    switch (event.code) {
      case 'Space':
        actions.fire('both');
        break;
      case 'KeyQ':
        actions.fire('port');
        break;
      case 'KeyE':
        actions.fire('starboard');
        break;
      case 'KeyC':
        actions.cycleCamera();
        break;
      case 'KeyR':
        actions.reset();
        break;
      case 'KeyH':
        actions.toggleHelp();
        break;
      default:
        break;
    }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
  });

  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  // ---- Virtual joystick ---------------------------------------------------
  const base = document.getElementById('joystick');
  const knob = document.getElementById('joystick-knob');
  if (base && knob) {
    const radius = 52;
    let pointerId = null;

    const move = (event) => {
      const rect = base.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const distance = Math.min(Math.hypot(dx, dy), radius);
      const angle = Math.atan2(dy, dx);
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      knob.style.transform = `translate(${x}px, ${y}px)`;
      touch.steer = x / radius;
      touch.throttle = -y / radius;
    };

    base.addEventListener('pointerdown', (event) => {
      pointerId = event.pointerId;
      base.setPointerCapture(pointerId);
      move(event);
    });
    base.addEventListener('pointermove', (event) => {
      if (event.pointerId === pointerId) move(event);
    });
    const release = (event) => {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      knob.style.transform = 'translate(0px, 0px)';
      touch.steer = 0;
      touch.throttle = 0;
    };
    base.addEventListener('pointerup', release);
    base.addEventListener('pointercancel', release);
  }

  const bind = (id, handler) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('click', (event) => {
        event.preventDefault();
        handler();
        element.blur();
      });
    }
  };
  bind('btn-fire', () => actions.fire('both'));
  bind('btn-camera', () => actions.cycleCamera());
  bind('btn-reset', () => actions.reset());
  bind('btn-help', () => actions.toggleHelp());
  bind('btn-export', () => actions.exportModel());

  return {
    read() {
      let steer = touch.steer;
      let throttle = touch.throttle;
      if (held('KeyA', 'ArrowLeft')) steer -= 1;
      if (held('KeyD', 'ArrowRight')) steer += 1;
      if (held('KeyW', 'ArrowUp')) throttle += 1;
      if (held('KeyS', 'ArrowDown')) throttle -= 1;
      return {
        steer: Math.max(-1, Math.min(1, steer)),
        throttle: Math.max(-1, Math.min(1, throttle)),
        brake: held('ShiftLeft', 'ShiftRight'),
      };
    },
  };
}
