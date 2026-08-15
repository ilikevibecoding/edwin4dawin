import * as THREE from 'three';

export function createInteract({ player, vehicle, hud, drive }) {
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
  const worldPt = new THREE.Vector3();
  const exitPt = new THREE.Vector3();
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

  function worldFromVehicle(local, out = worldEye) {
    out.set(local.x, local.y, local.z);
    if (vehicle.root) {
      vehicle.root.updateMatrixWorld(true);
      out.applyMatrix4(vehicle.root.matrixWorld);
    }
    return out;
  }

  function nearest(origin) {
    let best = null;
    let bestD = 2.4;
    for (const t of targets) {
      worldFromVehicle(t.point, worldPt);
      const d = origin.distanceTo(worldPt);
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

  function exitWorld() {
    const heading = drive ? drive.state.heading : 0;
    const hx = Math.sin(heading);
    const hz = Math.cos(heading);
    // Driver door is +X in vehicle space.
    exitPt.set(
      (drive ? drive.state.x : 0) + hz * 1.7,
      0,
      (drive ? drive.state.z : 0) - hx * 1.7,
    );
    return exitPt;
  }

  async function fire(id) {
    if (busy) return;
    busy = true;
    if (id === 'door') {
      if (player.seated) {
        await fade();
        if (drive) drive.state.enabled = false;
        player.stand(exitWorld());
        hud.status(placeLine());
        hud.fade(false);
      } else {
        await fade();
        if (drive) drive.state.enabled = true;
        player.sit(() => worldFromVehicle(vehicle.driverEye, worldEye), drive ? drive.state.heading : 0);
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
      hover = {
        id: 'door',
        label: player.camMode === 'chase' ? 'E: Climb out · C: Cockpit' : 'E: Climb out · C: Chase',
        point: targets[0].point,
        worldPoint: worldFromVehicle(targets[0].point, worldPt).clone(),
      };
      hud.prompt(hover.label);
      setMarker(hover.point);
      return hover;
    }
    hover = nearest(player.position);
    if (hover) {
      hover = {
        ...hover,
        worldPoint: worldFromVehicle(hover.point, worldPt).clone(),
      };
    }
    hud.prompt(hover ? hover.label : '');
    setMarker(hover ? hover.point : null);
    return hover;
  }

  return { update, fire, targets, marker, get hover() { return hover; }, ray };
}
