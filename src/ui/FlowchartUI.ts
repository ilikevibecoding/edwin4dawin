/**
 * The end-of-chapter flowchart.
 *
 * Nodes are placed on the column/row grid the director hands us and joined by
 * real SVG bezier connectors: taken paths are solid accent and draw themselves
 * on, untaken paths stay dashed and dim. Dismissed with Enter / Space / Escape
 * or a click, and always resolves — there is an auto-dismiss for the
 * unattended auto-demo.
 */
import {
  UIClock,
  UIFader,
  uiCaptureKeys,
  uiEl,
  uiReducedMotion,
  uiSvg,
  type UIHandle,
} from './UIRoot';

export interface FlowNode {
  id: string;
  label: string;
  column: number;
  row: number;
  taken: boolean;
  ending?: boolean;
  missed?: boolean;
}

export interface FlowEdge {
  from: string;
  to: string;
  taken: boolean;
}

/** SVG user units. The whole chart is scaled to fit by the viewBox. */
const NODE_W = 132;
const NODE_H = 30;
const COL_STEP = 206;
const ROW_STEP = 56;
const PAD = 14;
/** Seconds before the chart dismisses itself when nobody is watching. */
const AUTO_DISMISS = 7;

interface Placed {
  node: FlowNode;
  x: number;
  y: number;
}

export class FlowchartUI {
  private readonly root: HTMLElement;
  private readonly clock = new UIClock();
  private readonly panel: HTMLElement;
  private readonly fader: UIFader;
  private readonly title: HTMLElement;
  private readonly body: HTMLElement;
  private readonly count: HTMLElement;

  private resolveShow: (() => void) | null = null;
  private releaseKeys: (() => void) | null = null;
  private autoTimer: UIHandle | null = null;
  private active = false;
  private disposed = false;

  constructor(parent: HTMLElement) {
    this.root = uiEl('div', 'dv-c dv-c-flow');
    this.panel = uiEl('div', 'dv-flow');

    const head = uiEl('div', 'dv-flow-head');
    this.title = uiEl('div', 'dv-flow-title');
    const legend = uiEl('div', 'dv-flow-legend dv-label');
    const takenKey = uiEl('span');
    takenKey.append(uiEl('i'), uiEl('span', '', 'Taken'));
    const missedKey = uiEl('span');
    missedKey.append(uiEl('i', 'dv-dash'), uiEl('span', '', 'Not taken'));
    legend.append(takenKey, missedKey);
    head.append(this.title, legend);

    this.body = uiEl('div', 'dv-flow-body');

    const foot = uiEl('div', 'dv-flow-foot');
    this.count = uiEl('div', 'dv-mono', '');
    foot.append(this.count, uiEl('div', 'dv-label', 'Enter — Continue'));

    this.panel.append(head, this.body, foot);
    this.root.appendChild(this.panel);
    parent.appendChild(this.root);
    this.fader = new UIFader(this.clock, this.panel);

    this.panel.addEventListener('click', this.onClick);
  }

  show(title: string, nodes: FlowNode[], edges: FlowEdge[]): Promise<void> {
    if (this.disposed) return Promise.resolve();

    // A new chart supersedes anything on screen.
    this.teardown();
    this.settle();
    this.clock.cancelAll();

    this.title.textContent = title;
    this.build(nodes ?? [], edges ?? []);

    const takenCount = (nodes ?? []).filter((n) => n.taken).length;
    this.count.textContent = `${String(takenCount).padStart(2, '0')} / ${String(
      (nodes ?? []).length,
    ).padStart(2, '0')} NODES`;

    this.active = true;
    this.panel.style.pointerEvents = 'auto';
    this.fader.reveal({ duration: 0.3 });
    this.releaseKeys = uiCaptureKeys({ down: (e) => this.onKey(e) });
    this.autoTimer = this.clock.after(AUTO_DISMISS, () => {
      this.autoTimer = null;
      this.hide();
    });

    return new Promise<void>((resolve) => {
      this.resolveShow = resolve;
    });
  }

  hide(): void {
    if (this.disposed) return;
    this.teardown();
    this.fader.fade(0.24);
    this.settle();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.teardown();
    this.settle();
    this.panel.removeEventListener('click', this.onClick);
    this.clock.dispose();
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
  }

  /* --- internals -------------------------------------------------------- */

