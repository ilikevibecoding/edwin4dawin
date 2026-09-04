#!/usr/bin/env bash
# Build the game and push the static bundle to the play branch that backs the live demo link.
#   tools/publish.sh            # build + publish
#   PLAY_BRANCH=... tools/publish.sh
# Live (follows the branch head, cached ~minutes):
#   https://raw.githack.com/ilikevibecoding/edwin4dawin/<PLAY_BRANCH>/index.html
# Permanent (per commit):
#   https://rawcdn.githack.com/ilikevibecoding/edwin4dawin/<commit>/index.html
set -euo pipefail
cd "$(dirname "$0")/.."
PLAY_BRANCH="${PLAY_BRANCH:-cursor/star-destroyer-play-14e2}"
WT="${PLAY_WORKTREE:-/tmp/play-worktree}"
SRC_SHA="$(git rev-parse --short HEAD)"
STAMP="$(date -u +'%Y-%m-%d %H:%M UTC')"

npm run build >/dev/null

if [ ! -d "$WT/.git" ] && [ ! -f "$WT/.git" ]; then
  rm -rf "$WT"
  if git ls-remote --exit-code --heads origin "$PLAY_BRANCH" >/dev/null 2>&1; then
    git fetch origin "$PLAY_BRANCH"
    git worktree add "$WT" "$PLAY_BRANCH" 2>/dev/null || git worktree add -B "$PLAY_BRANCH" "$WT" "origin/$PLAY_BRANCH"
  else
    git worktree add --detach "$WT" HEAD
    (cd "$WT" && git checkout --orphan "$PLAY_BRANCH" && git rm -rfq . && git clean -fdq)
  fi
fi

(
  cd "$WT"
  find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
  cp -r "$OLDPWD/dist/." .
  touch .nojekyll
  cat > README.md <<EOF
# ISD Vigilant — playable build

Static build of the Imperial Star Destroyer demo, published ${STAMP} from source commit ${SRC_SHA}.

Live: https://raw.githack.com/ilikevibecoding/edwin4dawin/${PLAY_BRANCH}/index.html
EOF
  git add -A
  if git diff --cached --quiet; then
    echo "nothing changed"
  else
    git commit -qm "Playable build ${STAMP} (source ${SRC_SHA})"
    git push -q -u origin "$PLAY_BRANCH"
  fi
  SHA="$(git rev-parse HEAD)"
  echo "live:      https://raw.githack.com/ilikevibecoding/edwin4dawin/${PLAY_BRANCH}/index.html"
  echo "permanent: https://rawcdn.githack.com/ilikevibecoding/edwin4dawin/${SHA}/index.html"
)
