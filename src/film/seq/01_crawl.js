import * as THREE from 'three';
import { Sequence, ramp, ease, clamp } from '../../core/timeline.js';
import { buildStarfield } from '../../world/space.js';
import { svgPlane, crawlSvg } from '../../svg/assets.js';
import { CRAWL } from '../../story.js';

/*
 * The crawl.
 *
 * A single tall plane of text lying flat in the world, travelling away from a
 * camera tipped slightly down. Perspective does the rest: the near edge runs off
 * the bottom of frame while the far edge converges on a vanishing point just
 * above centre. Exponential fog swallows the top so the text dissolves into the
 * star field instead of ending on a hard edge.
 */
export class CrawlSequence extends Sequence {
  constructor() {
    super('crawl', {
      duration: 45,
      fadeIn: 0,
      fadeOut: 1.6,
      exposure: 1.0,
      bloom: { strength: 0.55, radius: 0.6, threshold: 0.75 },
    });
    this.cues = [
      { t: 0.0, kind: 'cue', name: 'crawl' },
      { t: 1.6, kind: 'vo', id: 'c01' },
      { t: 13.4, kind: 'vo', id: 'c02' },
      { t: 27.0, kind: 'vo', id: 'c03' },
    ];
  }

  async build(ctx) {
    const s = this.scene;
    s.background = new THREE.Color(0x000000);
    s.fog = new THREE.FogExp2(0x000000, 0.0042);

    this.stars = buildStarfield({ count: 2600, radius: 900 });
    s.add(this.stars);

    const svg = crawlSvg({
      episode: CRAWL.episode,
      title: CRAWL.title,
      paragraphs: CRAWL.paragraphs,
      width: 1400,
    });
    // The plane is 3.2x taller than it is wide; laid flat it becomes the ramp
    // of text running to the horizon.
    this.crawl = await svgPlane(svg, { width: 96, height: 307, glow: 0.5, doubleSide: true });
    this.crawl.rotation.x = -Math.PI / 2;      // lie flat; texture +v points to -z
    this.crawl.position.set(0, 0, 60);
    s.add(this.crawl);

    s.add(new THREE.AmbientLight(0xffffff, 1.0));
  }

  enter(ctx) {
    ctx.rig.reset();
  }

  update(t, dt, ctx) {
    const u = t / this.duration;
    this.crawl.position.z = 96 - u * 372;
    this.crawl.material.opacity = 1 - ramp(t, 41.5, 44.6);

    this.stars.userData.update?.(t, dt);

    // Tip down at the end so the star field fills frame before the cut.
    const tilt = ease('inout', ramp(t, 39, 44.5));
    ctx.rig.set(
      [0, 11.5, 96],
      [0, 11.5 - 4.2 - tilt * 26, -110],
      36,
    );
  }
}
