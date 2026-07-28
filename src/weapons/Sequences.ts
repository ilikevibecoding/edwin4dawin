import { CH, seq, track, type Sequence } from './Sequence';
import { RIG, type WeaponModel } from './WeaponModel';

/**
 * The choreography.
 *
 * Every sequence is written in normalised time so it can be stretched onto the
 * weapon's own `reloadTime`, and every value is an *offset* — the gun is still
 * swaying, bobbing and settling from the last shot underneath all of this.
 *
 * The beats are the ones a real reload has, in the order a shooter does them:
 * the support hand leaves the handguard and the muzzle drops, the release is
 * hit and the magazine falls (a real magazine, given to the physics system), a
 * fresh one comes up canted and is rocked in, it gets a tap, and on an empty
 * gun the bolt is released last. Skipping any of them is what makes a reload
 * look like the gun teleported.
 */

export interface WeaponSequences {
  reload: Sequence;
  reloadEmpty: Sequence;
  /** Shotgun: raise into the loading position. */
  reloadStart: Sequence | null;
  /** Shotgun: one shell, looped. */
  reloadShell: Sequence | null;
  /** Shotgun: close the action and come back on target. */
  reloadEnd: Sequence | null;
  /** Bolt guns: lift, draw, feed, close. */
  cycle: Sequence | null;
  melee: Sequence;
  inspect: Sequence;
  /** The weapon swings out of the way while the off hand does the work. */
  throwGrenade: Sequence;
}

const B = ''; // the weapon root

