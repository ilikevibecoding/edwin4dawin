import * as THREE from 'three';
import { makeCanvas, toTexture, rr } from './gen';
import { hash2 } from '../../core/rng';
import { registerAsset } from '../registry';

/**
 * Signage, screens & storytelling textures (Fable 3 / Fable 1).
 * All text and branding original: Norrsken Dynamics, Kestrel Cell, Vektra Arms.
 */

registerAsset({
  id: 'signage.suite',
  name: 'Signage & screen suite (logo, dept signs, posters, notices, screens, labels)',
  category: 'signage',
  agent: 'Fable 3',
  files: 'src/assets/textures/signage.ts',
  where: 'all rooms',
  dims: 'various plates 0.2–2.4 m',
  materials: 'emissive screens, matte prints, brushed plates',
  textures: 'procedural canvas',
  collision: 'none',
  lod: 'merged-static',
  status: 'integrated',
  accept: 'legible at intended distance; abstracted where decorative; 100% original text/marks',
});

const cache = new Map<string, THREE.Texture>();

function cached(key: string, make: () => THREE.Texture): THREE.Texture {
  let t = cache.get(key);
  if (!t) {
    t = make();
    cache.set(key, t);
  }
  return t;
}

export function norrskenLogo(size = 256, dark = false): THREE.Texture {
  return cached(`logo${size}${dark}`, () => {
    const { canvas, ctx } = makeCanvas(size);
    ctx.clearRect(0, 0, size, size);
    const c = size / 2;
    ctx.strokeStyle = dark ? '#1c2a33' : '#dff0f4';
    ctx.lineWidth = size * 0.02;
    ctx.beginPath();
    ctx.arc(c, c, size * 0.42, 0, Math.PI * 2);
    ctx.stroke();
    // eight-point star
    ctx.fillStyle = dark ? '#1c2a33' : '#dff0f4';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const len = i % 2 === 0 ? 0.4 : 0.26;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a) * size * len, c + Math.sin(a) * size * len);
      ctx.lineTo(c + Math.cos(a + 0.35) * size * 0.07, c + Math.sin(a + 0.35) * size * 0.07);
      ctx.lineTo(c + Math.cos(a - 0.35) * size * 0.07, c + Math.sin(a - 0.35) * size * 0.07);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = dark ? '#2e7d84' : '#37d0e6';
    ctx.beginPath();
    ctx.arc(c, c, size * 0.055, 0, Math.PI * 2);
    ctx.fill();
    return toTexture(canvas, { repeat: false });
  });
}

/** brand wall panel: logo + wordmark on painted panel */
export function brandWall(w = 1024, h = 512): THREE.Texture {
  return cached('brandwall', () => {
    const { canvas, ctx } = makeCanvas(w, h);
    ctx.fillStyle = '#24444b';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i < 60; i++) ctx.fillRect(hash2(i, 3) * w, hash2(i, 4) * h, 60, 1.5);
    const logo = norrskenLogo(256);
    ctx.drawImage(logo.image as HTMLCanvasElement, w * 0.5 - 210, h * 0.5 - 128, 170, 170);
    ctx.fillStyle = '#e8f4f6';
    ctx.font = `300 ${h * 0.17}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('NORRSKEN', w * 0.5, h * 0.44);
    ctx.font = `600 ${h * 0.085}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = '#7fd4de';
    ctx.fillText('D Y N A M I C S', w * 0.5 + 4, h * 0.60);
    return toTexture(canvas, { repeat: false });
  });
}

