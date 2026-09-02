#!/usr/bin/env bash
# Build the game and publish the static site to an orphan branch, then print a playable raw-CDN URL.
#
#   tools/publish-play.sh [branch]        (default branch: cursor/play-6ead)
#
# The site is built from the current HEAD in a throw-away worktree (uncommitted edits are not included) and
# committed as a snapshot on top of the target branch (created as an orphan the first time), then pushed. The
# printed URL serves that commit through rawcdn.githack.com, which returns GitHub files with real Content-Types
# (jsDelivr deliberately serves .html as text/plain). Binary assets redirect to raw.githubusercontent.com.
set -euo pipefail

BRANCH="${1:-cursor/play-6ead}"
ROOT="$(git rev-parse --show-toplevel)"
REPO_SLUG="$(git -C "$ROOT" remote get-url origin | sed -E 's#(git@github.com:|https://github.com/)##; s#\.git$##')"
SRC_SHA="$(git -C "$ROOT" rev-parse HEAD)"
BUILD_DIR="$(mktemp -d /tmp/play-build.XXXX)"
SITE_DIR="$(mktemp -d /tmp/play-site.XXXX)"
cleanup() { git -C "$ROOT" worktree remove --force "$BUILD_DIR" 2>/dev/null || true; git -C "$ROOT" worktree remove --force "$SITE_DIR" 2>/dev/null || true; rm -rf "$BUILD_DIR" "$SITE_DIR"; }
trap cleanup EXIT

echo "› building $SRC_SHA"
git -C "$ROOT" worktree add -q --detach "$BUILD_DIR" "$SRC_SHA"
ln -s "$ROOT/node_modules" "$BUILD_DIR/node_modules"
(cd "$BUILD_DIR" && npx vite build --logLevel warn)

echo "› snapshotting dist/ onto $BRANCH"
if git -C "$ROOT" ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
  git -C "$ROOT" fetch -q origin "$BRANCH"
  git -C "$ROOT" worktree add -q --detach "$SITE_DIR" FETCH_HEAD
else
  git -C "$ROOT" worktree add -q --detach "$SITE_DIR" "$SRC_SHA"
  git -C "$SITE_DIR" checkout -q --orphan "publish-tmp-$$"
  git -C "$SITE_DIR" rm -rq --cached . >/dev/null
fi
find "$SITE_DIR" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R "$BUILD_DIR/dist/." "$SITE_DIR/"
printf 'built from %s\n' "$SRC_SHA" > "$SITE_DIR/BUILD_INFO.txt"
git -C "$SITE_DIR" add -A
git -C "$SITE_DIR" commit -q -m "Play build of $SRC_SHA"
SITE_SHA="$(git -C "$SITE_DIR" rev-parse HEAD)"
git -C "$SITE_DIR" push -q origin "HEAD:refs/heads/$BRANCH"

echo
echo "published $BRANCH @ $SITE_SHA"
echo "play: https://rawcdn.githack.com/$REPO_SLUG/$SITE_SHA/index.html"
