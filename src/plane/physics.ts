import * as THREE from 'three';
import { clamp, lerp, perlin2, smoothstep } from '../core/noise';

export interface FlightInputs { throttle: number; pitch: number; roll: number; yaw: number; flaps: number; brake: boolean; }

export interface FlightTelemetry {
  airspeed: number;      // m/s
  groundSpeed: number;
  altitude: number;      // m MSL
  agl: number;
  verticalSpeed: number; // m/s
  heading: number;       // degrees
  alpha: number;         // rad
  beta: number;
  stalled: boolean;
  onWater: boolean;
  onGround: boolean;
  rpm: number;           // 0..1
  gForce: number;
  gearDown: boolean;
  /** combined camera-shake magnitude 0..1 (buffet + turbulence + speed) */
  shake: number;
  /** stall buffet 0..1 (high-frequency) */
  buffet: number;
  /** turbulence the airframe is flying through 0..1 (low-frequency sway) */
  gustLevel: number;
  bank: number;
  pitchAngle: number;
  /** true for a few seconds after a crash reset (HUD message) */
  crashed: boolean;
}

const G = 9.81;

type StationKind = 'bow' | 'step' | 'stern' | 'plane' | 'wheel' | 'structure';
interface Station { p: THREE.Vector3; kind: StationKind; }

/**
 * Rigid-body flight model of a DHC-2-class floatplane (~2.3 t): lift/drag/side force with a stall break,
 * stability and control derivatives, engine lag, wind and turbulence, three-station float hydrostatics
 * with planing, amphibious wheels on land, airframe "structure" contacts that stop the wing/tail/nose from
 * passing through the surface, and a recoverable crash reset.
 *
 * Body axes: +X forward, +Y up, +Z starboard (right-handed). Angular velocity `omega` is in body axes:
 * x = roll rate (+ right wing down), y = yaw rate (+ nose LEFT), z = pitch rate (+ nose up). Note the yaw
 * sign is the opposite of the aerospace z-down convention, so Cn terms below carry the opposite sign of the
 * textbook values (a stable weathercock is -Cn_beta here).
 */
