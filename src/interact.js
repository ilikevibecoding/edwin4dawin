export function createInteract({ player, vehicle, hud }) {
  const targets = [
    {
      id: 'door',
      label: 'E: Climb in',
      point: { x: 1.05, y: 1.1, z: 0.1 },
      radius: 1.15,
    },
    {
      id: 'lights',
      label: 'E: Headlights',
      point: { x: 0.0, y: 0.96, z: 2.15 },
      radius: 1.2,
    },
    {
      id: 'hood',
      label: 'E: Check engine',
      point: { x: 0.0, y: 1.18, z: 1.4 },
      radius: 1.15,
    },
  ];

  let hover = null;
  let busy = false;
  const ray = { origin: null, dir: null };

  function nearest(origin) {
    let best = null;
    let bestD = 2.4;
    for (const t of targets) {
      const dx = t.point.x - origin.x;
      const dy = t.point.y - origin.y;
      const dz = t.point.z - origin.z;
      const d = Math.hypot(dx, dy, dz);
      if (d < t.radius && d < bestD) {
        best = t;
        bestD = d;
      }
    }
    return best;
  }

  function fade(ms = 420) {
    hud.fade(true);
    return new Promise((r) => setTimeout(r, ms));
  }

  async function fire(id) {
    if (busy) return;
    busy = true;
    if (id === 'door') {
      if (player.seated) {
        await fade();
        player.stand();
        hud.status('Boots on the dirt.');
        hud.fade(false);
      } else {
        await fade();
        player.sit(vehicle.driverEye);
        hud.status('You settle into the seat.');
        hud.fade(false);
      }
    } else if (id === 'lights') {
      vehicle.setLights(!vehicle.state.lightsOn);
      hud.status(vehicle.state.lightsOn ? 'Lights on. Trail ahead.' : 'Lights off.');
    } else if (id === 'hood') {
      await fade(360);
      hud.status('Engine ready. Trail awaits.');
      hud.fade(false);
    }
    busy = false;
  }

  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyE' || e.repeat) return;
    if (player.seated) {
      fire('door');
      return;
    }
    if (hover) fire(hover.id);
  });

  function update() {
    if (player.seated) {
      hover = { id: 'door', label: 'E: Climb out' };
      hud.prompt(hover.label);
      return hover;
    }
    hover = nearest(player.position);
    hud.prompt(hover ? hover.label : '');
    return hover;
  }

  return { update, fire, targets, get hover() { return hover; }, ray };
}
