#!/usr/bin/env python3
"""Fail-closed seal for the independent near-inner-branch CUDA audit."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY_NAME = (
    "rank8_delta03_e5_five_cubic_path_near_inner_branch_"
    "all_order_exact_agent_20260825.json"
)
RAW_AUDIT_NAME = (
    "rank8_delta03_e5_five_cubic_path_near_inner_branch_"
    "cuda_full_independent_audit_agent_20260825.json"
)
CHECKPOINT_NAME = (
    "rank8_delta03_e5_five_cubic_path_near_inner_branch_"
    "cuda_full_audit_checkpoint_agent_20260825.json"
)
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_near_inner_branch_"
    "all_order_independent_audit_agent_20260825.json"
)
EXPECTED = {
    "audit_rank8_delta03_e5_five_cubic_path_near_inner_branch_cuda_full_agent.py":
        "4D0EB81C8A808C5EEEA560B3BCEB1047E611C2AD9740872D557FAEC22A51E562",
    "run_rank8_cuda_full_audit_driver_agent.py":
        "DAC996FB6995E19EFEAAF093586B7D4490F69853E2FECEFC30FBFE7313B48134",
    "audit_rank8_cuda_path_near_inner_branch_formula_independent_agent.py":
        "22A3CB5AF808A6038A8B420A6C1AF76C952CF9CC40C7B60C26F32DA9A914A3DA",
    "seal_rank8_delta03_e5_five_cubic_path_near_inner_branch_exact_agent.py":
        "8EE0F87CFAB20902FFA0216E0C531EB7B57B95083F0DFDACA38E464751C5D4C2",
}
EXPECTED_TOTALS = {
    "patterns": 1_101_463_552,
    "rays": 872_753_896,
    "all_short": 228_709_656,
    "finite": 226_246_180,
    "order27": 933_773,
    "ray_gate_failures": 0,
    "ray_bound_failures": 0,
    "ray_negative_classifications": 0,
    "finite_positive_values": 904_984_720,
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
        "PASS_EXACT_RANK8_DELTA03_E5_FIVE_CUBIC_PATH_"
        "NEAR_INNER_BRANCH_N28_PLUS"
    )
    assert raw["status"] == (
        "PASS_FULL_INDEPENDENT_CUDA_AUDIT_E5_"
        "FIVE_CUBIC_PATH_NEAR_INNER_BRANCH"
    )
    assert raw["root_orbit"] == primary["root_orbit"] == (
        "five_cubic_path:near_inner_branch"
    )
    assert raw["source_sha256"] == EXPECTED[
        "audit_rank8_delta03_e5_five_cubic_path_near_inner_branch_cuda_full_agent.py"
    ]
    assert raw["driver_sha256"] == EXPECTED[
        "run_rank8_cuda_full_audit_driver_agent.py"
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
    manifest = "".join(
        json.dumps(batch, sort_keys=True, separators=(",", ":")) + "\n"
        for batch in checkpoint["batches"]
    )
    assert hashlib.sha256(manifest.encode("utf-8")).hexdigest().upper() == raw[
        "batch_manifest_sha256"
    ]

    immutable = {
        **actual,
        PRIMARY_NAME: primary_hash,
        RAW_AUDIT_NAME: raw_hash,
        CHECKPOINT_NAME: checkpoint_hash,
        **raw["immutable_input_hashes"],
    }
    payload = {
        "schema": (
            "rank8-delta03-e5-five-cubic-path-near-inner-branch-"
            "all-order-independent-audit-agent-v2"
        ),
        "status": (
            "PASS_INDEPENDENT_RANK8_DELTA03_E5_FIVE_CUBIC_PATH_"
            "NEAR_INNER_BRANCH_N28_PLUS_AUDIT"
        ),
        "root_orbit": "five_cubic_path:near_inner_branch",
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
            "Audit credits exactly five_cubic_path:near_inner_branch for n>=28."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
