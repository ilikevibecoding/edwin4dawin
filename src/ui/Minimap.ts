import type * as THREE from 'three';
import type { IAI, IWorld } from '../core/Interfaces';
import { Surface, clamp01, div } from './dom';

/**
 * The radar.
 *
 * ## Where the map comes from
 *
 * Nothing is authored. The schematic is derived once at boot from `IWorld`
 * itself, by asking `isWalkable` across a 0.3 m lattice over `IWorld.bounds`
 * and treating the answer as a floor plan: everywhere a soldier can stand is
 * open ground, everything else is structure. That is a genuinely better source
 * than the render geometry, because it is the same question the AI's navigation
 * asks — so the map shows the space the *game* believes exists, including the
 * souk's covered arcade and the villa's interior, and excluding the ledges and
 * parapets that a top-down projection of the meshes would smear over the
 * streets.
 *
 * Height then shades it: `terrainHeight` modulates the open tone so the crowned
 * carriageway and the raised compound read as different levels rather than as
 * one flat grey. And the boundary between open and closed is traced as a
 * hairline, which is the single thing that stops a minimap looking like a grey
 * blob. Outlines are what make a plan legible; fills alone never do.
 *
 * The trace is emitted as merged runs rather than per-cell segments — one
 * `Path2D`, two strokes — so a 320 x 440 lattice costs a few milliseconds at
 * boot and nothing afterwards.
 *
 * ## Per frame
 *
 * One `drawImage` of the baked schematic through a rotate-and-centre transform,
 * then the live symbology in screen space. Contacts are re-queried at 8 Hz into
 * a fixed pool, never per frame, and they linger for a moment after they go
 * quiet so a firefight does not flicker.
 */

/** Metres across the radar disc. Local tactical picture, not the whole map. */
const VIEW_METRES = 64;
/**
 * Canvas cannot resolve a custom property in `font` — there is no element to
 * resolve it against — and an unparseable font string silently leaves the
 * previous one in place, which means the default 10px sans. So the stack is
 * written out here, matching `--hud-font` in the stylesheet.
 */
const FACE = "'Rajdhani','DIN Alternate','Bahnschrift','Inter','Segoe UI',system-ui,sans-serif";
/** Sampling pitch of the walkability lattice, metres. */
const CELL = 0.3;
/** Pixels per metre in the baked schematic. Generous, for 4K displays. */
const BAKE_SCALE = 6;
const CONTACT_MEMORY = 2.6;

interface Contact {
  x: number;
  z: number;
  seen: number;
  alive: boolean;
  id: number;
}

interface Marker {
  x: number;
  z: number;
  kind: 'strike' | 'package' | 'aircraft' | 'objective';
  until: number;
}

export class Minimap {
  readonly root: HTMLElement;
  private readonly surface: Surface;
  private schematic: HTMLCanvasElement | null = null;
  private minX = -50;
  private minZ = -50;
  private spanX = 100;
  private spanZ = 100;

  private world: IWorld | null = null;
  private ai: IAI | null = null;
  private readonly contacts: Contact[] = [];
  private readonly markers: Marker[] = [];
  private readonly landmarks: Array<{ name: string; x: number; z: number }> = [];
  /** Negative so the first frame polls rather than waiting out the interval. */
  private queryAt = -99;
  private clock = 0;
  private sweep = 0;
  private uav = false;
  private sweepPeriod = 3;
  private size = 0;

  constructor(parent: HTMLElement) {
    this.root = div('hud-minimap', parent);
    this.surface = new Surface('hud-minimap-canvas', this.root);
    for (let i = 0; i < 48; i++) {
      this.contacts.push({ x: 0, z: 0, seen: -99, alive: false, id: -1 });
    }
    for (let i = 0; i < 8; i++) this.markers.push({ x: 0, z: 0, kind: 'strike', until: -1 });
  }

  attach(world: IWorld | null, ai: IAI | null): void {
    this.world = world;
    this.ai = ai;
    if (!world) return;
    this.landmarks.length = 0;
    for (const l of world.landmarks) {
      this.landmarks.push({ name: shorten(l.name), x: l.position.x, z: l.position.z });
    }
    this.bake(world);
  }

  resize(width: number, height: number, ratio: number): void {
    const size = Math.round(Math.min(width, height) * 0.29);
    this.size = size;
    this.root.style.width = `${size}px`;
    this.root.style.height = `${size}px`;
    this.surface.resize(size, size, ratio);
  }

