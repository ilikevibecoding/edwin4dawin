import { execSync } from 'node:child_process';

/**
 * Revision stamp baked into the bundle, so a build can be told apart from an
 * older one by looking at it rather than by trusting a URL. The live preview
 * follows a branch tip; without this there is no way to know from inside the
 * page which commit is actually on screen.
 */
export function buildId() {
  const run = (cmd, fallback) => {
    try {
      return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || fallback;
    } catch {
      return fallback;
    }
  };
  const rev = run('git rev-parse --short=7 HEAD', 'dev');
  const dirty = run('git status --porcelain', '') !== '';
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ') + 'Z';
  return { rev: dirty ? `${rev}+` : rev, stamp };
}

export function buildDefine() {
  const b = buildId();
  return { __BUILD_REV__: JSON.stringify(b.rev), __BUILD_STAMP__: JSON.stringify(b.stamp) };
}
