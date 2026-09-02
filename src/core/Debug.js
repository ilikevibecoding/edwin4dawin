import * as THREE from 'three';

/**
 * Debug + screenshot tooling API, reachable as `window.__game.debug` (used by tools/shot.mjs).
 *
 *   debug.registerView(name, { pos:[x,y,z], yaw, pitch, fov?, hud?, weapon? })
 *   debug.setView(nameOrSpec)             // teleport player + look angles (degrees)
 *   debug.freeCam({ pos, lookAt })        // detach camera for cinematic shots; debug.restoreCam()
 *   debug.setHud(bool) / debug.setViewModel(bool)
 *   await debug.waitFrames(n) / await debug.waitTime(seconds)
 *   debug.views                            // all registered views
 *   window.__shotReady === true            // set once the first frame after load has rendered
 */
export class Debug {
  constructor(game) {
    this.game = game;
    this.views = {};
    this._freeCam = null;
    this._frameWaiters = [];
    this._ready = false;
    this._overlay = null;

    this.registerView('spawn', { pos: [0, 0, 18], yaw: 0, pitch: 0 });
    this.registerView('plaza_wide', { pos: [0, 0, 22], yaw: 0, pitch: 4 });
    this.registerView('plaza_low', { pos: [-8, 0, 10], yaw: 35, pitch: 2 });
    this.registerView('weapon_hero', { pos: [0, 0, 12], yaw: 0, pitch: -2, hud: false });
    this.registerView('weapon_ads', { pos: [0, 0, 12], yaw: 0, pitch: 0, ads: true, hud: false });
    this.registerView('sky', { pos: [0, 0, 0], yaw: 0, pitch: 35 });

    if (game.settings.debug) this._buildOverlay();
    game.events.on('frame:end', () => this._onFrame());
  }

  registerView(name, spec) {
    this.views[name] = spec;
  }

  setView(nameOrSpec) {
    const spec = typeof nameOrSpec === 'string' ? this.views[nameOrSpec] : nameOrSpec;
    if (!spec) throw new Error(`unknown view "${nameOrSpec}"`);
    const { player, weapons, render } = this.game;
    this.restoreCam();
    const pos = spec.pos ? new THREE.Vector3(spec.pos[0], spec.pos[1], spec.pos[2]) : null;
    player.setView(pos, spec.yaw ?? null, spec.pitch ?? null);
    if (spec.fov) {
      render.baseFov = spec.fov;
    }
    if (spec.hud != null) this.setHud(spec.hud);
    if (spec.weapon != null) this.setViewModel(spec.weapon);
    if (spec.ads != null && weapons?.setAiming) weapons.setAiming(!!spec.ads);
    if (spec.crouch != null) player.isCrouching = !!spec.crouch;
    if (spec.exec) {
      try {
        new Function('game', 'weapons', 'THREE', spec.exec)(this.game, weapons, THREE);
      } catch (err) {
        console.error('[debug] view exec failed', err);
      }
    }
    return spec;
  }

  /** Detach the camera from the player rig and place it freely (world space). */
  freeCam({ pos, lookAt, fov }) {
    const cam = this.game.camera;
    if (!this._freeCam) {
      this._freeCam = { parent: cam.parent };
      this.game.scene.attach(cam);
      this.game.player.controlsEnabled = false;
    }
    cam.position.set(pos[0], pos[1], pos[2]);
    if (lookAt) cam.lookAt(new THREE.Vector3(lookAt[0], lookAt[1], lookAt[2]));
    if (fov) this.game.render.baseFov = fov;
    this.game.render.shakeAmount = 0;
    cam.updateMatrixWorld(true);
  }

  restoreCam() {
    if (!this._freeCam) return;
    const cam = this.game.camera;
    this._freeCam.parent.add(cam);
    cam.position.set(0, 0, 0);
    cam.rotation.set(0, 0, 0);
    this._freeCam = null;
    this.game.player.controlsEnabled = true;
  }

  get isFreeCam() {
    return !!this._freeCam;
  }

  setHud(v) {
    this.game.hud.setVisible(v);
  }

  setViewModel(v) {
    this.game.render.viewmodelVisible = v;
    this.game.weapons?.setVisible?.(v);
  }

  waitFrames(n = 1) {
    return new Promise((resolve) => this._frameWaiters.push({ frames: n, resolve }));
  }

  waitTime(seconds) {
    const target = this.game.time + seconds;
    return new Promise((resolve) => this._frameWaiters.push({ untilTime: target, resolve }));
  }

  _onFrame() {
    if (!this._ready && this.game.frame > 2) {
      this._ready = true;
      window.__shotReady = true;
    }
    for (let i = this._frameWaiters.length - 1; i >= 0; i--) {
      const w = this._frameWaiters[i];
      if (w.frames != null) {
        w.frames--;
        if (w.frames <= 0) {
          this._frameWaiters.splice(i, 1);
          w.resolve();
        }
      } else if (w.untilTime != null && this.game.time >= w.untilTime) {
        this._frameWaiters.splice(i, 1);
        w.resolve();
      }
    }
    if (this._overlay && this.game.frame % 15 === 0) this._updateOverlay();
  }

  _buildOverlay() {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;left:8px;bottom:8px;font:11px/1.4 monospace;color:#9f9;background:rgba(0,0,0,.55);padding:6px 8px;pointer-events:none;z-index:50;white-space:pre';
    document.body.appendChild(el);
    this._overlay = el;
  }

  _updateOverlay() {
    const g = this.game;
    const info = g.render.renderer.info;
    const p = g.player.position;
    this._overlay.textContent =
      `fps ${g.stats.fps.toFixed(0)}  frame ${g.stats.frameMs.toFixed(1)}ms\n` +
      `calls ${info.render.calls}  tris ${(info.render.triangles / 1000).toFixed(0)}k  geo ${info.memory.geometries} tex ${info.memory.textures}\n` +
      `pos ${p.x.toFixed(1)} ${p.y.toFixed(1)} ${p.z.toFixed(1)}  yaw ${THREE.MathUtils.radToDeg(g.player.yaw).toFixed(0)} pitch ${THREE.MathUtils.radToDeg(g.player.pitch).toFixed(0)}\n` +
      `enemies ${g.enemies.aliveCount}  bodies ${g.physics.dynamicBodyCount}  state ${g.state}  q ${g.settings.qualityName}`;
  }

  update() {}
}
