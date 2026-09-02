import * as THREE from 'three';

/**
 * Procedural strike fighter (F/A-18-ish, ~15 m long, 11 m span) and free-fall bomb (Mk-82-ish) meshes.
 * Built along +Z (nose forward) so Object3D.lookAt() points the nose along the velocity.
 * Emissive nozzle glow > 1 blooms; afterburner flames are additive cones flickered per frame.
 */

const BODY_MAT = new THREE.MeshStandardMaterial({ color: 0x545c66, roughness: 0.58, metalness: 0.32 });
const DARK_MAT = new THREE.MeshStandardMaterial({ color: 0x23262a, roughness: 0.7, metalness: 0.5 });
const CANOPY_MAT = new THREE.MeshStandardMaterial({ color: 0x0c1218, roughness: 0.12, metalness: 0.7 });
const GLOW_MAT = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.6, 0.55), toneMapped: false });
const FLAME_MAT = new THREE.MeshBasicMaterial({
  color: new THREE.Color(2.4, 1.2, 0.45), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending,
  depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
});
const BOMB_MAT = new THREE.MeshStandardMaterial({ color: 0x3b4034, roughness: 0.72, metalness: 0.25 });
const FIN_MAT = new THREE.MeshStandardMaterial({ color: 0x2b2e2a, roughness: 0.75, metalness: 0.3 });

/** Extruded planform (points in XY, +Y toward the nose) laid flat into XZ, `thick` meters thick. */
function slab(points, thick) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false });
  geo.translate(0, 0, -thick / 2);
  geo.rotateX(Math.PI / 2); // (x, y, z) → (x, -z, y): planform Y becomes world Z (forward)
  return geo;
}

/** Vertical fin: planform in XY (X along the fuselage, +X toward the nose, Y up), thin along Z, then X → Z. */
function fin(points, thick) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false });
  geo.translate(0, 0, -thick / 2);
  geo.rotateY(-Math.PI / 2); // (x, y, z) → (-z, y, x): fin length axis X becomes Z
  return geo;
}

function lathe(profile, segments = 24) {
  // profile: [radius, alongAxis] with the axis along +Z after rotation
  const pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(pts, segments);
  geo.rotateX(Math.PI / 2);
  return geo;
}

export function buildJetMesh() {
  const g = new THREE.Group();
  g.name = 'StrikeJet';

  // fuselage (slightly flattened lathe), nose at +7.5
  const fus = new THREE.Mesh(
    lathe([
      [0.03, 7.6], [0.28, 6.9], [0.6, 5.9], [0.9, 4.6], [1.02, 3.0], [1.08, 0.5], [1.05, -2.0],
      [0.95, -4.2], [0.82, -6.0], [0.62, -7.2], [0.5, -7.6],
    ], 28),
    BODY_MAT,
  );
  fus.scale.set(1.25, 0.82, 1);
  g.add(fus);

  // main wings (swept trapezoids), root at |x| = 1 → tip at 5.7
  const wingR = [[1.0, 2.0], [5.7, -1.6], [5.7, -2.7], [1.0, -3.8]];
  const wingL = wingR.map(([x, y]) => [-x, y]).reverse();
  const wR = new THREE.Mesh(slab(wingR, 0.16), BODY_MAT);
  const wL = new THREE.Mesh(slab(wingL, 0.16), BODY_MAT);
  wR.position.y = wL.position.y = -0.15;
  g.add(wR, wL);
  // leading-edge extensions blending the wing into the fuselage
  const lexR = [[0.9, 5.0], [1.6, 2.6], [1.6, 1.4], [0.9, 1.4]];
  const lexL = lexR.map(([x, y]) => [-x, y]).reverse();
  g.add(new THREE.Mesh(slab(lexR, 0.14), BODY_MAT), new THREE.Mesh(slab(lexL, 0.14), BODY_MAT));

  // horizontal stabilizers
  const stabR = [[0.9, -5.0], [3.3, -6.5], [3.3, -7.3], [0.9, -7.7]];
  const stabL = stabR.map(([x, y]) => [-x, y]).reverse();
  const sR = new THREE.Mesh(slab(stabR, 0.12), BODY_MAT);
  const sL = new THREE.Mesh(slab(stabL, 0.12), BODY_MAT);
  sR.position.y = sL.position.y = -0.05;
  g.add(sR, sL);

  // twin canted vertical tails
  const finPts = [[-3.4, 0.5], [-5.6, 3.0], [-6.9, 3.0], [-7.5, 0.5]];
  for (const side of [-1, 1]) {
    const f = new THREE.Mesh(fin(finPts, 0.12), BODY_MAT);
    f.position.set(side * 0.85, 0.35, 0);
    f.rotation.z = -side * 0.35;
    g.add(f);
  }

  // canopy
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), CANOPY_MAT);
  canopy.scale.set(0.58, 0.55, 1.75);
  canopy.position.set(0, 0.72, 3.9);
  g.add(canopy);

  // intakes (dark boxes under the LEX) and engine nacelles
  for (const side of [-1, 1]) {
    const intake = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.95, 3.2), DARK_MAT);
    intake.position.set(side * 1.45, -0.35, 0.6);
    g.add(intake);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.9, 16, 1, true), DARK_MAT);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(side * 0.6, -0.12, -7.5);
    g.add(nozzle);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.34, 16), GLOW_MAT);
    glow.position.set(side * 0.6, -0.12, -7.94);
    glow.rotation.y = Math.PI; // face backwards
    g.add(glow);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.36, 3.2, 12, 1, true), FLAME_MAT);
    flame.rotation.x = -Math.PI / 2; // cone +Y (tip) → -Z: tip trails behind the nozzle
    flame.position.set(side * 0.6, -0.12, -9.5);
    flame.name = 'flame';
    g.add(flame);
  }

  // wing pylons (bomb attach points)
  const pylons = [];
  for (const side of [-1, 1]) {
    for (const [px, pz] of [[2.0, -0.9], [3.4, -1.6]]) {
      const pyl = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 1.4), DARK_MAT);
      pyl.position.set(side * px, -0.5, pz);
      g.add(pyl);
      const anchor = new THREE.Object3D();
      anchor.position.set(side * px, -1.05, pz);
      g.add(anchor);
      pylons.push(anchor);
    }
  }
  // centreline drop tank silhouette
  const tank = new THREE.Mesh(lathe([[0.02, 2.6], [0.3, 1.6], [0.36, 0], [0.3, -1.8], [0.05, -2.6]], 16), BODY_MAT);
  tank.position.set(0, -1.05, -0.6);
  g.add(tank);

  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = o.material !== FLAME_MAT && o.material !== GLOW_MAT;
      o.frustumCulled = false;
    }
  });
  return { group: g, pylons, flames: g.children.filter((c) => c.name === 'flame') };
}

