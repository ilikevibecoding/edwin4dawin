#!/usr/bin/env bash
# Build the game and publish the static output to the gh-pages branch.
#
# The deployed build is reachable at (once GitHub Pages is enabled for the repo, Settings -> Pages ->
# Deploy from a branch -> gh-pages / root):
#   https://ilikevibecoding.github.io/edwin4dawin/
# and immediately (no Pages needed) through the githack mirror, pinned to the exact commit:
#   https://rawcdn.githack.com/ilikevibecoding/edwin4dawin/<gh-pages commit>/index.html
#   https://raw.githack.com/ilikevibecoding/edwin4dawin/gh-pages/index.html   (latest)
set -euo pipefail
cd "$(dirname "$0")/.."
SRC_SHA=$(git rev-parse --short=12 HEAD)
export BUILD_ID="${SRC_SHA}-$(date -u +%Y%m%dT%H%M%SZ)"
echo "Building $BUILD_ID"
npm run build --silent
echo "$BUILD_ID" > dist/BUILD_ID.txt
echo "built from $(git rev-parse HEAD) on $(git rev-parse --abbrev-ref HEAD) at $(date -u +%FT%TZ)" > dist/BUILD_INFO.txt
touch dist/.nojekyll
# play.html: same page, but the (content-hashed) assets are loaded from jsDelivr, which serves JS/CSS with
# the right MIME types even when GitHub Pages is not enabled. githack serves the small HTML entry point.
sed 's#"\./assets/#"https://cdn.jsdelivr.net/gh/ilikevibecoding/edwin4dawin@gh-pages/assets/#g' dist/index.html > dist/play.html
WORK=$(mktemp -d)
rm -rf "$WORK"
git fetch -q origin gh-pages
# detached at the remote tip (the local gh-pages branch is not kept up to date: the progress page publishes
# to origin the same way), pushed back as HEAD:gh-pages
git worktree add -q --detach "$WORK" origin/gh-pages
# progress/ is the hourly before/after page (published by tools/progress-publish.sh): keep it across deploys
find "$WORK" -mindepth 1 -maxdepth 1 ! -name .git ! -name progress -exec rm -rf {} +
cp -a dist/. "$WORK"/
mkdir -p "$WORK/.github/workflows" && cp tools/pages-workflow.yml "$WORK/.github/workflows/pages.yml"
(
  cd "$WORK"
  git add -A
  if git diff --cached --quiet; then echo "gh-pages already up to date"; else
    git commit -q -m "Deploy Bahía Vista build $BUILD_ID (from $SRC_SHA)"
    git push -q origin HEAD:gh-pages
  fi
  PAGES_SHA=$(git rev-parse HEAD)
  # progress/live.json: the progress page's "play the latest build" link (pinned to the deploy commit, so it is
  # written in a second commit); purged from jsDelivr so the page picks it up within a minute
  mkdir -p progress
  printf '{"build": "%s", "url": "https://rawcdn.githack.com/ilikevibecoding/edwin4dawin/%s/play.html", "time": "%s"}\n' \
    "$BUILD_ID" "$PAGES_SHA" "$(date -u +%FT%TZ)" > progress/live.json
  git add progress/live.json && git commit -q -m "Progress page: live build $BUILD_ID" && git push -q origin HEAD:gh-pages
  curl -s -o /dev/null "https://purge.jsdelivr.net/gh/ilikevibecoding/edwin4dawin@gh-pages/progress/live.json" || true
  echo "gh-pages commit: $PAGES_SHA"
  echo "pinned:  https://rawcdn.githack.com/ilikevibecoding/edwin4dawin/$PAGES_SHA/play.html"
  echo "latest:  https://raw.githack.com/ilikevibecoding/edwin4dawin/gh-pages/play.html"
  echo "pages:   https://ilikevibecoding.github.io/edwin4dawin/  (requires Pages enabled)"
  echo "$PAGES_SHA" > "$OLDPWD/dist/PAGES_SHA.txt"
)
git worktree remove --force "$WORK"
