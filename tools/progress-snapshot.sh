#!/usr/bin/env bash
# Hourly progress snapshot for the user-facing before/after page (progress/index.html on gh-pages).
#
#   tools/progress-snapshot.sh <tag> [--source lead|integration] [--publish]
#
# 1. --source integration (default): refresh the integration worktree from the lead branch and merge every
#    pushed builder branch (cursor/*-loop-8213 listed in BUILDERS); a branch that conflicts or breaks tsc is
#    skipped for this hour and named in progress/shots/<tag>/notes.txt. --source lead captures the lead HEAD.
# 2. Build, serve on port 4398 and shoot the PROGRESS_VIEWS with bench/scripts/shot.mjs (1280x720).
# 3. Write progress/shots/<tag>/<label>.jpg + meta.json, update progress/data.json.
# 4. --publish: copy progress/ into the gh-pages checkout and push.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TAG="${1:?tag}"; shift || true
SOURCE=integration; PUBLISH=0
while [ $# -gt 0 ]; do case "$1" in --source) SOURCE="$2"; shift 2;; --publish) PUBLISH=1; shift;; *) echo "unknown $1"; exit 2;; esac; done
BUILDERS=(acsplit waterrender waterphys boats clouds4 light3 street highway facade3 veg5 terrain5)
LEAD_BRANCH=cursor/vice-city-aerial-8213
INTEG=/home/ubuntu/wt-integration
PORT=4398
OUT="$ROOT/progress/shots/$TAG"
mkdir -p "$OUT"
NOTES="$OUT/notes.txt"; : > "$NOTES"

cd "$ROOT"
if [ "$SOURCE" = integration ]; then
  git fetch -q origin "$LEAD_BRANCH" || true
  for b in "${BUILDERS[@]}"; do git fetch -q origin "cursor/$b-loop-8213" 2>/dev/null || true; done
  if [ ! -d "$INTEG" ]; then git worktree add -q --detach "$INTEG" HEAD; fi
  ( cd "$INTEG" && git checkout -q --detach "$(git -C "$ROOT" rev-parse HEAD)" && git reset -q --hard )
  echo "base: $(git rev-parse --short HEAD) ($LEAD_BRANCH)" >> "$NOTES"
  for b in "${BUILDERS[@]}"; do
    ref="origin/cursor/$b-loop-8213"
    git rev-parse -q --verify "$ref" >/dev/null 2>&1 || { echo "skip $b: no remote branch" >> "$NOTES"; continue; }
    if [ "$(git merge-base "$ref" HEAD)" = "$(git rev-parse "$ref")" ]; then echo "skip $b: nothing new" >> "$NOTES"; continue; fi
    if ( cd "$INTEG" && git merge -q --no-edit "$ref" >/dev/null 2>&1 ); then
      echo "merged $b: $(git rev-parse --short "$ref") $(git log -1 --format=%s "$ref" | cut -c1-90)" >> "$NOTES"
    elif [ -z "$(cd "$INTEG" && git diff --name-only --diff-filter=U)" ] && ( cd "$INTEG" && git commit -q --no-edit >/dev/null 2>&1 ); then
      # rerere (enabled repo-wide, autoupdate) replayed a resolution the lead recorded for exactly these conflicts
      echo "merged $b (recorded resolution): $(git rev-parse --short "$ref") $(git log -1 --format=%s "$ref" | cut -c1-90)" >> "$NOTES"
    else
      ( cd "$INTEG" && git merge --abort 2>/dev/null || true )
      echo "skip $b: merge conflict in $(cd "$INTEG" && git diff --name-only --diff-filter=U 2>/dev/null | tr '\n' ' ')" >> "$NOTES"
    fi
  done
  # cross-branch fixups (tools/integration-fixups/*.patch): semantic reconciliation a hunk merge cannot express,
  # e.g. two branches both lighting the highway. A sidecar <name>.requires lists paths that must exist first.
  for p in "$ROOT"/tools/integration-fixups/*.patch; do
    [ -e "$p" ] || continue
    ok=1
    if [ -f "${p%.patch}.requires" ]; then while read -r req; do [ -n "$req" ] && [ ! -e "$INTEG/$req" ] && ok=0; done < "${p%.patch}.requires"; fi
    [ $ok = 1 ] || { echo "fixup not needed: $(basename "$p")" >> "$NOTES"; continue; }
    if ( cd "$INTEG" && git apply --3way "$p" >/dev/null 2>&1 && git commit -q -am "fixup: $(basename "$p")" >/dev/null 2>&1 ); then
      echo "fixup applied: $(basename "$p")" >> "$NOTES"
    else
      ( cd "$INTEG" && git reset -q --hard HEAD )
      echo "fixup skipped (does not apply): $(basename "$p")" >> "$NOTES"
    fi
  done
  ( cd "$INTEG" && [ -d node_modules ] || ln -s "$ROOT/node_modules" "$INTEG/node_modules" )
  if ! ( cd "$INTEG" && npx tsc --noEmit >/dev/null 2>&1 ); then
    echo "tsc failed on the integration of all branches; falling back to the lead build" >> "$NOTES"
    SRC="$ROOT"
  else
    SRC="$INTEG"
  fi
else
  SRC="$ROOT"; echo "source: lead $(git rev-parse --short HEAD)" >> "$NOTES"
fi

( cd "$SRC" && npx vite build --outDir /tmp/integ-dist --logLevel error >/dev/null 2>&1 )
SESSION=integ-preview
if ! tmux -f /exec-daemon/tmux.portal.conf has-session -t "=$SESSION" 2>/dev/null; then
  tmux -f /exec-daemon/tmux.portal.conf new-session -d -s "$SESSION" -c "$ROOT" -- bash -l
  tmux -f /exec-daemon/tmux.portal.conf send-keys -t "$SESSION:0.0" "npx vite preview --outDir /tmp/integ-dist --port $PORT --strictPort" C-m
  sleep 4
fi
BUILD_SHA="$(cd "$SRC" && git rev-parse --short HEAD)"
echo "build: $BUILD_SHA from $SRC" >> "$NOTES"

# label|title|item|query (the query is appended to ?bench=)
PROGRESS_VIEWS=(
  "aircraft_rear|Aircraft, rear three-quarter (taxiing)|aircraft|plane-rear-quarter"
  "aircraft_front|Aircraft, front three-quarter (cowl, propeller, floats)|aircraft|plane-front-quarter"
  "cockpit|Cockpit approaching downtown|aircraft|cockpit-city"
  "glass|Cockpit glass in direct sun|aircraft|glass-sun"
  "water_landing|Touchdown: floats 1.0 s after contact (displacement, spray, splash)|water|water-landing-firm&fly=1.0"
  "water_step|Planing on the step 4 s after touchdown (wake, spray, hull foam)|water|water-landing-firm&fly=4"
  "harbor|Harbour: boats, wakes, marina|water|harbor"
  "island_pass|Low pass over the keys (shore, water colour)|water|island-pass"
  "skyline_high|Skyline from 1.2 km|city|skyline-high"
  "city_500m|Downtown from 500 m|city|dev&cam=-2500,500,-3500&hdg=-30&pch=-35&fov=50&time=14&weather=clear&plane=-1500,400,-2500,300,0,0,55,0.7"
  "city_200m|Downtown and the bayfront from 200 m|city|dev&cam=-2000,180,-3300&hdg=-40&pch=-18&fov=55&time=14&weather=clear&plane=-1500,400,-2500,300,0,0,55,0.7"
  "city_north|Downtown from its southern edge, 200 m|city|dev&cam=-2650,200,-3150&hdg=0&pch=-20&fov=55&time=14&weather=clear&plane=-1500,400,-2500,300,0,0,55,0.7"
  "street_2m|Street level, downtown avenue|city|dev&cam=-2737,6.9,-3880&hdg=0&pch=-3&fov=50&time=14&weather=clear&plane=-1500,400,-2500,300,0,0,55,0.7"
  "night|Downtown at night|city|night"
  "sunset|Sunset over the bay|sky|sunset"
  "cloudy|Overcast deck|sky|cloudy"
  "highway_bridge|Causeway flyover at 45 m|highway|bridge-low"
  "highway_aerial|Reference aerial: approach highway across Garza|highway|aerial-a"
  "highway_200m|Coastal highway from 200 m|highway|dev&cam=-3400,220,2950&hdg=-75&pch=-22&fov=50&time=15&weather=clear&plane=-2500,300,3300,270,0,0,55,0.7"
  "foliage_suburb|Suburb canopy from 130 m|foliage|dev&cam=-6000,130,-2300&hdg=0&pch=-25&fov=50&time=15&weather=clear&plane=-6000,120,-2400,0,0,0,50,0.7"
  "foliage_park|Park canopy from 130 m|foliage|dev&cam=-4950,130,2000&hdg=0&pch=-25&fov=50&time=15&weather=clear&plane=-4950,120,1900,0,0,0,50,0.7"
  "shore_beach|Garza beach from 60 m|shore|dev&cam=200,60,3300&hdg=-30&pch=-20&fov=50&time=15&weather=clear&plane=600,80,3400,200,0,0,50,0.7"
)
META="$OUT/meta.json"
echo "{\"tag\":\"$TAG\",\"build\":\"$BUILD_SHA\",\"time\":\"$(date -u +%Y-%m-%dT%H:%MZ)\",\"views\":[" > "$META"
# One Chrome for the whole batch. The Chrome gate (/usr/local/bin/google-chrome) grants a third slot to launches
# descending from this script, so the hourly page is not queued behind the builders' captures.
SPEC="/tmp/progress-$TAG.spec"; : > "$SPEC"
for spec in "${PROGRESS_VIEWS[@]}"; do
  IFS='|' read -r label title item query <<< "$spec"
  printf '%s\t%s\n' "/tmp/progress-$TAG-$label.png" "http://127.0.0.1:$PORT/?bench=$query&freeze=1&seed=20260904&nohud=1" >> "$SPEC"
done
node "$ROOT/bench/scripts/shots.mjs" "$SPEC" 1280 720 3 > "/tmp/progress-$TAG-shots.log" 2>&1 || true
first=1
for spec in "${PROGRESS_VIEWS[@]}"; do
  IFS='|' read -r label title item query <<< "$spec"
  png="/tmp/progress-$TAG-$label.png"
  if [ -s "$png" ] && python3 -c "from PIL import Image; im=Image.open('$png').convert('RGB'); im.save('$OUT/$label.jpg', quality=85)"; then
    ok=true
    python3 -c "import json,sys; d=json.load(open('$png.log.json')); sys.exit(0 if d.get('ready') else 1)" 2>/dev/null || echo "not ready (shot anyway): $label" >> "$NOTES"
  else
    ok=false; echo "shot failed: $label" >> "$NOTES"
  fi
  [ $first = 1 ] || echo "," >> "$META"; first=0
  printf '{"label":"%s","title":"%s","item":"%s","ok":%s}' "$label" "$title" "$item" "$ok" >> "$META"
done
echo "]}" >> "$META"

# data.json: items + ordered snapshot tags
python3 "$ROOT/tools/progress-data.py" "$ROOT/progress"

if [ $PUBLISH = 1 ]; then
  bash "$ROOT/tools/progress-publish.sh" "$TAG" "$BUILD_SHA" "$NOTES"
fi
cat "$NOTES"
