// Orbital beam (original superweapon event). (Foundation stub: schema + minimal deterministic behaviour;
// the full implementation replaces this file.)
import { Disaster } from './base.js';

export class OrbitalBeam extends Disaster {
  static type = 'beam';
  static label = 'Orbital Beam';
  static description = 'An orbital platform charges in the sky, then a giant energy beam descends and carves a crater.';
  static schema = [
    { key: 'target', label: 'Target (x, z)', type: 'position', default: [0, 0] },
    { key: 'beamRadius', label: 'Beam radius', type: 'number', min: 1, max: 14, step: 0.5, default: 5, unit: 'blocks' },
    { key: 'chargeTime', label: 'Charge time', type: 'number', min: 2, max: 40, step: 1, default: 10, unit: 's' },
    { key: 'strength', label: 'Impact strength', type: 'number', min: 0, max: 1, step: 0.05, default: 0.7 },
    { key: 'destructionRadius', label: 'Destruction radius', type: 'number', min: 3, max: 45, step: 1, default: 18, unit: 'blocks' },
    { key: 'duration', label: 'Beam duration', type: 'number', min: 3, max: 90, step: 1, default: 18, unit: 's' },
    { key: 'intensity', label: 'Intensity', type: 'number', min: 0, max: 1, step: 0.05, default: 0.7 },
  ];
  warnings() { return [`Vaporizes terrain and buildings within ${this.params.destructionRadius} blocks of (${this.params.target[0]}, ${this.params.target[1]}).`]; }
  simulate() { if (this.tick >= this.durationTicks + Math.round(this.params.chargeTime * 20)) this.done = true; }
}
