// UI assets — owner: fable1
export const UI_ASSETS = [
  {
    id: 'UI-001', name: 'Screen system (title/settings/controls/difficulty/briefing/loadout/loading/pause/results)', category: 'ui', owner: 'fable1',
    files: ['src/ui/menus.js', 'src/ui/style.css'], rooms: ['(modes)'],
    dimensions: 'resolution-independent', pivot: 'n/a', materials: ['CSS'], textures: [],
    collision: 'n/a', lod: 'n/a', animations: ['hover/confirm states'], audio: ['ui_click', 'ui_hover', 'ui_confirm', 'ui_back'],
    status: 'integrated', acceptance: 'complete flow, no dead ends, restart confirmations', evidence: 'artifacts/p1_title.png', discrepancies: [],
  },
  {
    id: 'UI-002', name: 'HUD (crosshair/vitals/ammo/mission/minimap/prompts/subtitles/damage feedback)', category: 'ui', owner: 'fable1',
    files: ['src/ui/hud.js'], rooms: ['(playing)'],
    dimensions: 'resolution-independent', pivot: 'n/a', materials: ['CSS + 2D canvas'], textures: [],
    collision: 'n/a', lod: 'n/a', animations: ['hitmarker', 'damage arcs', 'announce'], audio: [],
    status: 'integrated', acceptance: 'minimal during play; readable 1080p–4K', evidence: 'artifacts/p2_lobby.png', discrepancies: [],
  },
  {
    id: 'UI-003', name: 'Weapon silhouette icon set (7 originals)', category: 'ui', owner: 'fable1',
    files: ['src/ui/weaponIcons.js'], rooms: ['loadout', 'hud'],
    dimensions: '240×80 viewBox', pivot: 'n/a', materials: ['SVG'], textures: [],
    collision: 'n/a', lod: 'n/a', animations: null, audio: null,
    status: 'integrated', acceptance: 'original shapes, readable at card size', evidence: '', discrepancies: [],
  },
  {
    id: 'UI-004', name: 'Briefing tactical floor plan', category: 'ui', owner: 'fable1',
    files: ['src/ui/briefingMap.js'], rooms: ['briefing'],
    dimensions: 'canvas', pivot: 'n/a', materials: ['2D canvas'], textures: [],
    collision: 'n/a', lod: 'n/a', animations: null, audio: null,
    status: 'integrated', acceptance: 'matches map data; markers for insert/POI/exfil', evidence: '', discrepancies: [],
  },
];
