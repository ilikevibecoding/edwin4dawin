// Touch / mobile controls: a floating virtual joystick (lower-left) for walking, drag-to-look anywhere else,
// on-screen buttons (interact, sprint, board / exterior view), one-finger orbit + pinch zoom in the exterior
// view, and tappable menus. No pointer lock or keyboard is required. Desktop behaviour is unchanged.
import * as THREE from "three";

export function isTouchDevice() {
  const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  const touchPoints = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
  const noHover = window.matchMedia && window.matchMedia("(hover: none)").matches;
  return (coarse && touchPoints) || (noHover && touchPoints);
}

const STICK_RADIUS = 52; // px travel of the knob
const LOOK_SENS = 0.0045; // rad per px
const ORBIT_SENS = 0.006;

export class TouchControls {
  constructor({ player, rig, modes, hud, audio, interactions }) {
    this.player = player;
    this.rig = rig;
    this.modes = modes;
    this.hud = hud;
    this.audio = audio;
    this.interactions = interactions;
    this.pointers = new Map(); // pointerId -> { role, x0, y0, x, y, px, py }
    this.look = new THREE.Vector2(); // accumulated look delta (px) for this frame
    this.orbit = new THREE.Vector2();
    this.pinch = null; // { d0, r0 }
    this.zoomFactor = 1;
    this.sprint = false;
    this.buildDom();
    document.body.classList.add("touch");
    player.touchMode = true;
  }

