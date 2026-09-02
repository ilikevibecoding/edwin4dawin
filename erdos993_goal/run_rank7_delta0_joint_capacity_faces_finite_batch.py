#!/usr/bin/env python3
"""Checkpointed exact batch for rank-7 Delta0 joint-capacity faces."""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROVER = ROOT / "prove_rank7_delta0_joint_capacity_faces_finite.py"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def run_one(job):
    n, m, face, q, depth = job
    command = [
        sys.executable,
        str(PROVER),
        "--n",
        str(n),
        "--m",
        str(m),
        "--face",
        face,
        "--q",
        str(q),
        "--depth",
        str(depth),
    ]
    completed = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
    return {
        "n": n,
        "m": m,
        "face": face,
        "q": q,
        "returncode": completed.returncode,
        "stdout": completed.stdout.strip(),
        "stderr": completed.stderr.strip(),
        "pass": completed.returncode == 0 and "'status': 'PASS'" in completed.stdout,
    }


def write_report(path: Path, jobs, results, status: str):
    ordered = sorted(results.values(), key=lambda row: (row["n"], row["m"], row["face"], row["q"]))
    report = {
        "schema": "rank7-delta0-joint-capacity-finite-batch-v1",
        "status": status,
        "scope": {"n": [28, 38], "m_rule": "18<=m<=n-2", "faces": ["containment", "extension"], "q": [0, 1]},
        "prover_sha256": sha256(PROVER),
        "expected_jobs": len(jobs),
        "completed_jobs": len(ordered),
        "passing_jobs": sum(row["pass"] for row in ordered),
        "results": ordered,
    }
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    temporary.replace(path)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=3)
    parser.add_argument("--depth", type=int, default=42)
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "rank7_delta0_joint_capacity_faces_n28_n38_exact_20260820.json",
    )
    args = parser.parse_args()
    output = args.output if args.output.is_absolute() else ROOT / args.output
    jobs = [
        (n, m, face, q, args.depth)
        for n in range(28, 39)
        for m in range(18, n - 1)
        for face in ("containment", "extension")
        for q in (0, 1)
    ]
    results = {}
    write_report(output, jobs, results, "RUNNING")
    with ProcessPoolExecutor(max_workers=args.workers) as executor:
        futures = {executor.submit(run_one, job): job for job in jobs}
        for index, future in enumerate(as_completed(futures), 1):
            row = future.result()
            key = (row["n"], row["m"], row["face"], row["q"])
            results[key] = row
            if not row["pass"]:
                write_report(output, jobs, results, "STOPPED_ON_NONPASS")
                print("NONPASS", row, flush=True)
                for pending in futures:
                    pending.cancel()
                return 2
            if index % 20 == 0 or index == len(jobs):
                write_report(output, jobs, results, "RUNNING")
                print("checkpoint", index, "/", len(jobs), flush=True)
    write_report(output, jobs, results, "PASS_EXACT_RANK7_DELTA0_JOINT_CAPACITY_FACES_N28_N38")
    print("PASS_EXACT_RANK7_DELTA0_JOINT_CAPACITY_FACES_N28_N38", len(jobs), flush=True)
    print("report", output.name, sha256(output), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