export function deptSign(text: string, sub = ''): THREE.Texture {
  return cached(`dept:${text}:${sub}`, () => {
    const { canvas, ctx } = makeCanvas(512, 128);
    ctx.fillStyle = '#2c3438';
    rr(ctx, 2, 2, 508, 124, 10);
    ctx.fill();
    ctx.strokeStyle = '#5a6a70';
    ctx.lineWidth = 2;
    rr(ctx, 4, 4, 504, 120, 9);
    ctx.stroke();
    ctx.fillStyle = '#e6eef0';
    ctx.font = `600 ${sub ? 44 : 52}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.toUpperCase(), 26, sub ? 46 : 64);
    if (sub) {
      ctx.font = `400 26px 'Segoe UI', sans-serif`;
      ctx.fillStyle = '#8fb4ba';
      ctx.fillText(sub, 26, 92);
    }
    // teal accent bar
    ctx.fillStyle = '#37d0e6';
    ctx.fillRect(8, 14, 6, 100);
    return toTexture(canvas, { repeat: false });
  });
}

export function exitSign(): THREE.Texture {
  return cached('exit', () => {
    const { canvas, ctx } = makeCanvas(256, 128);
    ctx.fillStyle = '#0d1a10';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#48ff7a';
    ctx.font = `800 86px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', 128, 68);
    return toTexture(canvas, { repeat: false });
  });
}

export function poster(kind: 'safety' | 'evac' | 'notice' | 'motivation' | 'wanted'): THREE.Texture {
  return cached(`poster:${kind}`, () => {
    const { canvas, ctx } = makeCanvas(256, 384);
    const bg: Record<string, string> = {
      safety: '#e8ded2', evac: '#e2e8ec', notice: '#f0ece0', motivation: '#22333c', wanted: '#efe8dc',
    };
    ctx.fillStyle = bg[kind];
    ctx.fillRect(0, 0, 256, 384);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.strokeRect(3, 3, 250, 378);
    const lines = (n: number, y0: number, c: string): void => {
      ctx.fillStyle = c;
      for (let i = 0; i < n; i++) {
        const w = 170 + hash2(i, 9) * 60;
        ctx.fillRect(24, y0 + i * 16, w * (0.5 + hash2(i, 2) * 0.5), 6);
      }
    };
    ctx.textAlign = 'left';
    if (kind === 'safety') {
      ctx.fillStyle = '#c8402e';
      ctx.fillRect(0, 0, 256, 64);
      ctx.fillStyle = '#fff';
      ctx.font = `800 30px 'Segoe UI', sans-serif`;
      ctx.fillText('SAFETY FIRST', 22, 42);
      ctx.strokeStyle = '#c8402e';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(128, 110);
      ctx.lineTo(180, 200);
      ctx.lineTo(76, 200);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = '#c8402e';
      ctx.font = `800 44px sans-serif`;
      ctx.fillText('!', 120, 190);
      lines(7, 240, 'rgba(40,40,40,0.65)');
    } else if (kind === 'evac') {
      ctx.fillStyle = '#2c5c34';
      ctx.fillRect(0, 0, 256, 52);
      ctx.fillStyle = '#fff';
      ctx.font = `700 26px 'Segoe UI', sans-serif`;
      ctx.fillText('EVACUATION PLAN', 20, 35);
      // mini floor plan
      ctx.strokeStyle = '#44505a';
      ctx.lineWidth = 2;
      ctx.strokeRect(30, 80, 196, 180);
      ctx.strokeRect(30, 80, 90, 70);
      ctx.strokeRect(150, 80, 76, 100);
      ctx.strokeRect(30, 190, 120, 70);
      ctx.fillStyle = '#3fae6a';
      ctx.fillRect(120, 250, 30, 10);
      ctx.fillStyle = '#c8402e';
      ctx.beginPath();
      ctx.arc(70, 120, 6, 0, Math.PI * 2);
      ctx.fill();
      lines(4, 290, 'rgba(40,40,40,0.6)');
    } else if (kind === 'motivation') {
      ctx.fillStyle = '#37d0e6';
      ctx.font = `300 40px 'Segoe UI', sans-serif`;
      ctx.fillText('MAP THE', 30, 150);
      ctx.fillText('NORTH', 30, 196);
      ctx.fillStyle = '#e8f4f6';
      ctx.font = `600 16px 'Segoe UI', sans-serif`;
      ctx.fillText('NORRSKEN GEODATA SUMMIT', 30, 240);
      const logo = norrskenLogo(256);
      ctx.drawImage(logo.image as HTMLCanvasElement, 150, 280, 80, 80);
    } else {
      ctx.fillStyle = '#3a4148';
      ctx.font = `700 24px 'Segoe UI', sans-serif`;
      ctx.fillText(kind === 'wanted' ? 'REMINDER' : 'NOTICE', 22, 44);
      lines(12, 80, 'rgba(40,40,40,0.55)');
      ctx.fillStyle = '#c8402e';
      ctx.fillRect(22, 300, 120, 8);
      lines(3, 330, 'rgba(40,40,40,0.4)');
    }
    return toTexture(canvas, { repeat: false });
  });
}

