/**
 * In-canvas 2-D layer: letterbox bars, subtitles, title cards, fades.
 *
 * Everything the audience sees has to live inside the WebGL canvas, because
 * the offline renderer captures the canvas only -- DOM overlays would be
 * invisible in the exported film.
 */
import * as THREE from 'three';

export const FONT_STACK = "'Arimo', 'Liberation Sans', 'Helvetica Neue', Arial, sans-serif";

/**
 * Draw wrapped, outlined text onto a canvas and return a CanvasTexture.
 * Re-uses the same canvas when called repeatedly with the same key.
 */
export function makeTextTexture(opts = {}) {
  const {
    text = '',
    width = 2048,
    height = 256,
    font = `700 84px ${FONT_STACK}`,
    color = '#ffffff',
    align = 'center',
    valign = 'middle',
    lineHeight = 1.22,
    outline = 8,
    outlineColor = 'rgba(0,0,0,0.85)',
    shadow = 18,
    shadowColor = 'rgba(0,0,0,0.6)',
    padding = 40,
    letterSpacing = null,
    background = null,
    canvas = null,
    justify = false,
  } = opts;

  const c = canvas || document.createElement('canvas');
  if (c.width !== width) c.width = width;
  if (c.height !== height) c.height = height;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.font = font;
  if (letterSpacing !== null && 'letterSpacing' in ctx) ctx.letterSpacing = `${letterSpacing}px`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  const maxW = width - padding * 2;
  const paragraphs = String(text).split('\n');
  const lines = [];
  for (const para of paragraphs) {
    if (para === '') {
      lines.push('');
      continue;
    }
    const words = para.split(/\s+/);
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }

  const fontSize = parseInt(font.match(/(\d+)px/)?.[1] || '72', 10);
  const lh = fontSize * lineHeight;
  const totalH = lines.length * lh;
  let y;
  if (valign === 'top') y = padding + fontSize;
  else if (valign === 'bottom') y = height - padding - totalH + fontSize;
  else y = (height - totalH) / 2 + fontSize * 0.92;

  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isLast = i === lines.length - 1 || lines[i + 1] === '';
    const w = ctx.measureText(line).width;
    let x;
    if (align === 'center') x = (width - w) / 2;
    else if (align === 'right') x = width - padding - w;
    else x = padding;

    if (justify && !isLast && line.includes(' ')) {
      // stretch word gaps to fill the measure (used by the opening crawl)
      const words = line.split(' ');
      const wordsW = words.reduce((s, ww) => s + ctx.measureText(ww).width, 0);
      const gap = (maxW - wordsW) / (words.length - 1);
      let cx = padding;
      for (const ww of words) {
        if (shadow) {
          ctx.shadowColor = shadowColor;
          ctx.shadowBlur = shadow;
        }
        if (outline) {
          ctx.lineWidth = outline;
          ctx.strokeStyle = outlineColor;
          ctx.strokeText(ww, cx, y);
        }
        ctx.shadowBlur = 0;
        ctx.fillStyle = color;
        ctx.fillText(ww, cx, y);
        cx += ctx.measureText(ww).width + gap;
      }
      y += lh;
      continue;
    }

    if (shadow) {
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = shadow;
    }
    if (outline) {
      ctx.lineWidth = outline;
      ctx.strokeStyle = outlineColor;
      ctx.strokeText(line, x, y);
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.fillText(line, x, y);
    y += lh;
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return { texture: tex, canvas: c, lines: lines.length };
}

function quad(w, h, mat) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
}

/**
 * The overlay scene. Ortho space is y in [-1, 1] and x in [-aspect, aspect].
 */
export class Overlay {
  constructor(aspect = 16 / 9) {
    this.aspect = aspect;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, -10, 10);

    // Letterbox bars
    const barMat = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
    this.barTop = quad(aspect * 4, 1, barMat);
    this.barBot = quad(aspect * 4, 1, barMat);
    this.barTop.position.set(0, 1.5, 1);
    this.barBot.position.set(0, -1.5, 1);
    this.scene.add(this.barTop, this.barBot);
    this.letterbox = 0;

