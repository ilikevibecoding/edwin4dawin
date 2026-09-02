import * as THREE from 'three';
import { setText, setClass, clamp } from './dom.js';

/**
 * World-space objective marker ("CAPTURE B" in the reference). Projects `world.getObjective().position + 2 m`
 * through the main camera every frame, hides when behind the camera, clamps to a screen margin when off
 * screen and shrinks with distance.
 */
export class ObjectiveMarker {
  constructor(game, root) {
    this.game = game;
    this.el = root;
    this.labelEl = root.querySelector('.objmarker__label');
    this.distEl = root.querySelector('.objmarker__dist');
    this.letterEl = root.querySelector('.objmarker__letter');
    this._v = new THREE.Vector3();
    this._cs = new THREE.Vector3();
    this._shown = null;
    this._lastTransform = '';
    this.height = 2.0;
    this.tone = 'gold';
    this.enabled = true;
  }

  setLabel(text, tone = 'gold') {
    setText(this.labelEl, text);
    if (tone !== this.tone) {
      this.tone = tone;
      setClass(this.el, 'objmarker--blue', tone === 'blue');
      setClass(this.el, 'objmarker--red', tone === 'red');
      setClass(this.el, 'objmarker--gold', tone === 'gold');
    }
  }

  _show(v) {
    if (this._shown !== v) {
      this._shown = v;
      this.el.style.display = v ? '' : 'none';
    }
  }

  update() {
    const { game } = this;
    const obj = game.world?.getObjective?.();
    const cam = game.camera;
    if (!obj || !cam || !this.enabled) return this._show(false);
    if (this.letterEl && this.letterEl._t !== obj.name) setText(this.letterEl, obj.name || 'B');

    const v = this._v.copy(obj.position);
    v.y += this.height;
    // Camera-space depth test (three's project() folds points behind the camera back into view).
    this._cs.copy(v).applyMatrix4(cam.matrixWorldInverse);
    if (this._cs.z > -0.3) return this._show(false);

    v.project(cam);
    const w = window.innerWidth;
    const h = window.innerHeight;
    const mx = w * 0.05;
    const my = h * 0.1;
    const x = clamp((v.x * 0.5 + 0.5) * w, mx, w - mx);
    const y = clamp((-v.y * 0.5 + 0.5) * h, my, h - my * 1.6);

    const p = game.player?.position;
    const d = p ? Math.hypot(p.x - obj.position.x, p.z - obj.position.z) : this._cs.length();
    const s = clamp(1.12 - d / 70, 0.62, 1);
    const tf = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-100%) scale(${s.toFixed(3)})`;
    if (tf !== this._lastTransform) {
      this._lastTransform = tf;
      this.el.style.transform = tf;
    }
    setText(this.distEl, `${Math.round(d)} M`);
    this._show(true);
  }
}
