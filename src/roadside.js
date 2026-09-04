import * as THREE from 'three';
import { Kit, cyl, rbox, transform } from './lib/geo.js';
import { canvasTexture, clamp, fbm, mulberry32, smoothstep } from './textures/core.js';

// ---------------------------------------------------------------------------
// What stands beside the road.
//
// Park-style signs, kilometre posts, a ranger's boom gate at the camp access,
// the culvert headwalls where the mainline crosses the dry river, and the
// lookout board at the overlook. All of it is kit-bashed from a handful of
// primitives, placed off the terrain's own anchors (the access mouth, the
// crossing, the board position) so it stands where the ground was shaped for
// it, and merged into one mesh per material — nine draw calls for the lot.
//
// The signs share one atlas. Every face is painted into a 256 px cell of a
// single canvas, weathered in place — sun-fade, a dust skirt, rust bleeding
// from the bolt holes — and the plate's UVs are remapped to its cell, so all of
// them are one material and one draw call however many there are.
// ---------------------------------------------------------------------------

const PARK_BROWN = '#5a3a1e';
const PARK_CREAM = '#efe6cf';
const WARN_YELLOW = '#e8c23a';

/** Weathered timber: grey-brown, grain running along v. */
function timberTexture() {
  return canvasTexture(
    256,
    (ctx, w, h) => {
      const rnd = mulberry32(31);
      ctx.fillStyle = '#7b6a55';
      ctx.fillRect(0, 0, w, h);
      // grain: many thin vertical strokes wandering a little
      for (let i = 0; i < 260; i++) {
        const x = rnd() * w;
        const dark = rnd() < 0.5;
        ctx.strokeStyle = dark ? `rgba(60,48,36,${0.12 + rnd() * 0.25})` : `rgba(150,138,118,${0.1 + rnd() * 0.2})`;
        ctx.lineWidth = 0.6 + rnd() * 1.6;
        ctx.beginPath();
        ctx.moveTo(x, -4);
        let xx = x;
        for (let y = 0; y <= h + 8; y += 16) {
          xx += (rnd() - 0.5) * 3;
          ctx.lineTo(xx, y);
        }
        ctx.stroke();
      }
      // checks: the dark splits weathered wood opens along the grain
      for (let i = 0; i < 18; i++) {
        const x = rnd() * w;
        const y = rnd() * h;
        ctx.strokeStyle = 'rgba(30,22,16,0.6)';
        ctx.lineWidth = 1 + rnd();
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rnd() - 0.5) * 4, y + 20 + rnd() * 50);
        ctx.stroke();
      }
      // grey silvering, in patches
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = `rgba(160,158,150,${0.05 + rnd() * 0.12})`;
        ctx.beginPath();
        ctx.ellipse(rnd() * w, rnd() * h, 10 + rnd() * 40, 20 + rnd() * 60, 0, 0, 6.283);
        ctx.fill();
      }
    },
    { srgb: true, repeat: 1, aniso: 4 },
  );
}

/** Weathered concrete: cool grey, streaked dark from the top, pitted. */
function concreteTexture() {
  return canvasTexture(
    256,
    (ctx, w, h) => {
      const rnd = mulberry32(47);
      ctx.fillStyle = '#8f8b82';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 2400; i++) {
        const v = rnd();
        ctx.fillStyle = v < 0.5 ? `rgba(60,58,52,${0.1 + rnd() * 0.3})` : `rgba(190,186,176,${0.1 + rnd() * 0.25})`;
        ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3);
      }
      // run-off streaks from the top edge
      for (let i = 0; i < 26; i++) {
        const x = rnd() * w;
        const g = ctx.createLinearGradient(0, 0, 0, h * (0.4 + rnd() * 0.6));
        g.addColorStop(0, 'rgba(50,46,40,0.45)');
        g.addColorStop(1, 'rgba(50,46,40,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x, 0, 3 + rnd() * 9, h);
      }
      // red dust at the bottom
      const d = ctx.createLinearGradient(0, h * 0.55, 0, h);
      d.addColorStop(0, 'rgba(150,90,50,0)');
      d.addColorStop(1, 'rgba(150,90,50,0.55)');
      ctx.fillStyle = d;
      ctx.fillRect(0, 0, w, h);
    },
    { srgb: true, repeat: 1, aniso: 4 },
  );
}

