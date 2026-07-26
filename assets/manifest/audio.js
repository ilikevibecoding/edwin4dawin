// Audio assets (all runtime-synthesized) — owner: opus1 (system), fable4 (combat feel)
export const AUDIO_ASSETS = [
  {
    id: 'AUD-001', name: 'Synth sound bank v1 (weapons, steps, doors, glass, UI, mission)', category: 'audio', owner: 'opus1',
    files: ['src/core/sounds.js', 'src/core/audio.js'], rooms: ['*'],
    dimensions: 'n/a', pivot: 'n/a', materials: [], textures: [],
    collision: 'n/a', lod: 'n/a', animations: null,
    audio: ['~50 recipes: shot_*, step_*, door_*, glass_*, ui_*, mission_*'],
    status: 'integrated',
    acceptance: 'no visible action silent; positional attenuation + stereo pan',
    evidence: '(audible)', discrepancies: ['ambience beds (HVAC/wind/server) pending'],
  },
];
