import * as THREE from 'three';
import { Sequence, ramp, ease } from '../../core/timeline.js';
import { buildStarfield } from '../../world/space.js';
import { svgPlane, longAgoSvg, logoSvg } from '../../svg/assets.js';

/*
 * Cold open. Silence, one line of pale blue text, then the logo hits with the
 * fanfare and falls away into the stars.
 */
export class OpeningSequence extends Sequence {
  constructor() {
    super('opening', {
      duration: 15.4,
      fadeIn: 0.8,
      fadeOut: 0,           // runs straight into the crawl
      exposure: 1.0,
      bloom: { strength: 0.85, radius: 0.7, threshold: 0.62 },
    });
    this.cues = [
      { t: 1.4, kind: 'vo', id: 'n01' },
      { t: 6.95, kind: 'cue', name: 'fanfare' },
      { t: 6.95, kind: 'sfx', name: 'low_boom', opts: { gain: 0.7 } },
    ];
  }

  async build(ctx) {
    const s = this.scene;
    s.background = new THREE.Color(0x000000);

    this.stars = buildStarfield({ count: 2400, radius: 900 });
    s.add(this.stars);

    this.longAgo = await svgPlane(longAgoSvg({}), { width: 46, height: 12, glow: 0.35, opacity: 0 });
    this.longAgo.position.set(0, 0.4, -60);
    s.add(this.longAgo);

    this.logo = await svgPlane(logoSvg({ title: 'STAR WARS' }), { width: 62, height: 26, glow: 0.55, opacity: 0 });
    this.logo.position.set(0, 0, -46);
    s.add(this.logo);

    s.add(new THREE.AmbientLight(0xffffff, 1.0));
  }

  enter(ctx) {
    ctx.rig.reset();
    ctx.rig.set([0, 0, 0], [0, 0, -100], 38);
  }

  update(t, dt, ctx) {
    // "A long time ago..." — up, hold, out.
    const a = Math.min(ramp(t, 0.9, 2.2), 1 - ramp(t, 5.3, 6.4));
    this.longAgo.material.opacity = a;
    this.longAgo.visible = a > 0.002;

    // The logo lands full-frame on the downbeat and recedes for the rest of
    // the sequence; distance is exponential so the shrink reads as constant.
    const L = (t - 6.95) / 8.2;
    if (L < 0) {
      this.logo.visible = false;
    } else {
      this.logo.visible = true;
      const u = Math.min(1, L);
      const d = 46 * Math.pow(1 + u * 13.5, 1.32);
      this.logo.position.z = -d;
      this.logo.material.opacity = Math.min(1, L * 26) * (1 - ramp(t, 14.3, 15.35));
    }

    this.stars.userData.update?.(t, dt);
    ctx.rig.set([0, 0, 0], [0, 0, -100], 38);
  }
}
