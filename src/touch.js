// Touch controls for phones / tablets. Exterior: one finger orbits, two fingers pinch-zoom and pan.
// Interior: left half of the screen is a virtual joystick (move), right half drags to look; on-screen
// buttons board / exit the ship and trigger the interaction the crosshair is on. Pointer lock is never
// requested on touch devices; `player.touchMode` stands in for it.
import * as THREE from "three";

// primary pointer is a finger (phones, tablets); touch-screen laptops keep the desktop scheme
export function isTouchDevice() {
  return typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;
}

export function createTouchControls({ canvas, player, orbit, modes, interactions, hud }) {
  const layer = document.createElement("div");
  layer.id = "touch";
  layer.innerHTML = `
    <div id="stick"><div id="stick-nub"></div></div>
    <div id="touch-buttons">
      <button id="btn-mode" type="button">Board ship</button>
      <button id="btn-act" type="button" class="hidden">Interact</button>
      <button id="btn-run" type="button">Run</button>
    </div>`;
  document.body.appendChild(layer);
  const stick = layer.querySelector("#stick");
  const nub = layer.querySelector("#stick-nub");
  const btnMode = layer.querySelector("#btn-mode");
  const btnAct = layer.querySelector("#btn-act");
  const btnRun = layer.querySelector("#btn-run");

  player.touchMode = true;
  player.touchMove = new THREE.Vector2();
  player.touchRun = false;
  const pointers = new Map(); // id -> { x, y, startX, startY, role }
  let pinch = null; // { dist, cx, cy }
  const LOOK_SENS = 0.0045;
  const STICK_RADIUS = 60;

  function setStick(active, cx, cy, dx, dy) {
    stick.style.display = active ? "block" : "none";
    if (!active) return;
    stick.style.left = cx - STICK_RADIUS + "px";
    stick.style.top = cy - STICK_RADIUS + "px";
    nub.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function onDown(e) {
    if (e.target.closest("#touch-buttons") || e.target.closest("#start")) return;
    if (e.pointerType === "mouse") return; // desktop keeps its mouse/pointer-lock scheme
    e.preventDefault();
    const role = modes.mode === "interior" ? (e.clientX < window.innerWidth * 0.42 ? "move" : "look") : "orbit";
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, role });
    if (role === "move") setStick(true, e.clientX, e.clientY, 0, 0);
    if (modes.mode === "exterior" && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
    }
    if (modes.mode === "interior") hud.hideStart();
  }

  function onMove(e) {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    e.preventDefault();
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (modes.mode === "interior") {
      if (p.role === "move") {
        let vx = e.clientX - p.startX;
        let vy = e.clientY - p.startY;
        const len = Math.hypot(vx, vy);
        if (len > STICK_RADIUS) {
          vx *= STICK_RADIUS / len;
          vy *= STICK_RADIUS / len;
        }
        setStick(true, p.startX, p.startY, vx, vy);
        // right = +x strafe, up (negative screen y) = forward
        player.touchMove.set(vx / STICK_RADIUS, -vy / STICK_RADIUS);
      } else if (!player.frozen) {
        player.yaw -= dx * LOOK_SENS;
        player.pitch = THREE.MathUtils.clamp(player.pitch - dy * LOOK_SENS, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);
      }
    } else if (modes.mode === "exterior") {
      if (pointers.size === 1) {
        orbit.goal.yaw -= dx * 0.006;
        orbit.goal.pitch = THREE.MathUtils.clamp(orbit.goal.pitch + dy * 0.006, -1.35, 1.35);
      } else if (pointers.size === 2 && pinch) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        if (dist > 10) orbit.goal.distance = THREE.MathUtils.clamp(orbit.goal.distance * (pinch.dist / dist), 40, 14000);
        const k = orbit.goal.distance * 0.0016;
        const right = new THREE.Vector3().setFromMatrixColumn(orbit.camera.matrixWorld, 0);
        const upv = new THREE.Vector3().setFromMatrixColumn(orbit.camera.matrixWorld, 1);
        orbit.goal.target.addScaledVector(right, -(cx - pinch.cx) * k).addScaledVector(upv, (cy - pinch.cy) * k);
        pinch = { dist, cx, cy };
      }
    }
  }

  function onUp(e) {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    pointers.delete(e.pointerId);
    if (p.role === "move") {
      player.touchMove.set(0, 0);
      setStick(false);
    }
    if (pointers.size < 2) pinch = null;
  }

  canvas.style.touchAction = "none";
  canvas.addEventListener("pointerdown", onDown, { passive: false });
  window.addEventListener("pointermove", onMove, { passive: false });
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);

  btnMode.addEventListener("click", () => {
    if (modes.mode === "exterior") modes.boardShip();
    else if (modes.mode === "interior") modes.exitToExterior();
  });
  btnAct.addEventListener("click", () => interactions.activate());
  btnRun.addEventListener("click", () => {
    player.touchRun = !player.touchRun;
    btnRun.classList.toggle("on", player.touchRun);
  });

  function refresh() {
    const m = modes.mode;
    btnMode.textContent = m === "exterior" ? "Board ship" : "Exterior view";
    btnMode.classList.toggle("hidden", m === "transition");
    btnRun.classList.toggle("hidden", m !== "interior");
    const can = interactions.canAct();
    btnAct.classList.toggle("hidden", m !== "interior" || !can);
    if (interactions.hovered) btnAct.textContent = interactions.hovered.label || "Interact";
    else if (can) btnAct.textContent = "Ride lift";
  }

  return {
    layer,
    update() {
      refresh();
    },
  };
}
