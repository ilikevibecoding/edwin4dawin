#!/usr/bin/env bash
# Build the production bundle, smoke-test it headlessly, and push it to the playable-build branch
# that the live demo link serves (raw.githack.com). Safe to run on a timer: it exits without
# publishing when the source has not changed since the last publish or when the build/smoke fails.
#
#   tools/publish.sh            publish if the source changed
#   tools/publish.sh --force    publish regardless
set -euo pipefail
cd "$(dirname "$0")/.."
PLAY_BRANCH="${PLAY_BRANCH:-cursor/star-destroyer-play-9880}"
WT="/tmp/sd-play-worktree"
STAMP=".publish-stamp"
SRC_HEAD="$(git rev-parse HEAD)"
DIRTY="$(git status --porcelain -- src index.html vite.config.js package.json | wc -l)"
KEY="${SRC_HEAD}-${DIRTY}"
if [[ "${1:-}" != "--force" && -f "$STAMP" && "$(cat "$STAMP")" == "$KEY" ]]; then
  echo "[publish] no source change since last publish ($SRC_HEAD); skipping"
  exit 0
fi

echo "[publish] building $SRC_HEAD (dirty files: $DIRTY)"
npm run build >/tmp/publish-build.log 2>&1 || { echo "[publish] BUILD FAILED"; tail -20 /tmp/publish-build.log; exit 1; }

# serve dist/ and smoke test the production bundle (loads, becomes ready, no page errors)
PORT=5199
python3 -m http.server "$PORT" --directory dist >/tmp/publish-serve.log 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
sleep 1
if ! timeout 420 node tools/smoke.mjs "http://127.0.0.1:$PORT/" >/tmp/publish-smoke.log 2>&1; then
  echo "[publish] SMOKE TEST FAILED"; tail -20 /tmp/publish-smoke.log; exit 1
fi
grep -E "ready in|errors:" /tmp/publish-smoke.log || true
kill $SERVER_PID 2>/dev/null || true
trap - EXIT

# publish: replace the play branch contents with dist/
if [[ ! -d "$WT" ]]; then
  git fetch origin "$PLAY_BRANCH" 2>/dev/null || true
  if git show-ref --verify --quiet "refs/remotes/origin/$PLAY_BRANCH"; then
    git worktree add "$WT" -B "$PLAY_BRANCH" "origin/$PLAY_BRANCH" >/dev/null
  else
    git worktree add --detach "$WT" >/dev/null
    ( cd "$WT" && git checkout --orphan "$PLAY_BRANCH" >/dev/null 2>&1 && git rm -rfq . >/dev/null 2>&1 || true )
  fi
fi
( cd "$WT" && git fetch origin "$PLAY_BRANCH" >/dev/null 2>&1 && git reset -q --hard "origin/$PLAY_BRANCH" 2>/dev/null || true )
find "$WT" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -r dist/. "$WT"/
cat > "$WT/README.md" <<EOF
# ISD Vindicator — playable build

Production bundle of the Star Destroyer demo (source branch \`cursor/star-destroyer-ship-9880\`, commit \`$SRC_HEAD\`).
Built $(date -u +"%Y-%m-%d %H:%M UTC").

Play it: https://raw.githack.com/ilikevibecoding/edwin4dawin/$PLAY_BRANCH/index.html

Serve locally: \`npx serve .\` or \`python3 -m http.server\`, then open the printed URL (ES modules do not load from file://).
EOF
( cd "$WT" && git add -A && git -c user.name="$(git -C .. config user.name)" -c user.email="$(git -C .. config user.email)" commit -q -m "Playable build $(date -u +%Y-%m-%dT%H:%MZ) (source $SRC_HEAD)" && git push -q -u origin "$PLAY_BRANCH" ) || { echo "[publish] nothing to commit or push failed"; }
echo "$KEY" > "$STAMP"
PLAY_HEAD="$(git -C "$WT" rev-parse HEAD)"
echo "[publish] published $PLAY_HEAD"
echo "[publish] live:   https://raw.githack.com/ilikevibecoding/edwin4dawin/$PLAY_BRANCH/index.html"
echo "[publish] pinned: https://rawcdn.githack.com/ilikevibecoding/edwin4dawin/$PLAY_HEAD/index.html"
