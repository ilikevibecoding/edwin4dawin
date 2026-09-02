#!/usr/bin/env python3
"""Checkpointed batch for the ratio/lifted Delta0 lower-b faces.

The separate H-extension-active face is intentionally outside this report.
"""

from __future__ import annotations

import argparse
import ast
import hashlib
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROVER = ROOT / "prove_rank7_delta0_joint_lower_b_weighted_pair_faces_finite.py"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def jobs(depth: int):
    return [
        (n, m, regime, face, q, depth)
        for n in range(27, 39)
        for m in range(18, n - 1)
        for regime in (0, 1, 2)
        for face in ("ratio", "lifted")
        for q in (0, 1)
    ]


def key(row):
    return (row["n"], row["m"], row["regime"], row["face"], row["q"])


def write_report(path: Path, expected, results, status: str) -> None:
    rows = sorted(results.values(), key=key)
    payload = {
        "schema": "rank7-delta0-lower-b-weighted-pair-ratio-lifted-batch-v2",
        "status": status,
        "scope": {
            "n": [27, 38],
            "m": "18..n-2",
            "regimes": [0, 1, 2],
            "faces": ["ratio", "lifted"],
            "q": [0, 1],
        },
        "prover_sha256": sha256(PROVER),
        "scope_warning": "This report covers ratio and weighted-lift active faces only; the H-extension-active third face is separate.",
        "expected_jobs": len(expected),
        "completed_jobs": len(rows),
        "passing_jobs": sum(row["pass"] for row in rows),
        "results": rows,
    }
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    temporary.replace(path)


def parse_status(stdout: str):
    marker = stdout.rfind("{")
    if marker < 0:
        return None
    try:
        value = ast.literal_eval(stdout[marker:])
    except (SyntaxError, ValueError):
        return None
    return value if isinstance(value, dict) else None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--depth", type=int, default=80)
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "rank7_delta0_joint_lower_b_weighted_pair_n27_n38_exact_20260820.json",
    )
    args = parser.parse_args()
    output = args.output if args.output.is_absolute() else ROOT / args.output
    expected = jobs(args.depth)
    expected_keys = {(n, m, regime, face, q) for n, m, regime, face, q, _ in expected}
    results = {}
    if output.exists():
        old = json.loads(output.read_text(encoding="utf-8"))
        if old.get("prover_sha256") == sha256(PROVER) and old.get("expected_jobs") == len(expected):
            for row in old.get("results", []):
                if key(row) in expected_keys and row.get("pass"):
                    results[key(row)] = row
    write_report(output, expected, results, "RUNNING")
    pending = [job for job in expected if job[:5] not in results]
    print("resume", len(results), "/", len(expected), "pending", len(pending), flush=True)
    for index, (n, m, regime, face, q, depth) in enumerate(pending, 1):
        command = [
            sys.executable,
            str(PROVER),
            "--n", str(n),
            "--m", str(m),
            "--regime", str(regime),
            "--face", face,
            "--q", str(q),
            "--depth", str(depth),
        ]
        completed = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
        parsed = parse_status(completed.stdout.strip())
        row = {
            "n": n,
            "m": m,
            "regime": regime,
            "face": face,
            "q": q,
            "returncode": completed.returncode,
            "stdout": completed.stdout.strip(),
            "stderr": completed.stderr.strip(),
            "parsed": parsed,
            "pass": completed.returncode == 0 and not completed.stderr.strip() and parsed is not None and parsed.get("status") == "PASS",
        }
        results[key(row)] = row
        if not row["pass"]:
            write_report(output, expected, results, "STOPPED_ON_NONPASS")
            print("NONPASS", row, flush=True)
            return 2
        write_report(output, expected, results, "RUNNING")
        total = len(results)
        if total % 20 == 0 or total == len(expected):
            print("checkpoint", total, "/", len(expected), flush=True)
    write_report(output, expected, results, "PASS_EXACT_RANK7_DELTA0_LOWER_B_RATIO_LIFTED_FACES_N27_N38")
    print("PASS_EXACT_RANK7_DELTA0_LOWER_B_RATIO_LIFTED_FACES_N27_N38", len(expected), flush=True)
    print("report", output.name, sha256(output), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
