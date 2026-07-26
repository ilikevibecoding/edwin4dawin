// Foliage alpha-card atlas (Fable 3 domain, WP-012b). One 256px canvas holds leaf silhouettes
// for three office-plant species; every plant is a few crossed cutout quads (alphaTest, so the
// cards stay in the opaque pass and merge into the zone buckets like everything else).
import * as THREE from 'three';

let built = null;

export function getFlora() {
  if (built) return built;
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.clearRect(0, 0, S, S);

  const leaf = (x, y, w, h, rot, fill) => {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.fillStyle = fill;
    g.beginPath();
    g.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };

  // --- tile 1 (x 0..85): ficus canopy — dense oval leaf mass on twigs, ragged edge ---
  const T1 = { x0: 2, y0: 2, w: 82, h: 120 };
  g.strokeStyle = '#4a3b26';
  g.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.moveTo(T1.x0 + T1.w / 2, T1.y0 + T1.h);
    g.quadraticCurveTo(T1.x0 + T1.w / 2 + (i - 2) * 8, T1.y0 + T1.h * 0.6, T1.x0 + 10 + i * 15, T1.y0 + T1.h * 0.25);
    g.stroke();
  }
  for (let i = 0; i < 90; i++) {
    const a = i * 2.399963; // golden angle scatter
    const r = Math.sqrt((i + 3) / 93);
    const x = T1.x0 + T1.w / 2 + Math.cos(a) * r * T1.w * 0.48;
    const y = T1.y0 + T1.h * 0.38 + Math.sin(a) * r * T1.h * 0.36;
    const shade = 44 + ((i * 37) % 46);
    leaf(x, y, 5.5, 9, a, `rgb(${shade * 0.72 | 0},${shade + 42},${shade * 0.6 | 0})`);
  }

  // --- tile 2 (x 90..150): snake plant — upright tapering blades, pale margins ---
  const T2 = { x0: 90, y0: 4, w: 60, h: 122 };
  for (let i = 0; i < 7; i++) {
    const bx = T2.x0 + 6 + i * 8 + (i % 2) * 2;
    const lean = (i - 3) * 0.09;
    const hh = T2.h * (0.62 + ((i * 53) % 40) / 100);
    const tipX = bx + lean * hh;
    // pale margin under-blade then green core
    g.fillStyle = '#c9c47a';
    g.beginPath();
    g.moveTo(bx - 5, T2.y0 + T2.h);
    g.quadraticCurveTo(bx - 4 + lean * 40, T2.y0 + T2.h - hh * 0.55, tipX, T2.y0 + T2.h - hh);
    g.quadraticCurveTo(bx + 4 + lean * 40, T2.y0 + T2.h - hh * 0.55, bx + 5, T2.y0 + T2.h);
    g.fill();
    g.fillStyle = i % 2 ? '#3d6b35' : '#2f5a2c';
    g.beginPath();
    g.moveTo(bx - 3, T2.y0 + T2.h);
    g.quadraticCurveTo(bx - 2.5 + lean * 40, T2.y0 + T2.h - hh * 0.55, tipX, T2.y0 + T2.h - hh);
    g.quadraticCurveTo(bx + 2.5 + lean * 40, T2.y0 + T2.h - hh * 0.55, bx + 3, T2.y0 + T2.h);
    g.fill();
    // banding
    g.fillStyle = 'rgba(200,210,140,0.28)';
    for (let b = 0; b < 4; b++) {
      g.fillRect(bx - 3, T2.y0 + T2.h - hh * (0.15 + b * 0.2), 6, 3);
    }
  }

  // --- tile 3 (x 156..254): fern — arching fronds with leaflets ---
  // WP-012c: leaflets enlarged + extra fronds so the frond line reads connected up close
  // (audit: the copy-room fern read as separated dots at <1 m).
  const T3 = { x0: 156, y0: 6, w: 98, h: 118 };
  for (let i = 0; i < 11; i++) {
    const a0 = -Math.PI / 2 + (i - 5) * 0.27;
    const baseX = T3.x0 + T3.w / 2, baseY = T3.y0 + T3.h;
    const len = T3.h * (0.72 + ((i * 31) % 25) / 100);
    const steps = 14;
    let px = baseX, py = baseY, ang = a0;
    for (let s2 = 0; s2 < steps; s2++) {
      const t = s2 / steps;
      ang += 0.05 * (i < 5 ? -1 : 1); // arch away from center
      const nx = px + Math.cos(ang) * (len / steps);
      const ny = py + Math.sin(ang) * (len / steps);
      const shade = 52 + ((i * 29 + s2 * 17) % 40);
      leaf((px + nx) / 2, (py + ny) / 2, 9.5 * (1 - t * 0.62), 3.4, ang + Math.PI / 2, `rgb(${shade * 0.6 | 0},${shade + 58},${shade * 0.55 | 0})`);
      px = nx; py = ny;
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 1;
  tex.minFilter = THREE.LinearMipmapNearestFilter;
  const mat = new THREE.MeshStandardMaterial({
    map: tex, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9, metalness: 0,
  });
  mat.name = 'flora';

  const uv = (x0, y0, x1, y1) => ({ u0: x0 / S, v0: 1 - y1 / S, u1: x1 / S, v1: 1 - y0 / S });
  built = {
    mat,
    uv: {
      ficus: uv(0, 0, 86, 126),
      snake: uv(88, 0, 152, 128),
      fern: uv(154, 0, 256, 126),
    },
  };
  return built;
}
