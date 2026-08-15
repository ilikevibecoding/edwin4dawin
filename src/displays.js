import { createScreenTexture, updateScreenTexture } from './textures.js';

function panelBg(ctx, s, tint = '#0a1610') {
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = 'rgba(80,140,90,0.25)';
  ctx.strokeRect(4, 4, s - 8, s - 8);
}

function readouts(ctx, lines, s, color = '#6fd08a') {
  ctx.fillStyle = color;
  ctx.font = `600 ${Math.floor(s * 0.055)}px monospace`;
  ctx.textAlign = 'left';
  lines.forEach((line, i) => {
    ctx.fillText(line, s * 0.08, s * 0.16 + i * s * 0.1);
  });
}

export function createSonarTexture() {
  return createScreenTexture((ctx, s, t) => {
    panelBg(ctx, s, '#07140f');
    ctx.save();
    ctx.translate(s / 2, s / 2 + s * 0.04);
    ctx.strokeStyle = 'rgba(70,180,110,0.28)';
    ctx.lineWidth = 1;
    for (let r = 0.12; r <= 0.4; r += 0.08) {
      ctx.beginPath();
      ctx.arc(0, 0, s * r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-s * 0.4, 0);
    ctx.lineTo(s * 0.4, 0);
    ctx.moveTo(0, -s * 0.4);
    ctx.lineTo(0, s * 0.4);
    ctx.stroke();
    const sweep = (t * 0.7) % (Math.PI * 2);
    const grad = ctx.createConicalGradient
      ? null
      : null;
    ctx.strokeStyle = 'rgba(120,230,150,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(sweep) * s * 0.4, Math.sin(sweep) * s * 0.4);
    ctx.stroke();
    const fade = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.4);
    fade.addColorStop(0, 'rgba(80,200,120,0.05)');
    fade.addColorStop(1, 'rgba(80,200,120,0)');
    ctx.fillStyle = fade;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, s * 0.4, sweep - 0.8, sweep);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8ee6a8';
    ctx.beginPath();
    ctx.arc(Math.cos(1.2) * s * 0.22, Math.sin(1.2) * s * 0.22, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#7dca92';
    ctx.font = `600 ${s * 0.045}px monospace`;
    ctx.fillText('ACTIVE SONAR  ·  7.4 kHz', s * 0.08, s * 0.08);
    ctx.fillText('RNG 2.0 km   HDG 247', s * 0.08, s * 0.94);
  }, 512);
}

