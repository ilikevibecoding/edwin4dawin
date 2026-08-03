import * as THREE from 'three';
import { ScalarTrack, VectorTrack, type ScalarKey, type VectorKey } from '../timeline/tracks';
import { PROLOGUE_ORIGIN } from '../scenes/PrologueText';
import { DOOR_Z, JUNCTION_Z, POD_BAY_Z } from '../scenes/CorridorScene';
import type { CameraState, Shot, ShotContext } from './CameraDirector';
import { fbm1 } from '../core/Rng';

/**
 * The shot list.
 *
 * Every entry is a deliberate frame with a name, a lens and a job. Exterior
 * shots are authored in the moving chase frame; interior shots are authored in
 * corridor space. Nothing is procedural or random here - the only variation
 * added at runtime is shake and a whisper of operator drift.
 */

type VecArg = [number, number, number] | VectorKey[];
type NumArg = number | ScalarKey[];

function toVectorTrack(v: VecArg, start: number, end: number): VectorTrack {
  if (Array.isArray(v) && typeof v[0] === 'number') {
    const arr = v as [number, number, number];
    return new VectorTrack([{ t: start, v: arr }, { t: end, v: arr }]);
  }
  return new VectorTrack(v as VectorKey[]);
}

function toScalarTrack(v: NumArg, start: number, end: number): ScalarTrack {
  if (typeof v === 'number') return new ScalarTrack([{ t: start, v }, { t: end, v }]);
  return new ScalarTrack(v);
}

type FollowTarget = 'runner' | 'destroyer' | 'pod' | 'none';

interface ShotDef {
  id: string;
  label: string;
  start: number;
  end: number;
  /** Camera position, in chase-frame local coordinates. */
  pos: VecArg;
  /** Look-at point, in chase-frame local coordinates (or offset if `follow`). */
  look: VecArg;
  /** When set, `look` is treated as an offset from that object's chase position. */
  follow?: FollowTarget;
  /** When set, `pos` is treated as an offset from that object's chase position. */
  followPos?: FollowTarget;
  fov?: NumArg;
  roll?: NumArg;
  shake?: number;
  handheld?: number;
  /** Roll the camera with the runner's bank, for in-cockpit-like tracking. */
  bankWithRunner?: number;
}

const _p = new THREE.Vector3();
const _l = new THREE.Vector3();

function chaseShot(def: ShotDef): Shot {
  const posTrack = toVectorTrack(def.pos, def.start, def.end);
  const lookTrack = toVectorTrack(def.look, def.start, def.end);
  const fovTrack = toScalarTrack(def.fov ?? 38, def.start, def.end);
  const rollTrack = toScalarTrack(def.roll ?? 0, def.start, def.end);

  return {
    id: def.id,
    label: def.label,
    scene: 'space',
    start: def.start,
    end: def.end,
    evaluate(t: number, ctx: ShotContext, out: CameraState): void {
      const chase = ctx.space.chase;
      const pivotFor = (target: FollowTarget): THREE.Object3D =>
        target === 'runner' ? ctx.space.runnerPivot
          : target === 'destroyer' ? ctx.space.destroyerPivot
            : ctx.space.podPivot;

      posTrack.at(t, _p);
      if (def.followPos && def.followPos !== 'none') _p.add(pivotFor(def.followPos).position);
      out.position.copy(chase.localToWorld(_p.clone()));

      lookTrack.at(t, _l);
      if (def.follow && def.follow !== 'none') _l.add(pivotFor(def.follow).position);
      out.target.copy(chase.localToWorld(_l.clone()));

      // Keep "up" aligned with the chase frame so the horizon behaves.
      out.up.copy(new THREE.Vector3(0, 1, 0).applyQuaternion(chase.quaternion));
      out.fov = fovTrack.at(t);
      out.roll = rollTrack.at(t);
      if (def.bankWithRunner) {
        out.roll += ctx.space.runnerPivot.rotation.z * def.bankWithRunner;
      }
      out.shake = def.shake ?? 1;
      out.handheld = def.handheld ?? 1;
    },
  };
}

