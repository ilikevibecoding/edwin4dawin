import { CanvasTexture, SRGBColorSpace } from 'three';
import { SEED, mulberry32 } from './seed.js';

const cache = new Map();

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function tex(c) {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

function panelBg(ctx, w, h, color = '#0b120e') {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#1c2a20';
  ctx.lineWidth = 4;
  ctx.strokeRect(3, 3, w - 6, h - 6);
}

export function makeSonarTexture() {
  const c = canvas(512, 512);
  const ctx = c.getContext('2d');
  const t = tex(c);
  t.userData = { canvas: c, ctx, sweep: 0.2, ping: 0 };
  drawSonar(t, 0);
  return t;
}

export function drawSonar(texture, time, ping = 0) {
  const ctx = texture.userData.ctx;
  const w = 512;
  const h = 512;
  ctx.fillStyle = '#06140c';
  ctx.fillRect(0, 0, w, h);
  const cx = 256;
  const cy = 256;
  ctx.strokeStyle = '#1a4a28';
  ctx.lineWidth = 1;
  for (let r = 40; r <= 230; r += 38) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let a = 0; a < 12; a++) {
    const ang = (a / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(ang) * 230, cy + Math.sin(ang) * 230);
    ctx.stroke();
  }
  ctx.fillStyle = '#6fbf7a';
  ctx.font = '12px monospace';
  ctx.fillText('ACTIVE SONAR  ·  3.5 kHz', 16, 22);
  ctx.fillText('RNG  4.0 km', 400, 22);
  ctx.fillText('NO CONTACT', 16, 496);

  const sweep = (time * 0.35) % (Math.PI * 2);
  const grad = ctx.createConicalGradient
    ? null
    : null;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(sweep);
  const g = ctx.createLinearGradient(0, 0, 180, 40);
  g.addColorStop(0, 'rgba(80, 200, 110, 0.0)');
  g.addColorStop(0.7, 'rgba(80, 200, 110, 0.08)');
  g.addColorStop(1, 'rgba(140, 230, 150, 0.45)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, 230, -0.18, 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  if (ping > 0) {
    ctx.strokeStyle = `rgba(160,240,170,${ping})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 40 + (1 - ping) * 200, 0, Math.PI * 2);
    ctx.stroke();
  }

  const rand = mulberry32(SEED + 9);
  ctx.fillStyle = 'rgba(90,190,110,0.35)';
  for (let i = 0; i < 6; i++) {
    const a = rand() * Math.PI * 2;
    const r = 50 + rand() * 160;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2 + rand() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  texture.needsUpdate = true;
}

export function makeNavMapTexture() {
  return cache.get('nav') || cache.set('nav', buildNav()).get('nav');
}

function buildNav() {
  const c = canvas(512, 384);
  const ctx = c.getContext('2d');
  panelBg(ctx, 512, 384, '#0a1218');
  ctx.strokeStyle = '#2a4a52';
  ctx.lineWidth = 1;
  for (let x = 24; x < 500; x += 28) {
    ctx.beginPath();
    ctx.moveTo(x, 28);
    ctx.lineTo(x, 360);
    ctx.stroke();
  }
  for (let y = 28; y < 370; y += 24) {
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(492, y);
    ctx.stroke();
  }
  ctx.strokeStyle = '#5aa8b0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, 220);
  ctx.bezierCurveTo(140, 160, 220, 250, 320, 180);
  ctx.bezierCurveTo(400, 130, 450, 200, 490, 170);
  ctx.stroke();
  ctx.fillStyle = '#8fd0d4';
  ctx.beginPath();
  ctx.arc(248, 198, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c8e8e4';
  ctx.font = '13px monospace';
  ctx.fillText('NAV CHART  ·  RV ARGENT  ·  SECTOR 14-C', 16, 20);
  ctx.fillText('HDG 247°   STN 0.4 kt   DPT 312 m', 16, 372);
  ctx.fillStyle = '#6aa0a4';
  ctx.fillText('RIDGE', 360, 120);
  ctx.fillText('BASIN', 80, 280);
  return tex(c);
}

export function makeDepthTexture() {
  const c = canvas(256, 512);
  const ctx = c.getContext('2d');
  panelBg(ctx, 256, 512, '#0c100c');
  ctx.fillStyle = '#6fbf7a';
  ctx.font = '14px monospace';
  ctx.fillText('DEPTH', 16, 28);
  ctx.font = '42px monospace';
  ctx.fillText('312.4', 16, 80);
  ctx.font = '14px monospace';
  ctx.fillText('METERS', 16, 108);
  ctx.strokeStyle = '#2a5a34';
  ctx.beginPath();
  ctx.moveTo(24, 140);
  for (let i = 0; i < 20; i++) {
    ctx.lineTo(24 + i * 10, 260 + Math.sin(i * 0.7) * 18 + i * 2);
  }
  ctx.stroke();
  ctx.fillStyle = '#8fd89a';
  ctx.fillText('KEEL  18.2 m', 16, 470);
  ctx.fillText('CEIL  +94 m', 16, 494);
  return tex(c);
}

export function makeHeadingTexture() {
  const c = canvas(512, 160);
  const ctx = c.getContext('2d');
  panelBg(ctx, 512, 160, '#10140e');
  ctx.fillStyle = '#d4a24a';
  ctx.font = '16px monospace';
  ctx.fillText('GYRO  247.3°', 16, 28);
  ctx.strokeStyle = '#8a7a40';
  ctx.beginPath();
  ctx.moveTo(20, 90);
  ctx.lineTo(492, 90);
  ctx.stroke();
  const ticks = ['N', '030', '060', 'E', '120', '150', 'S', '210', '240', 'W', '300', '330'];
  ctx.fillStyle = '#c8b56a';
  ctx.font = '12px monospace';
  for (let i = 0; i < ticks.length; i++) {
    const x = 30 + i * 40;
    ctx.fillRect(x, 78, 2, 14);
    ctx.fillText(ticks[i], x - 10, 70);
  }
  ctx.fillStyle = '#e8c86a';
  ctx.beginPath();
  ctx.moveTo(256, 100);
  ctx.lineTo(248, 128);
  ctx.lineTo(264, 128);
  ctx.fill();
  return tex(c);
}

export function makeStatusPanelTexture() {
  const c = canvas(384, 256);
  const ctx = c.getContext('2d');
  panelBg(ctx, 384, 256, '#0e120e');
  const rows = [
    ['HULL PRESS', 'NOMINAL', '#6fbf7a'],
    ['BATTERY', '86%', '#6fbf7a'],
    ['O2 SCRUB', 'OK', '#6fbf7a'],
    ['BALLAST', 'TRIMMED', '#d4a24a'],
    ['PROPULSION', 'AHEAD 1/3', '#6fbf7a'],
    ['COMMS', 'VLF STANDBY', '#5aa8b0'],
  ];
  ctx.font = '15px monospace';
  rows.forEach((row, i) => {
    ctx.fillStyle = '#8a9084';
    ctx.fillText(row[0], 16, 36 + i * 34);
    ctx.fillStyle = row[2];
    ctx.fillText(row[1], 200, 36 + i * 34);
  });
  return tex(c);
}

export function makeGaugeFace(label, max = 100, value = 42) {
  const key = `gf:${label}:${value}`;
  if (cache.has(key)) return cache.get(key);
  const c = canvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#161410';
  ctx.beginPath();
  ctx.arc(128, 128, 124, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8a8068';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = '#c8c0a8';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(a) * 96, 128 + Math.sin(a) * 96);
    ctx.lineTo(128 + Math.cos(a) * 112, 128 + Math.sin(a) * 112);
    ctx.stroke();
  }
  ctx.fillStyle = '#d8d0b8';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, 128, 188);
  ctx.font = '12px sans-serif';
  ctx.fillText(String(max), 190, 168);
  ctx.fillText('0', 70, 168);
  const t = tex(c);
  cache.set(key, t);
  return t;
}

export function makeMachineryPanelTexture(silent = false) {
  const c = canvas(384, 256);
  const ctx = c.getContext('2d');
  panelBg(ctx, 384, 256, silent ? '#140808' : '#100e0c');
  ctx.fillStyle = silent ? '#d46a4a' : '#d4a24a';
  ctx.font = '16px monospace';
  ctx.fillText(silent ? 'SILENT RUNNING' : 'PROPULSION CTRL', 16, 28);
  ctx.font = '14px monospace';
  ctx.fillStyle = silent ? '#c88870' : '#b8b09a';
  ctx.fillText(silent ? 'RPM  42   FANS HOLD' : 'RPM  180   FANS RUN', 16, 64);
  ctx.fillText(silent ? 'PUMPS  MIN' : 'PUMPS  NORMAL', 16, 92);
  ctx.fillText(silent ? 'WORKLIGHTS  DIM' : 'WORKLIGHTS  ON', 16, 120);
  ctx.fillText('SHAFT  SEAL OK', 16, 160);
  ctx.fillText('GEAR OIL  68°C', 16, 188);
  ctx.fillText('E: TOGGLE MODE', 16, 232);
  return tex(c);
}

export function makeCommTexture() {
  const c = canvas(256, 160);
  const ctx = c.getContext('2d');
  panelBg(ctx, 256, 160, '#0c1010');
  ctx.fillStyle = '#5aa8b0';
  ctx.font = '13px monospace';
  ctx.fillText('VLF  ·  CH-2', 12, 24);
  ctx.fillText('SYNC  18.4 kHz', 12, 48);
  ctx.fillStyle = '#3a686c';
  for (let i = 0; i < 24; i++) {
    const h = 8 + ((i * 17) % 40);
    ctx.fillRect(12 + i * 9, 130 - h, 6, h);
  }
  return tex(c);
}
