#!/usr/bin/env python3
"""Read-only final audit for the corrected small-m three-face Delta0 batch."""

from __future__ import annotations

import ast
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROVER = ROOT / "prove_rank7_delta0_joint_lower_b_weighted_pair_small_m_hface_finite.py"
RUNNER = ROOT / "run_rank7_delta0_joint_lower_b_weighted_pair_small_m_hface_batch.py"
INPUT = ROOT / "rank7_delta0_joint_lower_b_weighted_pair_small_m_hface_n27_n38_exact_20260820.json"
OUTPUT = ROOT / "rank7_delta0_small_m_three_face_batch_independent_audit_exact_20260820.json"

PROVER_HASH = "9367209095EDBFF981D81C504C0CEFBC88B8613CBD7F5C43DB596F35C8CA5D66"
RUNNER_HASH = "5A54F1674DF8E45BAC0579F4C5DD8C042F0FFEC98E21BB477CE6A7E9AA09BED7"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    assert sha256(PROVER) == PROVER_HASH
    assert sha256(RUNNER) == RUNNER_HASH
    report_hash = sha256(INPUT)
    report = json.loads(INPUT.read_text(encoding="utf-8"))
    assert report["schema"] == "rank7-delta0-weighted-pair-h-extension-small-m-three-face-batch-v1"
    assert report["status"] == "PASS_EXACT_RANK7_DELTA0_WEIGHTED_PAIR_H_EXTENSION_SMALL_M_THREE_FACE_N27_N38"
    assert report["prover_sha256"] == PROVER_HASH
    assert report["runner_sha256"] == RUNNER_HASH

    expected = {
        (n, m, regime, face, q)
        for n in range(27, 39)
        for m in range(5, 18)
        for regime in ((0, 1) if m <= 8 else (0, 1, 2))
        for face in ("zero", "lifted", "h_extension")
        for q in (0, 1)
    }
    assert len(expected) == 2520
    assert report["expected_jobs"] == report["completed_jobs"] == report["passing_jobs"] == 2520
    assert len(report["results"]) == 2520

    observed = []
    nodes = passed = discarded = 0
    for row in report["results"]:
        key = (row["n"], row["m"], row["regime"], row["face"], row["q"])
        observed.append(key)
        assert row["pass"] is True and row["returncode"] == 0 and row["stderr"] == ""
        parts = row["stdout"].split(maxsplit=5)
        assert len(parts) == 6
        prefix = (int(parts[0]), int(parts[1]), int(parts[2]), parts[3], int(parts[4]))
        assert prefix == key
        parsed = ast.literal_eval(parts[5])
        assert parsed == row["parsed"]
        assert parsed["status"] == "PASS" and parsed["worst"] == "None"
        assert parsed["nodes"] == 2 * (parsed["passed"] + parsed["discarded"]) - 1
        nodes += parsed["nodes"]
        passed += parsed["passed"]
        discarded += parsed["discarded"]
    assert len(observed) == len(set(observed)) == 2520
    assert set(observed) == expected
    assert observed == sorted(expected)

    base = {
        (n, m, regime, q)
        for n in range(27, 39)
        for m in range(5, 18)
        for regime in ((0, 1) if m <= 8 else (0, 1, 2))
        for q in (0, 1)
    }
    assert len(base) == 840
    for face in ("zero", "lifted", "h_extension"):
        face_base = {(n, m, regime, q) for n, m, regime, row_face, q in observed if row_face == face}
        assert face_base == base

    audit = {
        "schema": "rank7-delta0-small-m-three-face-batch-independent-audit-v1",
        "status": "PASS_EXACT_RANK7_DELTA0_SMALL_M_THREE_FACE_BATCH_2520_OF_2520",
        "source_hashes": {"prover": PROVER_HASH, "runner": RUNNER_HASH},
        "input_report_sha256": report_hash,
        "key_audit": {
            "jobs": 2520,
            "base_regime_q_cells": 840,
            "faces_per_base": ["zero", "lifted", "h_extension"],
            "duplicates": 0,
            "omissions": 0,
            "ordered_keyset_exact": True,
        },
        "regime_union": {
            "m_5_through_8": ["E<=1", "E>=1"],
            "m_9_through_17": ["E<=1", "1<=E<=m/2", "E>=m/2"],
            "no_gap": True,
        },
        "lower_face_union": "max(0,lifted,H-extension)",
        "tree_accounting": {
            "nodes": nodes,
            "passed_leaves": passed,
            "discarded_leaves": discarded,
        },
        "scope_guard": "A PASS audits the exact outer certificate, not literal tree enumeration; any nonpass would be an enclosure obstruction, not a tree counterexample.",
    }
    OUTPUT.write_text(json.dumps(audit, indent=2) + "\n", encoding="utf-8")
    print(audit["status"])
    print("report", OUTPUT.name, sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
