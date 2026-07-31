/**
 * On-screen renderer diagnostics, toggled with F3.
 *
 * A DOM overlay rather than a canvas HUD: it must be readable even when the
 * pipeline itself is what is broken, and it must not add draw calls to the very
 * counter it is reporting.
 */

export interface DebugStats {
  fps: number;
  frameMs: number;
  cpuMs: number;
  width: number;
  height: number;
  dpr: number;
  drawCalls: number;
  triangles: number;
  programs: number;
  geometries: number;
  textures: number;
  blits: number;
  megaPixels: number;
  targetBytes: number;
  shadowBytes: number;
  cascades: number;
  cascadeShader: boolean;
  dynamicLights: number;
  maxDynamicLights: number;
  exposureMode: string;
  timeOfDay: number;
  passes: readonly string[];
  tier: string;
}

const STYLE = [
  'position:fixed',
  'top:8px',
  'left:8px',
  'z-index:2147483000',
  'padding:8px 11px',
  'font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
  'color:#d7e2ec',
  'background:rgba(6,10,14,0.78)',
  'border:1px solid rgba(120,160,200,0.28)',
  'border-radius:4px',
  'white-space:pre',
  'pointer-events:none',
  'text-shadow:0 1px 2px rgba(0,0,0,0.9)',
  'backdrop-filter:blur(3px)',
  'max-width:340px',
].join(';');

export class DebugOverlay {
  private element: HTMLDivElement | null = null;
  private visible = false;
  private accumulator = 0;

  get isVisible(): boolean {
    return this.visible;
  }

  toggle(): void {
    this.setVisible(!this.visible);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    if (visible) {
      this.ensureElement().style.display = 'block';
      this.accumulator = 1;
    } else if (this.element) {
      this.element.style.display = 'none';
    }
  }

  private ensureElement(): HTMLDivElement {
    if (!this.element) {
      const el = document.createElement('div');
      el.id = 'ob-render-debug';
      el.setAttribute('style', STYLE);
      document.body.appendChild(el);
      this.element = el;
    }
    return this.element;
  }

  /** Refreshed a few times a second; per-frame DOM writes would cost more than the pipeline. */
  update(dt: number, stats: DebugStats): void {
    if (!this.visible) return;
    this.accumulator += dt;
    if (this.accumulator < 0.2) return;
    this.accumulator = 0;
    this.ensureElement().textContent = format(stats);
  }

  dispose(): void {
    this.element?.remove();
    this.element = null;
    this.visible = false;
  }
}

function mb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function format(s: DebugStats): string {
  const lines: string[] = [];
  lines.push(`OPERATION BLACKOUT — render [${s.tier}]`);
  lines.push(
    `${s.fps.toFixed(0)} fps   frame ${s.frameMs.toFixed(2)} ms   cpu ${s.cpuMs.toFixed(2)} ms`,
  );
  lines.push(
    `${s.width}x${s.height} @ ${s.dpr.toFixed(2)}   ${((s.width * s.height) / 1e6).toFixed(2)} MP`,
  );
  lines.push('');
  lines.push(`draw calls ${s.drawCalls}   tris ${formatCount(s.triangles)}`);
  lines.push(`programs ${s.programs}   geom ${s.geometries}   tex ${s.textures}`);
  lines.push(`post blits ${s.blits}   fill ${s.megaPixels.toFixed(1)} MP`);
  lines.push('');
  lines.push(`rt memory     ${mb(s.targetBytes)}`);
  lines.push(`shadow memory ${mb(s.shadowBytes)}`);
  lines.push(
    `cascades ${s.cascades}${s.cascadeShader ? ' (patched)' : ' (single)'}   lights ${s.dynamicLights}/${s.maxDynamicLights}`,
  );
  lines.push(`exposure ${s.exposureMode}   tod ${s.timeOfDay.toFixed(3)}`);
  lines.push('');
  lines.push(`passes (${s.passes.length}):`);
  lines.push(wrap(s.passes.join(' > '), 40));
  return lines.join('\n');
}

function formatCount(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return String(n);
}

function wrap(text: string, width: number): string {
  const out: string[] = [];
  let line = '  ';
  for (const word of text.split(' ')) {
    if (line.length + word.length + 1 > width) {
      out.push(line);
      line = '  ';
    }
    line += line === '  ' ? word : ` ${word}`;
  }
  if (line.trim().length > 0) out.push(line);
  return out.join('\n');
}
