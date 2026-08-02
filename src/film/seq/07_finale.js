import * as THREE from 'three';
import { Sequence, ramp, ease, clamp } from '../../core/timeline.js';
import { buildStarfield } from '../../world/space.js';
import { buildXwing } from '../../lego/ships.js';
import { EngineTrails, Explosions, BrickDebris } from '../../fx/effects.js';
import { svgPlane, svgToCanvas, logoSvg, endCardSvg } from '../../svg/assets.js';
import { boxGeometry, BRICK } from '../../lego/kit.js';
import { getMaterial, FINISH } from '../../core/materials.js';
import { makeRng } from '../../core/rng.js';

/*
 * Curtain.
 *
 * The survivors fly out through the debris, and then the film does the one
 * thing only a LEGO film can: several thousand 1x1 bricks fly in out of the
 * dark and click together into the title.
 */
export class FinaleSequence extends Sequence {
  constructor() {
    super('finale', {
      duration: 26,
      fadeIn: 1.2,
      fadeOut: 3.2,
      exposure: 1.0,
      bloom: { strength: 0.75, radius: 0.6, threshold: 0.7 },
    });
    this.cues = [
      { t: 0.0, kind: 'sfx', name: 'engine_whoosh', opts: { gain: 0.8 } },
      { t: 5.4, kind: 'stop', name: 'triumph', fade: 2.4 },
      { t: 6.2, kind: 'sfx', name: 'brick_scatter', opts: { gain: 0.8 } },
      { t: 6.4, kind: 'cue', name: 'fanfare', opts: { gain: 0.95 } },
      { t: 10.4, kind: 'vo', id: 'n11' },
      { t: 12.2, kind: 'sfx', name: 'brick_scatter', opts: { gain: 0.55 } },
      { t: 17.6, kind: 'cue', name: 'end' },
    ];
  }

  async build(ctx) {
    const s = this.scene;
    s.background = new THREE.Color(0x010206);

    this.stars = buildStarfield({ count: 3200, radius: 2200 });
    s.add(this.stars);

    const key = new THREE.DirectionalLight(0xfff0d8, 2.6);
    key.position.set(30, 40, 60);
    s.add(key);
    const fill = new THREE.DirectionalLight(0x86b4ff, 1.0);
    fill.position.set(-40, -10, 30);
    s.add(fill);
    s.add(new THREE.HemisphereLight(0x9fc4ff, 0x101820, 0.7));

    this.wings = [];
    for (let i = 0; i < 3; i++) {
      const x = buildXwing({ sFoils: true });
      s.add(x);
      this.wings.push(x);
    }
    this.trails = new EngineTrails(s, { color: 0xa9ecff });
    for (const x of this.wings) for (const e of x.userData.engines || []) this.trails.attach(e, { radius: 0.55, length: 18 });

    this.booms = new Explosions(s, {});
    this.debris = new BrickDebris(s, {});

    // Debris field left over from the station.
    const rng = makeRng('finale-debris');
    this.rubble = new THREE.Group();
    const geo = boxGeometry(2, 2, BRICK, { studs: true });
    const mat = getMaterial(0x8b9296, FINISH.plastic);
    const rubbleMesh = new THREE.InstancedMesh(geo, mat, 220);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    this.rubbleSpin = [];
    for (let i = 0; i < 220; i++) {
      const p = new THREE.Vector3(rng.range(-160, 160), rng.range(-90, 90), rng.range(-420, 40));
      const k = rng.range(0.6, 3.4);
      sc.setScalar(k);
      q.setFromEuler(new THREE.Euler(rng.range(0, 6.28), rng.range(0, 6.28), rng.range(0, 6.28)));
      m.compose(p, q, sc);
      rubbleMesh.setMatrixAt(i, m);
      this.rubbleSpin.push({ p, k, ax: rng.range(-1, 1), ay: rng.range(-1, 1), sp: rng.range(0.1, 0.5) });
    }
    rubbleMesh.instanceMatrix.needsUpdate = true;
    this.rubbleMesh = rubbleMesh;
    this.rubble.add(rubbleMesh);
    s.add(this.rubble);

    // --- the title, built out of 1x1 bricks -------------------------------
    this.mosaic = await buildBrickMosaic(
      logoSvg({ title: 'STAR WARS' }),
      { cols: 132, rows: 54, cell: 0.62, seed: 'title' },
    );
    this.mosaic.position.set(0, 2.4, -46);
    s.add(this.mosaic);

    this.endCard = await svgPlane(endCardSvg({
      title: 'A LEGO FILM',
      subtitle: 'every brick, note and title placed by code',
    }), { width: 44, height: 12, glow: 0.35, opacity: 0 });
    this.endCard.position.set(0, -14.5, -46);
    s.add(this.endCard);

    this._v = new THREE.Vector3();
  }

  enter(ctx) { ctx.rig.reset(); }

