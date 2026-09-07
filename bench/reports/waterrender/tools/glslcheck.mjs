// Offline compile check of the water shaders: node bench/reports/waterrender/tools/glslcheck.mjs [wdbg]
// Assembles the MeshStandardMaterial program the way three r170's WebGLProgram does (prefix, includes, light
// counts, loop unrolling) with the water's onBeforeCompile hooks applied, for the plane and the patch, and runs
// glslangValidator (apt: glslang-tools) on the vertex and fragment stages as ESSL 3.00. Catches syntax and type
// errors and reserved words without a browser slot; it does not see what only the driver would (precision,
// register limits), so a passing check is a necessary and not a sufficient condition.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const wdbg = Number(process.argv[2] || 0);
process.chdir(root);

// export the shader strings of water.ts through a sibling entry (relative imports resolve), bundled by esbuild
const entry = path.join(root, 'src/world/.glslcheck-entry.ts');
const bundle = '/tmp/waterrender/glslcheck-bundle.mjs';
fs.mkdirSync('/tmp/waterrender', { recursive: true });
const src = fs.readFileSync(path.join(root, 'src/world/water.ts'), 'utf8');
const names = [...src.matchAll(/^const (WATER_[A-Z_]+) = \/\* glsl \*\/ `/gm)].map((m) => m[1]);
fs.writeFileSync(entry, src.replace(/^const WATER_DEBUG = .*$/m, `const WATER_DEBUG = ${wdbg};`) + `\nexport const __shaders = { ${names.join(', ')} };\nexport const __debug = WATER_DEBUG;\n`);
try {
  execFileSync('npx', ['esbuild', entry, '--bundle', '--format=esm', '--platform=node', '--external:three', `--outfile=${bundle}`, '--log-level=warning'], { stdio: 'inherit' });
} finally { fs.unlinkSync(entry); }
const THREE = await import('three');
const { __shaders: S, __debug } = await import(bundle);

const params = {
  numDirLights: 3, numDirLightShadows: 3, numSpotLights: 0, numSpotLightShadows: 0, numSpotLightMaps: 0, numSpotLightShadowsWithMaps: 0,
  numRectAreaLights: 0, numPointLights: 0, numPointLightShadows: 0, numHemiLights: 0, numClippingPlanes: 0, numClipIntersection: 0,
};
const replaceLightNums = (s) => s
  .replace(/NUM_DIR_LIGHTS/g, params.numDirLights).replace(/NUM_SPOT_LIGHTS/g, params.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g, params.numSpotLightMaps)
  .replace(/NUM_SPOT_LIGHT_COORDS/g, 0).replace(/NUM_RECT_AREA_LIGHTS/g, params.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g, params.numPointLights)
  .replace(/NUM_HEMI_LIGHTS/g, params.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g, params.numDirLightShadows)
  .replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g, 0).replace(/NUM_SPOT_LIGHT_SHADOWS/g, 0).replace(/NUM_POINT_LIGHT_SHADOWS/g, 0)
  .replace(/NUM_CLIPPING_PLANES/g, 0).replace(/UNION_CLIPPING_PLANES/g, 0);
const includePattern = /^[ \t]*#include +<([\w\d./]+)>/gm;
const resolveIncludes = (s) => s.replace(includePattern, (m, inc) => {
  const c = THREE.ShaderChunk[inc];
  if (c === undefined) throw new Error(`cannot resolve #include <${inc}>`);
  return resolveIncludes(c);
});
const unrollPattern = /#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;
const unrollLoops = (s) => s.replace(unrollPattern, (m, a, b, body) => {
  let out = '';
  for (let i = parseInt(a); i < parseInt(b); i++) out += body.replace(/\[\s*i\s*\]/g, `[ ${i} ]`).replace(/UNROLLED_LOOP_INDEX/g, i);
  return out;
});
const precision = ['float', 'int', 'sampler2D', 'samplerCube', 'sampler3D', 'sampler2DArray', 'sampler2DShadow', 'samplerCubeShadow', 'sampler2DArrayShadow', 'isampler2D', 'isampler3D', 'isamplerCube', 'isampler2DArray', 'usampler2D', 'usampler3D', 'usamplerCube', 'usampler2DArray']
  .map((t) => `precision highp ${t};`).join('\n') + '\n#define HIGH_PRECISION';
const common = ['#define SHADER_TYPE MeshStandardMaterial', '#define SHADER_NAME', '#define USE_SHADOWMAP', '#define SHADOWMAP_TYPE_PCF_SOFT', '#define USE_LOGDEPTHBUF', 'uniform mat4 viewMatrix;', 'uniform vec3 cameraPosition;', 'uniform bool isOrthographic;'];
const prefixVertex = ['#define attribute in', '#define varying out', '#define texture2D texture', precision, '#define STANDARD', '#define VERTEX_TEXTURES', ...common,
  'uniform mat4 modelMatrix;', 'uniform mat4 modelViewMatrix;', 'uniform mat4 projectionMatrix;', 'uniform mat3 normalMatrix;',
  '#ifdef USE_INSTANCING\nattribute mat4 instanceMatrix;\n#endif', 'attribute vec3 position;', 'attribute vec3 normal;', 'attribute vec2 uv;', ''].join('\n');
