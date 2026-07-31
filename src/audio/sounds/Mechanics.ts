/**
 * Weapon mechanics: magazines, bolts, pumps, cylinders, selectors, shells.
 *
 * These are the sounds a player hears more often than any other and they are
 * almost entirely modal — a latch, a spring, a stamped-steel pressing and a
 * polymer housing, each with its own resonance. Built from three primitives:
 *
 *   click   a hard, short, high modal tick (a detent, a sear, a latch)
 *   clack   a heavy low-mid modal impact with a real ring (steel on steel)
 *   thunk   a damped low resonance with no ring (polymer, a loaded magazine)
 *
 * plus a noise `slide` for anything that travels, and a spring `twang`.
 */
import { Rng } from '../../core/MathUtils';
import {
  Signal,
  ad,
  adExp,
  bandpass,
  bounceSequence,
  contourFilter,
  crackleNoise,
  expDecay,
  formants,
  highpass,
  karplusStrong,
  limit,
  lowpass,
  metalModes,
  noiseBurst,
  peaking,
  resonate,
  ringMod,
  saturate,
  softClip,
  sweepFilter,
  sweepTone,
  whiteNoise,
  widen,
  woodModes,
  type RenderedSound,
} from '../synth';
import { gearRustle } from './Footsteps';
import { defineSound, type RenderArgs, type Registrar } from './Spec';

/** A hard, bright detent tick. `hz` is the latch resonance. */
function click(sr: number, rng: Rng, hz: number, decay: number, bright = 1): Signal {
  const out = new Signal(Math.min(0.2, decay * 9 + 0.01), sr);
  const strike = noiseBurst(0.0025, sr, rng);
  strike.envelope(expDecay(0.00025));
  highpass(strike, 900);
  out.add(resonate(strike, metalModes(hz, 5, decay, 0.42, rng), 1.5), 1);
  const tick = noiseBurst(0.004, sr, rng);
  bandpass(tick, 5200 * bright, 1.3);
  // A 4 ms burst through a wide band is broadband to Nyquist, and stacked twice
  // it buries the modal body that identifies which part of the gun moved.
  lowpass(tick, 9000 * bright, 0.7);
  tick.envelope(adExp(0.00006, 0.0007));
  out.add(tick, 0.45);
  return out;
}

/** Steel on steel with mass behind it: a bolt closing, a cylinder shutting. */
function clack(sr: number, rng: Rng, hz: number, decay: number, weight: number): Signal {
  const out = new Signal(Math.min(0.5, decay * 8 + 0.05), sr);
  const strike = noiseBurst(0.005, sr, rng);
  strike.envelope(expDecay(0.0007));
  out.add(resonate(strike, metalModes(hz, 8, decay, 0.36, rng), 1.6), 1);
  const impact = noiseBurst(0.02, sr, rng);
  bandpass(impact, hz * 3.2, 0.7);
  impact.envelope(adExp(0.00012, 0.0022));
  saturate(impact, 2.5);
  out.add(impact, 0.7);
  // Mass: the low-frequency energy that says this part is heavy.
  const mass = new Signal(0.14, sr);
  sweepTone(mass, hz * 0.5, hz * 0.28, 1, { env: adExp(0.0009, 0.016) });
  saturate(mass, 1.6);
  out.add(mass, weight);
  return out;
}

/** Damped polymer or a loaded magazine seating: low, dead, no ring. */
function thunk(sr: number, rng: Rng, hz: number, tau: number, gain = 1): Signal {
  const out = new Signal(Math.min(0.3, tau * 9 + 0.02), sr);
  const body = noiseBurst(0.05, sr, rng);
  lowpass(body, hz * 4, 0.8);
  body.envelope(adExp(0.0004, tau));
  out.add(body, 0.7);
  out.add(resonate(body, woodModes(hz, rng), 0.9), 0.6);
  const low = new Signal(0.12, sr);
  sweepTone(low, hz, hz * 0.6, 1, { env: adExp(0.0008, tau * 1.4) });
  out.add(low, 0.8);
  return out.gain(gain);
}

