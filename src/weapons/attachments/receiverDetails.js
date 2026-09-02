import * as THREE from 'three';
import { PartsBuilder } from './lib.js';

/**
 * Receiver detail pass for the glTF M4A1 — everything the model lacks that the reference reads at arm's length:
 *
 *   - roll-marked magazine well (left): "PROPERTY OF U.S. GOVT. / M4A1 CARBINE / CAL. 5.56 MM / serial" as an
 *     engraved decal (dark groove + lit lower edge), on the flat left face of the mag well (x = -13 mm, probed)
 *   - forge mark (keyhole-in-circle) on the left upper receiver
 *   - cartridge legend on the right side of the mag well
 *
 * The GLB already carries the forward assist, dust cover, charging handle, selector, bolt catch and mag release
 * as geometry, so no primitives are added for those. Positions are gunRoot millimetres, measured by raycasting the
 * GLB (tools notes in the surface probe): receiver left face x = -14 (upper) / -13 (mag well), right face
 * x = +13 (upper) / +11 (mag well).
 *
 * Also hides the orphaned carry-handle knobs (Sight_2 / Switch1 / Switch2) that the rig leaves floating above the
 * rear of the rail when the handle itself is hidden (WeaponSystem only hides `parts.carryHandle`).
 */
export function buildReceiverDetails(game, rig, mats, atlas) {
  const group = new THREE.Group();
  group.name = 'ReceiverDetails';
  rig.attachments.add(group);

  // --- orphaned carry-handle parts
  if (rig.parts?.carryHandle && !rig.parts.carryHandle.visible) {
    rig.gltfScene.traverse((o) => {
      if (o.isMesh && (o.name === 'Sight_2' || o.name === 'Switch1' || o.name === 'Switch2')) o.visible = false;
    });
  }

  const labels = new PartsBuilder('ReceiverLabels');
  const leftFace = -13.0 - 0.15;
  const upperLeft = -14.0 - 0.15;

  // engraved text helper: light edge offset up, dark groove on top
  const engrave = (ctx, w, h, ppm, lines, size, { weight = 'bold', spacing = 0.12, align = 'left', x0 = 0.6 } = {}) => {
    const px = size * ppm;
    ctx.font = `${weight} ${px}px Arial, Helvetica, sans-serif`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing * ppm}px`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = align;
    const lineH = px * 1.28;
    const total = lineH * lines.length;
    const x = align === 'center' ? w / 2 : x0 * ppm;
    lines.forEach((t, i) => {
      const y = h / 2 - total / 2 + lineH * (i + 0.5);
      ctx.fillStyle = 'rgba(190,194,200,0.55)';
      ctx.fillText(t, x, y + 0.14 * ppm);
      ctx.fillStyle = 'rgba(16,16,18,0.92)';
      ctx.fillText(t, x, y);
    });
  };

  // --- mag well roll marks (left)
  labels.add(
    atlas.decal(56, 22, (ctx, w, h, ppm) => {
      engrave(ctx, w, h, ppm, ['PROPERTY OF U.S. GOVT.', 'M4A1 CARBINE', 'CAL. 5.56 MM', 'W 442873'], 3.0, { x0: 1.2 });
    }),
    atlas.material,
    { pos: [leftFace, -31, -50], rot: [0, -Math.PI / 2, 0] },
  );
  // small maker's mark + "MADE IN USA" under the roll marks
  labels.add(
    atlas.decal(30, 5, (ctx, w, h, ppm) => {
      engrave(ctx, w, h, ppm, ['SEASIDE ARMORY  -  MADE IN U.S.A.'], 1.6, { weight: 'normal', spacing: 0.08, align: 'center' });
    }),
    atlas.material,
    { pos: [leftFace, -46, -50], rot: [0, -Math.PI / 2, 0] },
  );

  // --- forge mark on the upper receiver (keyhole in a circle)
  labels.add(
    atlas.decal(9, 9, (ctx, w, h, ppm) => {
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.42;
      ctx.lineWidth = 0.3 * ppm;
      ctx.strokeStyle = 'rgba(200,204,210,0.5)';
      ctx.beginPath();
      ctx.arc(cx, cy + 0.14 * ppm, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(16,16,18,0.7)';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      // keyhole
      ctx.fillStyle = 'rgba(16,16,18,0.7)';
      ctx.beginPath();
      ctx.arc(cx, cy - r * 0.25, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.16, cy - r * 0.05);
      ctx.lineTo(cx + r * 0.16, cy - r * 0.05);
      ctx.lineTo(cx + r * 0.28, cy + r * 0.62);
      ctx.lineTo(cx - r * 0.28, cy + r * 0.62);
      ctx.closePath();
      ctx.fill();
    }),
    atlas.material,
    { pos: [upperLeft, 21, 14], rot: [0, -Math.PI / 2, 0] },
  );

  // --- ejection-port side: cartridge legend on the lower receiver (right) and "M4A1" on the mag well
  const rightFace = 11.0 + 0.15;
  labels.add(
    atlas.decal(30, 7, (ctx, w, h, ppm) => {
      engrave(ctx, w, h, ppm, ['M4A1  -  5.56 x 45 NATO'], 2.2, { align: 'center' });
    }),
    atlas.material,
    { pos: [rightFace, -30, -50], rot: [0, Math.PI / 2, 0] },
  );

  labels.build(group, { castShadow: false });

  return { group };
}
