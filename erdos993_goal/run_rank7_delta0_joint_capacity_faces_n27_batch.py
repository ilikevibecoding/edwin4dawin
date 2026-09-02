#!/usr/bin/env python3
"""Exact no-gap batch for all n=27, 18<=m<=25 Delta0 upper-b faces."""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path


ROOT = Path(__file__).resolve().parent
GENERIC = ROOT / "prove_rank7_delta0_joint_capacity_faces_finite.py"
HARD = ROOT / "prove_rank7_delta0_n27_hard_face_with_forest_exclusion.py"
OUTPUT = ROOT / "rank7_delta0_joint_capacity_faces_n27_exact_20260820.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def run_one(job):
    m, face, q = job
    if (m, face, q) == (25, "containment", 0):
        command = [sys.executable, str(HARD), "--depth", "54"]
    else:
        command = [sys.executable, str(GENERIC), "--n", "27", "--m", str(m), "--face", face, "--q", str(q), "--depth", "48"]
    completed = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
    marker = (
        "PASS_EXACT_RANK7_DELTA0_N27_M25_CONTAINMENT_QLOW_WITH_FOREST_EXCLUSION"
        if (m, face, q) == (25, "containment", 0)
        else "'status': 'PASS'"
    )
    return {
        "n": 27,
        "m": m,
        "face": face,
        "q": q,
        "hard_face_repair": (m, face, q) == (25, "containment", 0),
        "returncode": completed.returncode,
        "stdout": completed.stdout.strip(),
        "stderr": completed.stderr.strip(),
        "pass": completed.returncode == 0 and marker in completed.stdout,
    }


def write_report(results, status):
    rows = sorted(results, key=lambda row: (row["m"], row["face"], row["q"]))
    payload = {
        "schema": "rank7-delta0-joint-capacity-n27-batch-v1",
        "status": status,
        "scope": {"n": 27, "m": [18, 25], "faces": ["containment", "extension"], "q": [0, 1]},
        "expected_jobs": 32,
        "completed_jobs": len(rows),
        "passing_jobs": sum(row["pass"] for row in rows),
        "artifacts": {"generic_prover_sha256": sha256(GENERIC), "hard_face_prover_sha256": sha256(HARD)},
        "results": rows,
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    temporary.replace(OUTPUT)


def main() -> int:
    jobs = [(m, face, q) for m in range(18, 26) for face in ("containment", "extension") for q in (0, 1)]
    results = []
    write_report(results, "RUNNING")
    with ProcessPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(run_one, job) for job in jobs]
        for future in as_completed(futures):
            row = future.result()
            results.append(row)
            if not row["pass"]:
                write_report(results, "STOPPED_ON_NONPASS")
                print("NONPASS", row, flush=True)
                return 2
    write_report(results, "PASS_EXACT_RANK7_DELTA0_JOINT_CAPACITY_FACES_N27")
    print("PASS_EXACT_RANK7_DELTA0_JOINT_CAPACITY_FACES_N27 32")
    print("report", OUTPUT.name, sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