/** Something travelling along rails: filtered noise with a moving band. */
function slide(
  sr: number,
  rng: Rng,
  seconds: number,
  fromHz: number,
  toHz: number,
  grit: number,
): Signal {
  const out = new Signal(seconds, sr);
  whiteNoise(out, rng);
  crackleNoise(out, rng, 2400 * grit, 0.7, 2);
  contourFilter(
    out,
    (t) => {
      const x = Math.min(1, t / seconds);
      return fromHz * Math.pow(toHz / fromHz, x);
    },
    { kind: 'bandpass', q: 1.6 },
  );
  // Accelerating then decelerating: a hand-driven part is not a constant speed.
  out.envelope((t) => {
    const x = Math.min(1, t / seconds);
    return Math.sin(Math.PI * Math.pow(x, 0.75)) * (0.5 + 0.5 * Math.pow(1 - x, 0.4));
  });
  out.normalize(1);
  return out;
}

/** A recoil or magazine spring under load. */
function twang(sr: number, rng: Rng, hz: number, decay: number): Signal {
  const out = karplusStrong(Math.min(0.35, decay * 3), sr, hz, rng, {
    damping: 0.975,
    brightness: 0.45,
    dispersion: 0.62,
    excitation: 'impulse',
  });
  out.envelope(expDecay(decay));
  ringMod(out, hz * 0.11, 0.35);
  out.normalize(1);
  return out;
}

type Build = (args: RenderArgs) => Signal;

