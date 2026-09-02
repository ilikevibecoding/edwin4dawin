#!/usr/bin/env python3
"""One-worker checkpointed Delta0 weighted-pair/H-extension batch, 5<=m<=17."""

from __future__ import annotations

import argparse
import ast
import hashlib
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROVER = ROOT / "prove_rank7_delta0_joint_lower_b_weighted_pair_small_m_finite.py"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def jobs(depth: int):
    return [
        (n, m, regime, face, q, depth)
        for n in range(27, 39)
        for m in range(5, 18)
        for regime in ((0, 1) if m <= 8 else (0, 1, 2))
        for face in ("zero", "lifted")
        for q in (0, 1)
    ]


def key(row):
    return (row["n"], row["m"], row["regime"], row["face"], row["q"])


def write_report(path: Path, expected, results, status: str) -> None:
    rows = sorted(results.values(), key=key)
    payload = {
        "schema": "rank7-delta0-lower-b-weighted-pair-h-extension-small-m-batch-v1",
        "status": status,
        "interpretation_of_nonpass": "enclosure obstruction only; not a tree counterexample",
        "scope": {
            "n": [27, 38],
            "m": [5, 17],
            "special_sign_correct_m": [5, 8],
            "special_regimes": [0, 1],
            "continuous_three_regime_m": [9, 17],
            "continuous_regimes": [0, 1, 2],
            "faces": ["zero", "lifted"],
            "q": [0, 1],
            "workers": 1,
            "checkpoint_every_cell": True,
        },
        "prover_sha256": sha256(PROVER),
        "runner_sha256": sha256(Path(__file__).resolve()),
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
        default=ROOT / "rank7_delta0_joint_lower_b_weighted_pair_small_m_n27_n38_exact_20260820.json",
    )
    args = parser.parse_args()
    output = args.output if args.output.is_absolute() else ROOT / args.output
    expected = jobs(args.depth)
    expected_keys = {(n, m, regime, face, q) for n, m, regime, face, q, _ in expected}
    results = {}
    if output.exists():
        old = json.loads(output.read_text(encoding="utf-8"))
        if (
            old.get("prover_sha256") == sha256(PROVER)
            and old.get("runner_sha256") == sha256(Path(__file__).resolve())
            and old.get("expected_jobs") == len(expected)
        ):
            for row in old.get("results", []):
                if key(row) in expected_keys and row.get("pass"):
                    results[key(row)] = row

    write_report(output, expected, results, "RUNNING")
    pending = [job for job in expected if job[:5] not in results]
    print("resume", len(results), "/", len(expected), "pending", len(pending), flush=True)
    for n, m, regime, face, q, depth in pending:
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
            "pass": (
                completed.returncode == 0
                and not completed.stderr.strip()
                and parsed is not None
                and parsed.get("status") == "PASS"
            ),
        }
        results[key(row)] = row
        if not row["pass"]:
            write_report(output, expected, results, "STOPPED_ON_ENCLOSURE_OBSTRUCTION")
            print("ENCLOSURE_OBSTRUCTION", row, flush=True)
            return 2
        write_report(output, expected, results, "RUNNING")
        print("checkpoint", len(results), "/", len(expected), key(row), flush=True)

    write_report(
        output,
        expected,
        results,
        "PASS_EXACT_RANK7_DELTA0_LOWER_B_WEIGHTED_PAIR_H_EXTENSION_SMALL_M_N27_N38",
    )
    print(
        "PASS_EXACT_RANK7_DELTA0_LOWER_B_WEIGHTED_PAIR_H_EXTENSION_SMALL_M_N27_N38",
        len(expected),
        flush=True,
    )
    print("report", output.name, sha256(output), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
