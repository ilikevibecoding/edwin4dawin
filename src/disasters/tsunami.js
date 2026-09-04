// Tsunami / flood disaster. (Foundation stub: schema + minimal deterministic behaviour; the full
// implementation replaces this file.)
import { Disaster } from './base.js';

export class Tsunami extends Disaster {
  static type = 'tsunami';
  static label = 'Tsunami & Flood';
  static description = 'A wall of water rolls in from one side of the town, floods the streets and drags debris along.';
  static schema = [
    { key: 'waterHeight', label: 'Flood height (blocks above ground)', type: 'number', min: 1, max: 14, step: 1, default: 5, unit: 'blocks' },
    { key: 'waveHeight', label: 'Wave crest height', type: 'number', min: 1, max: 12, step: 1, default: 4, unit: 'blocks' },
    { key: 'direction', label: 'Direction (from)', type: 'select', options: ['west', 'east', 'north', 'south'], default: 'west' },
    { key: 'speed', label: 'Wave speed', type: 'number', min: 1, max: 20, step: 0.5, default: 6, unit: 'blocks/s' },
    { key: 'duration', label: 'Duration', type: 'number', min: 10, max: 240, step: 5, default: 60, unit: 's' },
    { key: 'damage', label: 'Structural damage', type: 'number', min: 0, max: 1, step: 0.05, default: 0.5 },
    { key: 'intensity', label: 'Intensity', type: 'number', min: 0, max: 1, step: 0.05, default: 0.7 },
    { key: 'center', label: 'Center (x, z)', type: 'position', default: [0, 0] },
    { key: 'radius', label: 'Affected radius', type: 'number', min: 20, max: 160, step: 5, default: 110, unit: 'blocks' },
  ];
  warnings() { return [`Floods everything within ${this.params.radius} blocks of (${this.params.center[0]}, ${this.params.center[1]}) up to ${this.params.waterHeight} blocks deep.`]; }
  simulate() { if (this.tick >= this.durationTicks) this.done = true; }
}
