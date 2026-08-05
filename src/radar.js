// radar.js — the physical radar installation (rotating phased-array on a trailer) and the
// fictional track store: detection on sweep crossings, track quality growth, decoy
// classification, predicted impact points. Feeds HUD, console scope and guidance quality.
import * as THREE from 'three';
import { makeCanvas, clamp, lerp, tintGeometry } from './utils.js';
import { predictImpact } from './physics.js';
import { makeBoxCollider } from './physics.js';

const _v1 = new THREE.Vector3();
const CALLSIGNS = ['BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'FOXTROT', 'GOLF', 'HOTEL', 'INDIA', 'JULIET', 'KILO'];

export class Radar {
  constructor(scene, base) {
    this.scene = scene;
    this.base = base;
    this.detectRange = 8600;
    this.sweepPeriod = 2.4;      // seconds per revolution (fictional)
    this.sweepAngle = 0;
    this.prevSweep = 0;
    this.tracks = new Map();     // threat.id -> track
    this.trackSerial = 0;
    this.onNewTrack = null;
    this.onLostTrack = null;
    this.time = 0;

    this._build();
  }

  _build() {
    const P = this.base.radarSite.pos;
    const g = new THREE.Group();
    g.position.set(P.x, 0, P.z);
    g.rotation.y = 0.4;
    const mats = this.base.materials;

    // trailer bed
    const bed = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.5, 2.6), mats.paint);
    tint(bed.geometry, 0x49523e);
    bed.position.y = 1.0;
    bed.castShadow = bed.receiveShadow = true;
    g.add(bed);
    for (const wx of [-1.7, 1.7]) for (const s of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.36, 12), mats.paint);
      tint(wheel.geometry, 0x161616);
      wheel.geometry.rotateX(Math.PI / 2);
      wheel.position.set(wx, 0.5, s * 1.16);
      g.add(wheel);
    }
    // outriggers
    for (const [lx, lz] of [[-2.4, 1.4], [-2.4, -1.4], [2.4, 1.4], [2.4, -1.4]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0), mats.steel);
      tint(leg.geometry, 0x5c6156);
      leg.position.set(lx, 0.5, lz);
      g.add(leg);
    }
    // electronics cabin
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.3, 2.3), mats.paint);
    tint(cab.geometry, 0x424a38);
    cab.position.set(-1.5, 1.9, 0);
    cab.castShadow = true;
    g.add(cab);

    // rotating pedestal + array
    this.pedestal = new THREE.Group();
    this.pedestal.position.set(0.9, 1.35, 0);
    g.add(this.pedestal);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 0.8, 12), mats.steel);
    tint(ped.geometry, 0x3a3e35);
    ped.position.y = 0.4;
    this.pedestal.add(ped);

    // array face with procedural element pattern
    const arrTex = new THREE.CanvasTexture(makeCanvas(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#39413a';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#2d342e';
      for (let y = 12; y < h - 12; y += 14) {
        for (let x = 12; x < w - 12; x += 14) {
          ctx.beginPath();
          ctx.arc(x, y, 4.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.strokeStyle = '#242a25';
      ctx.lineWidth = 5;
      ctx.strokeRect(4, 4, w - 8, h - 8);
    }));
    arrTex.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(
      new THREE.BoxGeometry(3.3, 2.7, 0.28),
      [
        new THREE.MeshStandardMaterial({ color: 0x39413a, roughness: 0.7 }),
        new THREE.MeshStandardMaterial({ color: 0x39413a, roughness: 0.7 }),
        new THREE.MeshStandardMaterial({ color: 0x39413a, roughness: 0.7 }),
        new THREE.MeshStandardMaterial({ color: 0x39413a, roughness: 0.7 }),
        new THREE.MeshStandardMaterial({ map: arrTex, roughness: 0.62, metalness: 0.25 }),
        new THREE.MeshStandardMaterial({ color: 0x39413a, roughness: 0.7 }),
      ]
    );
    face.position.set(0, 2.1, 0);
    face.rotation.x = -0.32; // tilted skyward
    face.castShadow = true;
    this.pedestal.add(face);
    // support arms
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.6, 0.14), mats.steel);
      tint(arm.geometry, 0x51564c);
      arm.position.set(s * 1.2, 1.25, 0.28);
      arm.rotation.x = 0.35;
      this.pedestal.add(arm);
    }
    // IFF bar on top
    const iff = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.12), mats.steel);
    tint(iff.geometry, 0x666b60);
    iff.position.set(0, 3.5, -0.15);
    this.pedestal.add(iff);
    // obstruction light
    this.obsLight = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xff2211, toneMapped: false, transparent: true }));
    this.obsLight.position.set(0, 3.62, 0);
    this.pedestal.add(this.obsLight);

    this.base.colliders.push(makeBoxCollider(new THREE.Vector3(P.x, 1.5, P.z), new THREE.Vector3(6, 3, 3.2), 0.4));
    this.scene.add(g);
    this.group = g;
  }

  startScenario() {
    this.tracks.clear();
    this.trackSerial = 0;
  }

  // sweep crossing detection: a threat becomes a track when the beam passes its azimuth
  update(dt, t, threats) {
    this.time = t;
    this.prevSweep = this.sweepAngle;
    this.sweepAngle = (this.sweepAngle + (dt / this.sweepPeriod) * Math.PI * 2) % (Math.PI * 2);
    this.pedestal.rotation.y = this.sweepAngle;
    this.obsLight.material.opacity = Math.sin(t * 2.4) > 0.4 ? 1 : 0.12;

    // detect
    for (const th of threats) {
      if (!th.alive || this.tracks.has(th.id)) continue;
      const range = Math.hypot(th.pos.x, th.pos.z, th.pos.y);
      if (range > this.detectRange) continue;
      const az = (Math.atan2(th.pos.z, th.pos.x) + Math.PI * 2) % (Math.PI * 2);
      if (sweptOver(this.prevSweep, this.sweepAngle, az)) {
        this.trackSerial += 1;
        const cs = `${CALLSIGNS[(this.trackSerial - 1) % CALLSIGNS.length]}-${this.trackSerial}`;
        const track = {
          id: th.id,
          callsign: cs,
          threat: th,
          quality: 0.3,
          firstSeen: t,
          classified: false,      // decoy known?
          predImpact: new THREE.Vector3(),
          predImpactT: 0,
          assignedBattery: null,
          engagedBy: 0,
          lastResult: null,
        };
        this.tracks.set(th.id, track);
        if (this.onNewTrack) this.onNewTrack(track);
      }
    }

    // update tracks
    for (const [id, tr] of this.tracks) {
      const th = tr.threat;
      if (!th.alive) {
        // keep dead tracks briefly for UI, then drop
        tr.dropTimer = (tr.dropTimer || 0) + dt;
        if (tr.dropTimer > 3) {
          this.tracks.delete(id);
          if (this.onLostTrack) this.onLostTrack(tr);
        }
        continue;
      }
      tr.quality = Math.min(1, tr.quality + dt * 0.11);
      // decoys get classified once track matures (fictional discrimination timeline)
      if (th.decoy && !tr.classified && t - tr.firstSeen > 6.5) tr.classified = true;
      tr.predImpactT = predictImpact(th.pos, th.vel, th.dragK, tr.predImpact);
    }
  }

  trackList() {
    return [...this.tracks.values()].filter((t) => t.threat.alive);
  }

  get liveTrackCount() { return this.trackList().length; }
}

function sweptOver(a0, a1, az) {
  // did the sweep pass az between a0 -> a1 (wrapping)?
  if (a0 <= a1) return az >= a0 && az <= a1;
  return az >= a0 || az <= a1;
}

function tint(geo, color) {
  tintGeometry(geo, color);
}
