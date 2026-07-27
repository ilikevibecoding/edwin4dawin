import * as THREE from 'three';
import { rand } from '../core/rand.js';

/**
 * UAV killstreak (streak 3, key [3]). While active game.state.uavActive is
 * true (timer lives in GameState) — the HUD minimap reads that flag to show
 * all enemies. A small recon drone orbits high over the map while online.
 *
 * API: available (int), grant(), activate(), update(dt)
 */
export class UAV {
  constructor(game) {
    this.game = game;
    this.available = 0;
    this.orbitT = 0;
    this.drone = this._buildDrone();
    this.drone.visible = false;
    game.scene.add(this.drone);
    // dev param: ?uav=1 grants + activates on the first frame (deterministic orbit)
    this._devActivate = new URLSearchParams(location.search).get('uav') === '1';
  }

  grant() { this.available++; }

  /** Predator-style silhouette: slim fuselage, long wing, V-tail (~120 tris). */
  _buildDrone() {
    const g = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color: 0xb9bec6, metalness: 0.55, roughness: 0.35 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x3a3e44, metalness: 0.5, roughness: 0.5 });

    const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 4.6, 7), body);
    fus.rotation.x = -Math.PI / 2;
    g.add(fus);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), body);
    nose.position.z = -2.3;
    nose.scale.set(1, 0.9, 1.4);
    g.add(nose);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(11, 0.09, 0.85), body);
    wing.position.set(0, 0.06, -0.4);
    g.add(wing);
    for (const sgn of [-1, 1]) {
      const tail = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.07, 0.6), dark);
      tail.position.set(sgn * 0.7, 0.28, 2.1);
      tail.rotation.z = sgn * 0.7; // inverted V-tail
      g.add(tail);
    }
    const sensor = new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 5), dark);
    sensor.position.set(0, -0.3, -1.7);
    g.add(sensor);
    // blinking nav strobe (HDR — pulses via bloom)
    const strobe = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 6, 4),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 1.2, 1.2), fog: false })
    );
    strobe.position.set(0, 0.14, 2.4);
    strobe.name = 'strobe';
    g.add(strobe);
    g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    return g;
  }

  activate() {
    const { state, events } = this.game;
    if (this.available <= 0 || state.uavActive) return false;
    this.available--;
    state.uavActive = true;
    state.uavT = state.uavDuration;
    events.emit('ui:message', { text: 'UAV ONLINE', sub: 'ENEMY POSITIONS REVEALED' });
    this.orbitT = rand() * 20;
    this.drone.visible = true;
    return true;
  }

  update(dt) {
    const { input, state } = this.game;
    if (this._devActivate) {
      this._devActivate = false;
      this.grant();
      this.activate();
      this.orbitT = 0;
    }
    if (input.pressed('Digit3')) this.activate();

    if (!state.uavActive) {
      if (this.drone.visible) this.drone.visible = false;
      return;
    }
    // slow racetrack orbit around the AO, banked into the turn, high enough
    // to catch the low sun but shallow enough to spot from the street
    this.orbitT += dt;
    const R = 70, ALT = 55, W = (Math.PI * 2) / 28; // 28s per lap
    const a = this.orbitT * W;
    this.drone.position.set(Math.cos(a) * R, ALT + Math.sin(this.orbitT * 0.5) * 1.5, Math.sin(a) * R);
    // model faces -z; travel direction (tangent) is (-sin a, 0, cos a)
    this.drone.rotation.set(0, Math.PI - a, 0);
    this.drone.rotateZ(0.3); // bank into the orbit
    // nav strobe blink (1 Hz double-flash)
    const s = this.drone.getObjectByName('strobe');
    const ph = this.orbitT % 1;
    s.visible = ph < 0.07 || (ph > 0.14 && ph < 0.21);
  }
}