/** Galvanised steel: pale grey spangle, rust creeping in at the bottom. */
function steelTexture() {
  return canvasTexture(
    128,
    (ctx, w, h) => {
      const rnd = mulberry32(53);
      ctx.fillStyle = '#9a9c9a';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 700; i++) {
        ctx.fillStyle = rnd() < 0.5 ? `rgba(120,124,124,${0.15 + rnd() * 0.3})` : `rgba(200,204,202,${0.15 + rnd() * 0.3})`;
        ctx.beginPath();
        ctx.moveTo(rnd() * w, rnd() * h);
        for (let k = 0; k < 4; k++) ctx.lineTo(rnd() * w, rnd() * h);
        ctx.closePath();
        ctx.globalAlpha = 0.08;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      const d = ctx.createLinearGradient(0, h * 0.6, 0, h);
      d.addColorStop(0, 'rgba(120,70,40,0)');
      d.addColorStop(1, 'rgba(120,70,40,0.5)');
      ctx.fillStyle = d;
      ctx.fillRect(0, 0, w, h);
    },
    { srgb: true, repeat: 1, aniso: 4 },
  );
}

/**
 * The sign atlas. `cells` is filled with { name, u0, v0, u1, v1 } as each face
 * is painted; the plate geometry reads its rectangle back from there.
 */