export class FlightModel {
  readonly position = new THREE.Vector3(0, 0.3, 0);
  readonly quaternion = new THREE.Quaternion();
  readonly velocity = new THREE.Vector3();
  /** body-frame angular velocity: x roll rate, y yaw rate (+ nose left), z pitch rate (+ nose up) */
  readonly omega = new THREE.Vector3();
  rpm = 0;
  telemetry: FlightTelemetry = { airspeed: 0, groundSpeed: 0, altitude: 0, agl: 0, verticalSpeed: 0, heading: 0, alpha: 0, beta: 0, stalled: false, onWater: false, onGround: false, rpm: 0, gForce: 1, gearDown: true, shake: 0, buffet: 0, gustLevel: 0, bank: 0, pitchAngle: 0, crashed: false };
  // ---- parameters
  mass = 2350;
  wingArea = 26.0;
  span = 14.6;
  chord = 1.65;
  maxThrust = 7400;
  /**
   * Ixx (roll), Iyy (yaw), Izz (pitch). The Beaver's published inertias are about 5400 / 11200 / 6900 kg m^2
   * (roll / yaw / pitch); floats add mass low and at both ends, hence slightly more. The old 3200 roll inertia
   * (about half) made the aircraft snap into rolls like a light aerobatic type.
   */
  inertia = new THREE.Vector3(5600, 11600, 7400);
  wind = new THREE.Vector3();
  turbulence = 0.3;
  gearDown = true;
  private gust = new THREE.Vector3();
  private gustAmp = 0;
  private time = 0;
  private buffet = 0;
  private crashTimer = 0;
  private wreckedTimer = 0;
  private lastHeading = 0;
  private contactUp = 0;
  private readonly tmpV = new THREE.Vector3();
  private readonly tmpV2 = new THREE.Vector3();
  private readonly invQ = new THREE.Quaternion();
  /**
   * Contact stations (body frame). Float stations sit ON the visual keel line (model.ts float loft: bow keel
   * -2.08 at x 2.6, forebody keel -2.25 just ahead of the step, afterbody keel -1.98 at x -2.3); the old points
   * were 7-17 cm below the keel so the physics reacted before the hull visibly touched. Wheels sit at the visual
   * tyre bottoms (main 0.29 m radius at y -2.28, nose 0.2 m): the aircraft stands on four wheels on land with the
   * nose wheels ahead of the CG, so braking cannot nose it over. Structure points (propeller, wing tips, fin,
   * tail cone, cabin roof) only act when the airframe itself reaches the surface. The 'plane' stations carry the
   * dynamic (planing) lift: its pressure peak sits on the forebody well ahead of the step (x +0.7, the deepest
   * keel point), which is what trims a planing floatplane nose-up onto the step instead of bow-down.
   */
  private readonly stations: Station[] = [
    { p: new THREE.Vector3(2.6, -2.08, -1.25), kind: 'bow' }, { p: new THREE.Vector3(2.6, -2.08, 1.25), kind: 'bow' },
    { p: new THREE.Vector3(-0.2, -2.25, -1.25), kind: 'step' }, { p: new THREE.Vector3(-0.2, -2.25, 1.25), kind: 'step' },
    { p: new THREE.Vector3(-2.3, -1.98, -1.25), kind: 'stern' }, { p: new THREE.Vector3(-2.3, -1.98, 1.25), kind: 'stern' },
    { p: new THREE.Vector3(0.7, -2.27, -1.25), kind: 'plane' }, { p: new THREE.Vector3(0.7, -2.27, 1.25), kind: 'plane' },
    { p: new THREE.Vector3(-0.9, -2.57, -1.25), kind: 'wheel' }, { p: new THREE.Vector3(-0.9, -2.57, 1.25), kind: 'wheel' },
    { p: new THREE.Vector3(2.3, -2.48, -1.25), kind: 'wheel' }, { p: new THREE.Vector3(2.3, -2.48, 1.25), kind: 'wheel' },
    { p: new THREE.Vector3(3.6, -0.5, 0), kind: 'structure' },
    { p: new THREE.Vector3(-0.04, 1.40, -7.5), kind: 'structure' }, { p: new THREE.Vector3(-0.04, 1.40, 7.5), kind: 'structure' },
    { p: new THREE.Vector3(-4.9, 2.1, 0), kind: 'structure' }, { p: new THREE.Vector3(-5.4, -0.2, 0), kind: 'structure' },
    { p: new THREE.Vector3(0.6, 1.75, 0), kind: 'structure' },
  ];
  /** height of the datum above the surface when resting on the floats / on the wheels */
  static readonly FLOAT_REST_Y = 1.96;
  static readonly WHEEL_REST_Y = 2.57;

  constructor(private heightAt: (x: number, z: number) => number) {}

  reset(x: number, y: number, z: number, headingRad: number, speed: number): void {
    this.position.set(x, y, z);
    this.quaternion.setFromEuler(new THREE.Euler(0, headingRad, 0));
    const fwd = new THREE.Vector3(1, 0, 0).applyQuaternion(this.quaternion);
    this.velocity.copy(fwd).multiplyScalar(speed);
    this.omega.set(0, 0, 0);
    this.rpm = speed > 5 ? 0.7 : 0.2;
    this.wreckedTimer = 0;
  }

  /** Forward axis in world space. */
  forward(out: THREE.Vector3): THREE.Vector3 { return out.set(1, 0, 0).applyQuaternion(this.quaternion); }
  up(out: THREE.Vector3): THREE.Vector3 { return out.set(0, 1, 0).applyQuaternion(this.quaternion); }

  step(inputs: FlightInputs, dt: number): void {
    if (dt <= 0) { this.probeContacts(); this.updateTelemetry(inputs); return; }
    const sub = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / sub;
    for (let i = 0; i < sub; i++) this.substep(inputs, h);
    this.updateTelemetry(inputs);
  }

