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
  g.addColorStop(0, '#3a7a88');
  g.addColorStop(0.35, '#1d5360');
  g.addColorStop(0.7, '#123844');
  g.addColorStop(1, '#0a242c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = 'rgba(140,200,210,0.16)';
  for (let i = 0; i < 36; i++) {
    ctx.beginPath();
    ctx.ellipse((i * 67) % 512, 80 + (i * 41) % 360, 70, 10, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(20,40,46,0.55)';
  ctx.beginPath();
  ctx.moveTo(0, 390);
  ctx.lineTo(80, 320);
  ctx.lineTo(160, 360);
  ctx.lineTo(260, 280);
  ctx.lineTo(360, 340);
  ctx.lineTo(512, 300);
  ctx.lineTo(512, 512);
  ctx.lineTo(0, 512);
  ctx.fill();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

export function createWindowVista() {
  const g = new Group();
  g.name = 'windowVista';
  const backdrop = new Mesh(
    new PlaneGeometry(4.2, 2.4),
    new MeshBasicMaterial({
      map: waterCanvas(),
      color: 0xc8e8ec,
      fog: false,
      side: DoubleSide,
      depthWrite: false,
    })
  );
  backdrop.position.set(0, 0.06, -0.52);
  backdrop.renderOrder = -2;
  g.add(backdrop);

  const wash = new Mesh(
    backdrop.geometry,
    new MeshBasicMaterial({
      color: 0x4aa0a8,
      transparent: true,
      opacity: 0.22,
      fog: false,
      side: DoubleSide,
      depthWrite: false,
    })
  );
  wash.position.set(0, 0.06, -0.4);
  wash.renderOrder = -1;
  g.add(wash);

  const rand = mulberry32(SEED + 90);
  for (let i = 0; i < 5; i++) {
    const pts = [];
    const h = 0.7 + rand() * 1.1;
    for (let k = 0; k < 6; k++) pts.push([(0.18 + rand() * 0.28) * (1 - k / 7), (k / 5) * h]);
    const rock = new Mesh(
      latheProfile(pts, 6),
      new MeshBasicMaterial({ color: new Color().setHSL(0.48, 0.18, 0.16 + rand() * 0.06), fog: false })
    );
    rock.position.set(-1.15 + i * 0.55, -0.62 - rand() * 0.12, -0.62 - rand() * 0.28);
    rock.scale.set(1.3 + rand() * 0.4, 1.2 + rand() * 0.5, 1.1);
    rock.renderOrder = -1;
    g.add(rock);
  }

  const pos = new Float32Array(90 * 3);
  for (let i = 0; i < 90; i++) {
    pos[i * 3] = (rand() - 0.5) * 3.2;
    pos[i * 3 + 1] = (rand() - 0.5) * 1.8;
    pos[i * 3 + 2] = -0.45 - rand() * 1.4;
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  const pts = new Points(
    geo,
    new PointsMaterial({
      color: 0xd8f0f4,
      size: 0.028,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: AdditiveBlending,
    })
  );
  pts.renderOrder = 1;
  g.add(pts);
  g.userData.particles = pts;
  g.userData.backdrop = backdrop;
  g.position.set(0, 1.26, 0.28);
  return g;
}

export function updateVista(vista, t) {
  if (!vista?.userData.particles) return;
  vista.userData.particles.position.x = Math.sin(t * 0.35) * 0.2;
  vista.userData.particles.position.y = (t * 0.12) % 0.35;
  if (vista.userData.backdrop) {
    vista.userData.backdrop.position.x = Math.sin(t * 0.04) * 0.08;
  }
}