export function buildSequences(model: WeaponModel): WeaponSequences {
  const bolt = RIG.bolt;
  const mag = RIG.magazine;
  const charge = RIG.charge;
  const pump = RIG.pump;
  const loose = RIG.loose;
  const ct = model.chargeTravel;
  const bt = model.boltTravel;

  /* ------------------------------ magazine ----------------------------- */

  const magOut = [
    // The gun cants over and comes back toward the chest.
    track(B, CH.PX, 'smooth', [0, 0, 0.16, 0.012, 0.7, 0.01, 1, 0]),
    track(B, CH.PY, 'smooth', [0, 0, 0.18, -0.026, 0.72, -0.018, 0.86, 0.004, 1, 0]),
    track(B, CH.PZ, 'smooth', [0, 0, 0.18, 0.036, 0.74, 0.03, 1, 0]),
    track(B, CH.RX, 'smooth', [0, 0, 0.18, -0.2, 0.5, -0.24, 0.78, -0.1, 1, 0]),
    track(B, CH.RY, 'smooth', [0, 0, 0.2, 0.3, 0.72, 0.24, 1, 0]),
    track(B, CH.RZ, 'smooth', [0, 0, 0.2, -0.42, 0.72, -0.34, 1, 0]),
    // Magazine: falls out, is gone, comes back canted and rocks in.
    track(mag, CH.PY, 'out', [
      0, 0, 0.1, 0, 0.17, -0.05, 0.44, -0.17, 0.68, 0, 0.76, -0.005, 0.84, 0, 1, 0,
    ]),
    track(mag, CH.PZ, 'smooth', [0, 0, 0.1, 0, 0.44, -0.02, 0.68, 0, 1, 0]),
    track(mag, CH.RX, 'smooth', [0, 0, 0.1, 0, 0.2, 0.3, 0.5, 0.34, 0.68, 0, 1, 0]),
    // Trigger finger comes off the trigger while the hands are busy.
    track(RIG.trigger, CH.RX, 'smooth', [0, 0, 0.2, -0.18, 0.8, -0.18, 1, 0]),
  ];

  const magEvents = [
    { t: 0.17, name: 'mag:drop' },
    { t: 0.44, name: 'mag:show' },
    { t: 0.68, name: 'mag:seat' },
    { t: 0.8, name: 'mag:tap' },
  ];

  const reload = seq('reload', model.id === 'pistol' ? 1.5 : 2.1, magOut, magEvents, 0.1);

  const reloadEmpty = seq(
    'reloadEmpty',
    2.9,
    [
      ...magOut.map((t) =>
        // Compress the magazine work into the first 74% so there is room for
        // the charging handle.
        track(t.node, t.channel, t.ease, squash(t.keys, 0.74)),
      ),
      track(charge, CH.PZ, 'out', [0, 0, 0.78, 0, 0.87, ct, 0.93, 0, 1, 0]),
      track(bolt, CH.PZ, 'out', [0, 0, 0.78, 0, 0.87, bt, 0.93, 0, 1, 0]),
      track(B, CH.RZ, 'smooth', [0, 0, 0.78, -0.12, 0.88, -0.3, 1, 0]),
      track(B, CH.PZ, 'smooth', [0, 0, 0.78, 0.014, 0.88, 0.03, 0.95, 0.008, 1, 0]),
    ],
    [...magEvents.map((e) => ({ t: e.t * 0.74, name: e.name })), { t: 0.87, name: 'bolt:release' }],
    0.1,
  );

  /* ------------------------------- shotgun ------------------------------ */

  let reloadStart: Sequence | null = null;
  let reloadShell: Sequence | null = null;
  let reloadEnd: Sequence | null = null;

  if (model.reloadStyle === 'shellByShell') {
    reloadStart = seq(
      'reloadStart',
      model.pumpTravel > 0 ? 0.7 : 0.5,
      [
        track(B, CH.PY, 'smooth', [0, 0, 1, -0.05]),
        track(B, CH.PZ, 'smooth', [0, 0, 1, 0.05]),
        track(B, CH.RX, 'smooth', [0, 0, 1, -0.16]),
        track(B, CH.RZ, 'smooth', [0, 0, 1, 0.75]),
        track(B, CH.RY, 'smooth', [0, 0, 1, 0.16]),
      ],
      [],
      0.3,
    );

    reloadShell = seq(
      'reloadShell',
      0.46,
      [
        // The gun stays canted; the offsets here are the small pulse of the
        // support hand pushing a shell home.
        track(B, CH.PY, 'linear', [0, -0.05, 1, -0.05]),
        track(B, CH.PZ, 'linear', [0, 0.05, 1, 0.05]),
        track(B, CH.RX, 'linear', [0, -0.16, 1, -0.16]),
        track(B, CH.RZ, 'linear', [0, 0.75, 1, 0.75]),
        track(B, CH.RY, 'linear', [0, 0.16, 1, 0.16]),
        track(B, CH.PX, 'smooth', [0, 0, 0.5, 0.008, 0.7, -0.004, 1, 0]),
        // The shell itself: up from below, into the port, gone.
        track(loose, CH.PY, 'out', [0, -0.09, 0.5, 0, 0.62, 0, 1, -0.09]),
        track(loose, CH.PX, 'out', [0, 0.05, 0.5, 0, 0.62, 0, 1, 0.05]),
        track(loose, CH.RZ, 'smooth', [0, -0.8, 0.5, 0, 1, -0.8]),
      ],
      [
        { t: 0.08, name: 'shell:show' },
        { t: 0.56, name: 'shell:load' },
        { t: 0.62, name: 'shell:hide' },
      ],
      0.02,
    );

    reloadEnd = seq(
      'reloadEnd',
      0.62,
      [
        track(B, CH.PY, 'smooth', [0, -0.05, 1, 0]),
        track(B, CH.PZ, 'smooth', [0, 0.05, 0.5, 0.02, 1, 0]),
        track(B, CH.RX, 'smooth', [0, -0.16, 1, 0]),
        track(B, CH.RZ, 'smooth', [0, 0.75, 1, 0]),
        track(B, CH.RY, 'smooth', [0, 0.16, 1, 0]),
        track(pump, CH.PZ, 'out', [0, 0, 0.24, model.pumpTravel, 0.56, 0, 1, 0]),
      ],
      [{ t: 0.5, name: 'cycle' }],
      0.02,
    );
  }

  /* -------------------------- worked by hand ---------------------------- */

  let cycle: Sequence | null = null;
  if (model.pumpTravel > 0) {
    cycle = seq(
      'pump',
      0.44,
      [
        track(pump, CH.PZ, 'out', [0, 0, 0.42, model.pumpTravel, 0.52, model.pumpTravel, 1, 0]),
        track(bolt, CH.PZ, 'out', [0, 0, 0.42, bt, 0.52, bt, 1, 0]),
        // The whole gun rocks with the stroke; the shoulder is the pivot.
        track(B, CH.PZ, 'smooth', [0, 0, 0.42, 0.012, 1, 0]),
        track(B, CH.RX, 'smooth', [0, 0, 0.3, 0.05, 0.6, -0.03, 1, 0]),
      ],
      [{ t: 0.34, name: 'eject' }, { t: 0.9, name: 'chamber' }],
      0.05,
    );
  } else if (model.boltLift > 0) {
    cycle = seq(
      'bolt',
      0.95,
      [
        track(bolt, CH.RZ, 'out', [0, 0, 0.2, -model.boltLift, 0.72, -model.boltLift, 0.95, 0, 1, 0]),
        track(bolt, CH.PZ, 'out', [0, 0, 0.2, 0, 0.46, bt, 0.7, 0, 0.95, 0, 1, 0]),
        // The firing hand leaves the grip, so the muzzle sags and rolls right.
        track(B, CH.RZ, 'smooth', [0, 0, 0.2, -0.16, 0.7, -0.2, 1, 0]),
        track(B, CH.RX, 'smooth', [0, 0, 0.3, -0.06, 0.7, -0.05, 1, 0]),
        track(B, CH.PY, 'smooth', [0, 0, 0.3, -0.008, 0.7, -0.008, 1, 0]),
        track(RIG.trigger, CH.RX, 'smooth', [0, 0, 0.2, -0.2, 0.8, -0.2, 1, 0]),
      ],
      [{ t: 0.42, name: 'eject' }, { t: 0.74, name: 'chamber' }],
      0.06,
    );
  }

  /* -------------------------- melee and inspect ------------------------- */

  const melee = seq(
    'melee',
    0.62,
    [
      track(B, CH.PZ, 'out', [0, 0, 0.22, 0.07, 0.42, -0.2, 0.62, -0.06, 1, 0]),
      track(B, CH.PX, 'out', [0, 0, 0.22, 0.05, 0.42, -0.09, 1, 0]),
      track(B, CH.PY, 'out', [0, 0, 0.22, 0.03, 0.42, -0.04, 1, 0]),
      track(B, CH.RY, 'out', [0, 0, 0.22, -0.75, 0.42, 0.42, 0.66, 0.1, 1, 0]),
      track(B, CH.RZ, 'out', [0, 0, 0.22, 0.55, 0.42, -0.5, 1, 0]),
      track(B, CH.RX, 'out', [0, 0, 0.22, 0.22, 0.42, -0.16, 1, 0]),
    ],
    [{ t: 0.38, name: 'melee:hit' }],
    0.06,
  );

  const ip = model.inspectPose;
  const hp = model.hipPose;
  const inspect = seq(
    'inspect',
    2.6,
    [
      track(B, CH.PX, 'smooth', [0, 0, 0.16, ip.px - hp.px, 0.8, ip.px - hp.px, 1, 0]),
      track(B, CH.PY, 'smooth', [0, 0, 0.16, ip.py - hp.py, 0.8, ip.py - hp.py, 1, 0]),
      track(B, CH.PZ, 'smooth', [0, 0, 0.16, ip.pz - hp.pz, 0.8, ip.pz - hp.pz, 1, 0]),
      track(B, CH.RX, 'smooth', [
        0, 0, 0.16, ip.rx - hp.rx, 0.42, ip.rx - hp.rx + 0.12, 0.8, ip.rx - hp.rx, 1, 0,
      ]),
      track(B, CH.RY, 'smooth', [
        0, 0, 0.16, ip.ry - hp.ry, 0.44, ip.ry - hp.ry - 1.5, 0.72, ip.ry - hp.ry, 1, 0,
      ]),
      track(B, CH.RZ, 'smooth', [0, 0, 0.16, ip.rz - hp.rz, 0.8, ip.rz - hp.rz, 1, 0]),
      // A tug on the charging handle halfway through, because that is what
      // everybody actually does when they inspect a rifle.
      track(charge, CH.PZ, 'out', [0, 0, 0.24, 0, 0.3, ct * 0.55, 0.36, 0, 1, 0]),
      track(bolt, CH.PZ, 'out', [0, 0, 0.24, 0, 0.3, bt * 0.55, 0.36, 0, 1, 0]),
    ],
    [{ t: 0.3, name: 'inspect:tug' }],
    0.1,
  );

  const throwGrenade = seq(
    'throw',
    1.05,
    [
      track(B, CH.PX, 'smooth', [0, 0, 0.3, 0.04, 0.62, 0.02, 1, 0]),
      track(B, CH.PY, 'smooth', [0, 0, 0.3, -0.05, 0.62, -0.03, 1, 0]),
      track(B, CH.PZ, 'smooth', [0, 0, 0.3, 0.06, 0.55, 0.02, 1, 0]),
      track(B, CH.RY, 'smooth', [0, 0, 0.3, -0.55, 0.55, -0.3, 1, 0]),
      track(B, CH.RX, 'smooth', [0, 0, 0.3, -0.28, 0.62, -0.16, 1, 0]),
      track(B, CH.RZ, 'smooth', [0, 0, 0.3, 0.34, 0.5, -0.12, 1, 0]),
    ],
    [{ t: 0.45, name: 'grenade:release' }],
    0.12,
  );

  return {
    reload,
    reloadEmpty,
    reloadStart,
    reloadShell,
    reloadEnd,
    cycle,
    melee,
    inspect,
    throwGrenade,
  };
}

/** Rescales a key list's times into `[0, span]`. */
function squash(keys: number[], span: number): number[] {
  const out = keys.slice();
  for (let i = 0; i < out.length; i += 2) out[i] *= span;
  return out;
}