  private substep(inp: FlightInputs, dt: number): void {
    this.time += dt;
    this.crashTimer = Math.max(0, this.crashTimer - dt);
    // engine lag
    const target = clamp(inp.throttle, 0, 1);
    this.rpm += (target * 0.92 + 0.08 - this.rpm) * clamp(dt / 0.7, 0, 1);

    // ---- turbulence: gust velocity (slow large-scale drift plus quicker bumps), stronger in the boundary layer.
    // `turbulence` is the weather preset (clear 0.25 .. storm 1.0): clear gives ~0.9 m/s gusts near the surface,
    // ~0.4 m/s aloft, i.e. a perceptible bob of ~0.15 g but nothing that pushes the aircraft around.
    const t = this.time * 0.35;
    const gx = perlin2(t, 1.3) + 0.4 * perlin2(t * 4.0, 11.7);
    const gy = 0.7 * perlin2(t * 1.7, 7.1) + 0.35 * perlin2(t * 5.1, 3.3);
    const gz = perlin2(t * 1.3, 3.7) + 0.4 * perlin2(t * 4.3, 6.9);
    const gustAmp = this.turbulence * (1.5 + 2.0 * (1 - smoothstep(30, 300, this.position.y)));
    this.gustAmp = gustAmp;
    this.gust.set(gx, gy, gz).multiplyScalar(gustAmp);

    // ---- air-relative velocity in body frame
    this.invQ.copy(this.quaternion).invert();
    const vAir = this.tmpV.copy(this.velocity).sub(this.wind).sub(this.gust);
    const vb = this.tmpV2.copy(vAir).applyQuaternion(this.invQ);
    const V = Math.max(vb.length(), 0.5);
    const alpha = Math.atan2(-vb.y, Math.max(vb.x, 0.1));
    const beta = Math.asin(clamp(vb.z / V, -1, 1));
    const rho = 1.2 * Math.exp(-this.position.y / 9000);
    const qdyn = 0.5 * rho * V * V;
    const S = this.wingArea;

    // ---- lift coefficient with stall
    const flaps = clamp(inp.flaps, 0, 1);
    const alphaStall = 0.27 - flaps * 0.03;
    let cl = 0.32 + flaps * 0.55 + 5.4 * alpha;
    const clMax = 1.7 + flaps * 0.5;
    let stalled = false;
    let over = 0;
    if (alpha > alphaStall) {
      over = alpha - alphaStall;
      // post-stall slope -6/rad: the lift falls to ~65% within 6 degrees past the break so the nose drops
      // decisively (the old -3.5/rad let the aircraft mush along at alpha 17-20 deg); beyond that the wing
      // behaves like a flat plate (cl ~ 0.9 sin 2a) which is what lets a deep stall still recover.
      cl = Math.max(clMax - over * 6.0, 0.9 * Math.sin(2 * alpha));
      stalled = true;
    } else if (alpha < -0.22) {
      cl = Math.max(cl, -0.9);
    }
    cl = Math.min(cl, clMax);
    this.buffet = lerp(this.buffet, stalled ? 1 : smoothstep(alphaStall - 0.05, alphaStall, alpha) * 0.5, clamp(dt * 6, 0, 1));
    const cd = 0.034 + 0.048 * cl * cl + flaps * 0.05 + (this.gearDown ? 0.012 : 0) + (stalled ? 0.1 + 0.6 * over : 0);
    // side force: the Beaver's CY_beta is about -0.4/rad (fuselage + fin); -0.9 made sideslips feel glued
    const cy = -0.45 * beta;

    // ---- aerodynamic forces in the wind frame -> body frame
    const lift = qdyn * S * cl, drag = qdyn * S * cd, side = qdyn * S * cy;
    const vDir = vb.clone().normalize();
    const liftDir = new THREE.Vector3(-vDir.y, vDir.x, 0).normalize(); // vDir rotated +90 deg about Z: "up" relative to the airflow
    if (liftDir.lengthSq() < 0.5) liftDir.set(0, 1, 0);
    const fBody = new THREE.Vector3();
    fBody.addScaledVector(vDir, -drag);
    fBody.addScaledVector(liftDir, lift);
    fBody.z += side;
    // thrust falls off with airspeed (fixed-pitch prop) and altitude
    const thrust = this.maxThrust * clamp((this.rpm - 0.08) / 0.92, 0, 1) * clamp(1 - V / 120, 0.2, 1) * (rho / 1.2);
    fBody.x += thrust;
    const aeroUp = fBody.y; // body-up specific force before fBody is rotated into the world frame below

    // ---- moments (body frame): x roll, y yaw, z pitch
    const p = this.omega.x, r = this.omega.y, qq = this.omega.z;
    const b = this.span, c = this.chord;
    const twoV = 2 * Math.max(V, 3);
    const pHat = p * b / twoV, rHat = r * b / twoV, qHat = qq * c / twoV;
    const ail = clamp(inp.roll, -1, 1), rud = clamp(inp.yaw, -1, 1);
    // A keyboard "full pull" is a fixed stick force, not a fixed deflection: elevator hinge moment grows with
    // dynamic pressure, so the deflection a pilot actually reaches falls with speed. Full travel is available
    // below ~32 m/s (rotation, flare); at 55 m/s cruise about 58%, never less than 40%.
    const hinge = clamp(Math.sqrt(614 / Math.max(qdyn, 1)), 0.4, 1);
    const elev = clamp(inp.pitch, -1, 1) * hinge;
    // Cm_alpha -1.3 (stable, trims hands-off at ~55 m/s), Cm_q -36 per (qc/2V) (Beaver ~-31; the extra damping
    // tames the pitch-rate spike that precedes the alpha build-up), Cm_de 0.43 per full travel: at cruise a full
    // pull peaks near 18 deg/s and ~2 g instead of 100 deg/s and 6 g.
    // Stall break: as the flow separates the wing's centre of pressure moves aft and the tail loses downwash,
    // a firm nose-down increment (-0.18 within ~2 deg past the stall) that makes the break decisive and gets
    // the nose down to flying speed quickly instead of mushing.
    const cmBreak = -0.18 * smoothstep(0, 0.035, over);
    const cm = 0.04 - 1.3 * alpha - 36.0 * qHat + 0.43 * elev * (1 - 0.15 * flaps) - 0.06 * flaps + cmBreak;
    // roll: Cl_p -0.5 (Beaver -0.505), Cl_da 0.072 per full travel -> ~62 deg/s before the sideslip from adverse
    // yaw takes its ~15% back (was 0.14 -> 147 deg/s); dihedral Cl_beta -0.08; roll due to yaw rate +0.08
    // (sign flipped for the nose-left yaw axis)
    const clRoll = -0.5 * pHat + 0.072 * ail - 0.08 * beta - 0.08 * rHat;
    // yaw (+ = nose left): weathercock Cn_beta 0.10, yaw damping Cn_r -0.16, rudder; adverse yaw: the up-going
    // wing's down aileron drags, yawing the nose away from the roll (+0.008 ail: ~5 deg of sideslip in a full
    // roll without rudder), and roll rate tilts the down-going wing's lift forward (textbook Cn_p ~ -CL/16 net
    // of induced drag, i.e. +CL/16 in this axis convention)
    const cn = -0.10 * beta - 0.16 * rHat - 0.075 * rud + 0.008 * ail + 0.06 * clamp(cl, 0, 1.5) * pHat;
    const M = new THREE.Vector3(qdyn * S * b * clRoll, qdyn * S * b * cn, qdyn * S * c * cm);
    // power-on pitch-up: the slipstream raises the dynamic pressure over the download-carrying tail and the
    // wing root's extra lift deepens the downwash there, which with the low thrust line gives the familiar
    // nose-up with power of a prop single. Modelled as an equivalent thrust-line offset 0.25 m below the CG:
    // ~2.5 deg more trim alpha at full power and 30 m/s (a hands-off power-on recovery rounds out near CLmax
    // instead of diving for speed), ~0.2 deg at cruise power.
    M.z += 0.25 * thrust;
    // stall buffet & wing drop
    if (stalled) {
      M.x += qdyn * S * b * 0.02 * Math.sin(this.time * 17) * this.buffet;
      M.z -= qdyn * S * c * 0.03 * this.buffet;
    }
    // turbulence torques: spanwise/chordwise gust gradients, scaled with dynamic pressure like every other
    // aerodynamic moment (clear weather near the surface: roll disturbances of ~3-4 deg/s at cruise)
    M.x += qdyn * S * b * 0.0055 * gustAmp * perlin2(this.time * 2.1, 9.9);
    M.z += qdyn * S * c * 0.004 * gustAmp * perlin2(this.time * 1.9, 4.4);
    M.y += qdyn * S * b * 0.002 * gustAmp * perlin2(this.time * 1.7, 12.4);

    // ---- ground / water contacts
    let onWater = false, onGround = false, anyContact = false, wetStations = 0;
    const worldF = new THREE.Vector3();
    const cpWorld = new THREE.Vector3();
    const vPoint = new THREE.Vector3();
    const groundHere = this.heightAt(this.position.x, this.position.z);
    const landBelow = groundHere > 0.05;
    this.gearDown = landBelow && this.position.y < 60;
    const groundSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    const q = this.quaternion;
    const pitchNow = Math.asin(clamp(2 * (q.x * q.y + q.w * q.z), -1, 1)); // elevation of body +X
    this.contactUp = 0;
    for (const st of this.stations) {
      const cp = st.p;
      cpWorld.copy(cp).applyQuaternion(this.quaternion).add(this.position);
      const ground = this.heightAt(cpWorld.x, cpWorld.z);
      const isWater = ground <= 0.05;
      const surface = isWater ? 0 : ground;
      const depth = surface - cpWorld.y;
      if (depth <= 0) continue;
      const isWheel = st.kind === 'wheel', isStructure = st.kind === 'structure', isFloat = !isWheel && !isStructure;
      if (isWater && isWheel) continue;            // wheels do nothing in water
      if (!isWater && isFloat && this.gearDown) continue; // on land the wheels carry the load
      anyContact = true;
      // velocity of the contact point
      vPoint.copy(this.omega).applyQuaternion(this.quaternion).cross(this.tmpV.copy(cpWorld).sub(this.position)).add(this.velocity);
      const vh = Math.hypot(vPoint.x, vPoint.z);
      let fy: number, fh: number;
      if (isStructure) {
        // airframe on the surface: stiff, heavily damped, high friction; a wing/prop/tail touching at speed is a wreck
        if (vh > 12) this.crash();
        if (isWater) { onWater = true; fy = 12000 * depth - 3000 * vPoint.y; fh = -(250 * vh + 40 * vh * vh) * Math.min(depth / 0.3, 1); }
        else { onGround = true; fy = 80000 * Math.min(depth, 0.6) - 8000 * vPoint.y; fh = -0.7 * Math.max(fy, 0) * Math.min(vh, 1); }
      } else if (isWater) {
        onWater = true;
        const planing = smoothstep(8, 22, vh);
        const wet = Math.min(depth / 0.1, 1);
        if (st.kind === 'plane') {
          // planing lift ~ rho_w V^2 x wetted area x trim, so the aircraft rides higher as speed builds (forebody
          // ~12 cm immersed at 20 m/s, ~6 cm at 26 m/s); the velocity term is water-impact / added-mass damping
          // (about zeta 0.5 against the planing stiffness) so a firm touchdown does not skip
          const trim = clamp(0.5 + 3.0 * pitchNow, 0.25, 1.3);
          fy = (40 * vh * vh * Math.min(depth / 0.35, 1) * trim - 250 * vh * wet * vPoint.y) * planing;
          fh = 0;
        } else {
          wetStations++;
          // hydrostatics per station: a V-bottom immerses quadratically until the chine is under (dc), then
          // linearly; stiffnesses are set so the aircraft rests at datum y 1.96 (forebody keel 0.29 m under, bows
          // 0.10 m, sterns just wet) with the wide forebody carrying most of the load. Planing: the afterbody runs
          // dry (stern -90%), the bows lift clear (-60%) and the step (-30%) hands over to dynamic lift.
          const isBow = st.kind === 'bow', isStern = st.kind === 'stern';
          const K = isStern ? 36000 : isBow ? 24000 : 56000;
          const dc = isStern || isBow ? 0.15 : 0.2;
          const immersion = depth < dc ? depth * depth / (2 * dc) : depth - dc / 2;
          const fade = isStern ? 1 - 0.9 * planing : isBow ? 1 - 0.6 * planing : 1 - 0.3 * planing;
          // deck awash: the flared hull resists being driven under (keeps a nose-over from submarining)
          fy = K * Math.min(immersion, 0.9) * fade + 30000 * Math.max(depth - 0.45, 0) ** 2;
          // heave damping 5500 N s/m per station (zeta ~0.65 for the 1.3 Hz heave mode; 1800 gave 0.37 and a
          // visible wallow after every touchdown), fading with immersion so a barely-wet stern does not damp
          fy -= 5500 * wet * (1 - 0.5 * planing) * vPoint.y;
          // hydrodynamic drag: hump drag before planing (~60% of static thrust at 12 m/s), then mostly spray and
          // skin friction; the linear term is wave-making at taxi speed and coasts the aircraft to rest at idle
          fh = -(4.5 * vh * vh * (1 - 0.85 * planing) + 30 * vh) * Math.min(depth / 0.3, 1);
        }
      } else {
        onGround = true;
        // oleo/tyre: 52 kN/m and 6 kN s/m per wheel (zeta ~0.55 in heave), rolling resistance 3%, brakes 45%
        const k = 52000;
        fy = k * Math.min(depth, 0.5) - 6000 * vPoint.y;
        const roll = inp.brake ? 0.45 : 0.03;
        fh = -roll * Math.max(fy, 0) * Math.min(vh, 1);
        // lateral grip: cornering stiffness 900 N per m/s of slip, capped by tyre friction
        const sideDir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion);
        sideDir.y = 0; sideDir.normalize();
        const vSide = vPoint.dot(sideDir);
        const grip = clamp(-vSide * 900, -0.9 * Math.max(fy, 0), 0.9 * Math.max(fy, 0));
        worldF.copy(sideDir).multiplyScalar(grip);
        this.applyForce(worldF, cpWorld, dt);
      }
      fy = Math.max(fy, 0);
      worldF.set(0, fy, 0);
      if (vh > 0.01) worldF.add(this.tmpV.set(vPoint.x / vh, 0, vPoint.z / vh).multiplyScalar(fh));
      this.applyForce(worldF, cpWorld, dt);
    }
    // water rudders / keel steering at low speed on the water
    if (wetStations > 0) {
      const vh = groundSpeed;
      this.omega.y -= rud * 1500 * Math.min(vh / 6, 1) * (wetStations / 6) * dt / this.inertia.y;
    }