  setUav(active: boolean, sweepPeriod: number): void {
    this.uav = active;
    this.sweepPeriod = Math.max(0.5, sweepPeriod);
  }

  /** Places the radar sweep at a chosen phase, for the screenshot harness. */
  poseSweep(phase: number): void {
    this.sweep = phase - Math.floor(phase);
  }

  mark(kind: Marker['kind'], position: THREE.Vector3, seconds: number): void {
    let slot = this.markers[0];
    for (const m of this.markers) {
      if (m.kind === kind) {
        slot = m;
        break;
      }
      if (m.until < slot.until) slot = m;
    }
    slot.kind = kind;
    slot.x = position.x;
    slot.z = position.z;
    slot.until = this.clock + seconds;
  }

  clearMarkers(kind?: Marker['kind']): void {
    for (const m of this.markers) if (!kind || m.kind === kind) m.until = -1;
  }

  clear(): void {
    this.clearMarkers();
    for (const c of this.contacts) c.seen = -99;
  }

  /* ------------------------------- baking -------------------------------- */

  private bake(world: IWorld): void {
    const t0 = performance.now();
    const pad = 3;
    this.minX = world.bounds.min.x - pad;
    this.minZ = world.bounds.min.z - pad;
    this.spanX = world.bounds.max.x - world.bounds.min.x + pad * 2;
    this.spanZ = world.bounds.max.z - world.bounds.min.z + pad * 2;

    const cols = Math.max(8, Math.round(this.spanX / CELL));
    const rows = Math.max(8, Math.round(this.spanZ / CELL));
    const open = new Uint8Array(cols * rows);
    const height = new Float32Array(cols * rows);
    let minH = Infinity;
    let maxH = -Infinity;

    for (let r = 0; r < rows; r++) {
      const z = this.minZ + (r + 0.5) * CELL;
      for (let c = 0; c < cols; c++) {
        const x = this.minX + (c + 0.5) * CELL;
        const i = r * cols + c;
        if (!world.isWalkable(x, z)) continue;
        open[i] = 1;
        const h = world.terrainHeight(x, z);
        height[i] = h;
        if (h < minH) minH = h;
        if (h > maxH) maxH = h;
      }
    }
    if (!Number.isFinite(minH)) {
      minH = 0;
      maxH = 1;
    }

    // The floor plan is painted at lattice resolution and then scaled up, so
    // the fill has soft edges; the outline is stroked on top at full resolution
    // so it stays a hairline. Doing both at one resolution gives either a
    // stair-stepped fill or a fuzzy outline, and the outline is what matters.
    const plan = document.createElement('canvas');
    plan.width = cols;
    plan.height = rows;
    const pg = plan.getContext('2d');
    if (!pg) return;
    const image = pg.createImageData(cols, rows);
    const data = image.data;
    const range = Math.max(0.6, maxH - minH);
    for (let i = 0; i < open.length; i++) {
      const o = i * 4;
      if (!open[i]) {
        // Structure. Light, because a floor plan is read as *buildings* — the
        // first version painted the walkable street pale and the buildings dark,
        // and 64 metres of open souk filled the disc with one bright blob.
        data[o] = 150;
        data[o + 1] = 172;
        data[o + 2] = 184;
        data[o + 3] = 168;
        continue;
      }
      // Trafficable ground, barely above the disc's own backing, with terrain
      // height lifting it so the crowned carriageway and the raised compound are
      // distinguishable levels rather than one flat tone.
      const lift = clamp01((height[i] - minH) / range);
      data[o] = Math.round(38 + lift * 34);
      data[o + 1] = Math.round(52 + lift * 40);
      data[o + 2] = Math.round(62 + lift * 42);
      data[o + 3] = 150;
    }
    pg.putImageData(image, 0, 0);

    const W = Math.round(this.spanX * BAKE_SCALE);
    const H = Math.round(this.spanZ * BAKE_SCALE);
    const out = document.createElement('canvas');
    out.width = W;
    out.height = H;
    const g = out.getContext('2d');
    if (!g) return;

    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(plan, 0, 0, W, H);

    // Survey grid. Free graduation, and it is what tells the eye that this is a
    // plan of somewhere rather than a texture.
    g.strokeStyle = 'rgba(150, 186, 200, 0.075)';
    g.lineWidth = 1;
    g.beginPath();
    for (let x = Math.ceil(this.minX / 16) * 16; x < this.minX + this.spanX; x += 16) {
      const px = (x - this.minX) * BAKE_SCALE;
      g.moveTo(px, 0);
      g.lineTo(px, H);
    }
    for (let z = Math.ceil(this.minZ / 16) * 16; z < this.minZ + this.spanZ; z += 16) {
      const pz = (z - this.minZ) * BAKE_SCALE;
      g.moveTo(0, pz);
      g.lineTo(W, pz);
    }
    g.stroke();

    const path = this.tracePlan(open, cols, rows);
    g.lineCap = 'butt';
    g.lineJoin = 'miter';
    g.strokeStyle = 'rgba(6, 10, 13, 0.62)';
    g.lineWidth = BAKE_SCALE * 0.66;
    g.stroke(path);
    g.strokeStyle = 'rgba(216, 238, 246, 0.78)';
    g.lineWidth = BAKE_SCALE * 0.26;
    g.stroke(path);

    this.schematic = out;
    console.log(
      `[hud] minimap baked ${cols}x${rows} cells in ${(performance.now() - t0).toFixed(0)} ms`,
    );
  }