    // Subtitle
    this._subCanvas = document.createElement('canvas');
    this._subText = null;
    this.subMat = new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, depthTest: false });
    this.subPlane = quad(aspect * 2 * 0.92, 0.92 * 2 * (256 / 2048) * (1 / 0.92) * aspect * 0, this.subMat);
    this.subPlane.visible = false;
    this.subPlane.position.set(0, -0.72, 2);
    this.scene.add(this.subPlane);

    // Title card
    this._titleCanvas = document.createElement('canvas');
    this.titleMat = new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, depthTest: false });
    this.titlePlane = quad(aspect * 2, 1.2, this.titleMat);
    this.titlePlane.visible = false;
    this.titlePlane.position.set(0, 0, 2);
    this.scene.add(this.titlePlane);

    // Fade to black
    this.fadeMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, toneMapped: false, depthTest: false });
    this.fadeQuad = quad(aspect * 4, 4, this.fadeMat);
    this.fadeQuad.position.set(0, 0, 3);
    this.scene.add(this.fadeQuad);

    // Vignette
    this.vignette = quad(aspect * 2.02, 2.02, vignetteMaterial());
    this.vignette.position.set(0, 0, 0.5);
    this.scene.add(this.vignette);
    this.vignetteStrength = 0.55;
  }

  setAspect(aspect) {
    this.aspect = aspect;
    this.camera.left = -aspect;
    this.camera.right = aspect;
    this.camera.updateProjectionMatrix();
    this.barTop.scale.x = 1;
    this.vignette.scale.x = aspect / (16 / 9);
  }

  /** `frac` is the height of each bar in ortho units (0 = no bars). */
  setLetterbox(frac) {
    this.letterbox = frac;
    this.barTop.position.y = 1 + 0.5 - frac;
    this.barBot.position.y = -1 - 0.5 + frac;
    this.barTop.visible = this.barBot.visible = frac > 0.001;
  }

  setFade(a) {
    this.fadeMat.opacity = Math.max(0, Math.min(1, a));
    this.fadeQuad.visible = this.fadeMat.opacity > 0.001;
  }

  setFadeColor(hex) {
    this.fadeMat.color.set(hex);
  }

  /** Show a subtitle line. Pass null to hide. */
  setSubtitle(text, opts = {}) {
    if (text === this._subText && !opts.force) return;
    this._subText = text;
    if (!text) {
      this.subPlane.visible = false;
      return;
    }
    const W = 1920;
    const H = 340;
    const { texture } = makeTextTexture({
      text,
      width: W,
      height: H,
      canvas: this._subCanvas,
      font: `600 ${opts.size ?? 58}px ${FONT_STACK}`,
      color: opts.color ?? '#f4f6fa',
      outline: 9,
      outlineColor: 'rgba(0,0,0,0.92)',
      shadow: 14,
      valign: 'bottom',
      padding: 60,
    });
    this.subMat.map = texture;
    this.subMat.needsUpdate = true;
    const w = this.aspect * 2 * 0.94;
    const h = (w * H) / W;
    this.subPlane.geometry.dispose();
    this.subPlane.geometry = new THREE.PlaneGeometry(w, h);
    this.subPlane.position.y = -1 + this.letterbox + h / 2 - 0.02;
    this.subPlane.visible = true;
  }

  setSubtitleOpacity(a) {
    this.subMat.opacity = a;
  }

  /** Big centred card, e.g. the title or the end plate. */
  setTitle(text, opts = {}) {
    if (!text) {
      this.titlePlane.visible = false;
      return;
    }
    const W = 2048;
    const H = opts.height ?? 512;
    const { texture } = makeTextTexture({
      text,
      width: W,
      height: H,
      canvas: this._titleCanvas,
      font: opts.font ?? `800 ${opts.size ?? 140}px ${FONT_STACK}`,
      color: opts.color ?? '#ffe066',
      outline: opts.outline ?? 0,
      shadow: opts.shadow ?? 30,
      shadowColor: opts.shadowColor ?? 'rgba(0,0,0,0.8)',
      letterSpacing: opts.letterSpacing ?? 6,
      valign: 'middle',
    });
    this.titleMat.map = texture;
    this.titleMat.needsUpdate = true;
    const w = this.aspect * 2 * 0.9;
    const h = (w * H) / W;
    this.titlePlane.geometry.dispose();
    this.titlePlane.geometry = new THREE.PlaneGeometry(w, h);
    this.titlePlane.position.y = opts.y ?? 0;
    this.titlePlane.visible = true;
  }

  setTitleOpacity(a) {
    this.titleMat.opacity = a;
    this.titlePlane.visible = a > 0.002 && !!this.titleMat.map;
  }

  update() {
    this.vignette.material.uniforms.uStrength.value = this.vignetteStrength;
  }

  render(renderer) {
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
    renderer.autoClear = true;
  }
}

function vignetteMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uStrength: { value: 0.55 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `
      varying vec2 vUv; uniform float uStrength;
      void main(){
        vec2 p = vUv - 0.5;
        float r = length(p*vec2(1.05,1.25));
        float v = smoothstep(0.32, 0.78, r);
        gl_FragColor = vec4(0.0,0.0,0.0, v*uStrength);
      }`,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
}
