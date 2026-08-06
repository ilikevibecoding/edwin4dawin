#!/usr/bin/env bash
# Build an out-of-tree copy of the app with every mesh in base.js tagged with
# the source line that made it, so tools/shadowaudit-9207.mjs can name what it
# is complaining about. The workspace tree is never modified.
set -euo pipefail

ROOT=${ROOT:-/workspace}
WORK=${WORK:-/tmp/inst9207}
DIST=${DIST:-/tmp/instdist}

rm -rf "$WORK"
mkdir -p "$WORK"
cp -r "$ROOT/src" "$ROOT/styles" "$ROOT/index.html" "$ROOT/vite.config.js" "$ROOT/package.json" "$WORK/"
ln -s "$ROOT/node_modules" "$WORK/node_modules"

python3 - "$WORK/src/base.js" <<'PY'
import re, sys
p = sys.argv[1]
lines = open(p).read().split('\n')
out = []
for i, l in enumerate(lines):
    l = l.replace('new THREE.InstancedMesh(', f'__mk9207({i+1}, THREE.InstancedMesh, ')
    l = l.replace('new THREE.Mesh(', f'__mk9207({i+1}, THREE.Mesh, ')
    out.append(l)
helper = '''
function __mk9207(line, Ctor, ...args) {
  const o = new Ctor(...args);
  o.userData.__src = line;
  return o;
}
'''
last = max(i for i, l in enumerate(out) if re.search(r"from '.*';\s*$", l))
out.insert(last + 1, helper)
open(p, 'w').write('\n'.join(out))
print('tagged', sum('__mk9207(' in l for l in out), 'mesh sites')
PY

cd "$WORK"
npx vite build --outDir "$DIST" --emptyOutDir | tail -3
