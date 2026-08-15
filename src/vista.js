import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
  SRGBColorSpace,
} from 'three';
import { latheProfile } from './geom.js';
import { SEED, mulberry32 } from './seed.js';

function waterCanvas() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#1a4a58');
  g.addColorStop(0.45, '#0e3a44');
  g.addColorStop(1, '#0a2228');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = 'rgba(90,140,150,0.12)';
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    ctx.arc((i * 73) % 512, (i * 47) % 512, 8 + (i % 5), 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

export function createWindowVista() {
  const g = new Group();
  g.name = 'windowVista';
  const backdrop = new Mesh(
    new PlaneGeometry(14, 8),
    new MeshBasicMaterial({
      map: waterCanvas(),
      color: 0x6aa8b0,
      fog: false,
      side: DoubleSide,
    })
  );
  backdrop.position.set(0, 0.05, -2.2);
  g.add(backdrop);
  const nearWash = new Mesh(
    new PlaneGeometry(6, 3.4),
    new MeshBasicMaterial({
      color: 0x245864,
      transparent: true,
      opacity: 0.35,
      fog: false,
      side: DoubleSide,
      depthWrite: false,
    })
  );
  nearWash.position.set(0, 0.05, -1.15);
  g.add(nearWash);

  const rand = mulberry32(SEED + 90);
  const rockMat = new MeshStandardMaterial({
    color: new Color(0x24383c),
    roughness: 0.92,
    metalness: 0.04,
    envMapIntensity: 0.3,
  });
  for (let i = 0; i < 7; i++) {
    const pts = [];
    const h = 1.4 + rand() * 2.2;
    for (let k = 0; k < 7; k++) pts.push([(0.25 + rand() * 0.45) * (1 - k / 8), (k / 6) * h]);
    const rock = new Mesh(latheProfile(pts, 7), rockMat);
    rock.position.set(-2.4 + i * 0.8, -1.15 - rand() * 0.25, -1.4 - rand() * 1.6);
    rock.scale.set(1.6 + rand(), 1.5 + rand() * 0.8, 1.4);
    rock.material = new MeshBasicMaterial({ color: 0x1c3338, fog: false });
    g.add(rock);
  }

  const pos = new Float32Array(180 * 3);
  for (let i = 0; i < 180; i++) {
    pos[i * 3] = (rand() - 0.5) * 5;
    pos[i * 3 + 1] = (rand() - 0.5) * 3;
    pos[i * 3 + 2] = -1 - rand() * 6;
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  const pts = new Points(
    geo,
    new PointsMaterial({
      color: 0xc8e0e4,
      size: 0.03,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      blending: AdditiveBlending,
    })
  );
  g.add(pts);
  g.userData.particles = pts;
  g.position.set(0, 1.15, 0.05);
  return g;
}

export function updateVista(vista, t) {
  if (!vista?.userData.particles) return;
  vista.userData.particles.position.x = Math.sin(t * 0.2) * 0.25;
  vista.userData.particles.position.y = (t * 0.08) % 0.4;
}
