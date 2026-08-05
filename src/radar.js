// radar.js — fictional track management + PPI scope (canvas texture) + a
// stylized 3D holographic radar table. Detection timing follows the visible
// rotating array; all behavior is a gameplay abstraction.
import * as THREE from 'three';
import { TAU, clamp, wrapAngle, pad2 } from './util.js';

const RADAR_RANGE = 9000; // fictional display range, meters
const ALT_SCALE_MAX = 7000;

export function createRadar(ctx) {
  const { scene, textures } = ctx;
  const tracks = [];
  const byThreat = new Map();
  let trackCounter = 0;
  let selectedTrackId = null;

  // ------------------------------------------------ PPI scope canvas
  const cw = 512;
  const canvas = document.createElement('canvas');
  canvas.width = cw; canvas.height = cw;
  const g = canvas.getContext('2d');
  const screenTex = new THREE.CanvasTexture(canvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  if (ctx.base?.consoleScreen) {
    ctx.base.consoleScreen.material = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false });
  }

  // ------------------------------------------------ holo table display
  const holo = new THREE.Group();
  const holoScale = 0.78 / RADAR_RANGE;
  const altScale = 0.42 / ALT_SCALE_MAX;
  if (ctx.base?.holoAnchor) ctx.base.holoAnchor.add(holo);

  {
    const discMat = new THREE.MeshBasicMaterial({ color: 0x06333d, transparent: true, opacity: 0.55, depthWrite: false });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.8, 48), discMat);
    disc.rotation.x = -Math.PI / 2;
    holo.add(disc);
    const ringMat = new THREE.LineBasicMaterial({ color: 0x2ec8de, transparent: true, opacity: 0.5 });
    for (let r = 1; r <= 3; r++) {
      const pts = [];
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * TAU;
        pts.push(new THREE.Vector3(Math.cos(a) * 0.26 * r, 0.002, Math.sin(a) * 0.26 * r));
      }
      holo.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat));
    }
    for (let s = 0; s < 8; s++) {
      const a = (s / 8) * TAU;
      const pts = [new THREE.Vector3(0, 0.002, 0), new THREE.Vector3(Math.cos(a) * 0.78, 0.002, Math.sin(a) * 0.78)];
      holo.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x1a7c8c, transparent: true, opacity: 0.3 })));
    }
    // north marker
    const nMark = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.07), new THREE.MeshBasicMaterial({ map: textures.label('N', { fg: '#7fe8f8', w: 64, h: 64, font: 'bold 44px Arial' }), transparent: true, depthWrite: false }));
    nMark.rotation.x = -Math.PI / 2;
    nMark.position.set(0, 0.004, 0.86);
    holo.add(nMark);
    // base marker
    const bm = new THREE.Mesh(new THREE.OctahedronGeometry(0.014), new THREE.MeshBasicMaterial({ color: 0x9ff3ff }));
    bm.position.y = 0.006;
    holo.add(bm);
  }

  // holo sweep wedge
  const sweepMat = new THREE.MeshBasicMaterial({ color: 0x2ee8ff, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
  const sweepGeo = new THREE.CircleGeometry(0.78, 12, 0, 0.5);
  const sweep = new THREE.Mesh(sweepGeo, sweepMat);
  sweep.rotation.x = -Math.PI / 2;
  sweep.position.y = 0.004;
  holo.add(sweep);

  // blip pools
  const mkBlip = (color) => {
    const grp = new THREE.Group();
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.016), new THREE.MeshBasicMaterial({ color }));
    grp.add(core);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    grp.add(hit);
    const stemGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]);
    const stem = new THREE.Line(stemGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.42 }));
    grp.add(stem);
    const ringM = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.026, 20), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    ringM.rotation.x = -Math.PI / 2;
    grp.add(ringM);
    const sel = new THREE.Mesh(new THREE.RingGeometry(0.032, 0.038, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    sel.rotation.x = -Math.PI / 2;
    sel.visible = false;
    grp.add(sel);
    grp.visible = false;
    holo.add(grp);
    return { grp, core, hit, stem, ringM, sel };
  };
  const threatBlips = Array.from({ length: 10 }, () => mkBlip(0xff5340));
  const intBlips = Array.from({ length: 12 }, () => mkBlip(0x37e0ff));

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

  // ------------------------------------------------ PPI drawing
  let redrawAcc = 0;
  function drawPPI() {
    g.fillStyle = '#03150c';
    g.fillRect(0, 0, cw, cw);
    const cx = cw / 2, cy = cw / 2;
    const R = cw / 2 - 10;
    // range rings
    g.strokeStyle = 'rgba(46,200,122,0.35)';
    g.lineWidth = 1;
    for (let r = 1; r <= 4; r++) {
      g.beginPath();
      g.arc(cx, cy, (R * r) / 4, 0, TAU);
      g.stroke();
    }
    g.strokeStyle = 'rgba(46,200,122,0.2)';
    for (let s = 0; s < 12; s++) {
      const a = (s / 12) * TAU;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      g.stroke();
    }
    // range labels
    g.fillStyle = 'rgba(46,200,122,0.6)';
    g.font = '13px monospace';
    for (let r = 1; r <= 4; r++) {
      g.fillText(`${((RADAR_RANGE * r) / 4 / 1000).toFixed(0)}k`, cx + 4, cy - (R * r) / 4 + 14);
    }
    // sweep
    const sweepAz = ctx.base?.radarHead ? ctx.base.radarHead.rotation.y : 0;
    const drawA = -sweepAz + Math.PI / 2; // world az → screen
    const grad = g.createConicGradient ? null : null;
    g.save();
    g.translate(cx, cy);
    g.rotate(drawA);
    const sw = g.createLinearGradient(0, 0, R, 0);
    sw.addColorStop(0, 'rgba(64,255,150,0.0)');
    sw.addColorStop(1, 'rgba(64,255,150,0.16)');
    g.fillStyle = sw;
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, R, -0.5, 0.02);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(120,255,180,0.8)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(R, 0);
    g.stroke();
    g.restore();
    void grad;

    const toScreen = (x, z) => {
      // world az: atan2(x, z); PPI: north (=+z world? use -z north) up.
      const px = cx + (x / RADAR_RANGE) * R;
      const py = cy + (z / RADAR_RANGE) * R;
      return [px, py];
    };
    // base marker
    g.strokeStyle = '#9ff3c8';
    g.strokeRect(cx - 4, cy - 4, 8, 8);

    // threat blips
    for (const tr of tracks) {
      if (tr.gone || !tr.detected) continue;
      const t = tr.threat;
      const [px, py] = toScreen(t.pos.x, t.pos.z);
      // history trail
      g.fillStyle = 'rgba(120,255,170,0.25)';
      for (const h of tr.history) {
        const [hx, hy] = toScreen(h[0], h[1]);
        g.fillRect(hx - 1, hy - 1, 2, 2);
      }
      const isDecoy = tr.classified.startsWith('DECOY');
      g.fillStyle = isDecoy ? '#c9a6ff' : '#ff6a55';
      g.beginPath();
      g.moveTo(px, py - 6); g.lineTo(px + 6, py); g.lineTo(px, py + 6); g.lineTo(px - 6, py);
      g.closePath();
      g.fill();
      g.fillStyle = '#d7ffe8';
      g.font = 'bold 13px monospace';
      g.fillText(tr.id, px + 8, py - 4);
      g.font = '11px monospace';
      g.fillStyle = 'rgba(215,255,232,0.7)';
      g.fillText(`${(t.pos.y / 1000).toFixed(1)}km`, px + 8, py + 8);
      if (tr.id === selectedTrackId) {
        g.strokeStyle = '#ffffff';
        g.lineWidth = 1.6;
        g.beginPath();
        g.arc(px, py, 11, 0, TAU);
        g.stroke();
      }
      if (tr.assignedBattery) {
        g.strokeStyle = '#ffd257';
        g.lineWidth = 1;
        g.strokeRect(px - 9, py - 9, 18, 18);
      }
    }
    // interceptor blips
    g.fillStyle = '#37e0ff';
    for (const it of ctx.interceptors?.active ?? []) {
      const [px, py] = toScreen(it.pos.x, it.pos.z);
      g.fillRect(px - 2.5, py - 2.5, 5, 5);
    }
    // header
    g.fillStyle = '#baf7d4';
    g.font = 'bold 15px monospace';
    g.fillText('IVX-9 SURVEILLANCE', 12, 20);
    g.font = '12px monospace';
    g.fillStyle = 'rgba(186,247,212,0.75)';
    const active = tracks.filter((t) => !t.gone && t.detected).length;
    g.fillText(`TRACKS ${active}  RNG ${(RADAR_RANGE / 1000).toFixed(0)}KM  MODE TBM`, 12, 38);
    screenTex.needsUpdate = true;
  }

  // ------------------------------------------------ holo update
  function updateHolo() {
    sweep.rotation.z = (ctx.base?.radarHead?.rotation.y ?? 0) + Math.PI / 2;
    let bi = 0;
    for (const tr of tracks) {
      if (tr.gone || !tr.detected || bi >= threatBlips.length) continue;
      const b = threatBlips[bi++];
      const t = tr.threat;
      const x = clamp(t.pos.x * holoScale, -0.8, 0.8);
      const z = clamp(t.pos.z * holoScale, -0.8, 0.8);
      const y = clamp(t.pos.y * altScale, 0, 0.5);
      b.grp.visible = true;
      b.grp.position.set(x, 0, z);
      b.core.position.y = y;
      b.hit.position.y = y;
      b.stem.scale.set(1, y, 1);
      const isDecoy = tr.classified.startsWith('DECOY');
      const col = isDecoy ? 0xc9a6ff : tr.assignedBattery ? 0xffd257 : 0xff5340;
      b.core.material.color.setHex(col);
      b.stem.material.color.setHex(col);
      b.ringM.material.color.setHex(col);
      b.sel.visible = tr.id === selectedTrackId;
      b.sel.position.y = 0.004;
      b.hit.userData.trackId = tr.id;
      b.core.userData.trackId = tr.id;
    }
    for (; bi < threatBlips.length; bi++) threatBlips[bi].grp.visible = false;
    let ii = 0;
    for (const it of ctx.interceptors?.active ?? []) {
      if (ii >= intBlips.length) break;
      const b = intBlips[ii++];
      b.grp.visible = true;
      b.grp.position.set(clamp(it.pos.x * holoScale, -0.8, 0.8), 0, clamp(it.pos.z * holoScale, -0.8, 0.8));
      b.core.position.y = clamp(it.pos.y * altScale, 0, 0.5);
      b.stem.scale.set(1, clamp(it.pos.y * altScale, 0.001, 0.5), 1);
    }
    for (; ii < intBlips.length; ii++) intBlips[ii].grp.visible = false;
  }

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
            tr.history.push([t.pos.x, t.pos.z]);
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
      updateHolo();
    },
  };

  return api;
}