const BUILDS: Record<string, Build> = {
  // Hammer falling on an empty chamber. Purely mechanical, slightly hollow.
  weapon_dry_fire: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.16, sr);
    out.add(click(sr, rng, rng.range(2400, 3200), 0.02, 1.1), 1);
    out.add(twang(sr, rng, rng.range(420, 620), 0.02), 0.22, 0.003);
    out.add(thunk(sr, rng, 210, 0.012, 0.4), 0.5, 0.001);
    return out;
  },
  // Release the catch, the magazine drops free: a latch click then a scrape.
  weapon_mag_out: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.34, sr);
    out.add(click(sr, rng, rng.range(2100, 2700), 0.014), 0.8);
    out.add(slide(sr, rng, 0.12, 2600, 1200, 0.6), 0.35, 0.012);
    out.add(thunk(sr, rng, 190, 0.02, 0.7), 0.75, 0.08);
    // Rounds shifting in the magazine as it comes free.
    const rattle = new Signal(0.16, sr);
    crackleNoise(rattle, rng, 90, 1, 1.6);
    bandpass(rattle, 3200, 1.4);
    rattle.envelope(adExp(0.004, 0.05));
    out.add(rattle, 0.28, 0.06);
    return out;
  },
  // Seating a fresh magazine: polymer thunk, then the catch engaging.
  weapon_mag_in: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.34, sr);
    out.add(slide(sr, rng, 0.07, 1800, 3200, 0.5), 0.3);
    out.add(thunk(sr, rng, 175, 0.024, 1), 1, 0.05);
    out.add(click(sr, rng, rng.range(2600, 3400), 0.016, 1.15), 0.75, 0.062);
    out.add(gearRustle(sr, rng, 0.14, 0.2), 1, 0);
    return out;
  },
  // The palm slap that confirms the magazine is home.
  weapon_mag_tap: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.2, sr);
    const palm = noiseBurst(0.05, sr, rng);
    lowpass(palm, 1400, 0.8);
    palm.envelope(adExp(0.0006, 0.012));
    out.add(palm, 0.8);
    out.add(thunk(sr, rng, 205, 0.016, 0.8), 1);
    out.add(click(sr, rng, 3000, 0.008), 0.3, 0.004);
    return out;
  },
  // Charging handle drawn back to the stop.
  weapon_bolt_back: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.4, sr);
    out.add(slide(sr, rng, 0.13, 1600, 3800, 1.1), 0.85);
    out.add(twang(sr, rng, rng.range(280, 400), 0.05), 0.3, 0.01);
    out.add(clack(sr, rng, rng.range(360, 470), 0.055, 0.45), 0.9, 0.125);
    return out;
  },
  // Released: the carrier slams home under spring pressure. The loudest of the set.
  weapon_bolt_forward: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.45, sr);
    out.add(slide(sr, rng, 0.05, 3400, 1500, 1.2), 0.5);
    out.add(clack(sr, rng, rng.range(320, 420), 0.075, 0.85), 1, 0.045);
    out.add(twang(sr, rng, rng.range(230, 330), 0.07), 0.35, 0.05);
    const ring = karplusStrong(0.3, sr, rng.range(1100, 1900), rng, {
      damping: 0.988,
      brightness: 0.28,
      dispersion: 0.5,
      excitation: 'impulse',
    });
    ring.envelope(expDecay(0.035));
    out.add(ring, 0.22, 0.048);
    return out;
  },
  weapon_bolt_lock: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.24, sr);
    out.add(click(sr, rng, rng.range(1800, 2400), 0.03, 0.9), 1);
    out.add(clack(sr, rng, 520, 0.03, 0.3), 0.5, 0.006);
    return out;
  },
  // Shotgun pump: heavier, longer travel, a distinctive two-part rattle.
  weapon_pump_back: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.42, sr);
    out.add(slide(sr, rng, 0.16, 1200, 2800, 1.4), 1);
    out.add(clack(sr, rng, rng.range(260, 340), 0.06, 0.6), 0.85, 0.15);
    // The spent shell being lifted clear.
    const shell = karplusStrong(0.14, sr, rng.range(900, 1500), rng, {
      damping: 0.94,
      brightness: 0.4,
      dispersion: 0.4,
      excitation: 'impulse',
    });
    shell.envelope(expDecay(0.012));
    out.add(shell, 0.25, 0.1);
    return out;
  },
  weapon_pump_forward: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.4, sr);
    out.add(slide(sr, rng, 0.1, 2600, 1100, 1.3), 0.7);
    out.add(clack(sr, rng, rng.range(230, 300), 0.085, 1), 1, 0.09);
    out.add(thunk(sr, rng, 150, 0.03, 0.6), 0.6, 0.095);
    return out;
  },
  // A shell pushed into the tube: brass on steel, then the lifter closing.
  weapon_shell_insert: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.26, sr);
    out.add(slide(sr, rng, 0.06, 2200, 1400, 0.8), 0.45);
    out.add(thunk(sr, rng, 260, 0.014, 0.7), 0.8, 0.04);
    out.add(click(sr, rng, rng.range(1600, 2200), 0.012), 0.55, 0.055);
    return out;
  },
  // Revolver: the latch, then the cylinder swinging out on its crane.
  weapon_cylinder_open: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.4, sr);
    out.add(click(sr, rng, rng.range(2800, 3600), 0.01, 1.2), 0.7);
    out.add(slide(sr, rng, 0.11, 3200, 1800, 0.35), 0.3, 0.015);
    // Ratchet teeth passing as it rotates.
    for (let i = 0; i < 5; i++) {
      out.add(click(sr, rng, rng.range(3600, 5200), 0.004, 1.3), 0.16, 0.03 + i * 0.018);
    }
    out.add(clack(sr, rng, 640, 0.03, 0.25), 0.4, 0.125);
    return out;
  },
  weapon_cylinder_close: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.38, sr);
    out.add(slide(sr, rng, 0.08, 1800, 3000, 0.3), 0.28);
    out.add(clack(sr, rng, rng.range(560, 700), 0.055, 0.55), 1, 0.07);
    out.add(click(sr, rng, rng.range(3000, 3800), 0.012, 1.2), 0.6, 0.086);
    return out;
  },
  // A rocket sliding down a fibreglass tube and locking.
  weapon_rocket_load: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.6, sr);
    out.add(slide(sr, rng, 0.32, 900, 2100, 0.7), 0.8);
    out.add(thunk(sr, rng, 120, 0.045, 1), 0.9, 0.3);
    out.add(click(sr, rng, rng.range(1400, 1900), 0.02, 0.8), 0.5, 0.35);
    // The tube itself is a resonant cylinder.
    const tube = karplusStrong(0.4, sr, rng.range(160, 240), rng, {
      damping: 0.991,
      brightness: 0.7,
      dispersion: 0.2,
      excitation: 'noise',
      pluckWidth: 0.5,
    });
    tube.envelope(expDecay(0.06));
    out.add(tube, 0.28, 0.3);
    return out;
  },
  // Bringing a weapon up: sling, gear, and the weapon settling in the hands.
  weapon_draw: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.45, sr);
    out.add(gearRustle(sr, rng, 0.3, 1), 1);
    out.add(slide(sr, rng, 0.18, 1400, 2600, 0.35), 0.3, 0.02);
    out.add(thunk(sr, rng, 230, 0.02, 0.5), 0.6, 0.16);
    out.add(click(sr, rng, 2600, 0.008), 0.2, 0.19);
    return out;
  },
  weapon_holster: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.4, sr);
    out.add(gearRustle(sr, rng, 0.28, 0.9), 1);
    out.add(slide(sr, rng, 0.16, 2600, 1200, 0.4), 0.32, 0.01);
    out.add(thunk(sr, rng, 190, 0.024, 0.6), 0.55, 0.14);
    return out;
  },
  // Shouldering the weapon. Almost nothing but cloth and a stock contact.
  weapon_ads_in: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.24, sr);
    out.add(gearRustle(sr, rng, 0.2, 0.8), 1);
    const stock = noiseBurst(0.04, sr, rng);
    lowpass(stock, 900, 0.8);
    stock.envelope(adExp(0.004, 0.014));
    out.add(stock, 0.4, 0.05);
    return out;
  },
  weapon_ads_out: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.22, sr);
    out.add(gearRustle(sr, rng, 0.18, 0.7), 1);
    return out;
  },
  // Turning the weapon over in the hands.
  weapon_inspect: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.75, sr);
    out.add(gearRustle(sr, rng, 0.5, 0.7), 1);
    out.add(click(sr, rng, rng.range(2200, 3000), 0.01), 0.35, rng.range(0.08, 0.16));
    out.add(thunk(sr, rng, 240, 0.016, 0.4), 0.4, rng.range(0.24, 0.34));
    out.add(click(sr, rng, rng.range(1800, 2600), 0.014), 0.28, rng.range(0.42, 0.56));
    return out;
  },
  // A blade cut through air: a band sweeping past with a Doppler-like curve.
  weapon_knife_swing: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.3, sr);
    whiteNoise(out, rng);
    contourFilter(
      out,
      (t) => {
        // Rises as the blade accelerates, falls as it passes and recedes.
        const x = Math.min(1, t / 0.3);
        return 700 + 3600 * Math.sin(Math.PI * Math.pow(x, 0.7));
      },
      { kind: 'bandpass', q: 2.6 },
    );
    out.envelope((t) => {
      const x = Math.min(1, t / 0.3);
      return Math.pow(Math.sin(Math.PI * Math.pow(x, 0.8)), 1.6);
    });
    out.normalize(1);
    return out;
  },
  // Blade into a body: wet, low, and short, with a hint of the blade ringing.
  weapon_knife_hit: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.32, sr);
    const flesh = noiseBurst(0.12, sr, rng);
    lowpass(flesh, 1600, 0.9);
    formants(flesh, [
      { freq: 380, q: 1.3, gainDb: 9 },
      { freq: 980, q: 1.8, gainDb: 5 },
    ]);
    flesh.envelope(adExp(0.0008, 0.02));
    out.add(flesh, 1);
    const squelch = noiseBurst(0.16, sr, rng);
    bandpass(squelch, 620, 1.5);
    ringMod(squelch, rng.range(38, 72), 0.75);
    squelch.envelope(adExp(0.005, 0.038));
    out.add(squelch, 0.5);
    const blade = karplusStrong(0.16, sr, rng.range(2200, 3400), rng, {
      damping: 0.93,
      brightness: 0.2,
      dispersion: 0.35,
      excitation: 'impulse',
    });
    blade.envelope(expDecay(0.01));
    out.add(blade, 0.16);
    const thud = new Signal(0.2, sr);
    sweepTone(thud, 92, 52, 1, { env: adExp(0.0016, 0.03) });
    out.add(thud, 0.55);
    return out;
  },
  // Rifle butt into armour: heavy, dull, with the weapon's own frame ringing.
  weapon_melee_butt: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.42, sr);
    const impact = noiseBurst(0.1, sr, rng);
    lowpass(impact, 1300, 0.85);
    impact.envelope(adExp(0.0005, 0.014));
    saturate(impact, 2.6);
    out.add(impact, 1);
    const kevlar = noiseBurst(0.09, sr, rng);
    bandpass(kevlar, 2400, 0.7);
    kevlar.envelope(adExp(0.0007, 0.009));
    out.add(kevlar, 0.42);
    const body = new Signal(0.28, sr);
    sweepTone(body, 108, 46, 1, { curve: (t) => Math.pow(t, 0.6), env: adExp(0.0018, 0.05) });
    saturate(body, 1.8);
    out.add(body, 0.9);
    out.add(clack(sr, rng, rng.range(280, 380), 0.045, 0.2), 0.3, 0.004);
    return out;
  },
  // The pin and the safety lever leaving a frag.
  weapon_grenade_pin: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.3, sr);
    out.add(click(sr, rng, rng.range(3800, 5200), 0.012, 1.3), 0.9);
    const ping = karplusStrong(0.22, sr, rng.range(2600, 4200), rng, {
      damping: 0.985,
      brightness: 0.14,
      dispersion: 0.3,
      excitation: 'impulse',
    });
    ping.envelope(expDecay(0.03));
    out.add(ping, 0.5, 0.008);
    // The spoon flying off a fraction of a second later.
    out.add(click(sr, rng, rng.range(2200, 3200), 0.02, 1.1), 0.3, rng.range(0.05, 0.1));
    return out;
  },
  weapon_grenade_throw: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.34, sr);
    out.add(gearRustle(sr, rng, 0.2, 0.7), 1);
    const whoosh = noiseBurst(0.24, sr, rng);
    contourFilter(
      whoosh,
      (t) => 500 + 2200 * Math.sin(Math.PI * Math.min(1, t / 0.24)),
      { kind: 'bandpass', q: 2.2 },
    );
    whoosh.envelope((t) => Math.pow(Math.sin(Math.PI * Math.min(1, t / 0.24)), 1.5));
    whoosh.normalize(1);
    out.add(whoosh, 0.7, 0.03);
    return out;
  },
  // Steel body on concrete. Two or three decreasing bounces.
  weapon_grenade_bounce: ({ sampleRate: sr, rng }) => {
    const out = bounceSequence(0.5, sr, rng.range(380, 620), rng, 3, {
      damping: 0.978,
      brightness: 0.3,
      dispersion: 0.55,
      excitation: 'impulse',
    });
    const tick = noiseBurst(0.008, sr, rng);
    bandpass(tick, 4200, 0.8);
    tick.envelope(adExp(0.0001, 0.0012));
    out.add(tick, 0.5);
    out.add(thunk(sr, rng, 200, 0.01, 0.35), 0.4);
    return out;
  },
  // A fire-selector detent. The smallest sound in the game; two tiny clicks.
  // A fire-selector detent: a stamped steel spring snapping into a receiver
  // cut. Small and crisp, but it is a metal part in an aluminium housing, so it
  // has a body — the ear places it on the gun rather than as a bare tick.
  weapon_selector: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.12, sr);
    out.add(click(sr, rng, rng.range(2800, 3600), 0.006, 0.9), 0.8);
    out.add(click(sr, rng, rng.range(2200, 2900), 0.005, 0.8), 0.4, 0.014);
    out.add(thunk(sr, rng, 420, 0.006, 0.5), 0.3, 0.002);
    return out;
  },
};

