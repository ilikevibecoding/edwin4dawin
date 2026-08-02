/**
 * Entry point.
 *
 * Sets up the error boundary first so that any failure during construction is
 * reported in the page rather than only in the console, checks for WebGL, then
 * builds the application and unlocks the gate.
 */

import { App } from './app/app';

const fatal = (title: string, detail: string): void => {
  const box = document.getElementById('fatal');
  const msg = document.getElementById('fatal-msg');
  const det = document.getElementById('fatal-detail');
  if (box && msg && det) {
    box.hidden = false;
    msg.textContent = title;
    det.textContent = detail;
  }
  const gate = document.getElementById('gate');
  if (gate) gate.style.display = 'none';
};

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

let app: App | null = null;

window.addEventListener('error', (e) => {
  if (!app) fatal('The projector jammed before the reel started.', String(e.message ?? e));
  console.error('[a-stolen-secret]', e.error ?? e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[a-stolen-secret] unhandled rejection', e.reason);
});

async function boot(): Promise<void> {
  const canvas = document.getElementById('stage') as HTMLCanvasElement | null;
  if (!canvas) {
    fatal('Missing viewport.', 'The page did not provide a <canvas id="stage">.');
    return;
  }
  if (!hasWebGL()) {
    fatal(
      'This browser cannot open a WebGL context.',
      'The piece needs WebGL 1 or 2. Try a recent Chrome, Firefox, Safari or Edge, and make sure hardware acceleration is enabled.',
    );
    return;
  }

  try {
    app = new App(canvas);
    await app.prepare();
  } catch (err) {
    const detail = err instanceof Error ? `${err.message}\n\n${err.stack ?? ''}` : String(err);
    fatal('Something went wrong while building the scene.', detail);
    console.error(err);
  }
}

void boot();