  private build(nodes: FlowNode[], edges: FlowEdge[]): void {
    while (this.body.firstChild) this.body.removeChild(this.body.firstChild);

    const placed = new Map<string, Placed>();
    let maxCol = 0;
    let maxRow = 0;
    for (const node of nodes) {
      const column = Math.max(0, Math.round(node.column));
      const row = Math.max(0, Math.round(node.row));
      maxCol = Math.max(maxCol, column);
      maxRow = Math.max(maxRow, row);
      placed.set(node.id, {
        node,
        x: PAD + column * COL_STEP,
        y: PAD + row * ROW_STEP,
      });
    }

    const width = PAD * 2 + maxCol * COL_STEP + NODE_W;
    const height = PAD * 2 + maxRow * ROW_STEP + NODE_H + 12;

    const instant = uiReducedMotion();
    const svg = uiSvg('svg', 'dv-flow-svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // Edges first so nodes always sit on top of them.
    const edgeLayer = uiSvg('g', 'dv-edges');
    const nodeLayer = uiSvg('g', 'dv-nodes');
    svg.append(edgeLayer, nodeLayer);

    let takenIndex = 0;
    for (const edge of edges) {
      const from = placed.get(edge.from);
      const to = placed.get(edge.to);
      if (!from || !to) continue;
      const path = uiSvg('path', `dv-edge${edge.taken ? ' dv-edge-taken' : ''}`);
      path.setAttribute('d', connector(from, to));
      edgeLayer.appendChild(path);

      if (edge.taken) {
        // Draw the taken route on, staggered along the chain.
        const length = pathLength(path, from, to);
        path.style.strokeDasharray = length.toFixed(1);
        if (instant) {
          path.style.strokeDashoffset = '0';
        } else {
          path.style.strokeDashoffset = length.toFixed(1);
          const delay = 0.24 + takenIndex * 0.09;
          this.clock.after(delay, () => {
            this.clock.tween(0.4, (p) => {
              path.style.strokeDashoffset = (length * (1 - p)).toFixed(1);
            });
          });
        }
        takenIndex++;
      } else if (instant) {
        path.style.opacity = '0.9';
      } else {
        path.style.opacity = '0';
        this.clock.after(0.3, () => {
          this.clock.tween(0.35, (p) => {
            path.style.opacity = (p * 0.9).toFixed(3);
          });
        });
      }
    }

    const ordered = Array.from(placed.values()).sort(
      (a, b) => a.node.column - b.node.column || a.node.row - b.node.row,
    );
    ordered.forEach((item, i) => {
      const group = this.buildNode(item);
      nodeLayer.appendChild(group);
      if (instant) {
        group.style.opacity = '1';
        return;
      }
      group.style.opacity = '0';
      this.clock.after(0.1 + i * 0.05, () => {
        this.clock.tween(0.26, (p) => {
          group.style.opacity = p.toFixed(3);
        });
      });
    });

    this.body.appendChild(svg);
  }

  private buildNode(item: Placed): SVGGElement {
    const { node, x, y } = item;
    const classes = ['dv-node'];
    if (node.taken) classes.push('dv-node-taken');
    if (node.missed && !node.taken) classes.push('dv-node-missed');
    if (node.ending) classes.push('dv-node-ending');
    const group = uiSvg('g', classes.join(' '));

    const rect = uiSvg('rect');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', String(NODE_W));
    rect.setAttribute('height', String(NODE_H));
    group.appendChild(rect);

    // 1px bracket corners, the same motif as the DOM panels.
    if (node.taken) {
      const corner = uiSvg('path', 'dv-node-corner');
      const k = 5;
      corner.setAttribute(
        'd',
        `M ${x} ${y + k} L ${x} ${y} L ${x + k} ${y} M ${x + NODE_W - k} ${y + NODE_H} L ${
          x + NODE_W
        } ${y + NODE_H} L ${x + NODE_W} ${y + NODE_H - k}`,
      );
      group.appendChild(corner);
    }

    const lines = wrapLabel(node.label ?? '');
    const text = uiSvg('text');
    text.setAttribute('x', String(x + NODE_W / 2));
    text.setAttribute('y', String(y + (lines.length > 1 ? NODE_H / 2 - 2 : NODE_H / 2 + 4)));
    text.setAttribute('text-anchor', 'middle');
    lines.forEach((line, i) => {
      const span = uiSvg('tspan');
      span.setAttribute('x', String(x + NODE_W / 2));
      if (i > 0) span.setAttribute('dy', '12');
      span.textContent = line;
      text.appendChild(span);
    });
    group.appendChild(text);

    if (node.ending) {
      const tag = uiSvg('text', 'dv-node-tag');
      tag.setAttribute('x', String(x + NODE_W));
      tag.setAttribute('y', String(y + NODE_H + 9));
      tag.setAttribute('text-anchor', 'end');
      tag.textContent = node.taken ? 'ENDING \u25B8 REACHED' : 'ENDING';
      group.appendChild(tag);
    }

    return group;
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.active) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar' || e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.hide();
    }
  }

  private onClick = (): void => {
    if (!this.active) return;
    this.hide();
  };

  private teardown(): void {
    this.active = false;
    this.panel.style.pointerEvents = 'none';
    if (this.releaseKeys) {
      this.releaseKeys();
      this.releaseKeys = null;
    }
    if (this.autoTimer) {
      this.autoTimer.cancel();
      this.autoTimer = null;
    }
  }

  private settle(): void {
    const resolve = this.resolveShow;
    this.resolveShow = null;
    if (resolve) resolve();
  }
}

function connector(from: Placed, to: Placed): string {
  const x1 = from.x + NODE_W;
  const y1 = from.y + NODE_H / 2;
  const x2 = to.x;
  const y2 = to.y + NODE_H / 2;
  const dx = Math.max(30, Math.abs(x2 - x1) * 0.5);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

/** Real path length when the browser will give us one, else a safe estimate. */
function pathLength(path: SVGPathElement, from: Placed, to: Placed): number {
  try {
    const measured = path.getTotalLength();
    if (measured > 0 && Number.isFinite(measured)) return measured;
  } catch {
    /* geometry not available yet — fall through to the estimate */
  }
  const dx = Math.abs(to.x - (from.x + NODE_W));
  const dy = Math.abs(to.y - from.y);
  return Math.max(40, dx + dy);
}

/** Two lines maximum, broken on words, ellipsised if it still will not fit. */
function wrapLabel(label: string): string[] {
  const text = label.trim();
  const max = 17;
  if (text.length <= max) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max && current) {
      lines.push(current);
      current = word;
      if (lines.length === 2) break;
    } else {
      current = next;
    }
  }
  if (lines.length < 2 && current) lines.push(current);
  if (lines.length > 2) lines.length = 2;
  const last = lines[lines.length - 1] ?? '';
  if (lines.join(' ').length < text.length) {
    lines[lines.length - 1] = `${last.slice(0, max - 1)}\u2026`;
  }
  return lines;
}
