// Keyboard/mouse state with pointer-lock handling and QA injection hooks.
// Real players use raw events; Playwright drives the same pathways through
// window.__qa (see qa.js) so tested input follows identical code paths.

const state = {
  down: new Set(),          // KeyboardEvent.code currently held
  pressed: new Set(),       // codes pressed since last sim step (edge)
  released: new Set(),
  mouseDown: new Set(),     // 0 left, 1 middle, 2 right
  mousePressed: new Set(),
  mouseReleased: new Set(),
  lookDX: 0, lookDY: 0,     // accumulated pointer deltas (pre-sensitivity)
  wheel: 0,
  pointerLocked: false,
  wantPointerLock: false,
  enabled: true,
};

let canvasEl = null;

const GAME_CODES = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyR', 'KeyF', 'KeyG', 'KeyQ', 'KeyC', 'KeyV', 'KeyM',
  'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'Space', 'Tab',
  'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5',
]);

export function initInput(canvas) {
  canvasEl = canvas;

  window.addEventListener('keydown', (e) => {
    if (e.repeat) { if (GAME_CODES.has(e.code)) e.preventDefault(); return; }
    if (isTypingTarget(e.target)) return;
    state.down.add(e.code);
    state.pressed.add(e.code);
    if (GAME_CODES.has(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    state.down.delete(e.code);
    state.released.add(e.code);
  });
  window.addEventListener('blur', () => { state.down.clear(); state.mouseDown.clear(); });

  canvas.addEventListener('mousedown', (e) => {
    if (!state.enabled) return;
    state.mouseDown.add(e.button);
    state.mousePressed.add(e.button);
    if (state.wantPointerLock && !state.pointerLocked) requestPointerLock();
    e.preventDefault();
  });
  window.addEventListener('mouseup', (e) => {
    state.mouseDown.delete(e.button);
    state.mouseReleased.add(e.button);
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('mousemove', (e) => {
    if (state.pointerLocked) {
      state.lookDX += e.movementX;
      state.lookDY += e.movementY;
    }
  });
  window.addEventListener('wheel', (e) => {
    if (state.pointerLocked) { state.wheel += Math.sign(e.deltaY); e.preventDefault(); }
  }, { passive: false });

  document.addEventListener('pointerlockchange', () => {
    state.pointerLocked = document.pointerLockElement === canvasEl;
    for (const fn of lockListeners) fn(state.pointerLocked);
  });
  document.addEventListener('pointerlockerror', () => {
    console.warn('[input] pointer lock rejected by browser');
  });
}

function isTypingTarget(t) {
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}

const lockListeners = new Set();
export function onPointerLockChange(fn) { lockListeners.add(fn); return () => lockListeners.delete(fn); }

export function requestPointerLock() {
  if (!canvasEl || state.pointerLocked) return;
  try {
    const p = canvasEl.requestPointerLock({ unadjustedMovement: true });
    if (p && p.catch) p.catch(() => { try { canvasEl.requestPointerLock(); } catch { /* headless */ } });
  } catch {
    try { canvasEl.requestPointerLock(); } catch { /* headless env without gesture */ }
  }
}
export function exitPointerLock() { if (state.pointerLocked) document.exitPointerLock(); }
export function setWantPointerLock(v) {
  state.wantPointerLock = v;
  if (!v) exitPointerLock();
}
export function isPointerLocked() { return state.pointerLocked; }

// ---- queries used by gameplay each sim step ----
export function keyDown(code) { return state.down.has(code); }
export function keyPressed(code) { return state.pressed.has(code); }
export function mouseButton(b) { return state.mouseDown.has(b); }
export function mousePressed(b) { return state.mousePressed.has(b); }
export function mouseReleased(b) { return state.mouseReleased.has(b); }
export function consumeWheel() { const w = state.wheel; state.wheel = 0; return w; }
export function consumeLook() {
  const d = { dx: state.lookDX, dy: state.lookDY };
  state.lookDX = 0; state.lookDY = 0;
  return d;
}
export function axis() { // WASD -> forward/strafe in [-1,1]
  let f = 0, s = 0;
  if (state.down.has('KeyW')) f += 1;
  if (state.down.has('KeyS')) f -= 1;
  if (state.down.has('KeyD')) s += 1;
  if (state.down.has('KeyA')) s -= 1;
  return { f, s };
}

// Called by engine at the end of every sim step (edge sets are per-step).
export function endInputStep() {
  state.pressed.clear();
  state.released.clear();
  state.mousePressed.clear();
  state.mouseReleased.clear();
}

// ---- QA/test injection (same state object as real events) ----
export function injectKey(code, down) {
  if (down) { if (!state.down.has(code)) { state.down.add(code); state.pressed.add(code); } }
  else { state.down.delete(code); state.released.add(code); }
}
export function injectMouse(button, down) {
  if (down) { if (!state.mouseDown.has(button)) { state.mouseDown.add(button); state.mousePressed.add(button); } }
  else { state.mouseDown.delete(button); state.mouseReleased.add(button); }
}
export function injectLook(dx, dy) { state.lookDX += dx; state.lookDY += dy; }
export function forcePointerLockFlag(v) { state.pointerLocked = v; for (const fn of lockListeners) fn(v); }
