import * as THREE from 'three';
import type { Engine } from '../core/Engine';
import { Signals } from '../core/Signals';
import { SKY_PRESETS } from '../render/Sky';
import type { LightingSystem } from '../render/Lighting';
import type { PlayerSystem } from '../player/Player';
import type { AirstrikeSystem } from '../killstreaks/Airstrike';
import type { WeaponSystem } from '../weapons/WeaponSystem';
import type { Action } from '../core/Input';

/**
 * Deterministic capture harness for automated visual review.
 *
 * Enabled with `?shot=1`. It freezes the clock, drives the engine by hand for
 * a fixed number of ticks, and poses the camera at authored vantage points, so
 * two captures of the same scenario are byte-comparable and any visual
 * difference is a real change rather than frame timing.
 */

interface Scenario {
  name: string;
  position: [number, number, number];
  yaw: number;
  pitch: number;
  /**
   * Named every time rather than only where it differs from the default. The
   * preset is global state on the lighting system, so a scenario that leaves it
   * alone inherits whatever the previous one set — capturing `night street`
   * rendered the street at night, and any A/B run that swept a knob across the
   * scenario list re-lit half of it. Which is precisely the determinism this
   * harness exists to provide.
   */
  sky: keyof typeof SKY_PRESETS;
  /** Ticks to advance before the shot; lets particles and TAA settle. */
  warmup?: number;
  /** Input actions held down for the whole run, e.g. aiming or crouching. */
  hold?: Action[];
  setup?: (engine: Engine) => void;
}

const SCENARIOS: Record<string, Scenario> = {
  street: {
    name: 'Main street, morning light',
    position: [1.2, 1.72, 34],
    yaw: Math.PI,
    pitch: -0.04,
    sky: 'desertMorning',
    warmup: 90,
  },
  alley: {
    name: 'Alley, hard shadow',
    position: [-13.5, 1.72, 6],
    yaw: -Math.PI / 2 - 0.2,
    pitch: 0.02,
    sky: 'desertMorning',
    warmup: 90,
  },
  rooftop: {
    name: 'Rooftop overwatch',
    position: [-22, 7.4, 20],
    yaw: 2.6,
    pitch: -0.16,
    sky: 'desertMorning',
    warmup: 90,
  },
  interior: {
    name: 'Building interior, window light',
    position: [-24, 1.72, 2],
    yaw: 1.35,
    pitch: 0.0,
    sky: 'desertMorning',
    warmup: 90,
  },
  ads: {
    name: 'Aiming down sights',
    position: [1.2, 1.72, 26],
    yaw: Math.PI,
    pitch: -0.02,
    sky: 'desertMorning',
    warmup: 120,
    // Held rather than set: the weapon system recomputes ADS from input every
    // tick, so writing `adsProgress` directly is overwritten before it renders.
    hold: ['ads'],
  },
  golden: {
    name: 'Golden hour, long shadows',
    position: [0, 1.72, 20],
    yaw: Math.PI * 1.62,
    pitch: 0.02,
    sky: 'goldenHour',
    warmup: 90,
  },
  overcast: {
    name: 'Overcast, diffuse light',
    position: [8, 1.72, -4],
    yaw: 2.2,
    pitch: -0.02,
    sky: 'overcast',
    warmup: 90,
  },
  night: {
    name: 'Night raid',
    position: [1.2, 1.72, 30],
    yaw: Math.PI,
    pitch: -0.03,
    sky: 'night',
    warmup: 90,
  },
  airstrike: {
    name: 'Airstrike impact',
    position: [4, 1.72, 30],
    yaw: Math.PI + 0.06,
    pitch: 0.03,
    sky: 'desertMorning',
    warmup: 60,
    setup: (engine) => {
      const strike = engine.get<AirstrikeSystem>('airstrike');
      if (!strike) return;
      // Derive the mark from the camera's own forward vector rather than
      // hardcoding a position. A hardcoded target silently ends up behind the
      // player whenever the scenario's yaw is retuned, and then the capture
      // exercises the off-screen indicator instead of the strike.
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(engine.camera.quaternion);
      forward.y = 0;
      forward.normalize();
      strike.target.copy(engine.camera.position).addScaledVector(forward, 44).setY(0.3);
      // Run the attack axis across the view so the stick of bombs walks
      // laterally on screen instead of straight away from the camera.
      strike.heading = Math.atan2(forward.z, -forward.x);
      strike.launch();
    },
  },
  firefight: {
    name: 'Firefight, muzzle flash and smoke',
    position: [1.2, 1.72, 22],
    yaw: Math.PI,
    pitch: -0.02,
    sky: 'desertMorning',
    warmup: 40,
    setup: (engine) => {
      // Trigger a burst of gameplay VFX so the frame is representative of
      // combat rather than an empty street.
      for (let i = 0; i < 5; i++) {
        Signals.emit('explosion:spawn', {
          position: new THREE.Vector3(-6 + i * 4, 0.4, -8 - i * 5),
          radius: 6,
          damage: 0,
          cause: 'explosion',
          scale: 1.1,
        });
      }
      const w = engine.get<WeaponSystem>('weapons');
      if (w) {
        for (let i = 0; i < 3; i++) {
          Signals.emit('weapon:fire', {
            weaponId: w.def.id,
            muzzleWorld: new THREE.Vector3(0.4, 1.6, 21.4),
            direction: new THREE.Vector3(0, 0, -1),
            silenced: false,
            ammoLeft: 20,
          });
        }
      }
    },
  },
};