  /**
   * The boundary between open and closed ground, as merged runs.
   *
   * One segment per cell edge would be a hundred thousand sub-paths for a map
   * this size. Runs of collinear boundary collapse into single lines, which
   * takes it to a few thousand and makes the whole trace two stroke calls.
   */
  private tracePlan(open: Uint8Array, cols: number, rows: number): Path2D {
    const path = new Path2D();
    const at = (c: number, r: number): number =>
      c < 0 || r < 0 || c >= cols || r >= rows ? 0 : open[r * cols + c];

    for (let c = 0; c <= cols; c++) {
      let start = -1;
      for (let r = 0; r <= rows; r++) {
        const edge = r < rows && at(c - 1, r) !== at(c, r);
        if (edge && start < 0) start = r;
        if (!edge && start >= 0) {
          const x = c * BAKE_SCALE;
          path.moveTo(x, start * BAKE_SCALE);
          path.lineTo(x, r * BAKE_SCALE);
          start = -1;
        }
      }
    }
    for (let r = 0; r <= rows; r++) {
      let start = -1;
      for (let c = 0; c <= cols; c++) {
        const edge = c < cols && at(c, r - 1) !== at(c, r);
        if (edge && start < 0) start = c;
        if (!edge && start >= 0) {
          const y = r * BAKE_SCALE;
          path.moveTo(start * BAKE_SCALE, y);
          path.lineTo(c * BAKE_SCALE, y);
          start = -1;
        }
      }
    }
    return path;
  }

  /* -------------------------------- frame -------------------------------- */