export type ScreenKind = 'spreadsheet' | 'code' | 'map' | 'security' | 'logo' | 'off' | 'server-status' | 'alert';

export function screen(kind: ScreenKind): THREE.Texture {
  return cached(`screen:${kind}`, () => {
    const { canvas, ctx } = makeCanvas(256, 160);
    if (kind === 'off') {
      ctx.fillStyle = '#0a0c0e';
      ctx.fillRect(0, 0, 256, 160);
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(0, 0, 256, 60);
      return toTexture(canvas, { repeat: false });
    }
    ctx.fillStyle = kind === 'alert' ? '#2a0f0c' : '#101820';
    ctx.fillRect(0, 0, 256, 160);
    if (kind === 'spreadsheet') {
      ctx.fillStyle = '#1a2836';
      ctx.fillRect(0, 0, 256, 18);
      ctx.strokeStyle = 'rgba(120,160,200,0.25)';
      for (let x = 0; x < 256; x += 36) {
        ctx.beginPath(); ctx.moveTo(x, 18); ctx.lineTo(x, 160); ctx.stroke();
      }
      for (let y = 18; y < 160; y += 14) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(160,200,230,0.7)';
      for (let i = 0; i < 40; i++) {
        ctx.fillRect(4 + (i % 7) * 36, 22 + Math.floor(i / 7) * 14, 20 + hash2(i, 5) * 8, 6);
      }
      ctx.fillStyle = 'rgba(90,208,142,0.8)';
      ctx.fillRect(148, 60, 24, 6);
    } else if (kind === 'code') {
      for (let i = 0; i < 16; i++) {
        const colors = ['rgba(120,200,235,0.8)', 'rgba(230,182,76,0.8)', 'rgba(150,160,175,0.8)', 'rgba(90,208,142,0.8)'];
        ctx.fillStyle = colors[Math.floor(hash2(i, 8) * 4)];
        ctx.fillRect(10 + hash2(i, 3) * 30, 10 + i * 9, 40 + hash2(i, 5) * 140, 4);
      }
    } else if (kind === 'map') {
      ctx.strokeStyle = 'rgba(80,180,220,0.6)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 20 + i * 18 + hash2(i, 2) * 10);
        for (let x = 0; x <= 256; x += 32) {
          ctx.lineTo(x, 20 + i * 18 + hash2(i + x, 3) * 14);
        }
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(230,182,76,0.9)';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(30 + hash2(i, 6) * 200, 30 + hash2(i, 7) * 100, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (kind === 'security') {
      for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
        const x = sx * 128, y = sy * 80;
        ctx.fillStyle = `rgba(${60 + hash2(sx, sy) * 30},${70 + hash2(sx, sy + 2) * 30},${78},1)`;
        ctx.fillRect(x + 2, y + 2, 124, 76);
        ctx.fillStyle = 'rgba(20,26,30,0.8)';
        ctx.fillRect(x + 2, y + 2, 124, 12);
        ctx.fillStyle = '#9fe0ea';
        ctx.font = '8px monospace';
        ctx.fillText(`CAM 0${sy * 2 + sx + 1} — ${['LOBBY', 'GARAGE', 'CORR-N', 'SRV'][sy * 2 + sx]}`, x + 6, y + 11);
        // simple room wireframe
        ctx.strokeStyle = 'rgba(190,220,235,0.4)';
        ctx.strokeRect(x + 18, y + 24, 90, 46);
        ctx.strokeRect(x + 18, y + 24, 40, 22);
      }
      ctx.fillStyle = 'rgba(224,74,53,0.9)';
      ctx.beginPath();
      ctx.arc(246, 10, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'logo') {
      const logo = norrskenLogo(256);
      ctx.drawImage(logo.image as HTMLCanvasElement, 78, 20, 100, 100);
      ctx.fillStyle = '#7fd4de';
      ctx.font = `600 16px 'Segoe UI', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('NORRSKEN DYNAMICS', 128, 142);
    } else if (kind === 'server-status') {
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = 'rgba(150,170,185,0.7)';
        ctx.fillRect(12, 12 + i * 12, 60, 5);
        const ok = hash2(i, 4) > 0.2;
        ctx.fillStyle = ok ? 'rgba(90,208,142,0.9)' : 'rgba(230,182,76,0.9)';
        ctx.fillRect(200, 11 + i * 12, 26, 7);
        ctx.fillStyle = 'rgba(90,120,140,0.6)';
        ctx.fillRect(84, 12 + i * 12, 40 + hash2(i, 6) * 60, 5);
      }
    } else if (kind === 'alert') {
      ctx.fillStyle = '#ff5040';
      ctx.font = `800 30px 'Segoe UI', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('LOCKDOWN', 128, 70);
      ctx.font = `400 14px 'Segoe UI', sans-serif`;
      ctx.fillStyle = '#ffb0a8';
      ctx.fillText('SECURITY PROTOCOL 7 ACTIVE', 128, 96);
      ctx.strokeStyle = '#ff5040';
      ctx.strokeRect(20, 20, 216, 120);
    }
    // scanline sheen
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    for (let y = 0; y < 160; y += 3) ctx.fillRect(0, y, 256, 1);
    return toTexture(canvas, { repeat: false });
  });
}