export function installShotHarness(engine: Engine): void {
  engine.stop();

  const w = window as unknown as Record<string, unknown>;

  const ALL_HELD: Action[] = ['ads', 'fire', 'sprint', 'crouch', 'prone', 'forward', 'back', 'left', 'right'];

  const runScenario = async (key: string): Promise<void> => {
    const scenario = SCENARIOS[key] ?? SCENARIOS.street;
    const player = engine.get<PlayerSystem>('player');
    const lighting = engine.get<LightingSystem>('lighting');

    // Scenarios share one page, so anything left running leaks into the next
    // capture — a latched trigger, an airstrike still flying, or a screen
    // effect mid-decay. Reset the volatile state explicitly.
    for (const action of ALL_HELD) engine.input.forceAction(action, false);
    const pipeline = engine.pipeline;
    pipeline.damageFlash = 0;
    pipeline.concussion = 0;
    pipeline.suppression = 0;
    pipeline.fadeToBlack = 1;
    pipeline.autoExposure = true;
    pipeline.resetExposure(1);
    if (player) {
      player.health = player.maxHealth;
      player.alive = true;
    }

    if (scenario.sky && lighting) {
      lighting.applyPreset(SKY_PRESETS[scenario.sky]);
      lighting.refreshEnvironment(engine.renderer);
    }

    if (player) {
      player.position.set(...scenario.position);
      player.yaw = scenario.yaw;
      player.pitch = scenario.pitch;
      // Freeze the player so bob and sway do not perturb the framing.
      player.velocity.setScalar(0);
    }

    engine.simulating = true;

    // Pose the camera before `setup` runs so scenarios can derive positions
    // from the final view direction.
    engine.camera.position.set(
      scenario.position[0],
      scenario.position[1] + 1.62,
      scenario.position[2],
    );
    engine.camera.rotation.set(scenario.pitch, scenario.yaw, 0, 'YXZ');
    engine.camera.updateMatrixWorld(true);

    scenario.setup?.(engine);

    // Drive the engine by hand at a fixed 60 Hz.
    const override = Number(new URLSearchParams(location.search).get('warmup') ?? NaN);
    const warmup = Number.isFinite(override) ? override : (scenario.warmup ?? 60);
    let t = 0;
    const t0 = performance.now();
    for (let i = 0; i < warmup; i++) {
      t += 1000 / 60;
      // Re-assert held actions every tick; `Input.endFrame` clears the
      // edge-triggered sets and a real player would still have the key down.
      for (const action of scenario.hold ?? []) engine.input.forceAction(action, true);
      engine.tick(t);
      if (player) {
        player.position.set(...scenario.position);
        player.yaw = scenario.yaw;
        player.pitch = scenario.pitch;
        player.velocity.setScalar(0);
      }
      w.__SHOT_TICK__ = i;
      // Yield periodically so the browser does not consider the tab hung and
      // so async texture uploads complete.
      if (i % 5 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    w.__SHOT_LABEL__ = scenario.name;
    w.__SHOT_MS_PER_FRAME__ = (performance.now() - t0) / warmup;
    console.info(`[shot] ${key}: ${warmup} ticks, ${((performance.now() - t0) / warmup).toFixed(0)} ms/frame`);
  };

  w.__SHOT_SCENARIOS__ = Object.keys(SCENARIOS);
  w.__SHOT_RUN__ = runScenario;
  w.__SHOT_READY__ = true;
}
