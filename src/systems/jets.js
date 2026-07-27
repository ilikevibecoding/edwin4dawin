import * as THREE from 'three';
import { rand, randRange, randSpread } from '../core/rand.js';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _side = new THREE.Vector3();
const _m4 = new THREE.Matrix4();
const _up = new THREE.Vector3(0, 1, 0);

/** Soft cross-fade texture for trail ribbons (alpha bell across V). */
function stripTexture() {
  const c = document.createElement('canvas');
  c.width = 2; c.height = 64;
  const g = c.getContext('2d');
  const img = g.createImageData(2, 64);
  for (let y = 0; y < 64; y++) {
    const v = y / 63;
    const bell = Math.sin(v * Math.PI);
    const a = Math.round(255 * Math.pow(bell, 1.4));
    for (let x = 0; x < 2; x++) {
      const i = (y * 2 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = a;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/**
 * Camera-facing triangle-strip trail (contrails, bomb smoke).
 * Built from a rolling list of world points; width grows and alpha fades
 * with age. Regular triangles (not THREE.Points) — reliable under software GL.
 */
class TrailRibbon {
  constructor(scene, material, { maxPoints = 96, life = 2.6, w0 = 0.3, w1 = 2.2, alpha = 0.36, minDist = 2.4 } = {}) {
    this.scene = scene;
    this.max = maxPoints;
    this.life = life;
    this.w0 = w0; this.w1 = w1;
    this.alpha = alpha;
    this.minDistSq = minDist * minDist;
    this.pts = []; // { p: Vector3, t: birth time }
    this.emitting = true;

    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(maxPoints * 2 * 3);
    this.col = new Float32Array(maxPoints * 2 * 4);
    this.uv = new Float32Array(maxPoints * 2 * 2);
    for (let i = 0; i < maxPoints; i++) {
      this.uv[(i * 2) * 2] = i / maxPoints; this.uv[(i * 2) * 2 + 1] = 0;
      this.uv[(i * 2 + 1) * 2] = i / maxPoints; this.uv[(i * 2 + 1) * 2 + 1] = 1;
    }
    const idx = new Uint16Array((maxPoints - 1) * 6);
    for (let i = 0; i < maxPoints - 1; i++) {
      const a = i * 2, o = i * 6;
      idx[o] = a; idx[o + 1] = a + 1; idx[o + 2] = a + 2;
      idx[o + 3] = a + 1; idx[o + 4] = a + 3; idx[o + 5] = a + 2;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('uv', new THREE.BufferAttribute(this.uv, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.setDrawRange(0, 0);
    this.geo = geo;
    this.mesh = new THREE.Mesh(geo, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 15;
    scene.add(this.mesh);
  }

  emit(p, time) {
    if (!this.emitting) return;
    const last = this.pts[this.pts.length - 1];
    if (last && last.p.distanceToSquared(p) < this.minDistSq) return;
    if (this.pts.length >= this.max) this.pts.shift();
    this.pts.push({ p: p.clone(), t: time });
  }

  /** @returns true while still alive (has visible points or is emitting) */
  update(time, camPos) {
    while (this.pts.length && time - this.pts[0].t > this.life) this.pts.shift();
    const n = this.pts.length;
    if (n < 2) {
      this.geo.setDrawRange(0, 0);
      this.mesh.visible = false;
      return this.emitting;
    }
    this.mesh.visible = true;
    for (let i = 0; i < n; i++) {
      const cur = this.pts[i].p;
      const prev = this.pts[Math.max(0, i - 1)].p;
      const next = this.pts[Math.min(n - 1, i + 1)].p;
      _v1.subVectors(next, prev); // along trail
      _v2.subVectors(cur, camPos); // view dir
      _side.crossVectors(_v1, _v2);
      if (_side.lengthSq() < 1e-8) _side.set(0, 1, 0); else _side.normalize();
      const age = (time - this.pts[i].t) / this.life;
      const w = (this.w0 + (this.w1 - this.w0) * Math.pow(age, 0.65)) * 0.5;
      // fade in quickly at the head, out slowly at the tail
      const a = this.alpha * Math.pow(1 - age, 1.35) * Math.min(1, age / 0.05 + 0.25);
      const j = i * 6;
      this.pos[j] = cur.x + _side.x * w; this.pos[j + 1] = cur.y + _side.y * w; this.pos[j + 2] = cur.z + _side.z * w;
      this.pos[j + 3] = cur.x - _side.x * w; this.pos[j + 4] = cur.y - _side.y * w; this.pos[j + 5] = cur.z - _side.z * w;
      const k = i * 8;
      this.col[k] = this.col[k + 4] = 1;
      this.col[k + 1] = this.col[k + 5] = 1;
      this.col[k + 2] = this.col[k + 6] = 1;
      this.col[k + 3] = this.col[k + 7] = a;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.geo.setDrawRange(0, (n - 1) * 6);
    return true;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.geo.dispose();
  }
}

/**
 * Strike aviation: procedural F-16-style jets in a 3-ship vic, wingtip
 * contrails, visible pylon ordnance, ballistic bomb drops with smoke trails.
 *
 * API (used by Airstrike):
 *   strike({ target, dir, tToTarget, speed, impacts, onRelease, onImpact })
 *     impacts: [{ pos: Vector3 (ground y), t: seconds-from-now }]
 *   update(dt)
 */
export class JetSystem {
  constructor(game) {
    this.game = game;
    this.time = 0;
    this.wings = [];
    this.bombs = [];
    this.ribbons = [];
    this.gravity = 34; // slightly cinematic-fast fall

    const tex = stripTexture();
    // cool-white so the vapor reads against the warm sunset sky
    this.contrailMat = new THREE.MeshBasicMaterial({
      map: tex, color: 0xdde6ec, vertexColors: true, transparent: true,
      depthWrite: false, side: THREE.DoubleSide, fog: false,
    });
    this.bombTrailMat = new THREE.MeshBasicMaterial({
      map: tex, color: 0xb9b4ac, vertexColors: true, transparent: true,
      depthWrite: false, side: THREE.DoubleSide, fog: false,
    });

    this._buildMaterials();
    this.bombProto = this._buildBombProto();
    this.jetProto = this._buildJetProto();
  }

  _buildMaterials() {
    // fog off: aircraft live against the sky — the dust haze would erase
    // them at spawn distance (~280m) and real jets read as crisp silhouettes
    this.mats = {
      airframe: new THREE.MeshStandardMaterial({ color: 0x878d96, metalness: 0.42, roughness: 0.52, fog: false }),
      dark: new THREE.MeshStandardMaterial({ color: 0x2e3238, metalness: 0.62, roughness: 0.42, fog: false }),
      radome: new THREE.MeshStandardMaterial({ color: 0x4a4e55, metalness: 0.3, roughness: 0.6, fog: false }),
      canopy: new THREE.MeshStandardMaterial({ color: 0x0d1218, metalness: 1.0, roughness: 0.08, envMapIntensity: 2.2, fog: false }),
      bomb: new THREE.MeshStandardMaterial({ color: 0x3b4034, metalness: 0.28, roughness: 0.66, fog: false }),
      fin: new THREE.MeshStandardMaterial({ color: 0x33372e, metalness: 0.3, roughness: 0.6, side: THREE.DoubleSide, fog: false }),
      burner: new THREE.MeshBasicMaterial({
        color: new THREE.Color(3.6, 1.7, 0.55), transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      }),
      burnerCore: new THREE.MeshBasicMaterial({
        color: new THREE.Color(7, 4.4, 1.8), transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      }),
    };
  }

  /** Mk-82-style bomb: body + nose + boat-tail + 4 fins (~80 tris). */
  _buildBombProto() {
    const g = new THREE.Group();
    const tube = (rT, rB, len, z, mat) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(rT, rB, len, 7), mat);
      m.rotation.x = -Math.PI / 2; // cylinder top (+y) -> -z (nose)
      m.position.z = z;
      g.add(m);
      return m;
    };
    tube(0.03, 0.17, 0.5, -0.78, this.mats.bomb);   // nose cone
    tube(0.17, 0.17, 1.1, 0.02, this.mats.bomb);    // body
    tube(0.17, 0.09, 0.5, 0.82, this.mats.bomb);    // boat tail
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.3), this.mats.fin);
      fin.rotation.y = Math.PI / 2;                  // fin plane along z
      fin.position.set(0, 0.2, 0.92);
      const holder = new THREE.Group();
      holder.rotation.z = (i * Math.PI) / 2;
      holder.add(fin);
      g.add(holder);
    }
    return g;
  }

  /** F-16-style strike fighter, nose along -z (~500 tris). */
  _buildJetProto() {
    const g = new THREE.Group();
    const M = this.mats;
    const tube = (rT, rB, len, z, mat = M.airframe, seg = 8) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(rT, rB, len, seg), mat);
      m.rotation.x = -Math.PI / 2;
      m.position.z = z;
      g.add(m);
      return m;
    };
    const flat = (points, thick, mat = M.airframe) => {
      // points in (x, z); extrude thin along y
      const shape = new THREE.Shape();
      shape.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = Math.PI / 2; // shape (x,y) -> world (x,z), depth -> -y
      return m;
    };

    // fuselage
    tube(0.05, 0.3, 1.2, -6.2, M.radome);            // radome tip
    tube(0.3, 0.55, 2.0, -4.6);                      // nose
    tube(0.55, 0.63, 3.4, -1.9);                     // forward
    tube(0.63, 0.6, 3.6, 1.6);                       // mid
    tube(0.6, 0.42, 3.0, 4.9);                       // aft taper
    tube(0.42, 0.31, 0.8, 6.75, M.dark);             // nozzle
    // dorsal spine
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.34, 3.6), M.airframe);
    spine.position.set(0, 0.4, 0.9);
    g.add(spine);
    // canopy bubble (dark glass)
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.48, 9, 6), M.canopy);
    canopy.scale.set(0.72, 0.74, 1.85);
    canopy.position.set(0, 0.44, -2.85);
    g.add(canopy);
    // intake under forward fuselage
    const intake = tube(0.32, 0.28, 2.4, -0.9, M.airframe);
    intake.position.y = -0.44;
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.29, 8), M.dark);
    mouth.position.set(0, -0.44, -2.11);
    mouth.rotation.y = Math.PI;
    g.add(mouth);

    // wings (single symmetric piece, swept)
    const wing = flat([
      [-4.9, 1.8], [0, -1.1], [4.9, 1.8], [4.9, 3.0], [0, 3.4], [-4.9, 3.0],
    ], 0.1);
    wing.position.y = 0.02;
    g.add(wing);
    // horizontal stabilators
    const stab = flat([
      [-2.6, 5.3], [0, 4.5], [2.6, 5.3], [2.6, 6.15], [0, 6.5], [-2.6, 6.15],
    ], 0.08);
    stab.position.y = -0.04;
    g.add(stab);
    // vertical fin (shape in (z, y), thin along x)
    {
      const shape = new THREE.Shape();
      shape.moveTo(4.5, 0.3); shape.lineTo(6.6, 0.42); shape.lineTo(6.9, 2.35); shape.lineTo(6.05, 2.4);
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.09, bevelEnabled: false });
      const fin = new THREE.Mesh(geo, M.airframe);
      fin.rotation.y = -Math.PI / 2; // shape x -> world z
      fin.position.x = 0.045;
      g.add(fin);
    }

    // underwing pylons + visible bombs (named so clones can be found)
    const pylonX = [-2.7, -1.55, 1.55, 2.7];
    for (let i = 0; i < 4; i++) {
      const py = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.26, 1.35), M.dark);
      py.position.set(pylonX[i], -0.2, 2.35);
      g.add(py);
      const bomb = this.bombProto.clone();
      bomb.name = `pylonBomb${i}`;
      bomb.position.set(pylonX[i], -0.52, 2.35);
      g.add(bomb);
    }

    // afterburner glow (flickered every frame while flying)
    const burner = new THREE.Mesh(new THREE.ConeGeometry(0.3, 2.1, 8, 1, true), M.burner);
    burner.name = 'burner';
    burner.rotation.x = Math.PI / 2; // cone tip -> +z (trailing flame)
    burner.position.set(0, 0, 8.15);
    g.add(burner);
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.17, 1.1, 8, 1, true), M.burnerCore);
    core.name = 'burnerCore';
    core.rotation.x = Math.PI / 2;
    core.position.set(0, 0, 7.6);
    g.add(core);

    g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    burner.castShadow = core.castShadow = false;
    return g;
  }

  /**
   * Launch a 3-ship strike run. The LEAD jet crosses `target` exactly at
   * `tToTarget` seconds from now (synced to the jet-scream audio peak).
   */
  strike({ target, dir, tToTarget = 3.3, speed = 85, altitude = 56, impacts = [], onRelease = null, onImpact = null }) {
    const side = _v1.copy(dir).cross(_up).clone().normalize();
    const wing = {
      t: 0, target: target.clone(), dir: dir.clone(), side,
      tToTarget, speed, exitT: tToTarget + 5.2,
      jets: [], releases: [], onRelease, onImpact, firstReleaseDone: false,
    };

    // vic formation: lead center, wingmen trail left/right, stepped up
    const form = [
      { lat: 0, back: 0, alt: altitude, phase: rand() * 6 },
      { lat: -9, back: 11, alt: altitude + 3.5, phase: rand() * 6 },
      { lat: 9.5, back: 17, alt: altitude + 6, phase: rand() * 6 },
    ];
    for (let j = 0; j < 3; j++) {
      const f = form[j];
      const group = this.jetProto.clone();
      const pylonBombs = [];
      for (let i = 0; i < 4; i++) pylonBombs.push(group.getObjectByName(`pylonBomb${i}`));
      const burner = group.getObjectByName('burner');
      const burnerCore = group.getObjectByName('burnerCore');
      this.game.scene.add(group);
      const trails = [
        this._ribbon(this.contrailMat, { maxPoints: 96, life: 2.9, w0: 0.5, w1: 3.0, alpha: 0.62, minDist: 2.4 }),
        this._ribbon(this.contrailMat, { maxPoints: 96, life: 2.9, w0: 0.5, w1: 3.0, alpha: 0.62, minDist: 2.4 }),
      ];
      wing.jets.push({ ...f, group, pylonBombs, nextPylon: 0, burner, burnerCore, trails });
    }

    // schedule bomb releases so each bomb lands exactly at its impact time
    impacts.forEach((imp, i) => {
      const jetIdx = i % 3;
      const jet = wing.jets[jetIdx];
      const fall = Math.sqrt((2 * Math.max(4, jet.alt - 0.6 - imp.pos.y)) / this.gravity);
      wing.releases.push({ tRel: imp.t - fall, tImp: imp.t, index: i, jetIdx, pos: imp.pos.clone(), done: false });
    });
    wing.releases.sort((a, b) => a.tRel - b.tRel);

    this.wings.push(wing);
    this._placeJets(wing); // position immediately so same-frame renders are correct
    return wing;
  }

  _ribbon(mat, opts) {
    const r = new TrailRibbon(this.game.scene, mat, opts);
    this.ribbons.push(r);
    return r;
  }

  _placeJets(wing) {
    const alongLead = (wing.t - wing.tToTarget) * wing.speed;
    // attack profile: cruise in high (+38m) so the approach reads over the
    // rooflines, tip in between T1..T2, run the pass low and level
    const DROP = 38, T1 = 0.8, T2 = 2.5;
    const k = THREE.MathUtils.clamp((T2 - wing.t) / (T2 - T1), 0, 1);
    const desc = DROP * k * k * (3 - 2 * k); // smoothstep let-down
    const sinkRate = (DROP * 6 * k * (1 - k)) / (T2 - T1);
    const pitchDown = Math.atan2(sinkRate, wing.speed);
    for (const jet of wing.jets) {
      const weave = Math.sin(wing.t * 0.7 + jet.phase) * 1.5;
      const bank = -Math.cos(wing.t * 0.7 + jet.phase) * 0.085 + Math.sin(wing.t * 2.3 + jet.phase * 2) * 0.02;
      const along = alongLead - jet.back;
      jet.group.position.copy(wing.target)
        .addScaledVector(wing.dir, along)
        .addScaledVector(wing.side, jet.lat + weave);
      jet.group.position.y = jet.alt + desc + Math.sin(wing.t * 1.1 + jet.phase) * 0.7;
      // Matrix4.lookAt points local +z from target toward eye, so aiming the
      // "eye" at +dir puts the nose (-z) on the flight vector
      _m4.lookAt(_v2.set(0, 0, 0), _v3.copy(wing.dir), _up);
      jet.group.quaternion.setFromRotationMatrix(_m4);
      jet.group.rotateX(-pitchDown); // nose onto the descending velocity vector
      jet.group.rotateZ(bank);
      // afterburner flicker
      const f = 0.8 + rand() * 0.45;
      jet.burner.scale.set(1, f, 1);
      jet.burnerCore.scale.set(1, 0.9 + rand() * 0.3, 1);
      jet.group.updateMatrixWorld(true);
      // wingtip contrails
      jet.trails[0].emit(_v2.set(-4.85, 0.02, 2.9).applyMatrix4(jet.group.matrixWorld), this.time);
      jet.trails[1].emit(_v2.set(4.85, 0.02, 2.9).applyMatrix4(jet.group.matrixWorld), this.time);
    }
  }

  _release(wing, rel) {
    rel.done = true;
    const jet = wing.jets[rel.jetIdx];
    // take the next loaded pylon bomb off the rack
    const pylon = jet.pylonBombs[jet.nextPylon % 4];
    jet.nextPylon++;
    let releasePos;
    if (pylon) {
      pylon.updateMatrixWorld(true);
      releasePos = new THREE.Vector3().setFromMatrixPosition(pylon.matrixWorld);
      pylon.visible = false;
    } else {
      releasePos = jet.group.position.clone();
      releasePos.y -= 0.6;
    }
    // exact ballistic solve: hit rel.pos at rel.tImp
    const F = Math.max(0.35, rel.tImp - wing.t);
    const vel = new THREE.Vector3(
      (rel.pos.x - releasePos.x) / F,
      (rel.pos.y - releasePos.y + 0.5 * this.gravity * F * F) / F,
      (rel.pos.z - releasePos.z) / F,
    );
    const mesh = this.bombProto.clone();
    mesh.position.copy(releasePos);
    mesh.scale.setScalar(1.35); // slight readability bump once airborne
    mesh.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    this.game.scene.add(mesh);
    const trail = this._ribbon(this.bombTrailMat, { maxPoints: 48, life: 1.1, w0: 0.14, w1: 0.65, alpha: 0.62, minDist: 1.1 });
    this.bombs.push({
      mesh, vel, trail, wing, index: rel.index, tImp: rel.tImp, pos: rel.pos,
      spin: randSpread(1) > 0 ? 5 : -5, roll: rand() * Math.PI * 2,
    });
    if (!wing.firstReleaseDone) {
      wing.firstReleaseDone = true;
      wing.onRelease?.(rel.index, releasePos);
    }
  }

  update(dt) {
    if (dt > 0) this.time += dt;
    const camPos = this.game.camera.position;

    // wings
    for (let i = this.wings.length - 1; i >= 0; i--) {
      const w = this.wings[i];
      w.t += dt;
      if (w.t > w.exitT) {
        for (const jet of w.jets) {
          this.game.scene.remove(jet.group);
          for (const tr of jet.trails) tr.emitting = false;
        }
        this.wings.splice(i, 1);
        continue;
      }
      this._placeJets(w);
      for (const rel of w.releases) {
        if (!rel.done && w.t >= rel.tRel) this._release(w, rel);
      }
    }

    // bombs (ballistic, timed to land exactly at tImp)
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];
      const t = b.wing.t; // wing timeline drives exact impact timing
      b.vel.y -= this.gravity * dt;
      b.mesh.position.addScaledVector(b.vel, dt);
      // orient nose (-z) to velocity + slow roll
      _m4.lookAt(_v2.set(0, 0, 0), _v3.copy(b.vel).normalize(), _up);
      b.mesh.quaternion.setFromRotationMatrix(_m4);
      b.roll += b.spin * dt;
      b.mesh.rotateZ(b.roll);
      b.trail.emit(_v2.copy(b.mesh.position).addScaledVector(_v3.copy(b.vel).normalize(), 1.0), this.time);
      if (t >= b.tImp || b.mesh.position.y <= b.pos.y) {
        this.game.scene.remove(b.mesh);
        b.trail.emitting = false;
        b.wing.onImpact?.(b.index, b.pos);
        this.bombs.splice(i, 1);
      }
    }

    // trails
    for (let i = this.ribbons.length - 1; i >= 0; i--) {
      if (!this.ribbons[i].update(this.time, camPos)) {
        this.ribbons[i].dispose();
        this.ribbons.splice(i, 1);
      }
    }
  }
}
