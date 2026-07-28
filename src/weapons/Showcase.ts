import * as THREE from 'three';
import { Layers, type GameContext } from '../core/GameContext';
import { registerVantages } from '../core/Vantage';
import type { AssemblyMaterials } from './parts/Assembly';
import type { OpticKind, OpticRig } from './Optics';
import { WEAPONS } from './models/Catalog';
import type { ModelVariant, WeaponModel } from './WeaponModel';

/**
 * The inspection rig behind `?showcase=weapons`.
 *
 * It builds a *second* copy of every weapon and stands them in a column in
 * front of the eye, at a fixed distance and a common scale so their real
 * proportions read against each other. They live in the viewmodel scene under
 * the camera-tracking root, which means they get the viewmodel light rig, the
 * viewmodel depth clear and the viewmodel MSAA — exactly the pixels the player
 * sees in the game, rather than a separate preview path that could flatter the
 * models. The held weapon is hidden while the lineup is up.
 *
 * A second copy rather than borrowing the live models because the held weapon
 * has to stay drivable for the ADS and reload shots in the same session.
 */

export interface ShowcaseHost {
  /** The camera-tracking viewmodel root; the lineup hangs off it. */
  parent: THREE.Object3D;
  materials: AssemblyMaterials;
  makeOptic(kind: OpticKind, baseY: number): OpticRig | null;
  /** Called when the lineup takes over or hands back the screen. */
  onActiveChange(active: boolean): void;
  /** Poses the *held* weapon, for the non-lineup vantages. */
  posePreset(id: string, ads: number, still: boolean): void;
  poseReload(id: string, t: number): void;
}

interface Entry {
  id: string;
  name: string;
  model: WeaponModel;
  pivot: THREE.Group;
  /** Extents the row occupies on screen, in NDC, as last measured. */
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  label: HTMLDivElement | null;
}

/**
 * Distance from the eye to the lineup plane, metres. It is the viewmodel
 * pass's own hip focus distance, so the showcase is rendered dead sharp
 * through the same depth of field the game uses rather than being inspected
 * through a blur the player would never see on a held weapon.
 */
const DISTANCE = 0.62;
/**
 * Field of view the lineup is laid out for, and the one it renders at.
 *
 * The showcase takes the viewmodel camera over while it is up. It has to: the
 * layout solves a scale in metres against the frame it expects, and the held
 * weapon's own hip field of view is a different number for every weapon, so
 * borrowing it would put the column off the top of the frame the moment
 * somebody retuned a pose.
 */
const FOV = 52;
/** Fraction of the frame the column is allowed to fill. */
const FILL_W = 0.94;
const FILL_H = 0.97;
/** Base three-quarter view: muzzle to the right, ejection side to the camera. */
const BASE_YAW = -Math.PI / 2 - 0.26;
const BASE_PITCH = 0.17;

/** Gap between rows, as a fraction of the total stack height. */
const GAP = 0.06;

const _box = new THREE.Box3();
const _center = new THREE.Vector3();
const _eye = new THREE.Vector3();
const _ndc = new THREE.Box2();
const _v = new THREE.Vector3();
/** Camera the layout solves against: the lineup's own, at the group's origin. */
const _probe = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.01, 10);

export class WeaponShowcase {
  /** True while the lineup owns the screen. */
  active = false;
  /** Field of view the host must give the viewmodel camera while active. */
  readonly fov = FOV;

  private readonly group = new THREE.Group();
  private readonly entries: Entry[] = [];
  private readonly panel: HTMLDivElement | null = null;
  private spin = 0;
  private spinning: boolean;
  private focus = -1;
  private time = 0;