function signAtlas(cells) {
  const S = 1024;
  const C = 256;
  const per = S / C;
  let n = 0;
  const rndW = mulberry32(71);

  const weather = (ctx, x0, y0, bolts) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, C, C);
    ctx.clip();
    // sun fade
    ctx.fillStyle = `rgba(255,250,235,${0.08 + rndW() * 0.08})`;
    ctx.fillRect(x0, y0, C, C);
    // dust skirt
    const d = ctx.createLinearGradient(0, y0 + C * 0.55, 0, y0 + C);
    d.addColorStop(0, 'rgba(170,110,60,0)');
    d.addColorStop(1, `rgba(170,110,60,${0.3 + rndW() * 0.25})`);
    ctx.fillStyle = d;
    ctx.fillRect(x0, y0, C, C);
    // rust from the bolt holes
    for (const [bx, by] of bolts) {
      ctx.fillStyle = 'rgba(40,30,22,0.9)';
      ctx.beginPath();
      ctx.arc(x0 + bx, y0 + by, 4, 0, 6.283);
      ctx.fill();
      const g = ctx.createLinearGradient(0, y0 + by, 0, y0 + by + 40 + rndW() * 60);
      g.addColorStop(0, 'rgba(120,60,25,0.7)');
      g.addColorStop(1, 'rgba(120,60,25,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x0 + bx - 3 - rndW() * 3, y0 + by, 6 + rndW() * 5, 120);
    }
    // a few chips
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = 'rgba(110,105,98,0.85)';
      ctx.beginPath();
      ctx.arc(x0 + rndW() * C, y0 + rndW() * C, 1 + rndW() * 2.5, 0, 6.283);
      ctx.fill();
    }
    ctx.restore();
  };

  const tex = canvasTexture(
    S,
    (ctx) => {
      ctx.fillStyle = '#6c6a66';
      ctx.fillRect(0, 0, S, S);
      const cell = (name, draw, bolts = []) => {
        const i = n++;
        const x0 = (i % per) * C;
        const y0 = Math.floor(i / per) * C;
        ctx.save();
        ctx.translate(x0, y0);
        draw(ctx);
        ctx.restore();
        weather(ctx, x0, y0, bolts);
        // v runs up from the bottom of the canvas in three's default flipY
        cells.push({ name, u0: x0 / S, u1: (x0 + C) / S, v0: 1 - (y0 + C) / S, v1: 1 - y0 / S });
      };
      const text = (ctx, lines, y, size, color, weight = 'bold') => {
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${weight} ${size}px "DejaVu Sans", Arial, Helvetica, sans-serif`;
        lines.forEach((l, k) => ctx.fillText(l, C / 2, y + k * size * 1.25));
      };
      // park information boards: cream lettering on brown, a cream border
      const board = (lines, arrow, size = 30) => (ctx) => {
        ctx.fillStyle = PARK_BROWN;
        ctx.fillRect(0, 0, C, C);
        ctx.strokeStyle = PARK_CREAM;
        ctx.lineWidth = 6;
        ctx.strokeRect(10, 10, C - 20, C - 20);
        const y0 = C / 2 - ((lines.length - 1) * size * 1.25) / 2 - (arrow ? 16 : 0);
        text(ctx, lines, y0, size, PARK_CREAM);
        if (arrow) {
          ctx.fillStyle = PARK_CREAM;
          ctx.beginPath();
          const ay = C - 52;
          if (arrow > 0) {
            ctx.moveTo(C - 40, ay);
            ctx.lineTo(C - 70, ay - 22);
            ctx.lineTo(C - 70, ay - 8);
            ctx.lineTo(40, ay - 8);
            ctx.lineTo(40, ay + 8);
            ctx.lineTo(C - 70, ay + 8);
            ctx.lineTo(C - 70, ay + 22);
          } else {
            ctx.moveTo(40, ay);
            ctx.lineTo(70, ay - 22);
            ctx.lineTo(70, ay - 8);
            ctx.lineTo(C - 40, ay - 8);
            ctx.lineTo(C - 40, ay + 8);
            ctx.lineTo(70, ay + 8);
            ctx.lineTo(70, ay + 22);
          }
          ctx.closePath();
          ctx.fill();
        }
      };
      // warning diamond: the plate is a square turned 45 degrees, so the
      // symbol is painted turned the other way
      const diamond = (symbol) => (ctx) => {
        ctx.fillStyle = WARN_YELLOW;
        ctx.fillRect(0, 0, C, C);
        ctx.strokeStyle = '#151311';
        ctx.lineWidth = 10;
        ctx.strokeRect(14, 14, C - 28, C - 28);
        ctx.save();
        ctx.translate(C / 2, C / 2);
        ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = '#151311';
        symbol(ctx);
        ctx.restore();
      };
      const elephant = (ctx) => {
        // body, head, trunk, legs, ear — six shapes read as an elephant at any size
        ctx.beginPath();
        ctx.ellipse(6, -6, 46, 32, 0, 0, 6.283);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-46, -12, 22, 24, 0, 0, 6.283);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-40, -8, 18, 26, 0.3, 0, 6.283);
        ctx.fill();
        ctx.lineWidth = 12;
        ctx.strokeStyle = '#151311';
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-62, -4);
        ctx.quadraticCurveTo(-78, 20, -60, 44);
        ctx.stroke();
        for (const lx of [-26, -8, 22, 40]) ctx.fillRect(lx - 8, 14, 16, 36);
        ctx.fillRect(48, -6, 8, 22);
      };
      const dip = (ctx) => {
        ctx.lineWidth = 14;
        ctx.strokeStyle = '#151311';
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-70, -20);
        ctx.lineTo(-30, -20);
        ctx.quadraticCurveTo(0, 50, 30, -20);
        ctx.lineTo(70, -20);
        ctx.stroke();
      };
      const antelope = (ctx) => {
        ctx.beginPath();
        ctx.ellipse(4, 0, 40, 22, 0, 0, 6.283);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(40, -30, 12, 16, -0.4, 0, 6.283);
        ctx.fill();
        ctx.fillRect(30, -22, 12, 24);
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#151311';
        for (const [x0, y0, x1, y1] of [
          [44, -44, 60, -74],
          [50, -44, 74, -66],
        ]) {
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        }
        for (const lx of [-26, -14, 18, 30]) ctx.fillRect(lx - 4, 14, 8, 44);
      };
      // speed disc: white, red ring, black figure
      const disc = (n) => (ctx) => {
        ctx.fillStyle = '#6c6a66';
        ctx.fillRect(0, 0, C, C);
        ctx.fillStyle = '#c8312a';
        ctx.beginPath();
        ctx.arc(C / 2, C / 2, C / 2 - 4, 0, 6.283);
        ctx.fill();
        ctx.fillStyle = '#f2eee4';
        ctx.beginPath();
        ctx.arc(C / 2, C / 2, C / 2 - 30, 0, 6.283);
        ctx.fill();
        text(ctx, [n], C / 2 + 4, 110, '#151311');
      };
      // the lookout: a panorama with the hills drawn on it and the animals named
      const panorama = (ctx) => {
        ctx.fillStyle = PARK_CREAM;
        ctx.fillRect(0, 0, C, C);
        ctx.fillStyle = PARK_BROWN;
        ctx.fillRect(0, 0, C, 44);
        text(ctx, ['GAME VIEWING POINT'], 22, 20, PARK_CREAM);
        // sky, two hill lines, grass
        const sky = ctx.createLinearGradient(0, 44, 0, 150);
        sky.addColorStop(0, '#b9c7cf');
        sky.addColorStop(1, '#dfd9c6');
        ctx.fillStyle = sky;
        ctx.fillRect(12, 56, C - 24, 100);
        ctx.fillStyle = '#8d97a0';
        ctx.beginPath();
        ctx.moveTo(12, 130);
        for (let x = 12; x <= C - 12; x += 8) ctx.lineTo(x, 118 - fbm(x * 0.02, 1, { octaves: 3, period: 8, seed: 3 }) * 34);
        ctx.lineTo(C - 12, 156);
        ctx.lineTo(12, 156);
        ctx.fill();
        ctx.fillStyle = '#6e7a62';
        ctx.beginPath();
        ctx.moveTo(12, 156);
        for (let x = 12; x <= C - 12; x += 8) ctx.lineTo(x, 146 - fbm(x * 0.05, 7, { octaves: 3, period: 8, seed: 5 }) * 18);
        ctx.lineTo(C - 12, 156);
        ctx.fill();
        ctx.fillStyle = '#b9a56a';
        ctx.fillRect(12, 152, C - 24, 8);
        // an acacia and the water hole marked
        ctx.fillStyle = '#3a3a2a';
        ctx.fillRect(60, 124, 3, 30);
        ctx.beginPath();
        ctx.ellipse(61, 122, 18, 7, 0, 0, 6.283);
        ctx.fill();
        ctx.fillStyle = '#7fa0b3';
        ctx.beginPath();
        ctx.ellipse(170, 150, 26, 5, 0, 0, 6.283);
        ctx.fill();
        ctx.strokeStyle = PARK_BROWN;
        ctx.lineWidth = 3;
        ctx.strokeRect(12, 56, C - 24, 104);
        text(ctx, ['LION · ZEBRA · GIRAFFE', 'WATER HOLE 60 m', 'STAY IN YOUR VEHICLE'], 184, 16, PARK_BROWN);
      };

      const B = [
        [28, 28],
        [C - 28, 28],
        [28, C - 28],
        [C - 28, C - 28],
      ];
      cell('camp', board(['PUBLIC', 'CAMPSITE'], 1), B);
      cell('elephant', diamond(elephant), [[C / 2, 30]]);
      cell('dip', diamond(dip), [[C / 2, 30]]);
      cell('antelope', diamond(antelope), [[C / 2, 30]]);
      cell('speed', disc('40'), []);
      cell('view', board(['VIEW POINT', '100 m'], 1), B);
      cell('lions', board(['LIONS', 'DO NOT LEAVE', 'YOUR VEHICLE'], 0, 26), B);
      cell('ranger', board(['CAMPSITE', 'REPORT TO', 'RANGER'], 0, 26), B);
      cell('panorama', panorama, [
        [16, 16],
        [C - 16, 16],
      ]);
      cell('park', board(['MARA NORTH', 'CONSERVANCY', 'NO OFF-ROAD', 'DRIVING'], 0, 22), B);
      cell('drift', board(['DRIFT', 'DO NOT CROSS', 'IN FLOOD'], 0, 26), B);
    },
    { srgb: true, repeat: 1, aniso: 8 },
  );
  return tex;
}

/**
 * A plate geometry with its UVs remapped to one atlas cell. Diamonds are the
 * same square turned 45 degrees.
 */
function plate(cells, name, w, h, { diamond = false, round = false } = {}) {
  const c = cells.find((k) => k.name === name);
  const g = round ? new THREE.CircleGeometry(w * 0.5, 28) : new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, c.u0 + uv.getX(i) * (c.u1 - c.u0), c.v0 + uv.getY(i) * (c.v1 - c.v0));
  }
  if (diamond) g.rotateZ(Math.PI / 4);
  return g;
}

export function createRoadside({ terrain, env = null, quality = 'high' } = {}) {
  const group = new THREE.Group();
  group.name = 'roadside';
  const cells = [];
  const atlas = signAtlas(cells);
  const fine = quality !== 'fast' && quality !== 'low';

  const std = (o) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.0, dithering: true, ...o });
    if (env) m.envMap = env;
    return m;
  };
  const materials = {
    steel: std({ map: steelTexture(), roughness: 0.55, metalness: 0.55, envMapIntensity: 0.9 }),
    timber: std({ map: timberTexture(), roughness: 0.92 }),
    concrete: std({ map: concreteTexture(), roughness: 0.95 }),
    // paint, dusted: nothing white stays white a metre off a murram road
    white: std({ color: 0xd9d2c4, roughness: 0.62 }),
    black: std({ color: 0x1a1816, roughness: 0.7 }),
    red: std({ color: 0xa8321f, roughness: 0.66 }),
    sign: std({ map: atlas, roughness: 0.5, metalness: 0.15, envMapIntensity: 0.8 }),
    dark: std({ color: 0x050403, roughness: 1.0, envMapIntensity: 0 }),
    rustpipe: std({ color: 0x6b5744, roughness: 0.85, metalness: 0.3 }),
    lime: std({ color: 0xe6e0d2, roughness: 0.9 }),
  };
  const kit = new Kit('roadside');
  const rnd = mulberry32(0x5a11);
  const ground = (x, z) => terrain.heightAt(x, z);
  const EDGE = terrain.mainEdge ?? 6.6;

  /**
   * Add a piece in a prop's local frame (origin on the ground, facing +Z) and
   * then in the world: `at` is { x, y, z, yaw }.
   */
  const add = (key, geo, local, at) => {
    const g = local ? transform(geo, local) : geo;
    kit.add(key, g, { pos: [at.x, at.y, at.z], rot: [0, at.yaw, 0] });
  };
  /** A frame on the mainline: `side` as world.js has it, `off` metres from the centreline. */
  const roadFrame = (t, side, off) => {
    const p = terrain.mainPoint(t);
    const tg = terrain.mainTangent(t);
    const lx = -tg.z;
    const lz = tg.x;
    const x = p.x + lx * off * side;
    const z = p.z + lz * off * side;
    // facing the traffic that arrives with increasing t
    return { x, z, y: ground(x, z), yaw: Math.atan2(-tg.x, -tg.z), tx: tg.x, tz: tg.z, lx, lz };
  };

  // --- props ----------------------------------------------------------------

  /** Galvanised channel post with a plate on it, bolted. */
  function signPost(at, name, { w = 0.75, h = 0.75, diamond = false, round = false, top = 2.1, lean = 0 } = {}) {
    const postH = top;
    add('steel', cyl(0.038, 0.042, postH, 10), { pos: [0, postH * 0.5 - 0.25, 0], rot: [lean, 0, 0] }, at);
    const plateY = top - (diamond ? w * 0.72 : h * 0.5) - 0.02;
    const face = plate(cells, name, w, h, { diamond, round });
    add('sign', face, { pos: [0, plateY, 0.03], rot: [lean, 0, 0] }, at);
    // the back of the plate is bare steel
    const back = round ? cyl(w * 0.5, w * 0.5, 0.012, 24) : rbox(diamond ? w * 1.0 : w, diamond ? w * 1.0 : h, 0.012, 0.004, 1);
    if (round) back.rotateX(Math.PI / 2);
    if (diamond) back.rotateZ(Math.PI / 4);
    add('steel', back, { pos: [0, plateY, 0.016], rot: [lean, 0, 0] }, at);
    if (fine) {
      for (const [bx, by] of diamond ? [[0, w * 0.55]] : [
        [-w * 0.36, h * 0.36],
        [w * 0.36, h * 0.36],
        [-w * 0.36, -h * 0.36],
        [w * 0.36, -h * 0.36],
      ]) {
        add('black', cyl(0.012, 0.012, 0.01, 6), { pos: [bx, plateY + by, 0.04], rot: [Math.PI / 2, 0, 0] }, at);
      }
    }
  }

  /** Two timber posts and a board between them, park style. */
  function timberBoard(at, name, { w = 1.3, h = 0.9, top = 1.9, tilt = 0 } = {}) {
    const postH = top;
    for (const sx of [-1, 1]) {
      add('timber', rbox(0.12, postH, 0.12, 0.012, 1), { pos: [sx * (w * 0.5 - 0.08), postH * 0.5 - 0.3, -0.07], rot: [0, (rnd() - 0.5) * 0.1, 0] }, at);
    }
    const y = top - h * 0.5 - 0.08;
    add('timber', rbox(w + 0.06, h + 0.06, 0.05, 0.008, 1), { pos: [0, y, 0.0], rot: [tilt, 0, 0] }, at);
    add('sign', plate(cells, name, w, h), { pos: [0, y, 0.03], rot: [tilt, 0, 0] }, at);
    if (fine) {
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          add('black', cyl(0.011, 0.011, 0.012, 6), { pos: [sx * (w * 0.5 - 0.08), y + sy * (h * 0.5 - 0.1), 0.04], rot: [Math.PI / 2, 0, 0] }, at);
        }
      }
    }
  }

  /**
   * Concrete kilometre post: white, black cap, sunk a hand into the verge.
   *
   * No two the same. Each leans up to five degrees off plumb — the verge
   * settles, a grader clips them — and stands a little higher or lower out of
   * the ground. Round 1 had them identical and perfectly plumb, which is the
   * one thing a row of concrete posts on a murram road is never.
   */
  function kmPost(at) {
    const tiltX = (rnd() - 0.5) * 0.175;
    const tiltZ = (rnd() - 0.5) * 0.175;
    const sink = (rnd() - 0.5) * 0.08;
    const rot = [tiltX, 0, tiltZ];
    // every piece is placed up the post's own leaning axis, pivoting at the
    // ground, so the cap stays on the post: Rx(Ry(Rz (0, d, 0)))
    const up = (d) => [-d * Math.sin(tiltZ), d * Math.cos(tiltX) * Math.cos(tiltZ), d * Math.cos(tiltZ) * Math.sin(tiltX)];
    add('white', rbox(0.16, 0.62, 0.16, 0.012, 1), { pos: up(0.2 - sink), rot }, at);
    const cap = new THREE.ConeGeometry(0.115, 0.1, 4);
    cap.rotateY(Math.PI / 4);
    add('black', cap, { pos: up(0.56 - sink), rot }, at);
    add('black', rbox(0.165, 0.09, 0.165, 0.008, 1), { pos: up(0.47 - sink), rot }, at);
  }

  /** Whitewashed stone, the kind parks line a turnout with. */
  function limeStone(at, r) {
    const g = new THREE.IcosahedronGeometry(r, 1);
    g.scale(1 + rnd() * 0.4, 0.62 + rnd() * 0.25, 1 + rnd() * 0.3);
    add('lime', g, { pos: [0, r * 0.32, 0], rot: [rnd() * 0.4, rnd() * 6.28, rnd() * 0.4] }, at);
  }

  // --- signs along the mainline -----------------------------------------------
  const camp = terrain.campPad;
  const look = terrain.overlook;
  const river = terrain.riverbed;
  const junctionT = terrain.junction.mainT;
  const tPer = 1 / terrain.mainLength; // t per metre, near enough on a slack alignment
  // approaching from the junction: the park board, then the campsite pointer
  timberBoard(roadFrame(junctionT + 14 * tPer, -1, EDGE + 0.9), 'park', { w: 1.5, h: 1.05, top: 2.1 });
  timberBoard(roadFrame(camp.access.t - 26 * tPer, -1, EDGE + 0.8), 'camp', { w: 1.3, h: 0.85, top: 1.85 });
  // and for anyone coming the other way
  {
    const f = roadFrame(Math.min(camp.access.t + 24 * tPer, river.crossing.t - 12 * tPer), 1, EDGE + 0.8);
    f.yaw += Math.PI;
    timberBoard(f, 'camp', { w: 1.3, h: 0.85, top: 1.85 });
  }
  // kept clear of the gate: the access is only thirty-odd metres past the junction
  signPost(roadFrame(Math.min(junctionT + 36 * tPer, camp.access.t - 44 * tPer), -1, EDGE + 0.6), 'elephant', { w: 0.8, diamond: true, top: 2.3, lean: 0.03 });
  // the crossing is under thirty metres past the camp access, so both of
  // these are held clear of the gate
  const dipT = Math.max(river.crossing.t - 30 * tPer, camp.access.t + 9 * tPer);
  signPost(roadFrame(dipT, -1, EDGE + 0.6), 'dip', { w: 0.8, diamond: true, top: 2.3, lean: -0.02 });
  timberBoard(roadFrame(Math.max(river.crossing.t - 14 * tPer, dipT + 7 * tPer), -1, EDGE + 0.9), 'drift', { w: 1.1, h: 0.8, top: 1.7 });
  signPost(roadFrame(look.t - 44 * tPer, -1, EDGE + 0.6), 'speed', { w: 0.62, round: true, top: 2.2 });
  timberBoard(roadFrame(look.t - 30 * tPer, -1, EDGE + 0.8), 'view', { w: 1.2, h: 0.8, top: 1.8 });
  signPost(roadFrame(look.t + 30 * tPer, -1, EDGE + 0.6), 'antelope', { w: 0.8, diamond: true, top: 2.3, lean: 0.04 });
  timberBoard(roadFrame(0.83, 1, EDGE + 0.9), 'lions', { w: 1.4, h: 0.95, top: 2.0 });

  // Kilometre posts about every fifty metres on the right-hand verge. The
  // spacing is what a crew paced out, not what a survey set: each one lands up
  // to six metres either side of its mark and a hand's width in or out from
  // the ditch. A row at exactly fifty metres reads as a fence.
  for (let s = 12; s < terrain.mainLength - 8; s += 50) {
    const f = roadFrame(Math.min(1, (s + (rnd() - 0.5) * 12) * tPer), -1, EDGE + 0.45 + (rnd() - 0.5) * 0.3);
    f.yaw += (rnd() - 0.5) * 0.3;
    kmPost(f);
  }

  // --- the ranger's boom gate at the camp access ------------------------------
  {
    const m = camp.access.mouth;
    const ax = camp.axis;
    // across the apron: the gate line is perpendicular to the access axis
    const yaw = Math.atan2(ax.x, ax.z);
    const halfSpan = 3.6;
    const bx = -ax.z;
    const bz = ax.x;
    const posts = [-1, 1].map((sgn) => {
      const x = m.x + bx * halfSpan * sgn;
      const z = m.z + bz * halfSpan * sgn;
      return { x, z, y: ground(x, z), yaw };
    });
    for (const p of posts) {
      add('white', cyl(0.07, 0.075, 1.25, 12), { pos: [0, 0.5, 0] }, p);
      add('black', cyl(0.072, 0.072, 0.22, 12), { pos: [0, 0.95, 0] }, p);
      add('black', cyl(0.06, 0.072, 0.06, 12), { pos: [0, 1.15, 0] }, p);
    }
    // The boom: pivoted at the top of the first post and raised — the camp is
    // open. Local +X runs from the pivot post to the other, so the raised pole
    // leans over the apron, and it is built about the pivot rather than about
    // its own middle: rotating a pole about its centre and then lifting it to
    // post height put half of it underground and the visible half standing in
    // the road three metres from the post it was meant to swing on.
    const pivot = posts[0];
    const boomL = halfSpan * 2 + 0.6;
    const raise = 1.25;
    const boomYaw = Math.atan2(-bz, bx);
    const bf = { ...pivot, yaw: boomYaw };
    const along = (d) => [Math.cos(raise) * d, 1.02 + Math.sin(raise) * d, 0];
    const boom = cyl(0.045, 0.055, boomL, 10);
    boom.rotateZ(Math.PI / 2);
    // pole tip is the wide end: cyl's top radius goes to -x after the rotation
    add('white', boom, { pos: along(boomL * 0.5 - 0.5), rot: [0, 0, raise] }, bf);
    // striped: red bands painted round the white pole
    for (let k = 0; k < 5; k++) {
      const band = cyl(0.05, 0.058, 0.32, 10);
      band.rotateZ(Math.PI / 2);
      add('red', band, { pos: along(0.9 + k * 1.35), rot: [0, 0, raise] }, bf);
    }
    // counterweight past the pivot, and the pivot bracket on the post
    add('black', rbox(0.22, 0.22, 0.24, 0.02, 1), { pos: along(-0.7), rot: [0, 0, raise] }, bf);
    add('steel', rbox(0.16, 0.28, 0.12, 0.01, 1), { pos: [0, 1.02, 0] }, pivot);
    // the resting cradle on the other post
    add('steel', rbox(0.12, 0.06, 0.2, 0.008, 1), { pos: [0, 1.06, 0] }, posts[1]);
    // the notice on the pivot post's side of the access, facing the road
    const nx = pivot.x + ax.x * -1.2 + bx * -1.4;
    const nz = pivot.z + ax.z * -1.2 + bz * -1.4;
    timberBoard({ x: nx, z: nz, y: ground(nx, nz), yaw: Math.atan2(-ax.x, -ax.z) }, 'ranger', { w: 1.1, h: 0.85, top: 1.75 });
    // a couple of whitewashed stones marking the apron mouth
    for (const sgn of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const x = m.x + bx * (halfSpan + 0.9) * sgn + ax.x * (1.2 + k * 1.6);
        const z = m.z + bz * (halfSpan + 0.9) * sgn + ax.z * (1.2 + k * 1.6);
        limeStone({ x, z, y: ground(x, z), yaw: 0 }, 0.16 + rnd() * 0.08);
      }
    }
  }

  // --- culvert headwalls at the river crossing --------------------------------
  {
    const cr = river.crossing;
    for (const hw of river.headwalls) {
      // The terrain ends the fill in a face at the wall line, so the wall is
      // sized off the ground on either side of that line: the channel floor a
      // metre or two out in front, the top of the fill a metre behind. Sampled
      // across the wall's width too, since the floor is dished.
      const along = { x: -hw.nz, z: hw.nx };
      let floorY = Infinity;
      let fillY = -Infinity;
      for (const u of [-1.8, -0.9, 0, 0.9, 1.8]) {
        for (const d of [1.2, 2.0]) floorY = Math.min(floorY, ground(hw.x + hw.nx * d + along.x * u, hw.z + hw.nz * d + along.z * u));
        fillY = Math.max(fillY, ground(hw.x - hw.nx * 1.0 + along.x * u, hw.z - hw.nz * 1.0 + along.z * u));
      }
      const h = clamp(fillY - floorY + 0.3, 1.2, 3.2);
      const yaw = Math.atan2(hw.nx, hw.nz);
      const at = { x: hw.x, z: hw.z, y: floorY - 0.3, yaw };
      // headwall, leaning back into the fill a few degrees; thick enough that
      // the terrain's face is inside it however the grader's edge wandered
      add('concrete', rbox(4.4, h + 0.3, 0.6, 0.02, 1), { pos: [0, (h + 0.3) * 0.5, -0.05], rot: [-0.06, 0, 0] }, at);
      // a coping along the top, a hand proud of the wall
      add('concrete', rbox(4.6, 0.14, 0.72, 0.015, 1), { pos: [0, h + 0.3 - 0.07, -0.05 - Math.sin(0.06) * (h + 0.3) * 0.5], rot: [-0.06, 0, 0] }, at);
      // wing walls angled back into the bank, stepping down with it
      for (const sgn of [-1, 1]) {
        add('concrete', rbox(2.2, h * 0.7 + 0.3, 0.4, 0.02, 1), { pos: [sgn * 3.0, (h * 0.7 + 0.3) * 0.5, -0.75], rot: [-0.06, sgn * 0.6, 0] }, at);
      }
      // the pipe: corrugated steel, its mouth proud of the wall, black inside
      // sized so its invert sits at the floor in front of the wall, not under it
      const pipeR = 0.6;
      const pipeY = 0.3 + pipeR + 0.42;
      // The wall is solid, so the pipe's dark inside is a disc a finger in
      // front of the wall face, with a short length of lining running out to
      // the mouth — from the channel it reads as a barrel going back into the
      // fill, and nothing behind the wall face is ever drawn.
      const pipe = cyl(pipeR, pipeR, 1.6, 20, { open: true });
      pipe.rotateX(Math.PI / 2);
      add('rustpipe', pipe, { pos: [0, pipeY, -0.2] }, at);
      const inner = cyl(pipeR - 0.04, pipeR - 0.04, 0.34, 20, { open: true });
      inner.rotateX(Math.PI / 2);
      inner.scale(1, 1, -1);
      add('dark', inner, { pos: [0, pipeY, 0.44] }, at);
      const cap = new THREE.CircleGeometry(pipeR - 0.03, 20);
      add('dark', cap, { pos: [0, pipeY, 0.28] }, at);
      // a stone apron the outflow runs over
      for (let k = 0; k < 14; k++) {
        const g = new THREE.IcosahedronGeometry(0.1 + rnd() * 0.14, 1);
        g.scale(1.2, 0.55, 1);
        add('concrete', g, { pos: [(rnd() - 0.5) * 3.0, 0.22, 0.6 + rnd() * 1.6], rot: [0, rnd() * 6.28, 0] }, at);
      }
    }
    // white guide posts either end of the embankment, both verges
    for (const sgn of [-1, 1]) {
      for (const along of [-7, 7]) {
        const x = cr.x + cr.tx * along - cr.tz * (EDGE - 1.3) * sgn;
        const z = cr.z + cr.tz * along + cr.tx * (EDGE - 1.3) * sgn;
        const at = { x, z, y: ground(x, z), yaw: 0 };
        add('white', rbox(0.1, 1.0, 0.1, 0.008, 1), { pos: [0, 0.35, 0] }, at);
        add('black', rbox(0.104, 0.12, 0.104, 0.006, 1), { pos: [0, 0.7, 0] }, at);
      }
    }
  }

  // --- the lookout board at the overlook ---------------------------------------
  {
    const b = look.board;
    // faces back toward the road: the visitor stands between the road and the
    // board and reads it looking out over the view
    const yaw = Math.atan2(-look.tz * look.side, look.tx * look.side) + Math.PI;
    const at = { x: b.x, z: b.z, y: ground(b.x, b.z), yaw };
    // lectern: two posts, a board tilted back thirty degrees
    for (const sx of [-1, 1]) add('timber', rbox(0.11, 1.1, 0.11, 0.01, 1), { pos: [sx * 0.62, 0.3, 0] }, at);
    add('timber', rbox(1.5, 0.9, 0.06, 0.008, 1), { pos: [0, 1.1, 0.02], rot: [-0.5, 0, 0] }, at);
    add('sign', plate(cells, 'panorama', 1.38, 0.8), { pos: [0, 1.1 + 0.02, 0.05 + 0.02], rot: [-0.5, 0, 0] }, at);
    // a low log rail between two more posts, the kind that keeps cars off the edge
    for (const sx of [-1, 1]) add('timber', cyl(0.09, 0.1, 0.8, 8), { pos: [sx * 3.2, 0.2, -0.6] }, at);
    const rail = cyl(0.075, 0.075, 6.4, 8);
    rail.rotateZ(Math.PI / 2);
    add('timber', rail, { pos: [0, 0.52, -0.6] }, at);
    // whitewashed stones along the turnout edge
    for (let k = -6; k <= 6; k++) {
      const along = k * 1.7 + (rnd() - 0.5) * 0.5;
      const x = look.x + look.tx * along + (-look.tz * look.side) * (EDGE + 3.4 + 0.2);
      const z = look.z + look.tz * along + look.tx * look.side * (EDGE + 3.4 + 0.2);
      limeStone({ x, z, y: ground(x, z), yaw: 0 }, 0.17 + rnd() * 0.1);
    }
  }

  kit.build(materials, { group, castShadow: true, receiveShadow: true });
  group.traverse((o) => {
    if (o.isMesh) o.frustumCulled = true;
  });

  return {
    group,
    update() {},
  };
}
