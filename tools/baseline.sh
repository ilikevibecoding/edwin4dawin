#!/bin/bash
# ---------------------------------------------------------------------------
# The gauntlet frame set for one round, shot in one go against a served build.
#
#   tools/baseline.sh shots/round2 "http://127.0.0.1:5210/?quality=fast"
#
# Same folders and view names every round so the critics score like against
# like and tools/imdiff.mjs can pair the frames: truck_{day,dusk,night} (every
# beauty view plus the HUD), camp_day, camp_night, fleet (every parked vehicle
# by day and by night), lions_day, lions_dusk, lions_walk (an eight-frame strip
# past a world-fixed camera) and the glass conditions. Serve the build first
# (`npx vite preview` of a worktree, or the dev server); the script never builds.
# ---------------------------------------------------------------------------
set -u
cd "$(dirname "$0")/.."
OUT=${1:?usage: tools/baseline.sh <out-dir> <url>}
U=${2:?usage: tools/baseline.sh <out-dir> <url>}
W=640
H=360

node tools/shots.mjs --width $W --height $H --url "$U" --out "$OUT/truck_day"
node tools/shots.mjs --width $W --height $H --url "$U&time=dusk" --out "$OUT/truck_dusk"
node tools/shots.mjs --width $W --height $H --url "$U&time=night" --out "$OUT/truck_night"
node tools/campshots.mjs --url "$U" --views arrive,beyond,gate,interior,mess,overhead --out "$OUT/camp_day"
node tools/campshots.mjs --url "$U" --time night --views arrive,fire,gate,mess --out "$OUT/camp_night"
node tools/fleetshots.mjs --url "$U&fleet=high" --times day,night --out "$OUT/fleet"
node tools/lions.mjs --url "$U" --views close,face,far,medium,pride,seat,side --out "$OUT/lions_day"
node tools/lions.mjs --url "$U" --time dusk --views close,medium,pride --out "$OUT/lions_dusk"
node tools/lions.mjs --url "$U" --walk 8 --views close,medium,far,seat --out "$OUT/lions_walk"
node tools/glassgauntlet.mjs --url "$U" --width $W --height $H --round "$(basename "$OUT")" --out "$OUT/glass"
# the HUD stamp in the frames is the revision of the tree that was served; after a
# deploy that is the bundle commit, one ahead of the source commit it was built from
echo "$U" > "$OUT/SOURCE"
echo "BASELINE_DONE $OUT"
