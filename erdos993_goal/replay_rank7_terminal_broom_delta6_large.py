#!/usr/bin/env python3
"""Replay and hash the exact n>=39 Delta^6 terminal-broom theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / "rank7_middle_d4_bernstein_ranks_6.json"
OUTPUT = ROOT / "rank7_terminal_broom_delta6_large_replay_20260816.json"


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
    run("verify_rank7_root_half_retention_large.py", "RANK7_ROOT_HALF_RETENTION_N39_PASS")
    run(
        "verify_rank7_terminal_broom_root_z_concavity.py",
        "RANK7_LOW_MIDDLE_ROOT_Z_CONCAVITY_PASS",
    )
    run(
        "verify_rank7_terminal_broom_d5_concavity.py",
        "RANK7_MIDDLE_D5_CONCAVITY_PASS",
    )
    batch_output = run(
        "run_rank7_middle_d4_bernstein_batch.py",
        "BATCH_PASS",
        "--ranks",
        "6",
        "--workers",
        "1",
    )
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assert manifest["schema"] == "rank7-middle-d4-bernstein-v1"
    assert len(manifest["branches"]) == 16
    keys = set()
    for branch in manifest["branches"]:
        assert branch["rank"] == 6
        bits = tuple(branch["bits_vzsd"])
        keys.add(bits)
        log = ROOT / branch["log"]
        text = log.read_text(encoding="utf-8")
        assert "PASS_ENDPOINT" in text
        assert sha256(log) == branch["sha256"]
    assert keys == {
        (v, z, s, d)
        for v in (0, 1)
        for z in (0, 1)
        for s in (0, 1)
        for d in (0, 1)
    }
    artifacts = [
        "RANK7_TERMINAL_BROOM_DELTA6_LARGE_ORDER_THEOREM_2026-08-16.md",
        "replay_rank7_terminal_broom_delta6_large.py",
        "verify_rank7_root_half_retention_large.py",
        "verify_rank7_terminal_broom_root_z_concavity.py",
        "verify_rank7_terminal_broom_d5_concavity.py",
        "probe_rank7_terminal_broom_middle_endpoints.py",
        "run_rank7_middle_d4_bernstein_batch.py",
        MANIFEST.name,
    ] + [branch["log"] for branch in manifest["branches"]]
    payload = {
        "schema": "rank7-terminal-broom-delta6-replay-v1",
        "theorem": "Delta^6 R_1 >= 0 for every rooted tree core of order n>=39",
        "branch_count": 16,
        "batch_marker": batch_output.strip().splitlines()[-1],
        "artifacts_sha256": {name: sha256(ROOT / name) for name in artifacts},
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print("RANK7_TERMINAL_BROOM_DELTA6_LARGE_REPLAY_PASS")
    print(OUTPUT.name, sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