export function whiteboardTex(): THREE.Texture {
  return cached('whiteboard', () => {
    const { canvas, ctx } = makeCanvas(512, 256);
    ctx.fillStyle = '#eef0ee';
    ctx.fillRect(0, 0, 512, 256);
    // marker scrawl: project timeline + circles
    ctx.strokeStyle = 'rgba(40,70,150,0.75)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(40, 60);
    ctx.lineTo(430, 60);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const x = 60 + i * 88;
      ctx.beginPath();
      ctx.moveTo(x, 52);
      ctx.lineTo(x, 68);
      ctx.stroke();
      // scribble labels
      ctx.strokeStyle = 'rgba(40,70,150,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 18, 84);
      ctx.quadraticCurveTo(x, 78 + hash2(i, 3) * 10, x + 20, 86);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(40,70,150,0.75)';
      ctx.lineWidth = 3;
    }
    ctx.strokeStyle = 'rgba(180,50,40,0.7)';
    ctx.beginPath();
    ctx.ellipse(330, 60, 40, 20, 0, 0, Math.PI * 2);
    ctx.stroke();
    // box diagram
    ctx.strokeStyle = 'rgba(40,110,70,0.7)';
    ctx.strokeRect(60, 130, 90, 54);
    ctx.strokeRect(220, 130, 90, 54);
    ctx.strokeRect(380, 130, 70, 54);
    ctx.beginPath();
    ctx.moveTo(150, 157);
    ctx.lineTo(220, 157);
    ctx.moveTo(310, 157);
    ctx.lineTo(380, 157);
    ctx.stroke();
    // wavy notes
    ctx.strokeStyle = 'rgba(60,60,70,0.55)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(70, 208 + i * 12);
      for (let x = 70; x < 250 + hash2(i, 8) * 120; x += 14) {
        ctx.lineTo(x, 206 + i * 12 + hash2(x, i) * 5);
      }
      ctx.stroke();
    }
    return toTexture(canvas, { repeat: false });
  });
}