/** Brass casing hitting the ground: the archetypal Karplus-Strong use case. */
function renderShellBounce(args: RenderArgs, caliberHz: number): Signal {
  const { sampleRate: sr, rng } = args;
  const out = bounceSequence(0.55, sr, caliberHz * rng.range(0.9, 1.12), rng, rng.int(2, 3), {
    damping: 0.9905,
    brightness: 0.18,
    dispersion: 0.68,
    excitation: 'impulse',
  });
  // Brass is bright and inharmonic; a bandpass around the body resonance and a
  // touch of high sparkle sells the alloy.
  peaking(out, caliberHz * 2.4, 1.6, 6);
  peaking(out, 6400, 1.1, 4);
  highpass(out, 420);
  const scrape = noiseBurst(0.05, sr, rng);
  bandpass(scrape, 5600, 0.9);
  scrape.envelope(adExp(0.0004, 0.006));
  out.add(scrape, 0.35);
  out.removeDc().normalize(0.94);
  return out;
}

export function registerMechanicSounds(register: Registrar): void {
  const MIX = {
    bus: 'weapons' as const,
    priority: 0.55,
    gain: 0.85,
    refDistance: 1.5,
    maxDistance: 30,
    rolloff: 1.5,
    pitchJitter: 1.1,
    variants: 3,
    send: 0.22,
    airScale: 1.2,
  };

  for (const id of Object.keys(BUILDS)) {
    register(
      defineSound(
        id,
        (args) => {
          const out = BUILDS[id](args);
          highpass(out, 70);
          softClip(out, 0.88);
          limit(out, 0.995);
          out.removeDc().normalize(0.95);
          // Mechanism sounds are almost always heard in the first person, so a
          // little width makes them sit around the player rather than in a dot.
          return widen(out, 0.00035, 0.5);
        },
        MIX,
      ),
    );
  }

  // Casings, pitched by caliber. The weapon module ejects by caliber string, and
  // the fx module asks for a generic `shell_bounce`.
  const CASINGS: Record<string, number> = {
    shell_bounce: 1250,
    shell_bounce_rifle: 1250,
    shell_bounce_pistol: 1650,
    shell_bounce_heavy: 820,
    shell_bounce_shotgun: 560,
  };
  for (const [id, hz] of Object.entries(CASINGS)) {
    register(
      defineSound(id, (args) => renderShellBounce(args, hz).toMono(), {
        bus: 'sfx',
        priority: 0.18,
        gain: id === 'shell_bounce_shotgun' ? 0.3 : 0.38,
        refDistance: 1.2,
        maxDistance: 18,
        rolloff: 1.8,
        pitchJitter: 2.5,
        variants: 4,
        send: 0.25,
        airScale: 1.5,
      }),
    );
  }
}

/** Caliber string to casing sound id; the shotgun hull is the odd one out. */
export function casingSoundId(caliber: string): string {
  if (caliber === '12 gauge') return 'shell_bounce_shotgun';
  if (caliber === '.338 LM' || caliber === '7.62x51' || caliber === '.44 MAG') {
    return 'shell_bounce_heavy';
  }
  if (caliber === '9x19' || caliber === '.45 ACP') return 'shell_bounce_pistol';
  return 'shell_bounce_rifle';
}

export function mechanicSoundIds(): string[] {
  return [
    ...Object.keys(BUILDS),
    'shell_bounce',
    'shell_bounce_rifle',
    'shell_bounce_pistol',
    'shell_bounce_heavy',
    'shell_bounce_shotgun',
  ];
}
