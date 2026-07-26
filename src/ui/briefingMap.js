// Stylized tactical floor plan drawn on the briefing screen canvas.

import { ROOMS, PLAYER_SPAWN, HOSTAGE_SPOTS, EXTRACTION, LEVELS } from '../world/map.js';

const INK = '#7fd2ff', DIM = 'rgba(127,210,255,0.34)', BG = '#08101a';

export function drawBriefingMap(canvas) {
  const box = canvas.parentElement.getBoundingClientRect();
  const W = canvas.width = Math.max(320, box.width * (window.devicePixelRatio || 1));
  const H = canvas.height = Math.max(300, box.height * (window.devicePixelRatio || 1));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // grid
  ctx.strokeStyle = 'rgba(127,210,255,0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 26) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // fit ground floor (x 0..64, z 0..56)
  const pad = 34;
  const sc = Math.min((W - pad * 2) / 66, (H - pad * 2) / 58);
  const ox = (W - 64 * sc) / 2, oy = (H - 56 * sc) / 2;
  const X = (x) => ox + x * sc, Z = (z) => oy + z * sc;

  // basement silhouette (dashed)
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(255,180,84,0.4)';
  ctx.lineWidth = 1.2;
  for (const r of ROOMS.filter((r) => r.level === 'b')) {
    for (const [x0, z0, x1, z1] of r.rects) ctx.strokeRect(X(x0), Z(z0), (x1 - x0) * sc, (z1 - z0) * sc);
  }
  ctx.setLineDash([]);

  // ground rooms
  for (const r of ROOMS.filter((r) => r.level === 'g')) {
    for (const [x0, z0, x1, z1] of r.rects) {
      ctx.fillStyle = r.outdoor ? 'rgba(220,235,245,0.05)' : 'rgba(127,210,255,0.07)';
      ctx.fillRect(X(x0), Z(z0), (x1 - x0) * sc, (z1 - z0) * sc);
      ctx.strokeStyle = DIM;
      ctx.lineWidth = 1.4;
      ctx.strokeRect(X(x0), Z(z0), (x1 - x0) * sc, (z1 - z0) * sc);
    }
  }

  // labels for key areas
  ctx.fillStyle = 'rgba(157,180,198,0.85)';
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

  // markers
  const marker = (x, z, color, label) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(X(x), Z(z), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(5,10,16,0.9)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = '700 10px monospace';
    ctx.fillText(label, X(x), Z(z) - 9);
  };
  marker(PLAYER_SPAWN.x, PLAYER_SPAWN.z, '#7dd87d', 'INSERT');
  for (const h of HOSTAGE_SPOTS) marker(h.x, h.z, '#ffb454', 'POI?');
  marker(EXTRACTION.x + 2, EXTRACTION.z, '#ff5a4e', 'EXFIL (B1)');

  // compass: north = up (toward z=0)
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(W - 30, 44); ctx.lineTo(W - 30, 20);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W - 30, 16); ctx.lineTo(W - 35, 26); ctx.lineTo(W - 25, 26);
  ctx.closePath(); ctx.fill();
  ctx.font = '700 11px monospace';
  ctx.fillText('N', W - 30, 58);
}