export function createNavTexture() {
  return createScreenTexture((ctx, s, t) => {
    panelBg(ctx, s, '#0a1210');
    ctx.strokeStyle = 'rgba(90,160,110,0.3)';
    for (let i = 1; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(s * 0.1, s * (0.15 + i * 0.09));
      ctx.lineTo(s * 0.9, s * (0.15 + i * 0.09));
      ctx.stroke();
    }
    ctx.strokeStyle = '#6fd08a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s * 0.15, s * 0.72);
    for (let i = 0; i < 12; i++) {
      const x = s * (0.15 + i * 0.06);
      const y = s * (0.55 + Math.sin(i * 0.7 + t * 0.05) * 0.08 + i * 0.008);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = '#d0a040';
    ctx.beginPath();
    ctx.arc(s * 0.62, s * 0.48, 4, 0, Math.PI * 2);
    ctx.fill();
    readouts(ctx, ['NAV PLOT', 'LAT  14°22.1 N', 'LON  62°08.4 W', 'WAYPT  RIDGE-04'], s);
  }, 512);
}

export function createDepthTexture() {
  return createScreenTexture((ctx, s, t) => {
    panelBg(ctx, s, '#0c100c');
    const depth = 184.0 + Math.sin(t * 0.15) * 0.4;
    ctx.fillStyle = '#6fd08a';
    ctx.font = `700 ${s * 0.16}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(depth.toFixed(1), s / 2, s * 0.42);
    ctx.font = `600 ${s * 0.06}px monospace`;
    ctx.fillText('DEPTH  m', s / 2, s * 0.54);
    ctx.fillText(`RATE  ${(Math.sin(t * 0.15) * 0.06).toFixed(2)} m/s`, s / 2, s * 0.7);
    ctx.fillStyle = '#c4a032';
    ctx.fillText('CRUISE  ·  STABLE', s / 2, s * 0.84);
  }, 256);
}

export function createHeadingTexture() {
  return createScreenTexture((ctx, s, t) => {
    panelBg(ctx, s, '#10140e');
    const hdg = (247 + Math.sin(t * 0.08) * 0.8 + 360) % 360;
    ctx.fillStyle = '#d0a040';
    ctx.font = `700 ${s * 0.18}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(hdg.toFixed(0).padStart(3, '0'), s / 2, s * 0.46);
    ctx.font = `600 ${s * 0.055}px monospace`;
    ctx.fillStyle = '#8aaa70';
    ctx.fillText('HEADING', s / 2, s * 0.22);
    ctx.fillText('GYRO 1  ·  MAG OK', s / 2, s * 0.72);
    ctx.strokeStyle = '#6a8040';
    ctx.beginPath();
    ctx.moveTo(s * 0.2, s * 0.56);
    ctx.lineTo(s * 0.8, s * 0.56);
    ctx.stroke();
    ctx.fillStyle = '#d0a040';
    ctx.beginPath();
    ctx.moveTo(s / 2, s * 0.58);
    ctx.lineTo(s / 2 - 6, s * 0.64);
    ctx.lineTo(s / 2 + 6, s * 0.64);
    ctx.fill();
  }, 256);
}

export function createStatusTexture() {
  return createScreenTexture((ctx, s) => {
    panelBg(ctx, s, '#0e120e');
    readouts(ctx, [
      'BUS A     387 V',
      'BUS B     386 V',
      'O2        20.7%',
      'CO2       0.41%',
      'HULL      1.02',
      'TRIM      0.1°',
      'BALLAST   64%',
    ], s, '#7dca92');
  }, 256);
}

export function createPressureGraph() {
  return createScreenTexture((ctx, s, t) => {
    panelBg(ctx, s, '#0a1012');
    ctx.strokeStyle = '#3f9aa8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 40; i++) {
      const x = s * (0.1 + i / 40 * 0.8);
      const y = s * (0.55 + Math.sin(i * 0.35 + t * 0.4) * 0.12);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = '#3f9aa8';
    ctx.font = `600 ${s * 0.05}px monospace`;
    ctx.fillText('HYD PRESS  ·  MANIFOLD 2', s * 0.08, s * 0.12);
    ctx.fillText('18.4 BAR', s * 0.08, s * 0.9);
  }, 256);
}

export function createMachineryPanel() {
  return createScreenTexture((ctx, s) => {
    panelBg(ctx, s, '#120e0a');
    readouts(ctx, [
      'PROP MOTOR',
      'RPM    212',
      'TORQUE 64%',
      'TEMP   61 C',
      'GEAR   OK',
      'SHAFT  OK',
      'SILENT  STBY',
    ], s, '#d0a040');
  }, 256);
}

export function createMapTexture() {
  return createScreenTexture((ctx, s) => {
    ctx.fillStyle = '#c9b896';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#5a4a32';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(i * s * 0.1, 0);
      ctx.lineTo(i * s * 0.1, s);
      ctx.moveTo(0, i * s * 0.1);
      ctx.lineTo(s, i * s * 0.1);
      ctx.stroke();
    }
    ctx.strokeStyle = '#2a4a55';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(s * 0.1, s * 0.7);
    ctx.bezierCurveTo(s * 0.3, s * 0.2, s * 0.6, s * 0.8, s * 0.9, s * 0.35);
    ctx.stroke();
    ctx.fillStyle = '#8a2b22';
    ctx.beginPath();
    ctx.arc(s * 0.58, s * 0.52, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a2218';
    ctx.font = `700 ${s * 0.05}px sans-serif`;
    ctx.fillText('RIDGE TRANSECT 04', s * 0.08, s * 0.1);
    ctx.font = `${s * 0.04}px sans-serif`;
    ctx.fillText('ABYSSAL SURVEYOR', s * 0.08, s * 0.94);
  }, 512);
}

export function tickDisplays(textures, time) {
  for (const tex of textures) updateScreenTexture(tex, time);
}
