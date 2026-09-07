// Shared screen/lighting effects for disasters: camera shake, lighting/fog overrides, flashes.
// game.js reads `override` every frame after the sky update and blends it into the uniforms.
import * as THREE from 'three';

export class Effects {
  constructor() {
    this.shakeAmp = 0;     // current shake amplitude (blocks)
    this.shakeDecay = 2.5;
    this.shakeOffset = new THREE.Vector3();
    this.shakeRot = 0;
    // lighting overrides (1 = untouched)
    this.override = {
      skyLightMul: 1,                        // multiplies sky light (tornado darkening)
      tint: new THREE.Vector3(1, 1, 1),      // multiplies sky tint (dusty / reddish)
      flash: 0,                              // additive brightness 0..1 (beam flash)
      flashColor: new THREE.Vector3(1, 0.95, 0.85),
      fogColor: null,                        // THREE.Color or null
      fogNearMul: 1, fogFarMul: 1,           // fog distance multipliers (<1 = denser)
      skyColor: new THREE.Color(0.24, 0.235, 0.25), skyMix: 0, // sky dome/horizon/celestials blend toward a storm colour
      cloudAlpha: 1,                         // vanilla cloud layer opacity multiplier (0 hides it under a storm deck)
    };
    this._target = { skyLightMul: 1, tint: new THREE.Vector3(1, 1, 1), fogNearMul: 1, fogFarMul: 1, fogColor: null, skyColor: new THREE.Color(0.24, 0.235, 0.25), skyMix: 0, cloudAlpha: 1 };
    this.flashTimer = 0;
    this.flashDuration = 0;
    this.flashPeak = 0;
  }

  shake(amplitude, decay = 2.5) { this.shakeAmp = Math.max(this.shakeAmp, Math.min(1.2, amplitude)); this.shakeDecay = decay; }

  // Smoothly approached lighting/fog target (call every frame while active; reset() returns to normal)
  setEnvironment({ skyLightMul, tint, fogColor, fogNearMul, fogFarMul, skyColor, skyMix, cloudAlpha } = {}) {
    const t = this._target;
    if (skyColor) t.skyColor.setRGB(skyColor[0], skyColor[1], skyColor[2]);
    if (skyMix !== undefined) t.skyMix = Math.max(0, Math.min(1, skyMix));
    if (cloudAlpha !== undefined) t.cloudAlpha = Math.max(0, Math.min(1, cloudAlpha));
    if (skyLightMul !== undefined) t.skyLightMul = skyLightMul;
    if (tint) t.tint.set(tint[0], tint[1], tint[2]);
    if (fogColor !== undefined) t.fogColor = fogColor ? new THREE.Color(fogColor[0], fogColor[1], fogColor[2]) : null;
    if (fogNearMul !== undefined) t.fogNearMul = fogNearMul;
    if (fogFarMul !== undefined) t.fogFarMul = fogFarMul;
  }

  flash(intensity = 1, duration = 0.6, color = null) {
    this.flashPeak = Math.min(1.5, intensity); this.flashDuration = duration; this.flashTimer = duration;
    if (color) this.override.flashColor.set(color[0], color[1], color[2]);
  }

  reset() { this.setEnvironment({ skyLightMul: 1, tint: [1, 1, 1], fogColor: null, fogNearMul: 1, fogFarMul: 1, skyMix: 0, cloudAlpha: 1 }); }

  update(dt) {
    // shake: random offset decaying
    if (this.shakeAmp > 0.001) {
      this.shakeOffset.set((Math.random() - 0.5) * 2 * this.shakeAmp, (Math.random() - 0.5) * 2 * this.shakeAmp * 0.7, (Math.random() - 0.5) * 2 * this.shakeAmp);
      this.shakeRot = (Math.random() - 0.5) * this.shakeAmp * 0.15;
      this.shakeAmp *= Math.max(0, 1 - this.shakeDecay * dt);
    } else { this.shakeOffset.set(0, 0, 0); this.shakeRot = 0; this.shakeAmp = 0; }
    // lighting targets
    const o = this.override, t = this._target, k = Math.min(1, dt * 2.5);
    o.skyLightMul += (t.skyLightMul - o.skyLightMul) * k;
    o.tint.lerp(t.tint, k);
    o.fogNearMul += (t.fogNearMul - o.fogNearMul) * k;
    o.fogFarMul += (t.fogFarMul - o.fogFarMul) * k;
    o.skyMix += (t.skyMix - o.skyMix) * k;
    o.cloudAlpha += (t.cloudAlpha - o.cloudAlpha) * k;
    o.skyColor.lerp(t.skyColor, k);
    if (t.fogColor) { if (!o.fogColor) o.fogColor = t.fogColor.clone(); else o.fogColor.lerp(t.fogColor, k); }
    else if (o.fogColor) { o.fogColor = null; }
    if (this.flashTimer > 0) { this.flashTimer -= dt; const x = Math.max(0, this.flashTimer / this.flashDuration); o.flash = this.flashPeak * x * x; }
    else o.flash = 0;
  }

  get active() { return this.shakeAmp > 0.001 || this.override.flash > 0.001 || Math.abs(this.override.skyLightMul - 1) > 0.01 || this.override.fogColor || Math.abs(this.override.fogFarMul - 1) > 0.01 || this.override.skyMix > 0.01 || this.override.cloudAlpha < 0.99; }
}