  constructor(
    private readonly ctx: GameContext,
    private readonly host: ShowcaseHost,
  ) {
    this.group.name = 'WeaponShowcase';
    this.group.visible = false;
    host.parent.add(this.group);
    this.group.add(this.backdrop());
    // A capture must be reproducible, so the turntable only turns for a human.
    this.spinning = !new URLSearchParams(location.search).has('capture');

    // One optic per weapon, chosen so the lineup shows off the whole optic set
    // rather than five red dots, and one suppressor so the attachment reads.
    const optics: Record<string, OpticKind> = {
      rifle: 'reflex',
      smg: 'holo',
      sniper: 'sniper',
      shotgun: 'irons',
      pistol: 'irons',
    };
    const suppressed: Record<string, boolean> = { smg: true };

    this.panel = this.makePanel();
    for (const def of WEAPONS) {
      const id = def.stats.id;
      const variant: ModelVariant = {
        optic: optics[id] ?? def.optics[0],
        suppressor: suppressed[id] ?? false,
      };
      const model = def.build(
        {
          quality: ctx.quality,
          materials: host.materials,
          makeOptic: (kind, baseY) => host.makeOptic(kind, baseY),
        },
        variant,
      );
      const pivot = new THREE.Group();
      pivot.name = `showcase.${id}`;
      pivot.add(model.root);
      this.group.add(pivot);
      this.entries.push({
        id,
        name: def.stats.name,
        model,
        pivot,
        width: 0,
        height: 0,
        centerX: 0,
        centerY: 0,
        label: this.makeLabel(def.stats.name, model.triangles, variant),
      });
    }

    this.layout();
    this.registerShots();
  }

  /**
   * A neutral card behind the lineup. Judging a silhouette against a sunlit
   * street is judging the street; a flat mid-grey with a soft vignette is what
   * makes a missing chamfer obvious. Unlit on purpose, and dim enough that the
   * auto exposure does not chase it.
   */
  private backdrop(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
    const material = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: /* glsl */ `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision mediump float;
        in vec2 vUv;
        out vec4 fragColor;
        void main() {
          vec2 d = vUv - 0.5;
          float v = 1.0 - smoothstep(0.18, 0.72, length(d * vec2(1.0, 1.35)));
          // Landing around a third of the way up the display range: dark enough
          // that a parkerised receiver reads light against it, bright enough
          // that the auto exposure is not chasing a black frame. Slightly cool,
          // because the grade is warm and a neutral card comes out beige.
          vec3 c = mix(vec3(0.016, 0.021, 0.032), vec3(0.092, 0.108, 0.142), v);
          fragColor = vec4(c, 1.0);
        }
      `,
      glslVersion: THREE.GLSL3,
      depthWrite: true,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'ShowcaseBackdrop';
    // Just behind the weapons, sized to cover a very wide frame at that depth.
    const z = -(DISTANCE + 0.35);
    mesh.position.set(0, 0, z);
    mesh.scale.set(Math.abs(z) * 4.2, Math.abs(z) * 2.4, 1);
    mesh.layers.set(Layers.VIEWMODEL);
    mesh.frustumCulled = false;
    this.card = mesh;
    return mesh;
  }

  private card: THREE.Mesh | null = null;

  /* ------------------------------ layout -------------------------------- */

