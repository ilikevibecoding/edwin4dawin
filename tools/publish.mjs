// Build the production bundle and push it to the play branch that backs the live demo link.
// Usage: node tools/publish.mjs [--branch cursor/star-destroyer-play-c80b] [--message "..."]
// The play branch holds only index.html + assets/ (+ a README with the links); it is force-free:
// every publish is a new commit on top of the previous build.
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, cpSync, writeFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const branch = opt("--branch", "cursor/star-destroyer-play-c80b");
const message = opt("--message", "Playable build");
const repo = process.cwd();
const wt = resolve("/tmp/play-worktree");
const sh = (cmd, cwd = repo) => execSync(cmd, { cwd, stdio: "pipe" }).toString().trim();

const remote = sh("git remote get-url origin");
const m = /github\.com[:/]([^/]+)\/([^/.]+)/.exec(remote);
const [owner, name] = m ? [m[1], m[2]] : ["owner", "repo"];
const source = sh("git rev-parse --short HEAD");

console.log("building…");
sh("npm run build");

// prepare the worktree on the play branch (create it as an orphan if it does not exist)
if (existsSync(wt)) {
  try {
    sh(`git worktree remove --force ${wt}`);
  } catch (e) {
    rmSync(wt, { recursive: true, force: true });
    try {
      sh("git worktree prune");
    } catch (e2) {
      /* ignore */
    }
  }
}
let exists = true;
try {
  sh(`git fetch origin ${branch}`);
  sh(`git rev-parse --verify origin/${branch}`);
} catch (e) {
  exists = false;
}
if (exists) {
  try {
    sh(`git branch -f ${branch} origin/${branch}`);
  } catch (e) {
    /* branch may be checked out elsewhere */
  }
  sh(`git worktree add ${wt} ${branch}`);
} else {
  sh(`git worktree add --detach ${wt}`);
  sh(`git checkout --orphan ${branch}`, wt);
  sh("git rm -rf --quiet . || true", wt);
}
// replace contents with the build
for (const f of readdirSync(wt)) {
  if (f === ".git") continue;
  rmSync(resolve(wt, f), { recursive: true, force: true });
}
cpSync(resolve(repo, "dist"), wt, { recursive: true });
const sha = sh(`git rev-parse HEAD`);
const readme = `# ISD Vigilance — playable build

Built from source commit \`${source}\` on ${new Date().toISOString()}.

- Live (always the latest build on this branch): https://raw.githack.com/${owner}/${name}/${branch}/index.html
- Source branch: cursor/star-destroyer-ship-c80b

Serve this folder over HTTP (\`npx serve .\`) or open the link above. Opening index.html from disk
does not work because browsers block ES module scripts on file://.
`;
writeFileSync(resolve(wt, "README.md"), readme);
sh("git add -A", wt);
try {
  sh(`git -c user.name="$(git config user.name)" -c user.email="$(git config user.email)" commit -q -m "${message} (source ${source})"`, wt);
} catch (e) {
  console.log("nothing to commit");
}
sh(`git push -u origin ${branch}`, wt);
const newSha = sh("git rev-parse HEAD", wt);
console.log(`published ${branch} @ ${newSha.slice(0, 8)} (was ${sha.slice(0, 8)})`);
console.log(`live:      https://raw.githack.com/${owner}/${name}/${branch}/index.html`);
console.log(`permanent: https://rawcdn.githack.com/${owner}/${name}/${newSha}/index.html`);
sh(`git worktree remove --force ${wt}`);