export function buildBombMesh(scale = 1.35) {
  const g = new THREE.Group();
  g.name = 'Bomb';
  const body = new THREE.Mesh(
    lathe([[0.02, 1.15], [0.13, 0.9], [0.23, 0.45], [0.27, 0.05], [0.27, -0.55], [0.21, -0.95], [0.15, -1.15]], 18),
    BOMB_MAT,
  );
  g.add(body);
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.42, 0.55), FIN_MAT);
    f.position.set(0, 0.32, -1.0);
    const holder = new THREE.Object3D();
    holder.add(f);
    holder.rotation.z = (i * Math.PI) / 2;
    g.add(holder);
  }
  g.scale.setScalar(scale);
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.frustumCulled = false;
    }
  });
  return g;
}

/** A jet flying a straight line at constant speed with a slight bank. */
export class Jet {
  constructor(game) {
    this.game = game;
    const built = buildJetMesh();
    this.group = built.group;
    this.pylons = built.pylons;
    this.flames = built.flames;
    this.position = this.group.position;
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3(0, 0, 1);
    this.alive = false;
    this.bank = 0;
    this.time = 0;
    this.group.visible = false;
    game.scene.add(this.group);
    game.render.setupObject(this.group);
    this._look = new THREE.Vector3();
  }

  spawn(position, direction, speed, bank = 0) {
    this.position.copy(position);
    this.direction.copy(direction).normalize();
    this.velocity.copy(this.direction).multiplyScalar(speed);
    this.bank = bank;
    this.time = 0;
    this.alive = true;
    this.group.visible = true;
    this._orient();
  }

  _orient() {
    this._look.copy(this.position).add(this.direction);
    this.group.lookAt(this._look);
    this.group.rotateZ(this.bank);
  }

  update(dt) {
    if (!this.alive) return;
    this.time += dt;
    this.position.addScaledVector(this.velocity, dt);
    this._orient();
    for (let i = 0; i < this.flames.length; i++) {
      const f = this.flames[i];
      const k = 0.85 + 0.3 * Math.sin(this.time * 47 + i * 2.1) * Math.sin(this.time * 31 + i);
      f.scale.set(k, 0.8 + 0.5 * Math.abs(Math.sin(this.time * 23 + i)), k);
    }
  }

  despawn() {
    this.alive = false;
    this.group.visible = false;
  }
}