interface InteriorShotDef {
  id: string;
  label: string;
  start: number;
  end: number;
  pos: VecArg;
  look: VecArg;
  /** Track a cast member instead of a fixed point; `look` becomes an offset. */
  followCharacter?: 'vader' | 'leia' | 'r2' | 'threepio';
  fov?: NumArg;
  roll?: NumArg;
  shake?: number;
  handheld?: number;
}

function interiorShot(def: InteriorShotDef): Shot {
  const posTrack = toVectorTrack(def.pos, def.start, def.end);
  const lookTrack = toVectorTrack(def.look, def.start, def.end);
  const fovTrack = toScalarTrack(def.fov ?? 44, def.start, def.end);
  const rollTrack = toScalarTrack(def.roll ?? 0, def.start, def.end);

  return {
    id: def.id,
    label: def.label,
    scene: 'interior',
    start: def.start,
    end: def.end,
    evaluate(t: number, ctx: ShotContext, out: CameraState): void {
      posTrack.at(t, out.position);
      lookTrack.at(t, out.target);
      if (def.followCharacter) {
        const c = ctx.interior;
        const p =
          def.followCharacter === 'vader' ? c.vader.options.path.at(t, new THREE.Vector3())
            : def.followCharacter === 'leia' ? c.leia.options.path.at(t, new THREE.Vector3())
              : def.followCharacter === 'r2' ? c.r2.group.position.clone()
                : c.threepio.group.position.clone();
        out.target.add(p);
      }
      out.up.set(0, 1, 0);
      out.fov = fovTrack.at(t);
      out.roll = rollTrack.at(t);
      out.shake = def.shake ?? 1;
      out.handheld = def.handheld ?? 1;
    },
  };
}

/** World-space shot used only for the prologue, which happens nowhere. */
function prologueShot(): Shot {
  return {
    id: 'pro-1',
    label: 'Prologue — deep space',
    scene: 'space',
    start: 0,
    end: 46,
    evaluate(t: number, _ctx: ShotContext, out: CameraState): void {
      out.position.copy(PROLOGUE_ORIGIN).add(new THREE.Vector3(
        fbm1(t * 0.11) * 0.9,
        1.2 + fbm1(t * 0.09 + 7) * 0.6,
        8,
      ));
      out.target.copy(PROLOGUE_ORIGIN).add(new THREE.Vector3(0, 2.4, -70));
      out.up.set(0, 1, 0);
      out.fov = 40;
      out.shake = 0;
      out.handheld = 0;
      out.near = 0.5;
      out.far = 2_400_000;
    },
  };
}

