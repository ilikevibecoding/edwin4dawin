/** Placeholder — replaced by the full game controller. */
import type { Engine } from '../app/engine';

export class Game {
  constructor(private engine: Engine, private params: URLSearchParams) {}
  async boot(): Promise<void> {
    void this.engine;
    void this.params;
    throw new Error('game controller not built yet');
  }
}
