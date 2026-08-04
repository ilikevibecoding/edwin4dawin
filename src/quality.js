/**
 * Three quality tiers. The scene starts on "high" and steps down on its own if
 * frames are slow (software WebGL, integrated GPUs, phones); `?quality=low` in
 * the URL pins a tier instead.
 */
const TIERS = {
  high: {
    shadows: true,
    pixelRatio: () => Math.min(window.devicePixelRatio, 2),
    clouds: true,
    detail: true,
    ocean: [200, 130],
    lanterns: 3,
    sailHz: 0,
  },
  medium: {
    shadows: false,
    pixelRatio: () => 1,
    clouds: true,
    detail: true,
    ocean: [160, 104],
    lanterns: 1,
    sailHz: 0,
  },
  low: {
    shadows: false,
    pixelRatio: () => 0.7,
    clouds: false,
    detail: false,
    ocean: [96, 64],
    lanterns: 0,
    sailHz: 18,
  },
};
const ORDER = ['high', 'medium', 'low'];

/**
 * Ask the GPU what it is before building anything: SwiftShader / llvmpipe mean
 * we should skip MSAA entirely and start on the cheapest tier.
 */
export function detectRenderer() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return { name: 'none', software: true };
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    const software = /swiftshader|llvmpipe|software|basic render|mesa offscreen/i.test(String(name));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { name: String(name), software };
  } catch {
    return { name: 'unknown', software: false };
  }
}

export function createQuality({ renderer, scene, sky, ocean, initial = 'high', onChange }) {
  const requested = new URLSearchParams(window.location.search).get('quality');
  const start = ORDER.includes(requested) ? requested : initial;
  let index = Math.max(0, ORDER.indexOf(start));
  const locked = ORDER.includes(requested);

  function toggleDefine(material, name, enabled) {
    const has = material.defines && name in material.defines;
    if (enabled === has) return;
    material.defines = material.defines || {};
    if (enabled) material.defines[name] = '';
    else delete material.defines[name];
    material.needsUpdate = true;
  }

  function apply() {
    const tier = TIERS[ORDER[index]];
    renderer.shadowMap.enabled = tier.shadows;
    renderer.setPixelRatio(tier.pixelRatio());
    renderer.setSize(window.innerWidth, window.innerHeight);
    toggleDefine(sky.material, 'CLOUDS', tier.clouds);
    toggleDefine(ocean.material, 'WATER_DETAIL', tier.detail);
    ocean.userData.setDetail(...tier.ocean);
    scene.traverse((object) => {
      if (object.isMesh && object.material && !object.material.isShaderMaterial) {
        object.material.needsUpdate = true;
      }
    });
    if (onChange) onChange(ORDER[index], tier);
  }

  apply();

  // Watch the frame rate over short windows and drop a tier if we cannot keep up.
  let windowTime = 0;
  let windowFrames = 0;
  let grace = 1.0;

  return {
    get level() {
      return ORDER[index];
    },
    set(level) {
      index = Math.max(0, ORDER.indexOf(level));
      apply();
    },
    resize() {
      renderer.setPixelRatio(TIERS[ORDER[index]].pixelRatio());
      renderer.setSize(window.innerWidth, window.innerHeight);
    },
    sample(dt) {
      if (locked || index >= ORDER.length - 1) return;
      if (grace > 0) {
        grace -= dt;
        return;
      }
      windowTime += dt;
      windowFrames++;
      if (windowTime < 1.2) return;
      const fps = windowFrames / windowTime;
      windowTime = 0;
      windowFrames = 0;
      if (fps < 26) {
        index++;
        grace = 1.0;
        apply();
      }
    },
  };
}
