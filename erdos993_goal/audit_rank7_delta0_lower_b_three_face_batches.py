#!/usr/bin/env python3
"""Read-only structural audit of the completed three-face lower-b batches."""

from __future__ import annotations

import ast
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PAIR_PROVER = ROOT / "prove_rank7_delta0_joint_lower_b_weighted_pair_faces_finite.py"
PAIR_BATCH = ROOT / "run_rank7_delta0_joint_lower_b_weighted_pair_batch.py"
PAIR_REPORT = ROOT / "rank7_delta0_joint_lower_b_weighted_pair_n27_n38_exact_20260820.json"
H_PROVER = ROOT / "prove_rank7_delta0_joint_lower_b_h_extension_face_finite.py"
H_BATCH = ROOT / "run_rank7_delta0_joint_lower_b_h_extension_face_batch.py"
H_REPORT = ROOT / "rank7_delta0_joint_lower_b_h_extension_face_n27_n38_exact_20260820.json"
OUTPUT = ROOT / "rank7_delta0_lower_b_three_face_batches_independent_audit_exact_20260820.json"

EXPECTED = {
    "pair_prover": "E0017425A2DAC860C735210CDD4AFDC212D919C8FCBFB7F0E5834305B4C8BF6D",
    "pair_batch": "26719CCBC47394206CDAA244EE6011FC487D0BA504CAFE2960964F6C1B25CB9D",
    "h_prover": "3888A69298EA2F2FD487443D15559388F883505A28CC6AB191835ED1E4034B62",
    "h_batch": "D4DA8A09E2E2F42574BD1BFD8170106AA500A2E790762D036BBB1F7ADA11D22C",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def parse_result(stdout: str, prefix_length: int) -> tuple[tuple, dict]:
    parts = stdout.split(maxsplit=prefix_length)
    assert len(parts) == prefix_length + 1
    prefix = tuple(parts[:prefix_length])
    parsed = ast.literal_eval(parts[prefix_length])
    assert isinstance(parsed, dict)
    return prefix, parsed


def aggregate(rows: list[dict]) -> dict:
    nodes = passed = discarded = 0
    max_nodes = -1
    max_keys = []
    for key, result in rows:
        assert result["status"] == "PASS" and result["worst"] == "None"
        assert result["nodes"] == 2 * (result["passed"] + result["discarded"]) - 1
        nodes += result["nodes"]
        passed += result["passed"]
        discarded += result["discarded"]
        if result["nodes"] > max_nodes:
            max_nodes = result["nodes"]
            max_keys = [key]
        elif result["nodes"] == max_nodes:
            max_keys.append(key)
    return {
        "nodes": nodes,
        "passed_leaves": passed,
        "discarded_leaves": discarded,
        "max_nodes": max_nodes,
        "max_node_keys": [list(key) for key in max_keys],
    }


def audit_pair(report: dict) -> tuple[dict, set[tuple]]:
    expected = [
        (n, m, regime, face, q)
        for n in range(27, 39)
        for m in range(18, n - 1)
        for regime in (0, 1, 2)
        for face in ("ratio", "lifted")
        for q in (0, 1)
    ]
    assert len(expected) == 1944
    assert report["schema"] == "rank7-delta0-lower-b-weighted-pair-ratio-lifted-batch-v2"
    assert report["status"] == "PASS_EXACT_RANK7_DELTA0_LOWER_B_RATIO_LIFTED_FACES_N27_N38"
    assert report["scope"] == {
        "n": [27, 38],
        "m": "18..n-2",
        "regimes": [0, 1, 2],
        "faces": ["ratio", "lifted"],
        "q": [0, 1],
    }
    assert report["prover_sha256"] == EXPECTED["pair_prover"]
    assert report["expected_jobs"] == report["completed_jobs"] == report["passing_jobs"] == 1944
    assert len(report["results"]) == 1944
    observed = []
    parsed_rows = []
    for row in report["results"]:
        key = (row["n"], row["m"], row["regime"], row["face"], row["q"])
        observed.append(key)
        assert row["returncode"] == 0 and row["stderr"] == "" and row["pass"] is True
        prefix, parsed = parse_result(row["stdout"], 5)
        assert (int(prefix[0]), int(prefix[1]), int(prefix[2]), prefix[3], int(prefix[4])) == key
        assert row["parsed"] == parsed
        parsed_rows.append((key, parsed))
    assert observed == sorted(expected) and len(set(observed)) == 1944
    return {
        "jobs": 1944,
        "ordered_keyset_exact": True,
        "duplicates": 0,
        "omissions": 0,
        "all_rows_parse_and_pass": True,
        **aggregate(parsed_rows),
    }, set(observed)


def audit_h(report: dict) -> tuple[dict, set[tuple]]:
    expected = [
        (n, m, regime, q)
        for n in range(27, 39)
        for m in range(18, n - 1)
        for regime in (0, 1, 2)
        for q in (0, 1)
    ]
    assert len(expected) == 972
    assert report["schema"] == "rank7-delta0-lower-b-h-extension-active-face-batch-v1"
    assert report["status"] == "PASS_EXACT_RANK7_DELTA0_LOWER_B_H_EXTENSION_FACE_N27_N38"
    assert report["scope"] == {
        "n": [27, 38],
        "m": "18..n-2",
        "regimes": [0, 1, 2],
        "face": "H-extension",
        "q": [0, 1],
    }
    assert report["prover_sha256"] == EXPECTED["h_prover"]
    assert report["expected_jobs"] == report["completed_jobs"] == report["passing_jobs"] == 972
    assert len(report["results"]) == 972
    observed = []
    parsed_rows = []
    for row in report["results"]:
        key = (row["n"], row["m"], row["regime"], row["q"])
        observed.append(key)
        assert row["returncode"] == 0 and row["stderr"] == "" and row["pass"] is True
        prefix, parsed = parse_result(row["stdout"], 4)
        assert tuple(map(int, prefix)) == key
        assert row["parsed"] == parsed
        parsed_rows.append((key, parsed))
    assert observed == expected and len(set(observed)) == 972
    return {
        "jobs": 972,
        "ordered_keyset_exact": True,
        "duplicates": 0,
        "omissions": 0,
        "all_rows_parse_and_pass": True,
        **aggregate(parsed_rows),
    }, set(observed)


def main() -> int:
    source_hashes = {
        "pair_prover": sha256(PAIR_PROVER),
        "pair_batch": sha256(PAIR_BATCH),
        "h_prover": sha256(H_PROVER),
        "h_batch": sha256(H_BATCH),
    }
    assert source_hashes == EXPECTED
    pair_report_hash = sha256(PAIR_REPORT)
    h_report_hash = sha256(H_REPORT)
    pair_report = json.loads(PAIR_REPORT.read_text(encoding="utf-8"))
    h_report = json.loads(H_REPORT.read_text(encoding="utf-8"))
    pair_audit, pair_keys = audit_pair(pair_report)
    h_audit, h_keys = audit_h(h_report)

    base = {
        (n, m, regime, q)
        for n in range(27, 39)
        for m in range(18, n - 1)
        for regime in (0, 1, 2)
        for q in (0, 1)
    }
    assert len(base) == 972
    ratio_base = {(n, m, regime, q) for n, m, regime, face, q in pair_keys if face == "ratio"}
    lifted_base = {(n, m, regime, q) for n, m, regime, face, q in pair_keys if face == "lifted"}
    assert ratio_base == lifted_base == h_keys == base
    report = {
        "schema": "rank7-delta0-lower-b-three-face-batches-independent-audit-v1",
        "status": "PASS_EXACT_THREE_FACE_REPORT_UNION_2916_OF_2916",
        "source_hashes": source_hashes,
        "report_hashes": {
            "pair_report_sha256": pair_report_hash,
            "h_report_sha256": h_report_hash,
        },
        "pair_report_audit": pair_audit,
        "h_report_audit": h_audit,
        "combined_union": {
            "base_regime_q_cells": 972,
            "faces_per_base_cell": ["ratio", "lifted", "H-extension"],
            "total_face_cells": 2916,
            "exact_three_face_key_union": True,
            "combined_nodes": pair_audit["nodes"] + h_audit["nodes"],
            "combined_passed_leaves": pair_audit["passed_leaves"] + h_audit["passed_leaves"],
            "combined_discarded_leaves": pair_audit["discarded_leaves"] + h_audit["discarded_leaves"],
        },
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(report["status"])
    print("report", OUTPUT.name, sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