  /**
   * Stands the five weapons in a column that fills the frame.
   *
   * Solved against the projection the camera actually uses, not against a plane
   * at the lineup's depth. A rifle turned three-quarters is 200 mm deep at 620
   * mm from the eye, so its near end draws a sixth larger than its far end and
   * a layout done in metres on one plane is wrong by that sixth — enough to
   * hang the top of the column off the top of the frame, which is exactly what
   * it did. Measuring in NDC costs a handful of matrix multiplies at load and
   * on resize, and in exchange the column cannot be wrong.
   *
   * Iterative because the two unknowns feed each other: the scale depends on
   * how tall the rows measure, and the rows measure differently at a different
   * scale. Four passes takes the residual under a tenth of a percent.
   */
  private layout(): void {
    const entries = this.entries;
    if (!entries.length) return;
    this.prepare();

    let scale = this.startScale();
    for (let pass = 0; pass < 4; pass++) {
      for (const e of entries) {
        e.pivot.scale.setScalar(scale);
        e.pivot.position.set(0, 0, -DISTANCE);
      }
      this.measureAll();
      let widest = 0;
      let stack = 0;
      for (const e of entries) {
        widest = Math.max(widest, e.width);
        stack += e.height;
      }
      const fit = Math.min(
        (2 * FILL_W) / Math.max(1e-4, widest),
        (2 * FILL_H) / Math.max(1e-4, stack * (1 + GAP)),
      );
      scale *= fit;
      if (Math.abs(fit - 1) < 0.002) break;
    }

    // Final sizes at the settled scale, then one row target per weapon.
    for (const e of entries) {
      e.pivot.scale.setScalar(scale);
      e.pivot.position.set(0, 0, -DISTANCE);
    }
    this.measureAll();
    let stack = 0;
    for (const e of entries) stack += e.height;
    const pitch = (stack * GAP) / Math.max(1, entries.length - 1);
    let cursor = (stack * (1 + GAP)) / 2;
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      this.rowY[i] = cursor - e.height / 2;
      cursor -= e.height + pitch;
    }
    this.settle(scale);
    for (let i = 0; i < entries.length; i++) this.placeLabel(entries[i], this.rowY[i]);
  }

  /** Row centres for the current layout, in NDC. */
  private readonly rowY: number[] = [];

  /** Puts every model on its own middle and into the viewing rotation. */
  private prepare(): void {
    _probe.fov = FOV;
    _probe.aspect = Math.max(1, this.ctx.camera.aspect || 16 / 9);
    _probe.updateProjectionMatrix();
    for (const e of this.entries) {
      modelBounds(e.model, _box);
      _box.getCenter(_center);
      // Recentred so the turntable spins about the gun rather than about a
      // corner of it, and so the solver starts near its answer.
      e.model.root.position.set(-_center.x, -_center.y, -_center.z);
      e.pivot.rotation.set(BASE_PITCH, BASE_YAW, 0, 'XYZ');
    }
  }

  /** A scale in the right order of magnitude, to give the solver a head start. */
  private startScale(): number {
    const halfH = DISTANCE * Math.tan((FOV * Math.PI) / 360);
    let stack = 0;
    for (const e of this.entries) {
      modelBounds(e.model, _box);
      stack += _box.max.y - _box.min.y;
    }
    return (halfH * 2 * FILL_H) / Math.max(1e-4, stack);
  }

  /**
   * Nudges each row onto its target until it lands there. The conversion from
   * NDC back to metres assumes the row sits at the lineup plane, which it only
   * roughly does, so the correction is applied and then checked.
   */
  private settle(scale: number): void {
    const halfH = DISTANCE * Math.tan((FOV * Math.PI) / 360);
    const halfW = halfH * _probe.aspect;
    for (let pass = 0; pass < 3; pass++) {
      this.measureAll();
      let worst = 0;
      for (let i = 0; i < this.entries.length; i++) {
        const e = this.entries[i];
        const dy = this.rowY[i] - e.centerY;
        const dx = -e.centerX;
        worst = Math.max(worst, Math.abs(dy), Math.abs(dx));
        e.pivot.scale.setScalar(scale);
        e.pivot.position.x += dx * halfW;
        e.pivot.position.y += dy * halfH;
      }
      if (worst < 0.001) break;
    }
  }

  /** Projected extents of every row, in NDC, from the geometry as placed. */
  private measureAll(): void {
    this.group.updateWorldMatrix(true, true);
    _inv.copy(this.group.matrixWorld).invert();
    for (const e of this.entries) {
      ndcBounds(e.pivot, _ndc);
      e.width = _ndc.max.x - _ndc.min.x;
      e.height = _ndc.max.y - _ndc.min.y;
      e.centerX = (_ndc.min.x + _ndc.max.x) * 0.5;
      e.centerY = (_ndc.min.y + _ndc.max.y) * 0.5;
    }
  }

  /** Screen position of a row, as a fraction of frame height. */
  private placeLabel(e: Entry, ndcY: number): void {
    if (!e.label) return;
    e.label.style.top = `${(0.5 - ndcY * 0.5) * 100}%`;
  }

  /* ------------------------------- frame -------------------------------- */

  update(dt: number): void {
    if (!this.active) return;
    this.time += dt;
    if (this.spinning) {
      this.spin += dt * 0.35;
      for (const e of this.entries) e.pivot.rotation.y = BASE_YAW + this.spin;
    }
  }

  lateUpdate(envLevel: number): void {
    if (!this.active) return;
    // The reticles are parallax-corrected against the eye, and the eye only
    // gets its final position after the player has composed the camera.
    _eye.copy(this.ctx.viewmodelCamera.position);
    for (const e of this.entries) {
      if (!e.pivot.visible || !e.model.optic) continue;
      e.model.optic.setEnvLevel(envLevel);
      e.model.optic.update(_eye, 0, this.time);
    }
  }

  /* ------------------------------ control ------------------------------- */

  setActive(active: boolean): void {
    if (this.active === active) return;
    this.active = active;
    this.group.visible = active;
    if (this.panel) this.panel.style.display = active ? 'block' : 'none';
    this.host.onActiveChange(active);
  }

  /** -1 shows the whole column; otherwise one weapon fills the frame. */
  setFocus(index: number): void {
    this.focus = index;
    this.spin = 0;
    for (let i = 0; i < this.entries.length; i++) {
      const e = this.entries[i];
      const on = index < 0 || index === i;
      e.pivot.visible = on;
      // Fully off, not dimmed: a solo shot exists to be looked at closely, and
      // four ghost captions lying across the weapon is exactly the wrong place
      // for them.
      if (e.label) e.label.style.opacity = on ? '1' : '0';
    }
    if (index < 0) {
      this.layout();
      return;
    }
    this.prepare();
    const e = this.entries[index];
    let scale = this.startScale();
    for (let pass = 0; pass < 4; pass++) {
      e.pivot.scale.setScalar(scale);
      e.pivot.position.set(0, 0, -DISTANCE);
      this.measureAll();
      const fit = Math.min(
        (2 * 0.9) / Math.max(1e-4, e.width),
        (2 * 0.72) / Math.max(1e-4, e.height),
      );
      scale *= fit;
      if (Math.abs(fit - 1) < 0.002) break;
    }
    for (let i = 0; i < this.entries.length; i++) this.rowY[i] = 0;
    this.settle(scale);
    if (e.label) e.label.style.top = '88%';
  }

  indexOf(id: string): number {
    return this.entries.findIndex((e) => e.id === id);
  }

  /* ------------------------------ vantages ------------------------------ */

  private registerShots(): void {
    const lineup = () => {
      this.setActive(true);
      this.setFocus(-1);
      this.spin = 0;
      for (const e of this.entries) e.pivot.rotation.y = BASE_YAW;
    };
    const solo = (id: string) => () => {
      this.setActive(true);
      this.setFocus(this.indexOf(id));
      for (const e of this.entries) e.pivot.rotation.y = BASE_YAW;
    };
    const at = (setup: () => void, note: string, name: string) => ({
      name,
      position: new THREE.Vector3(0, 1.65, 0),
      rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
      note,
      setup,
    });

    registerVantages([
      at(lineup, 'All five weapons at a common scale.', 'wpn_lineup'),
      at(solo('rifle'), 'M4A1, three-quarter.', 'wpn_show_rifle'),
      at(solo('smg'), 'MP5A5 with suppressor.', 'wpn_show_smg'),
      at(solo('sniper'), 'SR-338 with scope and bipod.', 'wpn_show_sniper'),
      at(solo('shotgun'), 'M870 with wood furniture.', 'wpn_show_shotgun'),
      at(solo('pistol'), 'M18 sidearm.', 'wpn_show_pistol'),
    ]);
  }

  /** Turns the lineup off and hands the frame back to the held weapon. */
  standDown(): void {
    this.setActive(false);
  }

  /* -------------------------------- DOM --------------------------------- */

  private makePanel(): HTMLDivElement | null {
    if (typeof document === 'undefined') return null;
    const el = document.createElement('div');
    el.id = 'weapon-showcase';
    el.style.cssText = [
      'position:fixed',
      'inset:0',
      'pointer-events:none',
      'z-index:40',
      'font:500 12px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace',
      'letter-spacing:0.06em',
      'color:#dfe6ee',
      'text-shadow:0 1px 3px rgba(0,0,0,0.9)',
      'display:none',
    ].join(';');
    document.body.appendChild(el);
    return el;
  }

  private makeLabel(name: string, triangles: number, variant: ModelVariant): HTMLDivElement | null {
    if (!this.panel) return null;
    const el = document.createElement('div');
    el.style.cssText = [
      'position:absolute',
      'left:2.4%',
      'transform:translateY(-50%)',
      'white-space:nowrap',
      'transition:opacity 120ms linear',
    ].join(';');
    const attachments = [variant.optic, variant.suppressor ? 'suppressed' : '']
      .filter(Boolean)
      .join(' + ');
    el.innerHTML =
      `<span style="color:#f0c060">${name}</span>` +
      `<span style="opacity:0.72"> &nbsp;${triangles.toLocaleString()} tris` +
      `&nbsp;·&nbsp;${attachments}</span>`;
    this.panel.appendChild(el);
    return el;
  }

  resize(): void {
    if (this.focus < 0) this.layout();
    else this.setFocus(this.focus);
  }

  dispose(): void {
    for (const e of this.entries) e.model.dispose();
    this.entries.length = 0;
    this.card?.geometry.dispose();
    (this.card?.material as THREE.Material | undefined)?.dispose();
    this.group.removeFromParent();
    this.panel?.remove();
  }
}

