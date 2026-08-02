import { App } from './core/App';

/**
 * Entry point.
 *
 * Verifies WebGL 2, builds the app behind a real progress bar, runs a short
 * frame-time benchmark to suggest a quality tier, and installs a top-level
 * error boundary before anything else can throw.
 */

const canvas = document.getElementById('stage') as HTMLCanvasElement | null;
const uiRoot = document.getElementById('ui-root') as HTMLElement | null;

function fatal(message: string, detail = ''): void {
  const host = uiRoot ?? document.body;
  const panel = document.createElement('div');
  panel.id = 'error-boundary';
  panel.innerHTML = `
    <div class="error-panel">
      <h2>${message}</h2>
      <pre>${detail.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c] as string)}</pre>
      <p>This experience needs a browser with WebGL 2 and hardware acceleration enabled.</p>
    </div>`;
  host.append(panel);
}

if (!canvas || !uiRoot) {
  fatal('Could not find the viewport', 'index.html did not provide #stage and #ui-root.');
} else {
  const probe = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false });
  if (!probe) {
    fatal('WebGL 2 is not available', 'Enable hardware acceleration or try a different browser.');
  } else {
    // Release the probe context so the renderer can take the canvas.
    probe.getExtension('WEBGL_lose_context')?.loseContext();
    void bootstrap(canvas, uiRoot);
  }
}

async function bootstrap(canvas: HTMLCanvasElement, uiRoot: HTMLElement): Promise<void> {
  // A throwaway progress element so loading feedback exists before the UI does.
  const preload = document.createElement('div');
  preload.id = 'loading';
  preload.innerHTML = `
    <div class="load-inner">
      <div class="load-label" id="pre-label">Warming up</div>
      <div class="load-track"><div class="load-fill" id="pre-fill"></div></div>
      <div class="load-pct" id="pre-pct">0%</div>
    </div>`;
  uiRoot.append(preload);
  const preLabel = preload.querySelector('#pre-label') as HTMLElement;
  const preFill = preload.querySelector('#pre-fill') as HTMLElement;
  const prePct = preload.querySelector('#pre-pct') as HTMLElement;

  const setProgress = (label: string, t: number): void => {
    preLabel.textContent = label;
    const pct = Math.round(Math.max(0, Math.min(1, t)) * 100);
    preFill.style.width = `${pct}%`;
    prePct.textContent = `${pct}%`;
  };

  // Yield so the browser paints the loader before the heavy build begins.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  let app: App;
  try {
    app = new App(canvas, uiRoot, setProgress);
  } catch (err) {
    preload.remove();
    fatal('Failed to build the scene', err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err));
    return;
  }

  setProgress('Loading narration', 0.94);
  await app.narration.load((t) => setProgress('Loading narration', 0.94 + t * 0.05));

  preload.remove();
  app.ui.hideLoading();
  app.start();

  // --- startup benchmark ---------------------------------------------------
  const samples: number[] = [];
  let last = performance.now();
  let frames = 0;
  const sample = (): void => {
    const now = performance.now();
    const dt = (now - last) / 1000;
    last = now;
    if (frames > 4) samples.push(dt);
    frames++;
    if (frames < 34) requestAnimationFrame(sample);
    else {
      const result = app.runBenchmark(samples);
      const stored = localStorage.getItem('shadow-of-the-first-star:prefs:v1');
      // Only suggest; never override a tier the viewer has already chosen.
      if (!stored && result.suggestion !== 'medium') {
        app.applyQuality(result.suggestion);
        app.ui.showToast(
          `Detected ~${result.fps.toFixed(0)} fps — switched to ${result.suggestion} quality (change it any time)`,
          4200,
        );
      } else if (stored && result.fps < 22) {
        app.ui.showToast(`Running at ~${result.fps.toFixed(0)} fps — try lowering quality`, 4200);
      }
    }
  };
  requestAnimationFrame(sample);

  // --- QA bridge -----------------------------------------------------------
  (window as unknown as { __SW: unknown }).__SW = app.qaBridge();
  (window as unknown as { __SW_READY: boolean }).__SW_READY = true;
}