  update(
    dt: number,
    opts: { position: THREE.Vector3; yaw: number; revealAll: boolean; visible: boolean },
  ): void {
    const s = this.surface;
    if (s.width === 0 || !opts.visible) return;
    this.clock += dt;
    this.sweep = (this.sweep + dt / this.sweepPeriod) % 1;
    this.lastX = opts.position.x;
    this.lastZ = opts.position.z;

    this.pollContacts(opts.position, opts.revealAll);

    const g = s.g;
    s.clear();
    const half = s.width * 0.5;
    // The disc is inset far enough for the graduation and the ring labels to live
    // outside it without being clipped by the canvas box.
    const radius = s.width * 0.385;
    const scale = (radius * 2) / VIEW_METRES;
    const C = Math.cos(-opts.yaw);
    const S = Math.sin(-opts.yaw);
    const px = opts.position.x;
    const pz = opts.position.z;
    const project = (wx: number, wz: number, out: [number, number]): [number, number] => {
      const dx = (wx - px) * scale;
      const dz = (wz - pz) * scale;
      out[0] = half + dx * C - dz * S;
      out[1] = half + dx * S + dz * C;
      return out;
    };

    g.save();
    g.beginPath();
    g.arc(half, half, radius, 0, Math.PI * 2);
    g.clip();

    g.fillStyle = 'rgba(8, 12, 16, 0.82)';
    g.fillRect(0, 0, s.width, s.height);

    if (this.schematic) {
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      const r = s.canvas.width / s.width;
      const a = scale * C * r;
      const b = scale * S * r;
      g.setTransform(
        a,
        b,
        -b,
        a,
        (half - scale * (C * px - S * pz)) * r,
        (half - scale * (S * px + C * pz)) * r,
      );
      g.drawImage(
        this.schematic,
        this.minX,
        this.minZ,
        this.spanX,
        this.spanZ,
      );
      g.restore();
    }

    if (this.uav) this.drawSweep(g, half, radius);

    const p: [number, number] = [0, 0];
    const u = Math.max(1, s.width / 200);

    // Landmarks first: they are the base layer of symbology and everything
    // tactical has to sit on top of them. Hollow, so they cannot be mistaken for
    // a contact at a glance — the light building fills swallowed the solid
    // version entirely.
    g.strokeStyle = 'rgba(216, 226, 74, 0.85)';
    g.lineWidth = Math.max(1, 0.9 * u);
    for (const l of this.landmarks) {
      project(l.x, l.z, p);
      if (Math.hypot(p[0] - half, p[1] - half) > radius - 2) continue;
      g.beginPath();
      g.moveTo(p[0], p[1] - 2.6 * u);
      g.lineTo(p[0] + 2.6 * u, p[1]);
      g.lineTo(p[0], p[1] + 2.6 * u);
      g.lineTo(p[0] - 2.6 * u, p[1]);
      g.closePath();
      g.stroke();
    }

    for (const m of this.markers) {
      if (m.until < this.clock) continue;
      project(m.x, m.z, p);
      this.drawMarker(g, m, p, half, radius, u);
    }

    // A contact is always red. Fresh detection is a separate expanding ring
    // rather than a different fill: the first version swapped the fill to white
    // for the first third of a second, which meant every contact in a screenshot
    // was white and a firefight looked like a friendly squad.
    for (const c of this.contacts) {
      const age = this.clock - c.seen;
      if (age > CONTACT_MEMORY) continue;
      project(c.x, c.z, p);
      const d = Math.hypot(p[0] - half, p[1] - half);
      if (d > radius - 2 * u) continue;
      const fade = 1 - clamp01((age - 1.2) / (CONTACT_MEMORY - 1.2));
      g.globalAlpha = 0.4 + fade * 0.6;
      g.fillStyle = 'rgba(6, 9, 11, 0.8)';
      diamond(g, p[0], p[1], 4 * u);
      g.fillStyle = 'rgba(255, 64, 48, 0.99)';
      diamond(g, p[0], p[1], 2.8 * u);
      if (age < 0.42) {
        const ping = age / 0.42;
        g.globalAlpha = (1 - ping) * 0.85;
        g.strokeStyle = 'rgba(255, 226, 214, 0.95)';
        g.lineWidth = Math.max(1, 1.1 * u);
        g.beginPath();
        g.arc(p[0], p[1], (3.4 + ping * 5) * u, 0, Math.PI * 2);
        g.stroke();
      }
      g.globalAlpha = 1;
    }

    this.drawPlayer(g, half, u);
    g.restore();

    this.drawRing(g, half, radius, u, opts.yaw);
  }

  private pollContacts(position: THREE.Vector3, revealAll: boolean): void {
    const ai = this.ai;
    if (!ai) return;
    if (this.clock - this.queryAt < 0.125) return;
    this.queryAt = this.clock;

    const found = ai.query(position, VIEW_METRES * 0.9);
    for (const e of found) {
      if (!e.alive) continue;
      // Detected means the hostile has given himself away — he is engaging, or
      // reconnaissance is up. Anything looser turns the radar into a wallhack
      // and the whole tactical layer stops meaning anything.
      if (!revealAll && !e.aware) continue;
      let slot: Contact | null = null;
      let oldest = this.contacts[0];
      for (const c of this.contacts) {
        if (c.id === e.id) {
          slot = c;
          break;
        }
        if (c.seen < oldest.seen) oldest = c;
      }
      const contact = slot ?? oldest;
      contact.id = e.id;
      contact.x = e.position.x;
      contact.z = e.position.z;
      contact.alive = true;
      contact.seen = this.clock;
    }
  }

