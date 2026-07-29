import * as THREE from 'three';

/**
 * Average diffuse reflectance of a material, for the bounce bake.
 *
 * The CPU bake needs one number per surface — how much light comes back off it
 * and in what colour — and nothing in the scene graph has it. The town's
 * materials are procedural: the colour lives in a texture generated on the GPU
 * at load, and the `color` on the material is a white multiplier. So a bake
 * that reads `material.color` concludes that every wall, floor and roof in the
 * level is white, and hands interiors a bounce with no hue of its own. That is
 * how a room full of warm ochre plaster comes out reading blue: the only thing
 * left tinting it is the sky.
 *
 * Averaging the map costs one 16x16 draw per material, once, and gets both the
 * hue and the magnitude right. Per-vertex tint is folded in from the geometry,
 * since the batcher puts a good deal of the town's colour variation there.
 */

const RESOLUTION = 16;

const _scene = new THREE.Scene();
const _camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
let _target: THREE.WebGLRenderTarget | null = null;
let _quad: THREE.Mesh | null = null;
let _pixels: Uint8Array | null = null;

const _cache = new WeakMap<THREE.Material, THREE.Color>();
const _vertexCache = new WeakMap<THREE.BufferGeometry, THREE.Color>();
const _result = new THREE.Color();

const WHITE = new THREE.Color(1, 1, 1);

function ensure(): { target: THREE.WebGLRenderTarget; quad: THREE.Mesh } {
  if (!_target) {
    _target = new THREE.WebGLRenderTarget(RESOLUTION, RESOLUTION, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: false,
      stencilBuffer: false,
    });
    _pixels = new Uint8Array(RESOLUTION * RESOLUTION * 4);
  }
  if (!_quad) {
    _quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      /* three linearises an sRGB-tagged map on sample and the render target
         carries no transfer function of its own, so what lands in the buffer is
         already the linear reflectance the standard shader multiplies in.
         The 4x4 box widens coverage to 4096 taps, which matters because these
         maps are render targets and carry no mips to filter with. */
      new THREE.ShaderMaterial({
        uniforms: { tMap: { value: null }, uTexel: { value: 1 / RESOLUTION } },
        vertexShader: `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`,
        fragmentShader: `
uniform sampler2D tMap;
uniform float uTexel;
varying vec2 vUv;
void main() {
  vec3 sum = vec3(0.0);
  for (int y = 0; y < 4; y++) {
    for (int x = 0; x < 4; x++) {
      vec2 offset = (vec2(float(x), float(y)) + 0.5) * 0.25 - 0.5;
      sum += texture2D(tMap, vUv + offset * uTexel).rgb;
    }
  }
  gl_FragColor = vec4(sum / 16.0, 1.0);
}`,
        depthTest: false,
        depthWrite: false,
      }),
    );
    _scene.add(_quad);
  }
  return { target: _target, quad: _quad };
}

/** Mean linear reflectance of a texture. Returns null if it cannot be read. */
function averageTexture(
  renderer: THREE.WebGLRenderer,
  texture: THREE.Texture,
  out: THREE.Color,
): THREE.Color | null {
  const { target, quad } = ensure();
  const pixels = _pixels;
  if (!pixels) return null;

  const material = quad.material as THREE.ShaderMaterial;
  material.uniforms.tMap.value = texture;

  const previous = renderer.getRenderTarget();
  try {
    renderer.setRenderTarget(target);
    renderer.render(_scene, _camera);
    renderer.readRenderTargetPixels(target, 0, 0, RESOLUTION, RESOLUTION, pixels);
  } catch {
    return null;
  } finally {
    renderer.setRenderTarget(previous);
    material.uniforms.tMap.value = null;
  }

  let r = 0;
  let g = 0;
  let b = 0;
  const n = RESOLUTION * RESOLUTION;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    r += pixels[o];
    g += pixels[o + 1];
    b += pixels[o + 2];
  }
  const scale = 1 / (255 * n);
  return out.setRGB(r * scale, g * scale, b * scale);
}

/** Mean of a geometry's vertex tint, or white when it carries none. */
function averageVertexColor(geometry: THREE.BufferGeometry): THREE.Color {
  const cached = _vertexCache.get(geometry);
  if (cached) return cached;

  const attribute = geometry.getAttribute('color');
  const out = new THREE.Color(1, 1, 1);
  if (attribute) {
    /* A merged bucket runs to hundreds of thousands of vertices and they are
       all variations of one tint, so a stride is as good as a full pass. */
    const count = attribute.count;
    const stride = Math.max(1, Math.floor(count / 4096));
    let r = 0;
    let g = 0;
    let b = 0;
    let taken = 0;
    for (let i = 0; i < count; i += stride) {
      r += attribute.getX(i);
      g += attribute.getY(i);
      b += attribute.getZ(i);
      taken++;
    }
    if (taken > 0) out.setRGB(r / taken, g / taken, b / taken);
  }
  _vertexCache.set(geometry, out);
  return out;
}

/**
 * Diffuse albedo to use for light bouncing off this object.
 *
 * Cached per material and per geometry, so the readback happens once for each
 * of the level's few dozen surfaces and never again.
 */
export function surfaceAlbedo(
  renderer: THREE.WebGLRenderer | null,
  object: THREE.Object3D,
  out: THREE.Color,
): THREE.Color {
  const raw = (object as THREE.Mesh).material;
  const material = (Array.isArray(raw) ? raw[0] : raw) as THREE.MeshStandardMaterial | undefined;
  if (!material) return out.copy(WHITE);

  let base = _cache.get(material);
  if (!base) {
    base = new THREE.Color();
    base.copy(material.color ?? WHITE);
    if (renderer && material.map) {
      const mean = averageTexture(renderer, material.map, _result);
      if (mean) base.multiply(mean);
    }
    _cache.set(material, base);
  }

  out.copy(base);
  const geometry = (object as THREE.Mesh).geometry;
  if (geometry) out.multiply(averageVertexColor(geometry));

  /* Bounce here is a single pass, so an over-bright albedo compounds visibly,
     and a vertex tint above one can push a pale surface past what any real
     material returns. Nothing in a dusty town reflects more than this. */
  out.r = Math.min(out.r, 0.8);
  out.g = Math.min(out.g, 0.8);
  out.b = Math.min(out.b, 0.8);
  return out;
}

export function disposeSurfaceAlbedo(): void {
  _target?.dispose();
  _target = null;
  _pixels = null;
  if (_quad) {
    _quad.geometry.dispose();
    (_quad.material as THREE.Material).dispose();
    _scene.remove(_quad);
    _quad = null;
  }
}