    // ---- crash detection: slamming into any surface, or a hillside at speed
    if (anyContact && this.velocity.y < -15) this.crash();
    if (onGround && groundSpeed > 25) {
      const sx = this.heightAt(this.position.x + 2, this.position.z) - this.heightAt(this.position.x - 2, this.position.z);
      const sz = this.heightAt(this.position.x, this.position.z + 2) - this.heightAt(this.position.x, this.position.z - 2);
      if (Math.hypot(sx, sz) / 4 > 0.2) this.crash();
    }

    // ---- integrate translational motion
    const fWorld = fBody.applyQuaternion(this.quaternion);
    fWorld.y -= this.mass * G;
    this.velocity.addScaledVector(fWorld, dt / this.mass);
    this.position.addScaledVector(this.velocity, dt);
    // rotational
    this.omega.x += (M.x / this.inertia.x) * dt;
    this.omega.y += (M.y / this.inertia.y) * dt;
    this.omega.z += (M.z / this.inertia.z) * dt;
    // a little extra rotational damping in contact so the aircraft settles
    if (onWater || onGround) this.omega.multiplyScalar(1 - 0.8 * dt);
    const dq = new THREE.Quaternion(this.omega.x * dt * 0.5, this.omega.y * dt * 0.5, this.omega.z * dt * 0.5, 1).normalize();
    this.quaternion.multiply(dq).normalize();

