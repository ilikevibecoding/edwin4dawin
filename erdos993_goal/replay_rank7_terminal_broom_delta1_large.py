#!/usr/bin/env python3
"""Replay and hash the exact n>=39 Delta^1 terminal-broom theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / "rank7_terminal_broom_delta12_large_ranks_1_exact_20260816.json"
OUTPUT = ROOT / "rank7_terminal_broom_delta1_large_replay_20260816.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(script: str, marker: str, *arguments: str) -> str:
    result = subprocess.run(
        [sys.executable, "-u", str(ROOT / script), *arguments],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    if result.returncode != 0 or marker not in result.stdout:
        raise RuntimeError(f"{script} failed:\n{result.stdout}")
    print(marker)
    return result.stdout


def main() -> int:
    half_output = run(
        "verify_rank7_root_half_retention_large.py",
        "RANK7_ROOT_HALF_RETENTION_N39_PASS",
    )
    root_output = run(
        "verify_rank7_terminal_broom_root_z_concavity.py",
        "RANK7_LOW_MIDDLE_ROOT_Z_CONCAVITY_PASS",
    )
    batch_output = run(
        "run_rank7_delta12_large_batch.py",
        "DELTA12_LARGE_BATCH_PASS",
        "--ranks",
        "1",
        "--workers",
        "1",
    )
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assert manifest["schema"] == "rank7-terminal-broom-delta12-v1"
    assert len(manifest["branches"]) == 8
    keys = set()
    for branch in manifest["branches"]:
        assert branch["rank"] == 1
        key = (branch["case"], branch["q_endpoint"], branch["d_endpoint"])
        keys.add(key)
        log = ROOT / branch["log"]
        text = log.read_text(encoding="utf-8")
        assert "capacity_c5_lower C(n-4,5)" in text
        assert "PASS_DELTA1_BRANCH" in text
        assert sha256(log) == branch["sha256"]
    assert keys == {
        (case, q, d)
        for case in ("small", "large")
        for q in (0, 1)
        for d in (0, 1)
    }
    artifacts = [
        "RANK7_TERMINAL_BROOM_DELTA1_LARGE_ORDER_THEOREM_2026-08-16.md",
        "replay_rank7_terminal_broom_delta1_large.py",
        "prove_rank7_terminal_broom_delta0_large.py",
        "run_rank7_delta12_large_batch.py",
        "verify_rank7_root_half_retention_large.py",
        "verify_rank7_terminal_broom_root_z_concavity.py",
        MANIFEST.name,
        "RANK7_ROOTED_CROSS_LARGE_ORDER_THEOREM_2026-08-16.md",
        "FOREST_V6_ALPHA10_THEOREM_2026-08-13.md",
        "TREE_RANK45_PATH_RATIO_THEOREM_2026-07-28.md",
    ] + [branch["log"] for branch in manifest["branches"]]
    payload = {
        "schema": "rank7-terminal-broom-delta1-replay-v1",
        "theorem": "Delta^1 R_1 >= 0 for every rooted tree core of order n>=39",
        "branch_count": 8,
        "half_retention_marker": half_output.strip().splitlines()[-1],
        "root_concavity_marker": root_output.strip().splitlines()[-1],
        "batch_marker": batch_output.strip().splitlines()[-1],
        "artifacts_sha256": {name: sha256(ROOT / name) for name in artifacts},
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print("RANK7_TERMINAL_BROOM_DELTA1_LARGE_REPLAY_PASS")
    print(OUTPUT.name, sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
