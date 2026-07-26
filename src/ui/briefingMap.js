// Stylized tactical floor plan drawn on the briefing screen canvas.
// Glyph grammar matches the minimap (visual bible §6): insert = wedge,
// POI/hostage = 4-point star, exfil = diamond.

import { ROOMS, PLAYER_SPAWN, HOSTAGE_SPOTS, EXTRACTION, LEVELS } from '../world/map.js';

const INK = '#7fd2ff', DIM = 'rgba(127,210,255,0.34)', BG = '#08101a';
const AMBER = '#ffb454', GREEN = '#7dd87d', FAINT = 'rgba(157,180,198,0.85)';

export function drawBriefingMap(canvas) {
  const box = canvas.parentElement.getBoundingClientRect();
  const W = canvas.width = Math.max(320, box.width * (window.devicePixelRatio || 1));
  const H = canvas.height = Math.max(300, box.height * (window.devicePixelRatio || 1));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // blueprint grid
  ctx.strokeStyle = 'rgba(127,210,255,0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 26) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // heavier grid every 4 cells
  ctx.strokeStyle = 'rgba(127,210,255,0.09)';
  for (let x = 0; x < W; x += 104) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 104) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // fit ground floor (x 0..64, z 0..56)
  const pad = 40;
  const sc = Math.min((W - pad * 2) / 66, (H - pad * 2) / 58);
  const ox = (W - 64 * sc) / 2, oy = (H - 56 * sc) / 2;
  const X = (x) => ox + x * sc, Z = (z) => oy + z * sc;

  // basement silhouette (dashed amber — the exfil level below)
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(255,180,84,0.35)';
  ctx.lineWidth = 1.2;
  for (const r of ROOMS.filter((r) => r.level === 'b')) {
    for (const [x0, z0, x1, z1] of r.rects) ctx.strokeRect(X(x0), Z(z0), (x1 - x0) * sc, (z1 - z0) * sc);
  }
  ctx.setLineDash([]);

  // ground rooms — zone-tinted fills, hairline walls
  for (const r of ROOMS.filter((r) => r.level === 'g')) {
    for (const [x0, z0, x1, z1] of r.rects) {
      ctx.fillStyle = r.outdoor ? 'rgba(220,235,245,0.05)'
        : r.zone === 'exec' ? 'rgba(255,180,84,0.06)'
        : r.zone === 'server' ? 'rgba(127,210,255,0.12)'
        : r.zone === 'service' || r.zone === 'stair' ? 'rgba(127,210,255,0.045)'
        : 'rgba(127,210,255,0.07)';
      ctx.fillRect(X(x0), Z(z0), (x1 - x0) * sc, (z1 - z0) * sc);
      ctx.strokeStyle = DIM;
      ctx.lineWidth = 1.4;
      ctx.strokeRect(X(x0), Z(z0), (x1 - x0) * sc, (z1 - z0) * sc);
    }
  }

  // labels for key areas
  ctx.fillStyle = FAINT;
  ctx.font = `600 ${Math.max(8, 8.5 * sc / 6)}px monospace`;
  ctx.textAlign = 'center';
  const labels = [
    ['lobby', 'LOBBY'], ['cubicles', 'OFFICE FLOOR'], ['conference', 'CONFERENCE'],
    ['archive', 'ARCHIVE'], ['break_room', 'BREAK'], ['training', 'TRAINING'],
    ['plaza', 'ENTRY PLAZA'], ['server_room', 'SERVERS'], ['exec_office', 'EXEC'],
  ];
  for (const [id, txt] of labels) {
    const r = ROOMS.find((r) => r.id === id);
    const [x0, z0, x1, z1] = r.rects[0];
    ctx.fillText(txt, X((x0 + x1) / 2), Z((z0 + z1) / 2) + 3);
  }

  // ---- markers (shared glyph grammar) ----
  const label = (x, z, color, txt, below = false) => {
    ctx.fillStyle = color;
    ctx.font = '700 10px monospace';
    ctx.fillText(txt, X(x), Z(z) + (below ? 19 : -11));
  };
  const outline = () => { ctx.strokeStyle = 'rgba(5,10,16,0.9)'; ctx.lineWidth = 1.6; ctx.stroke(); };

  // insert: wedge (player glyph)
  {
    const x = X(PLAYER_SPAWN.x), z = Z(PLAYER_SPAWN.z);
    ctx.fillStyle = GREEN;
    ctx.beginPath();
    ctx.moveTo(x, z - 6.5); ctx.lineTo(x + 5, z + 5.5); ctx.lineTo(x, z + 2.5); ctx.lineTo(x - 5, z + 5.5);
    ctx.closePath(); ctx.fill(); outline();
    label(PLAYER_SPAWN.x, PLAYER_SPAWN.z, GREEN, 'INSERT');
  }
  // POIs: 4-point stars
  for (const h of HOSTAGE_SPOTS) {
    const x = X(h.x), z = Z(h.z), r = 6.5;
    ctx.fillStyle = AMBER;
    ctx.beginPath();
    ctx.moveTo(x, z - r);
    ctx.lineTo(x + r * 0.32, z - r * 0.32); ctx.lineTo(x + r, z); ctx.lineTo(x + r * 0.32, z + r * 0.32);
    ctx.lineTo(x, z + r); ctx.lineTo(x - r * 0.32, z + r * 0.32); ctx.lineTo(x - r, z); ctx.lineTo(x - r * 0.32, z - r * 0.32);
    ctx.closePath(); ctx.fill(); outline();
    label(h.x, h.z, AMBER, 'POI?');
  }
  // exfil: diamond (extraction color)
  {
    const x = X(EXTRACTION.x + 2), z = Z(EXTRACTION.z), r = 6.5;
    ctx.fillStyle = GREEN;
    ctx.beginPath();
    ctx.moveTo(x, z - r); ctx.lineTo(x + r * 0.72, z); ctx.lineTo(x, z + r); ctx.lineTo(x - r * 0.72, z);
    ctx.closePath(); ctx.fill(); outline();
    label(EXTRACTION.x + 2, EXTRACTION.z, GREEN, 'EXFIL (B1)', true);
  }

  // ---- compass: star-north emblem, north = up (toward z=0) ----
  {
    const cxp = W - 34, cyp = 34, r = 17;
    ctx.strokeStyle = 'rgba(127,210,255,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cxp, cyp, r, 0, Math.PI * 2); ctx.stroke();
    // cardinal ticks
    ctx.strokeStyle = 'rgba(127,210,255,0.55)';
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cxp + Math.sin(a) * (r - 3), cyp - Math.cos(a) * (r - 3));
      ctx.lineTo(cxp + Math.sin(a) * (r + 2), cyp - Math.cos(a) * (r + 2));
      ctx.stroke();
    }
    // elongated north limb star
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.moveTo(cxp, cyp - r + 2);
    ctx.lineTo(cxp + 3, cyp - 3); ctx.lineTo(cxp + 9, cyp); ctx.lineTo(cxp + 3, cyp + 3);
    ctx.lineTo(cxp, cyp + 9); ctx.lineTo(cxp - 3, cyp + 3); ctx.lineTo(cxp - 9, cyp); ctx.lineTo(cxp - 3, cyp - 3);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = INK;
    ctx.font = '700 11px monospace';
    ctx.fillText('N', cxp, cyp + r + 14);
  }

  // ---- scale bar (10 m) ----
  {
    const bx = 18, by = H - 20, len = 10 * sc;
    ctx.strokeStyle = FAINT;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(bx, by - 4); ctx.lineTo(bx, by); ctx.lineTo(bx + len, by); ctx.lineTo(bx + len, by - 4);
    ctx.stroke();
    ctx.fillStyle = FAINT;
    ctx.font = '600 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('10 m', bx + len / 2, by - 6);
  }

  // ---- legend (bottom-right) ----
  {
    ctx.textAlign = 'left';
    ctx.font = '600 9px monospace';
    const items = [[GREEN, 'INSERT / EXFIL'], [AMBER, 'POI — UNCONFIRMED'], ['rgba(255,180,84,0.6)', 'B1 (DASHED)']];
    let ly = H - 16 - (items.length - 1) * 15;
    for (const [color, txt] of items) {
      ctx.fillStyle = color;
      ctx.fillRect(W - 150, ly - 6, 7, 7);
      ctx.fillStyle = FAINT;
      ctx.fillText(txt, W - 138, ly + 1);
      ly += 15;
    }
    ctx.textAlign = 'center';
  }
}
