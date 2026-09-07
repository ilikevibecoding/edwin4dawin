import * as THREE from 'three';
import { Rng } from '../../core/seed';
import { bladeChordAt, bladePitchAt } from '../geometry/propeller';
import { canvas } from './common';

export interface PropBlurMaps {
  /** rgb: blade paint by radius (dark body, yellow tip band, a bright hairline at the very tip); a: the angular
   *  coverage of ONE blade at that radius, chord / (2 pi r), modulated by fine per-angle streak noise */
  map: THREE.CanvasTexture;
  /** tangent-space normal of the blade's back at that radius: tilted by the blade angle against the direction of
   *  rotation (u grows against it), so the lit side of a blurred disc follows the sun like a real one */
  normalMap: THREE.CanvasTexture;
}

/**
 * Polar textures for the motion-blurred propeller (u = angle, growing against the rotation; v = radius from `r0`
 * to `r1`). One texture pair serves both the streak sectors trailing each blade at idle and the full disc at
 * speed: the material's shader turns the single-blade coverage in the alpha channel into the smear density for
 * the current sweep (see `propBlurMaterial`). Nothing here depends on the RPM.
 */
export function propBlurMaps(r0: number, r1: number, root = 0.16, length = 1.32, rootChord = 0.17, tipChord = 0.10, tipBand = 0.17): PropBlurMaps {
  const W = 256, H = 128;
  const [c, ctx] = canvas(W, H);
  const [nc, nctx] = canvas(1, H);
  const img = ctx.createImageData(W, H), d = img.data;
  const nimg = nctx.createImageData(1, H), nd = nimg.data;
  const rng = new Rng('prop-disc');
  // per-angle streak noise, smooth over ~1.5 deg so it reads as fine radial streaks (a real blurred disc is never
  // uniform: the blade's nicks and paint edges smear into hairlines), never as spokes
  const NB = 720, streak = new Float32Array(NB);
  for (let i = 0; i < NB; i++) streak[i] = rng.next();
  const streakAt = (f01: number) => {
    const f = ((f01 % 1) + 1) % 1 * NB, i = Math.floor(f), a = f - i;
    return 0.86 + 0.28 * (streak[i % NB] * (1 - a) + streak[(i + 1) % NB] * a);
  };
  const tipR = root + length;
  for (let py = 0; py < H; py++) {
    const v = (py + 0.5) / H, r = r0 + (r1 - r0) * v;
    const t = THREE.MathUtils.clamp((r - root) / length, 0, 1);
    const chord = r < root ? rootChord * 0.75 : bladeChordAt(t, rootChord, tipChord);
    // one blade's share of the circumference at this radius
    let cover = Math.min(chord / (2 * Math.PI * r), 1);
    // the rounded tip sweeps less; nothing beyond the tip
    cover *= 1 - THREE.MathUtils.smoothstep(r, tipR - 0.02, tipR + 0.005);
    // blade paint: dark body, the yellow tip band, a hairline glint at the very tip where the paint is worn to metal
    let cr = 30, cg = 31, cb = 35;
    const inTip = THREE.MathUtils.smoothstep(r, tipR - tipBand - 0.012, tipR - tipBand + 0.012);
    cr += (224 - cr) * inTip; cg += (178 - cg) * inTip; cb += (46 - cb) * inTip;
    const glint = Math.exp(-Math.pow((r - (tipR - 0.012)) / 0.008, 2));
    cr += (235 - cr) * glint; cg += (232 - cg) * glint; cb += (220 - cb) * glint;
    for (let px = 0; px < W; px++) {
      const k = (py * W + px) * 4;
      const a = cover * streakAt((px + 0.5) / W + r * 0.37);
      d[k] = cr; d[k + 1] = cg; d[k + 2] = cb; d[k + 3] = Math.round(Math.min(a, 1) * 255);
    }
    // the blade's back (the side seen from ahead) is rotated by the blade angle about the radial axis, its normal
    // tilting against the direction of motion; u grows against the rotation, so that tilt is +x in tangent space
    const beta = bladePitchAt(t);
    const kn = py * 4;
    nd[kn] = Math.round((0.5 + 0.5 * Math.sin(beta)) * 255); nd[kn + 1] = 128; nd[kn + 2] = Math.round((0.5 + 0.5 * Math.cos(beta)) * 255); nd[kn + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  nctx.putImageData(nimg, 0, 0);
  const map = new THREE.CanvasTexture(c);
  map.flipY = false; map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  map.wrapS = THREE.RepeatWrapping; map.wrapT = THREE.ClampToEdgeWrapping;
  const normalMap = new THREE.CanvasTexture(nc);
  normalMap.flipY = false; normalMap.colorSpace = THREE.NoColorSpace;
  normalMap.wrapS = THREE.RepeatWrapping; normalMap.wrapT = THREE.ClampToEdgeWrapping;
  normalMap.minFilter = THREE.LinearFilter; normalMap.magFilter = THREE.LinearFilter; normalMap.generateMipmaps = false;
  return { map, normalMap };
}
