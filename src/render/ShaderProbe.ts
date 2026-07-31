import * as THREE from 'three';

/**
 * three records this on a program the first time it is used, but only while
 * `debug.checkShaderErrors` is on. It is not in the published types.
 */
interface ProgramDiagnostics {
  diagnostics?: { runnable: boolean };
}

/**
 * Run three's deferred link check over the programs a compile just created, and
 * return how many of them failed to link.
 *
 * `WebGLRenderer.compile()` links programs but never asks the driver whether the
 * link succeeded: three defers that to a program's first *use*, inside
 * `getUniforms()`. Until something calls it, a program that the compiler
 * rejected is indistinguishable from a good one — `debug.onShaderError` cannot
 * fire and no diagnostics are recorded, because nothing has read `LINK_STATUS`
 * yet.
 *
 * Forcing the call here also completes the warm-up it belongs to: the uniform
 * and attribute location caches are built now rather than on the first frame
 * that draws with them.
 */
function forceFirstUse(renderer: THREE.WebGLRenderer, from: number): number {
  const programs = renderer.info.programs ?? [];
  let failed = 0;
  for (let i = from; i < programs.length; i++) {
    const program = programs[i];
    program.getUniforms();
    if ((program as unknown as ProgramDiagnostics).diagnostics?.runnable === false) failed++;
  }
  return failed;
}

/**
 * Compile a probe scene through the current `ShaderChunk` state and report
 * whether every program it needed actually linked.
 *
 * A validator built on `compile()` alone always sees success, so a chunk the
 * driver rejects stays installed and is only discovered when the first real draw
 * is dropped. With `debug.checkShaderErrors` off in a production build that is
 * never: the symptom reaching the console is a bare `useProgram: program not
 * valid` on every draw that wanted the patched shader, with the last program
 * that did link left bound and writing into the wrong target.
 *
 * Errors are swallowed rather than reported — a rejected patch is an expected
 * outcome that the caller handles by rolling back and saying so in one line,
 * not a defect worth spilling a full GLSL dump over.
 */
export function probeCompiles(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
): boolean {
  const previousCheck = renderer.debug.checkShaderErrors;
  const previousHandler = renderer.debug.onShaderError;
  renderer.debug.checkShaderErrors = true;
  renderer.debug.onShaderError = (): void => {};

  // Only the programs this compile adds are inspected. Running the check across
  // the whole cache would blame the patch under test for a shader another module
  // authored.
  const first = renderer.info.programs?.length ?? 0;
  let failed = 0;
  try {
    renderer.compile(scene, camera);
    failed = forceFirstUse(renderer, first);
  } catch {
    failed = 1;
  } finally {
    renderer.debug.checkShaderErrors = previousCheck;
    renderer.debug.onShaderError = previousHandler;
  }

  return failed === 0;
}

/**
 * Compile `scene` and return how many of the programs it produced failed to
 * link, leaving three to report each one in full.
 *
 * The caller must have `debug.checkShaderErrors` on: it is what makes three
 * read the link status at all, so with it off every program looks fine.
 */
export function verifyCompile(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
): number {
  const first = renderer.info.programs?.length ?? 0;
  renderer.compile(scene, camera);
  return forceFirstUse(renderer, first);
}
