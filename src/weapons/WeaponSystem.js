import * as THREE from 'three';

/**
 * First-person weapons. STUB — the real rifle, arms and animation live in src/weapons/* (weapon team).
 *
 * Required interface:
 *   async load()
 *   update(dt)
 *   current -> { name, ammo, magSize, reserve, state: 'idle'|'firing'|'reloading'|'sprinting'|'inspecting'|'drawing',
 *                isAiming, fireRate (rpm), damage }
 *   viewModelRoot -> Object3D parented to game.camera (layer VIEWMODEL)
 *   getMuzzleWorldPosition(out: Vector3) -> Vector3
 *   fire() / reload() / setAiming(bool) / setVisible(bool)
 *
 * Emits: 'weapon:fire' { origin, direction, muzzle, weapon, spread }, 'weapon:casing' { position, velocity, angularVelocity },
 *        'weapon:reload:start' {duration}, 'weapon:reload:end', 'weapon:empty', 'weapon:ammo' { ammo, magSize, reserve },
 *        'weapon:aim' { aiming }
 * Firing resolution (raycast, damage) is done by Combat listening to 'weapon:fire'.
 */
export class WeaponSystem {
  constructor(game) {
    this.game = game;
    this.events = game.events;
    this.viewModelRoot = new THREE.Group();
    this.viewModelRoot.name = 'ViewModel';
    game.camera.add(this.viewModelRoot);
    this.current = {
      name: 'M4A1',
      ammo: 30,
      magSize: 30,
      reserve: 180,
      state: 'idle',
      isAiming: false,
      fireRate: 800,
      damage: 34,
      spreadHip: 0.012,
      spreadAds: 0.0015,
    };
    this._cooldown = 0;
    this._reloadTimer = 0;
    this._recoil = 0;
    this._muzzle = new THREE.Object3D();
    this._tmpO = new THREE.Vector3();
    this._tmpD = new THREE.Vector3();
  }

  async load() {
    // Placeholder rifle: grey boxes so the pipeline (view model camera / layer) can be validated.
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.62), new THREE.MeshStandardMaterial({ color: 0x4a4d52, roughness: 0.55, metalness: 0.7 }));
    body.position.set(0, -0.02, -0.25);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.14, 0.07), new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.6, metalness: 0.5 }));
    mag.position.set(0, -0.12, -0.16);
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.08), new THREE.MeshStandardMaterial({ color: 0x1a1b1e, roughness: 0.5, metalness: 0.6 }));
    sight.position.set(0, 0.06, -0.12);
    this.gun = new THREE.Group();
    this.gun.add(body, mag, sight);
    this._muzzle.position.set(0, 0, -0.58);
    this.gun.add(this._muzzle);
    this.gun.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    this.viewModelRoot.add(this.gun);
    this.basePosition = new THREE.Vector3(0.19, -0.2, -0.32);
    this.gun.position.copy(this.basePosition);
    this.game.render.setViewModel(this.viewModelRoot);
    this.events.emit('weapon:ammo', { ammo: this.current.ammo, magSize: this.current.magSize, reserve: this.current.reserve });
  }

  getMuzzleWorldPosition(out = new THREE.Vector3()) {
    return this._muzzle.getWorldPosition(out);
  }

  setVisible(v) { this.viewModelRoot.visible = v; }

  setAiming(aiming) {
    if (this.current.isAiming === aiming) return;
    this.current.isAiming = aiming;
    this.game.player.isAiming = aiming;
    this.game.render.setAds(aiming ? 1 : 0, 1.35);
    this.events.emit('weapon:aim', { aiming });
  }

  fire() {
    const w = this.current;
    if (this._cooldown > 0 || w.state === 'reloading') return false;
    if (w.ammo <= 0) {
      this.events.emit('weapon:empty', {});
      this._cooldown = 0.25;
      return false;
    }
    w.ammo--;
    this._cooldown = 60 / w.fireRate;
    w.state = 'firing';
    const { origin, direction } = this.game.player.getViewRay(this._tmpO, this._tmpD);
    const spread = w.isAiming ? w.spreadAds : w.spreadHip;
    this.events.emit('weapon:fire', { origin: origin.clone(), direction: direction.clone(), muzzle: this.getMuzzleWorldPosition(), weapon: w, spread });
    this.events.emit('weapon:ammo', { ammo: w.ammo, magSize: w.magSize, reserve: w.reserve });
    this.game.player.addViewPunch(-0.012, (Math.random() - 0.5) * 0.006);
    this._recoil = 1;
    return true;
  }

  reload() {
    const w = this.current;
    if (w.state === 'reloading' || w.ammo === w.magSize || w.reserve <= 0) return;
    w.state = 'reloading';
    this._reloadTimer = 2.1;
    this.events.emit('weapon:reload:start', { duration: this._reloadTimer });
  }

  update(dt) {
    const { input, player } = this.game;
    const w = this.current;
    if (dt > 0) {
      this._cooldown = Math.max(0, this._cooldown - dt);
      const canUse = player.alive && this.game.isPlaying && player.controlsEnabled;
      if (w.state === 'reloading') {
        this._reloadTimer -= dt;
        if (this._reloadTimer <= 0) {
          const need = w.magSize - w.ammo;
          const take = Math.min(need, w.reserve);
          w.ammo += take;
          w.reserve -= take;
          w.state = 'idle';
          this.events.emit('weapon:reload:end', {});
          this.events.emit('weapon:ammo', { ammo: w.ammo, magSize: w.magSize, reserve: w.reserve });
        }
      } else if (this._cooldown === 0 && w.state === 'firing') {
        w.state = 'idle';
      }
      if (canUse) {
        this.setAiming(input.isDown('aim') && !player.isSprinting && w.state !== 'reloading');
        if (input.isDown('fire')) this.fire();
        if (input.justPressed('reload') || (w.ammo === 0 && input.justPressed('fire'))) this.reload();
      } else {
        this.setAiming(false);
      }
      this._recoil = Math.max(0, this._recoil - dt * 12);
    }
    // Simple sway/bob/recoil on the placeholder
    const t = this.game.time;
    const bob = player.bobAmount;
    const target = this.basePosition.clone();
    if (w.isAiming) target.set(0, -0.085, -0.22);
    this.gun.position.lerp(target, Math.min(1, dt * 14));
    this.gun.position.x += Math.sin(player.bobPhase) * 0.012 * bob * (w.isAiming ? 0.2 : 1);
    this.gun.position.y += Math.abs(Math.cos(player.bobPhase)) * 0.008 * bob * (w.isAiming ? 0.2 : 1) + Math.sin(t * 1.3) * 0.0015;
    this.gun.position.z += this._recoil * 0.035;
    this.gun.rotation.set(this._recoil * 0.06, Math.sin(t * 0.9) * 0.004, Math.sin(player.bobPhase * 0.5) * 0.01 * bob);
  }
}
