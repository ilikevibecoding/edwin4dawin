import * as THREE from 'three';
import type { QualitySettings } from '../core/Quality';

/**
 * Whether `IRenderPipeline.depthTexture` is a texture this system may sample.
 *
 * The pipeline only runs a depth prepass when something downstream consumes it.
 * When it does not, the getter still returns a depth texture — but that texture
 * is the depth *attachment of the HDR target currently being rendered into*,
 * and sampling a buffer that is simultaneously bound for writing is a
 * framebuffer feedback loop: undefined content at best, a lost context on some
 * drivers. Soft particles and depth-projected decals therefore ask this first
 * and fall back to hard edges rather than reading it.
 *
 * The condition mirrors `RenderPipeline.needsGBuffer` exactly. It is duplicated
 * rather than exposed because the pipeline is another agent's file and a
 * one-line predicate is a cheaper coupling than an interface change.
 */
export function needsDepthPrepass(q: QualitySettings): boolean {
  return (
    q.antialias === 'taa' ||
    q.ssao ||
    q.ssr ||
    q.motionBlur ||
    q.depthOfField ||
    q.volumetricLighting ||
    q.volumetricFog
  );
}

/**
 * Whether the shockwave may copy the bound colour attachment mid-frame, and
 * what storage the copy has to use.
 *
 * `copyTexSubImage2D` — which is what `copyFramebufferToTexture` compiles down
 * to — reads the currently bound read framebuffer, so three conditions have to
 * hold. WebGL 2, because a byte texture cannot receive a float framebuffer and
 * the WebGL 1 paths for that are a minefield. Not MSAA, because copying out of
 * a multisampled attachment before it is resolved is an INVALID_OPERATION. And
 * matching storage, because the pipeline downgrades its HDR targets to 8-bit
 * wherever `EXT_color_buffer_float` is missing and a half-float destination
 * would then be rejected.
 */
export function grabPassSupport(
  renderer: THREE.WebGLRenderer,
  q: QualitySettings,
): { enabled: boolean; type: THREE.TextureDataType } {
  const isWebGL2 = renderer.capabilities.isWebGL2 !== false;
  const gl = renderer.getContext();
  const float = isWebGL2 && !!gl.getExtension('EXT_color_buffer_float');
  return {
    enabled: isWebGL2 && q.antialias !== 'msaa',
    type: float ? THREE.HalfFloatType : THREE.UnsignedByteType,
  };
}

/** A buffer sub-range to upload, owned by the caller and refilled every frame. */
export interface UploadRange {
  start: number;
  count: number;
}

export function makeUploadRange(): UploadRange {
  return { start: 0, count: 0 };
}

/**
 * Queues a partial buffer upload without allocating.
 *
 * `BufferAttribute.addUpdateRange` pushes a fresh `{ start, count }` literal,
 * and this system calls it for every dirty particle batch and every decal
 * written — around a dozen objects a frame in a firefight, which is the last
 * thing left allocating on the frame path. The renderer only ever reads those
 * objects and then empties the array, so handing it the same one back each
 * frame is safe, and merging the ranges here rather than there means it only
 * ever holds one.
 */
export function queueUpload(
  attribute: THREE.BufferAttribute | THREE.InterleavedBuffer,
  range: UploadRange,
  start: number,
  count: number,
): void {
  const ranges = attribute.updateRanges;
  if (ranges.length === 0) {
    range.start = start;
    range.count = count;
    ranges.push(range);
  } else {
    // The renderer has not consumed last frame's range yet, so widen it rather
    // than queue a second: this system's dirty regions are contiguous runs and
    // one `bufferSubData` over the union beats two over the parts.
    const end = Math.max(range.start + range.count, start + count);
    range.start = Math.min(range.start, start);
    range.count = end - range.start;
  }
  attribute.needsUpdate = true;
}