export function noticeBoardTex(): THREE.Texture {
  return cached('noticeboard', () => {
    const { canvas, ctx } = makeCanvas(512, 256);
    ctx.fillStyle = '#8a6a4a';
    ctx.fillRect(0, 0, 512, 256);
    // cork noise
    for (let i = 0; i < 2200; i++) {
      ctx.fillStyle = `rgba(${120 + hash2(i, 1) * 60},${90 + hash2(i, 2) * 45},${55 + hash2(i, 3) * 35},0.5)`;
      ctx.fillRect(hash2(i, 4) * 512, hash2(i, 5) * 256, 2.4, 2.4);
    }
    // pinned papers
    for (let i = 0; i < 9; i++) {
      const x = 20 + hash2(i, 6) * 400;
      const y = 16 + hash2(i, 7) * 160;
      const w = 52 + hash2(i, 8) * 40;
      const h = 60 + hash2(i, 9) * 30;
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate((hash2(i, 10) - 0.5) * 0.2);
      ctx.fillStyle = ['#f2efe6', '#e8f0f4', '#f6e8c8', '#e4f2e0'][Math.floor(hash2(i, 11) * 4)];
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = 'rgba(60,60,70,0.5)';
      for (let l = 0; l < 5; l++) {
        ctx.fillRect(-w / 2 + 6, -h / 2 + 10 + l * 9, (w - 16) * (0.5 + hash2(i, l) * 0.5), 3);
      }
      ctx.fillStyle = '#c8402e';
      ctx.beginPath();
      ctx.arc(0, -h / 2 + 5, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    return toTexture(canvas, { repeat: false });
  });
}

export function kestrelBanner(): THREE.Texture {
  return cached('kestrel', () => {
    const { canvas, ctx } = makeCanvas(256, 384);
    ctx.fillStyle = '#2e3338';
    ctx.fillRect(0, 0, 256, 384);
    ctx.strokeStyle = '#8a2f22';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 236, 364);
    // diving bird chevron
    ctx.fillStyle = '#a8362a';
    ctx.beginPath();
    ctx.moveTo(128, 90);
    ctx.lineTo(210, 170);
    ctx.lineTo(170, 170);
    ctx.lineTo(128, 130);
    ctx.lineTo(86, 170);
    ctx.lineTo(46, 170);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(128, 150);
    ctx.lineTo(190, 220);
    ctx.lineTo(150, 220);
    ctx.lineTo(128, 196);
    ctx.lineTo(106, 220);
    ctx.lineTo(66, 220);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d8d2c8';
    ctx.font = `700 34px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('KESTREL', 128, 290);
    return toTexture(canvas, { repeat: false });
  });
}

/** small paper sheet texture (desk clutter) */
export function paperTex(seed: number): THREE.Texture {
  return cached(`paper${seed % 4}`, () => {
    const { canvas, ctx } = makeCanvas(128, 170);
    ctx.fillStyle = '#f0ede4';
    ctx.fillRect(0, 0, 128, 170);
    ctx.fillStyle = 'rgba(60,60,72,0.55)';
    const s = seed % 4;
    for (let l = 0; l < 14; l++) {
      ctx.fillRect(12, 14 + l * 10, (104) * (0.4 + hash2(l, s) * 0.6), 3);
    }
    if (s === 1) {
      ctx.fillStyle = 'rgba(46,125,132,0.8)';
      ctx.fillRect(12, 10, 60, 8);
    }
    if (s === 2) {
      ctx.strokeStyle = 'rgba(160,60,50,0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(64, 90, 40, 22, 0.2, 0, Math.PI * 2);
      ctx.stroke();
    }
    return toTexture(canvas, { repeat: false });
  });
}
