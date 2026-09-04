// Tornado disaster. (Foundation stub: schema + minimal deterministic behaviour; the full implementation
// replaces this file.)
import { Disaster } from './base.js';

export class Tornado extends Disaster {
  static type = 'tornado';
  static label = 'Tornado';
  static description = 'A rotating funnel travels along a path, tearing up light structures and hurling debris, animals and people.';
  static schema = [
    { key: 'start', label: 'Spawn location (x, z)', type: 'position', default: [-90, 40] },
    { key: 'heading', label: 'Heading', type: 'angle', min: 0, max: 360, step: 5, default: 60, unit: 'deg' },
    { key: 'wander', label: 'Path wobble', type: 'number', min: 0, max: 1, step: 0.05, default: 0.35 },
    { key: 'radius', label: 'Funnel radius', type: 'number', min: 3, max: 25, step: 1, default: 9, unit: 'blocks' },
    { key: 'speed', label: 'Travel speed', type: 'number', min: 0, max: 12, step: 0.5, default: 3, unit: 'blocks/s' },
    { key: 'duration', label: 'Duration', type: 'number', min: 10, max: 240, step: 5, default: 75, unit: 's' },
    { key: 'intensity', label: 'Intensity', type: 'number', min: 0, max: 1, step: 0.05, default: 0.7 },
  ];
  warnings() { return [`Destroys light structures along its path (radius ${this.params.radius}) starting at (${this.params.start[0]}, ${this.params.start[1]}).`]; }
  simulate() { if (this.tick >= this.durationTicks) this.done = true; }
}