/** Union of every mesh's bounds in a model, in weapon space. */
function modelBounds(model: WeaponModel, out: THREE.Box3): THREE.Box3 {
  out.makeEmpty();
  model.root.updateWorldMatrix(false, true);
  const inverse = _local.copy(model.root.matrixWorld).invert();
  model.root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry || mesh.userData.noBounds) return;
    const geo = mesh.geometry;
    if (!geo.boundingBox) geo.computeBoundingBox();
    _tmpBox.copy(geo.boundingBox!);
    _tmpMat.multiplyMatrices(inverse, mesh.matrixWorld);
    _tmpBox.applyMatrix4(_tmpMat);
    out.union(_tmpBox);
  });
  return out;
}

/**
 * Screen extents of a subtree, in NDC, as the lineup camera projects it.
 *
 * Every mesh's own box is projected corner by corner rather than the subtree's
 * one box: a weapon's bounding box corners are empty air, and a rifle turned
 * three-quarters measures half again its real height if you rotate the box
 * instead of the parts. `_inv` must already hold the inverse of the lineup
 * group's world matrix, which is the transform into camera space.
 */
function ndcBounds(root: THREE.Object3D, out: THREE.Box2): void {
  out.makeEmpty();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry || mesh.userData.noBounds) return;
    const geo = mesh.geometry;
    if (!geo.boundingBox) geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    _tmpMat.multiplyMatrices(_inv, mesh.matrixWorld);
    for (let c = 0; c < 8; c++) {
      _v.set(c & 1 ? bb.max.x : bb.min.x, c & 2 ? bb.max.y : bb.min.y, c & 4 ? bb.max.z : bb.min.z);
      _v.applyMatrix4(_tmpMat);
      if (_v.z > -_probe.near) continue;
      _v.applyMatrix4(_probe.projectionMatrix);
      _p2.set(_v.x, _v.y);
      out.expandByPoint(_p2);
    }
  });
}

const _tmpBox = new THREE.Box3();
const _tmpMat = new THREE.Matrix4();
const _local = new THREE.Matrix4();
const _inv = new THREE.Matrix4();
const _p2 = new THREE.Vector2();
