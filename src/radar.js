// radar.js — fictional track management + PPI scope (canvas texture) + a
// stylized 3D holographic radar table. Detection timing follows the visible
// rotating array; all behavior is a gameplay abstraction.
import * as THREE from 'three';
import { TAU, clamp, wrapAngle, pad2, Rand } from './util.js';
import { GRAVITY } from './physics.js';

const RADAR_RANGE = 9000; // fictional display range, meters
const ALT_SCALE_MAX = 7000;

// shared symbology (colorblind-safe: every color is paired with a shape/glyph)
const HEX = { hostile: 0xff5340, decoy: 0xc9a6ff, intc: 0x37e0ff, assigned: 0xffd257, select: 0xffffff };
const CSS = { hostile: '#ff6a55', decoy: '#c9a6ff', intc: '#37e0ff', assigned: '#ffd257', phos: '#7df0ac' };

/** closed-form ballistic ground impact (flat ground, no drag): y0 + vy·t − ½g·t² = 0 */
const _imp = { x: 0, z: 0, t: 0 };
function impactPoint(pos, vel) {
  const t = (vel.y + Math.sqrt(vel.y * vel.y + 2 * GRAVITY * Math.max(0, pos.y))) / GRAVITY;
  _imp.x = pos.x + vel.x * t;
  _imp.z = pos.z + vel.z * t;
  _imp.t = t;
  return _imp;
}

