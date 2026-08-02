import './ui/styles.css';
import { App } from './app/App';
import type { QualityLevel } from './core/Quality';

/**
 * Entry point.
 *
 * Verifies WebGL support, reads the handful of URL parameters used by the QA
 * harness, and boots the application inside a top-level error boundary so a
 * failure produces a readable message rather than a black rectangle.
 */

const canvas = document.getElementById('stage') as HTMLCanvasElement | null;
const uiRoot = document.getElementById('ui-root');

function fatal(message: string, detail?: unknown): void {
  console.error(message, detail);
  const box = document.createElement('div');
  box.style.cssText =
    'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;'
    + 'flex-direction:column;gap:1rem;background:#05070a;color:#e8c268;'
    + 'font-family:"Trebuchet MS",system-ui,sans-serif;text-align:center;padding:2rem;z-index:999';
  const h = document.createElement('h1');
  h.textContent = 'Unable to start';
  h.style.cssText = 'letter-spacing:0.2em;text-transform:uppercase;font-size:1.1rem;margin:0';
  const p = document.createElement('p');
  p.textContent = message;
  p.style.cssText = 'color:#aeb6c3;max-width:52ch;line-height:1.7;margin:0;font-size:0.9rem';
  box.append(h, p);
  if (detail) {
    const pre = document.createElement('pre');
    pre.textContent = String(detail).slice(0, 1200);
    pre.style.cssText = 'color:#ff9b82;font-size:0.72rem;max-width:70ch;white-space:pre-wrap;text-align:left';
    box.appendChild(pre);
  }
  document.body.appendChild(box);
}

function supportsWebGL(target: HTMLCanvasElement): boolean {
  try {
    return !!(target.getContext('webgl2') ?? target.getContext('webgl'));
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  if (!canvas || !uiRoot) {
    fatal('The page is missing its canvas or interface container.');
    return;
  }
  if (!supportsWebGL(canvas)) {
    fatal('This experience needs WebGL. Enable hardware acceleration, or try a different browser.');
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const qualityParam = params.get('quality');
  const quality: QualityLevel | undefined =
    qualityParam === 'low' || qualityParam === 'medium' || qualityParam === 'high' ? qualityParam : undefined;
  const headless = params.get('qa') === '1';

  const app = new App({ canvas, uiRoot, forceQuality: quality, headless });
  try {
    await app.boot();
  } catch (err) {
    fatal('The experience failed to initialise.', err);
    return;
  }

  // Handy for debugging from the console; the QA harness uses window.__starfall.
  (window as unknown as { __app?: App }).__app = app;
}

void main();
