/**
 * UI cost readout.
 *
 * The render module has its own pipeline overlay; this one answers a different
 * question — what the HUD itself costs. Mean, 95th percentile and the worst
 * frame seen, because the three disagree: the mean is what the budget is spent
 * on, the percentile is what the player feels, and the peak is usually one
 * unlucky frame that says nothing about either.
 */
import { div, setClass, setText } from '../Dom';

/** Refresh rate of the readout itself. Any faster and it cannot be read. */
const INTERVAL = 0.25;
/**
 * Frames skipped before anything is recorded. The first UI frames build the
 * killfeed rows, the pip strip and the settings menu; folding those into a
 * steady-state cost reports a peak that never happens again.
 */
const WARMUP = 30;
/** Ring of recent frame costs, kept so the readout can quote a percentile. */
const RING = 512;

export class DebugReadout {
  readonly root: HTMLDivElement;

  private readonly costEl: HTMLElement;
  private readonly peakEl: HTMLElement;
  private readonly frameEl: HTMLElement;

  private readonly ring = new Float32Array(RING);
  private readonly scratch = new Float32Array(RING);
  private ringAt = 0;
  private ringLen = 0;
  private accum = 0;
  private samples = 0;
  private total = 0;
  private peak = 0;
  private warmup = 0;
  private visible = false;

  constructor(parent: HTMLElement) {
    this.root = div('ob-debug', parent);
    this.costEl = div(undefined, this.root);
    this.peakEl = div(undefined, this.root);
    this.frameEl = div(undefined, this.root);
    setText(this.costEl, 'ui —');
    setText(this.peakEl, 'peak —');
    setText(this.frameEl, 'fps —');
  }

  setVisible(visible: boolean): void {
    if (this.visible === visible) return;
    this.visible = visible;
    setClass(this.root, 'show', visible);
  }

  /** `ms` is the measured duration of this frame's UI work. */
  sample(ms: number, dt: number, fps: number): void {
    if (this.warmup < WARMUP) {
      this.warmup++;
      return;
    }
    this.total += ms;
    this.samples++;
    this.ring[this.ringAt] = ms;
    this.ringAt = (this.ringAt + 1) % RING;
    if (this.ringLen < RING) this.ringLen++;
    if (ms > this.peak) this.peak = ms;
    if (!this.visible) return;

    this.accum += dt;
    if (this.accum < INTERVAL) return;
    this.accum = 0;
    const mean = this.samples > 0 ? this.total / this.samples : 0;
    setText(this.costEl, `ui ${mean.toFixed(3)} ms avg`);
    setText(this.peakEl, `p95 ${this.p95Ms.toFixed(2)} · peak ${this.peak.toFixed(2)} ms`);
    setText(this.frameEl, `${Math.round(fps)} fps`);
    // The mean is a rolling one: an eternal average stops tracking reality once
    // the sample count is large.
    if (this.samples > 600) {
      this.total = mean * 120;
      this.samples = 120;
    }
  }

  /** Mean UI cost in milliseconds since the last reset. */
  get meanMs(): number {
    return this.samples > 0 ? this.total / this.samples : 0;
  }

  /** Frames folded into the mean, so a caller can tell "free" from "unmeasured". */
  get sampleCount(): number {
    return this.samples;
  }

  get peakMs(): number {
    return this.peak;
  }

  /**
   * 95th percentile of the last few hundred frames. A mean hides the frames the
   * player actually feels and an all-time peak is one unlucky garbage collection,
   * so this is the number worth quoting.
   */
  get p95Ms(): number {
    if (this.ringLen === 0) return 0;
    const sorted = this.scratch.subarray(0, this.ringLen);
    sorted.set(this.ring.subarray(0, this.ringLen));
    sorted.sort();
    return sorted[Math.min(this.ringLen - 1, Math.floor(this.ringLen * 0.95))];
  }

  reset(): void {
    this.total = 0;
    this.samples = 0;
    this.peak = 0;
    this.warmup = 0;
    this.ringAt = 0;
    this.ringLen = 0;
  }
}
