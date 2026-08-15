import * as THREE from 'three';

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
  const worldEye = new THREE.Vector3();
  const marker = new THREE.Group();
  marker.name = 'interact-marker';
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.08, 0.12, 22),
    new THREE.MeshBasicMaterial({
      color: 0xf3ead6,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  marker.add(ring);
  marker.visible = false;
  if (vehicle.root) vehicle.root.add(marker);

  function placeLine() {
    return player.seated ? 'Trailhead · in the seat' : 'Trailhead · on foot';
  }

  function worldFromVehicle(local) {
    worldEye.set(local.x, local.y, local.z);
    if (vehicle.root) {
      vehicle.root.updateMatrixWorld(true);
      worldEye.applyMatrix4(vehicle.root.matrixWorld);
    }
    return worldEye;
  }

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

  function setMarker(point) {
    if (!point) {
      marker.visible = false;
      return;
    }
    marker.position.set(point.x, point.y, point.z);
    const pulse = 1 + Math.sin(performance.now() * 0.006) * 0.1;
    marker.scale.setScalar(pulse);
    marker.visible = true;
  }

  async function fire(id) {
    if (busy) return;
    busy = true;
    if (id === 'door') {
      if (player.seated) {
        await fade();
        player.stand();
        hud.status(placeLine());
        hud.fade(false);
      } else {
        await fade();
        player.sit(worldFromVehicle(vehicle.driverEye));
        hud.status(placeLine());
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
      hover = { id: 'door', label: 'E: Climb out', point: targets[0].point };
      hud.prompt(hover.label);
      setMarker(hover.point);
      return hover;
    }
    hover = nearest(player.position);
    hud.prompt(hover ? hover.label : '');
    setMarker(hover ? hover.point : null);
    return hover;
  }

  return { update, fire, targets, marker, get hover() { return hover; }, ray };
}
