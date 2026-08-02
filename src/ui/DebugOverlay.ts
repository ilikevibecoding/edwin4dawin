import type { SanityReport } from '../qa/SanityChecks';

export interface DebugSnapshot {
  chapter: string;
  chapterIndex: number;
  beat: string;
  shotId: string;
  shotLabel: string;
  scene: string;
  time: number;
  duration: number;
  fps: number;
  frameMs: number;
  drawCalls: number;
  triangles: number;
  programs: number;
  pixelRatio: number;
  quality: string;
  mode: string;
  narration: string;
  subtitle: string;
  audio: string;
  audioPeak: number;
  limiterReduction: number;
  cameraPos: string;
  particles: string;
  sanity: SanityReport | null;
}

/**
 * Developer overlay: camera name, chapter, timeline time, current beat, plus
 * the live results of the runtime sanity checks. Hidden by default; toggled
 * with the backtick key or from the settings panel.
 */
export class DebugOverlay {
  readonly element: HTMLPreElement;
  private visible = false;

  constructor(parent: HTMLElement) {
    this.element = document.createElement('pre');
    this.element.className = 'debug hidden';
    parent.appendChild(this.element);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.element.classList.toggle('hidden', !visible);
  }

  get isVisible(): boolean {
    return this.visible;
  }

  toggle(): boolean {
    this.setVisible(!this.visible);
    return this.visible;
  }

  update(s: DebugSnapshot): void {
    if (!this.visible) return;
    const fpsClass = s.fps < 24 ? 'bad' : s.fps < 45 ? 'warn' : '';
    const issues = s.sanity?.issues ?? [];
    const lines: string[] = [
      `CHAPTER   ${s.chapterIndex + 1}/8  ${s.chapter}`,
      `BEAT      ${s.beat}`,
      `SHOT      ${s.shotId}  "${s.shotLabel}"`,
      `SCENE     ${s.scene}   MODE ${s.mode}`,
      `TIME      ${s.time.toFixed(2)} / ${s.duration.toFixed(0)}s`,
      `CAMERA    ${s.cameraPos}`,
      '',
      `FPS       ${s.fps.toFixed(1)} (${s.frameMs.toFixed(1)} ms)`,
      `DRAWS     ${s.drawCalls}   TRIS ${(s.triangles / 1000).toFixed(0)}k   PROG ${s.programs}`,
      `QUALITY   ${s.quality}   DPR ${s.pixelRatio.toFixed(2)}`,
      `PARTICLES ${s.particles}`,
      '',
      `AUDIO     ${s.audio}  peak ${s.audioPeak.toFixed(2)}  lim ${s.limiterReduction.toFixed(1)}dB`,
      `NARRATION ${s.narration}`,
      `SUBTITLE  ${s.subtitle.slice(0, 46)}${s.subtitle.length > 46 ? '…' : ''}`,
      '',
      `SANITY    ${issues.length === 0 ? 'all checks pass' : `${issues.length} issue(s)`}`,
    ];
    for (const issue of issues.slice(0, 8)) lines.push(`  ${issue.severity === 'error' ? '✖' : '▲'} ${issue.message}`);

    this.element.innerHTML = lines
      .map((line) => {
        if (line.startsWith('  ✖')) return `<span class="bad">${escapeHtml(line)}</span>`;
        if (line.startsWith('  ▲')) return `<span class="warn">${escapeHtml(line)}</span>`;
        if (line.startsWith('FPS') && fpsClass) return `<span class="${fpsClass}">${escapeHtml(line)}</span>`;
        return escapeHtml(line);
      })
      .join('\n');
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] ?? c));
}
