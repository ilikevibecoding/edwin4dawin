#!/usr/bin/env python3
"""Checkpointed exact batch for order 27--38 Delta0 faces with 0<=|J|<=4."""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROVER = ROOT / "prove_rank7_delta0_very_small_j_finite.py"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def write_report(path: Path, jobs, rows, status: str) -> None:
    payload = {
        "schema": "rank7-delta0-very-small-j-batch-v1",
        "status": status,
        "scope": {"n": [27, 38], "m": [0, 4], "q": [0, 1]},
        "prover_sha256": sha256(PROVER),
        "expected_jobs": len(jobs),
        "completed_jobs": len(rows),
        "passing_jobs": sum(row["pass"] for row in rows),
        "results": rows,
    }
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    temporary.replace(path)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--depth", type=int, default=36)
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "rank7_delta0_very_small_j_n27_n38_exact_20260820.json",
    )
    args = parser.parse_args()
    output = args.output if args.output.is_absolute() else ROOT / args.output
    jobs = [(n, m, q) for n in range(27, 39) for m in range(0, 5) for q in (0, 1)]
    rows = []
    write_report(output, jobs, rows, "RUNNING")
    for index, (n, m, q) in enumerate(jobs, 1):
        command = [
            sys.executable,
            str(PROVER),
            "--n", str(n),
            "--m", str(m),
            "--q", str(q),
            "--depth", str(args.depth),
        ]
        completed = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
        row = {
            "n": n,
            "m": m,
            "q": q,
            "returncode": completed.returncode,
            "stdout": completed.stdout.strip(),
            "stderr": completed.stderr.strip(),
            "pass": completed.returncode == 0 and "'status': 'PASS'" in completed.stdout,
        }
        rows.append(row)
        if not row["pass"]:
            write_report(output, jobs, rows, "STOPPED_ON_NONPASS")
            print("NONPASS", row, flush=True)
            return 2
        write_report(output, jobs, rows, "RUNNING")
        if index % 10 == 0 or index == len(jobs):
            print("checkpoint", index, "/", len(jobs), flush=True)
    write_report(output, jobs, rows, "PASS_EXACT_RANK7_DELTA0_VERY_SMALL_J_N27_N38")
    print("PASS_EXACT_RANK7_DELTA0_VERY_SMALL_J_N27_N38", len(jobs), flush=True)
    print("report", output.name, sha256(output), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
