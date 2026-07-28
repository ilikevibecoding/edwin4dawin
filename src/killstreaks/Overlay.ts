/**
 * The compositor layer both modal views are drawn on.
 *
 * Two of these views — the targeting tablet and the gunner's thermal sight — need
 * the same thing: the real rendered frame, recoloured to a single channel, with
 * its contrast crushed, scanlined, vignetted, and vector symbology drawn on top.
 *
 * The recolour is done in the compositor rather than in a shader on purpose. The
 * render system owns final presentation through `engine.renderHook`, and reaching
 * into someone else's post chain to add a pass would be a module boundary
 * violation for an effect that CSS does exactly: a solid colour layer with
 * `mix-blend-mode: color` takes its hue and saturation from itself and its
 * luminosity from the frame behind it, which is the definition of a monochrome
 * conversion. A second layer crushes contrast through `backdrop-filter`. Both are
 * GPU composites and cost nothing per frame.
 *
 * The layers are inserted into `#app` ahead of `#ui-root`, so their backdrop is the
 * game canvas and only the game canvas — the HUD sits at a higher z-index and is
 * left in full colour, which is correct: the tablet is a device the player is
 * holding, not a filter over their eyes.
 */

export interface CrtScreenOptions {
  id: string;
  /** CSS colour of the monochrome conversion layer. */
  tint: string;
  tintOpacity: number;
  /** `backdrop-filter` applied to the frame behind. */
  crush: string;
  /** Scanline pitch in CSS pixels; 0 disables them. */
  scanlinePitch?: number;
  /** Inset vignette strength, 0..1. */
  vignette?: number;
}

export class CrtScreen {
  /** Viewport size in CSS pixels. */
  cssWidth = 1;
  cssHeight = 1;
  /** Seconds the screen has been open, for animated symbology. */
  time = 0;

  private root: HTMLDivElement | null = null;
  private tint: HTMLDivElement | null = null;
  private crush: HTMLDivElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private open = false;
  private dpr = 1;

  constructor(private readonly options: CrtScreenOptions) {}

  get isOpen(): boolean {
    return this.open;
  }

  mount(): void {
    if (this.root) return;
    const host = document.getElementById('app') ?? document.body;
    const uiRoot = document.getElementById('ui-root');

    const layer = (id: string, z: number, css: string[]): HTMLDivElement => {
      const element = document.createElement('div');
      element.id = id;
      element.style.cssText = [
        'position:absolute',
        'inset:0',
        `z-index:${z}`,
        'pointer-events:none',
        'opacity:0',
        'transition:opacity 140ms linear',
        ...css,
      ].join(';');
      return element;
    };

    const crush = layer(`${this.options.id}-crush`, 3, [
      `backdrop-filter:${this.options.crush}`,
      `-webkit-backdrop-filter:${this.options.crush}`,
    ]);
    const tint = layer(`${this.options.id}-tint`, 4, [
      `background:${this.options.tint}`,
      'mix-blend-mode:color',
    ]);
    const root = layer(`${this.options.id}`, 6, []);

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    root.appendChild(canvas);

    const pitch = this.options.scanlinePitch ?? 3;
    const vignette = this.options.vignette ?? 0.72;
    if (pitch > 0 || vignette > 0) {
      const scan = document.createElement('div');
      const parts: string[] = ['position:absolute', 'inset:0', 'pointer-events:none'];
      if (pitch > 0) {
        parts.push(
          `background-image:repeating-linear-gradient(0deg,rgba(0,0,0,0.28) 0px,rgba(0,0,0,0.28) 1px,rgba(0,0,0,0) 1px,rgba(0,0,0,0) ${pitch}px)`,
        );
      }
      if (vignette > 0) {
        parts.push(`box-shadow:inset 0 0 220px 60px rgba(0,0,0,${vignette})`);
      }
      scan.style.cssText = parts.join(';');
      root.appendChild(scan);
    }

    if (uiRoot && uiRoot.parentElement === host) {
      host.insertBefore(crush, uiRoot);
      host.insertBefore(tint, uiRoot);
      host.insertBefore(root, uiRoot);
    } else {
      host.appendChild(crush);
      host.appendChild(tint);
      host.appendChild(root);
    }

    this.root = root;
    this.tint = tint;
    this.crush = crush;
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.resize();
  }

  unmount(): void {
    this.root?.remove();
    this.tint?.remove();
    this.crush?.remove();
    this.root = null;
    this.tint = null;
    this.crush = null;
    this.canvas = null;
    this.context = null;
    this.open = false;
  }

  setOpen(open: boolean): void {
    if (this.open === open) return;
    this.open = open;
    if (open) this.mount();
    if (this.root) this.root.style.opacity = open ? '1' : '0';
    if (this.tint) this.tint.style.opacity = open ? String(this.options.tintOpacity) : '0';
    if (this.crush) this.crush.style.opacity = open ? '1' : '0';
    if (open) {
      this.time = 0;
      this.resize();
    }
  }

  resize(): void {
    const canvas = this.canvas;
    if (!canvas) return;
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(width * this.dpr));
    const h = Math.max(1, Math.round(height * this.dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    this.cssWidth = width;
    this.cssHeight = height;
  }

  /**
   * Advances the clock, resizes, clears, and returns a context whose units are
   * CSS pixels. Null when the screen is closed, which is the caller's signal to
   * skip the frame entirely.
   */
  begin(dt: number): CanvasRenderingContext2D | null {
    const ctx = this.context;
    if (!ctx || !this.open) return null;
    this.time += dt;
    this.resize();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    return ctx;
  }
}
