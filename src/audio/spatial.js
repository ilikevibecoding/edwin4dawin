import { clamp } from './synth.js';

export const SPEED_OF_SOUND = 343;

/** Inverse-distance gain exactly as the PannerNode computes it (used to scale reverb sends). */
export function distanceGain(d, { ref = 2, rolloff = 1, max = 200 } = {}) {
  const dd = clamp(d, ref, max);
  return ref / (ref + rolloff * (dd - ref));
}

/** Air absorption: low-pass cutoff falling with distance (≈11 kHz @50 m, 6 kHz @100 m, 1.8 kHz @200 m). */
export function airCutoff(d, absorb = 1) {
  return clamp(20000 * Math.exp(-d * 0.011 * absorb), 350, 20000);
}

function setPannerPosition(panner, x, y, z) {
  if (panner.positionX) {
    panner.positionX.value = x;
    panner.positionY.value = y;
    panner.positionZ.value = z;
  } else panner.setPosition(x, y, z);
}

/**
 * Builds  input → [distance delay] → air-absorption low-pass → PannerNode → dest  for a world position.
 *
 * opts: ref (refDistance), rolloff, max (maxDistance), model ('HRTF'|'equalpower'), absorb (air absorption strength),
 *       delay (true = propagation delay at speed of sound, only beyond delayMin metres).
 * Returns { input, dist, attn, extraDelay, move(x,y,z,now), dispose() }.
 */
export function createSpatialChain(ctx, dest, position, listenerPos, opts = {}) {
  const { ref = 2, rolloff = 1, max = 200, model = 'HRTF', absorb = 1, delay = false, delayMin = 40 } = opts;
  const px = +position.x || 0;
  const py = +position.y || 0;
  const pz = +position.z || 0;
  const dx = px - listenerPos.x;
  const dy = py - listenerPos.y;
  const dz = pz - listenerPos.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  const panner = ctx.createPanner();
  try {
    panner.panningModel = model;
  } catch {
    panner.panningModel = 'equalpower';
  }
  panner.distanceModel = 'inverse';
  panner.refDistance = ref;
  panner.rolloffFactor = rolloff;
  panner.maxDistance = max;
  setPannerPosition(panner, px, py, pz);
  panner.connect(dest);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 0.4;
  filter.frequency.value = airCutoff(dist, absorb);
  filter.connect(panner);
  let input = filter;

  let extraDelay = 0;
  let delayNode = null;
  if (delay && dist > delayMin) {
    extraDelay = dist / SPEED_OF_SOUND;
    delayNode = ctx.createDelay(extraDelay + 0.1);
    delayNode.delayTime.value = extraDelay;
    delayNode.connect(filter);
    input = delayNode;
  }

  return {
    input,
    panner,
    filter,
    dist,
    extraDelay,
    attn: distanceGain(dist, opts),
    /** Smoothly relocate a moving source (jets) and refresh its air absorption. */
    move(x, y, z, now, tc = 0.06) {
      if (panner.positionX) {
        panner.positionX.setTargetAtTime(x, now, tc);
        panner.positionY.setTargetAtTime(y, now, tc);
        panner.positionZ.setTargetAtTime(z, now, tc);
      } else panner.setPosition(x, y, z);
      const ddx = x - listenerPos.x;
      const ddy = y - listenerPos.y;
      const ddz = z - listenerPos.z;
      const d = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz);
      filter.frequency.setTargetAtTime(airCutoff(d, absorb), now, 0.1);
      return d;
    },
    dispose() {
      try {
        panner.disconnect();
        filter.disconnect();
        if (delayNode) delayNode.disconnect();
      } catch {
        /* already disconnected */
      }
    },
  };
}
