import * as THREE from 'three';
import { Rng } from '../../core/seed';
import { canvas } from './common';

/**
 * Motion-blur disc for the spinning propeller: a faint translucent grey disc (denser near the hub where the blades
 * are wide) with three darker arcs smeared behind the blade positions and a faint yellow ring where the tips pass.
 */
/**
 * Motion-blurred propeller disc for a three-blade prop of the given geometry (metres; the disc mesh has radius
 * `discR`). Per pixel: the time-averaged coverage of the blades at that radius (3 chord / 2 pi r, near solid at the
 * shank, a few per cent at the tip), a ghost sector trailing each blade position (the disc turns with the hub, so at
 * part blend the ghosts smear out of the crisp blades), fine radial streaks, and the yellow tip band as a brighter
 * arc with a thin glint at the very tip. Angle convention: phi counter-clockwise from +x with y up, blade i at
 * 90 deg + i 120 deg, turning toward increasing phi (model.ts: rotation.x += ..., disc rotated y by 90 deg).
 */
export function propDiscTexture(discR = 1.5, root = 0.16, length = 1.32, rootChord = 0.17, tipChord = 0.10, tipBand = 0.17): THREE.CanvasTexture {
  const s = 512, cx = s / 2, cy = s / 2;
  const [c, ctx] = canvas(s, s);
  const img = ctx.createImageData(s, s), d = img.data;
  const rng = new Rng('prop-disc');
  const maxChord = rootChord * 1.35;
  const chordAt = (t: number) => {
    const grow = THREE.MathUtils.smoothstep(t, 0, 0.42);
    let ch = rootChord * 0.75 + (maxChord - rootChord * 0.75) * grow;
    if (t > 0.42) ch = maxChord + (tipChord - maxChord) * ((t - 0.42) / 0.58);
    if (t > 0.82) ch *= Math.sqrt(Math.max(1 - Math.pow((t - 0.82) / 0.18, 2), 0));
    return Math.max(ch, 0.012);
  };
  // per-angle streak noise (smooth over ~1.5 deg so it reads as fine radial streaks, not spokes)
  const NB = 720, streak = new Float32Array(NB);
  for (let i = 0; i < NB; i++) streak[i] = rng.next();
  const streakAt = (phi: number) => {
    const f = ((phi / (Math.PI * 2)) % 1 + 1) % 1 * NB, i = Math.floor(f), a = f - i;
    const v = streak[i % NB] * (1 - a) + streak[(i + 1) % NB] * a;
    return 0.82 + 0.36 * v;
  };
  const SMEAR = 1.25, tipR = root + length;
  for (let py = 0; py < s; py++) {
    for (let px = 0; px < s; px++) {
      const x = ((px + 0.5) / s * 2 - 1) * discR, y = (1 - (py + 0.5) / s * 2) * discR;
      const r = Math.hypot(x, y), phi = Math.atan2(y, x);
      const k = (py * s + px) * 4;
      if (r < root * 0.7 || r > tipR + 0.01) { d[k + 3] = 0; continue; }
      const t = THREE.MathUtils.clamp((r - root) / length, 0, 1);
      const chord = r < root ? rootChord * 0.75 : chordAt(t);
      // fraction of the circumference the three blades sweep through at this radius
      const cover = Math.min(3 * chord / (2 * Math.PI * r), 1);
      const uniform = Math.min(cover * 2.4, 0.9);
      // ghost sectors trailing each blade position
      let ghost = 0;
      for (let b = 0; b < 3; b++) {
        let back = (Math.PI / 2 + (b * 2 * Math.PI) / 3) - phi;
        back = ((back % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        if (back < SMEAR) ghost = Math.max(ghost, Math.pow(1 - back / SMEAR, 1.6) * Math.min(cover * 5, 0.4));
      }
      let alpha = 1 - (1 - uniform) * (1 - ghost);
      alpha *= streakAt(phi + r * 0.4);
      // fade at the rim (rounded tips sweep less) and out over the last centimetres
      alpha *= 1 - THREE.MathUtils.smoothstep(r, tipR - 0.02, tipR + 0.01);
      // blade body: dark blue-grey; the outer tipBand is the yellow tip paint, a brighter arc with a thin glint
      let cr = 34, cg = 35, cb = 40;
      const inTip = THREE.MathUtils.smoothstep(r, tipR - tipBand - 0.015, tipR - tipBand + 0.015);
      if (inTip > 0) {
        cr = cr + (222 - cr) * inTip; cg = cg + (176 - cg) * inTip; cb = cb + (48 - cb) * inTip;
        // the tip paint is brighter but sweeps no more of the disc than the dark blade: no coverage boost, or the
        // band reads as a ring over the windshield instead of a tint
        alpha *= 1 + 0.06 * inTip;
      }
      const glint = Math.exp(-Math.pow((r - (tipR - 0.03)) / 0.012, 2));
      cr += (255 - cr) * glint * 0.2; cg += (250 - cg) * glint * 0.2; cb += (230 - cb) * glint * 0.2;
      alpha = Math.min(alpha + glint * 0.02, 1);
      d[k] = cr; d[k + 1] = cg; d[k + 2] = cb; d[k + 3] = Math.round(alpha * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
