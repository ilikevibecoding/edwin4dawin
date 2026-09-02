#!/usr/bin/env python3
"""Replay and hash the exact n>=39 Delta^4 terminal-broom theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / "rank7_terminal_broom_delta4_capacity_exact_20260816.json"
CAPACITY_LOG = ROOT / "rank7_terminal_broom_delta4_capacity_edge.log"
OUTPUT = ROOT / "rank7_terminal_broom_delta4_large_replay_20260816.json"


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
    d5_output = run(
        "verify_rank7_terminal_broom_d5_concavity.py",
        "RANK7_MIDDLE_D5_CONCAVITY_PASS",
    )

    records = []
    keys = set()
    for v in (0, 1):
        for z in (0, 1):
            for s in (0, 1):
                for d in (0, 1):
                    bits = (v, z, s, d)
                    suffix = "".join(map(str, bits))
                    log = ROOT / f"rank7_middle_d4_bernstein_r4_{suffix}.log"
                    text = log.read_text(encoding="utf-8")
                    keys.add(bits)
                    if bits == (0, 0, 1, 0):
                        assert "AssertionError: (4, (2, 0, 0, 1, 0)" in text
                        assert "(np.int64(16), np.int64(18), np.int64(0), np.int64(0))" in text
                        status = "exact-rectangular-enclosure-no-go-not-tree-counterexample"
                    else:
                        assert "PASS_ENDPOINT" in text
                        status = "pass"
                    records.append(
                        {
                            "bits_vzsd": list(bits),
                            "status": status,
                            "log": log.name,
                            "sha256": sha256(log),
                        }
                    )
    assert keys == {
        (v, z, s, d)
        for v in (0, 1)
        for z in (0, 1)
        for s in (0, 1)
        for d in (0, 1)
    }

    capacity_output = run(
        "prove_rank7_terminal_broom_delta4_capacity_edge.py",
        "RANK7_TERMINAL_BROOM_DELTA4_CAPACITY_EDGE_PASS",
    )
    CAPACITY_LOG.write_text(capacity_output, encoding="utf-8")
    assert "numerator (44, 20, 9, 8, 2) 255150 0" in capacity_output
    manifest = {
        "schema": "rank7-terminal-broom-delta4-capacity-v1",
        "raw_branch_count": 16,
        "raw_pass_count": 15,
        "raw_enclosure_no_go_count": 1,
        "raw_branches": records,
        "capacity_edge": {
            "status": "pass",
            "log": CAPACITY_LOG.name,
            "sha256": sha256(CAPACITY_LOG),
            "tensor_degrees": [44, 20, 9, 8, 2],
            "tensor_entries": 255150,
            "minimum": "0",
        },
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    artifacts = [
        "RANK7_TERMINAL_BROOM_DELTA4_LARGE_ORDER_THEOREM_2026-08-16.md",
        "replay_rank7_terminal_broom_delta4_large.py",
        "prove_rank7_terminal_broom_delta4_capacity_edge.py",
        "verify_rank7_root_half_retention_large.py",
        "verify_rank7_terminal_broom_root_z_concavity.py",
        "verify_rank7_terminal_broom_d5_concavity.py",
        "probe_rank7_terminal_broom_middle_endpoints.py",
        MANIFEST.name,
        CAPACITY_LOG.name,
    ] + [record["log"] for record in records]
    payload = {
        "schema": "rank7-terminal-broom-delta4-replay-v1",
        "theorem": "Delta^4 R_1 >= 0 for every rooted tree core of order n>=39",
        "raw_pass_count": 15,
        "raw_enclosure_no_go_count": 1,
        "capacity_edge_status": "pass",
        "half_retention_marker": half_output.strip().splitlines()[-1],
        "root_concavity_marker": root_output.strip().splitlines()[-1],
        "d5_concavity_marker": d5_output.strip().splitlines()[-1],
        "capacity_marker": capacity_output.strip().splitlines()[-1],
        "artifacts_sha256": {name: sha256(ROOT / name) for name in artifacts},
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print("RANK7_TERMINAL_BROOM_DELTA4_LARGE_REPLAY_PASS")
    print(OUTPUT.name, sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