export function createRadar(ctx) {
  const { textures } = ctx;
  const tracks = [];
  const byThreat = new Map();
  let trackCounter = 0;
  let selectedTrackId = null;

  // ------------------------------------------------ PPI scope canvas
  // 928×512 matches the 1.9×1.05 console screen plane (square pixels on the glass)
  const cw = 928, ch = 512;
  const canvas = document.createElement('canvas');
  canvas.width = cw; canvas.height = ch;
  const g = canvas.getContext('2d');
  const screenTex = new THREE.CanvasTexture(canvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  if (ctx.base?.consoleScreen) {
    ctx.base.consoleScreen.material = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false });
  }

  // scope geometry on the canvas
  const SX = 258, SY = 256, SR = 214;      // scope center + radius
  const PX = 520, PW = cw - 14 - PX;       // right data panel
  const FONT = '"Consolas","Menlo","DejaVu Sans Mono",monospace';

  // ---- aux status displays on the flanking console screens (live canvases)
  const mkAux = (w, h, mesh) => {
    if (!mesh) return null;
    const cnv = document.createElement('canvas');
    cnv.width = w; cnv.height = h;
    const a = cnv.getContext('2d');
    const tex = new THREE.CanvasTexture(cnv);
    tex.colorSpace = THREE.SRGBColorSpace;
    mesh.material.dispose?.();
    mesh.material = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    return { a, tex, w, h };
  };
  const auxL = mkAux(512, 288, ctx.base?.auxScreens?.left);
  const auxR = mkAux(384, 256, ctx.base?.auxScreens?.right);

  // static overlay (bezel + scanlines + vignette + glare), built once
  const overlay = (() => {
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    const o = c.getContext('2d');
    o.fillStyle = 'rgba(0,0,0,0.10)';
    for (let y = 14; y < ch - 14; y += 3) o.fillRect(14, y, cw - 28, 1);
    const vg = o.createRadialGradient(SX, SY, SR * 0.55, SX, SY, SR * 1.35);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.28)');
    o.fillStyle = vg;
    o.fillRect(14, 14, 500, ch - 28);
    const gl = o.createLinearGradient(0, 0, cw, ch);
    gl.addColorStop(0.10, 'rgba(190,255,225,0)');
    gl.addColorStop(0.20, 'rgba(190,255,225,0.030)');
    gl.addColorStop(0.28, 'rgba(190,255,225,0)');
    o.fillStyle = gl;
    o.fillRect(14, 14, cw - 28, ch - 28);
    // permanent burn-in ghosts (long-life phosphor: range rings + center)
    o.strokeStyle = 'rgba(140,255,190,0.045)';
    o.lineWidth = 3;
    o.beginPath(); o.arc(SX, SY, SR * 0.75, 0, TAU); o.stroke();
    o.beginPath(); o.arc(SX, SY, SR * 0.25, 0, TAU); o.stroke();
    o.fillStyle = 'rgba(140,255,190,0.06)';
    o.beginPath(); o.arc(SX, SY, 6.5, 0, TAU); o.fill();
    // bezel frame
    o.fillStyle = '#111613';
    o.beginPath(); o.rect(0, 0, cw, ch); o.rect(12, 12, cw - 24, ch - 24); o.fill('evenodd');
    o.strokeStyle = 'rgba(150,255,200,0.16)';
    o.strokeRect(12.5, 12.5, cw - 25, ch - 25);
    o.strokeStyle = 'rgba(0,0,0,0.65)';
    o.strokeRect(1.5, 1.5, cw - 3, ch - 3);
    o.strokeStyle = 'rgba(255,255,255,0.05)';
    o.strokeRect(0.5, 0.5, cw - 1, ch - 1);
    // corner screws
    o.font = `9px ${FONT}`;
    for (const [x, y] of [[6.5, 6.5], [cw - 6.5, 6.5], [6.5, ch - 6.5], [cw - 6.5, ch - 6.5]]) {
      o.fillStyle = '#20261f';
      o.beginPath(); o.arc(x, y, 3.4, 0, TAU); o.fill();
      o.strokeStyle = 'rgba(0,0,0,0.7)'; o.lineWidth = 1;
      o.beginPath(); o.moveTo(x - 2.2, y - 2.2); o.lineTo(x + 2.2, y + 2.2); o.stroke();
    }
    o.fillStyle = '#39443c';
    o.textAlign = 'center';
    o.fillText('IVX-9 · P43 PHOSPHOR SCOPE · FICTIONAL TRAINER', cw / 2, ch - 3.5);
    return c;
  })();

  let ppiInit = false;

  // deterministic ground-clutter table: angular blobs hugging the scope center
  const clutterBlobs = (() => {
    const r = new Rand(48271);
    const blobs = [];
    for (let i = 0; i < 26; i++) {
      blobs.push({
        a: r.next() * TAU,
        d: r.range(0.06, 0.34) * SR,
        w: r.range(0.12, 0.5),
        l: r.range(6, 22),
        o: r.range(0.05, 0.16),
        ph: r.next() * TAU,
      });
    }
    return blobs;
  })();

  // ------------------------------------------------ holo table display
  const holo = new THREE.Group();
  const holoScale = 0.78 / RADAR_RANGE;
  const altScale = 0.78 / ALT_SCALE_MAX;
  if (ctx.base?.holoAnchor) ctx.base.holoAnchor.add(holo);

  {
    // layered translucent volume: base disc + faint annular fills + thin bright rings
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(0.8, 64),
      new THREE.MeshBasicMaterial({ color: 0x05242e, transparent: true, opacity: 0.6, depthWrite: false })
    );
    disc.rotation.x = -Math.PI / 2;
    holo.add(disc);
    // faint alternating annular fills (additive, gives layered depth)
    for (let r = 0; r < 3; r++) {
      const fill = new THREE.Mesh(
        new THREE.RingGeometry(0.26 * r + 0.004, 0.26 * (r + 1) - 0.004, 64),
        new THREE.MeshBasicMaterial({
          color: 0x0e5c6e, transparent: true, opacity: r % 2 ? 0.05 : 0.11,
          side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
        })
      );
      fill.rotation.x = -Math.PI / 2;
      fill.position.y = 0.0015;
      fill.renderOrder = 1;
      holo.add(fill);
    }
    // thin bright range rings
    for (let r = 1; r <= 3; r++) {
      const pts = [];
      for (let i = 0; i <= 72; i++) {
        const a = (i / 72) * TAU;
        pts.push(new THREE.Vector3(Math.cos(a) * 0.26 * r, 0.002, Math.sin(a) * 0.26 * r));
      }
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0x3fd6ec, transparent: true, opacity: r === 3 ? 0.85 : 0.42 })
      );
      line.renderOrder = 2;
      holo.add(line);
    }
    // bearing ticks on the outer rim (every 15°)
    {
      const pts = [];
      for (let s = 0; s < 24; s++) {
        const a = (s / 24) * TAU;
        const inner = s % 6 === 0 ? 0.73 : 0.76;
        pts.push(new THREE.Vector3(Math.cos(a) * inner, 0.002, Math.sin(a) * inner));
        pts.push(new THREE.Vector3(Math.cos(a) * 0.795, 0.002, Math.sin(a) * 0.795));
      }
      const ticks = new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0x2ec8de, transparent: true, opacity: 0.5 })
      );
      ticks.renderOrder = 2;
      holo.add(ticks);
    }
    // spokes
    for (let s = 0; s < 8; s++) {
      const a = (s / 8) * TAU;
      const pts = [new THREE.Vector3(0, 0.002, 0), new THREE.Vector3(Math.cos(a) * 0.78, 0.002, Math.sin(a) * 0.78)];
      holo.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0x1a7c8c, transparent: true, opacity: 0.22 })
      ));
    }
    // translucent volume wall at the rim
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.8, 0.46, 64, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x1c94ac, transparent: true, opacity: 0.02, side: THREE.DoubleSide,
        depthWrite: false, blending: THREE.AdditiveBlending,
      })
    );
    wall.position.y = 0.23;
    wall.renderOrder = 1;
    holo.add(wall);
    // soft volumetric projection cone rising from the table lens
    const cone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.78, 0.06, 0.48, 48, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x1e94aa, transparent: true, opacity: 0.04, side: THREE.DoubleSide,
        depthWrite: false, blending: THREE.AdditiveBlending,
      })
    );
    cone.position.y = 0.19;
    cone.renderOrder = 1;
    holo.add(cone);
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.04, 0.3, 32, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x2ab8cf, transparent: true, opacity: 0.045, side: THREE.DoubleSide,
        depthWrite: false, blending: THREE.AdditiveBlending,
      })
    );
    shaft.position.y = 0.1;
    shaft.renderOrder = 1;
    holo.add(shaft);
    // cardinal markers (north = −z so the PPI reads north-up)
    const cardinal = (txt, x, z, size, opacity) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size),
        new THREE.MeshBasicMaterial({
          map: textures.label(txt, { fg: '#7fe8f8', w: 64, h: 64, font: 'bold 44px Arial' }),
          transparent: true, depthWrite: false, opacity,
        })
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.004, z);
      holo.add(m);
    };
    cardinal('N', 0, -0.87, 0.075, 1);
    cardinal('E', 0.87, 0, 0.055, 0.55);
    cardinal('S', 0, 0.87, 0.055, 0.55);
    cardinal('W', -0.87, 0, 0.055, 0.55);
    // base marker
    const bm = new THREE.Mesh(new THREE.OctahedronGeometry(0.014), new THREE.MeshBasicMaterial({ color: 0x9ff3ff }));
    bm.position.y = 0.006;
    holo.add(bm);
  }

  // holo sweep: bright leading wedge + vertex-alpha afterglow fan, grouped so the
  // wedge's leading edge matches the detection azimuth exactly.
  const sweepGrp = new THREE.Group();
  holo.add(sweepGrp);
  {
    const mkFlat = (geo, mat) => {
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.004;
      m.renderOrder = 3;
      sweepGrp.add(m);
      return m;
    };
    // afterglow fan with per-vertex fade (trailing 1.15 rad)
    const arc = 1.15, segs = 40, R = 0.78;
    const pos = [0, 0, 0];
    const col = [0, 0, 0];
    for (let i = 0; i <= segs; i++) {
      const k = i / segs;
      const a = -arc + k * arc; // leading edge at local angle 0
      pos.push(Math.cos(a) * R, Math.sin(a) * R, 0);
      const w = k * k * k;
      col.push(w, w, w);
    }
    const idx = [];
    for (let i = 1; i <= segs; i++) idx.push(0, i, i + 1);
    const fanGeo = new THREE.BufferGeometry();
    fanGeo.setIndex(idx);
    fanGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    fanGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    mkFlat(fanGeo, new THREE.MeshBasicMaterial({
      color: 0x2ee8ff, vertexColors: true, transparent: true, opacity: 0.42,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    // hot leading wedge
    mkFlat(new THREE.CircleGeometry(R, 10, -0.09, 0.09), new THREE.MeshBasicMaterial({
      color: 0x66f2ff, transparent: true, opacity: 0.42,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    // beam edge line
    const beam = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.04, 0, 0), new THREE.Vector3(R, 0, 0)]),
      new THREE.LineBasicMaterial({ color: 0xa8fbff, transparent: true, opacity: 0.85 })
    );
    beam.rotation.x = -Math.PI / 2;
    beam.position.y = 0.005;
    beam.renderOrder = 3;
    sweepGrp.add(beam);
  }

  // blip pools
  const mkBlip = (color, interceptor = false) => {
    const grp = new THREE.Group();
    const coreGeo = interceptor ? new THREE.BoxGeometry(0.02, 0.02, 0.02) : new THREE.OctahedronGeometry(0.018);
    const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color }));
    core.renderOrder = 4;
    grp.add(core);
    const halo = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    halo.scale.setScalar(1.9);
    halo.renderOrder = 4;
    grp.add(halo);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    grp.add(hit);
    const stemGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]);
    const stem = new THREE.Line(stemGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.42 }));
    grp.add(stem);
    const ringM = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.026, 20), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
    ringM.rotation.x = -Math.PI / 2;
    ringM.renderOrder = 3;
    grp.add(ringM);
    const sel = new THREE.Mesh(new THREE.RingGeometry(0.032, 0.038, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    sel.rotation.x = -Math.PI / 2;
    sel.visible = false;
    sel.renderOrder = 3;
    grp.add(sel);
    // velocity leader on the disc floor (direction of travel)
    const velGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const vel = new THREE.Line(velGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 }));
    vel.renderOrder = 3;
    vel.visible = !interceptor;
    grp.add(vel);
    grp.visible = false;
    holo.add(grp);
    return { grp, core, halo, hit, stem, ringM, sel, vel };
  };
  const threatBlips = Array.from({ length: 10 }, () => mkBlip(HEX.hostile));
  const intBlips = Array.from({ length: 12 }, () => mkBlip(HEX.intc, true));

  // predicted ground-impact markers (✕ + micro ring on the disc floor), one per threat blip
  const mkImpactMarker = () => {
    const grp = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      color: HEX.hostile, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide,
    });
    for (const a of [Math.PI / 4, -Math.PI / 4]) {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.01), mat);
      bar.rotation.set(-Math.PI / 2, 0, a);
      bar.renderOrder = 3;
      grp.add(bar);
    }
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.034, 20), mat);
    ring.rotation.x = -Math.PI / 2;
    ring.renderOrder = 3;
    grp.add(ring);
    grp.visible = false;
    grp.position.y = 0.003;
    holo.add(grp);
    return { grp, mat };
  };
  const impactMarkers = Array.from({ length: 10 }, mkImpactMarker);

  // pooled track-ID microlabels (canvas sprites, detected tracks only, ≤ 12)
  const mkMicroLabel = () => {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 40;
    const lg = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, depthTest: false, depthWrite: false, opacity: 0.98,
    }));
    spr.scale.set(0.2, 0.062, 1);
    spr.renderOrder = 10;
    spr.visible = false;
    holo.add(spr);
    return { spr, lg, tex, key: '' };
  };
  const microLabels = Array.from({ length: 12 }, mkMicroLabel);
  function setMicroLabel(l, text, color) {
    const key = text + '|' + color;
    if (l.key === key) return;
    l.key = key;
    l.lg.clearRect(0, 0, 128, 40);
    l.lg.fillStyle = 'rgba(2,10,9,0.8)';
    l.lg.fillRect(10, 4, 108, 32);
    l.lg.strokeStyle = 'rgba(140,240,220,0.3)';
    l.lg.strokeRect(10.5, 4.5, 107, 31);
    l.lg.font = `bold 21px ${FONT}`;
    l.lg.textAlign = 'center';
    l.lg.textBaseline = 'middle';
    l.lg.fillStyle = color;
    l.lg.fillText(text, 64, 21);
    l.tex.needsUpdate = true;
  }

  // interceptor → target path leaders (thin lines in holo space)
  const intLeaders = Array.from({ length: 12 }, () => {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const ln = new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: HEX.intc, transparent: true, opacity: 0.28, depthWrite: false,
    }));
    ln.renderOrder = 3;
    ln.visible = false;
    holo.add(ln);
    return ln;
  });

  // rim bearing arcs marking inbound hostile azimuths
  const threatArcs = Array.from({ length: 10 }, () => {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.752, 0.778, 10, 1, -0.16, 0.32),
      new THREE.MeshBasicMaterial({ color: HEX.hostile, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.0035;
    m.renderOrder = 3;
    m.visible = false;
    holo.add(m);
    return m;
  });

  // shared animated selection pulse ring
  const pulseRing = new THREE.Mesh(
    new THREE.RingGeometry(0.05, 0.057, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })
  );
  pulseRing.rotation.x = -Math.PI / 2;
  pulseRing.position.y = 0.005;
  pulseRing.renderOrder = 3;
  pulseRing.visible = false;
  holo.add(pulseRing);

  // ------------------------------------------------ track bookkeeping
  ctx.events.on('threat-spawned', ({ threat }) => {
    trackCounter++;
    const track = {
      id: 'TK-' + pad2(trackCounter),
      threat,
      detected: false,
      firstSeen: -1,
      classified: 'SEARCHING',
      quality: 0,
      assignedBattery: null,
      engagedBy: 0,
      history: [],
      lastPing: -99,
      gone: false,
      outcome: null,
    };
    tracks.push(track);
    byThreat.set(threat, track);
  });
  const dropTrack = (threat, outcome) => {
    const tr = byThreat.get(threat);
    if (tr) {
      tr.gone = true;
      tr.outcome = outcome;
      tr.goneAt = ctx.time.now;
      if (selectedTrackId === tr.id) selectedTrackId = null;
      byThreat.delete(threat);
    }
  };
  ctx.events.on('threat-destroyed', ({ threat }) => dropTrack(threat, 'DESTROYED'));
  ctx.events.on('threat-impact', ({ threat }) => dropTrack(threat, 'IMPACT'));

  let prevSweep = 0;

  function classify(track, dt) {
    const t = track.threat;
    if (!track.detected) return;
    const seen = ctx.time.now - track.firstSeen;
    track.quality = clamp(track.quality + dt * 0.25, 0, 1);
    if (t.isDecoy) {
      if (seen > 11 || t.pos.y < 2600) track.classified = 'DECOY (P)';
      else if (seen > 3) track.classified = 'BALLISTIC';
      else track.classified = 'ACQUIRING';
    } else {
      if (seen > 3) track.classified = 'BALLISTIC';
      else track.classified = 'ACQUIRING';
    }
  }

  // ------------------------------------------------ PPI drawing helpers
  const toScreen = (x, z) => [SX + (x / RADAR_RANGE) * SR, SY + (z / RADAR_RANGE) * SR];
  function diamond(px, py, s, fill, color, lw = 1.6) {
    g.beginPath();
    g.moveTo(px, py - s); g.lineTo(px + s, py); g.lineTo(px, py + s); g.lineTo(px - s, py);
    g.closePath();
    if (fill) { g.fillStyle = color; g.fill(); }
    else { g.strokeStyle = color; g.lineWidth = lw; g.stroke(); }
  }
  function xMark(px, py, s, color, lw = 1.6) {
    g.strokeStyle = color; g.lineWidth = lw;
    g.beginPath();
    g.moveTo(px - s, py - s); g.lineTo(px + s, py + s);
    g.moveTo(px + s, py - s); g.lineTo(px - s, py + s);
    g.stroke();
  }
  function corners(px, py, s, color, lw = 1.4) {
    const k = s * 0.45;
    g.strokeStyle = color; g.lineWidth = lw;
    g.beginPath();
    g.moveTo(px - s + k, py - s); g.lineTo(px - s, py - s); g.lineTo(px - s, py - s + k);
    g.moveTo(px + s - k, py - s); g.lineTo(px + s, py - s); g.lineTo(px + s, py - s + k);
    g.moveTo(px - s + k, py + s); g.lineTo(px - s, py + s); g.lineTo(px - s, py + s - k);
    g.moveTo(px + s - k, py + s); g.lineTo(px + s, py + s); g.lineTo(px + s, py + s - k);
    g.stroke();
  }
  function panelBox(x, y, w, h, title) {
    g.fillStyle = 'rgba(3,17,11,0.96)';
    g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(110,240,170,0.26)';
    g.lineWidth = 1;
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    if (title) {
      g.fillStyle = 'rgba(125,240,172,0.66)';
      g.font = `10px ${FONT}`;
      g.textAlign = 'left';
      g.fillText(title, x + 9, y + 14);
      g.strokeStyle = 'rgba(110,240,170,0.18)';
      g.beginPath(); g.moveTo(x + 8, y + 19.5); g.lineTo(x + w - 8, y + 19.5); g.stroke();
    }
  }
  const fmtK = (m) => (m >= 1000 ? (m / 1000).toFixed(1) + 'km' : Math.round(m) + 'm');
  const brgOf = (x, z) => Math.round(((Math.atan2(x, -z) * 180) / Math.PI + 360) % 360);

  // ------------------------------------------------ PPI drawing
  let redrawAcc = 0;
  let auxAcc = 0.2, auxFlip = false;
  function drawPPI() {
    const now = ctx.time.now;
    if (!ppiInit) {
      ppiInit = true;
      g.fillStyle = '#020f0a';
      g.fillRect(0, 0, cw, ch);
    }
    // phosphor persistence: veil instead of clear (moving paint leaves fading trails)
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillStyle = 'rgba(2,15,10,0.22)';
    g.fillRect(0, 0, cw, ch);
    // slightly green-lit scope disc
    g.save();
    g.beginPath(); g.arc(SX, SY, SR, 0, TAU); g.clip();
    g.fillStyle = 'rgba(6,27,17,0.10)';
    g.fillRect(SX - SR, SY - SR, SR * 2, SR * 2);
    g.restore();

    // ---- static graticule (redrawn crisp every frame)
    g.lineWidth = 1;
    for (let r = 1; r <= 4; r++) {
      g.strokeStyle = r === 4 ? 'rgba(80,240,160,0.55)' : 'rgba(60,220,140,0.26)';
      g.beginPath(); g.arc(SX, SY, (SR * r) / 4, 0, TAU); g.stroke();
    }
    g.strokeStyle = 'rgba(80,240,160,0.30)';
    g.beginPath(); g.arc(SX, SY, SR - 4, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(60,220,140,0.13)';
    for (let s = 0; s < 12; s++) {
      const a = (s / 12) * TAU;
      g.beginPath();
      g.moveTo(SX + Math.cos(a) * 12, SY + Math.sin(a) * 12);
      g.lineTo(SX + Math.cos(a) * SR, SY + Math.sin(a) * SR);
      g.stroke();
    }
    // rim ticks every 10°
    g.strokeStyle = 'rgba(80,240,160,0.5)';
    for (let s = 0; s < 36; s++) {
      const a = (s / 36) * TAU;
      const l = s % 9 === 0 ? 10 : 5;
      g.beginPath();
      g.moveTo(SX + Math.cos(a) * (SR - l), SY + Math.sin(a) * (SR - l));
      g.lineTo(SX + Math.cos(a) * SR, SY + Math.sin(a) * SR);
      g.stroke();
    }
    // center cross
    g.strokeStyle = 'rgba(159,243,200,0.8)';
    g.beginPath();
    g.moveTo(SX - 5, SY); g.lineTo(SX + 5, SY);
    g.moveTo(SX, SY - 5); g.lineTo(SX, SY + 5);
    g.stroke();
    // bearing numerals every 30° just inside the rim ticks (000 = north/up)
    g.font = `10px ${FONT}`;
    g.textAlign = 'center';
    for (let b = 0; b < 360; b += 30) {
      const a = (b / 180) * Math.PI;
      const rr = SR - 21;
      g.fillStyle = b % 90 === 0 ? 'rgba(159,243,200,0.9)' : 'rgba(140,240,180,0.5)';
      g.fillText(String(b).padStart(3, '0'), SX + Math.sin(a) * rr, SY - Math.cos(a) * rr + 3.5);
    }
    // range labels down the NE diagonal
    g.font = `10px ${FONT}`;
    g.textAlign = 'left';
    g.fillStyle = 'rgba(140,240,180,0.55)';
    for (let r = 1; r <= 4; r++) {
      const d = (SR * r) / 4 * 0.7071;
      g.fillText(`${((RADAR_RANGE * r) / 4 / 1000).toFixed(1)}`, SX + d + 3, SY - d + 11);
    }
    g.fillText('km', SX + SR * 0.7071 + 3, SY - SR * 0.7071 + 22);

    // ---- rotating sweep with phosphor afterglow (additive)
    const sweepAz = ctx.base?.radarHead ? ctx.base.radarHead.rotation.y : 0;
    const beamA = -sweepAz + Math.PI / 2; // world az → screen angle (verified with detection az)
    g.save();
    g.beginPath(); g.arc(SX, SY, SR - 2, 0, TAU); g.clip();
    g.globalCompositeOperation = 'lighter';
    g.translate(SX, SY);
    g.rotate(beamA);
    if (g.createConicGradient) {
      // trailing glow occupies increasing local angle (beam travels toward −angle on screen)
      const cg = g.createConicGradient(0, 0, 0);
      const trail = 1.45 / TAU;
      cg.addColorStop(0, 'rgba(110,255,175,0.30)');
      cg.addColorStop(trail * 0.35, 'rgba(90,245,160,0.115)');
      cg.addColorStop(trail, 'rgba(70,235,150,0)');
      cg.addColorStop(1, 'rgba(70,235,150,0)');
      g.fillStyle = cg;
      g.beginPath(); g.arc(0, 0, SR, 0, TAU); g.fill();
    } else {
      for (let i = 0; i < 10; i++) {
        g.fillStyle = `rgba(90,245,160,${0.16 * (1 - i / 10) * (1 - i / 10)})`;
        g.beginPath();
        g.moveTo(0, 0);
        g.arc(0, 0, SR, i * 0.145, (i + 1) * 0.145);
        g.closePath();
        g.fill();
      }
    }
    // hot beam line (kept modest — persistence veil re-paints slowly, so bright
    // strokes would otherwise linger as discrete ghost spokes)
    g.strokeStyle = 'rgba(190,255,215,0.55)';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(6, 0); g.lineTo(SR, 0); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.18)';
    g.lineWidth = 4;
    g.beginPath(); g.moveTo(16, 0); g.lineTo(SR, 0); g.stroke();
    g.restore();

    // ---- ground clutter arcs near center + receiver noise speckle
    g.save();
    g.beginPath(); g.arc(SX, SY, SR - 4, 0, TAU); g.clip();
    g.globalCompositeOperation = 'lighter';
    for (const cb of clutterBlobs) {
      const tw = 0.7 + 0.3 * Math.sin(now * 1.7 + cb.ph);
      g.strokeStyle = `rgba(90,235,150,${(cb.o * tw).toFixed(3)})`;
      g.lineWidth = cb.l * 0.35;
      g.beginPath();
      g.arc(SX, SY, cb.d, cb.a, cb.a + cb.w);
      g.stroke();
    }
    if (ctx.vrng) {
      for (let i = 0; i < 46; i++) {
        const a = ctx.vrng.next() * TAU, d = Math.sqrt(ctx.vrng.next()) * (SR - 8);
        g.fillStyle = `rgba(120,255,180,${(ctx.vrng.next() * 0.11).toFixed(3)})`;
        g.fillRect(SX + Math.cos(a) * d, SY + Math.sin(a) * d, 1.6, 1.6);
      }
    }
    g.restore();

    // ---- base + battery markers (azimuth-true, clamped to a readable radius)
    g.strokeStyle = '#9ff3c8';
    g.lineWidth = 1.2;
    g.strokeRect(SX - 4, SY - 4, 8, 8);
    if (ctx.batteries?.list) {
      g.font = `bold 10px ${FONT}`;
      for (const b of ctx.batteries.list) {
        const p = b.rig.group.position;
        const d = Math.hypot(p.x, p.z) || 1;
        const rr = Math.max((d / RADAR_RANGE) * SR, 21);
        const px = SX + (p.x / d) * rr;
        const py = SY + (p.z / d) * rr;
        const st = b.displayState;
        const col = st === 'READY' ? 'rgba(142,240,180,0.95)' : st === 'EMPTY' ? 'rgba(255,106,85,0.95)' : 'rgba(255,210,87,0.95)';
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(px, py - 4.6); g.lineTo(px + 4.2, py + 3.4); g.lineTo(px - 4.2, py + 3.4);
        g.closePath();
        g.fill();
        g.fillText(b.def.name[0], px + 6, py + 3);
      }
    }

    // ---- threat blips
    const selTr = selectedTrackId ? tracks.find((t) => t.id === selectedTrackId && !t.gone) : null;
    for (const tr of tracks) {
      if (tr.gone || !tr.detected) continue;
      const t = tr.threat;
      const [px, py] = toScreen(t.pos.x, t.pos.z);
      const isDecoy = tr.classified.startsWith('DECOY');
      const col = isDecoy ? CSS.decoy : tr.assignedBattery ? CSS.assigned : CSS.hostile;
      // history breadcrumbs with age fade
      for (const h of tr.history) {
        const age = now - (h[2] ?? now);
        const a = Math.max(0, 1 - age / 14) * 0.34;
        if (a <= 0.01) continue;
        const [hx, hy] = toScreen(h[0], h[1]);
        g.fillStyle = `rgba(130,255,180,${a.toFixed(3)})`;
        g.fillRect(hx - 1, hy - 1, 2, 2);
      }
      // predicted ground-impact marker
      const imp = impactPoint(t.pos, t.vel);
      const ir = Math.hypot(imp.x, imp.z);
      if (ir < RADAR_RANGE) {
        const [ix, iy] = toScreen(imp.x, imp.z);
        xMark(ix, iy, 4.4, isDecoy ? 'rgba(201,166,255,0.6)' : 'rgba(255,140,110,0.8)', 1.4);
        g.strokeStyle = isDecoy ? 'rgba(201,166,255,0.35)' : 'rgba(255,140,110,0.45)';
        g.lineWidth = 1;
        g.beginPath(); g.arc(ix, iy, 7.5, 0, TAU); g.stroke();
        // dotted path hint from blip to impact for the selected track
        if (tr === selTr) {
          g.setLineDash([3, 5]);
          g.strokeStyle = 'rgba(255,255,255,0.30)';
          g.beginPath(); g.moveTo(px, py); g.lineTo(ix, iy); g.stroke();
          g.setLineDash([]);
        }
      }
      // velocity leader (direction of travel, length ∝ ground speed)
      const gs = Math.hypot(t.vel.x, t.vel.z);
      if (gs > 1) {
        const ll = clamp(gs * 0.045, 9, 34);
        g.strokeStyle = col;
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(px, py);
        g.lineTo(px + (t.vel.x / gs) * ll, py + (t.vel.z / gs) * ll);
        g.stroke();
      }
      // blip glyph: hostile ◆ filled · decoy ◇ open
      g.save();
      g.shadowColor = col; g.shadowBlur = 9;
      diamond(px, py, 6.5, !isDecoy, col, 1.8);
      g.restore();
      // labels (bigger typography)
      g.font = `bold 15px ${FONT}`;
      g.textAlign = 'left';
      g.fillStyle = '#eafff2';
      g.fillText(tr.id, px + 11, py - 5);
      g.font = `11px ${FONT}`;
      g.fillStyle = 'rgba(215,255,232,0.72)';
      g.fillText(`${(t.pos.y / 1000).toFixed(1)}km ${isDecoy ? '◇' : '◆'}`, px + 11, py + 9);
      if (tr.id === selectedTrackId) {
        g.strokeStyle = '#ffffff';
        g.lineWidth = 1.6;
        g.beginPath(); g.arc(px, py, 12.5, 0, TAU); g.stroke();
        g.beginPath();
        for (let q = 0; q < 4; q++) {
          const a = (q / 4) * TAU + now * 0.9;
          g.moveTo(px + Math.cos(a) * 12.5, py + Math.sin(a) * 12.5);
          g.lineTo(px + Math.cos(a) * 17, py + Math.sin(a) * 17);
        }
        g.stroke();
      }
      if (tr.assignedBattery) corners(px, py, 11, CSS.assigned, 1.6);
    }

    // ---- interceptor blips (■ cyan + thin leader to their target)
    for (const it of ctx.interceptors?.active ?? []) {
      const [px, py] = toScreen(it.pos.x, it.pos.z);
      if (it.threat?.alive) {
        const [tx, ty] = toScreen(it.threat.pos.x, it.threat.pos.z);
        g.strokeStyle = 'rgba(55,224,255,0.30)';
        g.lineWidth = 1;
        g.setLineDash([2, 4]);
        g.beginPath(); g.moveTo(px, py); g.lineTo(tx, ty); g.stroke();
        g.setLineDash([]);
      }
      g.save();
      g.shadowColor = CSS.intc; g.shadowBlur = 7;
      g.fillStyle = CSS.intc;
      g.fillRect(px - 3, py - 3, 6, 6);
      g.restore();
      g.font = `10px ${FONT}`;
      g.fillStyle = 'rgba(55,224,255,0.75)';
      g.fillText(it.id, px + 6, py - 4);
    }

    // ---- right data panel (opaque boxes: crisp, no ghosting)
    const active = tracks.filter((t) => !t.gone && t.detected);
    // header
    g.font = `bold 17px ${FONT}`;
    g.textAlign = 'left';
    g.fillStyle = '#baf7d4';
    g.fillText('IVX-9 SURVEILLANCE', PX, 40);
    if (now % 1 < 0.55) { g.fillStyle = 'rgba(186,247,212,0.8)'; g.fillRect(PX + 232, 28, 8, 13); }
    g.font = `11px ${FONT}`;
    g.fillStyle = 'rgba(186,247,212,0.66)';
    g.fillText(`MODE TBM · RNG ${(RADAR_RANGE / 1000).toFixed(0)} KM · SWP 8.1 RPM`, PX, 58);
    g.strokeStyle = 'rgba(110,240,170,0.3)';
    g.beginPath(); g.moveTo(PX, 68.5); g.lineTo(PX + PW, 68.5); g.stroke();

    // batteries box
    panelBox(PX, 78, PW, 100, 'BATTERIES');
    if (ctx.batteries?.list) {
      let by = 100;
      for (const b of ctx.batteries.list) {
        const st = b.displayState;
        const col = st === 'READY' ? CSS.phos : st === 'EMPTY' ? CSS.hostile : CSS.assigned;
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(PX + 15, by - 4.5); g.lineTo(PX + 19, by + 3); g.lineTo(PX + 11, by + 3);
        g.closePath(); g.fill();
        g.font = `bold 12px ${FONT}`;
        g.fillStyle = '#d9ffe9';
        g.fillText(b.def.name, PX + 27, by + 4);
        g.font = `11px ${FONT}`;
        g.fillStyle = col;
        g.fillText(st + (st === 'RELOADING' ? ` ${Math.ceil(Math.max(0, b.readyIn))}s` : ''), PX + 150, by + 4);
        g.textAlign = 'right';
        g.fillStyle = 'rgba(142,240,180,0.8)';
        g.fillText('▮'.repeat(b.ammo) + '▯'.repeat(Math.max(0, b.def.ammo - b.ammo)), PX + PW - 10, by + 4);
        g.textAlign = 'left';
        by += 26;
      }
    }

    // selected-track readout
    panelBox(PX, 186, PW, 148, 'TRACK DATA');
    if (selTr) {
      const t = selTr.threat;
      const isDecoy = selTr.classified.startsWith('DECOY');
      const col = isDecoy ? CSS.decoy : selTr.assignedBattery ? CSS.assigned : CSS.hostile;
      g.font = `bold 20px ${FONT}`;
      g.fillStyle = col;
      g.fillText(`${isDecoy ? '◇' : '◆'} ${selTr.id}`, PX + 12, 218);
      g.font = `bold 12px ${FONT}`;
      g.fillText(selTr.classified, PX + 130, 218);
      // track quality bar
      g.strokeStyle = 'rgba(142,240,180,0.4)';
      g.strokeRect(PX + 262.5, 206.5, 112, 9);
      g.fillStyle = 'rgba(142,240,180,0.75)';
      g.fillRect(PX + 264, 208, 109 * clamp(selTr.quality, 0.05, 1), 6);
      g.font = `9px ${FONT}`;
      g.fillStyle = 'rgba(142,240,180,0.6)';
      g.fillText('TRK QUAL', PX + 262, 202);
      const imp = impactPoint(t.pos, t.vel);
      const rows = [
        ['ALT', fmtK(t.pos.y)], ['RNG', fmtK(Math.hypot(t.pos.x, t.pos.z))],
        ['SPD', `${Math.round(t.vel.length())}m/s`], ['BRG', `${pad2(brgOf(t.pos.x, t.pos.z))}°`.padStart(4, '0')],
        ['TTI', `${Math.max(0, imp.t).toFixed(0)}s`], ['V/S', `${Math.round(t.vel.y)}m/s`],
      ];
      g.font = `12px ${FONT}`;
      for (let i = 0; i < rows.length; i++) {
        const rx = PX + 12 + (i % 2) * 190;
        const ry = 244 + Math.floor(i / 2) * 22;
        g.fillStyle = 'rgba(142,240,180,0.55)';
        g.fillText(rows[i][0], rx, ry);
        g.fillStyle = '#eafff2';
        g.fillText(rows[i][1], rx + 44, ry);
      }
      g.font = `11px ${FONT}`;
      if (selTr.assignedBattery) {
        g.fillStyle = CSS.assigned;
        g.fillText(`ASSIGNED → ${selTr.assignedBattery.toUpperCase()}`, PX + 12, 322);
      } else {
        g.fillStyle = 'rgba(142,240,180,0.5)';
        g.fillText('NOT ASSIGNED', PX + 12, 322);
      }
      if (selTr.engagedBy > 0) {
        g.fillStyle = CSS.intc;
        g.fillText(`ENGAGED ×${selTr.engagedBy}`, PX + 202, 322);
      }
    } else {
      g.font = `12px ${FONT}`;
      g.fillStyle = 'rgba(142,240,180,0.45)';
      g.fillText('NO TRACK SELECTED', PX + 12, 214);
      g.font = `11px ${FONT}`;
      g.fillText('SELECT FROM LIST OR TAP A HOLO BLIP', PX + 12, 232);
      // raid summary so the panel never sits empty
      let nHost = 0, nDecoy = 0, soonest = Infinity, soonestId = null;
      for (const tr of active) {
        if (tr.classified.startsWith('DECOY')) { nDecoy++; continue; }
        nHost++;
        const imp = impactPoint(tr.threat.pos, tr.threat.vel);
        if (imp.t < soonest) { soonest = imp.t; soonestId = tr.id; }
      }
      g.strokeStyle = 'rgba(110,240,170,0.18)';
      g.beginPath(); g.moveTo(PX + 10, 246.5); g.lineTo(PX + PW - 10, 246.5); g.stroke();
      g.font = `11px ${FONT}`;
      g.fillStyle = 'rgba(142,240,180,0.55)';
      g.fillText('RAID SUMMARY', PX + 12, 266);
      g.font = `12px ${FONT}`;
      g.fillStyle = active.length ? '#eafff2' : 'rgba(142,240,180,0.5)';
      g.fillText(`HOSTILE ${pad2(nHost)} · DECOY(P) ${pad2(nDecoy)}`, PX + 12, 288);
      if (soonestId != null) {
        g.fillStyle = soonest < 20 ? CSS.hostile : '#eafff2';
        g.fillText(`FIRST IMPACT ${soonestId} T-${Math.max(0, soonest).toFixed(0)}s`, PX + 12, 308);
      } else {
        g.fillStyle = 'rgba(142,240,180,0.5)';
        g.fillText('NO PREDICTED IMPACTS', PX + 12, 308);
      }
    }

    // symbology legend (shape + color pairs)
    panelBox(PX, 342, PW, 74, 'SYMBOLOGY');
    g.font = `10px ${FONT}`;
    const ly = 372;
    diamond(PX + 18, ly - 3, 5, true, CSS.hostile);
    g.fillStyle = 'rgba(215,255,232,0.8)'; g.fillText('HOSTILE', PX + 28, ly);
    diamond(PX + 106, ly - 3, 5, false, CSS.decoy, 1.4);
    g.fillStyle = 'rgba(215,255,232,0.8)'; g.fillText('DECOY', PX + 116, ly);
    g.fillStyle = CSS.intc; g.fillRect(PX + 184, ly - 8, 6, 6);
    g.fillStyle = 'rgba(215,255,232,0.8)'; g.fillText('INTCPT', PX + 194, ly);
    xMark(PX + 262, ly - 3, 4, 'rgba(255,140,110,0.85)', 1.3);
    g.fillStyle = 'rgba(215,255,232,0.8)'; g.fillText('PRED IMPACT', PX + 272, ly);
    const ly2 = 396;
    corners(PX + 18, ly2 - 4, 7, CSS.assigned, 1.3);
    g.fillStyle = 'rgba(215,255,232,0.8)'; g.fillText('ASSIGNED', PX + 32, ly2);
    g.strokeStyle = '#fff'; g.lineWidth = 1.2;
    g.beginPath(); g.arc(PX + 114, ly2 - 4, 6, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(215,255,232,0.8)'; g.fillText('SELECTED', PX + 126, ly2);
    g.fillStyle = 'rgba(130,255,180,0.5)'; g.fillRect(PX + 210, ly2 - 9, 2, 2);
    g.fillRect(PX + 215, ly2 - 7, 2, 2); g.fillRect(PX + 220, ly2 - 5, 2, 2);
    g.fillStyle = 'rgba(215,255,232,0.8)'; g.fillText('HISTORY', PX + 228, ly2);

    // status strip
    const inFlight = ctx.interceptors?.active.length ?? 0;
    const mm = Math.floor(now / 60), ss = Math.floor(now % 60);
    g.font = `bold 13px ${FONT}`;
    g.fillStyle = active.length ? '#ffd257' : 'rgba(186,247,212,0.75)';
    g.fillText(`TRACKS ${pad2(active.length)}`, PX, 442);
    g.fillStyle = inFlight ? CSS.intc : 'rgba(186,247,212,0.45)';
    g.fillText(`IN FLIGHT ${pad2(inFlight)}`, PX + 118, 442);
    g.fillStyle = 'rgba(186,247,212,0.6)';
    g.fillText(`SIM ${pad2(mm)}:${pad2(ss)}`, PX + 258, 442);
    g.font = `10px ${FONT}`;
    g.fillStyle = 'rgba(140,240,180,0.4)';
    g.fillText('GAIN ▮▮▮▮▯ · MTI ON · CFAR AUTO', PX, 462);

    // scope corner tag
    g.font = `10px ${FONT}`;
    g.fillStyle = 'rgba(140,240,180,0.5)';
    g.fillText('PPI-1 · NORTH-UP', 26, 34);

    // static overlay: scanlines, vignette, glare, bezel
    g.drawImage(overlay, 0, 0);
    screenTex.needsUpdate = true;
  }

  // ------------------------------------------------ aux status displays
  function auxChrome(a, w, h, title, sub) {
    a.textAlign = 'left';
    a.textBaseline = 'alphabetic';
    a.fillStyle = '#04100a';
    a.fillRect(0, 0, w, h);
    a.fillStyle = 'rgba(12,42,24,0.95)';
    a.fillRect(0, 0, w, 26);
    a.font = `bold 13px ${FONT}`;
    a.fillStyle = '#7deca8';
    a.fillText(title, 10, 18);
    if (sub) {
      a.textAlign = 'right';
      a.font = `11px ${FONT}`;
      a.fillStyle = 'rgba(125,236,168,0.7)';
      a.fillText(sub, w - 10, 18);
      a.textAlign = 'left';
    }
  }
  function auxOverlay(aux) {
    const { a, w, h } = aux;
    a.fillStyle = 'rgba(0,0,0,0.13)';
    for (let y = 2; y < h; y += 3) a.fillRect(0, y, w, 1);
    const vg = a.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.34)');
    a.fillStyle = vg;
    a.fillRect(0, 0, w, h);
    a.strokeStyle = 'rgba(110,240,170,0.2)';
    a.strokeRect(0.5, 0.5, w - 1, h - 1);
    aux.tex.needsUpdate = true;
  }
  const zClock = () => {
    const zt = 14 * 3600 + 22 * 60 + Math.floor(ctx.time.now); // fictional 1422Z start
    return `${pad2(Math.floor(zt / 3600) % 24)}${pad2(Math.floor(zt / 60) % 60)}:${pad2(zt % 60)}Z`;
  };
  function drawAuxLeft() {
    if (!auxL) return;
    const { a, w, h } = auxL;
    const now = ctx.time.now;
    auxChrome(a, w, h, 'WEAPONS STATUS — BTRY NET', zClock());
    const bats = ctx.batteries?.list ?? [];
    let y = 60;
    for (const b of bats) {
      const st = b.displayState;
      const col = st === 'READY' ? '#57e389' : st === 'EMPTY' ? '#ff6a55' : '#ffd257';
      a.font = `bold 16px ${FONT}`;
      a.fillStyle = '#d9ffe9';
      a.fillText(b.def.name.toUpperCase(), 14, y);
      // status lamp + state
      a.fillStyle = col;
      a.fillRect(w - 168, y - 12, 9, 9);
      if (st !== 'READY' && now % 1 < 0.5) { a.fillStyle = 'rgba(0,0,0,0.55)'; a.fillRect(w - 168, y - 12, 9, 9); }
      a.fillStyle = col;
      a.font = `bold 13px ${FONT}`;
      a.fillText(st + (st === 'RELOADING' ? ` ${Math.ceil(Math.max(0, b.readyIn))}s` : ''), w - 150, y - 2);
      // ammo pips
      a.font = `10px ${FONT}`;
      a.fillStyle = 'rgba(125,236,168,0.55)';
      a.fillText('RDY MSL', 14, y + 18);
      const na = Math.max(0, b.def.ammo);
      for (let i = 0; i < na; i++) {
        a.fillStyle = i < b.ammo ? '#4ede84' : 'rgba(52,84,64,0.7)';
        a.fillRect(76 + i * 15, y + 8, 10, 13);
      }
      // reload progress bar
      if (st === 'RELOADING' && b.def.reloadTime) {
        const p = clamp(1 - b.readyIn / b.def.reloadTime, 0, 1);
        a.strokeStyle = 'rgba(255,210,87,0.5)';
        a.strokeRect(w - 168.5, y + 8.5, 120, 11);
        a.fillStyle = 'rgba(255,210,87,0.75)';
        a.fillRect(w - 166, y + 10.5, 116 * p, 7);
      }
      a.strokeStyle = 'rgba(110,240,170,0.14)';
      a.beginPath(); a.moveTo(10, y + 30.5); a.lineTo(w - 10, y + 30.5); a.stroke();
      y += 52;
    }
    // inventory + plant summary strip above the footer
    {
      const total = bats.reduce((s, b) => s + b.ammo, 0);
      const cap = bats.reduce((s, b) => s + b.def.ammo, 0);
      a.strokeStyle = 'rgba(110,240,170,0.22)';
      a.beginPath(); a.moveTo(10, y - 16.5); a.lineTo(w - 10, y - 16.5); a.stroke();
      a.font = `11px ${FONT}`;
      a.fillStyle = 'rgba(125,236,168,0.62)';
      a.fillText('INVENTORY', 14, y + 2);
      a.font = `bold 13px ${FONT}`;
      a.fillStyle = total === 0 ? '#ff6a55' : total <= cap * 0.25 ? '#ffd257' : '#d9ffe9';
      a.fillText(`${total}/${cap} MSL`, 100, y + 2);
      a.font = `11px ${FONT}`;
      a.fillStyle = 'rgba(125,236,168,0.62)';
      a.fillText('GEN LOAD', 200, y + 2);
      const load = 0.54 + 0.1 * Math.sin(now * 0.7) + (ctx.interceptors?.active.length ?? 0) * 0.04;
      a.strokeStyle = 'rgba(125,236,168,0.4)';
      a.strokeRect(272.5, y - 8.5, 90, 10);
      a.fillStyle = load > 0.85 ? '#ffd257' : 'rgba(87,227,137,0.7)';
      a.fillRect(274, y - 6.5, 87 * clamp(load, 0, 1), 6);
      a.fillStyle = 'rgba(125,236,168,0.75)';
      a.fillText(`${Math.round(load * 100)}%`, 372, y + 2);
      a.fillText('COOLANT NOMINAL', 14, y + 22);
      a.fillText('DECON: CLEAR', 200, y + 22);
    }
    // footer: ROE + datalink
    a.fillStyle = 'rgba(12,42,24,0.95)';
    a.fillRect(0, h - 26, w, 26);
    a.font = `bold 12px ${FONT}`;
    a.fillStyle = '#ffd257';
    a.fillText('ROE: WEAPONS TIGHT', 10, h - 8);
    a.fillStyle = now % 1.6 < 1.25 ? '#57e389' : 'rgba(87,227,137,0.3)';
    a.fillText('● DL-16 LINK', 210, h - 8);
    a.fillStyle = 'rgba(125,236,168,0.7)';
    a.fillText(`RADIATE ON · T+${pad2(Math.floor(now / 60))}:${pad2(Math.floor(now % 60))}`, 330, h - 8);
    auxOverlay(auxL);
  }
  function drawAuxRight() {
    if (!auxR) return;
    const { a, w, h } = auxR;
    const now = ctx.time.now;
    auxChrome(a, w, h, 'ENGAGEMENT QUEUE', pad2(tracks.filter((t) => !t.gone && t.detected).length));
    const act = tracks.filter((t) => !t.gone && t.detected);
    a.font = `10px ${FONT}`;
    a.fillStyle = 'rgba(125,236,168,0.55)';
    a.fillText('TRK', 12, 42);
    a.fillText('TTI', 84, 42);
    a.fillText('BTRY', 140, 42);
    a.fillText('STATUS', 226, 42);
    a.strokeStyle = 'rgba(110,240,170,0.18)';
    a.beginPath(); a.moveTo(10, 47.5); a.lineTo(w - 10, 47.5); a.stroke();
    let y = 64;
    for (const tr of act.slice(0, 7)) {
      const t = tr.threat;
      const imp = impactPoint(t.pos, t.vel);
      const isDecoy = tr.classified.startsWith('DECOY');
      const col = isDecoy ? CSS.decoy : tr.assignedBattery ? CSS.assigned : CSS.hostile;
      a.font = `bold 12px ${FONT}`;
      a.fillStyle = col;
      a.fillText(tr.id, 12, y);
      a.font = `12px ${FONT}`;
      a.fillStyle = '#d9ffe9';
      a.fillText(`${Math.max(0, imp.t).toFixed(0)}s`, 84, y);
      a.fillText(tr.assignedBattery ? tr.assignedBattery.toUpperCase().slice(0, 8) : '——', 140, y);
      const st = tr.engagedBy > 0 ? `INTC×${tr.engagedBy}` : tr.assignedBattery ? 'ASSIGNED' : isDecoy ? 'MONITOR' : 'TRACK';
      a.fillStyle = tr.engagedBy > 0 ? CSS.intc : col;
      a.fillText(st, 226, y);
      y += 22;
    }
    if (!act.length) {
      a.font = `bold 13px ${FONT}`;
      a.fillStyle = 'rgba(125,236,168,0.6)';
      a.fillText('NO ACTIVE ENGAGEMENTS', 14, 84);
      a.font = `11px ${FONT}`;
      a.fillText('SURVEILLANCE SWEEP NOMINAL', 14, 106);
      if (now % 2 < 1.4) a.fillText('▮', 218, 106);
    }
    // footer
    const inF = ctx.interceptors?.active.length ?? 0;
    a.fillStyle = 'rgba(12,42,24,0.95)';
    a.fillRect(0, h - 24, w, 24);
    a.font = `bold 11px ${FONT}`;
    a.fillStyle = inF ? CSS.intc : 'rgba(125,236,168,0.6)';
    a.fillText(`IN FLIGHT ${pad2(inF)}`, 10, h - 8);
    a.fillStyle = 'rgba(125,236,168,0.65)';
    a.fillText('SHOOT-LOOK-SHOOT', 250, h - 8);
    auxOverlay(auxR);
  }

  // ------------------------------------------------ holo update
  const _dir = new THREE.Vector3();
  function updateHolo() {
    const now = ctx.time.now;
    // leading edge of the wedge tracks the detection azimuth
    sweepGrp.rotation.y = (ctx.base?.radarHead?.rotation.y ?? 0) - Math.PI / 2;

    let bi = 0;
    let selPos = null;
    for (const tr of tracks) {
      if (tr.gone || !tr.detected || bi >= threatBlips.length) continue;
      const idx = bi;
      const b = threatBlips[bi++];
      const t = tr.threat;
      const x = clamp(t.pos.x * holoScale, -0.8, 0.8);
      const z = clamp(t.pos.z * holoScale, -0.8, 0.8);
      const y = clamp(t.pos.y * altScale, 0, 0.85);
      b.grp.visible = true;
      b.grp.position.set(x, 0, z);
      b.core.position.y = y;
      b.halo.position.y = y;
      b.halo.scale.setScalar(1.9 + Math.sin(now * 4 + idx * 1.7) * 0.35);
      b.hit.position.y = y;
      b.stem.scale.set(1, Math.max(y, 0.001), 1);
      const isDecoy = tr.classified.startsWith('DECOY');
      const col = isDecoy ? HEX.decoy : tr.assignedBattery ? HEX.assigned : HEX.hostile;
      b.core.material.color.setHex(col);
      b.core.material.wireframe = isDecoy; // ◇ open form for decoys
      b.halo.material.color.setHex(col);
      b.stem.material.color.setHex(col);
      b.ringM.material.color.setHex(col);
      b.ringM.material.opacity = 0.3 + tr.quality * 0.45;
      b.sel.visible = tr.id === selectedTrackId;
      if (b.sel.visible) selPos = b.grp.position;
      b.hit.userData.trackId = tr.id;
      b.core.userData.trackId = tr.id;
      // velocity leader on the disc floor
      const gs = Math.hypot(t.vel.x, t.vel.z);
      if (gs > 1) {
        _dir.set(t.vel.x / gs, 0, t.vel.z / gs);
        const len = clamp(gs * 0.00016, 0.035, 0.13);
        const vp = b.vel.geometry.attributes.position;
        vp.setXYZ(0, _dir.x * 0.03, 0.004, _dir.z * 0.03);
        vp.setXYZ(1, _dir.x * (0.03 + len), 0.004, _dir.z * (0.03 + len));
        vp.needsUpdate = true;
        b.vel.material.color.setHex(col);
        b.vel.visible = true;
      } else b.vel.visible = false;
      // predicted ground-impact marker
      const mk = impactMarkers[idx];
      const imp = impactPoint(t.pos, t.vel);
      let ix = imp.x * holoScale, iz = imp.z * holoScale;
      const irr = Math.hypot(ix, iz);
      const off = irr > 0.78;
      if (off) { ix *= 0.78 / irr; iz *= 0.78 / irr; }
      mk.grp.visible = true;
      mk.grp.position.set(ix, 0.003, iz);
      mk.mat.color.setHex(isDecoy ? HEX.decoy : tr.assignedBattery ? HEX.assigned : HEX.hostile);
      mk.mat.opacity = (off ? 0.25 : 0.68) + Math.sin(now * 3.2 + idx) * 0.14;
      // microlabel sprite
      if (idx < microLabels.length) {
        const l = microLabels[idx];
        const cssCol = isDecoy ? CSS.decoy : tr.assignedBattery ? CSS.assigned : '#ffd7cf';
        setMicroLabel(l, `${isDecoy ? '◇' : '◆'} ${tr.id}`, cssCol);
        l.spr.position.set(x, y + 0.075, z);
        l.spr.visible = true;
      }
      // rim bearing arc (hostiles only)
      const arc = threatArcs[idx];
      arc.visible = !isDecoy;
      if (arc.visible) {
        arc.material.color.setHex(tr.assignedBattery ? HEX.assigned : HEX.hostile);
        arc.material.opacity = 0.42 + 0.18 * Math.sin(now * 3.1 + idx * 2.3);
        arc.rotation.z = Math.atan2(-t.pos.z, t.pos.x);
      }
    }
    for (let i = bi; i < threatBlips.length; i++) {
      threatBlips[i].grp.visible = false;
      impactMarkers[i].grp.visible = false;
      threatArcs[i].visible = false;
    }
    for (let i = bi; i < microLabels.length; i++) microLabels[i].spr.visible = false;

    // selection pulse ring
    if (selPos) {
      const ph = (now % 1.4) / 1.4;
      pulseRing.visible = true;
      pulseRing.position.set(selPos.x, 0.005, selPos.z);
      pulseRing.scale.setScalar(0.85 + ph * 1.15);
      pulseRing.material.opacity = 0.85 * (1 - ph);
    } else pulseRing.visible = false;

    // interceptors: cube blips + thin leader to their target
    let ii = 0;
    for (const it of ctx.interceptors?.active ?? []) {
      if (ii >= intBlips.length) break;
      const idx = ii;
      const b = intBlips[ii++];
      const x = clamp(it.pos.x * holoScale, -0.8, 0.8);
      const z = clamp(it.pos.z * holoScale, -0.8, 0.8);
      const y = clamp(it.pos.y * altScale, 0, 0.85);
      b.grp.visible = true;
      b.grp.position.set(x, 0, z);
      b.core.position.y = y;
      b.halo.position.y = y;
      b.hit.position.y = y;
      b.stem.scale.set(1, Math.max(y, 0.001), 1);
      const ld = intLeaders[idx];
      if (it.threat?.alive) {
        const tp = it.threat.pos;
        const lp = ld.geometry.attributes.position;
        lp.setXYZ(0, x, y, z);
        lp.setXYZ(1, clamp(tp.x * holoScale, -0.8, 0.8), clamp(tp.y * altScale, 0, 0.85), clamp(tp.z * holoScale, -0.8, 0.8));
        lp.needsUpdate = true;
        ld.visible = true;
      } else ld.visible = false;
    }
    for (let i = ii; i < intBlips.length; i++) {
      intBlips[i].grp.visible = false;
      intLeaders[i].visible = false;
    }
  }

  // first paint so the aux panes aren't black before the sim loop starts
  drawAuxLeft();
  drawAuxRight();

  const api = {
    tracks,
    screenTex,
    holo,
    get selectedTrackId() { return selectedTrackId; },
    selectTrack(id) {
      selectedTrackId = id;
      ctx.events.emit('track-selected', { id });
    },
    trackFor(threat) { return byThreat.get(threat); },
    getTrack(id) { return tracks.find((t) => t.id === id && !t.gone); },
    /** live, detected tracks */
    activeTracks() { return tracks.filter((t) => !t.gone && t.detected); },
    pickTrack(raycaster) {
      const targets = [];
      for (const b of threatBlips) if (b.grp.visible) targets.push(b.hit);
      const hits = raycaster.intersectObjects(targets, false);
      return hits.length ? hits[0].object.userData.trackId : null;
    },
    clear() {
      tracks.length = 0;
      byThreat.clear();
      trackCounter = 0;
      selectedTrackId = null;
    },
    update(dt) {
      const sweepAz = ctx.base?.radarHead ? ctx.base.radarHead.rotation.y % TAU : 0;
      // detection: sweep passes threat azimuth within range
      for (const tr of tracks) {
        if (tr.gone) continue;
        const t = tr.threat;
        if (!t.alive) continue;
        if (!tr.detected) {
          const range = Math.hypot(t.pos.x, t.pos.z);
          if (range < RADAR_RANGE) {
            const az = Math.atan2(t.pos.x, t.pos.z);
            // sweep advances CCW; crossed if target az sits between prev and now
            const ahead = wrapAngle(az - prevSweep);
            const behind = wrapAngle(az - sweepAz);
            if (ahead >= 0 && behind <= 0 && ahead - behind < 1.2) {
              tr.detected = true;
              tr.firstSeen = ctx.time.now;
              tr.classified = 'ACQUIRING';
              ctx.events.emit('threat-tracked', { track: tr });
            }
          }
        } else {
          classify(tr, dt);
          // history breadcrumbs
          if (ctx.time.now - tr.lastPing > 1.2) {
            tr.lastPing = ctx.time.now;
            tr.history.push([t.pos.x, t.pos.z, ctx.time.now]);
            if (tr.history.length > 10) tr.history.shift();
          }
        }
      }
      prevSweep = sweepAz;
      // purge long-gone tracks
      for (let i = tracks.length - 1; i >= 0; i--) {
        if (tracks[i].gone && ctx.time.now - tracks[i].goneAt > 6) tracks.splice(i, 1);
      }
      redrawAcc += dt;
      if (redrawAcc > 0.08) {
        redrawAcc = 0;
        drawPPI();
      }
      auxAcc += dt;
      if (auxAcc > 0.26) {
        auxAcc = 0;
        auxFlip = !auxFlip;
        if (auxFlip) drawAuxLeft();
        else drawAuxRight();
      }
      updateHolo();
    },
  };

  return api;
}