    // hard floor: the datum can never pass through the surface even if every contact station failed
    const gh = this.heightAt(this.position.x, this.position.z);
    const floor = Math.max(gh, 0) + 0.8;
    if (this.position.y < floor) {
      this.position.y = floor;
      if (this.velocity.y < 0) this.velocity.y *= -0.1;
      this.velocity.multiplyScalar(1 - 2.5 * dt);
    }

    // wrecked attitude on the surface (on its back, on a wing, nosed over) -> reset; the timer trips at 2.9 s so
    // that with frame granularity the aircraft never stays inverted on the surface past the 3 s limit
    const upY = 1 - 2 * (this.quaternion.x * this.quaternion.x + this.quaternion.z * this.quaternion.z);
    const nearSurface = anyContact || this.position.y - Math.max(gh, 0) < 3.5;
    if (nearSurface && upY < 0.35) { this.wreckedTimer += dt; if (this.wreckedTimer > 2.9) this.crash(); }
    else this.wreckedTimer = 0;

    const fwd = this.forward(this.tmpV);
    if (Math.hypot(fwd.x, fwd.z) > 0.2) this.lastHeading = Math.atan2(fwd.x, -fwd.z);
    this.telemetry.alpha = alpha;
    this.telemetry.beta = beta;
    this.telemetry.stalled = stalled && V > 12;
    this.telemetry.onWater = onWater;
    this.telemetry.onGround = onGround;
    // load factor along the body up axis (aerodynamic + contact specific force), 1 g at rest
    this.telemetry.gForce = (aeroUp + this.contactUp) / (this.mass * G);
    this.telemetry.buffet = this.buffet;
    this.telemetry.gustLevel = clamp(this.gust.length() / 2.5, 0, 1) * smoothstep(8, 25, V);
    this.telemetry.shake = clamp(this.buffet * 0.7 + this.telemetry.gustLevel * 0.5 + smoothstep(60, 100, V) * 0.25, 0, 1);
  }

  /**
   * Recoverable crash: put the aircraft upright at rest on the surface where it is, engine at idle, and raise
   * the `crashed` telemetry flag for a few seconds so the HUD can say so.
   */
  private crash(): void {
    const gh = this.heightAt(this.position.x, this.position.z);
    const land = gh > 0.05;
    this.position.y = land ? gh + FlightModel.WHEEL_REST_Y : FlightModel.FLOAT_REST_Y;
    this.quaternion.setFromEuler(new THREE.Euler(0, this.headingToYaw(this.lastHeading), 0));
    this.velocity.set(0, 0, 0);
    this.omega.set(0, 0, 0);
    this.rpm = 0.08;
    this.buffet = 0;
    this.wreckedTimer = 0;
    this.crashTimer = 5;
  }

  /** yaw angle about +Y that makes body +X point along compass heading `h` (0 = north = -Z, 90 = east = +X) */
  private headingToYaw(h: number): number { return Math.atan2(Math.cos(h), Math.sin(h)); }

  private applyForce(f: THREE.Vector3, at: THREE.Vector3, dt: number): void {
    this.velocity.addScaledVector(f, dt / this.mass);
    // body-up component of the contact force (for the load factor); up axis in world = second column of R(q)
    const q = this.quaternion;
    this.contactUp += f.x * 2 * (q.x * q.y - q.w * q.z) + f.y * (1 - 2 * (q.x * q.x + q.z * q.z)) + f.z * 2 * (q.y * q.z + q.w * q.x);
    const r = this.tmpV.copy(at).sub(this.position);
    const torque = r.cross(f); // world torque
    torque.applyQuaternion(this.invQ); // to body
    this.omega.x += (torque.x / this.inertia.x) * dt;
    this.omega.y += (torque.y / this.inertia.y) * dt;
    this.omega.z += (torque.z / this.inertia.z) * dt;
  }

  /** Contact state from geometry alone (no forces), for aircraft placed statically by the bench or a spawn. */
  private probeContacts(): void {
    let onWater = false, onGround = false;
    for (const st of this.stations) {
      if (st.kind === 'structure') continue;
      this.tmpV.copy(st.p).applyQuaternion(this.quaternion).add(this.position);
      const ground = this.heightAt(this.tmpV.x, this.tmpV.z);
      const isWater = ground <= 0.05;
      if (isWater && st.kind === 'wheel') continue;
      const depth = (isWater ? 0 : ground) - this.tmpV.y;
      if (depth <= 0) continue;
      if (isWater) onWater = true; else onGround = true;
    }
    this.telemetry.onWater = onWater;
    this.telemetry.onGround = onGround;
  }

  private updateTelemetry(inp: FlightInputs): void {
    const t = this.telemetry;
    const fwd = this.forward(this.tmpV);
    t.airspeed = this.tmpV2.copy(this.velocity).sub(this.wind).length();
    t.groundSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    t.altitude = this.position.y;
    t.agl = this.position.y - Math.max(0, this.heightAt(this.position.x, this.position.z));
    t.verticalSpeed = this.velocity.y;
    t.heading = ((Math.atan2(fwd.x, -fwd.z) * 180) / Math.PI + 360) % 360;
    t.rpm = this.rpm;
    t.gearDown = this.gearDown;
    // bank: roll angle of the body right axis about the forward axis; pitch: elevation of the forward axis
    const right = this.tmpV2.set(0, 0, 1).applyQuaternion(this.quaternion);
    t.bank = Math.asin(clamp(-right.y, -1, 1));
    t.pitchAngle = Math.asin(clamp(fwd.y, -1, 1));
    t.crashed = this.crashTimer > 0;
    void inp;
  }
}
