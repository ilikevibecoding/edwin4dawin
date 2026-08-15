import * as THREE from "three";
import { applyLightingState } from "./environment.js";

export class InteractionSystem {
  constructor(camera, ctx) {
    this.camera = camera;
    this.ctx = ctx;
    this.raycaster = new THREE.Raycaster();
    this.hover = null;
    this.promptEl = document.getElementById("prompt");
    this.statusEl = document.getElementById("status");
    this.fadeEl = document.getElementById("fade");
    this.statusTimer = 0;
    this.resting = false;
    this.highlight = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xe8d8a0, transparent: true, opacity: 0.35 })
    );
    this.highlight.visible = false;
    ctx.scene.add(this.highlight);
    this._onKey = (e) => {
      if (e.code === "KeyE") this.activate();
    };
    window.addEventListener("keydown", this._onKey);
  }

  setHUDVisible(v) {
    const hud = document.getElementById("hud");
    if (hud) hud.style.display = v ? "block" : "none";
  }

  showStatus(text, seconds = 2.4) {
    if (!this.statusEl) return;
    this.statusEl.textContent = text;
    this.statusEl.classList.add("visible");
    this.statusTimer = seconds;
    this.ctx.lastStatus = text;
  }

  update(dt) {
    if (this.statusTimer > 0) {
      this.statusTimer -= dt;
      if (this.statusTimer <= 0) this.statusEl?.classList.remove("visible");
    }
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hits = this.raycaster.intersectObjects(this.ctx.interactables, false);
    const hit = hits.find((h) => h.distance < 2.15);
    if (hit) {
      this.hover = hit.object;
      const prompt = hit.object.userData.interact?.prompt || "";
      if (this.promptEl) {
        this.promptEl.textContent = prompt;
        this.promptEl.classList.add("visible");
      }
      this.highlight.visible = true;
      this.highlight.position.copy(hit.point);
      this.ctx.hoverId = hit.object.userData.interact?.id || null;
    } else {
      this.hover = null;
      this.ctx.hoverId = null;
      this.promptEl?.classList.remove("visible");
      this.highlight.visible = false;
    }
    if (this.ctx.sonarSweep > 0) {
      this.ctx.sonarSweep = Math.max(0, this.ctx.sonarSweep - dt);
    }
  }

  activate(id = null) {
    const targetId = id || this.hover?.userData.interact?.id;
    if (!targetId) return false;
    if (targetId === "sonar") return this.doSonar();
    if (targetId === "rest") return this.doRest();
    if (targetId === "silentRunning") return this.doSilent();
    return false;
  }

  doSonar() {
    this.ctx.sonarSweep = 2.4;
    this.ctx.sonarPingAt = this.ctx.time;
    this.playPing();
    this.showStatus("Sonar pulse transmitted.");
    window.setTimeout(() => {
      if (this.ctx.sonarSweep >= 0) this.showStatus("No immediate contact.");
    }, 900);
    this.ctx.events.push({ name: "sonar", t: this.ctx.time });
    return true;
  }

  doRest() {
    if (this.resting) return false;
    this.resting = true;
    this.fadeEl?.classList.add("on");
    this.showStatus("6 hours pass.", 3.2);
    this.ctx.events.push({ name: "rest-start", t: this.ctx.time });
    window.setTimeout(() => {
      applyLightingState(this.ctx, "restCycle");
      this.ctx.requestedState = "restCycle";
    }, 500);
    window.setTimeout(() => {
      this.fadeEl?.classList.remove("on");
      this.showStatus("Rested.");
      this.ctx.events.push({ name: "rest-end", t: this.ctx.time });
    }, 2200);
    window.setTimeout(() => {
      applyLightingState(this.ctx, "cruising");
      this.ctx.requestedState = "cruising";
      this.resting = false;
    }, 5200);
    return true;
  }

  doSilent() {
    const next = this.ctx.submarineState === "silentRunning" ? "cruising" : "silentRunning";
    applyLightingState(this.ctx, next);
    this.ctx.spinScale = next === "silentRunning" ? 0.28 : 1;
    this.showStatus(
      next === "silentRunning" ? "Silent running engaged." : "Silent running disengaged."
    );
    this.ctx.events.push({ name: "silentRunning", state: next, t: this.ctx.time });
    return true;
  }

  playPing() {
    try {
      const ac = this.ctx.audio || new (window.AudioContext || window.webkitAudioContext)();
      this.ctx.audio = ac;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(180, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(55, ac.currentTime + 0.9);
      gain.gain.setValueAtTime(0.0001, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, ac.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 1.1);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + 1.15);
    } catch {
      /* audio optional */
    }
  }

  dispose() {
    window.removeEventListener("keydown", this._onKey);
  }
}