  private drawSweep(g: CanvasRenderingContext2D, half: number, radius: number): void {
    const angle = this.sweep * Math.PI * 2;
    // Narrow enough to read as a sweep rather than as a second view cone, and
    // faint enough that the contacts it is painting stay the brightest thing on
    // the disc.
    const span = 0.78;
    g.save();
    g.translate(half, half);
    g.rotate(angle);
    const grad = g.createLinearGradient(0, 0, radius, 0);
    grad.addColorStop(0, 'rgba(150, 232, 178, 0.015)');
    grad.addColorStop(1, 'rgba(150, 232, 178, 0.115)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, radius, -span, 0);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(170, 255, 200, 0.4)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(radius, 0);
    g.stroke();
    g.restore();
  }

  private drawMarker(
    g: CanvasRenderingContext2D,
    m: Marker,
    p: [number, number],
    half: number,
    radius: number,
    u: number,
  ): void {
    let x = p[0];
    let y = p[1];
    const dx = x - half;
    const dy = y - half;
    const d = Math.hypot(dx, dy);
    const edge = d > radius - 6 * u;
    if (edge) {
      const k = (radius - 6 * u) / (d || 1);
      x = half + dx * k;
      y = half + dy * k;
    }

    const pulse = 0.6 + 0.4 * Math.sin(this.clock * 6);
    if (m.kind === 'strike') {
      g.strokeStyle = `rgba(255, 68, 52, ${(0.55 + pulse * 0.45).toFixed(2)})`;
      g.lineWidth = 1.6 * u;
      g.beginPath();
      g.arc(x, y, (4 + pulse * 2.4) * u, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.moveTo(x - 6 * u, y);
      g.lineTo(x + 6 * u, y);
      g.moveTo(x, y - 6 * u);
      g.lineTo(x, y + 6 * u);
      g.stroke();
    } else if (m.kind === 'package') {
      g.fillStyle = 'rgba(120, 226, 150, 0.95)';
      g.fillRect(x - 2.6 * u, y - 2.6 * u, 5.2 * u, 5.2 * u);
      g.strokeStyle = 'rgba(8, 14, 10, 0.7)';
      g.lineWidth = 1;
      g.strokeRect(x - 2.6 * u, y - 2.6 * u, 5.2 * u, 5.2 * u);
    } else if (m.kind === 'aircraft') {
      g.fillStyle = 'rgba(160, 226, 255, 0.9)';
      g.beginPath();
      g.moveTo(x, y - 4 * u);
      g.lineTo(x + 3.2 * u, y + 3.4 * u);
      g.lineTo(x, y + 1.6 * u);
      g.lineTo(x - 3.2 * u, y + 3.4 * u);
      g.closePath();
      g.fill();
    } else {
      g.strokeStyle = 'rgba(216, 226, 74, 0.95)';
      g.lineWidth = 1.7 * u;
      g.beginPath();
      g.moveTo(x, y - 4.6 * u);
      g.lineTo(x + 4.6 * u, y);
      g.lineTo(x, y + 4.6 * u);
      g.lineTo(x - 4.6 * u, y);
      g.closePath();
      g.stroke();
    }
  }

  private drawPlayer(g: CanvasRenderingContext2D, half: number, u: number): void {
    // A view cone, then the arrow. The cone is what makes the rotation legible
    // at a glance; an arrow alone on a rotating map is ambiguous.
    g.save();
    g.translate(half, half);
    const reach = 15 * u;
    const cone = g.createLinearGradient(0, 0, 0, -reach);
    cone.addColorStop(0, 'rgba(232, 244, 214, 0.4)');
    cone.addColorStop(0.55, 'rgba(228, 240, 208, 0.17)');
    cone.addColorStop(1, 'rgba(226, 240, 210, 0)');
    g.fillStyle = cone;
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, reach, -Math.PI / 2 - 0.52, -Math.PI / 2 + 0.52);
    g.closePath();
    g.fill();

    g.beginPath();
    g.moveTo(0, -5.4 * u);
    g.lineTo(3.9 * u, 4.4 * u);
    g.lineTo(0, 2.1 * u);
    g.lineTo(-3.9 * u, 4.4 * u);
    g.closePath();
    g.fillStyle = 'rgba(6, 9, 11, 0.85)';
    g.lineWidth = 2.6 * u;
    g.strokeStyle = 'rgba(6, 9, 11, 0.85)';
    g.stroke();
    g.fillStyle = 'rgba(240, 248, 236, 0.99)';
    g.fill();
    g.restore();
  }

  /**
   * The bezel: a ring, graduation, the cardinals and whichever landmarks are
   * near enough to name. Labels are drawn upright at their rotated bearing —
   * text laid round a rotating ring is unreadable, and this is the whole reason
   * the ring is canvas rather than a DOM ring of counter-rotated spans.
   */
  private drawRing(
    g: CanvasRenderingContext2D,
    half: number,
    radius: number,
    u: number,
    yaw: number,
  ): void {
    g.save();
    // Bezel and graduation are both drawn twice, dark then light. This is the
    // one part of the map that sits over the level rather than over the disc's
    // own backing, and a single light hairline over pale stucco is invisible.
    g.beginPath();
    g.arc(half, half, radius + 1.5, 0, Math.PI * 2);
    g.strokeStyle = 'rgba(4, 8, 11, 0.6)';
    g.lineWidth = 3.4;
    g.stroke();
    g.strokeStyle = 'rgba(222, 238, 246, 0.62)';
    g.lineWidth = 1.4;
    g.stroke();

    g.beginPath();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2 - yaw - Math.PI / 2;
      const long = i % 6 === 0 ? 4.6 * u : i % 2 === 0 ? 2.8 * u : 1.7 * u;
      const r0 = radius + 2.5;
      g.moveTo(half + Math.cos(a) * r0, half + Math.sin(a) * r0);
      g.lineTo(half + Math.cos(a) * (r0 + long), half + Math.sin(a) * (r0 + long));
    }
    g.strokeStyle = 'rgba(4, 8, 11, 0.7)';
    g.lineWidth = 3;
    g.stroke();
    g.strokeStyle = 'rgba(226, 240, 248, 0.72)';
    g.lineWidth = 1.2;
    g.stroke();

    // Sized off the disc rather than off the DPR unit: the ring is the smallest
    // type in the game and it has to hold up at 720p, where a size derived from
    // `u` alone comes out at seven pixels.
    const cardinalSize = Math.max(10, this.size * 0.058);
    const nameSize = Math.max(8.5, this.size * 0.046);
    const labelR = radius + cardinalSize * 0.86;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    // Every label is drawn over the level, not over the disc, so each one carries
    // its own shadow. Without it the ring is unreadable against pale stucco.
    g.shadowColor = 'rgba(0, 0, 0, 0.95)';
    g.shadowBlur = 3;

    // At most two landmark names, both kept clear of the cardinals and of each
    // other. The nearest wins; a ring carrying every landmark on the map is a
    // ring with nothing readable on it.
    const shown: number[] = [];
    const ranked = this.landmarkBearings(yaw);
    g.font = `700 ${nameSize.toFixed(1)}px ${FACE}`;
    g.fillStyle = 'rgba(206, 226, 234, 0.82)';
    for (const item of ranked) {
      if (shown.length >= 2) break;
      let clash = false;
      for (let k = 0; k < 4 && !clash; k++) {
        if (Math.abs(angleTo(item.angle, (k * Math.PI) / 2 - Math.PI / 2)) < 0.62) clash = true;
      }
      for (const a of shown) {
        if (Math.abs(angleTo(item.angle, a)) < 0.7) clash = true;
      }
      if (clash) continue;
      shown.push(item.angle);
      g.fillText(
        item.name,
        half + Math.cos(item.angle) * labelR,
        half + Math.sin(item.angle) * labelR,
      );
    }

    g.font = `700 ${cardinalSize.toFixed(1)}px ${FACE}`;
    const cardinals = ['N', 'E', 'S', 'W'];
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 - yaw - Math.PI / 2;
      const x = half + Math.cos(a) * labelR;
      const y = half + Math.sin(a) * labelR;
      g.fillStyle = i === 0 ? 'rgba(255, 116, 96, 0.99)' : 'rgba(236, 246, 250, 0.94)';
      g.fillText(cardinals[i], x, y);
    }
    g.restore();
  }

  private readonly bearingScratch: Array<{ name: string; angle: number; range: number }> = [];

  private landmarkBearings(yaw: number): Array<{ name: string; angle: number; range: number }> {
    const list = this.bearingScratch;
    list.length = 0;
    for (const l of this.landmarks) {
      const dx = l.x - this.lastX;
      const dz = l.z - this.lastZ;
      list.push({ name: l.name, angle: Math.atan2(dz, dx) - yaw, range: Math.hypot(dx, dz) });
    }
    list.sort((a, b) => a.range - b.range);
    return list;
  }

  private lastX = 0;
  private lastZ = 0;
}

function diamond(g: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  g.beginPath();
  g.moveTo(x, y - r);
  g.lineTo(x + r, y);
  g.lineTo(x, y + r);
  g.lineTo(x - r, y);
  g.closePath();
  g.fill();
}

function angleTo(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Landmark names are prose; a compass ring has room for a word. */
function shorten(name: string): string {
  const first = name.trim().split(/[\s-]+/)[0].toUpperCase();
  return first.length > 9 ? first.slice(0, 8) : first;
}
