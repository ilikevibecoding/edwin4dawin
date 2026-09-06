#!/usr/bin/env bash
# Publish progress/ (page, data.json, frames) to gh-pages: tools/progress-publish.sh <tag> <buildSha> [notesFile]
# Two commits: the data, then the page pinned (jsDelivr @commit) to the commit that holds the data.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TAG="${1:?tag}"; BUILD_SHA="${2:-unknown}"; NOTES="${3:-/dev/stdout}"
cd "$ROOT"
WORK=/tmp/gh-pages-progress
rm -rf "$WORK"; git worktree prune
git fetch -q origin gh-pages
git worktree add -q "$WORK" origin/gh-pages --detach
mkdir -p "$WORK/progress"
cp -r "$ROOT/progress/." "$WORK/progress/"
GITC=(git -c "user.name=$(git -C "$ROOT" config user.name)" -c "user.email=$(git -C "$ROOT" config user.email)")
# commit 1: data + frames (+ the page template). The page loads data.json and the frames from jsDelivr pinned
# to this commit (branch URLs stayed stale for hours despite purges); commit 2 writes that pin into the page.
if ( cd "$WORK" && git add -A progress && "${GITC[@]}" commit -q -m "Progress page: snapshot $TAG (build $BUILD_SHA)" ); then
  PIN="$(cd "$WORK" && git rev-parse HEAD)"
  sed -i "s|const PIN = '__PIN__';|const PIN = '$PIN';|" "$WORK/progress/index.html"
  ( cd "$WORK" && git add progress/index.html && "${GITC[@]}" commit -q -m "Progress page: pin data to ${PIN:0:12}" && git push -q origin HEAD:gh-pages ) || echo "publish: push failed" >> "$NOTES"
  sleep 5
  if curl -s "https://cdn.jsdelivr.net/gh/ilikevibecoding/edwin4dawin@$PIN/progress/data.json" | grep -q "\"tag\": \"$TAG\""; then echo "cdn: pinned data.json serves $TAG" >> "$NOTES"; else echo "cdn: pinned data.json not yet served (GitHub lag?)" >> "$NOTES"; fi
  curl -s -o /dev/null "https://purge.jsdelivr.net/gh/ilikevibecoding/edwin4dawin@gh-pages/progress/index.html" || true
else
  echo "publish: nothing to commit" >> "$NOTES"
fi
git worktree remove --force "$WORK" 2>/dev/null || true
echo "published: https://raw.githack.com/ilikevibecoding/edwin4dawin/gh-pages/progress/index.html"
