#!/usr/bin/env python3
"""Fail-closed seal for the independent center-leaf CUDA audit."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY_NAME = (
    "rank8_delta03_e5_five_cubic_path_center_leaf_"
    "all_order_exact_agent_20260825.json"
)
RAW_AUDIT_NAME = (
    "rank8_delta03_e5_five_cubic_path_center_leaf_"
    "cuda_full_independent_audit_agent_20260825.json"
)
CHECKPOINT_NAME = (
    "rank8_delta03_e5_five_cubic_path_center_leaf_"
    "cuda_full_audit_checkpoint_agent_20260825.json"
)
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_center_leaf_"
    "all_order_independent_audit_agent_20260825.json"
)
EXPECTED = {
    "audit_rank8_delta03_e5_five_cubic_path_center_leaf_cuda_full_agent.py":
        "B3A0609473EDE8185D0A6CACC9F855B223B0E2737A679D0F633092C2F0316E70",
    "audit_rank8_cuda_path_center_leaf_formula_independent_agent.py":
        "B2C2C0D9E657827E15FE5D1550E413DF27ED45534F3A32DB18A7E04D8317C08E",
    "seal_rank8_delta03_e5_five_cubic_path_center_leaf_exact_agent.py":
        "7C2E516983C472B6A8A07877312F0AA1333429FE5E2A0A08CD866D5435AAE294",
}
EXPECTED_TOTALS = {
    "patterns": 629_457_920,
    "rays": 496_022_345,
    "all_short": 133_435_575,
    "finite": 132_182_485,
    "order27": 477_299,
    "ray_gate_failures": 0,
    "ray_bound_failures": 0,
    "ray_negative_classifications": 0,
    "finite_positive_values": 528_729_940,
    "finite_nonpositive_values": 0,
    "finite_bound_failures": 0,
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--expected-primary-report-sha256", required=True)
    parser.add_argument("--expected-raw-audit-sha256", required=True)
    parser.add_argument("--expected-checkpoint-sha256", required=True)
    args = parser.parse_args()
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary_hash = sha256(ROOT / PRIMARY_NAME)
    raw_hash = sha256(ROOT / RAW_AUDIT_NAME)
    checkpoint_hash = sha256(ROOT / CHECKPOINT_NAME)
    assert primary_hash == args.expected_primary_report_sha256.upper()
    assert raw_hash == args.expected_raw_audit_sha256.upper()
    assert checkpoint_hash == args.expected_checkpoint_sha256.upper()

    primary = load(PRIMARY_NAME)
    raw = load(RAW_AUDIT_NAME)
    checkpoint = load(CHECKPOINT_NAME)
    assert primary["status"] == (
        "PASS_EXACT_RANK8_DELTA03_E5_FIVE_CUBIC_PATH_CENTER_LEAF_N28_PLUS"
    )
    assert raw["status"] == (
        "PASS_FULL_INDEPENDENT_CUDA_AUDIT_E5_FIVE_CUBIC_PATH_CENTER_LEAF"
    )
    assert raw["root_orbit"] == primary["root_orbit"] == (
        "five_cubic_path:center_leaf"
    )
    assert raw["source_sha256"] == EXPECTED[
        "audit_rank8_delta03_e5_five_cubic_path_center_leaf_cuda_full_agent.py"
    ]
    assert raw["checkpoint_sha256"] == checkpoint_hash
    assert raw["totals"] == checkpoint["totals"] == EXPECTED_TOTALS
    assert checkpoint["cursor"] == EXPECTED_TOTALS["patterns"]
    assert checkpoint["dependencies"] == raw["immutable_input_hashes"]
    assert raw["crt_prime_count"] == 9
    assert raw["crt_modulus_bits"] > 255
    for name, expected in raw["immutable_input_hashes"].items():
        assert sha256(ROOT / name) == expected, name
    cursor = 0
    for batch in checkpoint["batches"]:
        assert batch["start"] == cursor
        assert batch["stop"] > cursor
        assert batch["patterns"] == batch["stop"] - batch["start"]
        assert batch["ray_gate_failures"] == 0
        assert batch["ray_bound_failures"] == 0
        assert batch["ray_negative_classifications"] == 0
        assert batch["finite_nonpositive_values"] == 0
        assert batch["finite_bound_failures"] == 0
        cursor = batch["stop"]
    assert cursor == EXPECTED_TOTALS["patterns"]

    immutable = {
        **actual,
        PRIMARY_NAME: primary_hash,
        RAW_AUDIT_NAME: raw_hash,
        CHECKPOINT_NAME: checkpoint_hash,
        **raw["immutable_input_hashes"],
    }
    payload = {
        "schema": (
            "rank8-delta03-e5-five-cubic-path-center-leaf-"
            "all-order-independent-audit-agent-v2"
        ),
        "status": (
            "PASS_INDEPENDENT_RANK8_DELTA03_E5_FIVE_CUBIC_PATH_"
            "CENTER_LEAF_N28_PLUS_AUDIT"
        ),
        "root_orbit": "five_cubic_path:center_leaf",
        "audit_claim": (
            "A separately transcribed path-message engine with a disjoint "
            "nine-prime CRT basis exhaustively replayed every canonical ray "
            "and finite cell and found no sign, gate, or magnitude-bound "
            "failure."
        ),
        "totals": EXPECTED_TOTALS,
        "matching_primary_workload": {
            "canonical_coordinate_patterns": primary["quotient_counts"][
                "canonical_coordinate_patterns"
            ],
            "n28_plus_newton_rays": primary["quotient_counts"][
                "mixed_and_all_long_rays"
            ],
            "n28_plus_finite": primary["quotient_counts"][
                "all_short_n28_plus"
            ],
            "exact_match": True,
        },
        "batch_manifest_sha256": raw["batch_manifest_sha256"],
        "immutable_input_hashes": immutable,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Audit credits exactly five_cubic_path:center_leaf for n>=28."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