  buildDom() {
    const ui = document.createElement("div");
    ui.id = "touch-ui";
    ui.innerHTML = `
      <div id="stick" class="hidden"><div id="stick-base"></div><div id="stick-knob"></div></div>
      <div id="touch-buttons">
        <button id="tb-interact" class="tb hidden">USE</button>
        <button id="tb-sprint" class="tb">RUN</button>
        <button id="tb-mode" class="tb">BOARD</button>
      </div>
      <div id="touch-hint"></div>`;
    document.body.appendChild(ui);
    this.ui = ui;
    this.stick = ui.querySelector("#stick");
    this.knob = ui.querySelector("#stick-knob");
    this.btnInteract = ui.querySelector("#tb-interact");
    this.btnSprint = ui.querySelector("#tb-sprint");
    this.btnMode = ui.querySelector("#tb-mode");
    this.hint = ui.querySelector("#touch-hint");

    // buttons act on pointerup (a cancelled touchstart would suppress synthetic clicks); stopPropagation keeps
    // them from starting a look / stick pointer on the overlay. Scrolling / zooming is blocked by CSS touch-action.
    const bind = (btn, fn) => {
      btn.addEventListener("pointerdown", (e) => e.stopPropagation());
      btn.addEventListener("pointerup", (e) => {
        e.stopPropagation();
        fn();
      });
      btn.addEventListener("click", (e) => e.preventDefault());
    };
    bind(this.btnInteract, () => {
      if (this.modes.isInterior) this.interactions.activate();
    });
    bind(this.btnSprint, () => {
      this.sprint = !this.sprint;
      this.btnSprint.classList.toggle("on", this.sprint);
    });
    bind(this.btnMode, () => {
      if (this.modes.busy) return;
      if (this.modes.isInterior) this.modes.exit();
      else this.modes.board();
    });

    ui.addEventListener("pointerdown", (e) => this.onDown(e));
    ui.addEventListener("pointermove", (e) => this.onMove(e));
    ui.addEventListener("pointerup", (e) => this.onUp(e));
    ui.addEventListener("pointercancel", (e) => this.onUp(e));
    ui.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  setMode(mode) {
    const interior = mode === "interior";
    this.btnMode.textContent = interior ? "EXTERIOR" : "BOARD";
    this.btnSprint.classList.toggle("hidden", !interior);
    this.hint.textContent = interior ? "left: walk · right: look · USE interacts" : "drag: orbit · pinch: zoom";
    if (!interior) {
      this.stick.classList.add("hidden");
      this.player.touch.move.set(0, 0);
    }
  }

  onDown(e) {
    if (this.hud.menuOpen && this.hud.menuOpen()) return;
    this.ui.setPointerCapture && this.ui.setPointerCapture(e.pointerId);
    const w = window.innerWidth;
    const h = window.innerHeight;
    let role = "look";
    if (this.modes.isInterior) {
      const stickZone = e.clientX < w * 0.42 && e.clientY > h * 0.35 && ![...this.pointers.values()].some((p) => p.role === "stick");
      if (stickZone) role = "stick";
    } else role = "orbit";
    this.pointers.set(e.pointerId, { role, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, px: e.clientX, py: e.clientY });
    if (role === "stick") {
      this.stick.classList.remove("hidden");
      this.stick.style.left = `${e.clientX}px`;
      this.stick.style.top = `${e.clientY}px`;
      this.knob.style.transform = "translate(-50%, -50%)";
    }
    if (role === "orbit") {
      const orbiters = [...this.pointers.values()].filter((p) => p.role === "orbit");
      if (orbiters.length === 2) {
        const d0 = Math.hypot(orbiters[0].x - orbiters[1].x, orbiters[0].y - orbiters[1].y);
        this.pinch = { d0, r0: this.rig.goal.radius };
      }
      this.rig.idle = 0;
    }
  }

  onMove(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    p.px = p.x;
    p.py = p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (p.role === "look") {
      this.look.x += p.x - p.px;
      this.look.y += p.y - p.py;
    } else if (p.role === "orbit") {
      const orbiters = [...this.pointers.values()].filter((q) => q.role === "orbit");
      if (orbiters.length >= 2 && this.pinch) {
        const d = Math.hypot(orbiters[0].x - orbiters[1].x, orbiters[0].y - orbiters[1].y);
        if (d > 1) this.rig.goal.radius = THREE.MathUtils.clamp((this.pinch.r0 * this.pinch.d0) / d, 120, 6000);
      } else {
        this.orbit.x += p.x - p.px;
        this.orbit.y += p.y - p.py;
      }
      this.rig.idle = 0;
    } else if (p.role === "stick") {
      let dx = p.x - p.x0;
      let dy = p.y - p.y0;
      const len = Math.hypot(dx, dy);
      if (len > STICK_RADIUS) {
        dx = (dx / len) * STICK_RADIUS;
        dy = (dy / len) * STICK_RADIUS;
      }
      this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      // dead zone then linear
      const k = Math.max(0, (Math.min(len, STICK_RADIUS) / STICK_RADIUS - 0.12) / 0.88);
      const nx = len > 0 ? (dx / Math.max(len, 1e-6)) * k : 0;
      const ny = len > 0 ? (dy / Math.max(len, 1e-6)) * k : 0;
      this.player.touch.move.set(nx, -ny); // up on the stick = forward
    }
  }

  onUp(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    this.pointers.delete(e.pointerId);
    if (p.role === "stick") {
      this.stick.classList.add("hidden");
      this.player.touch.move.set(0, 0);
    }
    if (p.role === "orbit") {
      const orbiters = [...this.pointers.values()].filter((q) => q.role === "orbit");
      if (orbiters.length < 2) this.pinch = null;
    }
    // a short tap in the look zone with nothing else going on: treat as "use" when something is targeted
    if (p.role === "look" && Math.hypot(p.x - p.x0, p.y - p.y0) < 8 && this.modes.isInterior && this.interactions.hovered) {
      this.interactions.activate();
    }
  }

  update() {
    if (this.modes.isInterior) {
      if (this.look.lengthSq() > 0) {
        this.player.touchLook(-this.look.x * LOOK_SENS, -this.look.y * LOOK_SENS);
        this.look.set(0, 0);
      }
      this.player.touch.sprint = this.sprint;
      const hovered = !!this.interactions.hovered;
      this.btnInteract.classList.toggle("hidden", !hovered);
      if (hovered) this.btnInteract.textContent = (this.interactions.hovered.label || "USE").toUpperCase().slice(0, 14);
    } else {
      if (this.orbit.lengthSq() > 0) {
        this.rig.goal.theta -= this.orbit.x * ORBIT_SENS;
        this.rig.goal.phi = THREE.MathUtils.clamp(this.rig.goal.phi - this.orbit.y * ORBIT_SENS, 0.08, Math.PI - 0.08);
        this.orbit.set(0, 0);
      }
      this.btnInteract.classList.add("hidden");
    }
  }
}