const prefixFragment = ['#define varying in', 'layout(location = 0) out highp vec4 pc_fragColor;', '#define gl_FragColor pc_fragColor', '#define gl_FragDepthEXT gl_FragDepth',
  '#define texture2D texture', '#define textureCube texture', '#define texture2DProj textureProj', '#define texture2DLodEXT textureLod', '#define texture2DProjLodEXT textureProjLod',
  '#define textureCubeLodEXT textureLod', '#define texture2DGradEXT textureGrad', '#define texture2DProjGradEXT textureProjGrad', '#define textureCubeGradEXT textureGrad',
  precision, '#define STANDARD', ...common, '#define OPAQUE', THREE.ShaderChunk.colorspace_pars_fragment,
  'vec4 linearToOutputTexel( vec4 value ) { return ( vec4( value.rgb * mat3( 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0 ), value.a ) ); }',
  'float luminance( const in vec3 rgb ) { const vec3 weights = vec3( 0.2126, 0.7152, 0.0722 ); return dot( weights, rgb ); }', ''].join('\n');

function assemble(patch) {
  const define = patch ? '#define WATER_PATCH\n' : '';
  const lib = THREE.ShaderLib.standard;
  let vert = define + lib.vertexShader
    .replace('#include <common>', `#include <common>\n${S.WATER_VERT_PARS}`)
    .replace('#include <begin_vertex>', `${S.WATER_VERT_MAIN}\nvec3 transformed = wp;`);
  const lights = THREE.ShaderChunk.lights_fragment_begin.replace(
    /getShadow\( directionalShadowMap\[ i \], directionalLightShadow\.shadowMapSize, directionalLightShadow\.shadowIntensity, directionalLightShadow\.shadowBias, directionalLightShadow\.shadowRadius, vDirectionalShadowCoord\[ i \] \)/g,
    'waterShadow( directionalShadowMap[ i ], directionalLightShadow, vDirectionalShadowCoord[ i ], directionalShadowMatrix[ i ], wShadowOff )');
  let frag = define + (__debug ? `#define WATER_DEBUG ${__debug}\n` : '') + lib.fragmentShader
    .replace('#include <common>', `#include <common>\n${S.WATER_FRAG_PARS}`)
    .replace('#include <shadowmap_pars_fragment>', `#include <shadowmap_pars_fragment>\n${S.WATER_SHADOW_FN}`)
    .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>\n${S.WATER_FRAG_SURFACE}`)
    .replace('#include <lights_fragment_begin>', lights)
    .replace('#include <lights_fragment_maps>', S.WATER_FRAG_MAPS)
    .replace('#include <opaque_fragment>', S.WATER_FRAG_COMPOSE);
  // glslang knows 'average' (three's <common> helper) as a built-in of some extension and rejects the redeclaration
  vert = unrollLoops(replaceLightNums(resolveIncludes(vert))).replace(/\baverage\b/g, 'average_');
  frag = unrollLoops(replaceLightNums(resolveIncludes(frag))).replace(/\baverage\b/g, 'average_');
  return { vert: '#version 300 es\n' + prefixVertex + vert, frag: '#version 300 es\n' + prefixFragment + frag };
}

let failed = 0;
for (const patch of [false, true]) {
  const { vert, frag } = assemble(patch);
  for (const [stage, code, ext] of [['vert', vert, 'vert'], ['frag', frag, 'frag']]) {
    const file = `/tmp/waterrender/water-${patch ? 'patch' : 'plane'}-${__debug}.${ext}`;
    fs.writeFileSync(file, code);
    const r = spawnSync('glslangValidator', ['-S', ext, file], { encoding: 'utf8' });
    const ok = r.status === 0;
    if (!ok) failed++;
    const lines = code.split('\n').length;
    console.log(`${patch ? 'patch' : 'plane'} ${stage}: ${ok ? 'OK' : 'FAIL'} (${lines} lines, ${file})`);
    if (!ok) {
      // glslang reports "ERROR: 0:<line>: ..." ; print each with its source line
      for (const l of (r.stdout + r.stderr).split('\n')) {
        const m = l.match(/^ERROR: \d+:(\d+): (.*)$/);
        if (m) console.log(`  line ${m[1]}: ${m[2]}\n    > ${code.split('\n')[Number(m[1]) - 1]?.trim()}`);
        else if (l.startsWith('ERROR') || l.startsWith('WARNING')) console.log('  ' + l);
      }
    }
  }
}
process.exit(failed ? 1 : 0);
