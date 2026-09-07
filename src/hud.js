// ---------------------------------------------------------------------------
// One-line status readout plus the fade overlay. Deliberately tiny: the demo
// is a look test, not a UI exercise.
// ---------------------------------------------------------------------------

export function createHud() {
  const root = document.createElement('div');
  root.className = 'hud';
  root.innerHTML = `
    <div class="hud-corner hud-tl">
      <div class="hud-plate">
        <div class="hud-title">RIDGELINE TRAIL</div>
        <div class="hud-sub" id="hud-status">Auto-drive engaged</div>
      </div>
    </div>
    <div class="hud-corner hud-br">
      <div class="hud-plate">
        <div class="hud-speed"><span id="hud-speed">0</span><em>km/h</em></div>
        <div class="hud-sub" id="hud-cam">Chase cam</div>
        <div class="hud-rev" id="hud-rev"></div>
      </div>
    </div>
    <div class="hud-corner hud-bl">
      <div class="hud-plate hud-keys">
        <span><b>Click</b> views</span>
        <span><b>Drag</b> look</span>
        <span><b>WASD</b> drive</span>
        <span><b>C</b> camera</span>
        <span><b>P</b> photo</span>
        <span><b>N</b> time</span>
        <span><b>L</b> lights</span>
        <span><b>H</b> horn</span>
      </div>
    </div>
    <div class="hud-fade" id="hud-fade"></div>
  `;
  document.body.appendChild(root);

  const elSpeed = root.querySelector('#hud-speed');
  const elCam = root.querySelector('#hud-cam');
  const elStatus = root.querySelector('#hud-status');
  const elFade = root.querySelector('#hud-fade');
  // The live preview follows a branch tip, so the only way to know which build
  // is on screen is for the build to say so.
  root.querySelector('#hud-rev').textContent = `build ${__BUILD_REV__} · ${__BUILD_STAMP__}`;

  let statusTimer = 0;
  let restTimer = 0;
  const elKeys = root.querySelector('.hud-keys');

  return {
    root,
    /** The hour dims the type at night so the HUD is not the brightest thing on screen. */
    setHour(name) {
      root.dataset.hour = name;
    },
    /**
     * The first gesture proves the player has found the controls; ten seconds
     * later the legend steps back to a reminder instead of a caption competing
     * with the speed readout. Any later gesture brings it up again briefly.
     */
    noteInput() {
      restTimer = 10;
      elKeys.classList.remove('hud-keys--rest');
    },
    setSpeed(kmh) {
      elSpeed.textContent = Math.round(Math.abs(kmh)).toString();
    },
    setCamera(label) {
      elCam.textContent = label;
    },
    setStatus(text, hold = 2.6) {
      elStatus.textContent = text;
      statusTimer = hold;
    },
    fade(opacity) {
      elFade.style.opacity = String(opacity);
    },
    update(dt, fallback) {
      if (statusTimer > 0) {
        statusTimer -= dt;
        if (statusTimer <= 0 && fallback) elStatus.textContent = fallback;
      }
      if (restTimer > 0) {
        restTimer -= dt;
        if (restTimer <= 0) elKeys.classList.add('hud-keys--rest');
      }
    },
  };
}
