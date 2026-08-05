/**
 * Story state.
 *
 * Everything the narrative can branch on lives here: named flags, numeric
 * relationship tracks, and the record of which nodes the playthrough actually
 * visited. The visit record is what the end-of-chapter flowchart is drawn from,
 * so nodes are declared up front with their place in the graph even when a
 * particular run never reaches them.
 */

export type FlagValue = boolean | number | string;

export interface FlowNode {
  id: string;
  label: string;
  /** Column in the flowchart; roughly "how far through the chapter". */
  column: number;
  /** Row within the column, for parallel branches. */
  row: number;
  /** Nodes this one can lead to. */
  next?: string[];
  /** Terminal nodes are drawn as outcomes. */
  outcome?: 'good' | 'bad' | 'neutral';
}

export interface ChapterFlow {
  id: string;
  title: string;
  nodes: FlowNode[];
}

export class StoryState {
  private flags = new Map<string, FlagValue>();
  private tracks = new Map<string, number>();
  private visited = new Set<string>();
  private order: string[] = [];

  /** Chapter results, in play order, for the final summary. */
  readonly results: { chapter: string; outcome: string; detail: string }[] = [];

  set(name: string, value: FlagValue = true): void {
    this.flags.set(name, value);
  }

  is(name: string): boolean {
    return Boolean(this.flags.get(name));
  }

  get(name: string, fallback: FlagValue = 0): FlagValue {
    return this.flags.get(name) ?? fallback;
  }

  /** Adjusts a relationship or pressure track, clamped to 0..100. */
  nudge(track: string, delta: number): number {
    const next = Math.max(0, Math.min(100, (this.tracks.get(track) ?? 50) + delta));
    this.tracks.set(track, next);
    return next;
  }

  track(name: string): number {
    return this.tracks.get(name) ?? 50;
  }

  setTrack(name: string, value: number): void {
    this.tracks.set(name, Math.max(0, Math.min(100, value)));
  }

  visit(node: string): void {
    if (!this.visited.has(node)) this.order.push(node);
    this.visited.add(node);
  }

  didVisit(node: string): boolean {
    return this.visited.has(node);
  }

  get path(): readonly string[] {
    return this.order;
  }

  recordChapter(chapter: string, outcome: string, detail: string): void {
    this.results.push({ chapter, outcome, detail });
  }

  snapshot(): Record<string, FlagValue> {
    return Object.fromEntries(this.flags);
  }
}
