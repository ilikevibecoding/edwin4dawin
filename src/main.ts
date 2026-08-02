import './ui/style.css';
import { App, readStartupOptions } from './app/App';
import { SUBTITLE, TITLE } from './timeline/Script';

/**
 * Entry point: loading gate, error boundary, and the "Enter the Galaxy"
 * action that unlocks audio playback.
 */

const canvas = document.getElementById('stage') as HTMLCanvasElement | null;
const uiRoot = document.getElementById('ui-root');

if (!canvas || !uiRoot) {
  throw new Error('Expected #stage and #ui-root in the document.');
}

const consoleErrors: string[] = [];
const originalError = console.error.bind(console);
console.error = (...args: unknown[]): void => {
  consoleErrors.push(args.map((a) => String(a)).join(' '));
  originalError(...args);
};

function fatal(title: string, detail: string): void {
  const wrap = document.createElement('div');
  wrap.className = 'fatal';
  const card = document.createElement('div');
  card.className = 'fatal__card';
  const h = document.createElement('h2');
  h.textContent = title;
  const pre = document.createElement('pre');
  pre.textContent = detail;
  card.append(h, pre);
  wrap.appendChild(card);
  document.body.appendChild(wrap);
}

function checkWebGL2(): boolean {
  try {
    const probe = document.createElement('canvas');
    return !!probe.getContext('webgl2');
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------ the gate */

const gate = document.createElement('div');
gate.className = 'gate';
gate.innerHTML = `
  <div class="gate__inner">
    <p class="gate__eyebrow">An original interactive cinematic</p>
    <h1 class="gate__title">${TITLE}</h1>
    <p class="gate__subtitle">${SUBTITLE}</p>
    <p class="gate__blurb">
      A rebel courier runs above a desert world with a stolen weapons plan aboard.
      Six and a half minutes of directed camera, original narration and a procedural score —
      then the timeline is yours to pause, scrub and explore.
    </p>
    <div class="progress"><div class="progress__bar" id="gate-bar"></div></div>
    <div class="progress__label" id="gate-label">Preparing</div>
    <button class="gate__cta" id="gate-cta" disabled>Enter the galaxy</button>
    <p class="gate__legal">
      Every model, texture, sound, musical cue and spoken line here was generated for this project.
      It contains no footage, audio, artwork or text from any film. Headphones recommended.
    </p>
  </div>
`;
uiRoot.appendChild(gate);

const bar = gate.querySelector<HTMLDivElement>('#gate-bar');
const label = gate.querySelector<HTMLDivElement>('#gate-label');
const cta = gate.querySelector<HTMLButtonElement>('#gate-cta');

function progress(value: number, text: string): void {
  if (bar) bar.style.width = `${Math.round(value * 100)}%`;
  if (label) label.textContent = text;
}

async function main(): Promise<void> {
  if (!checkWebGL2()) {
    fatal(
      'WebGL 2 is required',
      'This experience needs a WebGL 2 capable browser with hardware acceleration enabled.\n' +
        'Try a recent version of Chrome, Edge, Firefox or Safari, and make sure hardware acceleration is on.',
    );
    return;
  }

  const options = readStartupOptions();
  const app = new App(canvas as HTMLCanvasElement, uiRoot as HTMLElement, options);

  window.addEventListener('error', (e) => {
    consoleErrors.push(String(e.message));
    app.noteConsoleError(String(e.message));
  });
  window.addEventListener('unhandledrejection', (e) => {
    consoleErrors.push(String(e.reason));
    app.noteConsoleError(String(e.reason));
  });

  try {
    // Yield between build phases so the progress bar actually paints.
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    await app.build((v, text) => progress(v * 0.9, text));
  } catch (err) {
    console.error(err);
    fatal('Could not build the scene', err instanceof Error ? `${err.message}\n\n${err.stack ?? ''}` : String(err));
    return;
  }

  progress(0.92, 'Ready');
  if (cta) {
    cta.disabled = false;
    cta.textContent = 'Enter the galaxy';
  }

  const enter = async (): Promise<void> => {
    if (cta) {
      cta.disabled = true;
      cta.textContent = 'Entering…';
    }
    progress(0.95, 'Starting audio');
    await app.startAudio(progress);
    progress(1, 'Ready');
    gate.classList.add('hidden');
    window.setTimeout(() => gate.remove(), 1000);
    app.start();
    if (window.__STARFALL) window.__STARFALL.consoleErrors = consoleErrors;
  };

  cta?.addEventListener('click', () => void enter());
  gate.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).code === 'Enter') void enter();
  });

  // QA mode skips the gate so the harness can drive the show immediately.
  if (options.qaMode) {
    gate.classList.add('hidden');
    app.start();
    app.show.timeline.pause();
    if (window.__STARFALL) window.__STARFALL.consoleErrors = consoleErrors;
  }
}

void main();