  update(t, dt, ctx) {
    // --- fly-through -------------------------------------------------------
    const flyOut = clamp(t / 6.4);
    for (let i = 0; i < this.wings.length; i++) {
      const x = this.wings[i];
      const lag = i * 0.5;
      const u = clamp((t - lag) / 6.4);
      x.visible = t < 6.6;
      x.position.set(
        (i - 1) * 13 + Math.sin(t * 0.8 + i) * 3,
        3 + Math.sin(t * 0.6 + i * 2) * 4,
        -260 + ease('in', u) * 320,
      );
      x.rotation.set(0, Math.PI, Math.sin(t * 1.1 + i) * 0.35);
      x.userData.setSFoils?.(1);
    }
    this.trails.setThrottle(1);
    this.trails.update(t, dt);

    // Tumbling wreckage, fading out as the title takes over.
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    for (let i = 0; i < this.rubbleSpin.length; i++) {
      const r = this.rubbleSpin[i];
      sc.setScalar(r.k);
      q.setFromEuler(new THREE.Euler(t * r.sp * r.ax, t * r.sp * r.ay, t * r.sp * 0.3));
      m.compose(r.p, q, sc);
      this.rubbleMesh.setMatrixAt(i, m);
    }
    this.rubbleMesh.instanceMatrix.needsUpdate = true;
    this.rubble.visible = t < 8.4;

    this.booms.update(t, dt);
    this.debris.update(t, dt);
    this.stars.userData.update?.(t, dt);

    // --- assembly ----------------------------------------------------------
    this.mosaic.userData.setProgress(clamp((t - 6.2) / 7.4));
    this.mosaic.visible = t > 6.0;

    this.endCard.material.opacity = 0.95 * ramp(t, 15.6, 17.4);
    this.endCard.visible = t > 15.4;

    // --- camera --------------------------------------------------------------
    if (t < 6.2) {
      const u = t / 6.2;
      ctx.rig.set([16 - u * 8, 8 - u * 4, 60 - u * 22], [0, 2, -140], 44);
      ctx.rig.handheld(0.03, 0.5);
    } else {
      const u = clamp((t - 6.2) / 19.8);
      const ang = -0.42 + ease('inout', u) * 0.42;
      const d = 96 - ease('inout', u) * 34;
      ctx.rig.set(
        [Math.sin(ang) * d, 4.5 - u * 3.5, -46 + Math.cos(ang) * d],
        [0, 0.6 - u * 2.4, -46],
        40 - u * 4,
      );
      ctx.rig.handheld(0.012, 0.3);
    }
  }
}

/**
 * Rasterise an SVG, sample it on a grid, and return an InstancedMesh of 1x1
 * bricks that fly in from the dark and settle into the picture.
 * userData.setProgress(0..1) drives the build.
 */
async function buildBrickMosaic(svg, { cols, rows, cell, seed }) {
  const canvas = await svgToCanvas(svg, cols * 3, rows * 3);
  const g = canvas.getContext('2d', { willReadFrequently: true });
  const img = g.getImageData(0, 0, canvas.width, canvas.height).data;
  const sx = canvas.width / cols;
  const sy = canvas.height / rows;

  const cells = [];
  const rng = makeRng(seed);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      // average the block
      let r = 0, gg = 0, b = 0, a = 0, n = 0;
      for (let y = (j * sy) | 0; y < ((j + 1) * sy) | 0; y += 2) {
        for (let x = (i * sx) | 0; x < ((i + 1) * sx) | 0; x += 2) {
          const o = (y * canvas.width + x) * 4;
          const al = img[o + 3] / 255;
          r += img[o] * al; gg += img[o + 1] * al; b += img[o + 2] * al; a += al; n++;
        }
      }
      if (!n || a / n < 0.35) continue;
      cells.push({
        i, j,
        color: new THREE.Color((r / a) / 255, (gg / a) / 255, (b / a) / 255).convertSRGBToLinear(),
      });
    }
  }

  const geo = boxGeometry(1, 1, BRICK, { studs: true });
  const mat = getMaterial(0xffffff, FINISH.plastic, { tag: 'mosaic' });
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, cells.length));
  mesh.castShadow = false;
  mesh.receiveShadow = false;

  const w = cols * cell, h = rows * cell;
  const parts = cells.map((c) => {
    const target = new THREE.Vector3(-w / 2 + c.i * cell, h / 2 - c.j * cell, 0);
    const dir = new THREE.Vector3(rng.range(-1, 1), rng.range(-1, 1), rng.range(0.2, 1)).normalize();
    return {
      target,
      start: target.clone().addScaledVector(dir, rng.range(90, 400)),
      spin: new THREE.Euler(rng.range(0, 6.28), rng.range(0, 6.28), rng.range(0, 6.28)),
      delay: rng.range(0, 0.62),
      color: c.color,
    };
  });
  parts.forEach((p, i) => mesh.setColorAt(i, p.color));
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  const group = new THREE.Group();
  group.add(mesh);
  group.userData.brickCount = parts.length;

  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler();
  const _s = new THREE.Vector3(cell / 1.0, cell / 1.0, cell / 1.0);
  const _p = new THREE.Vector3();

  group.userData.setProgress = (u) => {
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const k = ease('expoOut', clamp((u - p.delay) / (1 - p.delay + 1e-4)));
      _p.lerpVectors(p.start, p.target, k);
      _e.set(p.spin.x * (1 - k), p.spin.y * (1 - k), p.spin.z * (1 - k));
      _q.setFromEuler(_e);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  group.userData.setProgress(0);
  return group;
}
