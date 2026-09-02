import * as THREE from 'three';

const _dir = new THREE.Vector3();
const _q = new THREE.Quaternion();
const Z = new THREE.Vector3(0, 0, 1);

/**
 * Lightweight world-space muzzle flashes for enemy rifles (the fx team's MuzzleFlash is bound to the
 * first-person weapon camera). A small pool of additive quads: one camera-facing star and one flame
 * plane along the barrel, alive for ~2 frames. No lights — the tracer carries the visual energy.
 */
export class EnemyFx {
  constructor(game, { pool = 10 } = {}) {
    this.game = game;
    this.group = new THREE.Group();
    this.group.name = 'EnemyMuzzleFlashes';
    game.scene.add(this.group);
    const tex = this._makeTexture();
    this.starMat = new THREE.MeshBasicMaterial({
      map: tex,
      color: new THREE.Color(3.4, 2.5, 1.4),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
      fog: false,
    });
    this.flameMat = this.starMat.clone();
    this.flameMat.color.setRGB(2.8, 1.7, 0.7);
    const geo = new THREE.PlaneGeometry(1, 1);
    const flameGeo = new THREE.PlaneGeometry(1, 1);
    flameGeo.translate(0, 0, -0.5); // base at the muzzle, extends along -Z
    flameGeo.rotateX(Math.PI / 2); // plane lies along the barrel axis
    this.items = [];
    for (let i = 0; i < pool; i++) {
      const root = new THREE.Group();
      root.visible = false;
      const star = new THREE.Mesh(geo, this.starMat);
      const flame = new THREE.Mesh(flameGeo, this.flameMat);
      const flame2 = new THREE.Mesh(flameGeo, this.flameMat);
      flame2.rotation.z = Math.PI / 2;
      for (const m of [star, flame, flame2]) {
        m.frustumCulled = false;
        m.renderOrder = 25;
      }
      root.add(star, flame, flame2);
      this.group.add(root);
      this.items.push({ root, star, flame, flame2, life: 0 });
    }
    this._next = 0;
    this.hold = 2; // frames a flash stays visible (debug views raise it so a still frame can catch one)
  }

  _makeTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,240,200,0.9)');
    g.addColorStop(0.6, 'rgba(255,170,80,0.35)');
    g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** Show a flash at `position` pointing along `direction` (world). */
  flash(position, direction) {
    const it = this.items[this._next];
    this._next = (this._next + 1) % this.items.length;
    it.root.position.copy(position);
    _dir.copy(direction).normalize();
    _q.setFromUnitVectors(Z, _dir.negate()); // group -Z along the barrel
    it.root.quaternion.copy(_q);
    const s = 0.22 + Math.random() * 0.12;
    it.star.scale.setScalar(s * 1.5);
    it.star.rotation.z = Math.random() * Math.PI;
    it.flame.scale.set(s * 0.9, 1, s * 2.2);
    it.flame2.scale.set(s * 0.9, 1, s * 2.2);
    it.root.visible = true;
    it.root.updateMatrixWorld(true);
    it.star.lookAt(this.game.camera.getWorldPosition(_dir)); // billboard (lookAt handles the rotated parent)
    it.life = this.hold;
  }

  update() {
    for (const it of this.items) {
      if (!it.root.visible) continue;
      if (--it.life <= 0) it.root.visible = false;
    }
  }

  dispose() {
    this.group.removeFromParent();
    this.starMat.map?.dispose();
    this.starMat.dispose();
    this.flameMat.dispose();
  }
}