export function buildShots(): Shot[] {
  return [
    // ---------------------------------------------------------------- PROLOGUE
    prologueShot(),

    // ------------------------------------------------------- TATOOINE REVEAL
    chaseShot({
      id: 'tat-1',
      label: 'Wide planetary establishing',
      start: 46,
      end: 65,
      pos: [
        { t: 46, v: [3400, 4600, 7600] },
        { t: 65, v: [2600, 3900, 9400] },
      ],
      look: [
        { t: 46, v: [1200, -3400, 17600] },
        { t: 65, v: [700, -3000, 19000] },
      ],
      fov: 46,
      shake: 0,
      handheld: 0.6,
    }),
    chaseShot({
      id: 'tat-2',
      label: 'Corvette in the distance',
      start: 65,
      end: 86,
      pos: [
        { t: 65, v: [1100, 1600, -4200], ease: 'smoother' },
        { t: 86, v: [430, 640, -1500], ease: 'smoother' },
      ],
      look: [0, 6, 40],
      follow: 'runner',
      fov: [
        { t: 65, v: 44 },
        { t: 86, v: 39 },
      ],
      shake: 0,
      handheld: 0.7,
    }),

    // ---------------------------------------------------------------- PURSUIT
    chaseShot({
      id: 'pur-1',
      label: 'Tracking the blockade runner',
      start: 86,
      end: 99,
      pos: [
        { t: 86, v: [150, 34, -300], ease: 'smoother' },
        { t: 99, v: [96, 22, -212], ease: 'smoother' },
      ],
      look: [0, 2, 26],
      follow: 'runner',
      fov: 40,
      bankWithRunner: 0.35,
      shake: 0.5,
      handheld: 1.1,
    }),
    chaseShot({
      id: 'pur-2',
      label: 'Low angle — destroyer reveal',
      start: 99,
      end: 119,
      pos: [
        { t: 99, v: [8, -34, -520] },
        { t: 119, v: [4, -46, -560] },
      ],
      look: [
        { t: 99, v: [0, 150, 260] },
        { t: 108, v: [0, 250, 300] },
        { t: 119, v: [0, 330, 330] },
      ],
      fov: [
        { t: 99, v: 44 },
        { t: 119, v: 50 },
      ],
      shake: 0.7,
      handheld: 1.4,
    }),
    chaseShot({
      id: 'pur-3',
      label: 'Under the hull',
      start: 119,
      end: 131,
      pos: [
        { t: 119, v: [-60, -30, -180], ease: 'smoother' },
        { t: 131, v: [-120, 10, 120], ease: 'smoother' },
      ],
      look: [
        { t: 119, v: [0, 480, 700] },
        { t: 131, v: [0, 520, 1150] },
      ],
      fov: 52,
      shake: 1.1,
      handheld: 1.6,
    }),
    chaseShot({
      id: 'pur-4',
      label: 'Battle profile — both ships',
      start: 131,
      end: 143,
      pos: [
        { t: 131, v: [2560, 980, 560], ease: 'smoother' },
        { t: 143, v: [2180, 840, 860], ease: 'smoother' },
      ],
      look: [
        { t: 131, v: [0, 600, 1180] },
        { t: 143, v: [0, 540, 1320] },
      ],
      fov: 40,
      shake: 0.8,
      handheld: 1.2,
    }),
    chaseShot({
      id: 'pur-5',
      label: 'Corvette under fire',
      start: 143,
      end: 153,
      pos: [
        { t: 143, v: [-172, 44, -178], ease: 'smoother' },
        { t: 153, v: [-142, 32, -138], ease: 'smoother' },
      ],
      look: [0, 4, 6],
      follow: 'runner',
      fov: 42,
      bankWithRunner: 0.5,
      shake: 1.5,
      handheld: 1.5,
    }),
    chaseShot({
      id: 'pur-6',
      label: 'Engines knocked out',
      start: 153,
      end: 158,
      pos: [
        { t: 153, v: [120, 40, -300], ease: 'smoother' },
        { t: 158, v: [96, 30, -250], ease: 'smoother' },
      ],
      look: [0, 0, -70],
      follow: 'runner',
      fov: 44,
      shake: 1.8,
      handheld: 1.4,
    }),

    // ---------------------------------------------------------------- CAPTURE
    chaseShot({
      id: 'cap-1',
      label: 'Captured — scale two-shot',
      start: 158,
      end: 172,
      pos: [
        { t: 158, v: [720, -175, -505], ease: 'smoother' },
        { t: 172, v: [560, -120, -395], ease: 'smoother' },
      ],
      look: [
        { t: 158, v: [0, 150, 90] },
        { t: 172, v: [0, 110, 60] },
      ],
      fov: 42,
      shake: 0.6,
      handheld: 0.9,
    }),
    chaseShot({
      id: 'cap-2',
      label: 'The destroyer draws alongside',
      start: 172,
      end: 184,
      pos: [
        { t: 172, v: [176, 8, -258], ease: 'smoother' },
        { t: 184, v: [138, 14, -204], ease: 'smoother' },
      ],
      look: [
        { t: 172, v: [0, 62, -18] },
        { t: 184, v: [0, 46, -12] },
      ],
      fov: 52,
      shake: 0.5,
      handheld: 1.0,
    }),
    chaseShot({
      id: 'cap-3',
      label: 'Boarding umbilical',
      start: 184,
      end: 196,
      pos: [
        { t: 184, v: [232, 104, -196], ease: 'smoother' },
        { t: 193, v: [118, 56, -102], ease: 'smoother' },
        { t: 196, v: [76, 38, -70], ease: 'linear' },
      ],
      look: [
        { t: 184, v: [0, 70, 6] },
        { t: 193, v: [0, 44, -2] },
        { t: 196, v: [0, 26, -6] },
      ],
      fov: [
        { t: 184, v: 46 },
        { t: 196, v: 38 },
      ],
      shake: 0.4,
      handheld: 0.8,
    }),

    // --------------------------------------------------------------- CORRIDOR
    interiorShot({
      id: 'cor-1',
      label: 'Corridor establishing',
      start: 196,
      end: 206,
      pos: [
        { t: 196, v: [1.45, 1.95, 32.0], ease: 'smoother' },
        { t: 206, v: [1.05, 1.84, 20.5], ease: 'smoother' },
      ],
      look: [
        { t: 196, v: [0.0, 1.4, 14] },
        { t: 206, v: [-0.1, 1.3, -2] },
      ],
      fov: 46,
      shake: 0.5,
    }),
    interiorShot({
      id: 'cor-2',
      label: 'Defender eye level',
      start: 206,
      end: 214.5,
      pos: [
        { t: 206, v: [1.26, 1.54, 20.2], ease: 'smoother' },
        { t: 214.5, v: [1.14, 1.42, 18.2], ease: 'smoother' },
      ],
      look: [
        { t: 206, v: [-0.2, 1.22, 4.0] },
        { t: 214.5, v: [-0.2, 1.26, -1.5] },
      ],
      fov: 40,
      shake: 0.6,
    }),
    interiorShot({
      id: 'cor-3',
      label: 'Door breach',
      start: 214.5,
      end: 221,
      pos: [
        { t: 214.5, v: [-0.5, 0.95, 4.6], ease: 'smoother' },
        { t: 218.5, v: [-0.45, 0.98, 4.2], ease: 'smoother' },
        { t: 221, v: [-0.7, 1.05, 6.4], ease: 'out' },
      ],
      look: [
        { t: 214.5, v: [0, 1.3, DOOR_Z] },
        { t: 221, v: [0, 1.25, DOOR_Z + 1] },
      ],
      fov: [
        { t: 214.5, v: 40 },
        { t: 218.4, v: 38 },
        { t: 221, v: 52 },
      ],
      shake: 1.6,
      handheld: 1.4,
    }),
    interiorShot({
      id: 'cor-4',
      label: 'Boarders in the passage',
      start: 221,
      end: 228,
      pos: [
        { t: 221, v: [1.24, 1.78, 19.8], ease: 'smoother' },
        { t: 228, v: [1.1, 1.66, 17.9], ease: 'smoother' },
      ],
      // Behind the defended line: a defender frames the left edge instead of
      // standing a half metre from the lens.
      look: [
        { t: 221, v: [0, 1.3, 5] },
        { t: 228, v: [0, 1.28, -1] },
      ],
      fov: 52,
      shake: 1.1,
      handheld: 1.6,
    }),
    interiorShot({
      id: 'cor-5',
      label: 'The line breaks',
      start: 228,
      end: 236,
      pos: [
        { t: 228, v: [-1.18, 1.05, 17.6], ease: 'smoother' },
        { t: 236, v: [-1.0, 1.15, 15.0], ease: 'smoother' },
      ],
      look: [
        { t: 228, v: [0.2, 1.15, 9.0] },
        { t: 236, v: [0, 1.2, 3.5] },
      ],
      fov: 44,
      shake: 1.2,
      handheld: 1.5,
    }),
    interiorShot({
      id: 'cor-6',
      label: 'Smoke and silence',
      start: 236,
      end: 243,
      pos: [
        { t: 236, v: [0.2, 1.45, 12.0], ease: 'smoother' },
        { t: 243, v: [0.05, 1.4, 10.2], ease: 'smoother' },
      ],
      look: [
        { t: 236, v: [0, 1.35, 0] },
        { t: 243, v: [0, 1.4, DOOR_Z + 0.5] },
      ],
      fov: 44,
      shake: 0.35,
      handheld: 1.0,
    }),
    interiorShot({
      id: 'cor-7',
      label: 'Vader entrance — low angle',
      start: 243,
      end: 254,
      pos: [
        { t: 243, v: [0.0, 0.72, -2.0], ease: 'smoother' },
        { t: 254, v: [0.06, 0.66, 7.4], ease: 'smoother' },
      ],
      look: [0, 1.42, 0],
      followCharacter: 'vader',
      fov: [
        { t: 243, v: 44 },
        { t: 254, v: 38 },
      ],
      shake: 0.25,
      handheld: 0.7,
    }),
    interiorShot({
      id: 'cor-8',
      label: 'He walks the line',
      start: 254,
      end: 262,
      pos: [
        { t: 254, v: [1.34, 1.62, 14.4], ease: 'smoother' },
        { t: 262, v: [1.2, 1.52, 12.6], ease: 'smoother' },
      ],
      look: [-0.2, 1.46, 0],
      followCharacter: 'vader',
      fov: 42,
      shake: 0.25,
      handheld: 0.8,
    }),

    // ------------------------------------------------------------------ PLANS
    interiorShot({
      id: 'pln-1',
      label: 'The princess moves aft',
      start: 262,
      end: 271,
      pos: [
        { t: 262, v: [1.3, 1.6, 30.5], ease: 'smoother' },
        { t: 271, v: [0.6, 1.55, 30.2], ease: 'smoother' },
      ],
      look: [0, 1.1, 0],
      followCharacter: 'leia',
      fov: 46,
      shake: 0.3,
      handheld: 0.9,
    }),
    interiorShot({
      id: 'pln-2',
      label: 'Archive console',
      start: 271,
      end: 280,
      pos: [
        { t: 271, v: [1.62, 1.64, 23.5], ease: 'smoother' },
        { t: 280, v: [0.92, 1.58, 24.1], ease: 'smoother' },
      ],
      look: [
        { t: 271, v: [-2.2, 1.32, 26.4] },
        { t: 280, v: [-2.5, 1.5, 25.9] },
      ],
      fov: 46,
      shake: 0.2,
      handheld: 0.8,
    }),
    interiorShot({
      id: 'pln-3',
      label: 'The plans, in the round',
      start: 280,
      end: 288,
      pos: [
        { t: 280, v: [1.52, 1.76, 23.1], ease: 'smoother' },
        { t: 288, v: [0.62, 1.66, 23.5], ease: 'smoother' },
      ],
      look: [
        { t: 280, v: [-2.58, 1.66, 25.4] },
        { t: 288, v: [-2.74, 1.58, 25.25] },
      ],
      fov: [
        { t: 280, v: 44 },
        { t: 288, v: 40 },
      ],
      shake: 0.15,
      handheld: 0.7,
    }),
    interiorShot({
      id: 'pln-4',
      label: 'Transfer to the droid',
      start: 288,
      end: 299,
      pos: [
        { t: 288, v: [1.28, 1.18, 23.0], ease: 'smoother' },
        { t: 299, v: [0.58, 1.04, 23.2], ease: 'smoother' },
      ],
      look: [
        { t: 288, v: [-2.4, 1.0, 24.5] },
        { t: 299, v: [-2.5, 0.88, 24.2] },
      ],
      fov: 44,
      shake: 0.2,
      handheld: 0.8,
    }),
    interiorShot({
      id: 'pln-5',
      label: 'Out of time',
      start: 299,
      end: 306,
      pos: [
        { t: 299, v: [-1.32, 1.64, 28.6], ease: 'smoother' },
        { t: 306, v: [-1.08, 1.56, 26.9], ease: 'smoother' },
      ],
      // Over her shoulder and down the corridor: she is looking at what is
      // coming, and so are we.
      look: [
        { t: 299, v: [0.3, 1.34, 18.5] },
        { t: 306, v: [0.1, 1.3, 12.5] },
      ],
      fov: 44,
      shake: 0.35,
      handheld: 1.0,
    }),

    // ----------------------------------------------------------------- ESCAPE
    interiorShot({
      id: 'esc-1',
      label: 'Droids run for the bay',
      start: 306,
      end: 313,
      pos: [
        { t: 306, v: [1.36, 1.62, 26.6], ease: 'smoother' },
        { t: 313, v: [1.3, 1.55, 34.2], ease: 'smoother' },
      ],
      look: [0, 0.55, 2.6],
      followCharacter: 'r2',
      fov: 52,
      shake: 0.3,
      handheld: 1.1,
    }),
    interiorShot({
      id: 'esc-2',
      label: 'Reaching the pod bay',
      start: 313,
      end: 319.5,
      pos: [
        { t: 313, v: [1.62, 1.62, 50.6], ease: 'smoother' },
        { t: 319.5, v: [1.18, 1.5, 48.4], ease: 'smoother' },
      ],
      look: [
        { t: 313, v: [-0.9, 1.2, 44.4] },
        { t: 316, v: [-1.6, 1.14, 45.6] },
        { t: 319.5, v: [-2.4, 1.05, POD_BAY_Z] },
      ],
      fov: 50,
      shake: 0.3,
      handheld: 1.0,
    }),
    chaseShot({
      id: 'esc-3',
      label: 'Pod separation',
      start: 319.5,
      end: 328,
      // Held off the pod's quarter, about twenty metres out, with the ships
      // thrown up into frame left. Sitting directly astern instead puts the
      // corvette squarely behind the pod, and six metres of pod silhouetted
      // against a hundred metres of lit hull simply disappears. From here the
      // hull crowds the top of the frame at launch and then slides away as the
      // pod drops into clear space, which is the whole point of the shot.
      // Frame left also matches the next shot, so the ships stay put across the
      // cut, and pitching up keeps the planet's limb out; seen edge on it cuts
      // the picture in half as a hard white bar.
      pos: [
        { t: 319.5, v: [4, -8, -20], ease: 'smoother' },
        { t: 322, v: [0, -8, -21], ease: 'smoother' },
        { t: 328, v: [-6, -16, -42], ease: 'smoother' },
      ],
      followPos: 'pod',
      look: [
        { t: 319.5, v: [-1, 2, 3] },
        { t: 322, v: [-1, 2.5, 4] },
        { t: 328, v: [-2, 4, 7] },
      ],
      follow: 'pod',
      fov: [
        { t: 319.5, v: 54 },
        { t: 328, v: 46 },
      ],
      shake: 0.9,
      handheld: 1.2,
    }),
    chaseShot({
      id: 'esc-4',
      label: 'Falling away',
      start: 328,
      end: 340,
      pos: [
        { t: 328, v: [26, -46, -30], ease: 'smoother' },
        { t: 340, v: [48, -88, -58], ease: 'smoother' },
      ],
      followPos: 'pod',
      look: [
        { t: 328, v: [4, 14, 8] },
        { t: 340, v: [8, 26, 16] },
      ],
      follow: 'pod',
      fov: 50,
      shake: 0.4,
      handheld: 1.0,
    }),
    chaseShot({
      id: 'esc-5',
      label: 'Descent',
      start: 340,
      end: 352,
      pos: [
        { t: 340, v: [60, 120, 190], ease: 'smoother' },
        { t: 352, v: [110, 220, 350], ease: 'smoother' },
      ],
      followPos: 'pod',
      look: [
        { t: 340, v: [-10, -150, -230] },
        { t: 352, v: [-20, -280, -430] },
      ],
      follow: 'pod',
      fov: 44,
      shake: 0.5,
      handheld: 1.0,
    }),

    // --------------------------------------------------------------- EPILOGUE
    chaseShot({
      id: 'epi-1',
      label: 'A bright point in a wide sky',
      start: 352,
      end: 366,
      pos: [
        { t: 352, v: [2600, 2700, 1600], ease: 'smoother' },
        { t: 366, v: [5000, 5000, 2900], ease: 'smoother' },
      ],
      followPos: 'pod',
      look: [
        { t: 352, v: [-1100, -1500, -3000] },
        { t: 366, v: [-2100, -2700, -5400] },
      ],
      follow: 'pod',
      fov: 44,
      shake: 0.2,
      handheld: 0.8,
    }),
    chaseShot({
      id: 'epi-2',
      label: 'The Empire keeps the ship',
      start: 366,
      end: 380,
      pos: [
        { t: 366, v: [1600, -80, -2200], ease: 'smoother' },
        { t: 380, v: [1280, -30, -1780], ease: 'smoother' },
      ],
      look: [
        { t: 366, v: [700, -583, -1050] },
        { t: 380, v: [540, -470, -840] },
      ],
      fov: 56,
      shake: 0.1,
      handheld: 0.7,
    }),
  ];
}

export { JUNCTION_Z };
