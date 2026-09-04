#!/usr/bin/env bash
# Publish the latest *committed* state of the source branch as a playable build on the play branch.
# Only committed sources are published, and only if the production bundle passes tools/smoke.mjs.
#
#   tools/publish.sh                # one publish cycle
#   PUBLISH_LOOP=3600 tools/publish.sh   # re-publish every hour (run inside tmux)
#
# Env: SRC_BRANCH (default cursor/star-destroyer-ship-a618), PLAY_BRANCH (default cursor/star-destroyer-play-a618)
set -u
REPO=${REPO:-/workspace}
SRC_BRANCH=${SRC_BRANCH:-cursor/star-destroyer-ship-a618}
PLAY_BRANCH=${PLAY_BRANCH:-cursor/star-destroyer-play-a618}
SRC_WT=${SRC_WT:-/tmp/publish-src}
PLAY_WT=${PLAY_WT:-/tmp/publish-play}
LOG=${LOG:-/tmp/publish.log}

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "$LOG"; }

publish_once() {
  local sha
  sha=$(git -C "$REPO" rev-parse --short "$SRC_BRANCH") || { log "no branch $SRC_BRANCH"; return 1; }

  # --- source worktree, detached at the branch head
  if [ ! -d "$SRC_WT/.git" ] && [ ! -f "$SRC_WT/.git" ]; then
    git -C "$REPO" worktree add --detach "$SRC_WT" "$SRC_BRANCH" >>"$LOG" 2>&1 || { log "worktree add failed"; return 1; }
  else
    git -C "$SRC_WT" checkout --detach "$SRC_BRANCH" >>"$LOG" 2>&1 || { log "checkout failed"; return 1; }
  fi
  [ -e "$SRC_WT/node_modules" ] || ln -s "$REPO/node_modules" "$SRC_WT/node_modules"

  # --- build + smoke
  ( cd "$SRC_WT" && rm -rf dist && npx vite build >>"$LOG" 2>&1 ) || { log "build failed for $sha"; return 1; }
  ( cd "$SRC_WT" && node tools/smoke.mjs dist >>"$LOG" 2>&1 ) || { log "smoke test failed for $sha (not published)"; return 1; }

  # --- play worktree
  if [ ! -d "$PLAY_WT/.git" ] && [ ! -f "$PLAY_WT/.git" ]; then
    if git -C "$REPO" show-ref --verify --quiet "refs/heads/$PLAY_BRANCH"; then
      git -C "$REPO" worktree add "$PLAY_WT" "$PLAY_BRANCH" >>"$LOG" 2>&1 || return 1
    elif git -C "$REPO" ls-remote --exit-code --heads origin "$PLAY_BRANCH" >/dev/null 2>&1; then
      git -C "$REPO" fetch origin "$PLAY_BRANCH" >>"$LOG" 2>&1
      git -C "$REPO" worktree add -b "$PLAY_BRANCH" "$PLAY_WT" "origin/$PLAY_BRANCH" >>"$LOG" 2>&1 || return 1
    else
      # start the play branch from the previous playable-build branch so its history stays linear
      git -C "$REPO" fetch origin cursor/spaceship-interior-demo-play-ad4e >>"$LOG" 2>&1 || true
      git -C "$REPO" worktree add -b "$PLAY_BRANCH" "$PLAY_WT" origin/cursor/spaceship-interior-demo-play-ad4e >>"$LOG" 2>&1 || return 1
    fi
  fi
  ( cd "$PLAY_WT" && git pull --ff-only origin "$PLAY_BRANCH" >>"$LOG" 2>&1 || true )
  # replace contents (keep .git)
  find "$PLAY_WT" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
  cp -r "$SRC_WT/dist/." "$PLAY_WT/"
  cat > "$PLAY_WT/README.md" <<EOF
# ISD Redoubt — playable build

Auto-published production bundle of branch \`$SRC_BRANCH\` (source commit \`$sha\`, built $(date -u +%Y-%m-%dT%H:%M:%SZ)).

Live: https://raw.githack.com/ilikevibecoding/edwin4dawin/$PLAY_BRANCH/index.html

Serve this folder over HTTP (e.g. \`npx serve .\`) or open the link above. ES modules do not run from file://.
EOF
  echo "source=$sha built=$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$PLAY_WT/BUILD.txt"
  ( cd "$PLAY_WT" && git add -A && { git diff --cached --quiet && log "no changes for $sha" || { git commit -q -m "Playable build (source $sha)" && git push -u origin "$PLAY_BRANCH" >>"$LOG" 2>&1 && log "published $sha -> $PLAY_BRANCH"; }; } )
}

if [ -n "${PUBLISH_LOOP:-}" ]; then
  while true; do
    publish_once || log "publish cycle failed"
    sleep "$PUBLISH_LOOP"
  done
else
  publish_once
fi
